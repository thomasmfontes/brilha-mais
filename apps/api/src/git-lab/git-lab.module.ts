import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { GitLabController } from './git-lab.controller';
import { GitLabService } from './git-lab.service';

@Module({
  imports: [PrismaModule],
  controllers: [GitLabController],
  providers: [GitLabService],
  exports: [GitLabService],
})
export class GitLabModule {}
