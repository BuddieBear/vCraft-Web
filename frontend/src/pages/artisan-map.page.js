import { request } from "../api/http.js";
import { icon } from "../components/ui.js";
import { sitePaths } from "../site-paths.js";

const village = [20.66024, 106.02325]; // OpenStreetMap node 9959123317.
const villageBounds = [[20.6594, 106.0145], [20.6694, 106.030]];
const landmarks = [
  { name: "Làng lụa Nha Xá", point: village, description: "Làng dệt lụa truyền thống ở phường Duy Tân, Ninh Bình." },
  { name: "Đền Lảnh Giang", point: [20.6689599, 106.0253848], description: "Di tích ở tổ dân phố Yên Lạc, bên sông Hồng." },
];
const pageSize = 100;
const detailedStyleUrl = "https://tiles.openfreemap.org/styles/liberty";
const osmAttribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const detailedAttribution = '<a href="https://openfreemap.org/">OpenFreeMap</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> ' + osmAttribution;
const buildingAttribution = '<a href="https://docs.overturemaps.org/attribution/#buildings">Overture Maps Foundation</a>';

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

async function loadDetailedStyle() {
  const [response, maplibre] = await Promise.all([
    fetch(detailedStyleUrl, { signal: AbortSignal.timeout(10000) }),
    import("/vendor/maplibre/maplibre-gl.mjs"),
  ]);
  if (!response.ok) throw new Error("Không tải được cấu hình bản đồ.");
  if (!document.createElement("canvas").getContext("webgl2")) {
    throw new Error("Thiết bị chưa hỗ trợ đồ họa bản đồ vector.");
  }
  window.maplibregl = maplibre;
  if (!window.L.maplibreGL) {
    const script = document.createElement("script");
    script.src = "/vendor/maplibre-leaflet.js";
    await loadAsset(script);
  }
  const style = await response.json();
  style.layers = style.layers.filter(layer => layer.id !== "building-3d");
  const buildings = style.layers.find(layer => layer.id === "building");
  if (buildings) {
    delete buildings.maxzoom;
    buildings.paint = { "fill-color": "#c9b9a9", "fill-outline-color": "#a89787" };
  }
  return style;
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

function rasterBasemap(L, feedback) {
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname);
  const url = local
    ? "https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png"
    : "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
  const attribution = local
    ? '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> ' + osmAttribution
    : osmAttribution;
  const layer = L.tileLayer(url, { maxZoom: 20, maxNativeZoom: local ? 20 : 19, attribution });
  let failed = false;
  let loaded = false;
  layer.on("loading", () => { failed = false; loaded = false; });
  layer.on("tileerror", () => { failed = true; });
  layer.on("tileload", () => { loaded = true; });
  layer.on("load", () => {
    feedback.querySelector("span").textContent = !failed
      ? "Đang dùng bản đồ tiêu chuẩn."
      : loaded
      ? "Một phần nền bản đồ chưa tải được."
      : "Chưa tải được nền bản đồ. Ghim và danh sách xưởng vẫn có thể sử dụng.";
  });
  return layer;
}

async function addBasemap(L, map, feedback) {
  const retry = feedback.querySelector("button");
  const message = feedback.querySelector("span");
  const raster = rasterBasemap(L, feedback);
  let pending = false;

  async function tryDetailed() {
    if (pending) return;
    pending = true;
    retry.disabled = true;
    let vector;
    try {
      const style = await loadDetailedStyle();
      if (!map.hasLayer(raster)) feedback.hidden = true;
      vector = L.maplibreGL({ style, interactive: false, attributionControl: { customAttribution: detailedAttribution } });
      vector.addTo(map);
      const gl = vector.getMaplibreMap();
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Bản đồ vector tải quá lâu.")), 14000);
        gl.once("load", () => {
          clearTimeout(timeout);
          resolve();
        });
      });
      raster.removeFrom(map);
      feedback.hidden = true;
    } catch {
      if (vector?.getMaplibreMap()) vector.removeFrom(map);
      else vector?.getContainer()?.remove();
      if (map.hasLayer(raster)) raster.redraw();
      else raster.addTo(map);
      message.textContent = "Đang dùng bản đồ tiêu chuẩn.";
      feedback.hidden = false;
    } finally {
      pending = false;
      retry.disabled = false;
    }
  }

  retry.addEventListener("click", tryDetailed);
  await tryDetailed();
}

function addLandmarks(L, map) {
  const landmarkIcon = L.divIcon({
    className: "map-landmark-pin",
    html: icon("pin"),
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
  for (const { name, point, description } of landmarks) {
    const popup = document.createElement("div");
    popup.className = "map-workshop";
    const heading = document.createElement("h3");
    heading.textContent = name;
    const detail = document.createElement("p");
    detail.textContent = description;
    popup.append(heading, detail);
    const marker = L.marker(point, { icon: landmarkIcon, title: name, zIndexOffset: -500 })
      .bindTooltip(name, { className: "map-landmark-label", direction: "top", offset: [0, -11], permanent: map.getSize().x >= 650 })
      .bindPopup(popup).addTo(map);
    marker.getElement().setAttribute("aria-label", name);
  }
}

async function addBuildingOutlines(L, map) {
  const response = await fetch("/public/maps/nha-xa-buildings.geojson");
  if (!response.ok) throw new Error("Không tải được dữ liệu công trình.");
  const layer = L.geoJSON(await response.json(), {
    attribution: buildingAttribution,
    interactive: false,
    renderer: L.canvas(),
    style: { color: "#8b7764", weight: 0.55, opacity: 0.65, fillColor: "#a8937e", fillOpacity: 0.56 },
  });
  function updateVisibility() {
    if (map.getZoom() >= 15 && map.getBounds().intersects(layer.getBounds())) layer.addTo(map);
    else layer.removeFrom(map);
  }
  map.on("moveend", updateVisibility);
  updateVisibility();
}

export function mountArtisanMap(section, { embedded = false } = {}) {
  const headingTag = embedded ? "h2" : "h1";
  const titleId = embedded ? "home-map-title" : "map-title";
  const directoryTag = embedded ? "h3" : "h2";
  const directoryId = embedded ? "home-map-directory-title" : "map-directory-title";
  section.innerHTML = `
    <div class="section-heading map-heading">
      <div><${headingTag} id="${titleId}" class="page-title">Bản đồ làng nghề</${headingTag}>
        <p>Kéo bản đồ để khám phá khu vực khác, phóng to để thấy đường nhỏ và công trình. Chọn ghim để xem thông tin từng cơ sở.</p></div>
      <button class="button button-outline map-reset" type="button" data-map-reset hidden>${icon("pin")} Về Nha Xá</button>
    </div>
    <div class="artisan-map-layout">
      <div>
        <p class="map-feedback" role="status" data-map-state>Đang tải bản đồ…</p>
        <button class="text-button" type="button" data-map-retry hidden>Tải lại bản đồ</button>
        <div class="artisan-map" role="region" aria-label="Bản đồ tương tác, mở đầu tại Nha Xá"></div>
        <ul class="map-legend" aria-label="Ký hiệu bản đồ" hidden>
          <li><span class="map-legend-workshop"></span>Xưởng lụa</li>
          <li><span class="map-legend-landmark"></span>Địa danh</li>
          <li><span class="map-legend-building"></span>Công trình khi phóng to</li>
        </ul>
        <p class="map-feedback" role="status" data-building-status></p>
        <div class="map-feedback" data-tile-feedback hidden>
          <span role="status"></span> <button class="text-button" type="button">Thử tải nền chi tiết</button>
        </div>
      </div>
      <aside class="map-directory" aria-labelledby="${directoryId}">
        <${directoryTag} id="${directoryId}">Cơ sở dệt lụa</${directoryTag}>
        <label class="map-visit-filter"><input type="checkbox" data-visits-only disabled> Chỉ xưởng đón khách</label>
        <p class="map-feedback" role="status" data-workshop-state>Đang tải danh sách cơ sở…</p>
        <button class="text-button" type="button" data-workshop-retry hidden>Tải lại danh sách</button>
        <div class="map-workshops"></div>
      </aside>
    </div>`;
  const mapNode = section.querySelector(".artisan-map");
  const mapStatus = section.querySelector("[data-map-state]");
  const mapRetry = section.querySelector("[data-map-retry]");
  const mapReset = section.querySelector("[data-map-reset]");
  const legend = section.querySelector(".map-legend");
  const workshopStatus = section.querySelector("[data-workshop-state]");
  const workshopRetry = section.querySelector("[data-workshop-retry]");
  const visitsOnly = section.querySelector("[data-visits-only]");
  const list = section.querySelector(".map-workshops");
  let L, map, markers;
  let workshopPoints = [];
  let registered = [];
  let references = [];
  let viewChanged = false;
  let fittingVillage = false;
  let incomplete = false;

  function showVillage() {
    const wide = map.getSize().x >= 650;
    const bounds = L.latLngBounds([village, ...workshopPoints]);
    if (wide) bounds.extend(L.latLngBounds(villageBounds));
    map.closePopup();
    fittingVillage = true;
    if (!wide && !workshopPoints.length) map.setView(village, 16);
    else map.fitBounds(bounds, { padding: wide ? [28, 26] : [28, 34], maxZoom: 17, animate: false });
    fittingVillage = false;
  }

  function renderWorkshops() {
    const directory = new Intl.Collator("vi");
    const knownNames = new Set(registered.map(workshop => workshop.workshopName.toLocaleLowerCase("vi")));
    const workshops = [...registered, ...references.filter(workshop => !knownNames.has(workshop.workshopName.toLocaleLowerCase("vi")))]
      .filter(workshop => !visitsOnly.checked || workshop.isOpenForVisitors)
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
    workshopPoints = [...points.values()].map(({ point }) => point);
    if (map) {
      for (const { point, entries } of points.values()) {
        const popup = document.createElement("div");
        popup.className = "map-popup";
        const label = entries.map(({ workshop }) => workshop.workshopName).join(", ");
        const markerIcon = L.divIcon({
          className: "workshop-pin",
          html: entries.length > 1 ? `<span>${entries.length}</span>` : "",
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
            viewChanged = true;
            map.setView(point, Math.max(map.getZoom(), 18), { animate: false });
            mapNode.scrollIntoView({ block: "nearest" });
            marker.getElement().focus({ preventScroll: true });
            marker.openPopup();
          });
          card.append(show);
        }
      }
      if (!viewChanged) showVillage();
    }
    return { count: workshops.length, pinned: [...points.values()].reduce((sum, group) => sum + group.entries.length, 0) };
  }

  function refreshDirectory() {
    const { count, pinned } = renderWorkshops();
    workshopStatus.textContent = count ? `${pinned}/${count} cơ sở có tọa độ công khai`
      : visitsOnly.checked ? "Chưa có xưởng xác nhận đón khách." : "Chưa có cơ sở công khai.";
    if (incomplete) workshopStatus.textContent += " Chưa tải được đầy đủ danh sách.";
    workshopRetry.hidden = !incomplete;
  }

  async function loadMap() {
    mapRetry.hidden = true;
    mapStatus.textContent = "Đang tải bản đồ…";
    try {
      L = await loadLeaflet();
      mapNode.hidden = false;
      map = L.map(mapNode, { scrollWheelZoom: false, zoomSnap: 0.25, maxZoom: 20, worldCopyJump: true }).setView(village, 16);
      map.on("dragstart", () => { viewChanged = true; });
      map.on("zoomstart", () => { if (!fittingVillage) viewChanged = true; });
      for (const [selector, label] of [[".leaflet-control-zoom-in", "Phóng to"], [".leaflet-control-zoom-out", "Thu nhỏ"]]) {
        const control = mapNode.querySelector(selector);
        control.setAttribute("aria-label", label);
        control.title = label;
      }
      markers = L.layerGroup().addTo(map);
      L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
      addLandmarks(L, map);
      renderWorkshops();
      addBasemap(L, map, section.querySelector("[data-tile-feedback]"));
      mapStatus.textContent = "";
      mapReset.hidden = legend.hidden = false;
      addBuildingOutlines(L, map).catch(() => {
        section.querySelector("[data-building-status]").textContent = "Chưa tải được lớp công trình.";
      });
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
    incomplete = accounts.status === "rejected" || catalog.status === "rejected";
    visitsOnly.disabled = accounts.status !== "fulfilled";
    if (visitsOnly.disabled) visitsOnly.checked = false;
    refreshDirectory();
  }

  mapRetry.addEventListener("click", loadMap);
  mapReset.addEventListener("click", showVillage);
  workshopRetry.addEventListener("click", loadWorkshops);
  visitsOnly.addEventListener("change", refreshDirectory);
  loadMap();
  loadWorkshops();
}
