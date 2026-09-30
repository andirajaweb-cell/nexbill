import type { HelpCategory } from "../../types";

export const MULAI: HelpCategory[] = [
  {
    id: "mulai-disini",
    group: "mulai",
    label: "Chào mừng — Bắt đầu tại đây",
    summary:
      "NEXBILL là ứng dụng để vận hành cửa hàng cho thuê PlayStation: tính giờ chơi, nhận thanh toán, bán đồ ăn và thức uống, theo dõi tồn kho và tự động lập báo cáo tài chính. Chủ đề này giải thích cách dùng Trung tâm trợ giúp và di chuyển giữa các menu, để ngày đầu tiên của bạn không bị bối rối.",
    subsections: [
      {
        title: "Cách dùng Trung tâm trợ giúp này",
        steps: [
          "Danh sách chủ đề nằm bên trái, được nhóm từ cơ bản nhất (Bắt đầu tại đây) đến nâng cao nhất (Quản lý & Hệ thống).",
          "Gõ một từ vào ô tìm kiếm (vd. \"ca\", \"hóa đơn\", \"tồn kho\", \"TV\") — danh sách lập tức lọc ra các chủ đề chứa từ đó, kể cả trong các bước.",
          "Mỗi chủ đề có Tóm tắt (dùng để làm gì), Cách sử dụng (các bước có đánh số) và Lưu ý quan trọng (lỗi thường gặp). Hãy làm theo các bước theo thứ tự.",
          "Mới dùng NEXBILL? Hãy đọc theo thứ tự: Khái niệm cơ bản → Thiết lập cửa hàng mới → Quy trình cho thuê PlayStation → Hướng dẫn theo vai trò cho công việc của bạn.",
          "Gặp khó khăn? Mở nhóm \"Trợ giúp & Thuật ngữ\" ở cuối cùng: có Sự cố thường gặp & Cách khắc phục và Bảng thuật ngữ.",
        ],
      },
      {
        title: "Đăng nhập và đăng xuất",
        steps: [
          "Mở dashboard.nexbill.id, nhập email và mật khẩu, rồi bấm Đăng nhập. Tài khoản tạo bằng Google có thể dùng nút Google.",
          "Quên mật khẩu? Bấm \"Quên mật khẩu\" ở trang đăng nhập và làm theo đường dẫn gửi tới email của bạn.",
          "Vì an toàn, một tài khoản chỉ hoạt động trên một thiết bị/trình duyệt tại một thời điểm. Nếu bạn đang đăng nhập trên điện thoại và thử đăng nhập trên PC, PC sẽ bị từ chối cho đến khi bạn đăng xuất trên điện thoại, tài khoản không hoạt động 30 phút, hoặc Owner bấm \"Buộc đăng xuất\" trong Nhân viên & Quyền hạn.",
          "Khi xong việc, bấm Đăng xuất trong menu tài khoản (góc trên bên phải) — đặc biệt trên máy tính dùng chung.",
        ],
      },
      {
        title: "Làm quen với dashboard",
        steps: [
          "Thanh bên trái chứa mọi menu, sắp xếp theo quy trình làm việc hằng ngày: Vận hành (Cho thuê PS, Thu ngân, Đặt chỗ) ở trên, tiếp theo là Bán hàng & Khách hàng, Kho & Tài chính, và Cài đặt ở dưới cùng. Trên điện thoại, mở thanh bên bằng nút menu (☰).",
          "Thanh trên cùng hiển thị tên cửa hàng đang hoạt động, chuông Thông báo, bộ chọn ngôn ngữ và menu tài khoản của bạn.",
          "Đổi ngôn ngữ bằng bộ chọn trên thanh trên cùng — có tiếng Indonesia, Anh, Mã Lai, Thái, Philippines và Việt. Trung tâm trợ giúp này cũng đổi ngôn ngữ theo.",
          "Các menu cửa hàng không dùng (vd. Cho thuê tại nhà, Thanh toán hóa đơn/PPOB, TV Screensaver) có thể được Superuser tắt trong Cài đặt → Feature Management để thanh bên gọn gàng.",
        ],
      },
    ],
    notes: [
      "Mọi dữ liệu được lưu trực tuyến (đám mây). Bạn có thể mở NEXBILL từ PC, laptop, máy tính bảng hoặc điện thoại — chỉ cần trình duyệt (khuyên dùng Google Chrome hoặc Microsoft Edge bản mới nhất).",
      "Cần người hỗ trợ? Mở menu Chăm sóc khách hàng để gửi câu hỏi trực tiếp tới đội ngũ NEXBILL.",
    ],
  },
  {
    id: "konsep-dasar",
    group: "mulai",
    label: "Khái niệm cơ bản của NEXBILL",
    summary:
      "Năm điều cần hiểu trước khi dùng NEXBILL: cửa hàng, tài khoản & vai trò nhân viên, ca thu ngân, giao dịch được ghi tự động và sổ sách kế toán tự động. Khi đã rõ những điều này, các menu khác sẽ dễ hiểu.",
    subsections: [
      {
        title: "1. Cửa hàng (chi nhánh)",
        steps: [
          "Cửa hàng là một địa điểm kinh doanh. Mọi dữ liệu (máy PS, sản phẩm, giao dịch, báo cáo) luôn thuộc về một cửa hàng cụ thể.",
          "Có nhiều chi nhánh? Một tài khoản có thể liên kết với nhiều cửa hàng. Menu \"Tất cả chi nhánh\" sẽ xuất hiện để bạn xem mọi chi nhánh cùng lúc và chuyển đổi chỉ với một cú nhấp.",
          "Dữ liệu không bao giờ lẫn giữa các cửa hàng — cửa hàng khác (kể cả của chủ khác) không thể xem dữ liệu của bạn.",
        ],
      },
      {
        title: "2. Tài khoản và vai trò nhân viên",
        steps: [
          "Mỗi người làm việc nên có tài khoản riêng — đừng dùng chung, để luôn biết rõ ai đã làm gì.",
          "Vai trò quyết định mỗi người được làm gì: Superuser (cao nhất, cấu hình được mọi thứ kể cả quyền hạn), Owner, Manager, Accountant, Supervisor, Cashier và Kitchen.",
          "Hầu hết menu đều cho mọi nhân viên XEM, nhưng các nút thay đổi dữ liệu (thêm, sửa, xóa, duyệt) chỉ xuất hiện với vai trò được phép. Vì vậy nếu thu ngân mở được Kế toán nhưng không sửa được gì, đó là có chủ đích.",
        ],
      },
      {
        title: "3. Ca thu ngân",
        steps: [
          "Ca là khoảng thời gian một thu ngân chịu trách nhiệm ngăn kéo tiền. Mở ca trước khi bán (nhập tiền đầu ca trong ngăn kéo) và đóng ca khi xong (đếm tiền trong ngăn kéo).",
          "Mọi khoản tiền mặt vào và ra trong ca đều được hệ thống cộng lại và so với số bạn đếm — mọi chênh lệch hiện ra ngay sau khi đóng ca.",
        ],
      },
      {
        title: "4. Giao dịch được ghi tự động",
        steps: [
          "Mỗi phiên thuê, lần bán ở thu ngân, lượt thuê mang về, lần bán PPOB, khoản chi và lần mua hàng đều được ghi tự động — không cần chép vào sổ hay Excel.",
          "Mọi giao dịch có thể tìm lại trong menu Giao dịch, kèm hóa đơn.",
        ],
      },
      {
        title: "5. Sổ sách kế toán tự động",
        steps: [
          "Phía sau mỗi giao dịch, NEXBILL tự tạo bút toán (sổ nhật ký). Kết quả là Báo cáo kết quả kinh doanh, Bảng cân đối kế toán và Lưu chuyển tiền tệ luôn được cập nhật.",
          "Danh sách tài khoản (Hệ thống tài khoản) được chuẩn bị khi tạo cửa hàng. Chủ cửa hàng thông thường không cần hiểu kế toán để dùng NEXBILL — chỉ cần thực hiện giao dịch đúng cách.",
        ],
      },
    ],
    notes: [
      "Một vài nút rủi ro nhất (xóa vĩnh viễn, sửa ma trận quyền) chỉ xuất hiện với tài khoản Superuser — ngay cả Owner cũng không thấy. Nếu không có nút \"Xóa\", đó không phải lỗi.",
      "Hầu hết lỗi nhập liệu đều có thể hoàn tác (void/hoàn tiền/hủy) mà không cần xóa dữ liệu — lịch sử được giữ lại để báo cáo luôn trung thực.",
    ],
  },
  {
    id: "setup-outlet-baru",
    group: "mulai",
    label: "Thiết lập cửa hàng mới (Danh sách kiểm tra đầy đủ)",
    summary:
      "Thứ tự các bước được khuyến nghị trước khi cửa hàng bắt đầu phục vụ khách — từ điền hồ sơ kinh doanh đến giao dịch thử đầu tiên. Các bước ghi (tùy chọn) có thể bỏ qua và làm sau.",
    subsections: [
      {
        title: "Bước 1 — Hồ sơ kinh doanh, thuế & quốc gia",
        navHint: "Cài đặt → Kinh doanh & Thuế",
        steps: [
          "Nhập tên doanh nghiệp, logo, số điện thoại, địa chỉ đầy đủ và Quốc gia. Quốc gia quyết định đơn vị tiền tệ hiển thị và ngôn ngữ mà bộ phận Chăm sóc khách hàng NEXBILL dùng để trả lời.",
          "Nhập tên & mật khẩu WiFi nếu bạn muốn hiển thị cho khách (trên hóa đơn, trang đặt chỗ trực tuyến hoặc TV Screensaver). TV chỉ hiển thị tên WiFi, không bao giờ hiển thị mật khẩu.",
          "Đặt Thuế (%), Phí dịch vụ (%) và làm tròn hóa đơn (vd. làm tròn đến Rp500/Rp1.000 để không còn tiền lẻ).",
          "Nhập Mục tiêu doanh số tháng (điểm hòa vốn). Dashboard Tổng quan sẽ hiển thị mục tiêu và tiến độ theo ngày.",
          "Đặt mức chi phí được tự động duyệt (mặc định Rp500.000). Khoản chi vượt mức này sẽ chờ Owner/Manager duyệt.",
          "Viết dòng chữ cuối hóa đơn (vd. \"Cảm ơn, hẹn gặp lại!\").",
        ],
      },
      {
        title: "Bước 2 — Thêm máy PlayStation & giá thuê",
        navHint: "Cho thuê PS → nút \"Quản lý máy\"",
        steps: [
          "Thêm từng máy một: tên máy (vd. \"PS5 - Phòng 1\"), loại console (PS2 đến PS5 Slim), loại TV và giá mỗi giờ.",
          "Loại TV quan trọng cho điều khiển tự động: Android TV có thể bật/tắt qua ứng dụng NexbillAgent, còn TV thường (analog hoặc smart TV không phải Android) cần ổ cắm thông minh.",
          "Nếu bạn bán gói giá cố định (vd. \"Gói PS4 3 giờ Rp45.000\"), hãy tạo trong Khuyến mãi & Gói. Lựa chọn thời lượng nhanh (30/60/90 phút, v.v.) đặt tại Cài đặt → Thời lượng thuê.",
          "Kiểm tra: mọi máy đều hiện trên trang Cho thuê PS và không máy nào đang ở trạng thái Bảo trì.",
        ],
      },
      {
        title: "Bước 3 — Thiết lập phương thức thanh toán",
        navHint: "Menu \"Thanh toán\"",
        steps: [
          "Tiền mặt đã có sẵn tự động.",
          "Thêm các phương thức không dùng tiền mặt mà bạn thực sự dùng: QRIS, chuyển khoản ngân hàng, GoPay, DANA, thẻ ghi nợ, v.v.",
          "Với QRIS/chuyển khoản, tải lên ảnh QRIS tĩnh của cửa hàng và nhập tài khoản ngân hàng của cửa hàng — cả hai sẽ hiển thị cho khách khi thu ngân chọn phương thức đó. Tiền luôn vào thẳng tài khoản cửa hàng, không bao giờ đi qua NEXBILL.",
        ],
      },
      {
        title: "Bước 4 — Thêm nhân viên & vai trò",
        navHint: "Nhân viên & Quyền hạn",
        steps: [
          "Tạo tài khoản cho từng nhân viên: tên, email, mật khẩu và vai trò (Manager/Accountant/Supervisor/Cashier/Kitchen).",
          "Đảm bảo mọi nhân viên đã thử đăng nhập trước ngày đầu tiên.",
        ],
      },
      {
        title: "Bước 5 (tùy chọn) — Kết nối TV & thiết bị",
        navHint: "Điều khiển thiết bị",
        steps: [
          "Android TV: làm theo \"Hướng dẫn thiết lập thiết bị\" trên trang Điều khiển thiết bị (xin token, tải NexbillAgent về PC thu ngân, kết nối TV).",
          "TV thường (không phải Android): lắp ổ cắm thông minh và đăng ký trên cùng trang đó. Trang này nhắc bạn máy nào vẫn cần ổ cắm thông minh.",
          "Liên kết mỗi thiết bị với máy cho thuê của nó. Có thể bỏ qua — TV vẫn bật thủ công bằng điều khiển từ xa được.",
        ],
      },
      {
        title: "Bước 6 — Thiết lập máy in hóa đơn",
        navHint: "Cài đặt → Kinh doanh & Thuế → Máy in",
        steps: [
          "Cắm máy in hóa đơn vào máy tính thu ngân và đảm bảo đã cài trong Windows.",
          "Thử in hóa đơn từ giao dịch thử (Bước 10). Nếu khổ giấy không vừa, đặt khổ giấy (58mm/80mm) rồi bấm \"Lưu cho máy tính này\" — lặp lại trên mọi máy tính thu ngân.",
        ],
      },
      {
        title: "Bước 7 (tùy chọn) — Sản phẩm đồ ăn/thức uống & tồn kho",
        navHint: "Kho hàng",
        steps: [
          "Thêm từng sản phẩm, hoặc tải mẫu Excel về và tải lên tất cả một lần.",
          "Điền Giá vốn cho mỗi sản phẩm — nếu thiếu, báo cáo sẽ coi mọi lần bán là lãi 100%.",
          "Với món chế biến (vd. mì xào, trà đá), hãy tạo Công thức để tồn kho nguyên liệu tự giảm mỗi khi bán món.",
          "Thêm Nhà cung cấp nếu bạn muốn ghi nhận việc nhập hàng.",
        ],
      },
      {
        title: "Bước 8 (tùy chọn) — Bật các mô-đun bổ sung",
        navHint: "Cài đặt → Feature Management (chỉ Superuser)",
        steps: [
          "Cho thuê tại nhà: nếu cửa hàng cũng cho khách thuê PS/TV mang về.",
          "PPOB: nếu cửa hàng cũng bán thẻ nạp điện thoại, token điện, nạp ví điện tử.",
          "TV Screensaver: nếu bạn muốn Android TV trong phòng chơi hiển thị khuyến mãi khi rảnh.",
          "Để tắt các mô-đun không dùng cho menu của nhân viên đơn giản.",
        ],
      },
      {
        title: "Bước 9 — Số dư đầu kỳ (chỉ cho cửa hàng đã hoạt động)",
        navHint: "Kế toán → Chuyển dữ liệu",
        steps: [
          "Cửa hàng mới hoàn toàn có thể bỏ qua bước này.",
          "Nếu cửa hàng đã hoạt động trước khi dùng NEXBILL, hãy nhập Số dư đầu kỳ (tiền mặt, ngân hàng, phải thu, phải trả, vốn) tại ngày bắt đầu dùng NEXBILL, để Bảng cân đối kế toán đúng ngay từ ngày đầu.",
          "Tài sản bạn đã sở hữu (máy PS, TV, ghế) có thể nhập một lần qua Tài sản cố định → Tải lên Excel với tùy chọn \"Số dư đầu kỳ\".",
        ],
      },
      {
        title: "Bước 10 — Mở ca & làm giao dịch thử",
        navHint: "Ca làm & Thu ngân, sau đó Cho thuê PS",
        steps: [
          "Mở ca đầu tiên với số tiền mặt thực có trong ngăn kéo.",
          "Làm một lượt thử trọn vẹn: bắt đầu phiên trên một máy, thêm 1 đồ uống, kết thúc phiên, thanh toán (thử tiền mặt và một phương thức không dùng tiền mặt), rồi in hóa đơn.",
          "Kiểm tra giao dịch xuất hiện trong Giao dịch và (nếu có đồ ăn) trên Màn hình bếp.",
          "Void giao dịch thử để không bị tính vào báo cáo doanh số thật.",
        ],
      },
    ],
    notes: [
      "Thứ tự này là gợi ý, không phải quy định. Điều quan trọng là Bước 1–4, 6 và 10 đã xong trước khi phục vụ khách.",
      "Tiếp tục với \"Quy trình cho thuê PlayStation\" để xem các phần kết nối với nhau thế nào.",
    ],
  },
  {
    id: "alur-kerja-rental",
    group: "mulai",
    label: "Quy trình cho thuê PlayStation (Từ đầu đến báo cáo)",
    summary:
      "Một phiên thuê từ khi khách đến cho tới khi tiền hiện trong báo cáo tài chính — để bạn hiểu Đặt chỗ, Cho thuê PS, Bếp, Ca làm, Giao dịch và Kế toán liên kết với nhau thế nào, thay vì là các menu riêng rẽ.",
    subsections: [
      {
        title: "1. Trước khi khách đến (tùy chọn — đặt chỗ)",
        steps: [
          "Khách đặt qua điện thoại/WhatsApp → thu ngân ghi vào Đặt chỗ. Hoặc khách tự đặt trên trang đặt chỗ trực tuyến của cửa hàng (đường dẫn ở Cài đặt → Kinh doanh & Thuế).",
          "Nếu trùng giờ, lượt đặt sẽ vào Danh sách chờ thay vì bị từ chối.",
          "Khi khách đến, thu ngân gõ mã đặt chỗ để nhận phòng nhanh.",
        ],
      },
      {
        title: "2. Khách đến — bắt đầu phiên",
        steps: [
          "Mở Cho thuê PS, chọn máy trống, chọn Gói (giá cố định) hoặc Theo giờ, và nhập tên khách (hoặc chọn thành viên).",
          "Nếu chính sách cửa hàng yêu cầu đặt cọc (DP), đánh dấu DP và nhận tiền.",
          "Bấm Bắt đầu phiên. Nếu máy được liên kết với TV/ổ cắm thông minh, TV có thể tự bật.",
        ],
      },
      {
        title: "3. Trong lúc chơi",
        steps: [
          "Gọi đồ ăn/uống → bấm +F&B trên thẻ phiên. Đơn lập tức hiện trên Màn hình bếp.",
          "Thêm tay cầm → +Phụ kiện (tính theo giờ kể từ lúc thêm).",
          "Thêm giờ → Thêm thời gian. Đổi phòng → Chuyển máy (hóa đơn và thời gian cũng chuyển theo).",
          "Theo dõi mọi máy cùng lúc trên Bảng tính giờ trực tiếp ở màn hình thứ hai.",
        ],
      },
      {
        title: "4. Chơi xong — thanh toán",
        steps: [
          "Bấm \"Kết thúc phiên & Thanh toán\". Hóa đơn cuối (tiền thuê + phụ kiện + đồ ăn) hiện tự động.",
          "Áp dụng giảm giá/voucher nếu có, chọn phương thức thanh toán, bấm Thanh toán. Có thể chia nhỏ (một phần tiền mặt, một phần QRIS) hoặc lưu là \"trả sau\".",
          "In hóa đơn.",
        ],
      },
      {
        title: "5. Sau khi thanh toán — mọi thứ tự ghi nhận",
        steps: [
          "Bút toán (sổ nhật ký) được tạo tự động và xem được tại Giao dịch → Chi tiết.",
          "Khoản trả bằng tiền mặt tự động tính vào tiền mặt của ca hiện tại.",
          "Thành viên tự động nhận điểm và có thể lên hạng.",
          "Doanh số lập tức hiện trên dashboard Tổng quan, trong Báo cáo và trong Báo cáo kết quả kinh doanh.",
        ],
      },
      {
        title: "6. Cuối ngày — đóng ca",
        steps: [
          "Thu ngân đếm ngăn kéo theo mệnh giá, kiểm tra số dư trong các ứng dụng không dùng tiền mặt và đóng ca.",
          "Mọi chênh lệch hiện sau khi đóng và được lưu trong Lịch sử ca.",
        ],
      },
    ],
    notes: [
      "Với lượt thuê khách MANG VỀ, quy trình khác — xem chủ đề Cho thuê tại nhà.",
      "Không nhập lại lần hai: một giao dịch trong Cho thuê PS tự động chảy sang Bếp, Ca làm, Giao dịch, Báo cáo và Kế toán.",
    ],
  },
];
