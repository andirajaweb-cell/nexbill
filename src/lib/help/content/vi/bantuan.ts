import type { HelpCategory } from "../../types";

export const BANTUAN: HelpCategory[] = [
  {
    id: "masalah-umum",
    group: "bantuan",
    label: "Sự cố thường gặp & Cách khắc phục",
    summary:
      "Những sự cố các cửa hàng hay gặp nhất, kèm các bước xử lý. Hãy thử trước khi liên hệ Chăm sóc khách hàng.",
    subsections: [
      {
        title: "Không đăng nhập được",
        steps: [
          "\"Tài khoản đang hoạt động trên thiết bị khác\": đăng xuất ở thiết bị trước, chờ 30 phút, hoặc nhờ Owner bấm \"Buộc đăng xuất\" trong Nhân viên & Quyền hạn.",
          "Quên mật khẩu: bấm \"Quên mật khẩu\" ở trang đăng nhập và mở đường dẫn trong email (kiểm tra cả thư mục Spam).",
          "Tài khoản bị vô hiệu hóa: nhờ Owner/Manager kích hoạt lại.",
        ],
      },
      {
        title: "TV không tự bật/tắt",
        steps: [
          "Kiểm tra trạng thái thiết bị trong Điều khiển thiết bị. Nếu ngoại tuyến: đảm bảo PC thu ngân chạy NexbillAgent đang bật và có internet.",
          "Android TV: đảm bảo TV và PC thu ngân cùng WiFi và IP của TV không đổi (khóa IP như trong Hướng dẫn NexbillAgent). Xem 28 sự cố thường gặp (mã P01–P28) trong Hướng dẫn đầy đủ NexbillAgent.",
          "Mọi ổ cắm Tuya đột nhiên không phản hồi: có lẽ Tuya Cloud Trial đã hết hạn — gia hạn tại iot.tuya.com.",
          "TV không phải Android: bắt buộc dùng ổ cắm thông minh. Bấm \"Xem ổ cắm thông minh đề xuất\" trong Điều khiển thiết bị.",
          "Trong lúc chưa sửa xong, hãy bật TV thủ công bằng điều khiển — phiên thuê vẫn chạy bình thường.",
        ],
      },
      {
        title: "Gamepad Tester không nhận tay cầm",
        steps: [
          "Dùng Chrome hoặc Edge, cắm tay cầm, rồi bấm một nút bất kỳ một lần.",
          "Tay cầm PS3 trên Windows cần driver DsHidMini (nút tải về trên trang Gamepad Tester). Tay cầm PS3 nhái thường vẫn không được nhận.",
          "Thử cáp USB khác — nhiều cáp rẻ chỉ để sạc, không truyền dữ liệu.",
        ],
      },
      {
        title: "Chênh lệch tiền mặt khi đóng ca",
        steps: [
          "Kiểm tra các khoản chi nhỏ chưa ghi (gửi xe, nước) — ghi qua Chi phí → Chi tiền nhanh.",
          "Kiểm tra tiền chủ lấy/đem nộp nhưng chưa ghi là Nộp tiền mặt.",
          "Kiểm tra menu Giao dịch xem có khoản lẽ ra là QRIS/chuyển khoản nhưng bị ghi là tiền mặt (hoặc ngược lại).",
          "Kiểm tra thối tiền sai và các hóa đơn \"trả sau\" thật ra đã được trả bằng tiền mặt.",
          "Ghi nguyên nhân có thể vào ghi chú ca để chủ theo dõi tiếp.",
        ],
      },
      {
        title: "Quên đóng ca / không mở được ca",
        steps: [
          "Mỗi cửa hàng chỉ mở được một ca (trừ khi được cho phép trong Tùy chọn). Nếu thu ngân trước quên đóng, quản lý ca có thể đóng ca đó: đếm ngăn kéo và ghi lý do.",
          "Sau đó mở ca mới như bình thường.",
        ],
      },
      {
        title: "Tồn kho bị âm hoặc không khớp",
        steps: [
          "Hàng đã mua phải được ghi qua Mua từ nhà cung cấp/Đơn đặt hàng, không chỉ đặt lên kệ.",
          "Món chế biến: đảm bảo công thức đúng — tồn nguyên liệu giảm, không phải tồn món.",
          "Thực hiện Kiểm kê để khớp tồn kho hệ thống với thực tế.",
        ],
      },
      {
        title: "Lợi nhuận có vẻ quá cao",
        steps: [
          "Nhiều khả năng có sản phẩm để trống Giá vốn. Điền tại Kho hàng → Sản phẩm; trang Báo cáo kết quả kinh doanh cũng hiện cảnh báo.",
          "Đảm bảo các khoản chi định kỳ (điện, lương, thuê mặt bằng) đã được ghi và khấu hao tài sản của tháng đã được chạy.",
        ],
      },
      {
        title: "Hóa đơn không in / bị cắt",
        steps: [
          "Đảm bảo máy in đang bật, đã có giấy và máy in được chọn trong hộp thoại in của trình duyệt.",
          "Đặt khổ giấy (58mm/80mm) tại Cài đặt → Kinh doanh & Thuế → Máy in, rồi \"Lưu cho máy tính này\".",
        ],
      },
      {
        title: "Thanh toán QRIS chưa được xác nhận",
        steps: [
          "Kiểm tra ứng dụng ngân hàng/QRIS của cửa hàng — đảm bảo tiền thật sự đã về (đừng chỉ tin ảnh chụp chuyển khoản của khách).",
          "Khi tiền đã về, bấm \"Đánh dấu đã nhận\" và nhập mã tham chiếu.",
        ],
      },
      {
        title: "Không thấy nút tôi cần",
        steps: [
          "Có thể vai trò của bạn không có quyền. Xóa vĩnh viễn, đổi điểm và cài đặt quyền chỉ dành cho Superuser.",
          "Có thể mô-đun đang tắt — kiểm tra Cài đặt → Feature Management (Superuser).",
          "Vẫn chưa rõ? Gửi ảnh chụp màn hình qua Chăm sóc khách hàng.",
        ],
      },
      {
        title: "Không ghi được bút toán vào tháng trước",
        steps: [
          "Tháng đó đã bị khóa trong Kế toán → Khóa kỳ kế toán. Hãy ghi bút toán điều chỉnh với ngày hôm nay, hoặc nhờ Owner/Accountant mở lại kỳ chỉ khi thật sự cần.",
        ],
      },
    ],
    notes: ["Vẫn chưa được? Mở Chăm sóc khách hàng, mô tả những gì bạn đã thử và đính kèm ảnh/video màn hình."],
  },
  {
    id: "kamus-istilah",
    group: "bantuan",
    label: "Bảng thuật ngữ",
    summary: "Giải thích ngắn gọn, dễ hiểu cho các thuật ngữ bạn sẽ gặp thường xuyên trong NEXBILL.",
    subsections: [
      {
        title: "Vận hành",
        steps: [
          "Phiên — một lượt thuê trên một máy, từ Bắt đầu đến Kết thúc phiên.",
          "Máy / Trạm / Phòng — một bộ PlayStation + TV được cho thuê.",
          "Gói — giá cố định cho một thời lượng (vd. 3 giờ Rp45.000).",
          "Thêm thời gian — cộng thêm giờ chơi cho phiên đang chạy.",
          "DP (đặt cọc) — khoản trả trước một phần lúc đầu.",
          "Đặt chỗ / Giữ chỗ — giữ máy cho một giờ nhất định. Danh sách chờ = hàng đợi khi trùng giờ. Không đến (no-show) = khách không tới.",
          "F&B — đồ ăn & thức uống.",
          "KDS / Màn hình bếp — màn hình đơn hàng trong bếp.",
          "Chia thanh toán — một hóa đơn trả bằng nhiều hơn một phương thức.",
          "Void — hủy giao dịch nhập nhầm. Hoàn tiền (Refund) — trả lại tiền cho khách.",
        ],
      },
      {
        title: "Thu ngân & ca làm",
        steps: [
          "Ca — khoảng thời gian một thu ngân chịu trách nhiệm ngăn kéo tiền.",
          "Tiền đầu ca — tiền mặt trong ngăn kéo khi mở ca.",
          "Tiền dự kiến — số tiền lẽ ra phải có trong ngăn kéo theo ghi chép giao dịch.",
          "Chênh lệch — số đếm thực tế trừ tiền dự kiến. Âm = thiếu tiền.",
          "Nộp tiền mặt — tiền trong ngăn kéo giao cho chủ/két/ngân hàng.",
          "Chuyển tiền mặt — chuyển tiền giữa các nơi giữ tiền.",
          "Số dư theo dõi — số dư ví điện tử/ký quỹ được kiểm tra mỗi lần đóng ca.",
        ],
      },
      {
        title: "Tồn kho",
        steps: [
          "SKU — mã riêng của sản phẩm.",
          "Giá vốn / COGS — chi phí để có một sản phẩm đã bán.",
          "Công thức / BOM — danh sách nguyên liệu cho một món.",
          "PO (Đơn đặt hàng) — đơn đặt gửi nhà cung cấp.",
          "Kiểm kê — đếm hàng thực tế và khớp với hệ thống.",
          "Hao hụt (Waste) — hàng hư/bỏ đi.",
          "Bình quân gia quyền / FIFO — cách tính giá vốn khi giá mua thay đổi.",
        ],
      },
      {
        title: "Tài chính & kế toán",
        steps: [
          "Sổ nhật ký — ghi chép kế toán của từng giao dịch (nợ và có).",
          "COA (Hệ thống tài khoản) — danh sách tài khoản kế toán, vd. Tiền mặt, Doanh thu cho thuê, Chi phí điện.",
          "Phải thu (AR) — tiền khách còn nợ cửa hàng.",
          "Phải trả (AP) — tiền cửa hàng còn nợ nhà cung cấp.",
          "Báo cáo kết quả kinh doanh — doanh thu trừ chi phí trong một kỳ.",
          "Bảng cân đối kế toán — tình hình tài sản, nợ và vốn tại một ngày.",
          "Lưu chuyển tiền tệ — tiền thực sự vào và ra.",
          "Số dư đầu kỳ — tình hình tài chính khi bắt đầu dùng NEXBILL.",
          "Khóa kỳ — khóa một tháng để báo cáo của tháng đó không thay đổi nữa.",
          "Hòa vốn / mục tiêu doanh số — doanh thu tối thiểu để kinh doanh không lỗ.",
          "Trung tâm chi phí — nhóm chi phí theo bộ phận kinh doanh.",
        ],
      },
      {
        title: "Tài sản",
        steps: [
          "Tài sản cố định — tài sản dùng lâu hơn một năm (PS, TV, ghế).",
          "Nguyên giá — giá mua tài sản kể cả vận chuyển/lắp đặt.",
          "Thời gian sử dụng — thời gian dự kiến dùng tài sản (tháng).",
          "Giá trị thanh lý ước tính — giá bán dự kiến của tài sản khi hết thời gian sử dụng.",
          "Khấu hao — phần giá trị tài sản giảm mỗi tháng do sử dụng.",
          "Giá trị còn lại — nguyên giá trừ tổng khấu hao.",
          "Thanh lý — tài sản được bán, hỏng nặng hoặc bị mất.",
        ],
      },
      {
        title: "Thiết bị & hệ thống",
        steps: [
          "NexbillAgent — ứng dụng nhỏ trên PC thu ngân để điều khiển Android TV.",
          "Ổ cắm thông minh — ổ cắm bật/tắt nguồn TV từ xa.",
          "Relay Agent / token — cầu nối và khóa bí mật giữa NEXBILL và NexbillAgent.",
          "TV Screensaver — màn hình quảng cáo trên Android TV khi máy không được dùng.",
          "Drift — cần analog của tay cầm tự di chuyển dù không chạm vào.",
          "Superuser — tài khoản cao nhất, cấu hình được mọi thứ kể cả quyền của các vai trò.",
          "Feature Management — nơi bật/tắt các mô-đun bổ sung.",
        ],
      },
    ],
  },
];
