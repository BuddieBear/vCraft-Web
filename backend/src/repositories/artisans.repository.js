import { prisma } from "../database/prisma.js";

const publicWorkshop = { verificationStatus: "APPROVED", user: { isActive: true } };
const fields = {
    id: true, workshopName: true, artisanTitle: true, familyHistory: true,
    address: true, latitude: true, longitude: true, openingHours: true,
    isOpenForVisitors: true, coverImageUrl: true, galleryImages: true,
    averageRating: true, totalReviews: true,
};

export function listPublicArtisans({ skip = 0, take = 24, visitorsOnly = false } = {}) {
    return prisma.artisanProfile.findMany({
        where: { ...publicWorkshop, ...(visitorsOnly ? { isOpenForVisitors: true } : {}) },
        select: fields, orderBy: [{ workshopName: "asc" }, { id: "asc" }], skip, take,
    });
}

export function findPublicArtisan(id) {
    return prisma.artisanProfile.findUnique({
        where: { id, ...publicWorkshop },
        select: { ...fields, certificates: { select: { id: true, title: true, issuingAuthority: true, issuedYear: true, certificateImageUrl: true } } },
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
