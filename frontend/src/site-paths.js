export const sitePaths = Object.freeze({
  home: "/",
  journal: "/nhat-ky-lo",
  artisans: "/ho-so-xuong",
  catalog: "/danh-muc",
  wholesale: "/dat-si",
  bidding: "/dau-thau",
  workshop: "/xuong-cua-toi",
  retailOrders: "/don-ban-le",
  map: "/ban-do",
  news: "/tin-tuc",
  notifications: "/thong-bao",
  administration: "/quan-ly-xuong",
});

export const signInPath = "/dang-nhap";
export const homeMapId = "ban-do-lang-nghe";
export const productPageRoots = Object.freeze({ retail: "/san-pham", reference: "/mau-lua" });
export const quotePageRoot = sitePaths.wholesale + "/yeu-cau";
export const quoteJournalRoot = sitePaths.journal + "/don-si";
export const privateBatchTraceRoot = "/trace/private";
export const referenceWorkshopRoot = sitePaths.artisans + "/co-so";

export function referenceWorkshopPath(slug) {
  return referenceWorkshopRoot + "/" + encodeURIComponent(slug);
}

export function quotePagePath(id) {
  return quotePageRoot + "/" + encodeURIComponent(id);
}

export function quoteJournalPath(id) {
  return quoteJournalRoot + "/" + encodeURIComponent(id);
}

export function privateBatchTracePath(code) {
  return privateBatchTraceRoot + "/" + encodeURIComponent(code);
}

export function biddingPagePath(id) {
  return sitePaths.bidding + "/" + encodeURIComponent(id);
}

export function quoteDraftPath(slug, reference) {
  return sitePaths.wholesale + "?" + new URLSearchParams({ [reference ? "mau" : "san-pham"]: slug });
}

export function newsArticlePath(slug) {
  return sitePaths.news + "/" + encodeURIComponent(slug);
}

export function pageSegment(path, root) {
  if (!path.startsWith(root + "/")) return null;
  const segment = path.slice(root.length + 1);
  if (!segment || segment.includes("/")) return null;
  try { return decodeURIComponent(segment); } catch { return null; }
}

export function productPagePath(slug, reference = false) {
  return (reference ? productPageRoots.reference : productPageRoots.retail) + "/" + encodeURIComponent(slug);
}

export function matchProductPage(path) {
  const [root, segment, ...rest] = path.slice(1).split("/");
  let slug;
  try { slug = segment && decodeURIComponent(segment); } catch { return null; }
  if (rest.length || !slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null;
  if ("/" + root === productPageRoots.retail) return { slug, reference: false };
  if ("/" + root === productPageRoots.reference) return { slug, reference: true };
  return null;
}

export function productTraceSegment(slug, reference = false) {
  return `${reference ? "reference/" : ""}${encodeURIComponent(slug)}`;
}
