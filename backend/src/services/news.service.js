import { findNewsBySlug, listNews, listAdminNews, createNews, updateNews, deleteNews } from "../repositories/news.repository.js";
import { ApiError } from "../middlewares/api-error.js";

export function getNews(slug) { return findNewsBySlug(slug); }
export function listPublishedNews(options) { return listNews(options); }
export function getAdminNews(options) { return listAdminNews(options); }
export function publishNews(userId, data) { return createNews(userId, data); }
export async function editNews(userId, id, data) { const item = await updateNews(userId, id, data); if (!item) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy tin tức."); return item; }
export async function removeNews(userId, id) { if (!(await deleteNews(userId, id)).count) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy tin tức."); }
