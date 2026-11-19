const silkStages = [
  {
    code: "UOM_TO",
    title: "Ươm tơ và chuẩn bị sợi",
    guide: "Ươm tơ là rút sợi từ kén tằm đã làm mềm trong nước nóng. Xưởng cũng có thể nhập tơ đã ươm rồi quấn sợi lên ống để chuẩn bị dệt.",
    illustration: {
      src: "/public/images/stage-uom-to.webp", width: 764, height: 508,
      alt: "Sợi tơ được rút từ kén trong chậu nước ấm và đưa lên guồng.",
    },
  },
  {
    code: "MAC_CUI",
    title: "Mắc cửi",
    guide: "Người thợ luồn từng sợi dọc qua go và lược dệt, rồi căng đều trên khung cửi. Cách xếp sợi quyết định khổ vải và mật độ sợi dọc.",
    illustration: {
      src: "/public/images/stage-mac-cui.webp", width: 764, height: 508,
      alt: "Người thợ luồn từng sợi dọc qua go của khung cửi.",
    },
  },
  {
    code: "DET_LUA",
    title: "Dệt lụa",
    guide: "Khung dệt nâng và hạ các nhóm sợi dọc để đưa sợi ngang qua. Cách đan hai nhóm sợi tạo nên mặt lụa trơn, vân dệt hoặc hoa văn.",
    illustration: {
      src: "/public/images/weaving-detail.webp", width: 414, height: 414,
      alt: "Con thoi gỗ mang sợi ngang nằm trên mặt lụa đang dệt.",
    },
  },
  {
    code: "NHUOM_MAU",
    title: "Tẩy chuội và nhuộm màu",
    guide: "Tẩy chuội giúp loại lớp keo tự nhiên bám quanh sợi tơ. Với mẫu có màu, thợ nhuộm xử lý vải trong bể nhuộm, rồi xả và làm khô. Nguyên liệu nhuộm tùy từng mẫu lụa.",
    illustration: {
      src: "/public/images/stage-nhuom-mau.webp", width: 764, height: 508,
      alt: "Người thợ nhấc tấm lụa ướt khỏi chậu nước nhuộm nâu.",
    },
  },
  {
    code: "CAN_LANG",
    title: "Cán láng và hoàn thiện",
    guide: "Người thợ làm phẳng mặt vải bằng trục cán hoặc bàn là, tùy loại lụa. Xưởng kiểm tra độ đều màu và lỗi mặt vải trước khi đóng gói hoặc chuyển sang may.",
    illustration: {
      src: "/public/images/stage-can-lang.webp", width: 764, height: 508,
      alt: "Tấm lụa được làm phẳng khi đi qua hai trục cán.",
    },
  },
];

export function describeSilkStages(logs) {
  const records = new Map(logs.map(log => [log.stage, log]));
  return silkStages.map((stage, index) => ({
    ...stage,
    number: String(index + 1).padStart(2, "0"),
    log: records.get(stage.code),
  }));
}
