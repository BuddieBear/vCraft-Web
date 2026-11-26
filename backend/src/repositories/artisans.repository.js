import { prisma } from "../database/prisma.js";
import { demoWorkshopDomain } from "../data/demo-workshop.js";
import { Prisma } from "@prisma/client";
import { lockWorkshopForUser } from "../database/postgresql/row-locks.js";

export const tradingWorkshop = { verificationStatus: "APPROVED", isSuspended: false, user: { isActive: true, role: "ARTISAN" } };
const publicWorkshop = tradingWorkshop;
const publicStorefront = { ...publicWorkshop, user: { ...publicWorkshop.user, email: { not: { endsWith: demoWorkshopDomain }, mode: "insensitive" } } };
const fields = {
    id: true, workshopName: true, artisanTitle: true, familyHistory: true,
    address: true, latitude: true, longitude: true, openingHours: true,
    isOpenForVisitors: true, coverImageUrl: true, galleryImages: true,
    averageRating: true, totalReviews: true,
};
const certificates = {
    select: { id: true, title: true, issuingAuthority: true, issuedYear: true, certificateImageUrl: true },
    orderBy: [{ issuedYear: "desc" }, { id: "asc" }],
};

export function listPublicArtisans({ skip = 0, take = 24, visitorsOnly = false, storefront = false } = {}) {
    return prisma.artisanProfile.findMany({
        where: { ...(storefront ? publicStorefront : publicWorkshop), ...(visitorsOnly ? { isOpenForVisitors: true } : {}) },
        select: fields, orderBy: [{ workshopName: "asc" }, { id: "asc" }], skip, take,
    });
}

export function findPublicArtisan(id, storefront = false) {
    return prisma.artisanProfile.findUnique({
        where: { id, ...(storefront ? publicStorefront : publicWorkshop) },
        select: { ...fields, certificates },
    });
}

export function findArtisanForReview(id) {
    return prisma.artisanProfile.findUnique({
        where: { id, user: { role: "ARTISAN" } },
        select: {
            ...fields, certificates, experienceYears: true, verificationStatus: true, isSuspended: true, createdAt: true,
            reviewVersion: true, pendingIdentity: true, rejectionReason: true,
            user: { select: { fullName: true, email: true, username: true, phone: true, isActive: true } },
        },
    });
}

export function findOwnWorkshop(userId) {
    return prisma.artisanProfile.findFirst({ where: { userId, user: { isActive: true, role: "ARTISAN" } }, include: { certificates: true } });
}
export function updateOwnWorkshop(userId, { workshopName, address, latitude, longitude, ...profile }) {
    return prisma.$transaction(async tx => {
        const [row] = await lockWorkshopForUser(tx, userId);
        if (!row) return null;
        const workshop = await tx.artisanProfile.findUniqueOrThrow({ where: { id: row.id } });
        const changes = { workshopName, address, latitude, longitude };
        const data = { ...profile, reviewVersion: { increment: 1 } };
        if (workshop.verificationStatus === "APPROVED") {
            const released = { workshopName: workshop.workshopName, address: workshop.address, latitude: workshop.latitude.toString(), longitude: workshop.longitude.toString() };
            const candidate = { ...released, ...workshop.pendingIdentity };
            for (const [key, value] of Object.entries(changes)) {
                if (value !== undefined) candidate[key] = typeof value === "number" ? new Prisma.Decimal(value).toDecimalPlaces(7).toString() : value;
            }
            data.pendingIdentity = Object.keys(released).some(key => released[key] !== candidate[key]) ? candidate : Prisma.DbNull;
        } else Object.assign(data, changes);
        return tx.artisanProfile.update({ where: { id: row.id }, data, include: { certificates: true } });
    });
}

export function resubmitWorkshop(userId) {
    return prisma.artisanProfile.updateMany({
        where: { userId, verificationStatus: "REJECTED", user: { isActive: true, role: "ARTISAN" } },
        data: { verificationStatus: "PENDING", reviewVersion: { increment: 1 } },
    });
}
export function addOwnCertificate(userId, data) {
    return prisma.$transaction(async (tx) => {
        const [workshop] = await lockWorkshopForUser(tx, userId);
        if (!workshop) return null;
        const certificate = await tx.artisanCertificate.create({ data: { ...data, artisanId: workshop.id } });
        await tx.artisanProfile.update({ where: { id: workshop.id }, data: { reviewVersion: { increment: 1 } } });
        return certificate;
    });
}
export function deleteOwnCertificate(userId, id) {
    return prisma.$transaction(async tx => {
        const [workshop] = await lockWorkshopForUser(tx, userId);
        if (!workshop) return { count: 0 };
        const result = await tx.artisanCertificate.deleteMany({ where: { id, artisanId: workshop.id } });
        if (result.count) await tx.artisanProfile.update({ where: { id: workshop.id }, data: { reviewVersion: { increment: 1 } } });
        return result;
    });
}
