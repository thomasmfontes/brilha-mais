import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { FormFieldType, FormTriageStatus, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';
import {
  SaveFormDto,
  CreateFromTemplateDto,
  SubmitPublicFormDto,
  UpdateSubmissionTriageDto,
  EnrollSubmissionsDto,
} from './dto/form.dto';
import {
  AnswerEntry,
  computeFormAvailability,
  evaluateCondition,
  isValidCpfDigits,
  slugifyFormTitle,
} from './utils/form-logic.util';
import { buildCsvBuffer, buildXlsxBuffer } from './utils/xlsx-builder.util';
import { BRILHA_MAIS_2027_TEMPLATE } from './templates/brilha-mais-default.template';

type ActiveTriageStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

const STATUS_LABELS_PT: Record<FormTriageStatus, string> = {
  PENDING: 'Pendente',
  UNDER_REVIEW: 'Pendente',
  APPROVED: 'Aprovado',
  WAITLIST: 'Pendente',
  REJECTED: 'Recusado',
};

function normalizeTriageStatus(status: FormTriageStatus): ActiveTriageStatus {
  if (status === FormTriageStatus.APPROVED) return 'APPROVED';
  if (status === FormTriageStatus.REJECTED) return 'REJECTED';
  return 'PENDING';
}

@Injectable()
export class FormService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  private isSuperAdmin(user: any): boolean {
    return user?.role?.toString().toUpperCase() === Role.SUPER_ADMIN;
  }

  private assertFormScope(form: { locationId: string | null }, user: any) {
    if (this.isSuperAdmin(user)) return;
    const userLocationId = user?.locationId ?? null;
    if (userLocationId && form.locationId !== userLocationId) {
      throw new ForbiddenException(
        'Você não tem permissão para gerenciar formulários de outro Polo.',
      );
    }
    if (!userLocationId && form.locationId !== null) {
      throw new ForbiddenException(
        'Você não tem permissão para gerenciar formulários deste Polo.',
      );
    }
  }

  private resolveTargetLocationId(
    requestedLocationId: string | null | undefined,
    user: any,
  ): string | null {
    if (this.isSuperAdmin(user)) {
      return requestedLocationId || null;
    }
    return user?.locationId ?? null;
  }

  private async generateUniqueSlug(
    desired: string,
    excludeFormId?: string,
  ): Promise<string> {
    const base = slugifyFormTitle(desired);
    let candidate = base;
    let counter = 2;

    while (true) {
      const existing = await this.prisma.form.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!existing || existing.id === excludeFormId) {
        return candidate;
      }
      candidate = `${base}-${counter}`;
      counter += 1;
    }
  }

  private normalizeFieldKey(rawKey: string, fallbackIdx: number): string {
    const cleaned = slugifyFormTitle(rawKey || '')
      .replace(/-/g, '_')
      .slice(0, 64);
    return cleaned || `campo_${fallbackIdx + 1}`;
  }

  private formatAnswerForDisplay(
    entry: any,
    fieldType?: FormFieldType,
  ): string {
    if (!entry) return '';
    const val = entry.value;
    const otherText = entry.otherText ? String(entry.otherText).trim() : '';

    if (Array.isArray(val)) {
      return val
        .map((item) => {
          if (item === '__OTHER__') {
            return otherText ? `Outro: ${otherText}` : 'Outro';
          }
          return String(item);
        })
        .join(', ');
    }

    if (val === '__OTHER__') {
      return otherText ? `Outro: ${otherText}` : 'Outro';
    }

    if (fieldType === FormFieldType.DATE && typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) {
      const [y, m, d] = val.split('-');
      return `${d}/${m}/${y}`;
    }

    return val === null || val === undefined ? '' : String(val);
  }

  // -------------------------------------------------------------
  // ADMIN: CRUD & TEMPLATES
  // -------------------------------------------------------------

  async findAllAdmin(user: any, query?: { search?: string; status?: string }) {
    const where: Prisma.FormWhereInput = {};

    if (!this.isSuperAdmin(user)) {
      where.locationId = user?.locationId ?? null;
    }

    if (query?.search?.trim()) {
      const s = query.search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { slug: { contains: s, mode: 'insensitive' } },
        { description: { contains: s, mode: 'insensitive' } },
      ];
    }

    if (query?.status === 'ACTIVE') {
      where.isActive = true;
    } else if (query?.status === 'INACTIVE') {
      where.isActive = false;
    }

    const forms = await this.prisma.form.findMany({
      where,
      include: {
        location: { select: { id: true, name: true, slug: true } },
        createdBy: { select: { id: true, name: true, email: true } },
        _count: {
          select: {
            sections: true,
            fields: true,
            submissions: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    if (forms.length === 0) return [];

    const formIds = forms.map((f) => f.id);
    const grouped = await this.prisma.formSubmission.groupBy({
      by: ['formId', 'status'],
      where: { formId: { in: formIds } },
      _count: { _all: true },
    });

    const statusMap = new Map<string, Record<ActiveTriageStatus, number>>();
    for (const row of grouped) {
      if (!statusMap.has(row.formId)) {
        statusMap.set(row.formId, {
          PENDING: 0,
          APPROVED: 0,
          REJECTED: 0,
        });
      }
      const normalized = normalizeTriageStatus(row.status);
      statusMap.get(row.formId)![normalized] += row._count._all;
    }

    return forms.map((form) => ({
      ...form,
      availabilityStatus: computeFormAvailability(form),
      statusCounts: statusMap.get(form.id) || {
        PENDING: 0,
        APPROVED: 0,
        REJECTED: 0,
      },
    }));
  }

  async findOneAdmin(id: string, user: any) {
    const form = await this.prisma.form.findUnique({
      where: { id },
      include: {
        location: { select: { id: true, name: true, slug: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            fields: {
              orderBy: { order: 'asc' },
            },
          },
        },
        _count: { select: { submissions: true } },
      },
    });

    if (!form) {
      throw new NotFoundException('Formulário não encontrado.');
    }

    this.assertFormScope(form, user);

    return {
      ...form,
      availabilityStatus: computeFormAvailability(form),
    };
  }

  async createFromTemplate(dto: CreateFromTemplateDto, user: any) {
    const template = BRILHA_MAIS_2027_TEMPLATE;
    const title = dto.title?.trim() || template.title;
    const slug = await this.generateUniqueSlug(dto.title?.trim() || template.slug);
    const locationId = this.resolveTargetLocationId(dto.locationId, user);

    const created = await this.prisma.$transaction(
      async (tx) => {
        const form = await tx.form.create({
          data: {
            title,
            slug,
            description: template.description,
            isActive: true,
            showOnLandingPage: false,
            enforceSingleSubmission: true,
            confirmationTitle: template.confirmationTitle,
            confirmationMessage: template.confirmationMessage,
            locationId,
            createdById: user?.id || null,
          },
        });

        for (const sec of template.sections) {
          const createdSection = await tx.formSection.create({
            data: {
              formId: form.id,
              title: sec.title,
              description: sec.description || null,
              order: sec.order,
              condition: sec.condition
                ? (sec.condition as Prisma.InputJsonValue)
                : Prisma.JsonNull,
            },
          });

          if (sec.fields && sec.fields.length > 0) {
            await tx.formField.createMany({
              data: sec.fields.map((field) => ({
                formId: form.id,
                sectionId: createdSection.id,
                key: field.key,
                type: field.type,
                label: field.label,
                description: field.description || null,
                placeholder: field.placeholder || null,
                order: field.order,
                required: field.required,
                allowOther: Boolean(field.allowOther),
                semanticKey: field.semanticKey || null,
                options: field.options
                  ? (field.options as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
                condition: field.condition
                  ? (field.condition as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
                validation: field.validation
                  ? (field.validation as Prisma.InputJsonValue)
                  : Prisma.JsonNull,
              })),
            });
          }
        }

        return form;
      },
      { timeout: 30000, maxWait: 10000 },
    );

    await this.audit.log(
      'Criação de Formulário via Modelo',
      'Formulário',
      created.id,
      user?.id,
      { title: created.title, slug: created.slug, template: template.key },
    );

    return this.findOneAdmin(created.id, user);
  }

  async saveForm(id: string | null, dto: SaveFormDto, user: any) {
    if (!dto.sections || dto.sections.length === 0) {
      throw new BadRequestException(
        'O formulário precisa ter pelo menos uma seção.',
      );
    }

    const opensAt = dto.opensAt ? new Date(dto.opensAt) : null;
    const closesAt = dto.closesAt ? new Date(dto.closesAt) : null;
    if (opensAt && closesAt && opensAt > closesAt) {
      throw new BadRequestException(
        'A data de abertura não pode ser posterior à data de encerramento.',
      );
    }

    let existingForm: { id: string; locationId: string | null; slug: string } | null = null;
    if (id) {
      existingForm = await this.prisma.form.findUnique({
        where: { id },
        select: { id: true, locationId: true, slug: true },
      });
      if (!existingForm) {
        throw new NotFoundException('Formulário não encontrado.');
      }
      this.assertFormScope(existingForm, user);
    }

    const locationId = this.resolveTargetLocationId(dto.locationId, user);
    const slug = await this.generateUniqueSlug(
      dto.slug?.trim() || dto.title,
      id || undefined,
    );

    // Ensure unique field keys across the form
    const seenKeys = new Set<string>();
    const normalizedSections = dto.sections.map((sec, sIdx) => ({
      ...sec,
      order: sIdx,
      fields: (sec.fields || []).map((f, fIdx) => {
        let key = this.normalizeFieldKey(f.key || f.label, fIdx);
        let suffix = 2;
        while (seenKeys.has(key)) {
          key = `${this.normalizeFieldKey(f.key || f.label, fIdx)}_${suffix}`;
          suffix += 1;
        }
        seenKeys.add(key);
        return {
          ...f,
          key,
          order: fIdx,
        };
      }),
    }));

    const formId = await this.prisma.$transaction(async (tx) => {
      let targetFormId = id;

      if (!targetFormId) {
        const created = await tx.form.create({
          data: {
            title: dto.title.trim(),
            slug,
            description: dto.description || null,
            coverImageUrl: dto.coverImageUrl || null,
            mobileCoverImageUrl: dto.mobileCoverImageUrl || null,
            isActive: dto.isActive ?? true,
            opensAt,
            closesAt,
            showOnLandingPage: dto.showOnLandingPage ?? false,
            enforceSingleSubmission: dto.enforceSingleSubmission ?? true,
            confirmationTitle:
              dto.confirmationTitle?.trim() || 'Inscrição recebida com sucesso!',
            confirmationMessage: dto.confirmationMessage || null,
            locationId,
            createdById: user?.id || null,
          },
        });
        targetFormId = created.id;
      } else {
        await tx.form.update({
          where: { id: targetFormId },
          data: {
            title: dto.title.trim(),
            slug,
            description: dto.description || null,
            coverImageUrl: dto.coverImageUrl || null,
            mobileCoverImageUrl: dto.mobileCoverImageUrl || null,
            isActive: dto.isActive ?? true,
            opensAt,
            closesAt,
            showOnLandingPage: dto.showOnLandingPage ?? false,
            enforceSingleSubmission: dto.enforceSingleSubmission ?? true,
            confirmationTitle:
              dto.confirmationTitle?.trim() || 'Inscrição recebida com sucesso!',
            confirmationMessage: dto.confirmationMessage || null,
            locationId,
          },
        });
      }

      const existingSections = await tx.formSection.findMany({
        where: { formId: targetFormId },
        select: { id: true },
      });
      const existingSectionIds = new Set(existingSections.map((s) => s.id));
      const keptSectionIds = new Set<string>();

      const existingFields = await tx.formField.findMany({
        where: { formId: targetFormId },
        select: { id: true },
      });
      const existingFieldIds = new Set(existingFields.map((f) => f.id));
      const incomingFieldIds = new Set(
        normalizedSections
          .flatMap((s) => s.fields)
          .map((f) => f.id)
          .filter((fid): fid is string => Boolean(fid && existingFieldIds.has(fid))),
      );

      // Delete removed fields first so keys don't collide on re-insert
      const fieldsToDelete = [...existingFieldIds].filter(
        (fid) => !incomingFieldIds.has(fid),
      );
      if (fieldsToDelete.length > 0) {
        await tx.formField.deleteMany({
          where: { id: { in: fieldsToDelete } },
        });
      }

      for (const sec of normalizedSections) {
        let sectionId: string;
        if (sec.id && existingSectionIds.has(sec.id)) {
          sectionId = sec.id;
          await tx.formSection.update({
            where: { id: sectionId },
            data: {
              title: sec.title.trim(),
              description: sec.description || null,
              order: sec.order,
              condition: sec.condition
                ? (sec.condition as Prisma.InputJsonValue)
                : Prisma.JsonNull,
            },
          });
        } else {
          const createdSec = await tx.formSection.create({
            data: {
              formId: targetFormId,
              title: sec.title.trim(),
              description: sec.description || null,
              order: sec.order,
              condition: sec.condition
                ? (sec.condition as Prisma.InputJsonValue)
                : Prisma.JsonNull,
            },
          });
          sectionId = createdSec.id;
        }
        keptSectionIds.add(sectionId);

        for (const field of sec.fields) {
          const fieldPayload = {
            sectionId,
            key: field.key,
            type: field.type,
            label: field.label.trim(),
            description: field.description || null,
            placeholder: field.placeholder || null,
            order: field.order,
            required:
              field.type === FormFieldType.INFO_BLOCK
                ? false
                : Boolean(field.required),
            allowOther: Boolean(field.allowOther),
            semanticKey: field.semanticKey || null,
            options: Array.isArray(field.options)
              ? (field.options as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            condition: field.condition
              ? (field.condition as Prisma.InputJsonValue)
              : Prisma.JsonNull,
            validation: field.validation
              ? (field.validation as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          };

          if (field.id && existingFieldIds.has(field.id)) {
            await tx.formField.update({
              where: { id: field.id },
              data: fieldPayload,
            });
          } else {
            await tx.formField.create({
              data: {
                formId: targetFormId,
                ...fieldPayload,
              },
            });
          }
        }
      }

      const sectionsToDelete = [...existingSectionIds].filter(
        (sid) => !keptSectionIds.has(sid),
      );
      if (sectionsToDelete.length > 0) {
        await tx.formSection.deleteMany({
          where: { id: { in: sectionsToDelete } },
        });
      }

      return targetFormId;
    }, { timeout: 30000, maxWait: 10000 });

    await this.audit.log(
      id ? 'Atualização de Formulário' : 'Criação de Formulário',
      'Formulário',
      formId,
      user?.id,
      { title: dto.title, slug },
    );

    return this.findOneAdmin(formId, user);
  }

  async toggleActive(id: string, user: any) {
    const form = await this.prisma.form.findUnique({ where: { id } });
    if (!form) throw new NotFoundException('Formulário não encontrado.');
    this.assertFormScope(form, user);

    const updated = await this.prisma.form.update({
      where: { id },
      data: { isActive: !form.isActive },
    });

    await this.audit.log(
      updated.isActive ? 'Ativação de Formulário' : 'Desativação de Formulário',
      'Formulário',
      id,
      user?.id,
      { title: updated.title, isActive: updated.isActive },
    );

    return updated;
  }

  async duplicateForm(id: string, user: any) {
    const original = await this.findOneAdmin(id, user);
    const newTitle = `${original.title} (Cópia)`;
    const newSlug = await this.generateUniqueSlug(`${original.slug}-copia`);

    const duplicatedId = await this.prisma.$transaction(async (tx) => {
      const form = await tx.form.create({
        data: {
          title: newTitle,
          slug: newSlug,
          description: original.description,
          coverImageUrl: original.coverImageUrl,
          mobileCoverImageUrl: original.mobileCoverImageUrl,
          isActive: false,
          showOnLandingPage: false,
          enforceSingleSubmission: original.enforceSingleSubmission,
          confirmationTitle: original.confirmationTitle,
          confirmationMessage: original.confirmationMessage,
          locationId: original.locationId,
          createdById: user?.id || null,
        },
      });

      for (const sec of original.sections) {
        const createdSec = await tx.formSection.create({
          data: {
            formId: form.id,
            title: sec.title,
            description: sec.description,
            order: sec.order,
            condition: sec.condition
              ? (sec.condition as Prisma.InputJsonValue)
              : Prisma.JsonNull,
          },
        });

        for (const field of sec.fields) {
          await tx.formField.create({
            data: {
              formId: form.id,
              sectionId: createdSec.id,
              key: field.key,
              type: field.type,
              label: field.label,
              description: field.description,
              placeholder: field.placeholder,
              order: field.order,
              required: field.required,
              allowOther: field.allowOther,
              semanticKey: field.semanticKey,
              options: field.options
                ? (field.options as Prisma.InputJsonValue)
                : Prisma.JsonNull,
              condition: field.condition
                ? (field.condition as Prisma.InputJsonValue)
                : Prisma.JsonNull,
              validation: field.validation
                ? (field.validation as Prisma.InputJsonValue)
                : Prisma.JsonNull,
            },
          });
        }
      }

      return form.id;
    }, { timeout: 30000, maxWait: 10000 });

    await this.audit.log(
      'Duplicação de Formulário',
      'Formulário',
      duplicatedId,
      user?.id,
      { sourceFormId: id, title: newTitle },
    );

    return this.findOneAdmin(duplicatedId, user);
  }

  async deleteForm(id: string, user: any) {
    const form = await this.prisma.form.findUnique({ where: { id } });
    if (!form) throw new NotFoundException('Formulário não encontrado.');
    this.assertFormScope(form, user);

    await this.prisma.form.delete({ where: { id } });

    await this.audit.log(
      'Exclusão de Formulário',
      'Formulário',
      id,
      user?.id,
      { title: form.title, slug: form.slug },
    );

    return { deleted: true };
  }

  // -------------------------------------------------------------
  // PUBLIC FORM ACCESS & SUBMISSION
  // -------------------------------------------------------------

  async getPublicFeatured() {
    const now = new Date();
    const forms = await this.prisma.form.findMany({
      where: {
        isActive: true,
        showOnLandingPage: true,
      },
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        coverImageUrl: true,
        mobileCoverImageUrl: true,
        isActive: true,
        opensAt: true,
        closesAt: true,
        location: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return forms.filter((f) => computeFormAvailability(f, now) === 'OPEN');
  }

  async getPublicBySlug(slug: string) {
    const form = await this.prisma.form.findUnique({
      where: { slug },
      include: {
        location: { select: { id: true, name: true } },
        sections: {
          orderBy: { order: 'asc' },
          include: {
            fields: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!form) {
      throw new NotFoundException('Formulário não encontrado.');
    }

    return {
      id: form.id,
      slug: form.slug,
      title: form.title,
      description: form.description,
      coverImageUrl: form.coverImageUrl,
      mobileCoverImageUrl: form.mobileCoverImageUrl,
      isActive: form.isActive,
      opensAt: form.opensAt,
      closesAt: form.closesAt,
      enforceSingleSubmission: form.enforceSingleSubmission,
      confirmationTitle: form.confirmationTitle,
      confirmationMessage: form.confirmationMessage,
      location: form.location,
      availabilityStatus: computeFormAvailability(form),
      sections: form.sections,
    };
  }

  async submitPublic(slug: string, dto: SubmitPublicFormDto, ip: string) {
    const form = await this.prisma.form.findUnique({
      where: { slug },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            fields: {
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!form) {
      throw new NotFoundException('Formulário não encontrado.');
    }

    const availability = computeFormAvailability(form);
    if (availability === 'INACTIVE') {
      throw new BadRequestException(
        'Este formulário está desativado no momento e não aceita novas respostas.',
      );
    }
    if (availability === 'NOT_STARTED') {
      throw new BadRequestException(
        'As inscrições para este formulário ainda não começaram.',
      );
    }
    if (availability === 'CLOSED') {
      throw new BadRequestException(
        'O prazo de inscrição para este formulário já foi encerrado.',
      );
    }

    const rawAnswers = (dto.answers || {}) as Record<string, AnswerEntry>;
    const visibleAnswersContext: Record<string, AnswerEntry> = {};
    const sanitizedAnswers: Record<
      string,
      { value: string | string[]; otherText?: string; labelSnapshot: string }
    > = {};

    let respondentName: string | null = null;
    let respondentEmail: string | null = null;
    let respondentPhone: string | null = null;
    let respondentCpf: string | null = null;

    for (const section of form.sections) {
      const sectionVisible = evaluateCondition(
        section.condition as any,
        visibleAnswersContext,
      );
      if (!sectionVisible) continue;

      for (const field of section.fields) {
        const fieldVisible = evaluateCondition(
          field.condition as any,
          visibleAnswersContext,
        );
        if (!fieldVisible) continue;
        if (field.type === FormFieldType.INFO_BLOCK) continue;

        const entry = rawAnswers[field.key] || { value: '' };
        const otherText =
          typeof entry.otherText === 'string' ? entry.otherText.trim() : '';
        const options = Array.isArray(field.options)
          ? field.options.map((o) => String(o))
          : [];

        if (field.type === FormFieldType.MULTIPLE_CHOICE) {
          const arr = Array.isArray(entry.value)
            ? entry.value.map((v) => String(v).trim()).filter(Boolean)
            : [];

          if (field.required && arr.length === 0) {
            throw new BadRequestException(
              `O campo "${field.label}" é obrigatório.`,
            );
          }

          for (const selected of arr) {
            const isValidOption =
              options.includes(selected) ||
              (field.allowOther && selected === '__OTHER__');
            if (!isValidOption) {
              throw new BadRequestException(
                `Opção inválida selecionada no campo "${field.label}".`,
              );
            }
          }

          if (arr.includes('__OTHER__') && !otherText) {
            throw new BadRequestException(
              `Por favor, especifique a opção "Outro" no campo "${field.label}".`,
            );
          }

          const normalizedEntry = {
            value: arr,
            ...(arr.includes('__OTHER__') && otherText ? { otherText } : {}),
          };
          visibleAnswersContext[field.key] = normalizedEntry;
          sanitizedAnswers[field.key] = {
            ...normalizedEntry,
            labelSnapshot: field.label,
          };
          continue;
        }

        const strValue =
          entry.value === null || entry.value === undefined
            ? ''
            : String(entry.value).trim();

        if (field.required && !strValue) {
          throw new BadRequestException(
            `O campo "${field.label}" é obrigatório.`,
          );
        }

        if (strValue) {
          if (field.type === FormFieldType.EMAIL) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(strValue)) {
              throw new BadRequestException(
                `Informe um e-mail válido no campo "${field.label}".`,
              );
            }
          } else if (field.type === FormFieldType.PHONE) {
            const digits = strValue.replace(/\D/g, '');
            if (digits.length < 10 || digits.length > 11) {
              throw new BadRequestException(
                `Informe um telefone válido com DDD no campo "${field.label}".`,
              );
            }
          } else if (field.type === FormFieldType.CPF) {
            const digits = strValue.replace(/\D/g, '');
            if (!isValidCpfDigits(digits)) {
              throw new BadRequestException(
                `Informe um CPF válido no campo "${field.label}".`,
              );
            }
          } else if (field.type === FormFieldType.NUMBER) {
            if (Number.isNaN(Number(strValue))) {
              throw new BadRequestException(
                `Informe um número válido no campo "${field.label}".`,
              );
            }
          } else if (field.type === FormFieldType.DATE) {
            if (Number.isNaN(Date.parse(strValue))) {
              throw new BadRequestException(
                `Informe uma data válida no campo "${field.label}".`,
              );
            }
          } else if (field.type === FormFieldType.SINGLE_CHOICE) {
            const isValidOption =
              options.includes(strValue) ||
              (field.allowOther && strValue === '__OTHER__');
            if (!isValidOption) {
              throw new BadRequestException(
                `Opção inválida no campo "${field.label}".`,
              );
            }
            if (strValue === '__OTHER__' && !otherText) {
              throw new BadRequestException(
                `Por favor, especifique a opção "Outro" no campo "${field.label}".`,
              );
            }
          } else if (field.type === FormFieldType.SELECT) {
            if (!options.includes(strValue)) {
              throw new BadRequestException(
                `Opção inválida no campo "${field.label}".`,
              );
            }
          }
        }

        const normalizedEntry = {
          value: strValue,
          ...(strValue === '__OTHER__' && otherText ? { otherText } : {}),
        };
        visibleAnswersContext[field.key] = normalizedEntry;
        sanitizedAnswers[field.key] = {
          ...normalizedEntry,
          labelSnapshot: field.label,
        };

        // Extract respondent identity metadata
        if (strValue) {
          if (
            field.semanticKey === 'NAME' ||
            (!respondentName &&
              (field.key.includes('nome') ||
                field.label.toLowerCase().includes('nome completo')))
          ) {
            respondentName = strValue;
          }
          if (
            field.semanticKey === 'EMAIL' ||
            (!respondentEmail && field.type === FormFieldType.EMAIL)
          ) {
            respondentEmail = strValue.toLowerCase();
          }
          if (
            field.semanticKey === 'PHONE' ||
            (!respondentPhone && field.type === FormFieldType.PHONE)
          ) {
            respondentPhone = strValue.replace(/\D/g, '');
          }
          if (
            field.semanticKey === 'CPF' ||
            (!respondentCpf && field.type === FormFieldType.CPF)
          ) {
            respondentCpf = strValue.replace(/\D/g, '');
          }
        }
      }
    }

    const ipHash = crypto
      .createHash('sha256')
      .update(`${form.id}:${ip || 'unknown'}`)
      .digest('hex');

    if (form.enforceSingleSubmission) {
      const orConditions: Prisma.FormSubmissionWhereInput[] = [];
      if (respondentEmail) {
        orConditions.push({ respondentEmail });
      }
      if (respondentCpf) {
        orConditions.push({ respondentCpf });
      }
      if (!respondentEmail && !respondentCpf) {
        if (respondentPhone && respondentName) {
          orConditions.push({ respondentPhone, respondentName });
        } else {
          orConditions.push({ ipHash });
        }
      }

      if (orConditions.length > 0) {
        const duplicate = await this.prisma.formSubmission.findFirst({
          where: {
            formId: form.id,
            OR: orConditions,
          },
          select: { id: true },
        });
        if (duplicate) {
          throw new ConflictException(
            'Já recebemos uma inscrição com seus dados para este formulário. Apenas uma resposta por pessoa é permitida.',
          );
        }
      }
    }

    const submission = await this.prisma.formSubmission.create({
      data: {
        formId: form.id,
        answers: sanitizedAnswers as unknown as Prisma.InputJsonValue,
        respondentName,
        respondentEmail,
        respondentPhone,
        respondentCpf,
        ipHash,
        status: FormTriageStatus.PENDING,
      },
    });

    return {
      id: submission.id,
      confirmationTitle:
        form.confirmationTitle || 'Inscrição recebida com sucesso!',
      confirmationMessage: form.confirmationMessage,
      submittedAt: submission.createdAt,
    };
  }

  // -------------------------------------------------------------
  // ADMIN: SUBMISSIONS, EXPORT & PRE-ENROLLMENT
  // -------------------------------------------------------------

  private filterSubmissionsInMemory<
    T extends {
      respondentName: string | null;
      respondentEmail: string | null;
      respondentPhone: string | null;
      respondentCpf: string | null;
      answers: any;
    },
  >(
    submissions: T[],
    query?: { search?: string; fieldKey?: string; fieldValue?: string },
  ): T[] {
    let result = submissions;

    if (query?.fieldKey && query?.fieldValue) {
      const targetKey = query.fieldKey;
      const targetVal = query.fieldValue.trim().toLowerCase();
      result = result.filter((sub) => {
        const ans = (sub.answers || {})[targetKey];
        if (!ans) return false;
        const val = ans.value;
        if (Array.isArray(val)) {
          return val.some((v) => String(v).trim().toLowerCase() === targetVal);
        }
        return String(val ?? '').trim().toLowerCase() === targetVal;
      });
    }

    if (query?.search?.trim()) {
      const term = query.search.trim().toLowerCase();
      result = result.filter((sub) => {
        if (sub.respondentName?.toLowerCase().includes(term)) return true;
        if (sub.respondentEmail?.toLowerCase().includes(term)) return true;
        if (sub.respondentPhone?.toLowerCase().includes(term)) return true;
        if (sub.respondentCpf?.toLowerCase().includes(term)) return true;
        const rawJson = JSON.stringify(sub.answers || {}).toLowerCase();
        return rawJson.includes(term);
      });
    }

    return result;
  }

  async getSubmissions(
    formId: string,
    user: any,
    query?: {
      search?: string;
      status?: string;
      fieldKey?: string;
      fieldValue?: string;
    },
  ) {
    const form = await this.findOneAdmin(formId, user);

    const allSubmissions = await this.prisma.formSubmission.findMany({
      where: { formId },
      include: {
        reviewedBy: { select: { id: true, name: true, email: true } },
        enrolledUser: { select: { id: true, name: true, email: true } },
        enrolledTurma: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Global status counts for the form
    const statusCounts: Record<ActiveTriageStatus, number> = {
      PENDING: 0,
      APPROVED: 0,
      REJECTED: 0,
    };
    const normalizedSubmissions = allSubmissions.map((sub) => {
      const status = normalizeTriageStatus(sub.status);
      statusCounts[status] += 1;
      return {
        ...sub,
        status,
      };
    });

    // Choice field summary across all submissions
    const allFields = form.sections.flatMap((s) => s.fields);
    const choiceFields = allFields.filter((f) =>
      (
        [
          FormFieldType.SINGLE_CHOICE,
          FormFieldType.MULTIPLE_CHOICE,
          FormFieldType.SELECT,
        ] as FormFieldType[]
      ).includes(f.type),
    );

    const fieldSummaries = choiceFields.map((field) => {
      const counts = new Map<string, number>();
      const opts = Array.isArray(field.options)
        ? field.options.map((o) => String(o))
        : [];
      for (const opt of opts) counts.set(opt, 0);
      if (field.allowOther) counts.set('Outro', 0);

      let totalResponses = 0;
      for (const sub of normalizedSubmissions) {
        const entry = (sub.answers as any)?.[field.key];
        if (!entry) continue;
        const val = entry.value;
        if (Array.isArray(val)) {
          if (val.length > 0) totalResponses += 1;
          for (const item of val) {
            const label = item === '__OTHER__' ? 'Outro' : String(item);
            counts.set(label, (counts.get(label) || 0) + 1);
          }
        } else if (val !== undefined && val !== null && String(val).trim() !== '') {
          totalResponses += 1;
          const label = val === '__OTHER__' ? 'Outro' : String(val);
          counts.set(label, (counts.get(label) || 0) + 1);
        }
      }

      return {
        fieldId: field.id,
        fieldKey: field.key,
        label: field.label,
        type: field.type,
        totalResponses,
        options: Array.from(counts.entries()).map(([option, count]) => ({
          option,
          count,
          percentage:
            totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0,
        })),
      };
    });

    const statusFiltered =
      query?.status && query.status !== 'ALL'
        ? normalizedSubmissions.filter((s) => s.status === query.status)
        : normalizedSubmissions;

    const filteredSubmissions = this.filterSubmissionsInMemory(
      statusFiltered,
      query,
    );

    return {
      form,
      totalCount: normalizedSubmissions.length,
      filteredCount: filteredSubmissions.length,
      statusCounts,
      fieldSummaries,
      submissions: filteredSubmissions,
    };
  }

  async exportSubmissions(
    formId: string,
    user: any,
    query: {
      search?: string;
      status?: string;
      fieldKey?: string;
      fieldValue?: string;
    },
    format: 'xlsx' | 'csv',
  ): Promise<{ buffer: Buffer; filename: string; contentType: string }> {
    const data = await this.getSubmissions(formId, user, query);
    const orderedFields = data.form.sections
      .flatMap((s) => s.fields)
      .filter((f) => f.type !== FormFieldType.INFO_BLOCK);

    const headers = [
      'ID',
      'Data de Envio',
      'Status Triagem',
      'Turma Pré-Matriculada',
      'Anotações Internas',
      ...orderedFields.map((f) => f.label),
    ];

    const rows = data.submissions.map((sub) => {
      const answersObj = (sub.answers || {}) as Record<string, any>;
      const submittedAt = new Date(sub.createdAt).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
      });
      return [
        sub.id,
        submittedAt,
        STATUS_LABELS_PT[sub.status] || sub.status,
        sub.enrolledTurma?.name || '',
        sub.adminNotes || '',
        ...orderedFields.map((f) =>
          this.formatAnswerForDisplay(answersObj[f.key], f.type),
        ),
      ];
    });

    const safeSlug = slugifyFormTitle(data.form.slug || data.form.title);

    if (format === 'csv') {
      return {
        buffer: buildCsvBuffer(headers, rows),
        filename: `${safeSlug}-respostas.csv`,
        contentType: 'text/csv; charset=utf-8',
      };
    }

    return {
      buffer: buildXlsxBuffer({
        sheetName: 'Respostas',
        headers,
        rows,
      }),
      filename: `${safeSlug}-respostas.xlsx`,
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  async updateSubmissionTriage(
    formId: string,
    submissionId: string,
    dto: UpdateSubmissionTriageDto,
    user: any,
  ) {
    await this.findOneAdmin(formId, user);

    const submission = await this.prisma.formSubmission.findFirst({
      where: { id: submissionId, formId },
    });
    if (!submission) {
      throw new NotFoundException('Inscrição não encontrada.');
    }

    return this.prisma.formSubmission.update({
      where: { id: submissionId },
      data: {
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...(dto.adminNotes !== undefined ? { adminNotes: dto.adminNotes } : {}),
        reviewedById: user?.id || null,
        reviewedAt: new Date(),
      },
      include: {
        reviewedBy: { select: { id: true, name: true, email: true } },
        enrolledUser: { select: { id: true, name: true, email: true } },
        enrolledTurma: { select: { id: true, name: true } },
      },
    });
  }

  async deleteSubmission(formId: string, submissionId: string, user: any) {
    const form = await this.findOneAdmin(formId, user);

    const submission = await this.prisma.formSubmission.findFirst({
      where: { id: submissionId, formId },
    });
    if (!submission) {
      throw new NotFoundException('Inscrição não encontrada.');
    }

    await this.prisma.formSubmission.delete({ where: { id: submissionId } });

    await this.audit.log(
      'Exclusão de Resposta de Formulário',
      'Formulário',
      formId,
      user?.id,
      {
        formTitle: form.title,
        submissionId,
        respondentEmail: submission.respondentEmail,
      },
    );

    return { deleted: true };
  }

  async enrollSubmissions(
    formId: string,
    dto: EnrollSubmissionsDto,
    adminUser: any,
  ) {
    const form = await this.findOneAdmin(formId, adminUser);

    if (!dto.submissionIds || dto.submissionIds.length === 0) {
      throw new BadRequestException(
        'Selecione pelo menos uma inscrição para pré-matrícula.',
      );
    }

    let turma: {
      id: string;
      name: string;
      locationId: string | null;
      areas: { categoryId: string }[];
    } | null = null;

    if (dto.turmaId) {
      turma = await this.prisma.turma.findUnique({
        where: { id: dto.turmaId },
        include: { areas: { select: { categoryId: true } } },
      });
      if (!turma) {
        throw new NotFoundException('Turma selecionada não encontrada.');
      }
      if (
        !this.isSuperAdmin(adminUser) &&
        adminUser?.locationId &&
        turma.locationId &&
        turma.locationId !== adminUser.locationId
      ) {
        throw new ForbiddenException(
          'Você não pode matricular alunos em uma Turma de outro Polo.',
        );
      }
    }

    const submissions = await this.prisma.formSubmission.findMany({
      where: {
        formId,
        id: { in: dto.submissionIds },
      },
    });

    const fields = form.sections.flatMap((s) => s.fields);
    const findSemanticAnswer = (sub: any, semanticKey: string): string | null => {
      const field = fields.find((f) => f.semanticKey === semanticKey);
      if (!field) return null;
      const entry = (sub.answers as any)?.[field.key];
      if (!entry) return null;
      if (entry.value === '__OTHER__') {
        return entry.otherText?.trim() || null;
      }
      return entry.value ? String(entry.value).trim() : null;
    };

    let enrolledCount = 0;
    let skippedCount = 0;
    const details: {
      submissionId: string;
      email: string | null;
      status: 'ENROLLED' | 'SKIPPED';
      reason?: string;
    }[] = [];

    for (const sub of submissions) {
      const email = sub.respondentEmail?.trim().toLowerCase();
      if (!email) {
        skippedCount += 1;
        details.push({
          submissionId: sub.id,
          email: null,
          status: 'SKIPPED',
          reason: 'E-mail não informado na inscrição.',
        });
        continue;
      }

      const targetLocationId =
        turma?.locationId ?? form.locationId ?? adminUser?.locationId ?? null;
      const name =
        sub.respondentName?.trim() ||
        findSemanticAnswer(sub, 'NAME') ||
        email.split('@')[0];
      const phone = sub.respondentPhone || findSemanticAnswer(sub, 'PHONE');
      const city = findSemanticAnswer(sub, 'CITY');
      const birthDateRaw = findSemanticAnswer(sub, 'BIRTH_DATE');
      const birthDate =
        birthDateRaw && !Number.isNaN(Date.parse(birthDateRaw))
          ? new Date(birthDateRaw)
          : null;

      const outcome = await this.prisma.$transaction(async (tx) => {
        let userRecord = await tx.user.findUnique({ where: { email } });

        if (userRecord && userRecord.role !== Role.STUDENT) {
          return {
            status: 'SKIPPED' as const,
            reason: `E-mail já pertence a uma conta ${userRecord.role}.`,
          };
        }

        if (!userRecord) {
          userRecord = await tx.user.create({
            data: {
              email,
              name,
              role: Role.STUDENT,
              locationId: targetLocationId,
            },
          });
        } else if (!userRecord.locationId && targetLocationId) {
          userRecord = await tx.user.update({
            where: { id: userRecord.id },
            data: { locationId: targetLocationId },
          });
        }

        if (turma) {
          await tx.turma.update({
            where: { id: turma.id },
            data: {
              users: { connect: { id: userRecord.id } },
            },
          });

          if (turma.areas.length > 0) {
            await tx.studentArea.createMany({
              data: turma.areas.map((a) => ({
                userId: userRecord!.id,
                categoryId: a.categoryId,
              })),
              skipDuplicates: true,
            });
          }
        }

        const existingProfile = await tx.talentProfile.findUnique({
          where: { userId: userRecord.id },
        });
        if (!existingProfile) {
          await tx.talentProfile.create({
            data: {
              userId: userRecord.id,
              phone: phone || null,
              city: city || null,
              birthDate,
            },
          });
        } else {
          await tx.talentProfile.update({
            where: { userId: userRecord.id },
            data: {
              ...(existingProfile.phone ? {} : { phone: phone || null }),
              ...(existingProfile.city ? {} : { city: city || null }),
              ...(existingProfile.birthDate ? {} : { birthDate }),
            },
          });
        }

        await tx.formSubmission.update({
          where: { id: sub.id },
          data: {
            status: FormTriageStatus.APPROVED,
            enrolledUserId: userRecord.id,
            enrolledTurmaId: turma?.id ?? null,
            enrolledAt: new Date(),
            reviewedById: adminUser?.id || null,
            reviewedAt: new Date(),
          },
        });

        return { status: 'ENROLLED' as const };
      });

      if (outcome.status === 'ENROLLED') {
        enrolledCount += 1;
        details.push({ submissionId: sub.id, email, status: 'ENROLLED' });
      } else {
        skippedCount += 1;
        details.push({
          submissionId: sub.id,
          email,
          status: 'SKIPPED',
          reason: outcome.reason,
        });
      }
    }

    await this.audit.log(
      'Pré-Matrícula de Inscritos',
      'Formulário',
      formId,
      adminUser?.id,
      {
        formTitle: form.title,
        turmaId: turma?.id ?? null,
        turmaName: turma?.name ?? null,
        enrolledCount,
        skippedCount,
      },
    );

    return { enrolledCount, skippedCount, details };
  }
}
