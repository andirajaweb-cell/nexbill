import type { PageGuideBook } from "./page-guides";

export const PAGE_GUIDES_VI: PageGuideBook = {
  ui: {"guidePrefix": "Hướng dẫn", "open": "Mở", "close": "Đóng", "steps": "Các bước", "tips": "Lưu ý"},
  pages: {
    rental: {
      summary: "Màn hình chính cho thuê máy PS: bắt đầu phiên, theo dõi giờ, thêm đồ ăn uống vào hóa đơn, rồi thu tiền.",
      steps: [
        "Ở bảng Quick Start, chọn máy đang trống, đặt thời lượng (hoặc chơi mở) hoặc chọn gói khuyến mãi, rồi bắt đầu phiên.",
        "Trong lúc chơi, thêm đồ ăn, đồ uống hoặc phụ kiện vào hóa đơn, và gia hạn giờ khi khách yêu cầu.",
        "Bấm End Session & Thanh toán, rồi chọn phương thức thanh toán. Một hóa đơn có thể trả bằng nhiều phương thức (chia nhỏ).",
        "Nếu khách trả sau, đóng cửa sổ thanh toán — hóa đơn vẫn thanh toán được ở Thu ngân (POS).",
      ],
      tips: [
        "Máy có giá 0 sẽ tính 0. Hãy đặt giá trước bằng nút Đặt giá cho tất cả máy.",
        "TV hoặc ổ cắm thông minh tự bật tắt theo phiên khi máy đã được liên kết trong Điều khiển thiết bị.",
        "Đánh dấu máy hỏng hoặc đang bảo trì bằng Set Maintenance để không bị dùng và không hiện trong đặt chỗ online.",
      ],
    },
    pos: {
      summary: "Bán đồ ăn, đồ uống và sản phẩm khác. Hóa đơn thuê máy chưa trả cũng được thanh toán tại đây.",
      steps: [
        "Tìm sản phẩm theo tên hoặc quét mã vạch (dùng camera điện thoại cũng được), rồi chạm vào sản phẩm để thêm vào giỏ.",
        "Nhập giảm giá hoặc mã voucher nếu có, rồi chọn phương thức thanh toán.",
        "Bấm Thanh toán, rồi In hóa đơn nếu khách cần.",
        "Đơn đang mở liệt kê các hóa đơn chưa trả, gồm cả phiên thuê đã đóng với \"trả sau\".",
      ],
      tips: [
        "Chưa có menu? Dùng Thêm món nhanh (tên + giá). Tồn kho, giá vốn và mã vạch có thể bổ sung sau trong Kho hàng.",
        "Khi có nhiều sản phẩm, dùng Nhập sản phẩm từ Excel trong Kho hàng.",
        "Tiền QRIS và chuyển khoản vào QRIS và tài khoản ngân hàng của chính cửa hàng bạn, được cài trong menu Thanh toán.",
      ],
    },
    booking: {
      summary: "Ghi lại đặt chỗ qua điện thoại/WhatsApp, nhận đặt chỗ online và check-in khách khi đến.",
      steps: [
        "Chia sẻ link đặt chỗ online bằng nút Chia sẻ link đặt chỗ để khách tự đặt.",
        "Với đơn qua điện thoại/WA, điền Đặt chỗ mới (tên, số điện thoại, máy hoặc \"máy bất kỳ\", giờ, tiền cọc tùy chọn), hoặc bấm vào ô trống trên Bản đồ đặt chỗ.",
        "Khi khách đến, gõ mã đặt chỗ (vd. BK-00001) vào ô Tìm & Check-in.",
        "Xác nhận, đổi máy, hủy hoặc đánh dấu không đến từ chi tiết đặt chỗ.",
      ],
      tips: [
        "Lịch bị trùng tự vào danh sách chờ và tự lên khi có chỗ trống.",
        "Đặt chỗ chưa check-in sẽ tự được giải phóng sau thời hạn cài trong Cài đặt.",
        "Có thể tạm tắt nhận đặt chỗ online trong Cài đặt khi cửa hàng kín chỗ.",
      ],
    },
    inventory: {
      summary: "Danh sách sản phẩm và tồn kho. Bán hàng, mua hàng và điều chỉnh tồn kho được ghi sổ kế toán tự động.",
      steps: [
        "Thêm sản phẩm ở tab Sản phẩm (tên, danh mục, giá bán, tồn đầu), hoặc Nhập sản phẩm từ Excel khi có nhiều sản phẩm.",
        "Ghi nhận mua hàng từ nhà cung cấp ở tab Belanja Supplier — tồn kho tăng và giá vốn được cập nhật.",
        "Điền Tồn tối thiểu để nhận cảnh báo sắp hết hàng. Nếu sản phẩm có Nhà cung cấp chính, bản nháp Purchase Order được tạo tự động.",
        "Kiểm kê tồn thực tế định kỳ ở tab Stock Opname.",
      ],
      tips: [
        "Món chế biến được tạo ở tab Công thức / BOM, nên nguyên liệu sẽ bị trừ khi bán.",
        "Chỉ bật \"Gửi tới Kitchen Display\" cho món do bếp làm, không phải hàng đóng gói bán ngay.",
        "Hàng hỏng hoặc hết hạn ghi qua Điều chỉnh với lý do Hỏng / Waste, không xóa sản phẩm.",
      ],
    },
    membership: {
      summary: "Dữ liệu khách hàng, điểm thưởng và thẻ thành viên để khách quay lại.",
      steps: [
        "Ở tab Membership Tier, tạo hạng miễn phí (tự lên theo tổng chi tiêu) hoặc hạng trả phí (thẻ thành viên bán tại quầy).",
        "Điền quyền lợi tự động: giảm giá giờ chơi (%) và hệ số điểm. Hệ thống tự áp dụng.",
        "Ở tab Customer, thêm khách rồi chọn tên để xem lịch sử, bán hoặc gia hạn thẻ thành viên, và đổi điểm.",
        "Điền tab Reward để đổi được điểm, và tab Voucher cho mã giảm giá.",
      ],
      tips: [
        "Quyền lợi thủ công (chơi miễn phí, F&B miễn phí, v.v.) chỉ hiện dưới dạng nhắc nhở trên màn hình thu ngân; thu ngân là người áp dụng.",
        "Điểm được cộng mỗi khi giao dịch đứng tên khách hoàn tất, vì vậy hãy chọn khách khi giao dịch.",
        "Có thể cấp QR thẻ thành viên cho khách, thu ngân chỉ cần quét QR đó ở Rental PS.",
      ],
    },
    promo: {
      summary: "Gói giá cố định theo thời lượng, ví dụ 3 giờ PS4 với giá ưu đãi.",
      steps: [
        "Nhập tên gói, chọn máy (hoặc tất cả máy), thời lượng tính bằng phút và giá gói.",
        "Tùy chọn: thêm combo đồ ăn/uống. Món trong combo vào hóa đơn với giá 0 khi dùng gói.",
        "Lưu. Thu ngân có thể chọn gói ngay khi bắt đầu phiên ở Rental PS.",
      ],
      tips: [
        "Ví dụ gói: \"Gói đêm 3 giờ\" (180 phút) hoặc \"Chơi 2 giờ + Trà đá\".",
        "Gói cũng được AI agent dùng khi trả lời chat của khách.",
        "Gói không còn bán chỉ cần tắt kích hoạt để giữ lại lịch sử.",
      ],
    },
    reports: {
      summary: "Báo cáo vận hành theo kỳ. Chọn kỳ, rồi mở tab bạn cần.",
      steps: [
        "Chọn kỳ ở phía trên tab (vd. hôm nay, tháng này hoặc ngày tự chọn); báo cáo tải lại ngay.",
        "Doanh số: tổng doanh thu, xu hướng theo ngày và doanh thu theo phương thức thanh toán.",
        "Rental: số phiên, thời lượng trung bình và doanh thu mỗi máy PS để biết máy nào đắt khách nhất.",
        "Tồn kho & giá vốn cho biên lợi nhuận từng sản phẩm và hàng sắp hết; Khách hàng cho khách hàng hàng đầu; Chi phí cho chi tiêu theo danh mục.",
      ],
      tips: [
        "Để kiểm tra hằng ngày, chỉ cần xem tổng doanh thu, doanh thu mỗi máy PS và hàng sắp hết.",
        "Số lợi nhuận chính thức nằm ở Kế toán › Lãi lỗ. Tab Doanh số cho thấy cách đối chiếu hai số này.",
        "Tab Sức khỏe tài chính hiển thị biên lợi nhuận, khả năng thanh toán và tiến độ mục tiêu hòa vốn của cửa hàng.",
      ],
    },
  },
};
