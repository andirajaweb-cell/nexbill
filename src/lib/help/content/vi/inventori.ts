import type { HelpCategory } from "../../types";

export const INVENTORI: HelpCategory[] = [
  {
    id: "inventory",
    group: "inventori",
    label: "Kho hàng (Sản phẩm, Công thức, Nhà cung cấp, Tồn kho)",
    summary:
      "Quản lý sản phẩm bán ra, công thức món chế biến, nhà cung cấp, nhập hàng, đơn đặt hàng (PO) và kiểm kê thực tế. Mọi thay đổi về tồn kho và giá vốn đều tự động vào sổ sách.",
    subsections: [
      {
        title: "Sản phẩm",
        steps: [
          "Thêm thủ công: tên, danh mục, giá bán, Giá vốn, tồn đầu, đơn vị, tồn tối thiểu và nhà cung cấp chính (tùy chọn).",
          "Mã vạch: nhập khi thêm/sửa sản phẩm — gõ tay, quét bằng máy quét USB/Bluetooth, hoặc chạm biểu tượng camera để quét bằng điện thoại/laptop. Mỗi mã vạch chỉ dành cho một sản phẩm đang hoạt động. Cùng mã vạch được đọc ngay ở Thu ngân. Nút Quét camera phía trên danh sách tìm sản phẩm theo mã vạch; nếu chưa đăng ký, mã vạch được điền vào form Thêm sản phẩm mới. Nút quét cũng có ở Công thức/BOM, Mua hàng NCC và Đơn đặt hàng để chọn sản phẩm.",
          "Thêm nhiều cùng lúc: tải mẫu Excel, điền, rồi tải lên. Dòng có SKU đã tồn tại sẽ cập nhật sản phẩm đó (tồn kho không đổi qua tải lên).",
          "Danh mục sản phẩm và đơn vị (cái, gram, v.v.) đặt tại Cài đặt → Danh mục sản phẩm và Cài đặt → Đơn vị.",
          "Đổi tồn kho mà không qua mua hàng (hư, mất, đếm sai): dùng Điều chỉnh tồn kho — Thêm, Giảm (lý do Chênh lệch hoặc Hư/Hao hụt), hoặc Đặt về một số lượng cụ thể.",
          "Hàng mua từ nhà cung cấp không nên đi qua Điều chỉnh tồn kho — hãy dùng Mua từ nhà cung cấp hoặc Đơn đặt hàng để Giá vốn được tính.",
        ],
        notes: [
          "Bắt buộc điền Giá vốn. Thiếu nó, báo cáo coi việc bán sản phẩm là lãi hoàn toàn và Báo cáo kết quả kinh doanh bị cao quá.",
          "Xóa sản phẩm (chỉ Superuser) không xóa lịch sử bán của nó.",
        ],
      },
      {
        title: "Công thức / BOM (món chế biến)",
        steps: [
          "Chọn tạo sản phẩm mới hoặc dùng sản phẩm đồ ăn đã có.",
          "Nhập tên công thức và sản lượng (số phần mỗi mẻ), rồi thêm nguyên liệu: sản phẩm nguyên liệu, số lượng và đơn vị.",
          "Lưu. Giá vốn mỗi phần được tính tự động từ nguyên liệu. Mỗi khi bán món, tồn kho NGUYÊN LIỆU sẽ giảm.",
        ],
        notes: ["Mỗi sản phẩm chỉ có một công thức."],
      },
      {
        title: "Nhà cung cấp",
        steps: [
          "Thêm nhà cung cấp: tên, điện thoại, địa chỉ và thời hạn thanh toán (ngày).",
          "Nhà cung cấp đã có giao dịch thì không xóa được — hãy lưu trữ để không hiện trong lựa chọn mới; lịch sử vẫn nguyên vẹn.",
        ],
      },
      {
        title: "Mua từ nhà cung cấp (nhập hàng trực tiếp)",
        steps: [
          "Chọn nhà cung cấp, nhập sản phẩm, số lượng và giá mua.",
          "Thêm chi phí vận chuyển/gửi xe/khác nếu có — được phân bổ tự động vào các sản phẩm để Giá vốn phản ánh chi phí thực.",
          "Đánh dấu \"Đã trả tiền mặt ngay\" nếu đã trả; bỏ trống để ghi thành khoản phải trả nhà cung cấp.",
          "Phương pháp tính giá vốn (Bình quân gia quyền hoặc FIFO — nhập trước xuất trước) được chọn ở tab này. Nếu không chắc, dùng Bình quân gia quyền (mặc định). Không có LIFO vì chuẩn mực kế toán và thuế của Indonesia không cho phép.",
        ],
      },
      {
        title: "Đơn đặt hàng (đặt hàng nhà cung cấp)",
        steps: [
          "\"Sản phẩm cần nhập thêm\" liệt kê sản phẩm dưới mức tối thiểu — bấm \"+ Thêm vào biểu mẫu PO\".",
          "\"Kiểm tra & Tạo PO tự động\" tạo PO nháp cho mọi sản phẩm dưới mức tối thiểu có nhà cung cấp chính. Bản nháp vẫn cần xem lại và gửi thủ công.",
          "Tạo PO thủ công: chọn nhà cung cấp, nhập sản phẩm, số lượng và giá, bấm Tạo PO.",
          "Khi hàng về, bấm Nhận hàng: tồn kho tăng và hóa đơn (khoản phải trả) cho nhà cung cấp được tạo tự động.",
        ],
      },
      {
        title: "Kiểm kê (đếm thực tế)",
        steps: [
          "Đếm hàng trên kệ/trong kho và nhập kết quả cạnh số của hệ thống — chênh lệch hiện ngay. Lưu dưới dạng nháp.",
          "Quét để đếm: chạm \"Quét để đếm\" (camera) hoặc quét vào ô tìm kiếm — mỗi lần quét cộng 1 cho sản phẩm đó. Vẫn có thể sửa số thủ công.",
          "Mở bản nháp để xem chênh lệch từng sản phẩm.",
          "Bấm Áp dụng điều chỉnh: thừa được ghi là điều chỉnh, thiếu được ghi là hao hụt. Không thể áp dụng hai lần.",
        ],
      },
    ],
    notes: ["Hầu hết thao tác trên trang này (tải lên, thêm sản phẩm/công thức, PO, kiểm kê) chỉ dành cho Owner và Manager."],
    roles: "Owner, Superuser, Manager.",
  },
  {
    id: "assets",
    group: "inventori",
    label: "Tài sản cố định (Máy PS, TV, Tay cầm, Nội thất)",
    summary:
      "Danh sách tài sản của cửa hàng (PlayStation, TV, tay cầm, nội thất, xe) kèm khấu hao tự động hằng tháng, mua tài sản, sửa chữa và thanh lý (bán/hỏng/mất). Danh sách có thể lọc, tải về Excel và nhập bằng cách tải lên Excel.",
    subsections: [
      {
        title: "Danh sách tài sản — xem & lọc",
        steps: [
          "Tìm theo tên, ghi chú hoặc tên máy PS. Lọc theo danh mục, trạng thái (Đang dùng, Bảo trì, Đã thanh lý, hoặc tất cả trừ đã thanh lý), có liên kết máy PS hay không, và khoảng ngày mua.",
          "Dưới bộ lọc hiển thị số tài sản khớp, kèm tổng nguyên giá, khấu hao lũy kế và giá trị còn lại.",
          "Bấm Tải Excel để tải danh sách theo bộ lọc đang áp dụng (kèm dòng TỔNG).",
        ],
      },
      {
        title: "Thêm tài sản",
        steps: [
          "Một tài sản: bấm \"+ Tài sản mới\" — nhập tên, danh mục, máy PS liên quan (tùy chọn), nguyên giá, giá trị thanh lý ước tính, thời gian sử dụng (tháng), nhà cung cấp và cách trả (tiền mặt/ngân hàng hoặc ghi nợ).",
          "Nhiều tài sản cùng lúc, chi phí vận chuyển/lắp đặt, trả trước, hoặc tài sản đã có sẵn: dùng tab Mua tài sản.",
          "Nhiều tài sản từ Excel: bấm Tải lên Excel → tải mẫu → điền → chọn cách ghi nhận (Số dư đầu kỳ cho tài sản đã có, Trả từ tiền mặt/ngân hàng, hoặc Ghi nợ) → Kiểm tra tệp → Lưu.",
          "Khi tải lên, tệp được kiểm tra trước: dòng sai được hiển thị kèm lý do, và không có gì được lưu cho đến khi mọi dòng đều đúng. Các dòng cùng ngày gộp thành một chứng từ Mua tài sản.",
        ],
        notes: [
          "Giá trị thanh lý ước tính = giá bán dự kiến khi hết thời gian sử dụng. Ví dụ thời gian sử dụng: PS 36 tháng, TV 60 tháng, tay cầm 12 tháng.",
          "Tải lên nhầm? Hủy chứng từ từ tab Mua tài sản (miễn là tài sản trong đó chưa được khấu hao hay thanh lý).",
        ],
      },
      {
        title: "Mua tài sản",
        steps: [
          "Một chứng từ mua có thể gồm nhiều món. Số lượng 3 tự động thành 3 tài sản đánh số (#1, #2, #3).",
          "Chi phí vận chuyển/lắp đặt được phân bổ vào nguyên giá của từng món.",
          "Lựa chọn thanh toán: trả đủ, ghi nợ, trả trước (DP) hoặc số dư đầu kỳ. Khoản nợ mua tài sản hiện trong Kế toán → Phải trả và có thể trả góp.",
          "Có thể hủy lần mua miễn là chưa có tài sản nào trong đó được khấu hao hay thanh lý.",
        ],
      },
      {
        title: "Sửa chữa & thanh lý",
        steps: [
          "+ Bảo trì trên tài sản đang dùng: nhập mô tả và chi phí, đánh dấu \"Tạo khoản chi\" để chi phí được ghi thành chi phí.",
          "Thanh lý tài sản (đã bán, hỏng nặng, mất): nhập số tiền thu được (0 nếu không có), tài khoản tiền mặt/ngân hàng nhận và lý do. Lãi/lỗ thanh lý được tính tự động.",
        ],
      },
      {
        title: "Khấu hao (hằng tháng)",
        steps: [
          "Mở tab Khấu hao, chọn tháng, xem tổng ước tính, rồi bấm Chạy khấu hao.",
          "Bấm nhiều lần vẫn an toàn: tháng đã xử lý hoặc tài sản đã khấu hao hết sẽ tự động được bỏ qua.",
          "Lịch sử khấu hao hiển thị mọi khoản khấu hao đã ghi.",
        ],
      },
    ],
    roles: "Xem & tải về: mọi nhân viên mở được trang này. Thêm, tải lên, sửa chữa, thanh lý, khấu hao: Owner, Superuser, Manager, Accountant.",
  },
  {
    id: "maintenance",
    group: "inventori",
    label: "Bảo trì (Phiếu sửa chữa)",
    summary:
      "Theo dõi việc sửa TV, console, tay cầm và thiết bị khác từ lúc đưa đi sửa đến khi xong, để không quên hư hỏng nào và chi phí sửa được ghi lại.",
    subsections: [
      {
        title: "Tạo & xử lý phiếu",
        steps: [
          "Bấm \"+ Thêm bảo trì\": chọn tài sản, mô tả hư hỏng và chi phí, đánh dấu \"Tạo khoản chi\" nếu chi phí cần ghi thành chi phí.",
          "Phiếu mới có trạng thái \"Đang bảo trì\" và tài sản tự động được đánh dấu Bảo trì.",
          "Bấm \"Bắt đầu xử lý\" khi bắt đầu sửa, rồi \"Đánh dấu hoàn tất\" khi xong — tài sản trở lại Đang dùng nếu không còn phiếu nào mở.",
          "Có thể sửa phiếu bất cứ lúc nào. Chi phí bị khóa khi đã tạo khoản chi (đổi trong menu Chi phí). Phiếu đã có khoản chi thì không xóa được.",
        ],
      },
      {
        title: "Tóm tắt theo danh mục",
        steps: ["Các thẻ phía trên hiển thị theo từng danh mục (PlayStation, TV, Tay cầm, v.v.): số máy sẵn sàng so với tổng, và số đang sửa."],
      },
    ],
    notes: [
      "Không chắc tay cầm có hỏng không? Kiểm tra trước bằng Bác sĩ tay cầm (Gamepad Tester) — có đường dẫn trên trang này.",
    ],
    roles: "Owner, Superuser, Manager, Accountant.",
  },
  {
    id: "dokter-stik",
    group: "inventori",
    label: "Bác sĩ tay cầm (Gamepad Tester) & Driver tay cầm PS3",
    navHint: "Bảo trì → Gamepad Tester",
    summary:
      "Kiểm tra tay cầm PS3, PS4 và PS5 ngay trong trình duyệt: nút chết, cần analog tự trôi (drift), độ cân bằng cần analog và lực bóp cò — cho ra điểm sức khỏe, phân tích hư hỏng và khuyến nghị sửa chữa.",
    subsections: [
      {
        title: "Kiểm tra tay cầm",
        steps: [
          "Mở trang này trong Google Chrome hoặc Microsoft Edge trên PC/laptop.",
          "Cắm tay cầm bằng cáp USB (PS4/PS5 cũng dùng được Bluetooth), rồi bấm một nút bất kỳ một lần — trình duyệt chỉ nhận tay cầm sau khi có nút được bấm.",
          "Âm lên cao = tay cầm đã kết nối, âm xuống thấp = đã ngắt. Có thể tắt âm bằng nút \"Âm thanh: Bật\". Nếu không nghe gì, hãy bấm vào trang một lần trước (quy tắc của trình duyệt).",
          "Bấm mọi nút và di chuyển cả hai cần analog: đèn chỉ báo sáng theo nút bạn bấm.",
          "Trong mục \"Kiểm tra có hướng dẫn (Bác sĩ tay cầm)\" bấm Bắt đầu kiểm tra, rồi làm theo chỉ dẫn trên màn hình: đặt tay cầm lên bàn không chạm vào trong lúc đếm ngược, xoay hết cả hai cần analog, và bóp L2/R2 từ từ đến hết. Cuối cùng bạn nhận điểm sức khỏe, các phát hiện, nguyên nhân có thể và khuyến nghị — có thể in hoặc lưu PDF.",
        ],
      },
      {
        title: "Tay cầm PS3 không được nhận trên Windows",
        steps: [
          "Đây không phải tay cầm hỏng: Windows không có driver sẵn cho tay cầm PS3, nên các nút không được chuyển tới trình duyệt.",
          "Tải driver DsHidMini bằng nút trên trang này, cài đặt, rồi cắm lại tay cầm.",
          "Driver chỉ được bảo đảm với tay cầm PS3 CHÍNH HÃNG Sony. Nhiều tay cầm PS3 nhái vẫn không được nhận dù đã cài driver.",
          "Không muốn cài driver: mở trang này trong Chrome trên điện thoại Android và kết nối tay cầm PS3 bằng cáp OTG.",
        ],
      },
    ],
    notes: [
      "Kết quả được đọc trực tiếp từ phần cứng tay cầm, không phải mô phỏng.",
      "Công cụ này không đọc con quay/adaptive trigger của DualSense và không điều khiển rung — chỉ dành cho chức năng nút và cần analog.",
      "Tay cầm có kết quả kém: tạo phiếu Bảo trì để được ghi lại và không cho khách thuê.",
    ],
  },
];
