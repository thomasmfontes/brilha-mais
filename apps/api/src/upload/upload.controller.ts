import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// Forçamos o uso de memória (Buffer) para evitar erros de permissão de escrita no disco (Vercel)
@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
    @Post()
    @UseInterceptors(
        FileInterceptor('file', {
            storage: memoryStorage(),
            limits: {
                fileSize: 50 * 1024 * 1024, // 50MB limit
            },
        }),
    )
    uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new HttpException('Arquivo não enviado ou inválido', HttpStatus.BAD_REQUEST);
        }

        // Em ambientes serverless (Vercel), o arquivo não é salvo localmente.
        // O buffer do arquivo está disponível em file.buffer para envio posterior ao S3/Supabase.
        const timestamp = Date.now();
        const filename = `upload-${timestamp}-${file.originalname}`;
        
        // Retornamos uma URL temporária/placeholder para não quebrar o frontend.
        const url = `/api/upload/temp/${filename}`;
        
        return { 
            url,
            message: 'Upload realizado com sucesso (Em Memória). Observação: Para persistência em produção, é necessário configurar o Amazon S3 ou Supabase Storage.'
        };
    }
}
