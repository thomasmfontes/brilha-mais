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
    // Conexão assíncrona resiliente com retry automático para absorver instabilidades transitórias do pooler / cold start
    this.connectWithRetry();
  }

  private async connectWithRetry(retries = 3, delayMs = 2500) {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        await this.$connect();
        await this.$queryRaw`SELECT 1`;
        this.logger.log(`📥 Database connected successfully (attempt ${attempt}/${retries})`);
        return;
      } catch (error: any) {
        if (attempt < retries) {
          this.logger.warn(
            `⚠️ Database connection attempt ${attempt}/${retries} failed (${error.message || error}). Retrying in ${delayMs / 1000}s...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        } else {
          this.logger.error(
            '❌ Failed to connect to database (verifique se o Supabase está ativo/hibernado):',
            error.message || error,
          );
        }
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('📤 Database disconnected');
  }
}
