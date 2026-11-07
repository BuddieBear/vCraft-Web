export const categories = ["Tất cả", "Khăn lụa", "Vải tơ tằm", "Phụ kiện", "Quà tặng"];

export const artisans = [
  {
    id: "nep-van", name: "Xưởng Nếp Vân", artisan: "Nghệ nhân Lê Thị Vân",
    specialty: "Dệt lụa vân", image: "artisan-van.webp",
    story: "Ở Nếp Vân, hoa văn được tạo ngay trong lúc dệt. Nghiêng tấm lụa dưới ánh sáng, những đường vân chìm hiện ra theo từng nếp gấp.",
  },
  {
    id: "soi-moc", name: "Xưởng Sợi Mộc", artisan: "Nghệ nhân Nguyễn Minh Tơ",
    specialty: "Nhuộm và hoàn thiện", image: "artisan-to.webp",
    story: "Sợi Mộc thử màu trên những mảnh lụa nhỏ trước khi nhuộm cả tấm. Công đoạn hoàn thiện giữ độ rủ và vẻ óng nhẹ của sợi.",
  },
];

export const products = [
  {
    id: "sen-hong", name: "Khăn lụa Sen Hồng vẽ tay", category: "Khăn lụa", artisanId: "nep-van",
    image: "scarf-lotus.webp", alt: "Khăn lụa hồng với họa tiết sen đỏ trên nền đá sáng",
    price: 890000, unit: "chiếc", size: "70 × 70 cm", material: "Lụa tơ tằm",
    description: "Những cánh sen đỏ thẫm được vẽ trên nền hồng dịu. Khăn vuông có thể quàng cổ, buộc tóc hoặc gấp thành một món quà nhỏ.",
    batch: "VP-001",
  },
  {
    id: "reu-co", name: "Vải lụa vân Rêu Cổ", category: "Vải tơ tằm", artisanId: "nep-van",
    image: "silk-moss.webp", alt: "Vải lụa xanh rêu xếp nếp mềm",
    price: 620000, unit: "mét", size: "Khổ 90 cm", material: "Lụa vân tơ tằm",
    description: "Lụa màu rêu với hoa văn dệt chìm, thay đổi sắc độ khi xoay dưới ánh sáng. Phù hợp để may áo, khăn hoặc các chi tiết trang trí.",
  },
  {
    id: "ngoc-trai", name: "Khăn vuông lụa Ngọc Trai", category: "Khăn lụa", artisanId: "nep-van",
    image: "scarf-pearl.webp", alt: "Khăn lụa trắng ngà có hoa văn dệt cùng tông",
    price: 740000, unit: "chiếc", size: "65 × 65 cm", material: "Lụa vân tơ tằm",
    description: "Sắc trắng ngà và hoa văn cùng tông tạo bề mặt dịu mắt. Chiếc khăn nhẹ, có viền cuốn mảnh.",
  },
  {
    id: "cham-song", name: "Khăn lụa nhuộm Chàm Sóng", category: "Khăn lụa", artisanId: "soi-moc",
    image: "scarf-indigo.webp", alt: "Khăn lụa chàm xếp thành các nếp sóng",
    price: 560000, unit: "chiếc", size: "45 × 160 cm", material: "Lụa tơ tằm nhuộm màu",
    description: "Màu chàm đậm nhạt trải theo chiều khăn, gợi mặt nước trong bóng râm. Dáng dài dễ quàng nhiều kiểu.",
  },
  {
    id: "ca-vat-dat-nung", name: "Cà vạt lụa Đất Nung", category: "Phụ kiện", artisanId: "soi-moc",
    image: "tie-rust.webp", alt: "Cà vạt lụa đỏ đất có họa tiết vàng nhỏ",
    price: 450000, unit: "chiếc", size: "Bản rộng 7 cm", material: "Lụa tơ tằm",
    description: "Cà vạt đỏ đất có những điểm dệt vàng nhỏ, dễ phối với sơ mi sáng và áo khoác tông trầm.",
  },
  {
    id: "hop-nang", name: "Hộp quà lụa Nếp Nắng", category: "Quà tặng", artisanId: "soi-moc",
    image: "gift-gold.webp", alt: "Hộp quà mở với lụa vàng và nơ màu be",
    price: null, unit: "hộp", size: "Tùy cách phối", material: "Lụa tơ tằm",
    description: "Bộ quà minh họa gồm khăn lụa vàng và hộp giấy. Phần phối màu và số lượng được trao đổi theo nhu cầu.",
  },
];

export const batch = {
  code: "VP-001",
  stages: [
    { name: "Ươm tơ", description: "Sợi được rút từ kén và gom thành những guồng tơ mảnh trước khi lên khung." },
    { name: "Mắc cửi", description: "Các sợi dọc được luồn và dàn đều trên khung để mặt vải lên đúng khổ." },
    { name: "Dệt lụa", description: "Con thoi đưa sợi ngang qua lớp sợi dọc, từng lượt tạo nên mặt vải." },
    { name: "Nhuộm màu", description: "Tấm lụa được nhuộm nền hồng dịu trước khi hoàn thiện họa tiết sen." },
    { name: "Cán láng", description: "Lụa được làm phẳng nhẹ để bề mặt mượt và giữ được độ rủ." },
  ],
};
