import { prisma } from "../database/prisma.js";
import { lockActiveUserPassword, lockWorkshopForUser } from "../database/postgresql/row-locks.js";
import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { ApiError } from "../middlewares/api-error.js";

export function createBuyer({ email, username, fullName, passwordHash }) {
    return prisma.user.create({ data: { email, username, fullName, passwordHash, role: "BUYER" }, select: { id: true, email: true, username: true, fullName: true, role: true } });
}
export function createArtisanAccount(userId, account, profile) {
    return prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: { ...account, role: "ARTISAN", artisanProfile: { create: profile } }, select: { id: true, email: true, fullName: true, role: true, artisanProfile: true } });
        await tx.auditLog.create({ data: { userId, action: "ARTISAN_CREATED", targetTable: "users", targetRecordId: user.id } });
        return user;
    });
}
export function listAdminArtisans({ skip, take, status }) {
    const identity = status === "IDENTITY_REVIEW";
    const approved = identity || status === "APPROVED" || status === "SUSPENDED";
    return prisma.artisanProfile.findMany({
        where: {
            verificationStatus: approved ? "APPROVED" : status,
            ...(identity ? { pendingIdentity: { not: Prisma.DbNull } } : approved && { isSuspended: status === "SUSPENDED" }),
        },
        select: { id: true, userId: true, workshopName: true, address: true, createdAt: true, rejectionReason: true, user: { select: { email: true, fullName: true, isActive: true } } },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }], skip, take,
    });
}
export function decideArtisan(adminId, id, { status, expectedVersion, reason }) {
    return prisma.$transaction(async (tx) => {
        const workshop = await tx.artisanProfile.findFirst({ where: { id, user: { isActive: true, role: "ARTISAN" } } });
        const identity = workshop?.verificationStatus === "APPROVED" && workshop.pendingIdentity;
        if (!identity && workshop?.verificationStatus !== "PENDING") return { count: 0 };
        const accepted = status === "APPROVED";
        const data = {
            reviewVersion: { increment: 1 }, rejectionReason: accepted ? null : reason,
            ...(identity ? { pendingIdentity: Prisma.DbNull, ...(accepted && workshop.pendingIdentity) } : { verificationStatus: status }),
            ...(accepted ? { verifiedAt: new Date() } : identity ? {} : { verifiedAt: null }),
        };
        const result = await tx.artisanProfile.updateMany({ where: { id, reviewVersion: expectedVersion, verificationStatus: workshop.verificationStatus, user: { isActive: true, role: "ARTISAN" } }, data });
        if (!result.count) throw new ApiError(409, "STALE_WORKSHOP_REVIEW", "Hồ sơ vừa thay đổi. Mở lại minh chứng trước khi xét duyệt.");
        await tx.auditLog.create({ data: {
            userId: adminId, action: `ARTISAN_${identity ? "IDENTITY_" : ""}${status}`, targetTable: "artisan_profiles", targetRecordId: id,
            metadata: { expectedVersion, ...(reason && { reason }), ...(identity && { proposedIdentity: workshop.pendingIdentity }) },
        } });
        return result;
    });
}

export function setArtisanSuspension(adminId, id, isSuspended) {
    return prisma.$transaction(async (tx) => {
        const result = await tx.artisanProfile.updateMany({
            where: { id, verificationStatus: "APPROVED", isSuspended: !isSuspended, user: { isActive: true, role: "ARTISAN" } },
            data: { isSuspended },
        });
        if (result.count) await tx.auditLog.create({ data: {
            userId: adminId, action: isSuspended ? "ARTISAN_SUSPENDED" : "ARTISAN_REOPENED",
            targetTable: "artisan_profiles", targetRecordId: id,
        } });
        return result;
    });
}

export function findActiveCredentialsByEmail(email) {
    return prisma.user.findUnique({
        where: { email, isActive: true },
        select: { id: true, email: true, role: true, passwordHash: true },
    });
}

export function findActiveCredentialsByUsername(username) {
    return prisma.user.findUnique({
        where: { username, isActive: true },
        select: { id: true, passwordHash: true },
    });
}

const profileFields = { id: true, fullName: true, email: true, username: true, phone: true, avatarUrl: true, role: true, artisanProfile: { select: { isSuspended: true } } };
const hashToken = (token) => createHash("sha256").update(token).digest("hex");
export function findUserById(id) { return prisma.user.findUnique({ where: { id, isActive: true }, select: profileFields }); }
export function updateUserProfile(id, data) {
    return prisma.$transaction(async tx => {
        const [workshop] = data.fullName !== undefined || data.phone !== undefined ? await lockWorkshopForUser(tx, id) : [];
        const profile = await tx.user.update({ where: { id, isActive: true }, data, select: profileFields });
        if (workshop) await tx.artisanProfile.update({ where: { id: workshop.id }, data: { reviewVersion: { increment: 1 } } });
        return profile;
    });
}
export function findPasswordHashById(id) { return prisma.user.findUnique({ where: { id, isActive: true }, select: { passwordHash: true } }); }
async function lockActiveUser(tx, id) {
    const [user] = await lockActiveUserPassword(tx, id);
    return user;
}

async function invalidateCredentials(tx, userId, now) {
    await tx.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
    await tx.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } });
}

export function updatePasswordAndRevokeSessions(id, expectedHash, passwordHash) {
    return prisma.$transaction(async (tx) => {
        const updated = await tx.user.updateMany({ where: { id, isActive: true, passwordHash: expectedHash }, data: { passwordHash } });
        if (!updated.count) return false;
        await invalidateCredentials(tx, id, new Date());
        return true;
    });
}

export function createAuthSession({ userId, expectedHash, jti, expiresAt }) {
    return prisma.$transaction(async (tx) => {
        const user = await lockActiveUser(tx, userId);
        if (!user || user.password_hash !== expectedHash) return null;
        return tx.authSession.create({ data: { userId, jti, expiresAt }, select: { id: true } });
    });
}
export function findActiveSession(userId, jti) { return prisma.authSession.findFirst({ where: { userId, jti, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } }); }
export function revokeAuthSession(userId, jti) { return prisma.authSession.updateMany({ where: { userId, jti, revokedAt: null }, data: { revokedAt: new Date() } }); }
export function revokeAllAuthSessions(userId) { return prisma.authSession.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }); }
export function createPasswordResetToken(userId, expectedHash, token, expiresAt) {
    return prisma.$transaction(async tx => {
        const user = await lockActiveUser(tx, userId);
        if (!user || user.password_hash !== expectedHash) return null;
        await tx.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
        return tx.passwordResetToken.create({ data: { userId, tokenHash: hashToken(token), expiresAt }, select: { id: true } });
    });
}
export function findValidPasswordResetToken(token) { return prisma.passwordResetToken.findFirst({ where: { tokenHash: hashToken(token), usedAt: null, expiresAt: { gt: new Date() }, user: { isActive: true } }, select: { id: true, userId: true } }); }
export function consumePasswordResetToken(id, userId, passwordHash) {
    return prisma.$transaction(async (tx) => {
        if (!await lockActiveUser(tx, userId)) return false;
        const now = new Date();
        const result = await tx.passwordResetToken.updateMany({
            where: { id, userId, usedAt: null, expiresAt: { gt: now } },
            data: { usedAt: now },
        });
        if (!result.count) return false;
        await tx.user.update({ where: { id: userId, isActive: true }, data: { passwordHash } });
        await invalidateCredentials(tx, userId, now);
        return true;
    });
}

export function findActiveUserProfile(userId) {
    return prisma.user.findUnique({
        where: { id: userId, isActive: true },
        select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, role: true },
    });
}
export function findActiveUserById(id) { return prisma.user.findUnique({ where: { id, isActive: true }, select: { id: true, role: true } }); }
