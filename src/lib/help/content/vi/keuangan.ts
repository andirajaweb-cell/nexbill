import type { HelpCategory } from "../../types";

export const KEUANGAN: HelpCategory[] = [
  {
    id: "accounting",
    group: "keuangan",
    label: "Kế toán (Sổ sách & Báo cáo tài chính)",
    summary:
      "Sổ sách đầy đủ, tự điền từ mọi giao dịch: hệ thống tài khoản, sổ nhật ký, phải thu & phải trả, Báo cáo kết quả kinh doanh, Bảng cân đối kế toán, Lưu chuyển tiền tệ, kiểm tra tự động, khóa sổ hằng tháng và số dư đầu kỳ. Bạn không cần hiểu kế toán để đọc các báo cáo chính.",
    subsections: [
      {
        title: "Báo cáo hay mở nhất",
        steps: [
          "Báo cáo kết quả kinh doanh: chọn kỳ → xem tổng doanh thu, lợi nhuận gộp và lợi nhuận ròng, kèm chi tiết theo loại doanh thu và chi phí. Bật \"So sánh nhiều kỳ\" để so 2–4 tháng cạnh nhau.",
          "Bảng cân đối kế toán: tình hình tài sản (tiền mặt, ngân hàng, tồn kho, tài sản cố định), nợ phải trả và vốn chủ sở hữu tại cuối kỳ đã chọn — Hôm nay, Tuần này, Tháng này, Năm nay hoặc Tùy chọn/một ngày cụ thể. Lợi nhuận của các tháng đã khóa sổ hiển thị là Lợi nhuận giữ lại (kỳ đã khóa); chỉ lợi nhuận sau đó hiển thị là Lợi nhuận kỳ hiện tại. Lợi nhuận của kỳ đã chọn hiển thị bên dưới để tham khảo.",
          "Lưu chuyển tiền tệ: tiền thực sự vào và ra trong kỳ, theo danh mục và theo ngày.",
          "Mọi báo cáo đều tải được về Excel/PDF, và mỗi con số đều bấm được để xem các giao dịch tạo nên nó.",
        ],
      },
      {
        title: "Phải thu (AR) & Phải trả (AP)",
        steps: [
          "Phải thu: hóa đơn khách chưa trả, nhóm theo tuổi nợ (chưa đến hạn, 1–30, 31–60, >60 ngày). Bấm \"Nhận thanh toán\" khi khách trả.",
          "Phải trả: hóa đơn nhà cung cấp, khoản chi ghi nợ và nợ mua tài sản. Bấm Thanh toán, chọn tài khoản tiền mặt/ngân hàng.",
        ],
      },
      {
        title: "Hệ thống tài khoản & Ánh xạ tài khoản",
        steps: [
          "Danh sách tài khoản đã được chuẩn bị tự động. Chỉ thêm tài khoản mới khi cần (mã, tên, loại, tài khoản cha).",
          "Tài khoản đã từng dùng không xóa được — sẽ được lưu trữ tự động để lịch sử vẫn đúng.",
          "Ánh xạ tài khoản quyết định tài khoản đích tự động cho từng loại giao dịch (vd. thuê PS5 → Doanh thu cho thuê). Chỉ đổi khi bạn hiểu kế toán.",
        ],
      },
      {
        title: "Sổ nhật ký & Bảng cân đối thử",
        steps: [
          "Sổ nhật ký: mọi bút toán, lọc được theo nguồn (Cho thuê, POS, Chi phí, Tài sản, v.v.).",
          "Bút toán thủ công (chỉ người có quyền): nhập ngày, diễn giải và các dòng nợ/có — tổng nợ phải bằng tổng có.",
          "Hủy bút toán thủ công sẽ tạo bút toán đảo; bút toán gốc không bị xóa. Bút toán tự động được hủy qua menu gốc (vd. hoàn tiền trong Giao dịch).",
          "Bảng cân đối thử: số dư của mọi tài khoản trong kỳ. Để xem số dư từ đầu, chọn Custom và để trống cả hai ngày. Luôn phải hiện \"Balance\".",
        ],
      },
      {
        title: "Đối chiếu, Kiểm tra, Thuyết minh",
        steps: [
          "Đối chiếu: so giao dịch (theo ngày giao dịch) với sổ nhật ký (theo ngày ghi sổ) và chỉ ra đơn có ngày khác nhau hoặc có vấn đề, kèm hướng dẫn xử lý — không cần sửa thủ công.",
          "Kiểm tra: rà soát sổ sách tự động (vd. sản phẩm thiếu giá vốn, bút toán trùng, dữ liệu giữa các cửa hàng). Mọi đề xuất sửa luôn cần xác nhận và được ghi thành bút toán điều chỉnh.",
          "Thuyết minh (SAK EMKM): Thuyết minh báo cáo tài chính cho doanh nghiệp nhỏ, sẵn sàng hoàn thiện và in.",
        ],
      },
      {
        title: "Khóa kỳ kế toán (khóa tháng)",
        steps: [
          "Khi báo cáo của một tháng đã chốt, chọn tháng đó và bấm Khóa kỳ kế toán (ghi chú tùy chọn).",
          "Sau khi khóa, không bút toán mới nào — tự động hay thủ công — được ghi với ngày trong tháng đó, nên báo cáo đã nộp không thay đổi nữa.",
          "Chỉnh sửa sau khi đã khóa kỳ được ghi với ngày hôm nay. Chỉ mở lại kỳ khi thật sự cần.",
        ],
      },
      {
        title: "Chuyển dữ liệu (số dư đầu kỳ & dữ liệu cũ)",
        navHint: "Tab này chỉ Owner/Superuser nhìn thấy.",
        steps: [
          "Số dư đầu kỳ: ghi số dư mở đầu của mọi tài khoản (tiền mặt, ngân hàng, phải thu, phải trả, tài sản, vốn) tại ngày bắt đầu dùng NEXBILL. Bấm \"Tải tất cả tài khoản được ghi sổ\" để điền danh sách tài khoản. Chỉ được có một Số dư đầu kỳ đang hiệu lực.",
          "Nhập dữ liệu lịch sử: tải các mẫu (Bán hàng, Mua hàng, Thu nhập khác, Chi phí), điền, tải lên — để xu hướng các tháng trước hiện trong báo cáo.",
          "Tài sản đã có sẵn nhập dễ hơn qua Tài sản cố định → Tải lên Excel với tùy chọn Số dư đầu kỳ.",
        ],
        notes: ["Dữ liệu lịch sử đã nhập vào sổ sách và báo cáo, nhưng không hiện trong danh sách Giao dịch/Chi phí."],
      },
    ],
    notes: [
      "Mọi nhân viên đều XEM được trang này. Đổi hệ thống tài khoản & ánh xạ: Owner, Superuser, Accountant. Bút toán thủ công & số dư đầu kỳ: Owner, Superuser, Accountant. Manager chỉ xem.",
      "Hãy điền Giá vốn cho mọi sản phẩm — thiếu nó Báo cáo kết quả kinh doanh bị cao quá. Trang Báo cáo kết quả kinh doanh sẽ cảnh báo nếu có doanh thu mà giá vốn để trống.",
    ],
  },
  {
    id: "expenses",
    group: "keuangan",
    label: "Quản lý chi phí",
    summary:
      "Ghi mọi khoản chi của cửa hàng (điện, lương, thuê mặt bằng, nguyên liệu, gửi xe, v.v.) kèm chứng từ. Khoản chi nhỏ được duyệt tự động; khoản lớn chờ Owner/Manager duyệt. Tất cả tự động vào sổ sách.",
    subsections: [
      {
        title: "Ghi một khoản chi",
        steps: [
          "Bấm \"+ Khoản chi mới\": chọn tài khoản chi phí (vd. Chi phí điện), danh mục, diễn giải, người nhận/nhà cung cấp (tùy chọn), số lượng và số tiền, thuế (tùy chọn).",
          "Chọn cách trả: tài khoản tiền mặt/ngân hàng đã dùng, hoặc đánh dấu \"Ghi thành khoản phải trả\" và nhập ngày đến hạn.",
          "Đính kèm ảnh biên lai làm chứng từ.",
          "Bấm Lưu & Gửi. Dưới hạn mức duyệt (mặc định Rp500.000) sẽ được duyệt ngay; trên hạn mức thì trạng thái là Chờ duyệt.",
          "Nút lưu bị khóa trong lúc xử lý, nên bấm hai lần không tạo khoản chi trùng.",
        ],
      },
      {
        title: "Duyệt, thanh toán, hủy",
        steps: [
          "Owner/Manager bấm Duyệt hoặc Từ chối (kèm lý do) trên khoản chi đang chờ.",
          "Khoản chi ghi nợ, sau khi duyệt, có nút Thanh toán để tất toán.",
          "Bản nháp/đang chờ có thể hủy không để lại dấu vết. Khoản đã duyệt/đã trả được hủy bằng Void (bắt buộc lý do) — bút toán được đảo, dữ liệu không bị xóa.",
        ],
      },
      {
        title: "Chi tiền nhanh",
        steps: ["Biểu mẫu ngắn 3 ô (danh mục, số tiền, ghi chú) cho khoản chi nhỏ hằng ngày từ ngăn kéo, như gửi xe và nước bình. Vẫn áp dụng hạn mức duyệt."],
      },
      {
        title: "Định kỳ (chi phí lặp lại)",
        steps: [
          "Tạo mẫu cho chi phí lặp lại: tên, tài khoản, số tiền, tần suất (tháng/tuần/năm), ngày đến hạn tiếp theo.",
          "Bấm \"Tạo các khoản chi đến hạn\" để tạo bản nháp các khoản chi đã đến hạn, rồi Gửi như bình thường.",
        ],
      },
      {
        title: "Trung tâm chi phí & Dashboard",
        steps: [
          "Trung tâm chi phí chia chi phí theo bộ phận (Cho thuê, F&B, Bếp, Hành chính) để thấy bộ phận nào tốn kém nhất.",
          "Tab Dashboard: chi phí hôm nay/tháng này, chưa trả, chờ duyệt, đến hạn trong ≤3 ngày, chi tiết theo danh mục và xu hướng 30 ngày.",
        ],
      },
    ],
    roles: "Ghi & thanh toán: Owner, Superuser, Manager, Accountant, Cashier. Duyệt: Owner, Superuser, Manager. Void: Owner, Superuser, Manager, Accountant.",
  },
  {
    id: "other-income",
    group: "keuangan",
    label: "Thu nhập khác",
    summary:
      "Ghi nhận tiền vào ngoài doanh thu cho thuê, thu ngân và PPOB — vd. hoa hồng, cho thuê mặt bằng tổ chức giải đấu, tài trợ, bán đồ cũ, tiền phạt khách, lãi hoặc hoàn tiền từ ngân hàng.",
    steps: [
      "Chọn khoảng ngày (hoặc bấm Hôm nay / Tháng này) để xem danh sách.",
      "Nhập danh mục, diễn giải, nhận từ (tùy chọn), số tiền và phương thức thanh toán, rồi bấm Lưu.",
      "Được ghi sổ ngay mà không cần duyệt. Nếu là tiền mặt và có ca đang mở, cũng được tính vào tiền của ca.",
      "Ghi sai? Bấm Void và nhập lý do.",
    ],
    roles: "Ghi/void: Owner, Superuser, Manager, Accountant. Vai trò khác có quyền xem báo cáo chỉ được xem.",
  },
  {
    id: "payments-methods",
    group: "keuangan",
    label: "Phương thức thanh toán (QRIS, Chuyển khoản, Ví điện tử)",
    navHint: "Menu \"Thanh toán\" ở thanh bên.",
    summary:
      "Thiết lập các lựa chọn thanh toán hiện ở thu ngân, cho thuê, Cho thuê tại nhà và thành viên — gồm ảnh QRIS và tài khoản ngân hàng của cửa hàng hiển thị cho khách.",
    steps: [
      "Bấm \"+ Phương thức\", nhập tên (vd. QRIS, Chuyển khoản BCA, GoPay) và chọn loại:",
      "\"Số dư theo dõi\" — cho ví điện tử/số dư cần kiểm tra trong ứng dụng khi đóng ca. \"Chỉ thông tin\" — cho khoản tiền vào thẳng tài khoản ngân hàng/EDC, không cần kiểm tra mỗi ca.",
      "Tải lên ảnh QRIS tĩnh của cửa hàng và/hoặc nhập số & tên tài khoản ngân hàng. Khi thu ngân chọn phương thức này, khách thấy ngay nơi cần trả tiền.",
      "Sửa để đổi tên/loại/trạng thái hoạt động. Xóa chỉ ẩn phương thức khỏi giao dịch mới; giao dịch cũ không đổi.",
    ],
    notes: [
      "Tiền của khách luôn vào thẳng tài khoản/QRIS của cửa hàng — không bao giờ đi qua NEXBILL.",
      "Phương thức Tiền mặt không xóa được vì dùng để đếm tiền của ca.",
    ],
    roles: "Owner, Superuser, Manager.",
  },
  {
    id: "reports",
    group: "keuangan",
    label: "Báo cáo (Vận hành & Sức khỏe tài chính)",
    summary:
      "Báo cáo vận hành dễ đọc theo khoảng ngày: bán hàng, cho thuê, Cho thuê tại nhà, tồn kho & giá vốn, khách hàng, chi phí và điểm sức khỏe tài chính. Báo cáo tài chính chính thức (Kết quả kinh doanh, Cân đối kế toán, Lưu chuyển tiền tệ) nằm trong menu Kế toán.",
    subsections: [
      { title: "Bán hàng", steps: ["Tổng doanh thu (cho thuê vs thu ngân), số giao dịch đã thanh toán, xu hướng theo ngày, doanh thu theo phương thức thanh toán, tổng giảm giá/thuế/phí dịch vụ. Có so sánh với Báo cáo kết quả kinh doanh cùng kỳ."] },
      { title: "Cho thuê", steps: ["Doanh thu cho thuê, số phiên, thời gian chơi trung bình và bảng theo từng máy PS (số phiên, thời lượng trung bình, doanh thu)."] },
      { title: "Cho thuê tại nhà", steps: ["Doanh thu thuê mang về, phí trễ, phí hư hỏng, chi tiết theo danh mục và loại sản phẩm, và trạng thái tiền cọc."] },
      { title: "Kho hàng & Giá vốn", steps: ["Doanh thu sản phẩm, tổng giá vốn, biên lợi nhuận từng sản phẩm, danh sách hàng hư/bỏ và hàng sắp hết."] },
      { title: "Khách hàng", steps: ["Số khách hàng, phân bố hạng thành viên và những khách chi tiêu nhiều nhất."] },
      { title: "Chi phí", steps: ["Tổng chi phí vs doanh thu, tỷ lệ chi phí, lợi nhuận ròng, xu hướng và chi tiết theo danh mục/tài khoản/nhà cung cấp/phương thức/chi nhánh/trung tâm chi phí."] },
      {
        title: "Sức khỏe tài chính",
        steps: [
          "Tóm tắt bằng ngôn ngữ đơn giản về độ khỏe của việc kinh doanh: Khả năng sinh lời (lãi nhiều hay ít), Thanh khoản (đủ tiền mặt để trả nghĩa vụ không) và Hiệu quả vận hành (chi phí so với doanh thu).",
          "Dùng vào cuối mỗi tháng cùng với Báo cáo kết quả kinh doanh.",
        ],
      },
    ],
    notes: [
      "Mỗi tab có bộ chọn ngày riêng.",
      "Tải Excel/PDF cho báo cáo tài chính chính thức có trong menu Kế toán.",
    ],
  },
];
