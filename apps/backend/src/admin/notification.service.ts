import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramBotService } from '../telegram-bot/telegram-bot.service';
import { EventLogService } from '../event-log/event-log.service';
import { NotificationType, NotificationStatus, Prisma } from '@prisma/client';

export interface CreateNotificationDto {
  type: NotificationType;
  title?: string;
  body: string;
  targetFilter?: { all?: boolean; userIds?: string[] };
  scheduledAt?: Date;
}

export interface UpdateNotificationDto {
  type?: NotificationType;
  title?: string;
  body?: string;
  targetFilter?: { all?: boolean; userIds?: string[] };
  scheduledAt?: Date;
}

export interface NotificationDetailResponse {
  id: string;
  type: NotificationType;
  title: string | null;
  body: string;
  status: NotificationStatus;
  targetFilter: unknown;
  scheduledAt: Date | null;
  sentAt: Date | null;
  totalRecipients: number;
  deliveredCount: number;
  failedCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginatedNotifications {
  items: Array<{
    id: string;
    type: NotificationType;
    title: string | null;
    body: string;
    status: NotificationStatus;
    totalRecipients: number;
    deliveredCount: number;
    failedCount: number;
    scheduledAt: Date | null;
    sentAt: Date | null;
    createdAt: Date;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PaginatedDeliveries {
  items: Array<{
    id: string;
    notificationId: string;
    userId: string;
    username: string | null;
    tgId: string;
    deliveryStatus: string;
    deliveredAt: Date | null;
    readAt: Date | null;
    errorMessage: string | null;
  }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramBotService: TelegramBotService,
    private readonly eventLog: EventLogService,
  ) {}

  /**
   * List notifications with pagination
   */
  async listNotifications(
    page = 1,
    pageSize = 20,
    status?: NotificationStatus,
  ): Promise<PaginatedNotifications> {
    const where: Prisma.NotificationWhereInput = {};

    if (status) {
      where.status = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.notification.count({ where }),
    ]);

    return {
      items: items.map((n) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        status: n.status,
        totalRecipients: n.totalRecipients,
        deliveredCount: n.deliveredCount,
        failedCount: n.failedCount,
        scheduledAt: n.scheduledAt,
        sentAt: n.sentAt,
        createdAt: n.createdAt,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Get notification by ID
   */
  async getNotification(id: string): Promise<NotificationDetailResponse> {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      status: notification.status,
      targetFilter: notification.targetFilter,
      scheduledAt: notification.scheduledAt,
      sentAt: notification.sentAt,
      totalRecipients: notification.totalRecipients,
      deliveredCount: notification.deliveredCount,
      failedCount: notification.failedCount,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt,
    };
  }

  /**
   * Create notification
   */
  async createNotification(
    dto: CreateNotificationDto,
    createdById: string,
  ): Promise<NotificationDetailResponse> {
    const notification = await this.prisma.notification.create({
      data: {
        type: dto.type,
        title: dto.title,
        body: dto.body,
        targetFilter: (dto.targetFilter ?? { all: true }) as Prisma.InputJsonValue,
        scheduledAt: dto.scheduledAt,
        status: 'DRAFT',
        createdById,
      },
    });

    this.logger.log(`Notification created (id: ${notification.id}) by ${createdById}`);

    // Audit log
    this.eventLog.log({
      eventType: 'ADMIN_ACTION',
      actorId: createdById,
      actorType: 'ADMIN',
      targetId: notification.id,
      targetType: 'NOTIFICATION',
      details: {
        action: 'NOTIFICATION_CREATED',
        type: notification.type,
        title: notification.title,
      },
    });

    return this.getNotification(notification.id);
  }

  /**
   * Update notification
   */
  async updateNotification(
    id: string,
    dto: UpdateNotificationDto,
    updatedById?: string,
  ): Promise<NotificationDetailResponse> {
    const existing = await this.prisma.notification.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    if (existing.status !== 'DRAFT' && existing.status !== 'SCHEDULED') {
      throw new BadRequestException(`Cannot update notification with status ${existing.status}`);
    }

    await this.prisma.notification.update({
      where: { id },
      data: {
        type: dto.type,
        title: dto.title,
        body: dto.body,
        targetFilter: dto.targetFilter as Prisma.InputJsonValue | undefined,
        scheduledAt: dto.scheduledAt,
      },
    });

    this.logger.log(`Notification ${id} updated`);

    // Audit log
    if (updatedById) {
      this.eventLog.log({
        eventType: 'ADMIN_ACTION',
        actorId: updatedById,
        actorType: 'ADMIN',
        targetId: id,
        targetType: 'NOTIFICATION',
        details: { action: 'NOTIFICATION_UPDATED' },
      });
    }

    return this.getNotification(id);
  }

  /**
   * Delete notification
   */
  async deleteNotification(id: string, deletedById?: string): Promise<void> {
    const existing = await this.prisma.notification.findUnique({ where: { id } });

    if (!existing) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    if (existing.status !== 'DRAFT') {
      throw new BadRequestException(`Can only delete DRAFT notifications`);
    }

    await this.prisma.notificationDelivery.deleteMany({ where: { notificationId: id } });
    await this.prisma.notification.delete({ where: { id } });

    this.logger.log(`Notification ${id} deleted`);

    // Audit log
    if (deletedById) {
      this.eventLog.log({
        eventType: 'ADMIN_ACTION',
        actorId: deletedById,
        actorType: 'ADMIN',
        targetId: id,
        targetType: 'NOTIFICATION',
        details: { action: 'NOTIFICATION_DELETED', title: existing.title },
      });
    }
  }

  /**
   * Send notification to users
   */
  async sendNotification(
    id: string,
    adminId: string,
  ): Promise<{ success: boolean; totalRecipients: number; delivered: number; failed: number }> {
    const notification = await this.prisma.notification.findUnique({ where: { id } });

    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    if (notification.status !== 'DRAFT' && notification.status !== 'SCHEDULED') {
      throw new BadRequestException(`Cannot send notification with status ${notification.status}`);
    }

    // Update status to SENDING
    await this.prisma.notification.update({
      where: { id },
      data: { status: 'SENDING' },
    });

    try {
      // Get target users based on filter
      const targetFilter = notification.targetFilter as { all?: boolean; userIds?: string[] };
      let users: Array<{ id: string; tgId: bigint }>;

      if (targetFilter.userIds && targetFilter.userIds.length > 0) {
        users = await this.prisma.user.findMany({
          where: { id: { in: targetFilter.userIds } },
          select: { id: true, tgId: true },
        });
      } else {
        // All users
        users = await this.prisma.user.findMany({
          where: { blockedAt: null },
          select: { id: true, tgId: true },
        });
      }

      const totalRecipients = users.length;
      let deliveredCount = 0;
      let failedCount = 0;

      // Create delivery records and send messages
      const bot = this.telegramBotService.getBot();
      const messageText = notification.title
        ? `*${notification.title}*\n\n${notification.body}`
        : notification.body;

      for (const user of users) {
        let deliveryStatus = 'PENDING';
        let errorMessage: string | null = null;
        let deliveredAt: Date | null = null;

        if (bot) {
          try {
            await bot.api.sendMessage(user.tgId.toString(), messageText, {
              parse_mode: 'Markdown',
            });
            deliveryStatus = 'DELIVERED';
            deliveredAt = new Date();
            deliveredCount++;
          } catch (err) {
            deliveryStatus = 'FAILED';
            errorMessage = err instanceof Error ? err.message : 'Unknown error';
            failedCount++;
            this.logger.warn(`Failed to send notification to user ${user.id}: ${errorMessage}`);
          }
        } else {
          // Bot not configured - mark as failed
          deliveryStatus = 'FAILED';
          errorMessage = 'Telegram bot not configured';
          failedCount++;
        }

        // Create delivery record
        await this.prisma.notificationDelivery.create({
          data: {
            notificationId: id,
            userId: user.id,
            deliveryStatus,
            deliveredAt,
            errorMessage,
          },
        });
      }

      // Update notification with results
      const finalStatus = failedCount === totalRecipients ? 'FAILED' : 'SENT';
      await this.prisma.notification.update({
        where: { id },
        data: {
          status: finalStatus,
          sentAt: new Date(),
          totalRecipients,
          deliveredCount,
          failedCount,
        },
      });

      this.logger.log(
        `Notification ${id} sent by ${adminId}: ${deliveredCount}/${totalRecipients} delivered, ${failedCount} failed`,
      );

      // Audit log
      this.eventLog.log({
        eventType: 'ADMIN_ACTION',
        actorId: adminId,
        actorType: 'ADMIN',
        targetId: id,
        targetType: 'NOTIFICATION',
        details: {
          action: 'NOTIFICATION_SENT',
          totalRecipients,
          deliveredCount,
          failedCount,
        },
      });

      return {
        success: true,
        totalRecipients,
        delivered: deliveredCount,
        failed: failedCount,
      };
    } catch (err) {
      // Mark as failed on error
      await this.prisma.notification.update({
        where: { id },
        data: { status: 'FAILED' },
      });

      this.logger.error(`Failed to send notification ${id}: ${err}`);
      throw err;
    }
  }

  /**
   * Get notification deliveries
   */
  async getNotificationDeliveries(
    notificationId: string,
    page = 1,
    pageSize = 20,
    status?: string,
  ): Promise<PaginatedDeliveries> {
    const where: Prisma.NotificationDeliveryWhereInput = { notificationId };

    if (status) {
      where.deliveryStatus = status;
    }

    const [items, total] = await Promise.all([
      this.prisma.notificationDelivery.findMany({
        where,
        orderBy: { deliveredAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          user: { select: { id: true, username: true, tgId: true } },
        },
      }),
      this.prisma.notificationDelivery.count({ where }),
    ]);

    return {
      items: items.map((d) => ({
        id: d.id,
        notificationId: d.notificationId,
        userId: d.user.id,
        username: d.user.username,
        tgId: d.user.tgId.toString(),
        deliveryStatus: d.deliveryStatus,
        deliveredAt: d.deliveredAt,
        readAt: d.readAt,
        errorMessage: d.errorMessage,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }
}
