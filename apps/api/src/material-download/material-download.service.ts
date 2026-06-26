import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RecordDownloadDto } from './dto/record-download.dto';

@Injectable()
export class MaterialDownloadService {
  constructor(private prisma: PrismaService) {}

  async record(userId: string, dto: RecordDownloadDto) {
    return this.prisma.materialDownload.create({
      data: {
        userId,
        lessonId: dto.lessonId,
        materialName: dto.materialName,
        materialUrl: dto.materialUrl,
      },
    });
  }

  async getDownloadsByLesson(lessonId: string, materialUrl?: string) {
    const where: any = { lessonId };
    if (materialUrl) where.materialUrl = materialUrl;

    return this.prisma.materialDownload.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
      orderBy: { downloadedAt: 'desc' },
    });
  }

  async getCountsByLesson(lessonId: string) {
    const downloads = await this.prisma.materialDownload.findMany({
      where: { lessonId },
      select: { materialUrl: true, materialName: true, userId: true },
    });

    // Group by materialUrl → count unique users
    const map = new Map<
      string,
      { materialName: string; count: number; uniqueUsers: Set<string> }
    >();
    for (const d of downloads) {
      if (!map.has(d.materialUrl)) {
        map.set(d.materialUrl, {
          materialName: d.materialName,
          count: 0,
          uniqueUsers: new Set(),
        });
      }
      const entry = map.get(d.materialUrl)!;
      entry.uniqueUsers.add(d.userId);
      entry.count = entry.uniqueUsers.size;
    }

    return Array.from(map.entries()).map(([url, val]) => ({
      materialUrl: url,
      materialName: val.materialName,
      downloadCount: val.count,
    }));
  }
}
