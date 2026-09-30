import type { HelpCategory } from "../../types";

export const SISTEM: HelpCategory[] = [
  {
    id: "staff",
    group: "sistem",
    label: "Nhân viên & Quyền hạn",
    summary:
      "Quản lý tài khoản và vai trò nhân viên, xử lý yêu cầu phê duyệt (void/hoàn tiền), xem nhật ký hoạt động, cài đặt bảo mật đăng nhập và (chỉ Superuser) đặt quyền cho từng vai trò.",
    subsections: [
      {
        title: "Danh sách nhân viên",
        steps: [
          "Thêm nhân viên: tên, email, mật khẩu và vai trò (Manager, Accountant, Supervisor, Cashier, Kitchen hoặc Owner).",
          "Đổi vai trò ngay từ danh sách thả xuống trong bảng. Vô hiệu hóa tài khoản của nhân viên nghỉ việc — dữ liệu của họ vẫn được giữ.",
          "Chỉ Owner/Superuser mới đặt được nhân viên khác làm Owner.",
        ],
      },
      {
        title: "Bảo mật đăng nhập: một tài khoản = một thiết bị",
        steps: [
          "Khi quy tắc này bật (mặc định), tài khoản đang dùng trên một trình duyệt không đăng nhập được ở trình duyệt/PC khác cho đến khi đăng xuất, không hoạt động 30 phút, hoặc bị buộc đăng xuất.",
          "Nhân viên quên đăng xuất ở máy khác? Bấm \"Buộc đăng xuất\" trên tài khoản của họ trong danh sách nhân viên.",
          "Có thể tắt quy tắc này theo từng cửa hàng (không khuyến khích).",
        ],
      },
      {
        title: "Phê duyệt",
        steps: [
          "Yêu cầu Void/Hủy đơn: nhập số đơn và lý do. Nếu vai trò của bạn được phép, lệnh chạy ngay; nếu không, sẽ vào hàng chờ.",
          "Danh sách yêu cầu: người có quyền duyệt hoặc từ chối.",
          "Các ca bị gắn cờ (chênh lệch lớn hoặc nhiều void) cũng được xem xét tại đây.",
        ],
      },
      { title: "Nhật ký kiểm tra", steps: ["Bản ghi theo thời gian của mọi hoạt động quan trọng: ai đã làm gì, và khi nào. Chỉ để xem."] },
      {
        title: "Vai trò & Quyền hạn",
        navHint: "Chỉ tài khoản Superuser nhìn thấy.",
        steps: [
          "Bảng quyền: hàng = quyền, cột = vai trò. Đánh dấu/bỏ đánh dấu để đổi quyền truy cập của vai trò đó — có hiệu lực ngay.",
          "Bấm \"reset\" để khôi phục cài đặt mặc định của một vai trò.",
        ],
      },
    ],
    notes: [
      "Mỗi người nên có tài khoản riêng. Tài khoản dùng chung khiến chênh lệch tiền mặt và sai sót không truy vết được.",
      "Chỉ Superuser xóa vĩnh viễn được tài khoản nhân viên; với nhân viên nghỉ việc, vô hiệu hóa là đủ.",
    ],
  },
  {
    id: "settings",
    group: "sistem",
    label: "Cài đặt cửa hàng",
    summary:
      "Mọi cài đặt của cửa hàng trên một trang nhiều tab: hồ sơ kinh doanh & thuế, tùy chọn, chi nhánh, đơn vị, danh mục sản phẩm, thời lượng thuê, banner quảng cáo, TV Screensaver, thông báo, mô-đun tính năng, nhật ký kiểm tra và tài khoản của tôi.",
    subsections: [
      {
        title: "Kinh doanh & Thuế",
        steps: [
          "Hồ sơ kinh doanh: tên, logo, điện thoại, địa chỉ, Quốc gia (quyết định đơn vị tiền tệ và ngôn ngữ trả lời của Chăm sóc khách hàng), tên & mật khẩu WiFi.",
          "Thuế & Hóa đơn: thuế, phí dịch vụ, làm tròn hóa đơn đến Rp100/Rp500/Rp1.000 (phần chênh lệch được ghi tự động) và hạn mức duyệt chi.",
          "Mục tiêu doanh số tháng (hòa vốn) — hiển thị thành mục tiêu ngày trên Dashboard.",
          "Đặt chỗ / Giữ chỗ: khoảng cách giữa các lượt đặt, hạn nhận phòng, thời gian báo trước tối thiểu, nhận đặt chỗ trực tuyến và đường dẫn trang đặt chỗ của cửa hàng.",
          "Tích hợp Tuya Cloud API (cho ổ cắm thông minh Tuya), Chân hóa đơn, Máy in và Tài khoản ngân hàng để nhận hoa hồng giới thiệu.",
        ],
      },
      {
        title: "Tùy chọn",
        steps: [
          "Tiền tệ (theo Quốc gia), kỳ kế toán (đầu năm tài chính, tháng/quý/năm), định dạng số và ngày.",
          "Cấu thành tiền đầu ca: những tài khoản tiền mặt nào được cộng lại làm tiền đầu ca gợi ý.",
          "Ngưỡng chống gian lận của ca: chênh lệch tiền mặt và số void/hoàn tiền mỗi ca bị gắn cờ tự động; hạn mức giảm giá thủ công của thu ngân (%); cho phép nhiều ngăn kéo tiền mở cùng lúc.",
        ],
      },
      {
        title: "Chi nhánh, Đơn vị, Danh mục sản phẩm, Thời lượng thuê",
        steps: [
          "Chi nhánh: thêm chi nhánh mới và bấm \"Dùng chi nhánh này\" để đổi cửa hàng đang hoạt động.",
          "Đơn vị: cái, gram, kg, lít, v.v. — dùng trong sản phẩm, công thức và mua hàng.",
          "Danh mục sản phẩm: nhóm sản phẩm trong thu ngân và báo cáo.",
          "Thời lượng thuê: lựa chọn thời lượng nhanh khi bắt đầu phiên (vd. 30, 60, 90, 120 phút).",
        ],
      },
      {
        title: "Banner quảng cáo, TV Screensaver, Thông báo",
        steps: [
          "Banner quảng cáo: ảnh khuyến mãi (khuyên dùng tối thiểu 1600×500 px) cho trang đặt chỗ trực tuyến — đặt thứ tự, đường dẫn, bật/tắt.",
          "TV Screensaver: màn hình quảng cáo trên Android TV trong phòng — xem chủ đề TV Screensaver.",
          "Thông báo: chọn nhắc nhở nào được hiển thị (hàng sắp hết, khoản chi chờ duyệt, chênh lệch tiền mặt, đặt chỗ). Bảo trì máy dự đoán: số giờ sử dụng trước khi máy bị đánh dấu cần bảo dưỡng.",
        ],
      },
      {
        title: "Feature Management",
        navHint: "Chỉ Superuser được thay đổi.",
        steps: [
          "Bật/tắt mô-đun: Cho thuê tại nhà (và các tính năng con), PPOB, TV Screensaver.",
          "Tắt mô-đun không xóa dữ liệu — lịch sử hiện lại khi bật mô-đun trở lại.",
          "Tính năng con có nhãn \"Sắp ra mắt\" chưa dùng được.",
        ],
      },
      {
        title: "Tài khoản của tôi",
        steps: [
          "Đổi email đăng nhập và mật khẩu của chính bạn (mật khẩu tối thiểu 8 ký tự).",
          "Tài khoản tạo bằng Google có thể đặt mật khẩu để đăng nhập thêm bằng email & mật khẩu.",
        ],
      },
    ],
    notes: [
      "Thay đổi hầu hết cài đặt cần vai trò Owner, Superuser hoặc Manager; nhân viên khác chỉ được xem.",
      "Cài đặt máy in được lưu theo từng máy tính — hãy cài trên mọi máy tính thu ngân.",
      "Xóa toàn bộ dữ liệu (đặt lại hoàn toàn) nằm trong menu Dữ liệu Admin.",
    ],
  },
  {
    id: "semua-outlet",
    group: "sistem",
    label: "Tất cả chi nhánh (Nhiều chi nhánh)",
    navHint: "Menu này chỉ hiện với tài khoản liên kết nhiều hơn một cửa hàng.",
    summary: "Tóm tắt mọi chi nhánh trên một màn hình và là nơi quản lý chi nhánh: thêm, sửa hồ sơ, vô hiệu hóa, và nhảy tới dashboard của bất kỳ chi nhánh nào.",
    steps: [
      "Thẻ phía trên: tổng doanh thu hôm nay của mọi cửa hàng đang hoạt động.",
      "Mỗi cửa hàng hiện dưới dạng thẻ: trạng thái gói đăng ký, doanh thu hôm nay, số máy PS trống.",
      "Bấm \"Mở dashboard cửa hàng này\" để chuyển — mọi menu khác lập tức theo cửa hàng đó.",
      "Owner/Superuser: \"Thêm cửa hàng\" cho chi nhánh mới (hệ thống tài khoản được tạo tự động), biểu tượng bút chì để sửa hồ sơ, biểu tượng lưu trữ để vô hiệu hóa.",
      "Cửa hàng bị vô hiệu hóa chuyển sang mục Lưu trữ và có thể kích hoạt lại bất cứ lúc nào.",
    ],
    notes: [
      "Vô hiệu hóa = lưu trữ, không phải xóa. Mọi lịch sử vẫn an toàn.",
      "Cửa hàng chính của tài khoản bạn không vô hiệu hóa được từ đây.",
    ],
  },
  {
    id: "billing-subscription",
    group: "sistem",
    label: "Gói đăng ký NEXBILL",
    navHint: "Menu \"Gói đăng ký\" — đây là hóa đơn cửa hàng bạn trả CHO NEXBILL, không phải doanh thu của cửa hàng.",
    summary: "Trạng thái gói đăng ký ứng dụng, thanh toán hóa đơn, mua phần cứng (ổ cắm thông minh, dịch vụ lắp đặt, thêm slot console) và Tiện ích AI.",
    steps: [
      "Xem trạng thái: Dùng thử (30 ngày), Đang hoạt động, Chờ thanh toán, Thời gian ân hạn hoặc Tạm ngưng.",
      "Thanh toán hóa đơn: chọn QRIS, Tài khoản ảo ngân hàng hoặc phương thức khác có sẵn. Sau khi trả, bấm \"Đánh dấu đã thanh toán\" nếu được yêu cầu.",
      "\"Gia hạn ngay\" tạo sớm hóa đơn kỳ tiếp theo.",
      "Mua phần cứng: chọn ổ cắm thông minh, dịch vụ lắp đặt hoặc thêm slot console, đặt số lượng, thanh toán — tất cả gộp trong một hóa đơn.",
      "Tiện ích AI: miễn phí trong thời gian dùng thử, sau đó kích hoạt riêng với phí hằng tháng.",
    ],
    notes: [
      "Trong thời gian dùng thử, chưa thể thêm ổ cắm thông minh và điều khiển Android TV giới hạn 1 máy.",
      "Hóa đơn quá hạn chuyển sang Thời gian ân hạn 7 ngày; sau đó quyền truy cập bị tạm ngưng trừ trang Gói đăng ký. Mỗi ngày trong thời gian ân hạn đều có nhắc nhở.",
      "Các cửa hàng trong cùng nhóm hóa đơn (nhiều cửa hàng) được gia hạn cùng nhau bằng một lần thanh toán.",
      "Khoản thanh toán ở đây là chi phí trả cho NEXBILL và không bao giờ được ghi là doanh thu của cửa hàng bạn.",
    ],
    roles: "Owner, Superuser, Manager.",
  },
  {
    id: "referral",
    group: "sistem",
    label: "Chương trình giới thiệu (Mời cửa hàng khác)",
    summary:
      "Mời chủ cửa hàng cho thuê khác dùng NEXBILL bằng mã/đường dẫn của cửa hàng bạn. Họ được giảm 20% lần thanh toán đầu; bạn nhận hoa hồng mỗi lần họ trả phí đăng ký, chừng nào gói còn hoạt động.",
    steps: [
      "Sao chép đường dẫn giới thiệu của cửa hàng (\"?ref=MÃ\") và chia sẻ. Mã được tạo tự động cho mọi cửa hàng.",
      "Mỗi lần cửa hàng bạn mời trả phí đăng ký, hoa hồng (mặc định 20%) được ghi tự động.",
      "Thẻ tóm tắt: tổng hoa hồng và số dư chưa chi trả. Bên dưới: lịch sử chi trả và danh sách cửa hàng bạn đã mời.",
      "Nhập tài khoản ngân hàng của bạn tại Cài đặt → Kinh doanh & Thuế. Hoa hồng được đội ngũ NEXBILL chi trả thủ công vào mỗi thứ Hai.",
    ],
    notes: [
      "Hoa hồng chỉ đến từ phí đăng ký NEXBILL của cửa hàng được mời, không phải từ doanh thu của họ. Tự dừng nếu họ ngừng đăng ký.",
      "Cấp Affiliate (27%) và Master Partner (35%) do đội ngũ NEXBILL trao cho đối tác tích cực mời nhiều cửa hàng.",
    ],
  },
  {
    id: "rekomendasi-produk",
    group: "sistem",
    label: "Sản phẩm đề xuất (Mua sắm thiết bị)",
    navHint: "Được liên kết từ trang Gói đăng ký, và từ cảnh báo ổ cắm thông minh trong Điều khiển thiết bị.",
    summary:
      "Danh mục thiết bị cho cửa hàng thuê do đội ngũ NEXBILL chọn lọc (tay cầm, phụ kiện, cáp, mạng, ổ cắm thông minh, v.v.) với đường dẫn thẳng tới cửa hàng trực tuyến. Việc mua diễn ra tại cửa hàng đích, bên ngoài NEXBILL.",
    steps: [
      "Chọn danh mục, bấm vào sản phẩm để mở trang cửa hàng trong tab mới.",
      "Khi mở từ cảnh báo TV không phải Android trong Điều khiển thiết bị, trang này lọc sẵn các sản phẩm ổ cắm thông minh. Bấm \"Xem tất cả sản phẩm đề xuất\" để xem toàn bộ.",
      "Luôn kiểm tra giá cuối cùng trên trang cửa hàng — giá trong danh mục chỉ để tham khảo.",
    ],
    notes: ["Việc mua ở đây không tự động được thêm vào hóa đơn Gói đăng ký hay sổ sách của cửa hàng. Hãy ghi thành mua tài sản hoặc chi phí nếu cần."],
  },
  {
    id: "ai",
    group: "sistem",
    label: "AI Business Intelligence (Hỏi dữ liệu kinh doanh)",
    summary:
      "Hỏi bất cứ điều gì về việc kinh doanh bằng ngôn ngữ đời thường — AI đọc dữ liệu cửa hàng bạn (bán hàng, cho thuê, chi phí, lãi lỗ, tiền mặt, tồn kho, tài sản) và trả lời. Có thêm bảng phân tích tự động.",
    subsections: [
      {
        title: "Trợ lý kinh doanh",
        steps: [
          "Gõ câu hỏi, vd. \"Doanh thu tháng này so với tháng trước thế nào?\" hoặc \"Máy PS nào lãi nhất?\", hoặc bấm một câu hỏi mẫu.",
          "Trong lúc suy nghĩ, AI cho biết đang kiểm tra dữ liệu nào. Câu trả lời dùng số liệu mới nhất của cửa hàng bạn.",
        ],
      },
      {
        title: "Nhận định & Phân tích",
        steps: [
          "Xu hướng doanh thu & chi phí 30 ngày, dự báo 7 ngày và phát hiện số liệu bất thường — được tính tự động, miễn phí.",
          "Bấm \"Tạo khuyến nghị\" để nhờ AI viết lời khuyên.",
        ],
      },
    ],
    notes: [
      "Chỉ Owner và Superuser.",
      "Miễn phí trong thời gian dùng thử; sau đó cần Tiện ích AI trong menu Gói đăng ký.",
      "Hãy kiểm tra lại các số liệu quan trọng trong báo cáo trước khi ra quyết định lớn.",
    ],
  },
  {
    id: "admin",
    group: "sistem",
    label: "Dữ liệu Admin & Đặt lại dữ liệu",
    navHint: "Bảng dữ liệu chỉ dành cho Superuser. Mục Xóa toàn bộ dữ liệu cũng có cho Owner.",
    summary:
      "Lối tắt để sửa trực tiếp dữ liệu gốc (sản phẩm, khách hàng, nhà cung cấp, nhân viên, đơn vị, voucher, tài khoản tiền mặt/ngân hàng, v.v.), và Đặt lại dữ liệu để xóa sạch dữ liệu của cửa hàng. Hãy dùng hết sức cẩn thận.",
    steps: [
      "Chọn bảng, bấm Thêm/Sửa trên một dòng, điền, rồi Lưu.",
      "Xóa: với bảng có trạng thái hoạt động (sản phẩm, nhân viên, đơn vị, voucher, v.v.) chỉ là vô hiệu hóa; với bảng khác là xóa vĩnh viễn và sẽ thất bại nếu dòng đó vẫn đang được dùng.",
      "Xóa toàn bộ dữ liệu (Đặt lại hoàn toàn) — chỉ cửa hàng này: gõ lại cụm từ xác nhận, nhập mật khẩu, rồi bấm nút xóa.",
      "Đặt lại sẽ xóa VĨNH VIỄN mọi giao dịch, sổ sách, sản phẩm, tồn kho, khách hàng, chi phí, tài sản và cài đặt của cửa hàng này. Chỉ còn lại bản ghi cửa hàng và tài khoản Superuser/Owner.",
    ],
    notes: [
      "Dữ liệu giao dịch (đơn hàng, thanh toán, sổ nhật ký, biến động kho, nhật ký kiểm tra) cố ý không sửa được từ đây để lịch sử luôn trung thực.",
      "Việc đặt lại không hoàn tác được từ ứng dụng. Hãy liên hệ Chăm sóc khách hàng trước nếu không chắc.",
    ],
  },
];
