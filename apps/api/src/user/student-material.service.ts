import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class StudentMaterialService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(userId: string, category?: string) {
    const where: any = { userId };
    if (category) {
      where.category = category;
    }
    return this.prisma.studentMaterial.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.prisma.studentMaterial.findUnique({
      where: { id },
    });
  }

  async create(
    data: {
      name: string;
      url: string;
      type: string;
      size?: string;
      userId: string;
      category?: string;
    },
    actorId?: string,
  ) {
    const category = data.category || 'MATERIAL';
    const material = await this.prisma.studentMaterial.create({
      data: {
        name: data.name,
        url: data.url,
        type: data.type,
        size: data.size,
        userId: data.userId,
        category,
      },
      include: { user: true },
    });

    const isCert = category === 'CERTIFICATE';
    await this.audit.log(
      isCert ? 'Upload de Certificado (Aluno)' : 'Upload de Material (Aluno)',
      material.name,
      material.userId,
      actorId,
      {
        userName: material.user.name,
        fileName: material.name,
        type: material.type,
        category,
      },
    );

    return material;
  }

  async remove(id: string, actorId?: string) {
    const material = await this.prisma.studentMaterial.delete({
      where: { id },
      include: { user: true },
    });

    const isCert = material.category === 'CERTIFICATE';
    await this.audit.log(
      isCert ? 'Remoção de Certificado (Aluno)' : 'Remoção de Material (Aluno)',
      material.name,
      material.userId,
      actorId,
      {
        userName: material.user.name,
        fileName: material.name,
        category: material.category,
      },
    );

    return material;
  }
}
