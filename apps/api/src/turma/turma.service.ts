import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTurmaDto, UpdateTurmaDto } from './turma.dto';

@Injectable()
export class TurmaService {
    constructor(private prisma: PrismaService) { }

    async findAll(locationId?: string) {
        const where = locationId ? { locationId } : {};
        return this.prisma.turma.findMany({
            where,
            include: {
                location: true,
                _count: {
                    select: { users: true },
                },
                areas: {
                    include: { category: true }
                }
            },
            orderBy: { createdAt: 'desc' },
        });
    }

    async findOne(id: string) {
        const turma = await this.prisma.turma.findUnique({
            where: { id },
            include: {
                users: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        avatarUrl: true,
                    },
                },
                areas: {
                    include: { category: true }
                }
            },
        });

        if (!turma) {
            throw new NotFoundException(`Turma with ID ${id} not found`);
        }

        return turma;
    }

    async create(createTurmaDto: CreateTurmaDto & { locationId?: string }) {
        return this.prisma.turma.create({
            data: createTurmaDto,
        });
    }

    async update(id: string, updateTurmaDto: UpdateTurmaDto) {
        return this.prisma.turma.update({
            where: { id },
            data: updateTurmaDto,
        });
    }

    async remove(id: string) {
        return this.prisma.turma.delete({
            where: { id },
        });
    }

    async addUserToTurma(turmaId: string, userId: string) {
        return this.prisma.turma.update({
            where: { id: turmaId },
            data: {
                users: {
                    connect: { id: userId },
                },
            },
        });
    }

    async removeUserFromTurma(turmaId: string, userId: string) {
        return this.prisma.turma.update({
            where: { id: turmaId },
            data: {
                users: {
                    disconnect: { id: userId },
                },
            },
        });
    }

    async syncAreas(turmaId: string, categoryIds: string[]) {
        return this.prisma.$transaction(async (tx) => {
            // Remove existing areas
            await tx.turmaArea.deleteMany({
                where: { turmaId },
            });

            // Add new areas
            if (categoryIds.length > 0) {
                await tx.turmaArea.createMany({
                    data: categoryIds.map((categoryId) => ({
                        turmaId,
                        categoryId,
                    })),
                });
            }

            return tx.turma.findUnique({
                where: { id: turmaId },
                include: {
                    areas: {
                        include: { category: true }
                    }
                }
            });
        });
    }
}
