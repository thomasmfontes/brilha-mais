import { Module } from '@nestjs/common';
import { InPersonMeetingService } from './in-person-meeting.service';
import { InPersonMeetingController } from './in-person-meeting.controller';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret-key-donotuseinprod',
      signOptions: { expiresIn: '15s' },
    }),
  ],
  controllers: [InPersonMeetingController],
  providers: [InPersonMeetingService],
})
export class InPersonMeetingModule {}
