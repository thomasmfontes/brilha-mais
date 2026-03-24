import { Controller, Post, UseInterceptors, UploadedFile, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// O Vercel possui um filesystem somente leitura. Não podemos usar diskStorage nela.
const isVercel = process.env.VERCEL === '1';

@Controller('upload')
@UseGuards(JwtAuthGuard)
export class UploadController {
    @Post()
    @UseInterceptors(
        FileInterceptor('file', {
            storage: isVercel ? memoryStorage() : diskStorage({
                destination: './public/uploads',
                filename: (req, file, callback) => {
                    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = extname(file.originalname);
                    callback(null, `${uniqueSuffix}${ext}`);
                },
            }),
            limits: {
                fileSize: 50 * 1024 * 1024, // 50MB limit
            },
        }),
    )
    uploadFile(@UploadedFile() file: Express.Multer.File) {
        if (!file) {
            throw new HttpException('Arquivo não enviado ou inválido', HttpStatus.BAD_REQUEST);
        }

        // Se estiver na Vercel, o arquivo está na memória (buffer). 
        // Você precisaria enviar para o S3/Supabase aqui para ter uma URL real.
        const filename = file.filename || `memory-${Date.now()}-${file.originalname}`;
        const url = isVercel ? `/api/upload/fake-url/${filename}` : `/public/uploads/${filename}`;
        
        return { 
            url,
            message: isVercel ? 'Upload em memória (Vercel detectada). Configure S3 para produção.' : 'Upload em disco local.'
        };
    }
}
