import type { HelpCategory } from "../../types";

export const PERAN: HelpCategory[] = [
  {
    id: "peran-kasir",
    group: "peran",
    label: "Tôi là Thu ngân — Công việc hằng ngày",
    summary:
      "Danh sách việc của thu ngân từ lúc mở cửa đến khi về, theo đúng thứ tự dùng mỗi ngày. Nếu bạn là thu ngân mới, hãy nắm vững chủ đề này trước.",
    roles: "Vai trò Cashier. Supervisor, Manager và Owner cũng làm được tất cả các bước này.",
    subsections: [
      {
        title: "Khi đến (mở cửa)",
        steps: [
          "Đăng nhập bằng tài khoản của chính bạn — không bao giờ dùng tài khoản đồng nghiệp.",
          "Mở Ca làm & Thu ngân → Mở ca mới. Đếm trước số tiền mặt thực có trong ngăn kéo, rồi nhập số đó làm Tiền đầu ca. Nếu khác với số ca trước để lại, hãy ghi lý do.",
          "Bật và kiểm tra mọi máy PS, tay cầm và TV. Đừng cho thuê máy hỏng — báo quản lý ca để tạo phiếu Bảo trì.",
          "Mở Đặt chỗ để xem lượt đặt hôm nay, tránh giao máy đã được đặt cho khách khác.",
          "Kiểm tra biểu tượng chuông (Thông báo) để xem hàng sắp hết hoặc tin nhắn quan trọng.",
        ],
      },
      {
        title: "Phục vụ khách chơi tại chỗ",
        steps: [
          "Khách không đặt trước → Cho thuê PS → chọn máy trống → chọn gói/theo giờ → nhập tên → Bắt đầu phiên.",
          "Khách có đặt chỗ → gõ mã đặt chỗ trong Đặt chỗ → Nhận phòng.",
          "Gọi đồ ăn/uống khi đang chơi → bấm +F&B trên thẻ phiên của khách, không qua Thu ngân, để tất cả nằm trong một hóa đơn.",
          "Khách muốn thêm giờ → Thêm thời gian. Để ý chuông báo khi còn 5 phút và mời khách gia hạn.",
          "Xong → Kết thúc phiên & Thanh toán → chọn phương thức → Thanh toán → In hóa đơn.",
        ],
      },
      {
        title: "Bán đồ ăn/uống không kèm thuê máy",
        steps: [
          "Mở Thu ngân (POS), bấm vào sản phẩm hoặc quét mã vạch, đặt số lượng, chọn phương thức thanh toán, bấm Thanh toán.",
          "Tiền mặt: nhận tiền, bấm \"Xác nhận đã nhận tiền mặt\". QRIS/chuyển khoản: hiển thị QRIS/tài khoản ngân hàng của cửa hàng trên màn hình, chờ tiền về, rồi đánh dấu đã nhận.",
        ],
      },
      {
        title: "Khoản tiền mặt nhỏ chi ra trong ca",
        steps: [
          "Gửi xe, nước bình, v.v. → ghi ngay trong Quản lý chi phí → Chi tiền nhanh. Đừng để sau, kẻo tiền của ca bị thiếu.",
          "Tiền chủ lấy / cất vào két → ghi là Nộp tiền mặt trên trang Ca làm & Thu ngân.",
        ],
      },
      {
        title: "Trước khi về (đóng ca)",
        steps: [
          "Đảm bảo không còn phiên nào đang chạy của khách đã về — kết thúc và thu tiền (hoặc lưu là trả sau).",
          "Mở Ca làm & Thu ngân → Đóng ca. Đếm ngăn kéo theo mệnh giá (Rp100.000, Rp50.000, v.v.) mà không nhìn số của hệ thống.",
          "Mở từng ứng dụng ví điện tử/ngân hàng đã dùng hôm nay và nhập số dư vào phần Kiểm tra số dư không dùng tiền mặt.",
          "Nhập số tiền mặt để lại trong ngăn kéo cho ca sau và số tiền chuyển cho chủ/két.",
          "Bấm Đóng ca. Nếu có chênh lệch, ghi nguyên nhân có thể vào ghi chú.",
          "Tắt TV/máy không dùng, sắp xếp tay cầm và bàn giao thông tin quan trọng cho ca sau.",
        ],
      },
    ],
    notes: [
      "Làm sai? Đừng hoảng. Có thể yêu cầu hủy (void/hoàn tiền) và quản lý ca sẽ duyệt — dữ liệu không mất, chỉ bị hủy.",
      "Thu ngân không thể giảm giá thủ công vượt mức chủ đã đặt (Cài đặt → Tùy chọn). Giảm giá lớn hơn cần Supervisor trở lên.",
      "Không bao giờ chia sẻ mật khẩu. Mọi giao dịch được ghi dưới tài khoản đang đăng nhập.",
    ],
  },
  {
    id: "peran-owner",
    group: "peran",
    label: "Tôi là Owner / Manager — Theo dõi kinh doanh",
    summary:
      "Những gì chủ hoặc quản lý nên kiểm tra mỗi ngày, mỗi tuần và mỗi tháng — để kiểm soát việc kinh doanh mà không cần lúc nào cũng có mặt ở cửa hàng.",
    roles: "Owner, Manager và Superuser. Một số menu tài chính chỉ Owner/Accountant/Superuser được thay đổi (Manager được xem).",
    subsections: [
      {
        title: "Mỗi ngày (5 phút trên điện thoại)",
        steps: [
          "Mở dashboard Tổng quan: doanh thu hôm nay, lợi nhuận gộp, số máy đang dùng, số dư tiền mặt và tiến độ so với mục tiêu ngày.",
          "Kiểm tra Thông báo: khoản chi chờ bạn duyệt, yêu cầu void/hoàn tiền, hàng sắp hết.",
          "Duyệt hoặc từ chối yêu cầu trong Nhân viên & Quyền hạn → Phê duyệt và trong Quản lý chi phí (trạng thái Chờ duyệt).",
          "Mở Ca làm & Thu ngân → Lịch sử ca: xem các ca có chênh lệch màu đỏ hoặc bị gắn cờ cần xem xét.",
        ],
      },
      {
        title: "Mỗi tuần",
        steps: [
          "Báo cáo → Bán hàng & Cho thuê: máy nào thu nhiều nhất và phương thức thanh toán nào dùng nhiều nhất. Biểu đồ Giờ cao điểm vs Giờ vắng trên dashboard Tổng quan giúp xếp lịch nhân viên và khuyến mãi giờ vắng.",
          "Giao dịch → Hiệu suất thu ngân: so sánh doanh số, void, giảm giá và chênh lệch tiền mặt của từng thu ngân.",
          "Kho hàng → Đơn đặt hàng: kiểm tra sản phẩm cần nhập thêm.",
          "Bảo trì: đảm bảo phiếu sửa chữa không bị dồn. Dùng Bác sĩ tay cầm để kiểm tra các tay cầm khách phàn nàn.",
        ],
      },
      {
        title: "Mỗi tháng",
        steps: [
          "Tài sản cố định → Khấu hao: chạy khấu hao cho tháng.",
          "Chi phí → Định kỳ: tạo các khoản chi định kỳ đến hạn (điện, internet, thuê mặt bằng, lương).",
          "Kế toán → Báo cáo kết quả kinh doanh và Bảng cân đối kế toán: xem lãi/lỗ tháng này và so với tháng trước. Báo cáo → Sức khỏe tài chính đưa ra bản tóm tắt dễ đọc hơn.",
          "Kế toán → Kiểm tra: chạy kiểm tra sổ sách tự động và làm theo gợi ý.",
          "Khi báo cáo của tháng đã chốt, khóa tháng trong Kế toán → Khóa kỳ kế toán để số liệu không thay đổi nữa.",
          "Kiểm tra hóa đơn NEXBILL trong menu Gói đăng ký để dịch vụ không bị gián đoạn.",
        ],
      },
      {
        title: "Đặt quy tắc cho cửa hàng",
        steps: [
          "Cài đặt → Kinh doanh & Thuế: thuế, phí dịch vụ, làm tròn hóa đơn, mục tiêu doanh số, hạn mức duyệt chi.",
          "Cài đặt → Tùy chọn: hạn mức giảm giá thủ công của thu ngân, ngưỡng chênh lệch tiền mặt bị gắn cờ, các tài khoản tiền mặt tạo nên tiền đầu ca gợi ý.",
          "Nhân viên & Quyền hạn: thêm/vô hiệu hóa nhân viên, buộc đăng xuất tài khoản còn đăng nhập trên thiết bị khác.",
        ],
      },
    ],
    notes: [
      "Hỏi bất cứ điều gì về việc kinh doanh trong AI Business Intelligence (chỉ Owner/Superuser), vd. \"máy PS nào lãi nhất tháng này?\".",
      "Nhiều chi nhánh? Menu Tất cả chi nhánh hiển thị doanh thu của mọi chi nhánh trên một màn hình.",
    ],
  },
  {
    id: "peran-dapur",
    group: "peran",
    label: "Tôi là Nhân viên bếp — Màn hình bếp",
    summary: "Cách nhân viên bếp nhận và hoàn thành đơn đồ ăn/uống mà không cần phiếu giấy.",
    roles: "Vai trò Kitchen. Bất kỳ nhân viên nào đã đăng nhập cũng mở được Màn hình bếp.",
    steps: [
      "Đăng nhập bằng tài khoản bếp và mở Màn hình bếp. Để mở trên máy tính bảng/màn hình trong bếp suốt ca.",
      "Bấm 🔊 để chuông báo đơn kêu, và \"Bật thông báo trình duyệt\" để đơn mới vẫn hiện khi màn hình đang ở ứng dụng khác.",
      "Đơn mới xuất hiện ở cột Mới kèm âm thanh. Bấm Xác nhận khi bắt đầu nhận xử lý.",
      "Bấm Bắt đầu nấu khi bắt đầu, rồi Sẵn sàng phục vụ khi xong — phục vụ/thu ngân sẽ nghe âm \"Món đã xong\".",
      "Sau khi mang ra cho khách, bấm Đã giao. Đơn rời khỏi bảng.",
      "Hết nguyên liệu? Ở cột Mới bấm Hủy và chọn lý do (vd. \"Hết nguyên liệu\") — thu ngân được báo và hóa đơn của khách tự điều chỉnh.",
    ],
    notes: [
      "Bảng tự làm mới vài giây một lần — không cần bấm làm mới.",
      "Tồn kho nguyên liệu tự giảm theo công thức khi món được bán. Nếu tồn nguyên liệu hay lệch, nhờ chủ kiểm tra công thức trong Kho hàng → Công thức / BOM.",
    ],
  },
  {
    id: "peran-akuntan",
    group: "peran",
    label: "Tôi là Kế toán — Sổ sách & Báo cáo",
    summary:
      "Công việc thường ngày của kế toán/nhân viên tài chính trong NEXBILL: đảm bảo mọi khoản chi, lần mua và điều chỉnh được ghi đúng, rồi chuẩn bị báo cáo tháng.",
    roles: "Accountant, Owner và Superuser (người được thay đổi dữ liệu kế toán). Manager chỉ được xem.",
    steps: [
      "Hằng ngày/tuần: rà soát Quản lý chi phí — bổ sung chứng từ, thanh toán các khoản chi ghi nợ, void các khoản sai.",
      "Rà soát Kế toán → Phải trả (AP) và Phải thu (AR): trả hóa đơn nhà cung cấp đến hạn, ghi nhận khoản khách trả.",
      "Đối chiếu số dư ngân hàng với sao kê. Dùng Kế toán → Đối chiếu để tìm giao dịch có ngày ghi sổ khác nhau.",
      "Cuối tháng: chạy Khấu hao tài sản, tạo các khoản chi Định kỳ, rồi kiểm tra Bảng cân đối thử có cân.",
      "Chạy Kế toán → Kiểm tra và xử lý các phát hiện (vd. sản phẩm thiếu giá vốn, bút toán trùng).",
      "Xuất Báo cáo kết quả kinh doanh, Bảng cân đối kế toán và Lưu chuyển tiền tệ (Excel/PDF). Điền Thuyết minh báo cáo tài chính trong tab Thuyết minh (SAK EMKM) nếu cần.",
      "Khóa tháng trong Kế toán → Khóa kỳ kế toán sau khi chủ duyệt báo cáo.",
    ],
    notes: [
      "Giao dịch tự động (bán hàng, chi phí, v.v.) không sửa trực tiếp trong sổ nhật ký được — hãy sửa qua menu gốc (vd. hoàn tiền trong Giao dịch, void trong Chi phí). Cách này giữ nguyên dấu vết kiểm toán.",
      "Nếu cần sửa sau khi đã khóa kỳ, hãy ghi vào kỳ hiện tại; đừng mở lại kỳ cũ trừ khi thật sự cần.",
    ],
  },
];
