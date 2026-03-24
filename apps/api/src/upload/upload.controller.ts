import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { createClient } from '@supabase/supabase-js';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
    private supabase: any;

    constructor() {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (url && key) {
            this.supabase = createClient(url, key);
        }
    }

    @Post()
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: {
                fileSize: 50 * 1024 * 1024, // 50MB limit
            },
        }),
    )
    async uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new HttpException('Arquivo não enviado ou inválido', HttpStatus.BAD_REQUEST);
        }

        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados');
            throw new HttpException('Configuração de storage ausente no servidor', HttpStatus.INTERNAL_SERVER_ERROR);
        }

        const timestamp = Date.now();
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `courses/${fileName}`;

        const { data, error } = await this.supabase.storage
            .from('course-images')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: true
            });

        if (error) {
            console.error('Erro no Supabase Storage:', error);
            throw new HttpException(`Erro ao salvar arquivo: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }

        // Pegar a URL pública
        const { data: { publicUrl } } = this.supabase.storage
            .from('course-images')
            .getPublicUrl(filePath);

        return {
            url: publicUrl,
            message: 'Upload realizado com sucesso no Supabase Storage'
        };
    }
}
