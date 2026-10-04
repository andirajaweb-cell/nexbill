import type { HelpCategory } from "../../types";

export const PENJUALAN: HelpCategory[] = [
  {
    id: "transaksi",
    group: "penjualan",
    label: "Giao dịch (Lịch sử, Hoàn tiền & Void)",
    summary:
      "Nơi tìm mọi giao dịch (thuê máy, đồ ăn/uống, sản phẩm, PPOB), in lại hóa đơn, xem bút toán phía sau, và hủy hoặc hoàn tiền. Có thêm tab Hiệu suất thu ngân.",
    subsections: [
      {
        title: "Tìm giao dịch",
        steps: [
          "Chọn khoảng thời gian (Hôm nay, Hôm qua, Tuần này, Tháng này, Năm nay hoặc ngày tùy chọn).",
          "Lọc theo thu ngân, loại giao dịch, phương thức thanh toán, trạng thái, tên khách hoặc khoảng tổng tiền.",
          "Bấm Chi tiết để xem các món, khoản thanh toán và bút toán (sổ nhật ký).",
          "Bấm Hóa đơn để in lại hóa đơn.",
        ],
      },
      {
        title: "Hủy hoặc hoàn tiền",
        steps: [
          "Hoàn tiền (Refund): trả lại tiền cho khách (vd. tính dư). Void: hủy giao dịch nhập nhầm. Cả hai đều bắt buộc ghi lý do.",
          "Nếu vai trò của bạn không được làm trực tiếp, yêu cầu sẽ vào hàng chờ Phê duyệt trong Nhân viên & Quyền hạn và chờ quản lý duyệt.",
          "Giao dịch bị hủy không biến mất — vẫn còn với trạng thái đã hủy, và bút toán được đảo tự động.",
          "Đánh dấu đã thanh toán (chỉ Owner/Superuser): buộc hóa đơn bị kẹt được thanh toán bằng tiền mặt. Xóa vĩnh viễn chỉ dành cho trường hợp đặc biệt và không hoàn tác được — hãy dùng Void cho việc hủy thông thường.",
        ],
      },
      {
        title: "Hiệu suất thu ngân",
        steps: [
          "Chọn khoảng thời gian để xem xếp hạng thu ngân: số giao dịch, tổng doanh số, trung bình, phân theo loại, giảm giá, void, số ca và chênh lệch tiền mặt.",
        ],
      },
    ],
    notes: [
      "Xem danh sách giao dịch cần quyền xem báo cáo (Owner, Superuser, Manager, Accountant, Supervisor). Thu ngân và bếp không mở được danh sách.",
      "Để có tệp Excel/PDF, dùng menu Báo cáo hoặc Kế toán.",
    ],
    roles: "Xem: Owner, Superuser, Manager, Accountant, Supervisor. Hoàn tiền/void trực tiếp theo quyền của vai trò; vai trò khác qua Phê duyệt.",
  },
  {
    id: "promo",
    group: "penjualan",
    label: "Khuyến mãi & Gói thuê",
    summary:
      "Tạo gói thuê PS giá cố định (vd. \"Gói PS4 3 giờ Rp45.000\") để thu ngân chọn khi bắt đầu phiên. Voucher giảm giá mua hàng được tạo trong Thành viên & CRM.",
    steps: [
      "Nhập tên gói, console (Tất cả/PS3/PS4/PS5), thời lượng tính bằng phút và giá gói, rồi bấm Lưu gói.",
      "Gói lập tức xuất hiện như một lựa chọn trong khung Phiên mới trên trang Cho thuê PS.",
      "Sửa để thay đổi, Vô hiệu hóa để tạm ẩn, Xóa để bỏ gói chưa từng được dùng.",
      "Ý tưởng khuyến mãi giờ vắng: xem biểu đồ Giờ cao điểm vs Giờ vắng trên dashboard Tổng quan, rồi tạo gói riêng cho những giờ đó.",
    ],
    notes: [
      "Gói đã từng được dùng thì không xóa được — sẽ tự động bị vô hiệu hóa thay vào đó để lịch sử giao dịch vẫn đúng.",
      "Gói chỉ áp dụng trong Cho thuê PS, không áp dụng trong giỏ Thu ngân.",
    ],
    roles: "Owner, Superuser, Manager, Supervisor.",
  },
  {
    id: "membership",
    group: "penjualan",
    label: "Thành viên & CRM (Khách hàng, Điểm, Voucher)",
    summary:
      "Danh sách khách hàng kèm lịch sử mua, điểm và hạng thành viên (tự động theo tổng chi tiêu hoặc mua hạng), danh mục phần thưởng đổi bằng điểm, và voucher giảm giá.",
    subsections: [
      {
        title: "Khách hàng",
        steps: [
          "Tìm khách (tên/số điện thoại) hoặc bấm Thêm khách hàng — chỉ cần tên và số điện thoại.",
          "Bấm vào khách để xem tổng chi tiêu, điểm, hạng, lịch sử giao dịch/thuê/điểm và các phần thưởng có thể đổi.",
          "Đổi điểm: bấm \"Đổi\" trên phần thưởng — mã đổi thưởng xuất hiện. Phần thưởng giảm giá giờ chơi tự động trở thành voucher dùng một lần cho khách đó.",
          "Bán/gia hạn thành viên: chọn hạng, chọn Tiền mặt hoặc QRIS, bấm \"Thanh toán & Kích hoạt\". Khoản thanh toán tự động được ghi vào sổ sách và tiền của ca.",
        ],
      },
      {
        title: "Hạng thành viên",
        steps: [
          "Thêm hạng: tên (vd. Silver, Gold), tổng chi tiêu tối thiểu để lên hạng, phí thành viên (tùy chọn), hệ số nhân điểm, phần trăm giảm giá, quyền lợi và thời hạn.",
          "Khách tự lên hạng mỗi khi một giao dịch được thanh toán và tổng chi tiêu đạt điều kiện. Hạng không tự động giảm.",
          "Hạng có phí thành viên cũng có thể bán trực tiếp tại thu ngân.",
        ],
      },
      {
        title: "Phần thưởng",
        steps: ["Thêm phần thưởng: tên, loại (mua sắm tại thương hiệu đối tác hoặc giảm giá giờ chơi), số điểm cần, rồi thông tin chi tiết theo loại."],
      },
      {
        title: "Voucher",
        steps: [
          "Nhập mã (tự động viết hoa), loại (phần trăm hoặc số tiền), giá trị và mức chi tối thiểu, rồi bấm Tạo voucher.",
          "Khách chỉ cần đọc mã; thu ngân gõ mã trong Cho thuê PS hoặc Thu ngân.",
        ],
        notes: ["Voucher hết hiệu lực khi hết lượt sử dụng."],
      },
    ],
    notes: [
      "Điểm được cộng tự động, khoảng 1 điểm cho mỗi Rp10.000 chi tiêu (nhân hệ số của hạng), cộng thêm điểm chơi theo console cho phiên thuê.",
      "Một số nút (xóa khách, đổi điểm, sửa/xóa dữ liệu gốc) chỉ Superuser nhìn thấy.",
    ],
    roles: "Bán thành viên: Owner, Superuser, Manager, Supervisor, Cashier. Quản lý hạng/phần thưởng/voucher: Owner, Superuser, Manager, Supervisor.",
  },
  {
    id: "ppob",
    group: "penjualan",
    label: "Thanh toán hóa đơn / PPOB (Thẻ nạp, Token, Nạp tiền, Rút tiền mặt)",
    navHint: "Xuất hiện ở thanh bên khi mô-đun PPOB được bật (Cài đặt → Feature Management).",
    summary:
      "Ghi nhận bán sản phẩm số — nạp ví điện tử, token điện, thẻ nạp điện thoại, thanh toán hóa đơn, chuyển tiền, rút tiền mặt — trong cùng ứng dụng, với lợi nhuận của bạn và giá vốn của nhà cung cấp được ghi riêng.",
    steps: [
      "Một lần lúc đầu: bấm \"Quản lý giá nhà cung cấp & Lợi nhuận\" để đặt giá vốn và lợi nhuận cho từng sản phẩm.",
      "Điền biểu mẫu theo 3 ô: (1) Mệnh giá sản phẩm; (2) Tiền ra trả nhà cung cấp = giá vốn + phí nhà cung cấp, lấy từ tài khoản đã chọn (vd. Số dư ký quỹ PPOB); (3) Tiền vào từ khách = nhập Giá bán cho khách HOẶC Lãi — ô còn lại tự tính — vào tài khoản đã chọn (vd. Quỹ tiền mặt chính). Dòng Tóm tắt cho thấy số dư nào giảm, số dư nào tăng và tiền lãi; màu đỏ nếu lỗ.",
      "Rút tiền mặt: dòng tiền đi ngược lại — khách nhận tiền mặt từ ngăn kéo và số dư ký quỹ nhà cung cấp tăng lên.",
      "Nhập sai? Bấm Hủy (void). Sửa và xóa vĩnh viễn chỉ dành cho Superuser.",
      "Các thẻ phía trên hiển thị số dư ký quỹ PPOB và số giao dịch trong kỳ.",
    ],
    notes: [
      "Số dư ký quỹ PPOB được kiểm tra mỗi lần đóng ca, vì mọi thu ngân dùng chung.",
      "Nếu cửa hàng không bán PPOB, Superuser có thể tắt mô-đun — lịch sử cũ vẫn an toàn.",
    ],
    roles: "Owner, Superuser, Manager (theo quyền quản lý PPOB).",
  },
  {
    id: "marketplace",
    group: "penjualan",
    label: "Chợ giữa các cửa hàng (Mua bán đồ cũ)",
    summary:
      "Bán tay cầm, console, TV, ghế hoặc thiết bị không dùng nữa cho các cửa hàng NEXBILL khác — hoặc mua đồ cũ từ họ. Miễn phí, không thu phí dịch vụ. Có hồ sơ uy tín, tài khoản ngân hàng được khóa, bằng chứng giao dịch, đánh giá và kênh khiếu nại.",
    subsections: [
      {
        title: "Trước khi bắt đầu — Bảo mật & Tài khoản",
        steps: [
          "Mở tab Bảo mật & Tài khoản. Nhập tài khoản nhận tiền (ngân hàng/ví điện tử, số, tên chủ tài khoản đúng như sổ ngân hàng).",
          "Người mua chỉ được hướng dẫn trả vào tài khoản này. Nếu bạn đổi tài khoản, người mua sẽ thấy cảnh báo trong 7 ngày.",
          "Xem hồ sơ uy tín của cửa hàng bạn: tuổi tài khoản, giao dịch hoàn tất, đánh giá và khiếu nại — đây là cách cửa hàng khác nhìn thấy bạn.",
        ],
      },
      {
        title: "Bán món hàng",
        steps: [
          "Tab Hàng của tôi → Đăng bán: nhập tên món (vd. \"Tay cầm PS4 DualShock, đã qua sử dụng, như mới\"), danh mục, giá mỗi chiếc, số lượng và mô tả trung thực (tình trạng, độ đầy đủ, lý do bán).",
          "Thêm tối đa 5 ảnh — hàng có ảnh được tin tưởng hơn nhiều và bán nhanh hơn.",
          "Nhập số điện thoại liên lạc được. Số này không hiện trên gian hàng — chỉ được tiết lộ cho người mua sau khi bạn chấp nhận đề nghị của họ.",
          "Bấm Đăng lên gian hàng.",
          "Gỡ hàng khỏi gian hàng phải chọn lý do.",
        ],
      },
      {
        title: "Mua món hàng",
        steps: [
          "Xem gian hàng, tìm hoặc lọc theo danh mục, bấm vào món để xem ảnh và hồ sơ uy tín của người bán.",
          "Bấm Đề nghị mua: nhập giá đề nghị mỗi chiếc, ghi chú cho người bán và số điện thoại của bạn, rồi Gửi đề nghị.",
        ],
      },
      {
        title: "Thỏa thuận & bàn giao",
        steps: [
          "Người bán chấp nhận đề nghị trong tab Thỏa thuận — số điện thoại của hai bên được mở để hẹn bàn giao.",
          "Người mua CHỈ trả vào tài khoản hiển thị trên thẻ thỏa thuận, rồi tải lên bằng chứng thanh toán. Người bán tải lên bằng chứng bàn giao/mã vận đơn.",
          "Người bán: chỉ giao hàng khi tiền đã thật sự về — kiểm tra sao kê tài khoản, đừng chỉ tin ảnh chụp chuyển khoản.",
          "Người mua bấm \"Đã nhận hàng & Đã thanh toán\" sau khi nhận. Sau đó hai bên có thể đánh giá sao cho nhau.",
        ],
      },
      {
        title: "Nếu có sự cố",
        steps: [
          "Bấm Báo cáo sự cố trên thẻ thỏa thuận: chọn loại sự cố, viết diễn biến (đã thỏa thuận gì, ngày, số tiền) và đính kèm bằng chứng.",
          "Bên bị báo cáo có thể phản hồi kèm bằng chứng của họ. Đội ngũ NEXBILL quyết định sau khi đọc cả hai bên.",
          "Báo cáo sai sự thật có thể dẫn đến chế tài với người báo cáo.",
        ],
      },
    ],
    notes: [
      "Mẹo an toàn: kiểm tra hồ sơ của bên kia, ưu tiên giao tận tay hoặc trả sau khi xem hàng, chỉ chuyển tiền vào tài khoản trên thẻ thỏa thuận, tải bằng chứng lên ứng dụng.",
      "Đừng ghi số điện thoại, tài khoản khác hoặc đường dẫn trong mô tả, lý do hay đánh giá — hệ thống sẽ lọc bỏ để giao dịch được bảo vệ bằng bằng chứng trong ứng dụng.",
      "Cửa hàng mới tham gia có giới hạn giá trị hàng được đăng cho đến khi xây dựng được uy tín.",
      "Doanh thu bán hàng tự động được ghi là doanh thu của người bán trong sổ sách.",
    ],
  },
  {
    id: "chat",
    group: "penjualan",
    label: "Chăm sóc khách hàng (Hỏi đội ngũ NEXBILL)",
    navHint: "Đây là kênh hỗ trợ tới đội ngũ trung tâm NEXBILL — không phải hộp thư khách hàng của cửa hàng bạn.",
    summary: "Gửi câu hỏi, khiếu nại, góp ý hoặc sự cố kỹ thuật trực tiếp tới đội ngũ NEXBILL, kèm ảnh/video.",
    steps: [
      "Bấm \"+ Phiếu mới\", điền tiêu đề (tùy chọn), danh mục (Khiếu nại/Góp ý/Sự cố kỹ thuật/Khác) và nội dung, rồi Gửi về Trụ sở.",
      "Đính kèm ảnh hoặc video màn hình nếu có lỗi — sẽ được hiểu nhanh hơn nhiều.",
      "Chọn phiếu trong danh sách bên trái để đọc hội thoại, trả lời trong ô \"Trả lời...\".",
      "Yêu cầu token NexbillAgent (điều khiển Android TV) cũng được trả lời tại đây.",
    ],
    notes: [
      "Phản hồi hiện tự động, không cần làm mới trang.",
      "Đội ngũ NEXBILL trả lời bằng ngôn ngữ theo Quốc gia của cửa hàng bạn (Cài đặt → Kinh doanh & Thuế).",
      "Trạng thái phiếu (đã xử lý/đang mở) do đội ngũ NEXBILL quản lý.",
    ],
  },
  {
    id: "notifikasi",
    group: "penjualan",
    label: "Thông báo & Tin tức",
    navHint: "Biểu tượng chuông ở phía trên màn hình.",
    summary:
      "Mọi thứ cần bạn chú ý ở một nơi: hàng sắp hết, yêu cầu phê duyệt, khoản chi đang chờ, đặt chỗ, trạng thái gói đăng ký và thông báo từ đội ngũ NEXBILL.",
    steps: [
      "Bấm biểu tượng chuông. Số màu đỏ cho biết thông báo chưa đọc.",
      "Chọn Tất cả hoặc Chưa đọc.",
      "Bấm tiêu đề thông báo để mở thẳng trang liên quan (tự động đánh dấu đã đọc), hoặc bấm \"Đánh dấu đã đọc\".",
      "\"Đánh dấu tất cả đã đọc\" để xóa hết.",
    ],
    notes: [
      "Loại thông báo được hiển thị có thể đặt tại Cài đặt → Thông báo.",
      "Thông báo quan trọng từ đội ngũ NEXBILL cũng hiện một lần dưới dạng cửa sổ bật lên khi mở dashboard, cho đến khi bạn bấm \"Đã hiểu\".",
    ],
  },
];
