import { ConflictException } from '@nestjs/common';
import { FormFieldType } from '@prisma/client';
import { FormService } from './form.service';
import { BRILHA_MAIS_2027_TEMPLATE } from './templates/brilha-mais-default.template';
import {
  evaluateCondition,
  isValidCpfDigits,
} from './utils/form-logic.util';
import { buildCsvBuffer, buildXlsxBuffer } from './utils/xlsx-builder.util';

describe('Form Logic, Exports & FormService', () => {
  describe('evaluateCondition', () => {
    it('shows conditional experience field only when atua_profissionalmente === Sim', () => {
      const condition = {
        fieldKey: 'atua_profissionalmente',
        operator: 'EQUALS' as const,
        value: 'Sim',
      };

      expect(
        evaluateCondition(condition, {
          atua_profissionalmente: { value: 'Sim' },
        }),
      ).toBe(true);

      expect(
        evaluateCondition(condition, {
          atua_profissionalmente: { value: 'Não' },
        }),
      ).toBe(false);

      expect(evaluateCondition(condition, {})).toBe(false);
    });

    it('handles NOT_EQUALS and INCLUDES operators across choice fields', () => {
      expect(
        evaluateCondition(
          { fieldKey: 'cidade', operator: 'NOT_EQUALS', value: 'São Paulo' },
          { cidade: { value: 'Santo André' } },
        ),
      ).toBe(true);

      expect(
        evaluateCondition(
          { fieldKey: 'cidade', operator: 'NOT_EQUALS', value: 'São Paulo' },
          { cidade: { value: 'São Paulo' } },
        ),
      ).toBe(false);

      expect(
        evaluateCondition(
          {
            fieldKey: 'possui_computador',
            operator: 'INCLUDES',
            value: 'Notebook (Laptop)',
          },
          { possui_computador: { value: ['Notebook (Laptop)'] } },
        ),
      ).toBe(true);
    });
  });

  describe('BRILHA_MAIS_2027_TEMPLATE (Ficha Única)', () => {
    it('contains 4 thematic blocks, 15 fields, inline experience condition, and zero interest/tech questions', () => {
      expect(BRILHA_MAIS_2027_TEMPLATE.sections).toHaveLength(4);

      const allFields = BRILHA_MAIS_2027_TEMPLATE.sections.flatMap(
        (sec) => sec.fields,
      );
      expect(allFields).toHaveLength(15);

      const keys = allFields.map((f) => f.key);
      expect(keys.some((k) => k.startsWith('interesse_'))).toBe(false);
      expect(keys).not.toContain('conhecimento_windows');
      expect(keys).not.toContain('outros_cursos_tecnologia');
      expect(keys).not.toContain('motivo_interesse_programacao');

      const expSection = BRILHA_MAIS_2027_TEMPLATE.sections.find(
        (s) => s.title === 'Experiência Profissional',
      );
      expect(expSection).toBeDefined();
      expect(expSection?.condition).toBeNull();

      const expField = expSection?.fields.find(
        (f) => f.key === 'ultimas_experiencias',
      );
      expect(expField?.condition).toEqual({
        fieldKey: 'atua_profissionalmente',
        operator: 'EQUALS',
        value: 'Sim',
      });
    });
  });

  describe('isValidCpfDigits', () => {
    it('validates legitimate CPFs and rejects invalid or repeated-digit CPFs', () => {
      expect(isValidCpfDigits('52998224725')).toBe(true);
      expect(isValidCpfDigits('529.982.247-25')).toBe(true);
      expect(isValidCpfDigits('11111111111')).toBe(false);
      expect(isValidCpfDigits('52998224720')).toBe(false);
      expect(isValidCpfDigits('12345')).toBe(false);
    });
  });

  describe('Export Builders (CSV & XLSX)', () => {
    it('builds UTF-8 BOM CSV buffer with escaped cells', () => {
      const buf = buildCsvBuffer(
        ['Nome', 'Observação'],
        [['Maria; Silva', 'Linha 1\nLinha 2']],
      );
      const text = buf.toString('utf8');
      expect(text.charCodeAt(0)).toBe(0xfeff);
      expect(text).toContain('"Maria; Silva";"Linha 1\nLinha 2"');
    });

    it('builds valid PKZIP OOXML XLSX buffer', () => {
      const buf = buildXlsxBuffer({
        sheetName: 'Respostas 2027',
        headers: ['Nome', 'E-mail', 'Nota'],
        rows: [['João Silva', 'joao@exemplo.com', 10]],
      });

      // PKZIP local file header signature: PK\x03\x04
      expect(buf[0]).toBe(0x50);
      expect(buf[1]).toBe(0x4b);
      expect(buf[2]).toBe(0x03);
      expect(buf[3]).toBe(0x04);

      const ascii = buf.toString('latin1');
      expect(ascii).toContain('xl/worksheets/sheet1.xml');
      expect(ascii).toContain('xl/workbook.xml');
      expect(ascii).toContain('xl/styles.xml');
    });
  });

  describe('FormService.submitPublic', () => {
    const mockForm = {
      id: 'form-1',
      slug: 'inscricao-2027',
      title: 'Cadastro 2027',
      isActive: true,
      opensAt: null,
      closesAt: null,
      enforceSingleSubmission: true,
      confirmationTitle: 'Recebido!',
      confirmationMessage: 'Obrigado',
      sections: [
        {
          id: 'sec-1',
          order: 0,
          condition: null,
          fields: [
            {
              id: 'f-name',
              key: 'nome_completo',
              type: FormFieldType.SHORT_TEXT,
              label: 'Nome Completo',
              required: true,
              allowOther: false,
              semanticKey: 'NAME',
              options: null,
              condition: null,
            },
            {
              id: 'f-email',
              key: 'email',
              type: FormFieldType.EMAIL,
              label: 'E-mail',
              required: true,
              allowOther: false,
              semanticKey: 'EMAIL',
              options: null,
              condition: null,
            },
          ],
        },
        {
          id: 'sec-2',
          order: 1,
          condition: null,
          fields: [
            {
              id: 'f-work',
              key: 'atua_profissionalmente',
              type: FormFieldType.SINGLE_CHOICE,
              label: 'Atua ou já atuou profissionalmente?',
              required: true,
              allowOther: false,
              semanticKey: null,
              options: ['Sim', 'Não'],
              condition: null,
            },
            {
              id: 'f-exp',
              key: 'ultimas_experiencias',
              type: FormFieldType.LONG_TEXT,
              label: 'Descreva suas últimas experiências profissionais',
              required: true,
              allowOther: false,
              semanticKey: null,
              options: null,
              condition: {
                fieldKey: 'atua_profissionalmente',
                operator: 'EQUALS',
                value: 'Sim',
              },
            },
          ],
        },
      ],
    };

    it('handles inline conditional field in single-page submission and blocks duplicate email', async () => {
      const mockPrisma: any = {
        form: { findUnique: jest.fn().mockResolvedValue(mockForm) },
        formSubmission: {
          findFirst: jest
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({ id: 'existing-sub' }),
          create: jest
            .fn()
            .mockResolvedValueOnce({
              id: 'sub-1',
              createdAt: new Date('2026-11-12T12:00:00Z'),
            })
            .mockResolvedValueOnce({
              id: 'sub-2',
              createdAt: new Date('2026-11-12T12:05:00Z'),
            }),
        },
      };
      const mockAudit: any = { log: jest.fn() };
      const service = new FormService(mockPrisma, mockAudit);

      const firstResult = await service.submitPublic(
        'inscricao-2027',
        {
          answers: {
            nome_completo: { value: 'Ana Paula' },
            email: { value: 'Ana@Exemplo.com' },
            atua_profissionalmente: { value: 'Não' },
            // Hidden inline field sent accidentally should be stripped and not cause required error
            ultimas_experiencias: { value: '' },
          },
        },
        '127.0.0.1',
      );

      expect(firstResult.id).toBe('sub-1');
      expect(mockPrisma.formSubmission.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            respondentEmail: 'ana@exemplo.com',
            respondentName: 'Ana Paula',
          }),
        }),
      );

      // Hidden inline field must not be stored in sanitized answers
      const savedAnswers =
        mockPrisma.formSubmission.create.mock.calls[0][0].data.answers;
      expect(savedAnswers.ultimas_experiencias).toBeUndefined();

      // When atua_profissionalmente === 'Sim', inline conditional field is saved
      const secondResult = await service.submitPublic(
        'inscricao-2027',
        {
          answers: {
            nome_completo: { value: 'Carlos Silva' },
            email: { value: 'carlos@exemplo.com' },
            atua_profissionalmente: { value: 'Sim' },
            ultimas_experiencias: { value: 'Auxiliar administrativo por 1 ano' },
          },
        },
        '127.0.0.3',
      );
      expect(secondResult.id).toBe('sub-2');
      const savedWithExp =
        mockPrisma.formSubmission.create.mock.calls[1][0].data.answers;
      expect(savedWithExp.ultimas_experiencias?.value).toBe(
        'Auxiliar administrativo por 1 ano',
      );

      // Duplicate email must throw ConflictException (409)
      await expect(
        service.submitPublic(
          'inscricao-2027',
          {
            answers: {
              nome_completo: { value: 'Ana Paula' },
              email: { value: 'ana@exemplo.com' },
              atua_profissionalmente: { value: 'Não' },
            },
          },
          '127.0.0.2',
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('FormService.getPublicBySlug', () => {
    it('returns both desktop and mobile cover image URLs when present', async () => {
      const mockPrisma: any = {
        form: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'form-1',
            slug: 'inscricao-2027',
            title: 'Cadastro 2027',
            description: null,
            coverImageUrl: 'https://cdn.example.com/cover-desktop.jpg',
            mobileCoverImageUrl: 'https://cdn.example.com/cover-mobile.jpg',
            isActive: true,
            opensAt: null,
            closesAt: null,
            enforceSingleSubmission: true,
            confirmationTitle: 'Recebido!',
            confirmationMessage: null,
            location: null,
            sections: [],
          }),
        },
      };
      const mockAudit: any = { log: jest.fn() };
      const service = new FormService(mockPrisma, mockAudit);

      const result = await service.getPublicBySlug('inscricao-2027');

      expect(result.coverImageUrl).toBe(
        'https://cdn.example.com/cover-desktop.jpg',
      );
      expect(result.mobileCoverImageUrl).toBe(
        'https://cdn.example.com/cover-mobile.jpg',
      );
    });
  });
});
