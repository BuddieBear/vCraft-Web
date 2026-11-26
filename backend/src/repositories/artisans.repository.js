import { prisma } from "../database/prisma.js";
import { demoWorkshopDomain } from "../data/demo-workshop.js";

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
            user: { select: { fullName: true, email: true, phone: true, isActive: true } },
        },
    });
}

export function findOwnWorkshop(userId) {
    return prisma.artisanProfile.findFirst({ where: { userId, user: { isActive: true, role: "ARTISAN" } }, include: { certificates: true } });
}
export function updateOwnWorkshop(userId, data) {
    return prisma.artisanProfile.updateMany({ where: { userId, user: { isActive: true, role: "ARTISAN" } }, data });
}
export function addOwnCertificate(userId, data) {
    return prisma.$transaction(async (tx) => {
        const workshop = await tx.artisanProfile.findFirst({ where: { userId, user: { isActive: true, role: "ARTISAN" } }, select: { id: true } });
        return workshop ? tx.artisanCertificate.create({ data: { ...data, artisanId: workshop.id } }) : null;
    });
}
export function deleteOwnCertificate(userId, id) {
    return prisma.artisanCertificate.deleteMany({ where: { id, artisan: { userId, user: { isActive: true, role: "ARTISAN" } } } });
}
