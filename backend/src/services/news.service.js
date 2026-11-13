import { findNewsBySlug, listNews } from "../repositories/news.repository.js";

export function getNews(slug) { return findNewsBySlug(slug); }
export function listPublishedNews(options) { return listNews(options); }
