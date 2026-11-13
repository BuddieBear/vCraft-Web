import { prisma } from "../database/prisma.js";

function requireId(value) {
  if (typeof value !== "string" || !value.trim()) throw new Error("A user and notification ID are required");
}

export function listUserNotifications(userId, { skip = 0, take = 24 } = {}) {
  requireId(userId);
  return prisma.notification.findMany({
    where: { userId },
    select: { id: true, title: true, message: true, type: true, linkUrl: true, isRead: true, createdAt: true },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take,
  });
}

export function markNotificationRead(userId, id) {
  requireId(userId);
  requireId(id);
  return prisma.notification.updateMany({ where: { id, userId, isRead: false }, data: { isRead: true } });
}
