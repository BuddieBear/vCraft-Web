import { listUserNotifications, markNotificationRead } from "../repositories/notifications.repository.js";

export function listNotifications(userId, options) { return listUserNotifications(userId, options); }
export async function readNotification(userId, id) {
  return (await markNotificationRead(userId, id)).count === 1;
}
