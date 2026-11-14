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
