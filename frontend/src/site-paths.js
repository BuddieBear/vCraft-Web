export const sitePaths = Object.freeze({
  home: "/",
  journal: "/nhat-ky-lo",
  artisans: "/ho-so-xuong",
  catalog: "/danh-muc",
  wholesale: "/dat-si",
  retailOrders: "/don-ban-le",
  map: "/ban-do",
  news: "/tin-tuc",
  notifications: "/thong-bao",
  administration: "/quan-ly-xuong",
});

export const signInPath = "/dang-nhap";
export const productPageRoots = Object.freeze({ retail: "/san-pham", reference: "/mau-lua" });

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
