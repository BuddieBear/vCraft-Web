import { prisma } from "../database/prisma.js";

export function createBuyer({ email, fullName, passwordHash }) {
  return prisma.user.create({ data: { email, fullName, passwordHash, role: "BUYER" }, select: { id: true, email: true, fullName: true, role: true } });
}
export function createArtisanAccount(userId, account, profile) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { ...account, role: "ARTISAN", artisanProfile: { create: profile } }, select: { id: true, email: true, fullName: true, role: true, artisanProfile: true } });
    await tx.auditLog.create({ data: { userId, action: "ARTISAN_CREATED", targetTable: "users", targetRecordId: user.id } });
    return user;
  });
}
export function listPendingArtisans({ skip, take }) {
  return prisma.artisanProfile.findMany({ where: { verificationStatus: "PENDING" }, select: { id: true, userId: true, workshopName: true, address: true, createdAt: true, user: { select: { email: true, fullName: true, isActive: true } } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }], skip, take });
}
export function decideArtisan(adminId, id, verificationStatus) {
  return prisma.$transaction(async (tx) => {
    const result = await tx.artisanProfile.updateMany({ where: { id, verificationStatus: "PENDING" }, data: { verificationStatus, verifiedAt: verificationStatus === "APPROVED" ? new Date() : null } });
    if (result.count) await tx.auditLog.create({ data: { userId: adminId, action: `ARTISAN_${verificationStatus}`, targetTable: "artisan_profiles", targetRecordId: id } });
    return result;
  });
}

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
