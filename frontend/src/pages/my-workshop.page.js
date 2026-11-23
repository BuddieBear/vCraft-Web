import { mediaUrl, request } from "../api/http.js";
import { formatPrice, saleUnits } from "../components/ui.js";
import { weaveTypes } from "../data/weave-types.js";
import { productPagePath, sitePaths } from "../site-paths.js";
import { createBatchForm, renderBatch } from "./wholesale/artisan.js";
import { maxProductionSteps, productionStepKey, productionStepTitles } from "../data/production-steps.js";
import { card, get, listSection, paragraph, write } from "./wholesale/view.js";

const imageTypes = "image/jpeg,image/png,image/webp";
const verificationLabels = { PENDING: "Hồ sơ chờ duyệt", APPROVED: "Xưởng đã được xác minh", REJECTED: "Hồ sơ bị từ chối" };

async function upload(files) {
  const selected = files.filter(file => file?.name);
  if (!selected.length) return [];
  if (selected.length > 4) throw new Error("Chọn tối đa 4 ảnh mỗi lần.");
  if (selected.some(file => !file.size || file.size > 5 * 1024 * 1024)) throw new Error("Mỗi ảnh phải có dung lượng từ trên 0 đến 5 MB.");
  const body = new FormData();
  for (const file of selected) body.append("images", file);
  return (await write("/media/images", body)).data.urls;
}

function pictures(target, urls, label) {
  const gallery = document.createElement("div");
  gallery.className = "workshop-pictures";
  for (const [index, url] of urls.entries()) {
    const src = mediaUrl(url);
    if (!src) continue;
    const image = document.createElement("img");
    image.src = src;
    image.alt = `${label} ${index + 1}`;
    image.loading = "lazy";
    image.referrerPolicy = "no-referrer";
    gallery.append(image);
  }
  if (gallery.childElementCount) target.append(gallery);
}

export async function workshopView(root, tools) {
  const workshop = await get("/artisans/me", tools.signal);
  if (tools.signal.aborted) return;
  const profile = card(root, workshop.workshopName, workshop.isSuspended ? "Xưởng đang bị đình chỉ" : verificationLabels[workshop.verificationStatus]);
  profile.append(profileForm(tools.form, workshop));
  pictures(profile, [workshop.coverImageUrl, ...workshop.galleryImages].filter(Boolean), "Ảnh xưởng");
  const certificates = listSection(root, "Chứng nhận chất lượng");
  mountCertificates(certificates, workshop, tools);
  const products = listSection(root, "Sản phẩm và nhật ký của xưởng");
  products.classList.add("trade-list-full");
  if (workshop.verificationStatus !== "APPROVED") {
    products.append(paragraph("Sau khi hồ sơ được duyệt, bạn có thể đăng sản phẩm, tạo lô và chào giá."));
    return;
  }
  const actions = document.createElement("div");
  actions.className = "trade-toolbar";
  const bids = document.createElement("a");
  bids.href = sitePaths.bidding;
  bids.className = "text-link";
  bids.textContent = "Xem bảng đấu thầu";
  const sales = document.createElement("a");
  sales.href = sitePaths.retailOrders;
  sales.className = "text-link";
  sales.textContent = "Xem đơn bán lẻ của xưởng";
  actions.append(bids, sales);
  products.append(actions);
  if (workshop.isSuspended) products.append(paragraph("Sản phẩm đang ẩn khỏi danh mục. Bạn vẫn xem được nhật ký của các lô đã tạo."));
  try {
    const { data: categories } = await request("/categories", { signal: tools.signal });
    if (tools.signal.aborted) return;
    if (!workshop.isSuspended) tools.expand(products, {
      key: "new-product", label: "Đăng sản phẩm mới",
      mount: details => details.append(productForm(tools.form, categories)),
    });
    tools.list(products, {
      key: "my-products", path: "/products/mine", label: "sản phẩm của xưởng", empty: "Xưởng chưa đăng sản phẩm nào.",
      render(rows, target, pageSignal) {
        for (const product of rows) renderProduct(target, product, categories, tools, pageSignal, workshop.isSuspended);
      },
    });
  } catch (error) {
    if (!tools.signal.aborted) products.append(paragraph("Chưa tải được dữ liệu sản phẩm. Bấm Tải lại để thử lại. " + error.message));
  }
}

function profileForm(form, workshop) {
  const profile = form(`
    <label>Tên xưởng<input name="workshopName" maxlength="200" required></label>
    <label>Danh xưng nghệ nhân<input name="artisanTitle" maxlength="150"></label>
    <label>Số năm kinh nghiệm<input name="experienceYears" type="number" min="0" max="32767" step="1"></label>
    <label>Lịch sử gia đình và tiểu sử<textarea name="familyHistory" maxlength="20000"></textarea></label>
    <label>Địa chỉ<input name="address" maxlength="255" required></label>
    <div class="workshop-coordinates">
      <label>Vĩ độ<input name="latitude" type="number" step="any" min="-90" max="90" required></label>
      <label>Kinh độ<input name="longitude" type="number" step="any" min="-180" max="180" required></label>
    </div>
    <label>Giờ tham quan<input name="openingHours" maxlength="100" placeholder="Ví dụ 08:00–17:00"></label>
    <label class="trade-choice"><input type="checkbox" name="isOpenForVisitors"> Đón khách tham quan</label>
    <label>Ảnh bìa mới<input name="cover" type="file" accept="${imageTypes}"></label>
    <label>Thay bộ ảnh xưởng, tối đa 4 ảnh<input name="gallery" type="file" accept="${imageTypes}" multiple></label>`, "Lưu hồ sơ xưởng", async values => {
    const workshopName = values.get("workshopName").trim();
    const address = values.get("address").trim();
    if (!workshopName || !address) throw new Error("Nhập tên xưởng và địa chỉ.");
    const gallery = await upload(values.getAll("gallery"));
    const [coverImageUrl] = await upload(values.getAll("cover"));
    const years = values.get("experienceYears");
    return write("/artisans/me", {
      workshopName, address, artisanTitle: values.get("artisanTitle").trim() || null,
      experienceYears: years === "" ? null : Number(years),
      latitude: Number(values.get("latitude")), longitude: Number(values.get("longitude")),
      familyHistory: values.get("familyHistory").trim() || null, openingHours: values.get("openingHours").trim(),
      isOpenForVisitors: values.has("isOpenForVisitors"), ...(coverImageUrl && { coverImageUrl }),
      ...(gallery.length && { galleryImages: gallery }),
    }, "PATCH");
  });
  for (const name of ["workshopName", "artisanTitle", "experienceYears", "familyHistory", "address", "latitude", "longitude", "openingHours"]) {
    profile.elements.namedItem(name).value = workshop[name] ?? "";
  }
  profile.elements.namedItem("isOpenForVisitors").checked = workshop.isOpenForVisitors;
  return profile;
}

function mountCertificates(target, workshop, { form, button, expand }) {
  for (const item of workshop.certificates) {
    const entry = card(target, item.title, `${item.issuingAuthority} · ${item.issuedYear}`);
    pictures(entry, [item.certificateImageUrl], "Ảnh chứng nhận");
    entry.append(button("Gỡ chứng nhận", () => write("/artisans/me/certificates/" + encodeURIComponent(item.id), undefined, "DELETE")));
  }
  expand(target, {
    key: "new-certificate", label: "Thêm chứng nhận",
    mount: details => details.append(form(`
      <label>Tên chứng nhận<input name="title" maxlength="200" required></label>
      <label>Đơn vị cấp<input name="issuingAuthority" maxlength="200" required></label>
      <label>Năm cấp<input name="issuedYear" type="number" min="1800" max="${new Date().getFullYear()}" required></label>
      <label>Ảnh chứng nhận<input name="images" type="file" accept="${imageTypes}" required></label>`, "Lưu chứng nhận", async values => {
      const title = values.get("title").trim();
      const issuingAuthority = values.get("issuingAuthority").trim();
      if (!title || !issuingAuthority) throw new Error("Nhập tên chứng nhận và đơn vị cấp.");
      const [certificateImageUrl] = await upload(values.getAll("images"));
      return write("/artisans/me/certificates", { title, issuingAuthority, issuedYear: Number(values.get("issuedYear")), certificateImageUrl });
    })),
  });
}

function productSlug(name) {
  return name.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function productForm(form, categories, product) {
  const editor = form(`
    <label>Tên sản phẩm<input name="name" maxlength="255" required></label>
    <label>Mã đường dẫn<input name="slug" maxlength="280" pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="Tự tạo từ tên nếu để trống"></label>
    <label>Phân loại<select name="categoryId"></select></label>
    <label>Loại lụa<select name="weaveType"></select></label>
    <label>Chất liệu<input name="rawMaterial" maxlength="150" required></label>
    <label>Mô tả<textarea name="description" maxlength="20000"></textarea></label>
    <label>Câu chuyện sản phẩm<textarea name="culturalStory" maxlength="20000"></textarea></label>
    <fieldset class="production-editor">
      <legend>Quy trình cho các lô mới</legend>
      <label>Công đoạn theo thứ tự
        <textarea name="productionSteps" rows="6" maxlength="${maxProductionSteps * 151}" required></textarea>
      </label>
      <p>Mỗi dòng là một công đoạn, tối đa ${maxProductionSteps} dòng. Bạn có thể đổi thứ tự để phù hợp với mặt hàng.</p>
    </fieldset>
    <label>Cách niêm yết<select name="pricingMode"><option value="FIXED">Có giá bán</option><option value="CONTACT">Liên hệ</option></select></label>
    <label>Giá bán (đồng)<input name="price" type="number" min="0" max="9999999999.99" step="0.01"></label>
    <label>Đơn vị bán<select name="saleUnit"></select></label>
    <label>Số lượng còn hàng<input name="stockQuantity" type="number" min="0" max="2147483647" required></label>
    <label>Ảnh sản phẩm mới, tối đa 4 ảnh<input name="images" type="file" accept="${imageTypes}" multiple></label>
    <label class="trade-choice"><input name="isPublished" type="checkbox"> Hiển thị trong danh mục</label>`, product ? "Lưu sản phẩm" : "Đăng sản phẩm", async values => {
    const name = values.get("name").trim();
    const slug = values.get("slug").trim() || productSlug(name);
    const rawMaterial = values.get("rawMaterial").trim();
    if (!name || !slug || slug === "mine" || !rawMaterial) throw new Error("Nhập tên, chất liệu và mã đường dẫn sản phẩm hợp lệ.");
    const productionSteps = values.get("productionSteps").split(/\r?\n/).map(title => title.trim()).filter(Boolean);
    if (!productionSteps.length || productionSteps.length > maxProductionSteps || productionSteps.some(title => title.length > 150)) {
      throw new Error(`Nhập từ 1 đến ${maxProductionSteps} công đoạn, mỗi tên tối đa 150 ký tự.`);
    }
    if (new Set(productionSteps.map(productionStepKey)).size !== productionSteps.length) throw new Error("Tên các công đoạn phải khác nhau.");
    const newImages = await upload(values.getAll("images"));
    const mediaUrls = newImages.length ? newImages : product?.mediaUrls || [];
    const data = {
      name, slug, mediaUrls, productionSteps, categoryId: values.get("categoryId") || null, weaveType: values.get("weaveType"),
      rawMaterial, description: values.get("description").trim() || null,
      culturalStory: values.get("culturalStory").trim() || null, pricingMode: values.get("pricingMode"), price: values.get("price"),
      saleUnit: values.get("saleUnit"), stockQuantity: Number(values.get("stockQuantity")), isPublished: values.has("isPublished"),
    };
    if (!product) return write("/products", data);
    return write("/products/" + encodeURIComponent(product.id), { ...data, expectedStockQuantity: product.stockQuantity }, "PUT");
  });
  const fields = editor.elements;
  fields.namedItem("productionSteps").value = productionStepTitles(product?.productionSteps).join("\n");
  const category = fields.namedItem("categoryId");
  category.add(new Option("Chưa chọn", ""));
  for (const item of categories) category.add(new Option(item.name, item.id));
  for (const [value, label] of Object.entries(weaveTypes)) fields.namedItem("weaveType").add(new Option(label, value));
  for (const [value, label] of Object.entries(saleUnits)) fields.namedItem("saleUnit").add(new Option(label, value));
  for (const name of ["name", "slug", "categoryId", "weaveType", "rawMaterial", "description", "culturalStory", "pricingMode", "price", "saleUnit", "stockQuantity"]) {
    if (product?.[name] != null) fields.namedItem(name).value = product[name];
  }
  if (!product) {
    fields.namedItem("stockQuantity").value = "0";
    fields.namedItem("rawMaterial").value = "Tơ tằm";
  }
  fields.namedItem("isPublished").checked = product?.isPublished ?? true;
  const price = fields.namedItem("price");
  const pricing = fields.namedItem("pricingMode");
  function syncPrice() {
    price.required = pricing.value === "FIXED";
    price.disabled = !price.required;
    price.closest("label").hidden = price.disabled;
  }
  pricing.addEventListener("change", syncPrice);
  syncPrice();
  return editor;
}

function renderProduct(target, product, categories, tools, pageSignal, isSuspended) {
  const visibility = product.isPublished && !isSuspended ? "Đang công bố" : "Đang ẩn";
  const panel = card(target, product.name, `${formatPrice(product.price, saleUnits[product.saleUnit])} · Tồn ${product.stockQuantity} · ${visibility}`);
  pictures(panel, product.mediaUrls.slice(0, 4), product.name);
  if (product.isPublished && !isSuspended) {
    const link = document.createElement("a");
    link.href = productPagePath(product.slug);
    link.className = "text-link";
    link.textContent = "Xem trang sản phẩm";
    panel.append(link);
  }
  if (!isSuspended) tools.expand(panel, {
    key: "edit-product-" + product.id, label: "Sửa sản phẩm",
    mount: details => details.append(productForm(tools.form, categories, product)),
  }, pageSignal);
  const key = "product-batches-" + product.id;
  tools.expand(panel, {
    key, label: "Quản lý nhật ký lô",
    mount(details) {
      if (!isSuspended) details.append(createBatchForm(tools.form, { productId: product.id }));
      tools.list(details, {
        key, path: "/traceability/mine?" + new URLSearchParams({ productId: product.id }),
        label: "lô của " + product.name, empty: "Sản phẩm chưa có lô.",
        render(rows, batchTarget) {
          for (const batch of rows) renderBatch(batchTarget, batch, tools);
        },
      }, pageSignal);
    },
  }, pageSignal);
}
