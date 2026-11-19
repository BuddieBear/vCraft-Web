import { request } from "../api/http.js";
import { icon } from "../components/ui.js";
import { sitePaths } from "../site-paths.js";

const village = [20.66024, 106.02325]; // OpenStreetMap node 9959123317.
const pageSize = 100;
const osmAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

export function workshopPoint({ latitude, longitude }) {
  const coordinates = [latitude, longitude];
  if (!coordinates.every(value => typeof value === "number" || (typeof value === "string" && value.trim()))) return null;
  const lat = Number(latitude);
  const lng = Number(longitude);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
}

function loadAsset(element) {
  return new Promise((resolve, reject) => {
    element.addEventListener("load", resolve, { once: true });
    element.addEventListener("error", () => {
      element.remove();
      reject(new Error("Chưa tải được thư viện bản đồ."));
    }, { once: true });
    document.head.append(element);
  });
}

async function loadLeaflet() {
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "/vendor/leaflet/leaflet.css";
  await loadAsset(css);
  try {
    if (!window.L) {
      const script = document.createElement("script");
      script.src = "/vendor/leaflet/leaflet.js";
      await loadAsset(script);
      if (!window.L) {
        script.remove();
        throw new Error("Chưa tải được thư viện bản đồ.");
      }
    }
    return window.L;
  } catch (error) {
    css.remove();
    throw error;
  }
}

async function loadRegisteredWorkshops() {
  const workshops = [];
  for (let page = 1; ; page++) {
    const { data } = await request(`/artisans?storefront=true&limit=${pageSize}&page=${page}`);
    workshops.push(...data);
    if (data.length < pageSize) return workshops;
  }
}

function workshopInfo(workshop, tag, headingTag = "h3") {
  const card = document.createElement(tag);
  card.className = "map-workshop";
  const heading = document.createElement(headingTag);
  heading.textContent = workshop.workshopName;
  card.append(heading);
  for (const text of [workshop.address, workshop.hours]) {
    if (!text) continue;
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    card.append(paragraph);
  }
  const link = document.createElement("a");
  link.className = "text-link";
  link.href = workshop.href;
  link.textContent = workshop.action;
  card.append(link);
  return card;
}

function addBasemap(L, map, feedback) {
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  const url = local
    ? "https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}.png"
    : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution = local
    ? '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> ' + osmAttribution
    : osmAttribution;
  const layer = L.tileLayer(url, { maxZoom: 19, attribution });
  let failed = false;
  let loaded = false;
  layer.on("loading", () => { failed = false; loaded = false; });
  layer.on("tileerror", () => { failed = true; });
  layer.on("tileload", () => { loaded = true; });
  layer.on("load", () => {
    feedback.hidden = !failed;
    feedback.querySelector("span").textContent = loaded
      ? "Một phần nền bản đồ chưa tải được."
      : "Chưa tải được nền bản đồ. Ghim và danh sách xưởng vẫn có thể sử dụng.";
  });
  feedback.querySelector("button").addEventListener("click", () => layer.redraw());
  layer.addTo(map);
}

export function mountArtisanMap(section, { embedded = false } = {}) {
  const headingTag = embedded ? "h2" : "h1";
  const titleId = embedded ? "home-map-title" : "map-title";
  const directoryTag = embedded ? "h3" : "h2";
  const directoryId = embedded ? "home-map-directory-title" : "map-directory-title";
  section.innerHTML = `
    <div class="section-heading map-heading">
      <div><${headingTag} id="${titleId}" class="page-title">Bản đồ làng nghề</${headingTag}>
        <p>Chọn ghim để xem địa chỉ, thông tin tham quan và mẫu lụa của từng cơ sở.</p></div>
    </div>
    <div class="artisan-map-layout">
      <div>
        <p class="map-feedback" role="status" data-map-state>Đang tải bản đồ…</p>
        <button class="text-button" type="button" data-map-retry hidden>Tải lại bản đồ</button>
        <div class="artisan-map" role="region" aria-label="Bản đồ làng lụa Nha Xá"></div>
        <div class="map-feedback" data-tile-feedback hidden>
          <span role="status"></span> <button class="text-button" type="button">Tải lại nền bản đồ</button>
        </div>
      </div>
      <aside class="map-directory" aria-labelledby="${directoryId}">
        <${directoryTag} id="${directoryId}">Cơ sở dệt lụa</${directoryTag}>
        <p class="map-feedback" role="status" data-workshop-state>Đang tải danh sách cơ sở…</p>
        <button class="text-button" type="button" data-workshop-retry hidden>Tải lại danh sách</button>
        <div class="map-workshops"></div>
      </aside>
    </div>`;
  const mapNode = section.querySelector(".artisan-map");
  const mapStatus = section.querySelector("[data-map-state]");
  const mapRetry = section.querySelector("[data-map-retry]");
  const workshopStatus = section.querySelector("[data-workshop-state]");
  const workshopRetry = section.querySelector("[data-workshop-retry]");
  const list = section.querySelector(".map-workshops");
  let L, map, markers;
  let registered = [];
  let references = [];

  function renderWorkshops() {
    const directory = new Intl.Collator("vi");
    const knownNames = new Set(registered.map(workshop => workshop.workshopName.toLocaleLowerCase("vi")));
    const workshops = [...registered, ...references.filter(workshop => !knownNames.has(workshop.workshopName.toLocaleLowerCase("vi")))]
      .sort((a, b) => directory.compare(a.workshopName, b.workshopName));
    const points = new Map();
    list.replaceChildren();
    markers?.clearLayers();
    for (const workshop of workshops) {
      const card = workshopInfo(workshop, "article", embedded ? "h4" : "h3");
      const point = workshopPoint(workshop);
      if (!point) {
        const unavailable = document.createElement("p");
        unavailable.className = "map-feedback";
        unavailable.textContent = "Chưa có tọa độ công khai.";
        card.append(unavailable);
      } else {
        const key = point.join(",");
        if (!points.has(key)) points.set(key, { point, entries: [] });
        points.get(key).entries.push({ workshop, card });
      }
      list.append(card);
    }
    if (map) {
      const bounds = [village];
      for (const { point, entries } of points.values()) {
        const popup = document.createElement("div");
        popup.className = "map-popup";
        const label = entries.map(({ workshop }) => workshop.workshopName).join(", ");
        const markerIcon = L.divIcon({
          className: "workshop-pin",
          html: icon("pin") + (entries.length > 1 ? `<span>${entries.length}</span>` : ""),
          iconSize: [36, 36],
          iconAnchor: [18, 34],
          popupAnchor: [0, -30],
        });
        const marker = L.marker(point, { icon: markerIcon, title: label })
          .bindPopup(popup, { maxHeight: 250 }).addTo(markers);
        marker.getElement().setAttribute("aria-label", label);
        for (const { workshop, card } of entries) {
          popup.append(workshopInfo(workshop, "div"));
          const show = document.createElement("button");
          show.type = "button";
          show.className = "text-button map-show-pin";
          show.textContent = "Xem ghim";
          show.setAttribute("aria-label", "Xem ghim " + workshop.workshopName);
          show.addEventListener("click", () => {
            map.setView(point, Math.max(map.getZoom(), 17), { animate: false });
            mapNode.scrollIntoView({ block: "nearest" });
            marker.getElement().focus({ preventScroll: true });
            marker.openPopup();
          });
          card.append(show);
        }
        bounds.push(point);
      }
      if (bounds.length > 1) map.fitBounds(bounds, { padding: [34, 34], maxZoom: 16, animate: false });
    }
    return { count: workshops.length, pinned: [...points.values()].reduce((sum, group) => sum + group.entries.length, 0) };
  }

  async function loadMap() {
    mapRetry.hidden = true;
    mapStatus.textContent = "Đang tải bản đồ…";
    try {
      L = await loadLeaflet();
      mapNode.hidden = false;
      map = L.map(mapNode, { scrollWheelZoom: false, maxZoom: 19 }).setView(village, 15);
      for (const [selector, label] of [[".leaflet-control-zoom-in", "Phóng to"], [".leaflet-control-zoom-out", "Thu nhỏ"]]) {
        const control = mapNode.querySelector(selector);
        control.setAttribute("aria-label", label);
        control.title = label;
      }
      markers = L.layerGroup().addTo(map);
      renderWorkshops();
      addBasemap(L, map, section.querySelector("[data-tile-feedback]"));
      mapStatus.textContent = "";
    } catch {
      map?.remove();
      map = markers = undefined;
      renderWorkshops();
      mapNode.hidden = true;
      mapStatus.textContent = "Chưa tải được bản đồ. Bạn vẫn có thể xem địa chỉ trong danh sách.";
      mapRetry.hidden = false;
    }
  }

  async function loadWorkshops() {
    workshopRetry.hidden = true;
    workshopStatus.textContent = "Đang tải danh sách cơ sở…";
    const [accounts, catalog] = await Promise.allSettled([
      loadRegisteredWorkshops(),
      request("/artisans/reference"),
    ]);
    if (accounts.status === "fulfilled") registered = accounts.value.map(workshop => ({
      ...workshop,
      hours: workshop.isOpenForVisitors
        ? workshop.openingHours || "Giờ tham quan chưa công bố"
        : "Chưa mở cửa tham quan",
      action: "Xem hồ sơ xưởng",
      href: sitePaths.artisans + "?" + new URLSearchParams({ xuong: workshop.id }),
    }));
    if (catalog.status === "fulfilled") references = catalog.value.data.map(workshop => ({
      ...workshop.location,
      workshopName: workshop.name,
      hours: workshop.location?.workingHours ? "Giờ làm việc · " + workshop.location.workingHours : "Giờ tham quan chưa công bố",
      action: "Xem mẫu của cơ sở",
      href: sitePaths.catalog + "?" + new URLSearchParams({ "co-so": workshop.slug }),
    }));
    const { count, pinned } = renderWorkshops();
    const incomplete = accounts.status === "rejected" || catalog.status === "rejected";
    workshopStatus.textContent = count ? `${pinned}/${count} cơ sở có tọa độ công khai` : "Chưa có cơ sở công khai.";
    if (incomplete) {
      workshopStatus.textContent = count
        ? `${workshopStatus.textContent}. Chưa tải được một phần danh sách.`
        : "Chưa tải được danh sách cơ sở.";
      workshopRetry.hidden = false;
    }
  }

  mapRetry.addEventListener("click", loadMap);
  workshopRetry.addEventListener("click", loadWorkshops);
  function start() {
    loadMap();
    loadWorkshops();
  }

  if (embedded && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      start();
    }, { rootMargin: "240px 0px" });
    observer.observe(section);
  } else {
    start();
  }
}
