import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateTurmaDto, UpdateTurmaDto } from './turma.dto';

@Injectable()
export class TurmaService {
    constructor(private prisma: PrismaService) { }

    async findAll() {
        return this.prisma.turma.findMany({
            include: {
                _count: {
                    select: { users: true },
                },
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
                    },
                },
            },
        });

        if (!turma) {
            throw new NotFoundException(`Turma with ID ${id} not found`);
        }

        return turma;
    }

    async create(createTurmaDto: CreateTurmaDto) {
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
}
