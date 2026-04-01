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
        // Initial initialization attempt
        this.getSupabase();
    }

    private getSupabase() {
        if (this.supabase) return this.supabase;

        const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
        const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

        if (!url || !key) {
            console.error('Supabase URL ou Key não encontrados no process.env');
            return null;
        }

        try {
            this.supabase = createClient(url, key);
            return this.supabase;
        } catch (e) {
            console.error('Erro ao criar cliente Supabase:', e);
            return null;
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
        try {
            if (!file) {
                throw new HttpException('Arquivo não enviado ou inválido', HttpStatus.BAD_REQUEST);
            }

            const supabase = this.getSupabase();
            if (!supabase) {
                console.error('Falha ao inicializar Supabase - verifique SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY');
                throw new HttpException('Configuração de storage ausente no servidor', HttpStatus.INTERNAL_SERVER_ERROR);
            }

            const timestamp = Date.now();
            const originalName = file.originalname || 'upload.jpg';
            const fileExt = originalName.split('.').pop() || 'jpg';
            const fileName = `${timestamp}-${Math.random().toString(36).substring(7)}.${fileExt}`;
            const filePath = `courses/${fileName}`;

            const { data, error } = await supabase.storage
                .from('course-images')
                .upload(filePath, file.buffer, {
                    contentType: file.mimetype,
                    upsert: true
                });

            if (error) {
                console.error('Erro no Supabase Storage:', error);
                throw new HttpException(`Erro ao salvar arquivo no storage: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
            }

            // Pegar a URL pública
            const { data: { publicUrl } } = supabase.storage
                .from('course-images')
                .getPublicUrl(filePath);

            return {
                url: publicUrl,
                message: 'Upload realizado com sucesso no Supabase Storage'
            };
        } catch (error) {
            console.error('Erro geral no uploadFile:', error);
            if (error instanceof HttpException) throw error;
            throw new HttpException(`Erro interno no servidor de upload: ${error.message || 'Desconhecido'}`, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}
