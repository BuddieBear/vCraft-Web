export const categories = ["Tất cả", "Khăn lụa", "Vải tơ tằm", "Phụ kiện", "Quà tặng"];

export const artisans = [
  {
    id: "nep-van", name: "Xưởng Nếp Vân", artisan: "Nghệ nhân Lê Thị Vân",
    specialty: "Dệt lụa vân", image: "artisan-van.webp",
    story: "Ở Nếp Vân, hoa văn được tạo ngay trong lúc dệt. Nghiêng tấm lụa dưới ánh sáng, những đường vân chìm hiện ra theo từng nếp gấp.",
  },
  {
    id: "soi-moc", name: "Xưởng Sợi Mộc", artisan: "Nghệ nhân Nguyễn Minh Tơ",
    specialty: "Nhuộm tự nhiên và hoàn thiện", image: "artisan-to.webp",
    story: "Sợi Mộc thử màu từ củ nâu trên những mảnh lụa nhỏ rồi hong để so sánh sắc độ. Sau khi nhuộm cả tấm, xưởng làm phẳng nhẹ để giữ độ rủ.",
  },
  {
    id: "luom-to", name: "Xưởng Lượm Tơ", artisan: "Nghệ nhân Phạm An Nhiên",
    specialty: "Vẽ tay trên lụa", image: "artisan-nhien.webp",
    story: "Lượm Tơ thử họa tiết trên mảnh vải cùng lô trước khi vẽ lên khăn. Nét cọ nhẹ giữ lại những khoảng trống để thấy màu nền và độ trong của lụa.",
  },
  {
    id: "thoi-nau", name: "Xưởng Thoi Nâu", artisan: "Nghệ nhân Trần Văn Thuận",
    specialty: "Dệt gấm và lụa sa", image: "artisan-thuan.webp",
    story: "Thoi Nâu chuẩn bị hai loại khung cho hai bề mặt vải. Lụa sa nhẹ, có độ trong, còn gấm dày hơn để hoa văn nổi rõ.",
  },
  {
    id: "moc-sac", name: "Xưởng Mộc Sắc", artisan: "Nghệ nhân Đỗ Thu Hà",
    specialty: "Phụ kiện và quà lụa", image: "artisan-ha.webp",
    story: "Mộc Sắc tận dụng những đoạn lụa còn lại để may túi rút, dây buộc tóc và băng đô. Xưởng phối chúng theo tông để đóng thành bộ quà nhỏ.",
  },
];

export const products = [
  {
    id: "sen-hong", name: "Khăn lụa Sen Hồng vẽ tay", category: "Khăn lụa", artisanId: "nep-van",
    image: "scarf-lotus.webp", alt: "Khăn lụa hồng với họa tiết sen đỏ trên nền đá sáng",
    price: 890000, unit: "chiếc", size: "70 × 70 cm", material: "Lụa tơ tằm",
    description: "Những cánh sen đỏ thẫm được vẽ trên nền hồng dịu. Khăn vuông có thể quàng cổ, buộc tóc hoặc gấp thành một món quà nhỏ.",
    batch: "NX-001",
  },
  {
    id: "reu-co", name: "Vải lụa vân Rêu Cổ", category: "Vải tơ tằm", artisanId: "nep-van",
    image: "silk-moss.webp", alt: "Vải lụa xanh rêu xếp nếp mềm",
    price: 620000, unit: "mét", size: "Khổ 90 cm", material: "Lụa vân tơ tằm",
    description: "Lụa màu rêu với hoa văn dệt chìm, thay đổi sắc độ khi xoay dưới ánh sáng. Phù hợp để may áo, khăn hoặc các chi tiết trang trí.",
    batch: "NX-002",
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
    batch: "NX-003",
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
  {
    id: "dao-phai", name: "Khăn lụa Đào Phai", category: "Khăn lụa", artisanId: "luom-to",
    image: "scarf-peach.webp", alt: "Khăn lụa màu đào nhạt điểm hoa trên nền ngà",
    price: 790000, unit: "chiếc", size: "60 × 60 cm", material: "Lụa tơ tằm vẽ tay",
    description: "Hoa đào được vẽ rải từ góc khăn vào giữa, để khi gấp vẫn thấy vài cánh hoa. Tông màu nhẹ hợp với áo trắng hoặc be.",
  },
  {
    id: "truc-suong", name: "Khăn lụa Trúc Sương vẽ tay", category: "Khăn lụa", artisanId: "luom-to",
    image: "scarf-bamboo.webp", alt: "Khăn lụa xanh nhạt có nét vẽ lá trúc",
    price: 860000, unit: "chiếc", size: "72 × 72 cm", material: "Lụa tơ tằm vẽ tay",
    description: "Các nhánh trúc thưa chạy dọc viền. Giữa khăn giữ màu xanh nhạt để có thể phối với áo nhiều họa tiết.",
  },
  {
    id: "may-lam", name: "Khăn lụa Mây Lam", category: "Khăn lụa", artisanId: "luom-to",
    image: "scarf-cloud.webp", alt: "Khăn lụa xanh bạc với những vệt màu mềm",
    price: 680000, unit: "chiếc", size: "42 × 155 cm", material: "Lụa tơ tằm nhuộm loang",
    description: "Các dải xanh bạc chạy theo chiều dài khăn. Khi quàng, phần chuyển màu nằm ở hai đầu để thấy rõ sắc độ.",
  },
  {
    id: "tim-hien", name: "Khăn lụa Tím Hiên", category: "Khăn lụa", artisanId: "soi-moc",
    image: "scarf-lavender.webp", alt: "Khăn lụa tím nhạt có nếp gấp mềm",
    price: 480000, unit: "chiếc", size: "52 × 52 cm", material: "Lụa tơ tằm",
    description: "Khăn vuông nhỏ dệt trơn, nhuộm tím xám và cuốn viền cùng màu. Có thể buộc ở cổ hoặc quai túi.",
  },
  {
    id: "bach-tra", name: "Vải lụa sa Bạch Trà", category: "Vải tơ tằm", artisanId: "thoi-nau",
    image: "silk-gauze.webp", alt: "Vải lụa sa màu kem mỏng phủ trên khối gốm",
    price: 470000, unit: "mét", size: "Khổ 105 cm", material: "Lụa sa tơ tằm",
    description: "Lụa sa màu kem có độ trong nhẹ. Dáng vải thoáng, thích hợp làm lớp phủ hoặc khăn choàng mỏng.",
  },
  {
    id: "ho-phach", name: "Vải gấm lụa Hổ Phách", category: "Vải tơ tằm", artisanId: "thoi-nau",
    image: "silk-brocade.webp", alt: "Gấm lụa vàng hổ phách có hoa văn nổi",
    price: 1250000, unit: "mét", size: "Khổ 85 cm", material: "Gấm tơ tằm",
    description: "Hoa văn cuộn quanh các bông lớn được dệt nổi trên nền vàng ấm. Vải đứng dáng, phù hợp may áo hoặc làm viền trang trí.",
  },
  {
    id: "dem-lam", name: "Vải lụa vân Đêm Lam", category: "Vải tơ tằm", artisanId: "nep-van",
    image: "silk-midnight.webp", alt: "Vải lụa xanh đêm xếp thành những nếp rộng",
    price: 720000, unit: "mét", size: "Khổ 90 cm", material: "Lụa vân tơ tằm",
    description: "Màu xanh đêm và các đường dệt chìm tạo mặt vải trầm. Vân lụa hiện rõ khi ánh sáng chiếu nghiêng.",
  },
  {
    id: "hong-dat", name: "Vải satin Nâu Đất nhuộm củ nâu", category: "Vải tơ tằm", artisanId: "soi-moc",
    image: "silk-rose.webp", alt: "Vải satin nâu ánh hồng rủ qua bề mặt đá",
    price: 690000, unit: "mét", size: "Khổ 110 cm", material: "Satin tơ tằm",
    description: "Mẫu lụa lấy cảm hứng từ mẻ nhuộm củ nâu. Mặt satin ánh nâu hồng, phù hợp làm khăn hoặc may áo dáng rủ.",
    batch: "NX-004",
  },
  {
    id: "to-moc", name: "Vải lụa Tơ Mộc không nhuộm", category: "Vải tơ tằm", artisanId: "thoi-nau",
    image: "silk-undyed.webp", alt: "Vải lụa mộc màu yến mạch có mặt dệt sần nhẹ",
    price: 530000, unit: "mét", size: "Khổ 100 cm", material: "Tơ tằm không nhuộm",
    description: "Tấm lụa giữ màu ngà tự nhiên của sợi. Mặt dệt có những đường sần nhẹ, dễ phối với chất liệu thô.",
  },
  {
    id: "lam-muc", name: "Cà vạt lụa Lam Mực", category: "Phụ kiện", artisanId: "nep-van",
    image: "tie-navy.webp", alt: "Cà vạt xanh mực với chấm sáng nhỏ",
    price: 510000, unit: "chiếc", size: "Bản rộng 7 cm", material: "Lụa tơ tằm",
    description: "Chấm kem nhỏ giúp làm rõ nền xanh mực. Bản cà vạt vừa, dễ dùng với sơ mi trơn.",
  },
  {
    id: "buoc-toc-to-nang", name: "Bộ dây buộc tóc Tơ Nắng", category: "Phụ kiện", artisanId: "moc-sac",
    image: "scrunchies-gold.webp", alt: "Ba dây buộc tóc lụa vàng nhạt trong khay",
    price: 210000, unit: "bộ", size: "3 dây / bộ", material: "Satin tơ tằm",
    description: "Ba dây buộc tóc bọc lụa vàng nhạt, may từ những đoạn vải cùng tông còn lại sau khi cắt khăn.",
  },
  {
    id: "tui-nguyet-bach", name: "Túi rút lụa Nguyệt Bạch", category: "Phụ kiện", artisanId: "moc-sac",
    image: "pouch-pearl.webp", alt: "Túi rút lụa trắng ngà có dây cùng màu",
    price: 260000, unit: "chiếc", size: "16 × 19 cm", material: "Lụa tơ tằm",
    description: "Túi lụa có dây rút hai bên, đủ chỗ đựng trang sức, một chiếc khăn nhỏ hoặc đồ dùng khi đi xa.",
  },
  {
    id: "bang-do-gio-reu", name: "Băng đô lụa Gió Rêu", category: "Phụ kiện", artisanId: "moc-sac",
    image: "headband-moss.webp", alt: "Băng đô bọc lụa xanh rêu trên đá sáng",
    price: 280000, unit: "chiếc", size: "Bản rộng 3 cm", material: "Lụa tơ tằm bọc đệm",
    description: "Băng đô có lớp đệm nhẹ, bọc lụa xanh rêu. Đường may được giấu ở mặt trong.",
  },
  {
    id: "set-sac-truc", name: "Set quà lụa Sắc Trúc", category: "Quà tặng", artisanId: "luom-to",
    image: "gift-bamboo.webp", alt: "Hộp quà xanh rêu đựng khăn lụa họa tiết lá trúc",
    price: 1050000, unit: "hộp", size: "1 khăn và 1 hộp", material: "Lụa tơ tằm vẽ tay",
    description: "Set mẫu ghép khăn Trúc Sương với hộp xanh rêu và lớp giấy gói mỏng.",
  },
  {
    id: "hop-trang-nga", name: "Hộp quà lụa Trăng Ngà", category: "Quà tặng", artisanId: "moc-sac",
    image: "gift-ivory.webp", alt: "Hộp màu ngà đựng khăn lụa trắng và ruy băng",
    price: 950000, unit: "hộp", size: "1 khăn và 1 hộp", material: "Lụa vân tơ tằm",
    description: "Khăn vuông tông ngà được gấp để lộ mặt dệt và phối với hộp giấy sáng màu.",
  },
  {
    id: "set-loi-to", name: "Set quà Lời Tơ xanh chàm", category: "Quà tặng", artisanId: "thoi-nau",
    image: "gift-indigo.webp", alt: "Hộp chàm mở với các món lụa xanh đậm và trắng ngà",
    price: null, unit: "hộp", size: "Phối theo số lượng", material: "Lụa sa và lụa vân",
    description: "Bộ quà tông chàm và kem dành cho đơn đặt theo nhóm. Cách phối và kích thước có thể chọn theo lô.",
  },
  {
    id: "hop-pho-lua", name: "Hộp quà Phố Lụa đất nung", category: "Quà tặng", artisanId: "soi-moc",
    image: "gift-terracotta.webp", alt: "Hộp quà nâu đỏ đựng lụa buộc dây màu vàng",
    price: 1380000, unit: "hộp", size: "1 khăn và 1 cà vạt", material: "Lụa tơ tằm",
    description: "Khăn và cà vạt phối hai sắc nâu đỏ và vàng ấm. Hộp đựng tông đất nung dùng làm quà dịp gặp mặt.",
  },
  {
    id: "bo-cham-van", name: "Bộ quà Chạm Vân hai sắc", category: "Quà tặng", artisanId: "moc-sac",
    image: "gift-brocade.webp", alt: "Hộp giấy đựng hai phụ kiện lụa xanh ô liu và vàng hổ phách",
    price: null, unit: "bộ", size: "2 món / bộ", material: "Gấm và lụa tơ tằm",
    description: "Bộ phụ kiện ghép một món màu ô liu và một món hổ phách. Mẫu phối tùy các lô vải sẵn tại xưởng.",
  },
];

export const productionStages = ["Ươm tơ", "Mắc cửi", "Dệt lụa", "Nhuộm màu", "Cán láng"];

export const batches = [
  {
    code: "NX-001",
    notes: [
      "Sợi được rút từ kén và gom thành những guồng tơ mảnh trước khi lên khung.",
      "Các sợi dọc được luồn và dàn đều trên khung để mặt vải lên đúng khổ.",
      "Con thoi đưa sợi ngang qua lớp sợi dọc, từng lượt tạo nên mặt vải.",
      "Tấm lụa được nhuộm nền hồng dịu trước khi hoàn thiện họa tiết sen.",
      "Lụa được làm phẳng nhẹ để bề mặt mượt và giữ được độ rủ.",
    ],
  },
  {
    code: "NX-002",
    notes: [
      "Xưởng gom sợi theo độ mảnh để phần vân chìm giữ được đường nét rõ.",
      "Sợi dọc được dàn theo khổ 90 cm. Hai biên vải được kiểm tra độ căng trước khi dệt.",
      "Các mảng vân được dệt trực tiếp trong mặt vải, tạo sự khác biệt khi ánh sáng đổi góc.",
      "Mẫu thử được phơi khô để đối chiếu màu rêu trước khi nhuộm cả tấm.",
      "Mặt vải được cán nhẹ để giữ cảm giác mềm và độ nổi của đường vân.",
    ],
  },
  {
    code: "NX-003",
    notes: [
      "Tơ được chia thành các guồng nhỏ để dễ kiểm tra và gỡ những đoạn sợi rối.",
      "Khung được chỉnh cho khổ khăn dài. Xưởng dệt thử một đoạn để kiểm tra biên.",
      "Mặt khăn dệt trơn để phần chuyển màu chàm hiện rõ sau khi nhuộm.",
      "Hai đầu khăn được nhúng với thời gian khác nhau, tạo dải màu đậm nhạt.",
      "Khăn được hong phẳng, hoàn thiện mép và gấp theo chiều chuyển màu.",
    ],
  },
  {
    code: "NX-004",
    notes: [
      "Tơ được gom theo độ mảnh để mặt satin lên đều.",
      "Sợi dọc được lên khung theo khổ 110 cm. Xưởng kiểm tra lực căng ở hai biên.",
      "Tấm satin được dệt trơn để giữ một mặt óng, sẵn sàng cho mẻ nhuộm.",
      "Xưởng thử nước nhuộm củ nâu trên một mảnh lụa, hong để đối chiếu sắc độ rồi mới nhuộm cả lô.",
      "Lụa được hong và làm phẳng nhẹ để giữ vẻ óng cùng độ rủ.",
    ],
  },
];
