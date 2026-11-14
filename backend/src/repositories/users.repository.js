import { prisma } from "../database/prisma.js";

export function findActiveCredentialsByEmail(email) {
  return prisma.user.findUnique({
    where: { email, isActive: true },
    select: { id: true, role: true, passwordHash: true },
  });
}

export function findActiveUserProfile(userId) {
  return prisma.user.findUnique({
    where: { id: userId, isActive: true },
    select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, role: true },
  });
}
