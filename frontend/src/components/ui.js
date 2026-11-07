const paths = {
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  upRight: '<path d="M7 17 17 7M7 7h10v10"/>',
  search: '<circle cx="10.5" cy="10.5" r="5.5"/><path d="m15 15 4 4"/>',
  bag: '<path d="M5 8h14l1 12H4L5 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  pin: '<path d="M19 10c0 4-7 9-7 9s-7-5-7-9a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  plus: '<path d="M6 12h12m-6-6v12"/>',
  minus: '<path d="M6 12h12"/>',
  left: '<path d="m14 6-6 6 6 6"/>',
  right: '<path d="m10 6 6 6-6 6"/>',
  thread: '<rect x="5" y="4" width="14" height="3" rx="1"/><rect x="5" y="17" width="14" height="3" rx="1"/><path d="M8 7v10m8-10v10M8 11l8-3M8 15l8-3"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
};

export function icon(name) {
  return `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
}

const currency = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });

export function formatPrice(price, unit) {
  if (price === null) return "Liên hệ";
  return unit === "mét" ? `${currency.format(price)} / mét` : currency.format(price);
}

export function asset(file) {
  return `./public/images/${file}`;
}
