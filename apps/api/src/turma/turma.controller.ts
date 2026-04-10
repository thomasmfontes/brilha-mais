import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards } from '@nestjs/common';
import { TurmaService } from './turma.service';
import { CreateTurmaDto, UpdateTurmaDto } from './turma.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('turmas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TurmaController {
    constructor(private readonly turmaService: TurmaService) { }

    @Get()
    @Roles('ADMIN')
    findAll() {
        return this.turmaService.findAll();
    }

    @Get(':id')
    @Roles('ADMIN')
    findOne(@Param('id') id: string) {
        return this.turmaService.findOne(id);
    }

    @Post()
    @Roles('ADMIN')
    create(@Body() createTurmaDto: CreateTurmaDto) {
        return this.turmaService.create(createTurmaDto);
    }

    @Put(':id')
    @Roles('ADMIN')
    update(@Param('id') id: string, @Body() updateTurmaDto: UpdateTurmaDto) {
        return this.turmaService.update(id, updateTurmaDto);
    }

    @Delete(':id')
    @Roles('ADMIN')
    remove(@Param('id') id: string) {
        return this.turmaService.remove(id);
    }

    @Post(':id/users/:userId')
    @Roles('ADMIN')
    addUser(@Param('id') id: string, @Param('userId') userId: string) {
        return this.turmaService.addUserToTurma(id, userId);
    }

    @Delete(':id/users/:userId')
    @Roles('ADMIN')
    removeUser(@Param('id') id: string, @Param('userId') userId: string) {
        return this.turmaService.removeUserFromTurma(id, userId);
    }

    @Put(':id/areas')
    @Roles('ADMIN')
    syncAreas(@Param('id') id: string, @Body('categoryIds') categoryIds: string[]) {
        return this.turmaService.syncAreas(id, categoryIds);
    }
}
