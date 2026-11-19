# Frontend vCraft

Bản demo lấy bối cảnh làng lụa Nha Xá, phường Duy Tân, tỉnh Ninh Bình. Giao diện dùng HTML, CSS và JavaScript module. Danh mục, hồ sơ xưởng, nhật ký, tài khoản, giỏ hàng và đặt sỉ dùng API và PostgreSQL.

## Chạy cục bộ

Khởi tạo PostgreSQL theo [README gốc](../README.md), rồi chạy từ thư mục gốc `vCraft`:

```powershell
npm start
```

Mở [localhost:5000](http://localhost:5000/) hoặc cổng `PORT` đã cấu hình. Express phục vụ cả frontend và API trên cùng địa chỉ. Sau khi seed, dùng các tài khoản mẫu `buyer@nhaxa.example`, `nep-van@nhaxa.example`, `admin@nhaxa.example` và mật khẩu `SEED_DEMO_PASSWORD` để thử từng vai trò.

## Dữ liệu và ảnh minh họa

- [Dữ liệu mẫu](src/data/demo-data.js) gồm 24 sản phẩm, 5 xưởng giả lập và 4 lô dệt mã NX-001 đến NX-004. Mở mục Nhật ký lô hoặc chọn lô từ chi tiết sản phẩm để lấy QR của lô. Lô NX-004 minh họa một mẻ nhuộm củ nâu.
- [Hướng dẫn theo sản phẩm](src/data/product-production.js) dùng chung trong chi tiết sản phẩm, trang quy trình mở từ QR và trang truy xuất lô. Ảnh minh họa thao tác được tạo bằng ImageGen và có chú thích. Các mẫu của Nhaxasilk và Vũ Việt Silk dùng ảnh thành phẩm do cơ sở công bố. Phần hướng dẫn tham khảo [quy trình dệt lụa Nha Xá](https://nhaxa.vn/blog/quy-trinh-san-xuat-lua-to-tam-truyen-thong) và [thông tin mẫu lụa của Nhaxasilk](https://nhaxasilk.com/lua-hoa-tiet-tho-roi-tr38).
- QR dùng đường dẫn từ `QR_BASE_URL`. Khi demo bằng điện thoại, đặt URL này về máy chủ mà điện thoại có thể truy cập, giữ phần đường dẫn `/trace`.
- [Ảnh WebP](public/images/) được tạo bằng ImageGen tích hợp. Ảnh đầu trang minh họa xưởng nhuộm lụa Nha Xá. Ảnh con thoi, sản phẩm và chân dung giả lập minh họa nghề dệt.
- Địa danh và thông tin về nghề nhuộm tham khảo từ [Sở Du lịch Ninh Bình](https://sodulich.ninhbinh.gov.vn/vi/du-lich-lang-nghe/nghe-det-lua-nha-xa-hon-lua-gan-nghin-nam-ben-bo-song-hong-2408.html).
- Bản đồ tải đường, địa danh và công trình ở khu vực đang xem từ [OpenFreeMap](https://openfreemap.org/quick_start/) qua MapLibre trên Leaflet. Mức chi tiết phụ thuộc độ phủ OpenStreetMap và mức thu phóng. Khi nền vector không tải được, bản đồ chuyển sang nền ảnh.
- [Lớp công trình quanh Nha Xá](public/maps/nha-xa-buildings.geojson) trích từ Overture Maps Buildings bản `2026-11-18.0` theo hộp tọa độ `106.014,20.6575,106.0288,20.6708` (kinh độ, vĩ độ). GeoJSON chứa đường bao đã cắt và giản lược để hiển thị trên Leaflet. [Nguồn và ghi công](https://docs.overturemaps.org/attribution/#buildings) · [Giấy phép ODbL](https://opendatacommons.org/licenses/odbl/1-0/)
- Mốc làng dùng [điểm Nha Xá trên OpenStreetMap](https://www.openstreetmap.org/node/9959123317). Vị trí đền dùng [tọa độ Đền Lảnh Giang](https://thayungkhiem.vn/van-dao/dia-diem/den-lanh-giang) và đối chiếu địa danh tại [UBND phường Duy Tân](https://duytan.ninhbinh.gov.vn/khai-mac-le-hoi-den-lanh-giang-nam-2026).
- [Giấy phép Lora](public/fonts/Lora-OFL.txt) đi kèm các font được lưu cục bộ.

<details>
<summary>Prompt tạo ảnh xưởng nhuộm Nha Xá</summary>

```text
Use case: photorealistic-natural. Asset type: 4:3 landscape hero for a fictional digital exhibit inspired by the real Nha Xá silk village in Ninh Bình, Vietnam. An independent editorial photograph of a Vietnamese woman silk craftsperson, early 50s, in a muted olive work shirt, gently spreading a long copper-brown hand-dyed silk length across a low wooden drying rail in a traditional airy brick-and-timber dye workshop. Rich ribbons of earthy copper, olive and ivory silk drying softly in the far background, warm sun filtered through a timber window with greenery visible, a weathered dye vat partially visible, natural authentic everyday gesture. Close waist-up candid framing with hands and fabric clearly in the middle of the composition for responsive crops; enough tangible shimmering silk folds in the foreground. Quiet late afternoon, sophisticated earth palette, detailed real materials, documentary travel magazine aesthetic, faithful believable anatomy. Fictional illustration, no specific real person, no captions, no text, no logo, no border.
```

</details>

<details>
<summary>Prompt tạo ảnh cho bản demo ban đầu</summary>

**Ảnh đầu trang**

```text
Use case: photorealistic-natural. Asset type: wide main hero photograph for an independent Vietnamese silk craft digital exhibition, no text. In a small Vạn Phúc traditional wooden silk workshop, a Vietnamese woman silk artisan in an earth-brown long-sleeve áo bà ba is seen in three-quarter profile working at the wooden loom. Her hands guide a wooden shuttle in the foreground over wide, luminous cinnamon and muted gold silk warp threads. Framing around waist-up with a close foreground of abundant finely textured threads crossing at a diagonal and the artisan in upper right, clean strong composition with the important objects near center, landscape about 4:3 for responsive cropping. Soft late-afternoon golden window light, weathered wood, soft warm deep shadows, warm tobacco and red earth accents, documentary photography from an independent travel magazine, believable materials and anatomy, tactility and beautiful craft detail. No text, no graphic overlay, no logos, no border. Entire frame is an editorial photograph.
```

**Ảnh sản phẩm và xưởng**

```text
Use case: product-mockup. Asset type: exact 3 columns x 3 rows contact sheet of NINE separate edge-to-edge square photographic frames, to cut into nine illustrative assets for Vietnamese Vạn Phúc silk website demo. Full image perfectly square, each tile fills exactly one third of the width and height, razor-straight tile boundaries, NO gaps, gutters, borders, overlaps, text, labels or watermarks. Consistent warm premium editorial natural lighting, soft matte ivory background for products, rich detailed genuine-looking silk threads. Top row left to right: (1) rose pink silk scarf painted with dark red lotus flowers casually folded on pale pink travertine, (2) rich dark moss-green woven silk yardage in elegant large folds on olive gray backdrop, (3) off-white pearl ivory silk scarf with fine subtly woven tone-on-tone pattern and curled edges. Middle row left to right: (4) deep indigo and dusty blue dyed silk scarf folded into wave folds on pale stone, (5) muted rust red fine silk tie with woven gold flecks laid diagonally on a cream tray, (6) gift box with neatly folded gold ochre silk and small beige ribbons on warm sandstone. Bottom row left to right: (7) up-close documentary detail photo of wooden weaving shuttle among cinnamon silk threads and historic wooden loom, no hands required, (8) Vietnamese older woman artisan in brown work clothes smiling softly in a small wood and silk workshop, natural portrait centered, (9) documentary photograph of Vietnamese male artisan in his fifties working with olive and cream silk rolls in a small traditional silk studio. Grid must stay mathematically even and images independent. No typography anywhere.
```

</details>

<details>
<summary>Prompt tạo ảnh cho bộ dữ liệu mở rộng</summary>

```text
Use case: product-mockup. Asset type: exact FOUR columns and THREE rows, twelve independent square photographs on a landscape 4:3 canvas for a Vietnamese Vạn Phúc silk storefront demo. Precisely equal tile sizes, edge-to-edge tiles with no gutters, no lines, no borders, no overlaps. Warm independent editorial catalog, directional diffused sunlight, realistic fine silk texture. Row 1 left to right: folded dusty peach silk scarf with softly shaded apricot blossoms on ivory; pale sage silk scarf with sparse painted bamboo leaves; silver-blue silk scarf with soft watercolor ripple motif; muted lavender silk scarf with subtle plain weave. Row 2 left to right: loose translucent cream silk gauze draped on a light ceramic plinth; ornate amber-gold silk brocade folded so the woven pattern is visible; deep navy silk yardage folded in broad folds on muted blue-gray; soft terracotta-pink satin silk flowing on a pinkish stone table. Row 3 left to right: natural undyed oatmeal silk yardage resting on warm cream fabric; dark navy silk tie with tiny cream dots laid diagonally on ivory paper; group of three pale yellow silk scrunchies in a simple circular tray; small pearl ivory silk drawstring pouch with cord on warm light gray stone. No people, no text, no writing, no logos, no watermark.
```

```text
Use case: product-mockup and documentary portraits. Asset type: mathematically even 3 columns by 3 rows contact sheet, nine separate square edge-to-edge photographs, designed to be sliced at exact thirds. Exact square canvas; no gaps, borders, overlap, montage decoration or text. Warm cinematic Vietnamese silk craft editorial, genuine-looking materials, muted natural sunlight. Top row left to right: an olive-green padded silk headband on warm gray stone; open narrow moss-green gift box with silk scarf in muted sage and bamboo motif with paper wrap; open textured ivory presentation box containing a softly folded white silk scarf and pale ribbon. Middle row left to right: understated indigo gift box containing navy and cream silk pieces; rust brown gift box with rust silk and gold tie on cream backdrop; two understated olive and amber fabric accessories in one elegant small cardboard gift box. Bottom row left to right: centered portrait of a Vietnamese woman artisan in her late thirties in a cream work blouse, holding a muted pink silk scarf in a traditional wood workshop; centered portrait of a Vietnamese man artisan in his early sixties wearing a charcoal work shirt, in a textile studio with folded navy silk; centered portrait of a Vietnamese woman artisan in her early fifties wearing an olive cotton work shirt, among amber and sage rolls of silk. The three portrait subjects are fictional, friendly and candid. No text or watermarks.
```

</details>
