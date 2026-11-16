import { prisma } from "../database/prisma.js";

export function listNews({ skip = 0, take = 24, category } = {}) {
    return prisma.communityNews.findMany({
        where: { publishedAt: { lte: new Date() }, ...(category ? { category } : {}) },
        select: { id: true, slug: true, title: true, category: true, thumbnailUrl: true, isPinned: true, publishedAt: true },
        orderBy: [{ isPinned: "desc" }, { publishedAt: "desc" }, { id: "desc" }], skip, take,
    });
}

export function findNewsBySlug(slug) {
    return prisma.communityNews.findUnique({
        where: { slug, publishedAt: { lte: new Date() } },
        select: { id: true, slug: true, title: true, category: true, content: true, thumbnailUrl: true, isPinned: true, publishedAt: true },
    });
}

export function listAdminNews({ skip, take }) { return prisma.communityNews.findMany({ orderBy: [{ createdAt: "desc" }, { id: "desc" }], skip, take }); }
export function createNews(adminId, data) {
    return prisma.$transaction(async (tx) => {
        const item = await tx.communityNews.create({ data: { ...data, authorAdminId: adminId } });
        await tx.auditLog.create({ data: { userId: adminId, action: "NEWS_CREATED", targetTable: "community_news", targetRecordId: item.id } });
        return item;
    });
}
export function updateNews(adminId, id, data) {
    return prisma.$transaction(async (tx) => {
        const result = await tx.communityNews.updateMany({ where: { id }, data });
        if (!result.count) return null;
        await tx.auditLog.create({ data: { userId: adminId, action: "NEWS_UPDATED", targetTable: "community_news", targetRecordId: id } });
        return tx.communityNews.findUnique({ where: { id } });
    });
}
export function deleteNews(adminId, id) {
    return prisma.$transaction(async (tx) => {
        const result = await tx.communityNews.deleteMany({ where: { id } });
        if (result.count) await tx.auditLog.create({ data: { userId: adminId, action: "NEWS_DELETED", targetTable: "community_news", targetRecordId: id } });
        return result;
    });
}
