import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Request,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  SubmitTaskCompletionDto,
  ReviewTaskCompletionDto,
} from './dto/task.dto';
import { AdminJwtAuthGuard } from '../admin/guards/admin-jwt-auth.guard';
import { TelegramAuthGuard } from '../auth/guards/telegram-auth.guard';
import { VerifiedTelegramUser } from '../auth/guards/telegram-auth.guard';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // --- Client Endpoints ---

  @UseGuards(TelegramAuthGuard)
  @Get()
  async listMyTasks(@Request() req: { user: VerifiedTelegramUser }) {
    return this.tasksService.listTasksForUser(req.user.id);
  }

  @UseGuards(TelegramAuthGuard)
  @Post(':id/complete')
  async submitCompletion(
    @Request() req: { user: VerifiedTelegramUser },
    @Param('id') id: string,
    @Body() dto: SubmitTaskCompletionDto,
  ) {
    return this.tasksService.submitCompletion(req.user.id, id, dto);
  }

  // --- Admin Endpoints ---

  @UseGuards(AdminJwtAuthGuard)
  @Post()
  async createTask(@Request() req: any, @Body() dto: CreateTaskDto) {
    return this.tasksService.createTask(req.user.id, dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Patch(':id')
  async updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.updateTask(id, dto);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Delete(':id')
  async deleteTask(@Param('id') id: string) {
    return this.tasksService.deleteTask(id);
  }

  @UseGuards(AdminJwtAuthGuard)
  @Post('completions/:id/review')
  async reviewCompletion(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: ReviewTaskCompletionDto,
  ) {
    return this.tasksService.reviewCompletion(req.user.id, id, dto);
  }
}
