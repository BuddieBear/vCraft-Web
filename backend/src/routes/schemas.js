import { z } from "zod";
export const uuid = z.string().uuid();
export const pageQuery = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1), limit: z.coerce.number().int().min(1).max(100).default(24) }).strict();
export const pageArgs = ({ page, limit }) => ({ skip: (page - 1) * limit, take: limit });
export async function listPage(query, list) {
    const { page, limit } = query;
    const rows = await list({ ...pageArgs(query), take: limit + 1 });
    return { data: rows.slice(0, limit), pagination: { page, limit, hasNext: page < 10000 && rows.length > limit } };
}
export const byId = z.object({ id: uuid });
export const money = z.union([z.string().min(1).max(20), z.number().finite()]);
export const mediaUrl = z.string().max(500).refine((value) => { if (/^\/uploads\/[a-f0-9-]+\.webp$/.test(value)) return true; try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; } });
export const urls = z.array(mediaUrl).max(20);
