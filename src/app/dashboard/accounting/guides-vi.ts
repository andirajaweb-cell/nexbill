import type { AccountingGuideSet } from "./guides";

/** Bản tiếng Việt của guides.ts. */
export const GUIDES_VI: AccountingGuideSet = {
  tabs: {
    "Chart of Accounts": {
      summary: "Danh sách mọi \"ngăn kéo\" ghi chép tài chính của cửa hàng (tài khoản). Mọi đồng tiền vào hoặc ra luôn được ghi vào một trong các tài khoản ở đây.",
      concept: [
        "Hệ thống tài khoản (CoA) là danh sách tài khoản được chia thành 5 loại: 1 Tài sản (những gì sở hữu), 2 Nợ phải trả (nợ/nghĩa vụ), 3 Vốn chủ sở hữu, 4 Doanh thu, 5–8 Chi phí (giá vốn và chi phí hoạt động).",
        "Tài khoản cha (tiêu đề, in đậm) chỉ cộng tổng các tài khoản bên dưới và không nhận bút toán. Giao dịch luôn ghi vào tài khoản con (tài khoản hạch toán).",
        "Số dư thông thường: Tài sản và Chi phí tăng ở bên Nợ; Nợ phải trả, Vốn chủ sở hữu và Doanh thu tăng ở bên Có.",
      ],
      uses: [
        "Quyết định các khoản mục xuất hiện trên Bảng cân đối và Báo cáo lãi lỗ.",
        "Thêm tài khoản riêng cho việc kinh doanh của bạn, ví dụ tài khoản ngân hàng thứ hai, tài khoản ví điện tử mới, hoặc một loại chi phí cụ thể.",
      ],
      watch: [
        "Đừng xóa hoặc đổi loại của tài khoản đã có giao dịch — báo cáo các kỳ trước cũng thay đổi theo. Nếu không dùng nữa, hãy ngừng kích hoạt.",
        "Mã tài khoản theo loại: tài khoản ngân hàng phải bắt đầu bằng 112x, ví điện tử 113x, chi phí 6xxx. Mã sai loại khiến tài khoản xuất hiện ở sai phần của báo cáo.",
        "Mỗi cửa hàng có CoA riêng. Tài khoản của cửa hàng này không dùng được cho cửa hàng khác.",
      ],
      steps: [
        "Khi bắt đầu dùng NEXBILL: xem lại danh sách tài khoản mặc định, thêm các tài khoản ngân hàng/ví điện tử bạn thực sự dùng.",
        "Chỉ thêm tài khoản mới khi không có tài khoản mặc định phù hợp — chọn đúng tài khoản cha để vào đúng nhóm báo cáo.",
        "Sau khi thêm tài khoản tiền/ngân hàng/ví điện tử, liên kết nó trong tab Account Mapping (module Payment) để giao dịch tự động đổ vào đó.",
      ],
    },

    "Account Mapping": {
      summary: "Các quy tắc tự động \"giao dịch loại X được ghi vào tài khoản Y\". Thu ngân không bao giờ chọn tài khoản — hệ thống làm theo bảng này.",
      concept: [
        "Mỗi module (Thuê máy, F&B, Sản phẩm, PPOB, Chi phí, Tài sản, Thanh toán, v.v.) tìm tài khoản đích trong bảng này theo module + loại giao dịch.",
        "Ví dụ: module Payment khóa \"qris\" → tài khoản 1131 QRIS (mặc định), nên mọi khoản thanh toán QRIS làm tăng số dư tài khoản QRIS, không phải Tiền mặt.",
        "Nếu thiếu một dòng, hệ thống dùng tài khoản mặc định. Vì vậy bảng này để ĐIỀU CHỈNH, không bắt buộc phải điền từ đầu.",
      ],
      uses: [
        "Tách doanh thu theo loại máy/sản phẩm để Báo cáo lãi lỗ chi tiết hơn.",
        "Quyết định tiền từ mỗi phương thức thanh toán vào tài khoản nào — cơ sở đối chiếu số dư từng kênh khi đóng ca.",
        "Chuyển giá vốn, khấu hao, hàng tồn kho và công nợ mua tài sản vào các tài khoản bạn muốn.",
      ],
      watch: [
        "Loại tài khoản phải đúng chức năng: doanh thu → tài khoản doanh thu, thanh toán → tài khoản tiền/ngân hàng, giá vốn/chi phí → tài khoản chi phí. Tab Audit kiểm tra việc này tự động.",
        "Cột khóa (transaction key) là từ hệ thống tìm kiếm — đừng thay đổi. Đổi khóa khiến dòng đó ngừng được dùng mà không báo lỗi.",
        "Thay đổi mapping chỉ áp dụng cho giao dịch MỚI. Giao dịch cũ vẫn ở tài khoản cũ; chuyển bằng bút toán thủ công nếu cần.",
        "Phương thức thanh toán tùy chỉnh chưa được mapping sẽ vào tài khoản Ngân hàng chung (1121) — tab Audit sẽ cảnh báo.",
      ],
      steps: [
        "Sau khi thêm phương thức thanh toán mới (vd. ví điện tử khác), thêm dòng module Payment cho phương thức đó trỏ đến tài khoản ví điện tử phù hợp.",
        "Đổi tài khoản đích bằng nút sửa, rồi kiểm tra vài giao dịch tiếp theo ở tab Nhật ký để chắc tài khoản đã đúng.",
        "Chạy tab Audit → \"Account Mapping\" sau khi thay đổi bất cứ điều gì ở đây.",
      ],
    },

    Jurnal: {
      summary: "Sổ nhật ký mọi giao dịch dưới dạng Nợ–Có. Hầu hết bút toán do hệ thống tạo tự động.",
      concept: [
        "Mỗi giao dịch được ghi theo bút toán kép: tổng Nợ luôn bằng tổng Có. Ví dụ thuê PS trả tiền mặt Rp50.000: Nợ Tiền mặt thu ngân Rp50.000, Có Doanh thu cho thuê Rp50.000.",
        "Cột Nguồn cho biết bút toán đến từ đâu (Thuê máy, POS, Chi phí, Mua tài sản, Khấu hao, Thủ công, v.v.).",
        "Giao dịch bị hủy KHÔNG bị xóa: hệ thống tạo bút toán đảo (đổi Nợ/Có) để số dư về 0 và dấu vết kiểm toán vẫn còn.",
      ],
      uses: [
        "Truy nguồn gốc của một con số trong báo cáo.",
        "Ghi các giao dịch không có menu riêng bằng Bút toán thủ công: chủ góp vốn, rút vốn cá nhân, sửa ghi sai, lãi/phí ngân hàng, trả nợ cũ.",
      ],
      watch: [
        "Đừng ghi lại bằng bút toán thủ công các giao dịch đã được module ghi (bán hàng, chi phí, mua hàng nhà cung cấp, mua tài sản) — sẽ bị trùng.",
        "Bút toán thủ công phải cân đối và dùng tài khoản con, không dùng tài khoản cha.",
        "Kỳ đã khóa không nhận bút toán có ngày nằm trong kỳ đó — ghi bút toán sửa bằng ngày hôm nay.",
        "Dùng tài khoản Tiền mặt trong bút toán thủ công sẽ làm thay đổi số dư tiền; hãy chắc tiền thực sự đã di chuyển.",
      ],
      steps: [
        "Để kiểm tra: lọc kỳ, tìm theo tham chiếu/mô tả, mở chi tiết dòng để xem tài khoản Nợ–Có.",
        "Để sửa: tạo bút toán thủ công đảo phần sai rồi ghi phần đúng, với mô tả rõ ràng (\"Sửa sai tài khoản chi phí ngày …\").",
        "Góp vốn: Nợ Tiền/Ngân hàng, Có 3110 Vốn chủ sở hữu. Rút vốn: Nợ 3130 Rút vốn, Có Tiền/Ngân hàng.",
      ],
    },

    "Neraca Saldo": {
      summary: "Số dư của mọi tài khoản trong một kỳ. Công cụ kiểm soát chính: tổng Nợ phải bằng tổng Có.",
      concept: [
        "Bảng cân đối thử (Trial Balance) tóm tắt nhật ký theo tài khoản: tăng bao nhiêu (Nợ), giảm bao nhiêu (Có) và còn lại bao nhiêu (số dư).",
        "Nếu tổng Nợ = tổng Có, sổ sách cân đối. Cân đối chưa chắc đã đúng (có thể chọn sai tài khoản), nhưng không cân đối thì chắc chắn có vấn đề.",
        "Cặp giao dịch hủy + bút toán đảo cùng nằm trong kỳ được ẩn đi vì chúng triệt tiêu nhau.",
      ],
      uses: [
        "Điểm khởi đầu kiểm tra sức khỏe sổ sách trước khi xem Báo cáo lãi lỗ và Bảng cân đối.",
        "Đối chiếu số dư tài khoản với thực tế: Tiền mặt thu ngân với tiền trong ngăn kéo, Ngân hàng với sao kê, QRIS với bảng điều khiển nhà cung cấp QRIS.",
      ],
      watch: [
        "Số dư bất thường (được đánh dấu): Tài sản âm hoặc Nợ phải trả có số dư Nợ. Thường là có giao dịch thực tế chưa được ghi (nộp tiền, nạp tiền, thanh toán).",
        "Số lớn ở cột Nợ/Có là biến động, không phải số còn lại. Xem cột số dư để biết giá trị cuối.",
        "Có số dư Phải thu dù mọi khách đã trả đủ → kiểm tra tab Phải thu và Audit.",
      ],
      steps: [
        "Hằng ngày/tuần: đối chiếu số dư Tiền mặt thu ngân, Ngân hàng và ví điện tử với tiền/số dư thực tế.",
        "Nhấp vào bất kỳ tài khoản nào để xem các bút toán bên trong (sổ cái). Chỉ bật \"hiện giao dịch đã hủy\" khi cần kiểm toán.",
        "Chênh lệch không giải thích được → chạy tab Audit.",
      ],
    },

    "Piutang (AR)": {
      summary: "Các khoản khách hàng chưa trả đủ — số tiền cửa hàng vẫn có quyền thu.",
      concept: [
        "Khoản phải thu tự động xuất hiện khi đơn/lượt thuê được đóng nhưng thanh toán thiếu. Phần còn lại được ghi vào tài khoản 1141 Phải thu khách hàng (mặc định).",
        "Khi khách trả, khoản phải thu giảm và Tiền/Ngân hàng/ví điện tử tăng — doanh thu không tăng thêm, vì đã được ghi nhận lúc lập đơn.",
        "Tuổi nợ (aging) được nhóm: chưa đến hạn, 1–30, 31–60 và trên 60 ngày.",
      ],
      uses: [
        "Đòi tiền khách chưa trả đủ và theo dõi khoản nợ đã treo bao lâu.",
        "Nhận thanh toán ngay từ tab này với phương thức khách đã dùng.",
      ],
      watch: [
        "Khoản phải thu trên 60 ngày có nguy cơ không thu được. Thận trọng: cân nhắc xóa nợ (bút toán thủ công vào chi phí nợ khó đòi) khi rõ ràng sẽ không được trả.",
        "Đừng nhận thanh toán ở menu khác rồi lại nhận ở đây — chọn một nơi để không bị ghi hai lần.",
        "Khoản phải thu có \"giao dịch gốc không còn\" không thể trả bằng nút; xử lý bằng bút toán thủ công.",
      ],
      steps: [
        "Xem tab này mỗi ngày trước khi đóng ca.",
        "Nhấn Nhận thanh toán → nhập số tiền (có thể một phần) → chọn phương thức → lưu. Tiền vào tài khoản theo Account Mapping của phương thức đó.",
        "Hằng tháng: xem tuổi nợ; đòi các khoản trên 30 ngày, quyết định xóa nợ với khoản không thu được.",
      ],
    },

    "Hutang (AP)": {
      summary: "Mọi nghĩa vụ chưa trả của cửa hàng: cho nhà cung cấp, mua tài sản và chi phí được ghi thành công nợ.",
      concept: [
        "Khoản phải trả phát sinh khi bạn nhận hàng/dịch vụ nhưng trả sau: mua hàng nhà cung cấp trả chậm (2111 Phải trả nhà cung cấp), Mua tài sản có đặt cọc/trả chậm (Phải trả mua tài sản, mặc định 2163) và Chi phí ghi thành công nợ.",
        "Trả nợ không làm tăng chi phí lần nữa — chi phí/tài sản đã được ghi khi giao dịch gốc. Khoản trả chỉ làm giảm công nợ và Tiền/Ngân hàng.",
      ],
      uses: [
        "Xem mọi hóa đơn phải trả ở một nơi cùng tuổi nợ.",
        "Trả (toàn bộ hoặc trả góp) ngay từ đây.",
      ],
      watch: [
        "Công nợ quá hạn ảnh hưởng quan hệ với nhà cung cấp — theo dõi cột tuổi nợ.",
        "Trả qua tab này hoặc menu gốc, đừng thêm bút toán thủ công — sẽ bị trùng.",
        "Chọn đúng tài khoản tiền/ngân hàng thực sự chi tiền. Nếu lấy từ ngăn kéo thu ngân, khoản trả cũng làm giảm tiền dự kiến của ca.",
      ],
      steps: [
        "Hằng tuần: sắp xếp từ cũ nhất, lên lịch thanh toán.",
        "Nhấn Trả → nhập số tiền (nhà cung cấp và tài sản có thể trả góp) → chọn phương thức và tài khoản tiền/ngân hàng → lưu.",
        "Cuối tháng: số dư tài khoản công nợ trong Bảng cân đối thử phải bằng tổng trong tab này.",
      ],
    },

    "Laba Rugi": {
      summary: "Doanh nghiệp lãi hay lỗ trong một kỳ: Doanh thu trừ giá vốn và Chi phí.",
      concept: [
        "Báo cáo lãi lỗ được lập theo cơ sở dồn tích (SAK EMKM): doanh thu được ghi nhận khi giao dịch xảy ra (ngày kinh doanh của đơn), không phải khi nhận tiền; chi phí được ghi nhận khi phát sinh.",
        "Lợi nhuận gộp = Doanh thu − Giá vốn (giá vốn hàng đã bán). Lợi nhuận thuần = Lợi nhuận gộp − Chi phí hoạt động (lương, điện, thuê, khấu hao, v.v.) ± thu nhập/chi phí khác.",
        "Khấu hao tài sản là chi phí dù không có tiền ra — phản ánh giá trị PS/TV giảm do sử dụng.",
      ],
      uses: [
        "Đánh giá kết quả hằng tháng và so sánh giữa các kỳ.",
        "Xem các nguồn doanh thu lớn nhất (thuê máy, F&B, sản phẩm, PPOB) và các khoản chi phí lớn nhất.",
        "Cơ sở tính thuế TNDN cuối cùng cho DNNVV Indonesia (0,5% doanh thu gộp).",
      ],
      watch: [
        "Lãi lớn mà ít tiền là bình thường khi có khoản phải thu, tồn kho tăng hoặc mua tài sản — xem Lưu chuyển tiền tệ.",
        "Cảnh báo \"chưa tính giá vốn\" nghĩa là có sản phẩm chưa có Giá vốn; lợi nhuận trông lớn hơn thực tế.",
        "Không chạy khấu hao hằng tháng thì lợi nhuận trông quá cao.",
        "Chi phí chưa ghi (hóa đơn điện/internet tháng này) làm lợi nhuận trông lớn hơn — ghi thành chi phí công nợ nếu chưa trả.",
      ],
      steps: [
        "Chọn kỳ (thường là tháng trước sau khi khóa sổ) và so sánh với kỳ trước đó.",
        "Nhấp vào bất kỳ dòng nào để xem các giao dịch bên trong.",
        "Trước khi đọc lợi nhuận cuối tháng: đảm bảo mọi chi phí đã được ghi, khấu hao đã chạy và đã kiểm kê kho.",
      ],
    },

    Rekonsiliasi: {
      summary: "Đối chiếu giao dịch bán hàng (trang Giao dịch) với bút toán doanh thu của chúng, theo từng đơn.",
      concept: [
        "Mỗi đơn đã thanh toán phải có đúng một bút toán bán hàng với cùng số tiền và ngày kinh doanh.",
        "Trạng thái: Khớp, Chờ thanh toán, Lệch ngày, Lệch số tiền, Thiếu bút toán, Đơn đã hủy nhưng bút toán vẫn còn, và Bút toán không có đơn.",
      ],
      uses: [
        "Đảm bảo doanh thu trong báo cáo bán hàng bằng doanh thu trong Báo cáo lãi lỗ.",
        "Sửa bút toán bị sót/lệch bằng nút Đồng bộ lại mà không cần nhập tay.",
      ],
      watch: [
        "Lệch số tiền hoặc thiếu bút toán nghĩa là Báo cáo lãi lỗ không chính xác cho ngày đó.",
        "Đơn kéo qua nửa đêm được ghi theo ngày kinh doanh (ngày mở), không theo giờ thanh toán — điều này là cố ý.",
        "Đồng bộ lại sẽ hủy bút toán cũ rồi ghi lại; không thể làm với kỳ đã khóa.",
      ],
      steps: [
        "Hằng ngày (sau khi đóng ca): chọn \"hôm nay\", đảm bảo mọi dòng Khớp hoặc Chờ thanh toán.",
        "Dòng có vấn đề → nhấn Đồng bộ lại, rồi tải lại để chắc trạng thái là Khớp.",
        "Làm việc này trước khi Khóa kỳ mỗi tháng.",
      ],
    },

    Neraca: {
      summary: "Tình hình tài chính tại một ngày: những gì sở hữu (Tài sản), những gì đang nợ (Nợ phải trả) và vốn của chủ (Vốn chủ sở hữu).",
      concept: [
        "Phương trình cơ bản luôn đúng: Tài sản = Nợ phải trả + Vốn chủ sở hữu. Theo SAK EMKM, báo cáo này gọi là Báo cáo tình hình tài chính.",
        "Tài sản cố định (PS, TV, nội thất) được trình bày theo nguyên giá trừ khấu hao lũy kế = giá trị còn lại.",
        "Lợi nhuận năm hiện tại vào Vốn chủ sở hữu; sau khi khóa năm trở thành Lợi nhuận giữ lại.",
      ],
      uses: [
        "Biết giá trị ròng của doanh nghiệp và khả năng trả nợ (tiền + phải thu so với nợ ngắn hạn).",
        "Tài liệu ngân hàng/công ty cho thuê tài chính thường yêu cầu khi xin vay.",
      ],
      watch: [
        "Bảng cân đối phải cân. Nếu không, hãy chạy tab Audit.",
        "Số dư Tiền trên Bảng cân đối phải bằng tiền thực tế; chênh lệch nghĩa là có giao dịch chưa ghi hoặc ghi sai.",
        "Hàng tồn kho phải khớp với kết quả kiểm kê.",
      ],
      steps: [
        "Chọn ngày (thường là cuối tháng) khi mọi giao dịch tháng đó đã đầy đủ.",
        "Nhấp vào dòng để truy những con số bất thường.",
        "So sánh với cuối tháng trước để thấy thay đổi về công nợ, phải thu và vốn.",
      ],
    },

    "Arus Kas": {
      summary: "Tiền thực sự vào và ra khỏi các tài khoản tiền mặt và ngân hàng trong một kỳ.",
      concept: [
        "Khác với Báo cáo lãi lỗ: Lưu chuyển tiền tệ chỉ tính tiền đã di chuyển. Doanh số chưa thu (phải thu) không được tính; mua tài sản và trả nợ được tính là tiền ra dù không phải chi phí.",
        "Tính trực tiếp từ biến động tài khoản Tiền/Ngân hàng trong nhật ký, nên tiền thuần luôn bằng thay đổi số dư các tài khoản đó trong Bảng cân đối thử. Các tài khoản được tính (tiền 111x, ngân hàng 112x và các tài khoản đăng ký là tiền/ngân hàng) được liệt kê bên dưới báo cáo.",
        "Chuyển tiền giữa ngăn kéo/tài khoản của chính mình có giá trị ròng bằng 0 và không tính là dòng tiền.",
      ],
      uses: [
        "Biết tiền đến từ đâu và đi đâu.",
        "Lập kế hoạch các khoản chi lớn (nhà cung cấp, trả góp tài sản, lương) dựa trên mô hình tiền hằng ngày.",
      ],
      watch: [
        "Lãi lớn nhưng tiền thuần âm: kiểm tra mua tài sản, trả nợ, tăng tồn kho hoặc phải thu dồn lại.",
        "Tiền vào/ra bất thường thường đến từ bút toán thủ công dùng tài khoản Tiền — truy trong Nhật ký.",
      ],
      steps: [
        "Hằng tuần/tháng: chọn kỳ, xem các nhóm tiền ra lớn nhất.",
        "Đảm bảo tiền thuần trong kỳ = thay đổi số dư tài khoản tiền/ngân hàng trong Bảng cân đối thử cùng kỳ.",
      ],
    },

    "CALK (SAK EMKM)": {
      summary: "Thuyết minh báo cáo tài chính — thành phần thứ ba SAK EMKM yêu cầu, được lập tự động.",
      concept: [
        "SAK EMKM (chuẩn mực kế toán Indonesia cho doanh nghiệp siêu nhỏ, nhỏ và vừa) yêu cầu ba báo cáo: Báo cáo tình hình tài chính (Bảng cân đối), Báo cáo lãi lỗ và Thuyết minh (CALK).",
        "Thuyết minh giải thích thông tin doanh nghiệp, cơ sở lập (dồn tích, giá gốc), chính sách kế toán (tồn kho bình quân gia quyền hoặc FIFO theo lựa chọn của cửa hàng, khấu hao đường thẳng), chi tiết các khoản mục báo cáo và thuế thu nhập.",
      ],
      uses: [
        "Hoàn thiện báo cáo tài chính cho ngân hàng, nhà đầu tư, hợp tác xã hoặc báo cáo thuế.",
        "In / lưu PDF cùng Bảng cân đối và Báo cáo lãi lỗ.",
      ],
      watch: [
        "Thông tin doanh nghiệp (tên, địa chỉ, mã số thuế, loại hình) lấy từ dữ liệu cửa hàng trong Cài đặt — hãy điền đầy đủ ở đó.",
        "Ước tính thuế cuối cùng 0,5% chỉ để tham khảo; nghĩa vụ thực tế tùy thuộc tình trạng và ưu đãi thuế của bạn.",
        "Thuyết minh chỉ chính xác bằng sổ sách — chạy Audit và đảm bảo kỳ đã đầy đủ trước khi in.",
      ],
      steps: [
        "Chọn kỳ báo cáo (thường là một năm tài chính, hoặc hằng tháng cho báo cáo nội bộ).",
        "Xem lại chi tiết tài sản cố định và thuế, rồi nhấn In / Lưu PDF.",
      ],
    },

    Audit: {
      summary: "Kiểm tra tự động sức khỏe sổ sách theo nguyên tắc thận trọng — tìm vấn đề trước khi nó vào báo cáo.",
      concept: [
        "Audit kiểm tra những điều báo cáo không thể hiện: bút toán trùng, bút toán không cân, giao dịch đã hủy vẫn còn hiệu lực, nguồn ghi tiền không hợp lệ, mapping tài khoản sai, giá trị tồn kho, tồn kho âm, thiếu giá vốn, số dư bất thường, phải thu quá hạn, kỳ chưa khóa và thuế.",
        "Xanh = ổn, vàng = cần chú ý, đỏ = phải sửa.",
        "Sửa tự động luôn là bút toán điều chỉnh/đảo được ghi lại và vào nhật ký kiểm toán — không dữ liệu nào bị xóa.",
      ],
      uses: [
        "Kiểm tra định kỳ trước khi khóa sổ hằng tháng.",
        "Tìm nguyên nhân khi số dư Tiền, Phải thu hoặc Lợi nhuận trông bất thường.",
      ],
      watch: [
        "Đọc giải thích của từng phát hiện trước khi nhấn nút sửa.",
        "Chỉ điều chỉnh giá trị tồn kho sau khi Giá vốn sản phẩm và kiểm kê đã đúng.",
        "Phát hiện không có sửa tự động cần xử lý thủ công (vd. điền Giá vốn, xem lại ca).",
      ],
      steps: [
        "Chạy ít nhất mỗi tuần một lần và bắt buộc trước khi Khóa kỳ.",
        "Xử lý đỏ trước, rồi vàng. Chạy lại Audit đến khi sạch.",
      ],
    },

    "Tutup Periode": {
      summary: "Khóa tháng đã báo cáo xong để các con số không thay đổi nữa.",
      concept: [
        "Sau khi kỳ được khóa, không bút toán mới nào (tự động hay thủ công) được ghi ngày trong kỳ đó.",
        "Bút toán sửa sau khi khóa được ghi với ngày hôm nay (kỳ hiện tại), không phải mở lại kỳ cũ.",
      ],
      uses: [
        "Giữ nguyên các báo cáo đã nộp cho chủ/ngân hàng/cơ quan thuế.",
        "Ngăn giao dịch lùi ngày (backdate) có thể thành kẽ hở gian lận.",
      ],
      watch: [
        "Chỉ khóa khi mọi giao dịch tháng đó đã đầy đủ: đã đóng ca, ghi chi phí, chạy khấu hao, kiểm kê, đối chiếu ngân hàng.",
        "Chỉ mở lại kỳ khi thực sự cần và chỉ Chủ được làm — mọi lần mở/khóa đều được ghi lại.",
      ],
      steps: [
        "Danh mục cuối tháng (ngày 1–5 tháng sau): đóng mọi ca → ghi chi phí & hóa đơn → chạy khấu hao ở menu Tài sản → kiểm kê → đối chiếu số dư ngân hàng/ví điện tử → Đối chiếu → Audit sạch.",
        "Chọn tháng → Khóa kỳ.",
        "In Bảng cân đối, Báo cáo lãi lỗ và Thuyết minh của tháng đó để lưu trữ.",
      ],
    },

    "Migrasi Data": {
      summary: "Chuyển sổ sách từ hệ thống/ghi chép cũ sang NEXBILL.",
      concept: [
        "Cách chuyển đổi chuẩn: một bút toán Số dư đầu kỳ tại ngày chuyển đổi chứa số dư của mọi tài khoản (Tiền, Ngân hàng, Phải thu, Tồn kho, Tài sản, Công nợ, Vốn). Không cần chuyển từng giao dịch cũ.",
        "Chênh lệch Nợ–Có của số dư đầu kỳ được ghi vào 3400 Vốn chủ sở hữu số dư đầu kỳ (mặc định).",
        "Nhập dữ liệu lịch sử (Excel) chỉ dành cho báo cáo các kỳ trước; dữ liệu đó không xuất hiện ở trang Giao dịch hay tồn kho.",
      ],
      uses: [
        "Bắt đầu dùng NEXBILL mà không mất số dư từ hệ thống trước.",
        "So sánh báo cáo trước và sau khi dùng NEXBILL.",
      ],
      watch: [
        "Số dư đầu kỳ chỉ nhập MỘT LẦN. Nhập hai lần sẽ nhân đôi mọi số dư.",
        "Tài sản cố định đã sở hữu nên ghi qua menu Tài sản → Mua tài sản → \"Số dư đầu kỳ\" để được khấu hao theo từng đơn vị — đừng ghi lại trong bút toán số dư đầu kỳ.",
        "Tồn kho đầu kỳ của sản phẩm được ghi qua Kho hàng (tồn đầu kỳ), không ghi ở đây, để số lượng và giá trị khớp nhau.",
      ],
      steps: [
        "Xác định ngày chuyển đổi (thường là đầu tháng).",
        "Chuẩn bị số dư từng tài khoản từ báo cáo cũ tại ngày đó, rồi nhập vào Số dư đầu kỳ đến khi tổng Nợ = Có.",
        "Tùy chọn: nhập dữ liệu lịch sử bằng mẫu Excel.",
        "Kiểm tra Bảng cân đối tại ngày chuyển đổi — phải khớp với bảng cân đối cũ của bạn.",
      ],
    },
  },

  workflow: [
    {
      when: "Một lần lúc bắt đầu",
      items: [
        "Xem lại Hệ thống tài khoản; thêm tài khoản ngân hàng và ví điện tử đang dùng.",
        "Thiết lập Account Mapping cho phương thức thanh toán vào đúng tài khoản.",
        "Nhập Số dư đầu kỳ (tab Chuyển đổi dữ liệu), tồn kho đầu kỳ của sản phẩm (Kho hàng) và tài sản đã sở hữu (Tài sản → Mua tài sản → Số dư đầu kỳ).",
      ],
    },
    {
      when: "Mỗi ngày",
      items: [
        "Thu ngân mở và đóng ca; đếm tiền ngăn kéo trung thực — chênh lệch tiền là cảnh báo chính.",
        "Ghi mọi khoản chi ở menu Chi phí, mua hàng tồn kho ở Mua hàng nhà cung cấp, mua PS/TV/nội thất ở Tài sản → Mua tài sản.",
        "Kiểm tra Phải thu: đòi các khoản chưa trả.",
        "Đối chiếu hôm nay: mọi đơn phải Khớp.",
      ],
    },
    {
      when: "Mỗi tuần",
      items: [
        "Đối chiếu số dư Ngân hàng và ví điện tử/QRIS trong Bảng cân đối thử với sao kê/bảng điều khiển nhà cung cấp.",
        "Trả công nợ nhà cung cấp/tài sản đến hạn (tab Phải trả).",
        "Chạy tab Audit và xử lý các phát hiện màu đỏ.",
      ],
    },
    {
      when: "Mỗi cuối tháng",
      items: [
        "Ghi các hóa đơn hằng tháng (điện, internet, thuê, lương) — thành công nợ nếu chưa trả.",
        "Chạy Khấu hao ở menu Tài sản.",
        "Kiểm kê ở Kho hàng.",
        "Audit đến khi sạch, rồi Khóa kỳ.",
        "Đọc Báo cáo lãi lỗ, Bảng cân đối và Lưu chuyển tiền tệ; lưu PDF để lưu trữ.",
      ],
    },
    {
      when: "Mỗi cuối năm",
      items: [
        "Đảm bảo đã khóa đủ 12 tháng.",
        "In Báo cáo tình hình tài chính, Báo cáo lãi lỗ và Thuyết minh (SAK EMKM) hằng năm.",
        "Tính và nộp thuế TNDN cuối cùng cho DNNVV Indonesia (0,5% doanh thu gộp nếu còn đủ điều kiện), rồi ghi lại khoản nộp.",
      ],
    },
  ],

  golden: [
    "Mỗi giao dịch ghi một lần, ở đúng menu của nó. Bút toán thủ công chỉ dành cho việc không có menu.",
    "Đừng xóa — hãy hủy. Hủy sẽ tạo bút toán đảo để dấu vết vẫn kiểm toán được.",
    "Tách tiền cá nhân và tiền kinh doanh. Rút tiền cá nhân ghi là Rút vốn, không phải chi phí.",
    "Mọi chênh lệch (tiền ngăn kéo, số dư ngân hàng, tồn kho) phải được giải thích, không bỏ qua.",
    "Báo cáo chỉ chính xác bằng dữ liệu nhập: giá vốn sản phẩm, khấu hao và chi phí đầy đủ quyết định lợi nhuận thật.",
  ],
};
