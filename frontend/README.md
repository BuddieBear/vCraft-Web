# Frontend vCraft

Bản demo gồm trang chủ, danh mục, chi tiết sản phẩm, giỏ hàng mẫu, nhật ký dệt lụa và hồ sơ xưởng. Giao diện dùng HTML, CSS và JavaScript module. Giỏ hàng lưu trong trình duyệt.

## Chạy cục bộ

Từ thư mục gốc `vCraft`, chạy lệnh sau rồi mở [localhost:5189](http://127.0.0.1:5189/).

```powershell
python -m http.server 5189 --bind 127.0.0.1 --directory frontend
```

## Dữ liệu và ảnh minh họa

- [Dữ liệu mẫu](src/data/demo-data.js) gồm sáu sản phẩm, hai xưởng giả lập và lô dệt `VP-001`.
- [Ảnh WebP](public/images/) được tạo bằng ImageGen tích hợp. Hai prompt mô tả cảnh nghệ nhân Việt Nam dệt tơ màu đất nung và vàng trong xưởng gỗ Vạn Phúc, cùng một lưới ảnh gồm sáu mẫu lụa, một cận cảnh con thoi và hai chân dung nghệ nhân.
- [Giấy phép Lora](public/fonts/Lora-OFL.txt) đi kèm các font được lưu cục bộ.

<details>
<summary>Prompt tạo ảnh</summary>

**Ảnh đầu trang**

```text
Use case: photorealistic-natural. Asset type: wide main hero photograph for an independent Vietnamese silk craft digital exhibition, no text. In a small Vạn Phúc traditional wooden silk workshop, a Vietnamese woman silk artisan in an earth-brown long-sleeve áo bà ba is seen in three-quarter profile working at the wooden loom. Her hands guide a wooden shuttle in the foreground over wide, luminous cinnamon and muted gold silk warp threads. Framing around waist-up with a close foreground of abundant finely textured threads crossing at a diagonal and the artisan in upper right, clean strong composition with the important objects near center, landscape about 4:3 for responsive cropping. Soft late-afternoon golden window light, weathered wood, soft warm deep shadows, warm tobacco and red earth accents, documentary photography from an independent travel magazine, believable materials and anatomy, tactility and beautiful craft detail. No text, no graphic overlay, no logos, no border. Entire frame is an editorial photograph.
```

**Ảnh sản phẩm và xưởng**

```text
Use case: product-mockup. Asset type: exact 3 columns x 3 rows contact sheet of NINE separate edge-to-edge square photographic frames, to cut into nine illustrative assets for Vietnamese Vạn Phúc silk website demo. Full image perfectly square, each tile fills exactly one third of the width and height, razor-straight tile boundaries, NO gaps, gutters, borders, overlaps, text, labels or watermarks. Consistent warm premium editorial natural lighting, soft matte ivory background for products, rich detailed genuine-looking silk threads. Top row left to right: (1) rose pink silk scarf painted with dark red lotus flowers casually folded on pale pink travertine, (2) rich dark moss-green woven silk yardage in elegant large folds on olive gray backdrop, (3) off-white pearl ivory silk scarf with fine subtly woven tone-on-tone pattern and curled edges. Middle row left to right: (4) deep indigo and dusty blue dyed silk scarf folded into wave folds on pale stone, (5) muted rust red fine silk tie with woven gold flecks laid diagonally on a cream tray, (6) gift box with neatly folded gold ochre silk and small beige ribbons on warm sandstone. Bottom row left to right: (7) up-close documentary detail photo of wooden weaving shuttle among cinnamon silk threads and historic wooden loom, no hands required, (8) Vietnamese older woman artisan in brown work clothes smiling softly in a small wood and silk workshop, natural portrait centered, (9) documentary photograph of Vietnamese male artisan in his fifties working with olive and cream silk rolls in a small traditional silk studio. Grid must stay mathematically even and images independent. No typography anywhere.
```

</details>
