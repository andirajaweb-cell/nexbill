import type { HelpCategory } from "../../types";

export const OPERASIONAL: HelpCategory[] = [
  {
    id: "sop-harian",
    group: "operasional",
    label: "SOP hằng ngày (Danh sách mở–đóng cửa)",
    summary:
      "Cùng một danh sách công việc hằng ngày cho mọi nhân viên, bất kể lịch làm — từ mở cửa đến bàn giao. In ra và dán ở quầy thu ngân nếu thấy tiện.",
    subsections: [
      {
        title: "Danh sách mở cửa",
        steps: [
          "Kiểm tra mọi máy PS bật bình thường, tay cầm đủ và hoạt động, TV hiển thị rõ. Tay cầm đáng ngờ: kiểm tra bằng Bác sĩ tay cầm (Bảo trì → Gamepad Tester).",
          "Nếu dùng điều khiển TV tự động, đảm bảo thiết bị hiện \"trực tuyến\" trên trang Điều khiển thiết bị và PC thu ngân chạy NexbillAgent đang bật.",
          "Kiểm tra máy in hóa đơn đang bật và đủ giấy.",
          "Mở Đặt chỗ — xem lượt đặt hôm nay.",
          "Mở Thông báo (biểu tượng chuông) — hàng sắp hết, khoản chi chờ duyệt, thông báo từ NEXBILL.",
          "Mở Ca mới với Tiền đầu ca khớp với tiền thực có trong ngăn kéo.",
        ],
      },
      {
        title: "Trong giờ mở cửa",
        steps: [
          "Khách không đặt trước → bắt đầu phiên từ Cho thuê PS. Có đặt chỗ → nhận phòng bằng mã đặt chỗ.",
          "Đồ ăn/uống cho khách đang chơi → +F&B trên thẻ phiên. Khách mua không chơi → qua Thu ngân (POS).",
          "Theo dõi Bảng tính giờ trực tiếp để thấy phiên sắp hết và mời gia hạn trước khi hết giờ.",
          "Chi phí nhỏ → ghi ngay trong Chi phí → Chi tiền nhanh.",
          "Máy/tay cầm hỏng → rút khỏi cho thuê (Chuyển sang bảo trì) và tạo phiếu trong menu Bảo trì.",
          "Cần hủy giao dịch nhưng không có quyền → yêu cầu qua Nhân viên & Quyền hạn → Phê duyệt; đừng tìm cách lách.",
        ],
      },
      {
        title: "Danh sách đóng cửa / cuối ca",
        steps: [
          "Kết thúc mọi phiên của khách đã về và thu tiền đầy đủ.",
          "Đếm ngăn kéo theo mệnh giá trong biểu mẫu Đóng ca — đừng nhìn trước số của hệ thống.",
          "Nhập số dư hiển thị trong từng ứng dụng không dùng tiền mặt (QRIS/ví điện tử) tại thời điểm đó.",
          "Đóng ca; ghi nguyên nhân chênh lệch (nếu có) vào ghi chú.",
          "Tắt TV và máy không dùng, sắp xếp tay cầm và phụ kiện, khóa ngăn kéo.",
        ],
      },
      {
        title: "Bàn giao cho ca sau / quản lý",
        steps: [
          "Bàn giao: hóa đơn \"trả sau\" chưa thanh toán (kiểm tra trong Giao dịch), hàng sắp hết, máy/thiết bị có vấn đề (đảm bảo đã có phiếu Bảo trì) và chênh lệch tiền mặt.",
          "Báo người có thẩm quyền về các yêu cầu phê duyệt còn đang chờ.",
        ],
      },
    ],
    notes: ["Chi tiết từng tính năng nêu ở đây nằm trong chủ đề riêng của nó (Cho thuê PS, Thu ngân, Ca làm & Thu ngân, v.v.)."],
  },
  {
    id: "ringkasan",
    group: "operasional",
    label: "Dashboard Tổng quan (Trang chủ)",
    navHint: "Menu trên cùng ở thanh bên — trang mở ra sau khi đăng nhập.",
    summary:
      "Màn hình theo dõi chính: doanh thu và lợi nhuận hôm nay, số giao dịch, trạng thái máy PS, tình hình tiền mặt, biểu đồ giờ cao điểm vs giờ vắng, máy hiệu quả nhất, sản phẩm bán chạy và hàng sắp hết — tất cả trên một trang.",
    subsections: [
      {
        title: "Đọc các thẻ số liệu",
        steps: [
          "Mục tiêu hòa vốn hôm nay: mục tiêu tháng trong Cài đặt chia đều theo ngày — hiển thị phần trăm đã đạt hoặc phần còn thiếu.",
          "Doanh thu & Lợi nhuận: tổng doanh thu hôm nay (thuê máy, đồ ăn/uống, sản phẩm khác), chi phí hôm nay, lợi nhuận gộp và lợi nhuận ròng ước tính.",
          "Giao dịch & Khách hàng: số giao dịch hợp lệ (giống trang Giao dịch), khách hôm nay, thành viên mới và lượt đặt hôm nay.",
          "Trạng thái máy PS: bao nhiêu máy đang dùng, trống, đã đặt, đang bảo trì, và tỷ lệ sử dụng theo phần trăm.",
          "Tiền mặt & Tài chính: tiền mặt vào và ra hôm nay, số dư tiền mặt, số dư ngân hàng, phải thu (hóa đơn khách chưa trả) và phải trả nhà cung cấp.",
        ],
      },
      {
        title: "Biểu đồ Giờ cao điểm vs Giờ vắng",
        steps: [
          "Hiển thị số giao dịch trung bình mỗi ngày cho từng giờ, dựa trên 30 ngày gần nhất.",
          "Cột xanh lá = giờ đông nhất, cột vàng = giờ vắng nhất trong giờ hoạt động. Cột xám = ngoài giờ hoạt động (chỉ có giao dịch lác đác) và không được xếp hạng.",
          "Rê chuột/chạm vào cột để xem trung bình mỗi ngày và tổng 30 ngày của giờ đó.",
          "Dùng để lên kế hoạch nhân viên theo giờ và tạo khuyến mãi riêng cho giờ vắng.",
        ],
      },
      {
        title: "Các danh sách phía dưới",
        steps: [
          "Doanh thu theo máy PS (hôm nay) và máy hiệu quả nhất.",
          "Sản phẩm bán chạy hôm nay và Game được chơi nhiều nhất (nhập tên game khi bắt đầu phiên để danh sách này có dữ liệu).",
          "Hàng sắp hết: sản phẩm dưới mức tồn tối thiểu.",
          "Đối chiếu doanh thu: so doanh thu theo ngày giao dịch với doanh thu trong Báo cáo kết quả kinh doanh — nếu có chênh lệch, kiểm tra Kế toán → Đối chiếu.",
        ],
      },
    ],
    notes: [
      "\"Hôm nay\" được tính theo múi giờ của cửa hàng (vd. WIB), không theo máy chủ.",
      "Lợi nhuận trên trang này là ước tính theo ngày. Với số liệu tháng chính thức, hãy dùng Kế toán → Báo cáo kết quả kinh doanh.",
    ],
  },
  {
    id: "rental-ps",
    group: "operasional",
    label: "Cho thuê PS (Chơi tại chỗ)",
    summary:
      "Trang chính để bắt đầu, quản lý và kết thúc phiên thuê PlayStation của từng máy — gồm thêm giờ, chuyển máy, thêm đồ ăn/phụ kiện, điều khiển TV và thanh toán.",
    subsections: [
      {
        title: "Bắt đầu phiên mới",
        steps: [
          "Trong khung \"PHIÊN MỚI\", chọn máy trống (máy đang dùng hoặc đang sửa sẽ không hiện).",
          "Chọn Gói (giá cố định từ Khuyến mãi & Gói) hoặc Theo giờ. Với Theo giờ, chọn thời lượng (vd. 60 phút) hoặc \"Mở\" (tính giờ đến khi dừng).",
          "Nhập khách: Không phải thành viên (gõ tên bất kỳ) hoặc Thành viên (gõ tên/số điện thoại và chọn trong kết quả — giá & điểm thành viên tự áp dụng).",
          "Tùy chọn: nhập game đang chơi, và đánh dấu \"Khách trả trước (DP)\" nếu khách trả lúc bắt đầu.",
          "Bấm BẮT ĐẦU PHIÊN. Nếu máy được liên kết điều khiển TV, TV tự bật và chuyển sang PlayStation.",
        ],
      },
      {
        title: "Khi phiên đang chạy",
        steps: [
          "Mỗi máy hiện dưới dạng thẻ với đồng hồ đếm ngược và chi tiết tiền đang tính.",
          "Tạm dừng/Tiếp tục: tạm dừng đồng hồ (vd. mất điện, khách ra ngoài).",
          "Thêm thời gian: thêm +10 đến +120 phút.",
          "Chuyển máy: chuyển phiên sang máy trống khác — thời gian và hóa đơn chuyển theo.",
          "+ Phụ kiện: thuê thêm tay cầm/VR/tai nghe, tính theo giờ kể từ lúc thêm. Bấm \"Trả lại\" để ngừng tính tiền.",
          "+ F&B: thêm đồ ăn/uống vào hóa đơn phiên này — đơn đi thẳng tới Màn hình bếp.",
          "Bật TV / Tắt TV: bật/tắt TV của máy này (cần thiết bị đã liên kết trong Điều khiển thiết bị).",
        ],
      },
      {
        title: "Kết thúc phiên & thu tiền",
        steps: [
          "Bấm \"Kết thúc phiên & Thanh toán\". Hóa đơn cuối hiện ra: tiền thuê + phụ kiện + đồ ăn/uống.",
          "Tùy chọn: nhập Giảm giá, đánh dấu Thuế, hoặc nhập mã voucher/phần thưởng của khách.",
          "Nhập số tiền trả (mặc định: toàn bộ số còn lại), chọn phương thức thanh toán, bấm Thanh toán.",
          "Tiền mặt được thanh toán ngay. QRIS/chuyển khoản/ví điện tử: khách trả vào QRIS/tài khoản cửa hàng hiển thị trên màn hình, rồi bấm \"Đánh dấu đã nhận\" khi tiền về và nhập mã tham chiếu nếu có.",
          "Có thể trả một phần bằng một phương thức và phần còn lại bằng phương thức khác (chia thanh toán).",
          "Khách sẽ trả sau? Bấm \"Đóng (trả sau tại POS)\" — hóa đơn được lưu và có thể thanh toán từ Thu ngân (POS) hoặc Giao dịch.",
          "In hóa đơn từ thẻ phiên đã kết thúc.",
        ],
      },
      {
        title: "Quản lý máy PS",
        steps: [
          "Bấm \"Quản lý máy\" để thêm/sửa máy: tên, console, loại TV, giá mỗi giờ.",
          "Chuyển sang bảo trì: tạm rút máy khỏi cho thuê (không làm được khi đang dùng).",
          "Vô hiệu hóa: lưu trữ máy không dùng nữa — lịch sử vẫn được giữ.",
          "Máy có số giờ sử dụng vượt ngưỡng bảo dưỡng (đặt tại Cài đặt → Thông báo → Bảo trì máy dự đoán) sẽ có nhãn \"cần bảo dưỡng\".",
        ],
      },
    ],
    notes: [
      "Phiên có thời lượng định trước tự dừng khi hết giờ — nhưng thu ngân vẫn phải hoàn tất thanh toán.",
      "Chuông báo kêu một lần khi còn 5 phút.",
      "Mọi nhân viên đã đăng nhập đều bắt đầu và kết thúc phiên được.",
    ],
  },
  {
    id: "billing-board",
    group: "operasional",
    label: "Bảng tính giờ trực tiếp (Màn hình theo dõi)",
    summary:
      "Màn hình riêng để theo dõi trực tiếp mọi phiên đang chạy — lý tưởng trên TV/màn hình thứ hai ở khu thu ngân. Chỉ để xem, không có nút thao tác.",
    steps: [
      "Mở Bảng tính giờ trực tiếp trên màn hình phụ và để mở.",
      "Trang tự làm mới mỗi 3 giây.",
      "Mỗi thẻ hiển thị: tên máy & console, trạng thái đang chơi/tạm dừng, khách & game, thời gian đã chơi, số lần gia hạn và chi tiết tiền.",
      "Các ô tóm tắt phía trên: số phiên đang chạy, đang chơi vs tạm dừng, đơn đồ ăn đang làm và tổng tiền đang tính.",
    ],
    notes: ["Mọi thao tác (thanh toán, thêm giờ, v.v.) vẫn thực hiện trên trang Cho thuê PS."],
  },
  {
    id: "booking",
    group: "operasional",
    label: "Đặt chỗ (Giữ chỗ trước)",
    summary:
      "Quản lý đặt chỗ trước — ghi lượt đặt, nhận đặt chỗ trực tuyến từ khách, nhận phòng nhanh bằng mã, chuyển máy và đánh dấu khách không đến.",
    subsections: [
      {
        title: "Ghi lượt đặt mới",
        steps: [
          "Nhập tên và số điện thoại của khách.",
          "Chọn máy cụ thể, hoặc \"Máy bất kỳ\" + loại console.",
          "Nhập giờ bắt đầu và kết thúc, tiền cọc (DP) và ghi chú (tùy chọn), rồi bấm \"Tạo đặt chỗ\".",
          "Nếu trùng giờ, lượt đặt tự động vào Danh sách chờ và hiển thị vị trí xếp hàng.",
        ],
      },
      {
        title: "Khách tự đặt trực tuyến",
        steps: [
          "Bật \"nhận đặt chỗ trực tuyến\" và sao chép đường dẫn trang đặt chỗ của cửa hàng tại Cài đặt → Kinh doanh & Thuế → Đặt chỗ / Giữ chỗ.",
          "Chia sẻ đường dẫn trên WhatsApp, Instagram hoặc Google Maps. Khách thấy máy trống, chọn giờ và nhận mã đặt chỗ.",
          "Đặt khoảng cách giữa các lượt đặt, hạn nhận phòng (khách không đến sẽ tự được nhả chỗ) và thời gian tối thiểu trước giờ chơi được phép đặt.",
          "Banner khuyến mãi trên trang đặt chỗ đặt tại Cài đặt → Banner quảng cáo.",
        ],
      },
      {
        title: "Khi khách đến & các thao tác khác",
        steps: [
          "Gõ mã đặt chỗ (vd. BK-00001) vào ô tìm kiếm phía trên → bấm Enter/\"Tìm & Nhận phòng\".",
          "Xác nhận: duyệt lượt đặt đang chờ hoặc trong danh sách chờ.",
          "QR: hiển thị mã QR của lượt đặt cho khách.",
          "Chuyển máy: chuyển lượt đặt sang máy khác (lý do tùy chọn).",
          "Không đến: đánh dấu khách không đến. Hủy: hủy lượt đặt (bắt buộc ghi lý do).",
        ],
      },
    ],
    notes: [
      "Nhắc nhở tự động qua WhatsApp cho khách hiện chưa hoạt động — liên hệ khách thủ công bằng số trên lượt đặt nếu cần.",
      "Nhãn màu cho biết nguồn của lượt đặt: Thu ngân (nhân viên ghi), Trực tuyến (trang đặt chỗ) hoặc WhatsApp.",
    ],
    roles: "Ghi/xác nhận/nhận phòng/hủy: Owner, Superuser, Manager, Supervisor, Cashier. Hoàn tác Không đến: Owner/Superuser.",
  },
  {
    id: "pos",
    group: "operasional",
    label: "Thu ngân (POS) — Bán đồ ăn, thức uống & hàng hóa",
    summary:
      "Dùng để bán sản phẩm (đồ ăn, thức uống, hàng hóa) cho khách không thuê máy — hoặc thanh toán các hóa đơn đã lưu là \"trả sau\". Giờ chơi PS không bán ở đây, mà ở Cho thuê PS.",
    subsections: [
      {
        title: "Bán sản phẩm",
        steps: [
          "Bấm vào sản phẩm trong danh sách (nhóm theo danh mục), hoặc gõ tên/quét mã vạch trong ô tìm kiếm. Nếu chỉ một sản phẩm khớp, bấm Enter là vào giỏ ngay.",
          "Đặt số lượng bằng nút +/- trong giỏ.",
          "Tùy chọn: nhập Giảm giá, nhập mã voucher (bấm Kiểm tra), đánh dấu Thuế/Phí dịch vụ.",
          "Chọn phương thức thanh toán và bấm Thanh toán.",
          "Tiền mặt: nhận tiền, bấm \"Xác nhận đã nhận tiền mặt\". QRIS/chuyển khoản: hiển thị QRIS/tài khoản cửa hàng trên màn hình, chờ tiền về, rồi đánh dấu đã nhận.",
          "Bấm In hóa đơn.",
        ],
      },
      {
        title: "Hóa đơn chưa thanh toán (Open Orders)",
        steps: [
          "Hóa đơn chưa trả (vd. từ phiên thuê lưu là \"trả sau\") hiện trong Open Orders.",
          "Tách: chia một hóa đơn thành nhiều phần (vd. bạn bè trả riêng).",
          "Gộp: đánh dấu 2 hóa đơn trở lên và bấm \"Gộp N đơn\" để trả cùng lúc.",
        ],
      },
    ],
    notes: [
      "Giỏ hàng được lưu trong trình duyệt — chuyển menu hay làm mới trang cũng không mất.",
      "Sản phẩm thuộc danh mục \"Cho thuê thiết bị\" không hiện ở đây vì thuộc Cho thuê tại nhà.",
      "Giảm giá thủ công của thu ngân bị giới hạn theo cài đặt của chủ trong Cài đặt → Tùy chọn.",
    ],
  },
  {
    id: "kitchen",
    group: "operasional",
    label: "Màn hình bếp",
    summary:
      "Bảng đơn bếp không cần giấy: mọi đơn đồ ăn/uống từ Thu ngân và từ phiên thuê hiện ở đây, trong 4 cột theo giai đoạn.",
    steps: [
      "Đơn mới vào cột Mới kèm chuông báo.",
      "Thứ tự nút: Xác nhận → Bắt đầu nấu → Sẵn sàng phục vụ → Đã giao (rời khỏi bảng).",
      "Đơn ở cột Mới có thể hủy bằng Hủy kèm lý do (vd. \"Hết nguyên liệu\").",
      "Nút 🔊/🔇 bật/tắt âm thanh. \"Bật thông báo trình duyệt\" giúp đơn vẫn hiện khi màn hình đang ở ứng dụng khác.",
    ],
    notes: [
      "Bảng tự làm mới vài giây một lần.",
      "Đơn vừa chuyển sang \"Sẵn sàng\" phát âm khác để phục vụ biết mang ra.",
      "Xem thêm \"Tôi là Nhân viên bếp\" trong nhóm Hướng dẫn theo vai trò.",
    ],
  },
  {
    id: "shift",
    group: "operasional",
    label: "Ca làm & Thu ngân (Ngăn kéo tiền)",
    summary:
      "Mở ca với tiền đầu ca, ghi nộp tiền hoặc chuyển tiền mặt, rồi đóng ca bằng cách đếm tiền theo mệnh giá. Hệ thống so số bạn đếm với ghi chép giao dịch nên mọi chênh lệch tiền mặt hiện ra ngay.",
    subsections: [
      {
        title: "Mở ca",
        steps: [
          "Đếm trước tiền mặt đang có trong ngăn kéo, nhập làm Tiền đầu ca, rồi bấm Mở ca.",
          "Nếu khác với số tiền ca trước để lại, hệ thống sẽ hỏi lý do (vd. \"chủ lấy Rp100.000 đi chợ\") và gắn cờ để xem xét.",
          "Mặc định mỗi cửa hàng chỉ mở được một ca, để mọi chênh lệch rõ ràng thuộc về ai. Cửa hàng có nhiều ngăn kéo có thể cho phép nhiều ca tại Cài đặt → Tùy chọn.",
        ],
      },
      {
        title: "Trong ca",
        steps: [
          "Mọi khoản thanh toán tiền mặt (thuê máy, thu ngân, PPOB, thành viên, thu nhập khác) tự động tính vào tiền của ca đang mở.",
          "Ghi Nộp tiền mặt: khi tiền trong ngăn kéo được giao cho chủ, cất vào két hoặc nộp ngân hàng.",
          "Yêu cầu Chuyển tiền mặt: khi tiền di chuyển giữa các nơi giữ tiền (vd. thêm tiền lẻ từ Quỹ chính vào ngăn kéo). Lịch sử nộp và chuyển được lưu trên trang này.",
        ],
      },
      {
        title: "Đóng ca",
        steps: [
          "Nhập số tờ/đồng xu của từng mệnh giá — tổng được tính tự động. Đừng nhìn số của hệ thống trước (đếm \"mù\").",
          "Điền Kiểm tra số dư không dùng tiền mặt: mở từng ứng dụng ví điện tử hoặc số dư ký quỹ đã dùng và nhập số dư hiển thị lúc đó.",
          "Nhập số tiền để lại trong ngăn kéo cho ca sau; phần còn lại được coi là đã giao cho chủ/két.",
          "Thêm ghi chú nếu biết có chênh lệch, rồi bấm Đóng ca.",
          "Tóm tắt đóng ca hiển thị: Tiền đầu ca, Tiền vào, Tiền ra, Tiền dự kiến (số lẽ ra phải có), số bạn đếm và Chênh lệch. Đỏ = thiếu, vàng = thừa.",
        ],
      },
      {
        title: "Đóng ca của thu ngân khác",
        steps: [
          "Nếu thu ngân đã về mà chưa đóng ca, quản lý ca có thể đóng thay: đếm thực tế ngăn kéo và ghi lý do (bắt buộc).",
          "Lần đóng này được ghi dưới tên người đóng và gắn cờ để xem xét.",
        ],
      },
      {
        title: "Kênh số dư ký quỹ (không dùng tiền mặt)",
        steps: [
          "Các số dư phải kiểm tra mỗi lần đóng ca (vd. Số dư ký quỹ PPOB). Kênh có sẵn có thể đổi tên nhưng không xóa được.",
          "Thêm kênh mới bằng cách gõ tên và bấm \"Thêm kênh\" — tài khoản kế toán của kênh được tạo tự động.",
        ],
        notes: ["Phần này chỉ Owner, Superuser và Accountant nhìn thấy."],
      },
    ],
    notes: [
      "Ca có chênh lệch hoặc số void/hoàn tiền vượt ngưỡng (Cài đặt → Tùy chọn) được tự động gắn cờ để Owner/Manager xem xét. Thu ngân vẫn đóng ca bình thường.",
      "Tiền đầu ca gợi ý lấy từ các tài khoản tiền mặt được đánh dấu tại Cài đặt → Tùy chọn → Cấu thành tiền đầu ca. Đó chỉ là gợi ý — luôn nhập tiền thực tế.",
    ],
  },
  {
    id: "devices",
    group: "operasional",
    label: "Điều khiển thiết bị (TV & Ổ cắm thông minh)",
    summary:
      "Bật/tắt TV và console từ dashboard, và để TV tự bật/tắt theo phiên. Android TV được điều khiển qua ứng dụng NexbillAgent trên PC thu ngân; TV thường (analog hoặc smart TV không phải Android) qua ổ cắm thông minh.",
    subsections: [
      {
        title: "Chọn cách điều khiển phù hợp",
        steps: [
          "Android TV / Google TV → dùng NexbillAgent (không cần phần cứng thêm). TV tự bật, tắt và chuyển sang cổng HDMI của PlayStation.",
          "TV analog/CRT, TV kỹ thuật số thường và smart TV không phải Android (Viva OS, Hisense OS, webOS, v.v.) → cần ổ cắm thông minh để ngắt/cấp điện.",
          "Nếu cửa hàng có máy dùng TV không phải Android chưa liên kết ổ cắm thông minh, trang này hiện cảnh báo và nút \"Xem ổ cắm thông minh đề xuất\" dẫn tới sản phẩm phù hợp.",
        ],
      },
      {
        title: "Android TV qua NexbillAgent (5 bước, một lần mỗi cửa hàng)",
        steps: [
          "Bước 1 — Xin token: bấm \"Yêu cầu token Relay Agent\". Đội ngũ NEXBILL trả lời token bí mật qua menu Chăm sóc khách hàng.",
          "Bước 2 — Tải NexbillAgent và giải nén trên PC thu ngân (Windows). Đọc \"Hướng dẫn đầy đủ NexbillAgent\" — có 6 ngôn ngữ, gồm thiết lập PC & TV, cách khóa IP của TV và 28 sự cố thường gặp kèm cách xử lý.",
          "Bước 3 — Chạy NexbillAgent và dán token.",
          "Bước 4 — Chuẩn bị từng TV (một lần mỗi TV): kết nối cùng WiFi, bật các tùy chọn hướng dẫn yêu cầu, khóa IP.",
          "Bước 5 — Thêm TV trên trang này (nhập IP của TV) và liên kết với máy cho thuê của nó.",
        ],
      },
      {
        title: "Ổ cắm thông minh",
        steps: [
          "Ổ cắm thông minh chính hãng NEXBILL: nhập số sê-ri in trên nhãn ở mục \"Nhận ổ cắm thông minh NEXBILL\" — không cần thiết lập gì thêm.",
          "Tasmota: nhập tên thiết bị và chủ đề MQTT.",
          "Tuya / Smart Life: mỗi cửa hàng dùng tài khoản Tuya Cloud API riêng — được dùng nhiều hơn một tài khoản. Thêm tài khoản (Access ID & Secret) tại Cài đặt → Kinh doanh & Thuế → Tích hợp Tuya Cloud API, rồi thêm thiết bị bằng Device ID. Nếu có nhiều tài khoản, để lựa chọn tài khoản là \"Tự động\": hệ thống tự tìm tài khoản sở hữu Device ID đó.",
          "Sau khi thêm, liên kết thiết bị với máy trong bảng \"Liên kết thiết bị với máy cho thuê\".",
        ],
        notes: [
          "Tài khoản Tuya Cloud miễn phí (Trial) chỉ điều khiển được khoảng 8 thiết bị và phải gia hạn khoảng mỗi tháng một lần tại iot.tuya.com (Service API → IoT Core → Extend Trial). Có nhiều ổ cắm hơn thế? Tạo tài khoản Tuya Cloud thứ hai (email khác), liên kết một phần ổ cắm vào tài khoản đó, rồi thêm làm tài khoản mới trong Cài đặt. Nếu quên gia hạn một tài khoản, mọi ổ cắm trong tài khoản đó sẽ ngừng phản hồi — hãy ghi ngày gia hạn của từng tài khoản vào lịch.",
          "Trong thời gian dùng thử gói đăng ký, chưa thể thêm ổ cắm thông minh và điều khiển Android TV giới hạn 1 máy.",
        ],
      },
      {
        title: "Sử dụng hằng ngày",
        steps: [
          "Mọi nhân viên đều bấm được Bật/Tắt trên thẻ thiết bị, hoặc Bật TV/Tắt TV trên thẻ phiên trong Cho thuê PS.",
          "Trạng thái trực tuyến/ngoại tuyến của từng thiết bị hiển thị trên trang này. Thiết bị ngoại tuyến vẫn bật thủ công bằng điều khiển từ xa được.",
          "Với NexbillAgent mới nhất, TV tự chuyển sang PlayStation khi phiên bắt đầu và sang TV Screensaver khi phiên kết thúc (xem chủ đề TV Screensaver).",
        ],
      },
    ],
    roles: "Bật/tắt: mọi nhân viên. Thêm/sửa/xóa/liên kết thiết bị: Owner, Superuser, Manager, Supervisor.",
  },
  {
    id: "qr-pelanggan",
    group: "operasional",
    label: "QR khách hàng theo phòng & Cảnh báo giờ trên TV",
    navHint: "Cho thuê PS → Quản lý máy → QR khách hàng",
    summary:
      "Mỗi phòng có một nhãn QR. Khách chỉ cần quét bằng điện thoại để xem thời gian còn lại và hóa đơn tạm tính, gọi đồ ăn/uống, xin thêm giờ hoặc gọi thu ngân — không cần ra quầy. Mọi yêu cầu vào khung Yêu cầu của khách trên trang Cho thuê PS và chỉ có hiệu lực khi thu ngân chấp nhận. Android TV cũng có thể hiển thị cảnh báo thời gian còn lại và màn hình Hết giờ.",
    subsections: [
      {
        title: "Dán QR trong phòng",
        steps: [
          "Mở Cho thuê PS → Quản lý máy → bấm \"QR khách hàng\" trên máy. QR được tạo tự động.",
          "Bấm \"In nhãn dán cho mọi máy\" để in QR của tất cả máy một lần, cắt rồi dán cạnh TV của từng phòng.",
          "Đặt quyền trong cùng cửa sổ: cho phép gọi món từ điện thoại, cho phép xin thêm giờ từ điện thoại. Gọi thu ngân luôn bật.",
          "Nếu QR bị chụp lại và lạm dụng, bấm \"Thay QR\" — nhãn cũ hết hiệu lực ngay; hãy in nhãn mới.",
        ],
      },
      {
        title: "Khách có thể làm gì trên điện thoại",
        steps: [
          "Xem thời gian chơi còn lại (chạy từng giây) và hóa đơn tạm tính. Khi còn ≤5 phút sẽ có cảnh báo.",
          "Gọi đồ ăn/uống: chọn món, đặt số lượng, gửi. Giá lấy từ dữ liệu sản phẩm, không từ điện thoại.",
          "Xin thêm giờ: +30/+60/+90/+120 phút, kèm chi phí ước tính.",
          "Gọi thu ngân: xin hóa đơn, tay cầm bị lỗi, cần hỗ trợ hoặc khác (có thể thêm ghi chú). Trạng thái từng yêu cầu hiển thị trên điện thoại: đang chờ, đã nhận hoặc bị từ chối kèm lý do.",
        ],
      },
      {
        title: "Phản hồi yêu cầu (thu ngân)",
        steps: [
          "Yêu cầu mới xuất hiện ở khung \"Yêu cầu của khách (QR phòng)\" phía trên trang Cho thuê PS, kèm âm báo.",
          "Đơn đồ ăn: bấm \"Nhận & thêm vào hóa đơn\" — món vào hóa đơn của phiên và hiện ngay trên Màn hình bếp.",
          "Thêm giờ: bấm \"Nhận & thêm giờ\" — thời lượng phiên tăng lên. Gọi thu ngân: đến phòng rồi bấm \"Đã xử lý\".",
          "Bấm \"Từ chối\" khi không thể phục vụ (vd. hết món); lý do bạn nhập sẽ hiện trên điện thoại khách.",
        ],
      },
      {
        title: "Cảnh báo thời gian còn lại & màn hình Hết giờ trên TV",
        navHint: "Cài đặt → TV Screensaver → Cảnh báo giờ & Màn hình Hết giờ",
        steps: [
          "Chỉ dành cho Android TV đã bật và xác minh tự động hóa (NexbillAgent v1.2).",
          "Cảnh báo thời gian còn lại (mặc định tắt): vài phút trước khi hết, TV chuyển nhanh sang màn hình lớn \"THỜI GIAN CÒN LẠI\" kèm QR phòng, rồi tự quay lại HDMI của PlayStation. Đặt số phút và thời gian hiển thị.",
          "Màn hình \"HẾT GIỜ\": sau khi phiên tự dừng và hóa đơn chưa thanh toán, TV mời khách thanh toán tại quầy (không hiện số tiền), cho đến khi thanh toán hoặc trong 15 phút.",
          "Cảnh báo được gửi một lần mỗi phiên và áp dụng lại sau khi thêm giờ.",
        ],
      },
    ],
    notes: [
      "Yêu cầu từ điện thoại không bao giờ tự thay đổi hóa đơn — thu ngân quyết định. Đơn của phiên đã kết thúc không thể nhận; hãy phục vụ qua Thu ngân.",
      "Trang trên điện thoại không hiện tên hay số của khách, và dùng ngôn ngữ theo Quốc gia của cửa hàng.",
      "Cảnh báo trên TV và việc tự dừng phiên phụ thuộc vào bộ lập lịch NEXBILL chạy trên máy chủ.",
    ],
    roles: "Mọi nhân viên đã đăng nhập đều phản hồi yêu cầu và hiển thị/in QR được. Thay đổi quyền QR và cài đặt cảnh báo TV: Owner, Superuser, Manager.",
  },
  {
    id: "tv-screensaver",
    group: "operasional",
    label: "TV Screensaver (Màn hình quảng cáo trong phòng)",
    navHint: "Cài đặt → TV Screensaver (bật mô-đun trước tại Cài đặt → Feature Management).",
    summary:
      "Khi máy không được dùng, Android TV trong phòng hiển thị tên cửa hàng, giá, mã QR đặt chỗ, đồng hồ và trạng thái máy (TRỐNG / thời gian còn lại) — và nhân viên mở khóa bằng mã PIN. Chỉ dành cho Android TV; không hỗ trợ TV analog và smart TV không phải Android.",
    subsections: [
      {
        title: "Thiết lập hiển thị",
        steps: [
          "Nhập Tiêu đề lớn (vd. \"Muốn chơi không?\"), dòng console (vd. \"PS5 • PS4 • PS3\"), dòng giá (vd. \"Chỉ từ Rp5.000/giờ\") và dòng thêm (khuyến mãi, giờ mở cửa).",
          "Đặt số phút không hoạt động trước khi màn hình xuất hiện.",
          "Chọn nội dung hiển thị: đồng hồ & ngày, trạng thái máy, mã QR đặt chỗ và tên WiFi (không bao giờ hiển thị mật khẩu WiFi).",
          "Đặt mã PIN nhân viên để chỉ nhân viên mới đóng được màn hình. Không có PIN thì ai bấm điều khiển cũng đóng được.",
          "Chế độ ban đêm: giảm sáng màn hình vào một số giờ (tối đa 90% — màn hình không bao giờ tối đen để không ai nghĩ TV đã tắt).",
        ],
      },
      {
        title: "Cài màn hình lên TV",
        steps: [
          "Trong \"Màn hình đã cài\", thêm màn hình: đặt tên và chọn máy cho thuê (Android TV) — mã 6 chữ số sẽ xuất hiện.",
          "Trên TV, mở trình duyệt và vào nexbill.id/tv.",
          "Nhập mã 6 chữ số bằng phím số trên điều khiển. Màn hình kết nối ngay với máy đó.",
          "Lặp lại cho từng TV. Màn hình không gắn máy có thể dùng chỉ để quảng bá thương hiệu (vd. TV ở khu chờ).",
        ],
      },
    ],
    notes: [
      "Nội dung di chuyển chậm để tấm nền TV không bị lưu ảnh vĩnh viễn (burn-in).",
      "Nếu mạng mất trong chốc lát, màn hình vẫn hiển thị hình cuối cùng và tiếp tục thử kết nối lại.",
      "Tiền điện: TV để bật tốn thêm khoảng Rp25.000–50.000 mỗi TV mỗi tháng. Dùng Chế độ ban đêm hoặc tắt TV ngoài giờ mở cửa.",
    ],
  },
  {
    id: "home-rental",
    group: "operasional",
    label: "Cho thuê tại nhà (Thuê mang về)",
    navHint: "Xuất hiện ở thanh bên khi mô-đun được bật tại Cài đặt → Feature Management (chỉ Superuser).",
    summary:
      "Mô-đun riêng để cho thuê PS, Playbox, TV và phụ kiện mà khách MANG VỀ — từ đặt chỗ, bàn giao kèm tiền cọc, đến trả lại kèm kiểm tra tình trạng và đánh giá khách.",
    subsections: [
      {
        title: "Thiết lập (một lần lúc đầu)",
        steps: [
          "Tab Chính sách: đặt tiền cọc, phí trả trễ, phí giao hàng theo khoảng cách, quy định hư hỏng, danh sách kiểm tra khi trả và các điều khoản in trên hóa đơn/hợp đồng thuê.",
          "Tab Danh mục sản phẩm: đặt giá mỗi 12 giờ, mỗi ngày, mỗi ngày thêm và mỗi tuần cho từng sản phẩm.",
          "Tab Tài sản: đăng ký từng món hàng thực tế với mã riêng (vd. PS5-001). Trạng thái tài sản: Sẵn sàng, Đã giữ, Đang chuẩn bị, Đang cho thuê, Đang giao, Đang trả về, Đang kiểm tra, Hư hỏng, Thất lạc, Đang sửa, Ngừng dùng.",
          "Tab Gói: gộp nhiều sản phẩm thành một gói (vd. PS4 + TV 32\").",
        ],
      },
      {
        title: "Tạo đặt chỗ & bàn giao (checkout)",
        steps: [
          "Tab Đặt chỗ → tạo đặt chỗ: chọn khách, sản phẩm/gói, ngày bắt đầu và ngày dự kiến trả. Nhập khoảng cách từ cửa hàng nếu giao tận nơi (để trống cho phí giao cố định).",
          "Để xác minh, ghi lại giấy tờ tùy thân của khách (CCCD, hoặc thẻ học sinh kèm thông tin phụ huynh/người giám hộ với người chưa thành niên).",
          "Giá tính tự động: ≤12 giờ, theo ngày, 2–3 ngày (theo ngày + ngày thêm), từ 7 ngày trở lên dùng giá tuần.",
          "Khi khách đến/hàng được giao, thực hiện Checkout: phân bổ tài sản, ghi nhận thanh toán và tiền cọc. Đảm bảo đã kiểm tra danh sách phụ kiện (cáp HDMI, sạc, tay cầm).",
          "Tab Bản đồ ngày: bấm vào một ngày để xem mọi lượt đặt trong ngày đó.",
        ],
      },
      {
        title: "Trả lại",
        steps: [
          "Đánh dấu từng mục trong danh sách kiểm tra khi trả (bắt buộc).",
          "Chấm 1–5 sao và ghi chú về tình trạng hàng/thái độ của khách.",
          "Có hư hỏng? Nhập chi phí hư hỏng — trừ vào tiền cọc trước. Nếu vượt tiền cọc, phần còn lại được thu bằng phương thức thanh toán đã chọn.",
          "Trả trễ? Phí trễ được tính tự động theo Chính sách.",
          "Sau khi trả, tài sản trở lại Sẵn sàng và trạng thái tiền cọc được ghi nhận: hoàn đủ, trừ một phần hoặc bị giữ.",
        ],
      },
      {
        title: "Rủi ro & Phê duyệt",
        steps: [
          "Xem lịch sử thuê và điểm rủi ro của từng khách (dựa trên độ đầy đủ giấy tờ, địa chỉ đã xác nhận & số WhatsApp còn hoạt động, trả trễ, không đến, hàng hư/mất).",
          "Lượt đặt rủi ro cao phải được duyệt trước — bấm Duyệt hoặc Từ chối.",
          "Khách có vấn đề có thể bị đưa vào danh sách đen.",
        ],
      },
    ],
    notes: [
      "Mọi doanh thu Cho thuê tại nhà (tiền thuê, giao hàng, phí trễ, phí hư hỏng) được ghi sổ tự động và hiển thị trong Báo cáo → Cho thuê tại nhà.",
      "Tiền cọc được ghi riêng khỏi doanh thu cho đến khi hàng được trả.",
      "Nhắc nhở tự động cho khách (lịch nhận hàng, ngày đến hạn) chưa hoạt động — hãy nhắc khách thủ công.",
    ],
  },
];
