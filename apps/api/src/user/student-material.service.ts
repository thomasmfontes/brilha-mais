import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class StudentMaterialService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  async findAll(userId: string) {
    return this.prisma.studentMaterial.findMany({
      where: { userId },
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
    },
    actorId?: string,
  ) {
    const material = await this.prisma.studentMaterial.create({
      data,
      include: { user: true },
    });

    await this.audit.log(
      'Upload de Material (Aluno)',
      material.name,
      material.userId,
      actorId,
      {
        userName: material.user.name,
        fileName: material.name,
        type: material.type,
      },
    );

    return material;
  }

  async remove(id: string, actorId?: string) {
    const material = await this.prisma.studentMaterial.delete({
      where: { id },
      include: { user: true },
    });

    await this.audit.log(
      'Remoção de Material (Aluno)',
      material.name,
      material.userId,
      actorId,
      {
        userName: material.user.name,
        fileName: material.name,
      },
    );

    return material;
  }
}
