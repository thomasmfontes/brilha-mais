import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    // Conexão assíncrona para não bloquear a subida da API HTTP na porta 3000 caso o banco esteja hibernando
    this.$connect()
      .then(() => {
        this.logger.log('📥 Database connected successfully');
      })
      .catch((error) => {
        this.logger.error('❌ Failed to connect to database (verifique se o Supabase está ativo/hibernado):', error.message || error);
      });
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('📤 Database disconnected');
  }
}
