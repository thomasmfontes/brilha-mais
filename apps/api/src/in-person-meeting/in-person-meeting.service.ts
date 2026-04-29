import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class InPersonMeetingService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async createMeeting(turmaId: string, title: string, date: string) {
    return this.prisma.inPersonMeeting.create({
      data: {
        turmaId,
        title,
        date: new Date(date),
      },
    });
  }

  async getMeetingsByTurma(turmaId: string) {
    return this.prisma.inPersonMeeting.findMany({
      where: { turmaId },
      orderBy: { date: 'desc' },
      include: {
        _count: {
          select: { attendances: true },
        },
      },
    });
  }

  async getMeeting(id: string) {
    const meeting = await this.prisma.inPersonMeeting.findUnique({
      where: { id },
      include: {
        attendances: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatarUrl: true },
            },
          },
          orderBy: { timestamp: 'desc' }
        },
      },
    });
    if (!meeting) throw new NotFoundException('Meeting not found');
    return meeting;
  }

  async generateQrToken(meetingId: string) {
    // Check if meeting exists
    const meeting = await this.prisma.inPersonMeeting.findUnique({ where: { id: meetingId } });
    if (!meeting) throw new NotFoundException('Meeting not found');
    
    // The token expires in 15 seconds (configured in module)
    const payload = { sub: meetingId, type: 'attendance_qr' };
    const token = this.jwtService.sign(payload);
    
    return { token };
  }

  async scanQrCode(userId: string, token: string) {
    try {
      const payload = this.jwtService.verify(token);
      if (payload.type !== 'attendance_qr') {
        throw new BadRequestException('Invalid token type');
      }
      
      const meetingId = payload.sub;

      const meeting = await this.prisma.inPersonMeeting.findUnique({ 
        where: { id: meetingId },
        include: { turma: { include: { users: { select: { id: true } } } } }
      });
      if (!meeting) throw new NotFoundException('Meeting not found');

      // Check if user belongs to the turma
      const userInTurma = meeting.turma.users.some(u => u.id === userId);
      if (!userInTurma) {
        throw new BadRequestException('You do not belong to this class group.');
      }

      // Check if already attended
      const existing = await this.prisma.meetingAttendance.findUnique({
        where: { meetingId_userId: { meetingId, userId } }
      });
      
      if (existing) {
        return { message: 'Presence already recorded' };
      }

      await this.prisma.meetingAttendance.create({
        data: {
          meetingId,
          userId,
        }
      });

      return { message: 'Presence confirmed successfully', meetingId };
    } catch (e) {
      if (e.name === 'TokenExpiredError') {
        throw new BadRequestException('QR Code expired. Please scan again.');
      }
      throw new BadRequestException('Invalid QR Code');
    }
  }

  async markAttendanceManually(meetingId: string, userId: string) {
      const meeting = await this.prisma.inPersonMeeting.findUnique({ 
        where: { id: meetingId },
        include: { turma: { include: { users: { select: { id: true } } } } }
      });
      if (!meeting) throw new NotFoundException('Meeting not found');

      // Check if user belongs to the turma
      const userInTurma = meeting.turma.users.some(u => u.id === userId);
      if (!userInTurma) {
        throw new BadRequestException('User does not belong to this class group.');
      }

      const existing = await this.prisma.meetingAttendance.findUnique({
        where: { meetingId_userId: { meetingId, userId } }
      });
      
      if (existing) {
         await this.prisma.meetingAttendance.delete({
            where: { meetingId_userId: { meetingId, userId } }
         });
         return { status: 'removed' };
      }

      await this.prisma.meetingAttendance.create({
        data: {
          meetingId,
          userId,
        }
      });
      return { status: 'added' };
  }

  async updateMeeting(id: string, title: string, date: string) {
    const meeting = await this.prisma.inPersonMeeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Meeting not found');

    return this.prisma.inPersonMeeting.update({
      where: { id },
      data: {
        title,
        date: new Date(date),
      },
    });
  }

  async deleteMeeting(id: string) {
    const meeting = await this.prisma.inPersonMeeting.findUnique({ where: { id } });
    if (!meeting) throw new NotFoundException('Meeting not found');

    return this.prisma.inPersonMeeting.delete({
      where: { id },
    });
  }
}
