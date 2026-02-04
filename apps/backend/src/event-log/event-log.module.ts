import { Module, Global } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EventLogService } from './event-log.service';
import { EventLogController } from './event-log.controller';

@Global()
@Module({
  imports: [PrismaModule],
  controllers: [EventLogController],
  providers: [EventLogService],
  exports: [EventLogService],
})
export class EventLogModule {}
