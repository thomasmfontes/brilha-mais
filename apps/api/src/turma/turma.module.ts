import { Module } from '@nestjs/common';
import { TurmaService } from './turma.service';
import { TurmaController } from './turma.controller';
import { PrismaService } from '../prisma.service';

@Module({
    controllers: [TurmaController],
    providers: [TurmaService, PrismaService],
    exports: [TurmaService],
})
export class TurmaModule { }
