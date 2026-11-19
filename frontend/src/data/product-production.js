const guide = (title, description, illustration, alt) => ({
  title, description,
  ...(illustration && { image: { src: `/public/images/production/${illustration}.webp`, alt, caption: "Ảnh minh họa công đoạn" } }),
});

const finish = (description, title = "Kiểm tra thành phẩm") => ({
  title, description, productImage: true,
});

function painted(size, background, design, illustration) {
  return [
    guide("Chuẩn bị nền lụa để vẽ", `Giũ sạch hồ, làm phẳng lụa và chừa biên cho khăn ${size}. Căng nền ${background} lên khung để màu không tụ vào nếp gấp.`, "stretch-silk", "Vải lụa nền được căng phẳng trên khung."),
    guide("Vẽ họa tiết bằng tay", `Thử màu trên mảnh lụa cùng nền, sau đó ${design}. Dùng cọ nhỏ để kiểm soát độ loang.`, illustration, "Cọ vẽ họa tiết trực tiếp trên lụa đang căng."),
    guide("Cố định màu và cuốn viền", "Đợi màu khô. Cố định theo hướng dẫn của loại màu, xả màu thừa nếu cần, rồi cuốn và khâu mép khăn.", "roll-hem", "Người thợ cuốn mép lụa và khâu các mũi nhỏ."),
    finish(`Kiểm tra nét vẽ, bốn góc và kích thước ${size} sau khi hoàn thiện.`),
  ];
}

function dyedScarf(size, dyeing, illustration, check) {
  return [
    guide("Chuẩn bị lụa dệt trơn", `Giũ hồ, tẩy chuội nếu cần và làm ướt đều mặt vải. Chừa mép để cắt và cuốn viền theo kích thước ${size}.`, "cut-scarf", "Cắt phôi khăn lụa theo thước."),
    guide("Nhuộm và so màu", dyeing, illustration, "Vải lụa được đưa qua bể nhuộm để tạo sắc độ."),
    guide("Xả màu, hong và cuốn viền", "Xả sạch phần màu dư, hong phẳng, cắt theo kích thước và cuốn mép bằng chỉ cùng tông.", "air-dry", "Các tấm lụa được hong trong bóng râm."),
    finish(check),
  ];
}

function wovenSurface(setup, weaving, illustration, treatment, check) {
  return [
    guide("Chuẩn bị sợi và lên khung", setup, "warp-loom", "Người thợ dàn sợi dọc trong lược dệt."),
    guide("Dệt đúng cấu trúc mặt vải", weaving, illustration, "Chi tiết sợi dọc, sợi ngang và mặt vải trên khung."),
    guide("Xử lý vải sau khi dệt", treatment, "press-silk", "Làm phẳng mặt lụa qua lớp vải lót."),
    finish(check, "Kiểm vải trước khi cắt bán"),
  ];
}

function tie(fabric, check, illustration) {
  return [
    guide("Trải vải và cắt xéo", `Trải ${fabric} theo chiều sợi. Canh họa tiết ở mặt trước rồi cắt thân theo đường chéo sợi để cà vạt rủ đúng dáng.`, illustration, "Vải lụa chấm nhỏ được cắt chéo theo rập thân cà vạt."),
    guide("May hai đầu và gấp thân", "May lót đầu nhọn và đuôi nhỏ, đặt lớp dựng mềm bên trong thân. Gấp các mép về đường giữa mặt sau để giữ dáng bản.", "line-tie", "Lớp dựng được đặt giữa các mép gấp của thân cà vạt."),
    guide("Khâu đường sống và đỉa giữ đuôi", "Khâu giấu mũi dọc thân, gắn đỉa giữ đầu nhỏ rồi là nhẹ qua khăn lót để tránh hằn đường may.", "sew-tie", "Người thợ khâu đường sống ở mặt sau cà vạt."),
    finish(check),
  ];
}

function gift(prepare, arrange, check) {
  return [
    guide("Chuẩn bị từng món lụa", prepare, "sort-gifts", "Các món lụa được kiểm tra và xếp theo tông trước khi đóng hộp."),
    guide("Gấp và xếp vào hộp", arrange, "pack-gift", "Khăn lụa được gấp và đặt vào hộp lót giấy."),
    finish(check, "Kiểm đủ bộ và đóng gói"),
  ];
}

function floral(pattern, preparation, check) {
  return [
    guide("Chọn sợi và bố trí ô hoa", preparation, "warp-loom", "Dàn sợi dọc trước khi đưa ô hoa vào dệt."),
    guide("Tạo hoa văn khi dệt", `Với lụa hoa dệt, go điều khiển cách đan sợi theo ô lặp. Dệt thử một đoạn để kiểm tra ${pattern}, rồi giữ nhịp sợi đều khi dệt dài.`, "weave-floral", "Vải lụa hoa đang dệt. Hình trong ảnh minh họa cấu trúc, không thể hiện đúng mã hoa."),
    guide("Hoàn thiện mặt vải", "Làm sạch hồ và xử lý bề mặt theo thành phần sợi. Ổn định khổ vải trước khi đo chiều dài.", "press-silk", "Mặt lụa được xử lý phẳng qua vải lót."),
    finish(check, "Kiểm hoa văn và đo vải"),
  ];
}

const products = new Map(Object.entries({
  "sen-hong": painted("70 × 70 cm", "hồng dịu", "vẽ từng lớp cánh sen đỏ, giữ chỗ sáng ở rìa cánh", "paint-lotus"),
  "dao-phai": painted("60 × 60 cm", "ngà", "vẽ cành đào từ góc vào giữa và chấm nhụy sau khi cánh hoa se mặt", "paint-peach"),
  "truc-suong": painted("72 × 72 cm", "xanh nhạt", "đi nét lá trúc dọc viền, chừa phần giữa thoáng", "paint-bamboo"),
  "cham-song": dyedScarf("45 × 160 cm", "Thử sắc chàm trên vải cùng lô. Nhúng hai đầu khăn với độ sâu khác nhau để tạo dải đậm nhạt, để màu chàm lên sắc giữa các lượt nhúng.", "dye-indigo", "Đối chiếu hai đầu khăn để thấy dải chàm chuyển sắc dọc theo chiều dài."),
  "may-lam": dyedScarf("42 × 155 cm", "Làm ướt lụa trước khi đưa dần từng đoạn vào dung dịch xanh lam. Kiểm tra vùng giao màu để giữ hiệu ứng loang mềm, đặc biệt ở hai đầu khăn.", "dye-gradient", "Trải khăn kiểm tra các vùng xanh bạc chuyển mềm, không bị gãy thành vạch ngang."),
  "tim-hien": dyedScarf("52 × 52 cm", "Nhuộm nền tím xám đồng nhất. Đảo vải để các nếp không giữ thuốc nhuộm và đối chiếu sắc độ khi mẫu thử đã khô.", "dye-violet", "So màu ở bốn góc và giữa khăn, kiểm tra chỉ viền cùng tông tím."),
  "ngoc-trai": [
    guide("Dệt nền vân trắng ngà", "Dùng sợi cùng tông, thay đổi kiểu đan dọc–ngang để vân chìm hiện khi nhìn nghiêng.", "weave-floral", "Hoa văn cùng màu nền hiện trên mặt lụa."),
    guide("Ổn định mặt vải và cắt vuông", "Làm phẳng nhẹ mặt lụa, canh theo đường sợi rồi cắt phôi, chừa phần cuốn viền.", "cut-scarf", "Cắt phôi khăn lụa theo thước."),
    guide("Cuốn mép nhỏ bằng chỉ cùng màu", "Cuốn đều mép và khâu bằng mũi nhỏ. Giữ các góc mảnh để khăn không cộm khi gấp.", "roll-hem", "Viền lụa trắng ngà được cuốn tay và khâu."),
    finish("Đo khăn 65 × 65 cm, soi nghiêng để kiểm tra vân dệt và thử độ phẳng ở bốn mép."),
  ],
  "reu-co": wovenSurface("Dàn sợi đồng đều theo khổ 90 cm, kiểm tra độ căng ở hai biên.", "Thay đổi cách đan sợi để tạo vân chìm, kiểm tra vân hiện khi đổi góc sáng.", "weave-moss", "Nhuộm thử màu rêu, so mẫu đã khô rồi mới nhuộm cả tấm. Làm phẳng nhẹ để giữ vân.", "Đo khổ, so sắc rêu ở hai biên và kiểm tra các dải vân lặp đều."),
  "dem-lam": wovenSurface("Chuẩn bị sợi tơ đồng cỡ cho khổ 90 cm và lên bộ go theo bố cục vân Đêm Lam.", "Dệt thử và nhìn nghiêng để kiểm tra vùng nổi bóng của vân trên nền xanh mực.", "weave-midnight", "Hoàn thiện nhẹ mặt lụa để nếp rủ và đường vân vẫn hiện dưới ánh sáng xiên.", "So mặt vải dưới ánh sáng thẳng và xiên, kiểm tra các đoạn vân đứt."),
  "bach-tra": wovenSurface("Chuẩn bị sợi cho khổ 105 cm, bố trí mật độ phù hợp với mặt sa thoáng.", "Dệt vải nhẹ, giữ khoảng thoáng đều và tránh siết sợi làm co biên.", "weave-gauze", "Giũ hồ và hong phẳng. Làm phẳng nhẹ để giữ bề mặt thoáng.", "Soi vải trước ánh sáng để kiểm tra độ trong, sợi xô lệch và lỗi mặt sa."),
  "ho-phach": wovenSurface("Lên sợi nền khổ 85 cm, chuẩn bị sợi hoa để tạo nét nổi trên nền vàng.", "Dệt nền và tạo hoa nổi đồng thời bằng lượt sợi hoa theo mẫu gấm.", "weave-brocade", "Ổn định vải và xử lý nhẹ mặt trái để họa tiết nổi không bị ép bẹt.", "Đối chiếu ô hoa hổ phách, kiểm tra cạnh mô-típ và sợi lỏng ở mặt trái."),
  "hong-dat": [
    guide("Lên sợi và dệt satin", "Lên khung theo khổ 110 cm. Dệt kiểu satin với các đoạn sợi nổi dài để tạo mặt óng, sau đó làm sạch hồ trước khi nhuộm.", "weave-satin", "Mặt satin bóng trên khung dệt."),
    guide("Thử và nhuộm bằng củ nâu", "Chiết dịch màu từ củ nâu, thử trên mảnh satin cùng lô và đối chiếu sau khi hong. Nhuộm cả tấm khi mẫu đạt sắc nâu ánh hồng.", "dye-cu-nau", "Mảnh củ nâu bên tấm satin được nhấc khỏi bể nhuộm."),
    guide("Xả, hong và làm phẳng nhẹ", "Xả màu dư và hong đều. Làm phẳng nhẹ để hạn chế vệt bóng do ép nhiệt.", "air-dry", "Lụa sau nhuộm được hong ở nơi thoáng."),
    finish("Soi đều mặt satin, đo khổ và đối chiếu sắc nâu ánh hồng sau khi khô."),
  ],
  "to-moc": [
    guide("Chọn sợi giữ màu ngà tự nhiên", "Chọn sợi chưa nhuộm, giữ sắc ngà nguyên bản và lên khung khổ 100 cm.", "warp-loom", "Dàn sợi dọc màu tự nhiên chuẩn bị dệt."),
    guide("Dệt tấm lụa mộc", "Dệt cho biên vải thẳng, giữ những biến thiên nhẹ trên bề mặt do sợi.", "weave-undyed", "Lụa mộc sắc ngà đang dệt."),
    guide("Giũ hồ, hong khô và giữ màu gốc", "Làm sạch phần hồ cần bỏ và hong ở nơi thoáng để giữ sắc tự nhiên.", "press-silk", "Xử lý bề mặt lụa sau khi hong."),
    finish("Kiểm tra biên, độ thoáng, sắc ngà và độ sần nhẹ trước khi cuộn vải."),
  ],
  "ca-vat-dat-nung": tie("lụa đỏ đất có điểm vàng", "Kiểm tra bản 7 cm, vị trí các điểm dệt vàng và đường sống thân cà vạt.", "cut-tie-rust"),
  "lam-muc": tie("lụa xanh mực có chấm kem", "Kiểm tra bản 7 cm, chấm kem cân ở đầu rộng và cà vạt lên nút không bị xoắn.", "cut-tie"),
  "buoc-toc-to-nang": [
    guide("Cắt dải satin cùng tông", "Chọn ba đoạn satin tông vàng nhạt còn lại sau khi cắt khăn. Cắt thành dải đủ để tạo nếp nhún quanh thun.", "cut-scrunchie", "Satin vàng nhạt được trải và đo để cắt thành các dải."),
    guide("May ống và luồn thun", "May cạnh dài, lộn mặt phải ra ngoài rồi luồn thun. Nối chắc hai đầu thun trước khi đóng kín cửa ống.", "sew-scrunchie", "Ống lụa vàng được lộn để chuẩn bị luồn thun."),
    finish("Thử độ co và độ chắc đường nối, so màu rồi ghép đủ ba chiếc vào bộ."),
  ],
  "tui-nguyet-bach": [
    guide("Cắt và may thân túi", "Cắt hai mặt lụa ngà có chừa đường may. May hai bên và đáy, để chỗ mở cho đường luồn dây.", "sew-pouch", "May đường bên của thân túi lụa ngà."),
    guide("Tạo ống miệng và luồn hai dây", "Gập miệng túi thành ống, luồn hai dây theo hai chiều ngược nhau. Buộc chắc từng cặp đầu.", "thread-pouch", "Hai dây được luồn qua ống miệng túi lụa."),
    finish("Đo túi 16 × 19 cm, kéo thử hai dây và kiểm tra miệng khép cân."),
  ],
  "bang-do-gio-reu": [
    guide("Cắt lụa và tạo vỏ bọc", "Canh lụa xanh rêu theo chiều dài của lõi bản 3 cm, chừa mép đủ để khép đường may phía trong.", "cut-headband", "Đặt lõi đệm cạnh phần lụa xanh để canh kích thước."),
    guide("Bọc lõi đệm và giấu đường may", "Bọc lụa qua lớp đệm nhẹ, dàn vải đều theo cung đầu rồi khâu giấu mép ở mặt trong.", "cover-headband", "Vỏ lụa xanh được dàn đều trên lõi băng đô có đệm."),
    finish("Kiểm tra hai đầu băng đô, độ êm của đệm và độ căng đều của mặt lụa."),
  ],
  "hop-nang": gift("Chọn khăn lụa vàng và hộp giấy theo tông, kiểm tra viền và các nếp khăn.", "Gấp khăn để tông vàng hiện khi mở nắp. Lót giấy và phối nơ be.", "Đối chiếu màu và số lượng theo đơn rồi đóng hộp."),
  "set-sac-truc": gift("Chọn khăn Trúc Sương đã cố định màu, kiểm tra dải lá vẽ và mép khăn.", "Gấp khăn để lộ nhánh trúc dọc viền, lót giấy mỏng trong hộp xanh rêu.", "Đối chiếu một khăn và một hộp trước khi bọc ngoài."),
  "hop-trang-nga": gift("Chọn khăn lụa vân trắng ngà, soi nghiêng để kiểm tra hoa văn chìm.", "Gấp khăn vuông sao cho mặt dệt hướng lên, đặt vào hộp sáng màu và chỉnh nơ.", "Kiểm đủ một khăn và một hộp, tránh để ruy băng hằn mặt lụa."),
  "set-loi-to": gift("Chọn từng món lụa sa và lụa vân theo danh sách đơn, so tông chàm và kem.", "Xếp lụa sa nhẹ phía trên, cách các món bằng giấy mỏng để dễ mở.", "Đối chiếu kích thước và số lượng theo lô đặt, kiểm tra trước khi đóng nắp."),
  "hop-pho-lua": gift("Ghép một khăn và một cà vạt có tông nâu đỏ và vàng ấm, kiểm tra viền khăn và bản cà vạt.", "Gấp khăn làm nền rồi đặt cà vạt vào hộp tông đất nung, tránh gập đầu nhọn.", "Kiểm đủ hai món, giữ chúng ổn định trong hộp khi vận chuyển."),
  "bo-cham-van": gift("Chọn một phụ kiện tông ô liu và một món tông hổ phách từ các lô gấm, lụa có sẵn.", "Xếp hai món cạnh nhau để mặt vân hiện rõ, dùng giấy đệm tránh cọ xát.", "Kiểm đủ hai phụ kiện, so sắc theo mẫu đặt trước khi đóng gói."),
}));

const references = new Map(Object.entries({
  "lua-hoa-sen-shd21": floral("cánh sen và nét hồ điệp", "Chuẩn bị sợi theo thành phần tơ tằm và viscose do Nhaxasilk công bố. Căn bố cục sen và hồ điệp theo ô hoa.", "Trải mẫu SHD21 để kiểm tra họa tiết sen, hồ điệp và sự liền mạch ở ô hoa kế tiếp."),
  "lua-hoa-tiet-tho-roi-tr38": floral("nét của họa tiết Thọ Rơi", "Chuẩn bị sợi tơ tằm và viscose theo mô tả của Nhaxasilk. Bố trí ô hoa Thọ Rơi và canh khoảng lặp.", "So mẫu TR38 theo từng đoạn vải, kiểm tra nét hoa và đo theo mét dài."),
  "lua-hoa-sen-shd19": floral("hình sen theo mẫu SHD19", "So hình sen trên mẫu SHD19 và chuẩn bị hệ sợi theo thông số của cơ sở. Lên khung theo khổ đặt.", "Kiểm tra đúng mẫu SHD19 và ô hoa lặp đều trước khi đo vải."),
  "lua-hoa-tiet-bo-cong-anh-bca01": floral("cụm hoa và hạt bồ công anh", "Đối chiếu bảng màu BCA01. Căn vị trí các cụm hoa và phần hạt nhỏ trong ô hoa lặp.", "Kiểm cụm hoa nhỏ và sắc nền theo bảng mẫu BCA01 trước khi đo khổ."),
  "lua-hoa-sen-ho-diep-shd01": floral("mảng cánh sen xen với nét hồ điệp", "So mẫu SHD01 của Vũ Việt Silk, canh vị trí các ô sen và bướm để họa tiết liền mạch.", "Kiểm hoa sen và hồ điệp trên mẫu SHD01, đo chiều dài sau khi ổn định khổ."),
  "khan-dui-choang-co-mau-xanh-navy": [
    guide("Chọn và lên sợi đũi", "Chuẩn bị sợi đũi, giữ độ gồ nhẹ tự nhiên của sợi và lên khung theo khổ khăn choàng.", "warp-loom", "Các sợi dọc được dàn đều trên khung chuẩn bị dệt."),
    guide("Dệt bề mặt đũi thoáng", "Dệt thử để cân độ thưa và độ rủ, sau đó giữ hai biên đều trong suốt chiều dài khăn.", "weave-undyed", "Minh họa bề mặt vải dệt có sợi gồ nhẹ."),
    guide("Hoàn thiện sắc xanh navy", "So sắc độ navy trên mẫu đã khô, hoàn thiện phần mép và hai đầu khăn theo mẫu của cơ sở.", "press-silk", "Mặt lụa xanh được xử lý phẳng qua lớp vải lót."),
    finish("Trải khăn để kiểm tra độ đều màu, độ rủ và đường biên.", "Kiểm tra khăn đũi thành phẩm"),
  ],
}));

export function productProduction(product, { reference = false, cover } = {}) {
  const steps = (reference ? references : products).get(product.slug);
  if (!steps) return [];
  return steps.map(({ productImage, ...step }) => productImage && cover
    ? { ...step, image: { src: cover, alt: product.name, caption: reference ? "Ảnh mẫu do cơ sở công bố" : "Ảnh minh họa thành phẩm" } }
    : step);
}
