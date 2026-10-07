import type { AccountingGuideBook } from "./guides";

/** Bản dịch tiếng Việt của guides.ts — cùng các tab và cùng số mục trong mỗi phần. */
export const ACCOUNTING_GUIDE_BOOK_VI: AccountingGuideBook = {
  tabs: {
    "Chart of Accounts": {
      summary: "Danh sách mọi \"ngăn\" ghi chép tài chính của cửa hàng (tài khoản). Mọi khoản tiền vào hay ra luôn được ghi vào một trong các tài khoản ở đây.",
      concept: [
        "Hệ thống tài khoản (CoA) là danh sách tài khoản chia thành 5 loại: 1 Tài sản (những gì sở hữu), 2 Nợ phải trả (khoản nợ/nghĩa vụ), 3 Vốn chủ sở hữu (vốn của chủ), 4 Doanh thu, 5–8 Chi phí (giá vốn và chi phí hoạt động).",
        "Tài khoản tổng hợp (tiêu đề, in đậm) chỉ cộng các tài khoản bên dưới và không nhận bút toán. Giao dịch luôn ghi vào tài khoản chi tiết (tài khoản hạch toán).",
        "Số dư thông thường: Tài sản và Chi phí tăng bên Nợ; Nợ phải trả, Vốn chủ sở hữu và Doanh thu tăng bên Có.",
      ],
      uses: [
        "Quyết định các khoản mục xuất hiện trên Bảng cân đối kế toán và Báo cáo kết quả kinh doanh.",
        "Thêm tài khoản riêng cho doanh nghiệp, ví dụ tài khoản ngân hàng thứ hai, tài khoản ví điện tử mới, hoặc một loại chi phí cụ thể.",
      ],
      watch: [
        "Đừng xóa hoặc đổi loại của tài khoản đã có giao dịch — báo cáo các kỳ trước cũng thay đổi theo. Nếu không dùng nữa, chỉ cần tắt tài khoản.",
        "Mã tài khoản theo loại: tài khoản ngân hàng phải bắt đầu bằng 112x, ví điện tử 113x, chi phí 6xxx. Mã sai loại khiến tài khoản hiện ở sai phần của báo cáo.",
        "Mỗi cửa hàng có hệ thống tài khoản riêng. Tài khoản của cửa hàng này không dùng được cho cửa hàng khác.",
      ],
      steps: [
        "Khi bắt đầu dùng NEXBILL: xem danh sách tài khoản mặc định, thêm các tài khoản ngân hàng/ví điện tử bạn thực sự dùng.",
        "Chỉ thêm tài khoản mới khi không có tài khoản mặc định phù hợp — chọn đúng tài khoản tổng hợp để nằm đúng loại trên báo cáo.",
        "Sau khi thêm tài khoản tiền mặt/ngân hàng/ví điện tử, liên kết nó trong tab Ánh xạ tài khoản (module Payment) để giao dịch tự động ghi vào đó.",
      ],
    },

    "Account Mapping": {
      summary: "Quy tắc tự động \"giao dịch loại X được ghi vào tài khoản Y\". Thu ngân không bao giờ chọn tài khoản — hệ thống làm theo bảng này.",
      concept: [
        "Mỗi module (Cho thuê, F&B, Sản phẩm, PPOB, Chi phí, Tài sản, Thanh toán, v.v.) tìm tài khoản đích trong bảng này theo module + loại giao dịch.",
        "Ví dụ: module Payment khóa \"qris\" → tài khoản 1131 QRIS (mặc định), nên mọi khoản thanh toán QRIS làm tăng số dư tài khoản QRIS, không phải Tiền mặt.",
        "Nếu thiếu một dòng, hệ thống dùng tài khoản mặc định. Vì vậy bảng này dùng để ĐIỀU CHỈNH, không bắt buộc điền từ đầu.",
      ],
      uses: [
        "Tách doanh thu theo loại máy chơi/sản phẩm để Báo cáo kết quả kinh doanh chi tiết hơn.",
        "Xác định tiền từ mỗi phương thức thanh toán vào tài khoản nào — cơ sở đối chiếu số dư từng kênh khi chốt ca.",
        "Chỉ định tài khoản cho giá vốn, khấu hao, hàng tồn kho và công nợ mua tài sản theo ý bạn.",
      ],
      watch: [
        "Loại tài khoản phải đúng chức năng: doanh thu → tài khoản doanh thu, thanh toán → tài khoản tiền/ngân hàng, giá vốn/chi phí → tài khoản chi phí. Tab Kiểm toán tự động kiểm tra điều này.",
        "Cột khóa (transaction key) là từ hệ thống dùng để tìm — đừng sửa. Đổi khóa khiến dòng đó ngừng được dùng mà không có thông báo lỗi.",
        "Thay đổi ánh xạ chỉ áp dụng cho giao dịch MỚI. Giao dịch cũ vẫn ở tài khoản cũ; chuyển bằng bút toán thủ công nếu cần.",
        "Phương thức thanh toán tùy chỉnh chưa được ánh xạ sẽ vào tài khoản Ngân hàng chung (1121) — tab Kiểm toán sẽ cảnh báo.",
      ],
      steps: [
        "Sau khi thêm phương thức thanh toán mới (vd. một ví điện tử khác), thêm dòng module Payment cho phương thức đó trỏ tới tài khoản ví điện tử phù hợp.",
        "Đổi tài khoản đích bằng nút sửa, rồi kiểm tra vài giao dịch tiếp theo trong tab Sổ nhật ký để chắc chắn tài khoản đã đúng.",
        "Chạy tab Kiểm toán → \"Account Mapping\" sau khi thay đổi bất cứ điều gì ở đây.",
      ],
    },

    Jurnal: {
      summary: "Sổ ghi chép mọi giao dịch dưới dạng nợ–có. Gần như mọi bút toán đều do hệ thống tạo tự động.",
      concept: [
        "Mọi giao dịch được ghi theo nguyên tắc ghi sổ kép: tổng Nợ luôn bằng tổng Có. Ví dụ thuê PS trả tiền mặt Rp50.000: Nợ Tiền mặt thu ngân Rp50.000, Có Doanh thu cho thuê Rp50.000.",
        "Cột Nguồn cho biết bút toán đến từ đâu (Cho thuê, POS, Chi phí, Mua tài sản, Khấu hao, Thủ công, v.v.).",
        "Giao dịch bị hủy KHÔNG bị xóa: hệ thống tạo bút toán đảo (đổi nợ/có) để số dư trở về 0 và dấu vết kiểm toán vẫn còn.",
      ],
      uses: [
        "Truy nguồn gốc của một con số trên báo cáo.",
        "Ghi các giao dịch không có menu riêng qua Bút toán thủ công: chủ góp vốn, chủ rút vốn, sửa ghi sai, lãi/phí quản lý ngân hàng, trả nợ cũ.",
      ],
      watch: [
        "Đừng ghi lại bằng bút toán thủ công giao dịch đã được module của nó ghi (bán hàng, chi phí, mua hàng NCC, mua tài sản) — kết quả sẽ bị trùng.",
        "Bút toán thủ công phải cân bằng và phải dùng tài khoản chi tiết, không dùng tài khoản tổng hợp.",
        "Kỳ đã khóa không nhận bút toán có ngày nằm trong kỳ đó — ghi bút toán điều chỉnh với ngày hôm nay.",
        "Dùng tài khoản Tiền mặt trong bút toán thủ công sẽ thay đổi số dư tiền; hãy chắc chắn tiền thực sự đã dịch chuyển.",
      ],
      steps: [
        "Để kiểm tra: lọc kỳ, tìm theo số tham chiếu/mô tả, mở chi tiết dòng để xem tài khoản nợ–có.",
        "Để sửa: tạo bút toán thủ công đảo phần sai rồi ghi phần đúng, kèm mô tả rõ ràng (\"Điều chỉnh sai tài khoản chi phí ngày …\").",
        "Góp vốn: Nợ Tiền mặt/Ngân hàng, Có 3110 Vốn chủ sở hữu. Rút vốn: Nợ 3130 Rút vốn của chủ, Có Tiền mặt/Ngân hàng.",
      ],
    },

    "Neraca Saldo": {
      summary: "Số dư của mọi tài khoản trong một kỳ. Công cụ kiểm soát chính: tổng Nợ phải bằng tổng Có.",
      concept: [
        "Bảng cân đối thử (Trial Balance) tổng hợp bút toán theo tài khoản: tăng bao nhiêu (nợ), giảm bao nhiêu (có) và còn lại bao nhiêu (số dư).",
        "Nếu tổng Nợ = tổng Có, sổ sách cân bằng. Cân bằng chưa chắc đã đúng (có thể chọn nhầm tài khoản), nhưng không cân bằng thì chắc chắn có vấn đề.",
        "Cặp giao dịch hủy + bút toán đảo của nó cùng nằm trong kỳ sẽ được ẩn vì chúng triệt tiêu nhau.",
      ],
      uses: [
        "Điểm khởi đầu để kiểm tra sức khỏe sổ sách trước khi xem Báo cáo kết quả kinh doanh và Bảng cân đối kế toán.",
        "Đối chiếu số dư tài khoản với thực tế: Tiền mặt thu ngân với tiền trong ngăn kéo, Ngân hàng với sao kê, QRIS với bảng điều khiển của nhà cung cấp QRIS.",
      ],
      watch: [
        "Số dư bất thường (được đánh dấu): Tài sản âm hoặc Nợ phải trả có số dư nợ. Thường do một giao dịch thực tế chưa được ghi (nộp tiền, nạp tiền, thanh toán).",
        "Số lớn ở cột Nợ/Có là biến động, không phải số còn lại. Xem cột số dư để biết giá trị cuối.",
        "Có số dư Phải thu dù mọi khách đã trả đủ → kiểm tra tab Phải thu và Kiểm toán.",
      ],
      steps: [
        "Hằng ngày/tuần: đối chiếu số dư Tiền mặt thu ngân, Ngân hàng và ví điện tử với tiền/số dư thực tế.",
        "Bấm vào bất kỳ tài khoản nào để xem các bút toán tạo nên nó (sổ cái). Chỉ bật \"hiển thị giao dịch đã hủy\" khi cần kiểm toán.",
        "Chênh lệch không giải thích được → chạy tab Kiểm toán.",
      ],
    },

    "Piutang (AR)": {
      summary: "Các khoản khách hàng còn nợ chưa trả đủ — tiền vẫn thuộc về cửa hàng.",
      concept: [
        "Phải thu (Accounts Receivable) tự động phát sinh khi đơn/lượt thuê được đóng nhưng thanh toán thiếu. Phần còn lại ghi vào tài khoản 1141 Phải thu khách hàng (mặc định).",
        "Khi khách trả, phải thu giảm và Tiền mặt/Ngân hàng/ví điện tử tăng — doanh thu không tăng thêm, vì đã được ghi nhận lúc lập đơn.",
        "Tuổi nợ (aging) được nhóm thành: chưa đến hạn, 1–30, 31–60 và trên 60 ngày.",
      ],
      uses: [
        "Đòi tiền khách chưa trả đủ và theo dõi khoản nợ đã treo bao lâu.",
        "Nhận thanh toán trực tiếp từ tab này bằng phương thức khách đã dùng.",
      ],
      watch: [
        "Phải thu quá 60 ngày có nguy cơ không thu được. Nguyên tắc thận trọng: cân nhắc xóa nợ (bút toán thủ công vào chi phí nợ khó đòi) nếu rõ ràng sẽ không được trả.",
        "Đừng nhận thanh toán ở menu khác rồi lại nhận ở đây — chọn một nơi để không ghi hai lần.",
        "Khoản phải thu có \"giao dịch gốc không còn tồn tại\" không trả được bằng nút; hãy xử lý bằng bút toán thủ công.",
      ],
      steps: [
        "Kiểm tra tab này hằng ngày trước khi chốt ca.",
        "Bấm Nhận thanh toán → nhập số tiền (được trả một phần) → chọn phương thức → lưu. Tiền vào tài khoản theo Ánh xạ tài khoản của phương thức đó.",
        "Hằng tháng: xem tuổi nợ; đòi các khoản quá 30 ngày, quyết định xóa nợ với khoản không thu được.",
      ],
    },

    "Hutang (AP)": {
      summary: "Mọi nghĩa vụ chưa trả của cửa hàng: cho nhà cung cấp, mua tài sản và các chi phí ghi nhận là công nợ.",
      concept: [
        "Phải trả (Accounts Payable) phát sinh khi bạn nhận hàng/dịch vụ nhưng trả sau: Mua hàng NCC trả chậm (2111 Phải trả nhà cung cấp), Mua tài sản có đặt cọc/trả chậm (Phải trả mua tài sản, mặc định 2163) và Chi phí ghi nhận là công nợ.",
        "Trả nợ không làm tăng chi phí nữa — chi phí/tài sản đã được ghi lúc giao dịch ban đầu. Thanh toán chỉ làm giảm công nợ và Tiền mặt/Ngân hàng.",
      ],
      uses: [
        "Xem mọi hóa đơn phải trả ở một nơi kèm tuổi nợ.",
        "Thanh toán (trả hết hoặc trả góp) trực tiếp từ đây.",
      ],
      watch: [
        "Công nợ quá hạn làm ảnh hưởng quan hệ với nhà cung cấp — theo dõi cột tuổi nợ.",
        "Trả qua tab này hoặc menu gốc, đừng thêm bút toán thủ công — kết quả sẽ bị trùng.",
        "Chọn tài khoản tiền/ngân hàng thực sự chi tiền. Nếu chi từ ngăn kéo thu ngân, khoản trả cũng làm giảm tiền dự kiến của ca.",
      ],
      steps: [
        "Hằng tuần: sắp xếp từ cũ nhất, lên lịch thanh toán.",
        "Bấm Trả → nhập số tiền (nhà cung cấp và tài sản được trả góp) → chọn phương thức và tài khoản tiền/ngân hàng → lưu.",
        "Cuối tháng: số dư các tài khoản phải trả trong Bảng cân đối thử phải bằng tổng trong tab này.",
      ],
    },

    "Laba Rugi": {
      summary: "Doanh nghiệp lãi hay lỗ trong một kỳ: Doanh thu trừ giá vốn và Chi phí.",
      concept: [
        "Báo cáo kết quả kinh doanh lập theo cơ sở dồn tích (SAK EMKM): doanh thu ghi nhận khi giao dịch phát sinh (ngày kinh doanh của đơn), không phải khi nhận tiền; chi phí ghi nhận khi phát sinh.",
        "Lợi nhuận gộp = Doanh thu − Giá vốn hàng bán. Lợi nhuận ròng = Lợi nhuận gộp − Chi phí hoạt động (lương, điện, thuê mặt bằng, khấu hao, v.v.) ± thu nhập/chi phí khác.",
        "Khấu hao tài sản là chi phí dù không có tiền chi ra — phản ánh giá trị PS/TV giảm dần do sử dụng.",
      ],
      uses: [
        "Đánh giá kết quả từng tháng và so sánh giữa các kỳ.",
        "Xem nguồn doanh thu lớn nhất (cho thuê, F&B, sản phẩm, PPOB) và khoản chi phí lớn nhất.",
        "Cơ sở tính thuế TNDN cuối cùng cho doanh nghiệp vừa và nhỏ ở Indonesia (0,5% doanh thu gộp).",
      ],
      watch: [
        "Lãi lớn mà ít tiền là bình thường nếu có phải thu, tồn kho tăng hoặc mua tài sản — xem Lưu chuyển tiền tệ.",
        "Cảnh báo \"chưa tính giá vốn\" nghĩa là có sản phẩm chưa có Giá vốn; lợi nhuận trông lớn hơn thực tế.",
        "Nếu không chạy khấu hao hằng tháng, lợi nhuận trông quá cao.",
        "Chi phí chưa ghi (hóa đơn điện/internet tháng này) làm lợi nhuận trông lớn hơn — ghi là chi phí công nợ nếu chưa trả.",
      ],
      steps: [
        "Chọn kỳ (thường là tháng trước sau khi khóa sổ) và so sánh với kỳ trước đó.",
        "Bấm vào bất kỳ dòng nào để xem các giao dịch tạo nên nó.",
        "Trước khi đọc lợi nhuận cuối tháng: chắc chắn mọi chi phí đã được ghi, khấu hao đã chạy và đã kiểm kê kho.",
      ],
    },

    Rekonsiliasi: {
      summary: "Đối chiếu giao dịch bán hàng (trang Giao dịch) với bút toán doanh thu của nó, theo từng đơn.",
      concept: [
        "Mỗi đơn đã trả đủ phải có đúng một bút toán bán hàng với cùng số tiền và ngày kinh doanh.",
        "Trạng thái: Khớp, Chờ thanh toán, Lệch ngày, Lệch số tiền, Thiếu bút toán, Đơn đã hủy nhưng bút toán còn, và Bút toán không có đơn.",
      ],
      uses: [
        "Đảm bảo doanh số trong báo cáo bán hàng bằng doanh thu trong Báo cáo kết quả kinh doanh.",
        "Sửa các bút toán bị sót/lệch bằng nút Đồng bộ lại mà không cần nhập tay.",
      ],
      watch: [
        "Lệch số tiền hoặc thiếu bút toán nghĩa là Báo cáo kết quả kinh doanh của ngày đó không chính xác.",
        "Đơn sau nửa đêm được ghi theo ngày kinh doanh (ngày mở), không theo giờ thanh toán — điều này là có chủ ý.",
        "Đồng bộ lại sẽ hủy bút toán cũ rồi ghi lại; không thực hiện được với kỳ đã khóa.",
      ],
      steps: [
        "Hằng ngày (sau khi chốt ca): chọn \"hôm nay\", đảm bảo mọi dòng là Khớp hoặc Chờ thanh toán.",
        "Dòng có vấn đề → bấm Đồng bộ lại, rồi tải lại để xác nhận trạng thái là Khớp.",
        "Thực hiện trước khi Khóa kỳ kế toán mỗi tháng.",
      ],
    },

    Neraca: {
      summary: "Tình hình tài chính tại một ngày: những gì sở hữu (Tài sản), những gì còn nợ (Nợ phải trả) và vốn của chủ (Vốn chủ sở hữu).",
      concept: [
        "Phương trình cơ bản luôn đúng: Tài sản = Nợ phải trả + Vốn chủ sở hữu. Trong SAK EMKM báo cáo này gọi là Báo cáo tình hình tài chính.",
        "Tài sản cố định (PS, TV, nội thất) được trình bày theo nguyên giá trừ khấu hao lũy kế = giá trị sổ sách.",
        "Lợi nhuận năm hiện tại nằm trong Vốn chủ sở hữu; sau khi khóa năm sẽ thành Lợi nhuận giữ lại.",
      ],
      uses: [
        "Biết giá trị ròng của doanh nghiệp và khả năng trả nợ (tiền + phải thu so với nợ ngắn hạn).",
        "Tài liệu ngân hàng/công ty cho thuê tài chính thường yêu cầu khi xin vay.",
      ],
      watch: [
        "Bảng cân đối kế toán phải cân bằng. Nếu không, hãy chạy tab Kiểm toán.",
        "Số dư Tiền mặt trên Bảng cân đối kế toán phải bằng tiền thực tế; chênh lệch nghĩa là có giao dịch chưa ghi hoặc ghi sai.",
        "Hàng tồn kho phải khớp với kết quả kiểm kê.",
      ],
      steps: [
        "Chọn ngày (thường là cuối tháng) sau khi mọi giao dịch của tháng đó đã đầy đủ.",
        "Bấm vào dòng để truy các con số bất thường.",
        "So sánh với cuối tháng trước để thấy thay đổi về nợ, phải thu và vốn.",
      ],
    },

    "Arus Kas": {
      summary: "Tiền thực sự vào và ra khỏi các tài khoản tiền mặt và ngân hàng trong một kỳ.",
      concept: [
        "Khác với Báo cáo kết quả kinh doanh: Lưu chuyển tiền tệ chỉ tính tiền đã dịch chuyển. Doanh thu chưa thu tiền (phải thu) không được tính; mua tài sản và trả nợ được tính là tiền chi ra dù không phải chi phí.",
        "Được tính trực tiếp từ biến động của các tài khoản Tiền mặt/Ngân hàng trong sổ nhật ký, nên tiền thuần luôn bằng thay đổi số dư của các tài khoản đó trong Bảng cân đối thử. Các tài khoản được tính (tiền mặt 111x, ngân hàng 112x và tài khoản đăng ký là tiền/ngân hàng) được liệt kê dưới báo cáo.",
        "Chuyển tiền giữa các ngăn kéo/tài khoản của chính mình có giá trị ròng bằng 0 và không tính là lưu chuyển tiền.",
      ],
      uses: [
        "Biết tiền đến từ đâu và đi về đâu.",
        "Lập kế hoạch các khoản chi lớn (nhà cung cấp, trả góp tài sản, lương) dựa trên xu hướng tiền hằng ngày.",
      ],
      watch: [
        "Lãi lớn nhưng tiền thuần âm: kiểm tra mua tài sản, trả nợ, tăng tồn kho hoặc phải thu tồn đọng.",
        "Tiền vào/ra bất thường thường đến từ bút toán thủ công dùng tài khoản Tiền mặt — truy trong Sổ nhật ký.",
      ],
      steps: [
        "Hằng tuần/tháng: chọn kỳ, xem các nhóm chi tiền lớn nhất.",
        "Đảm bảo tiền thuần của kỳ = thay đổi số dư tài khoản tiền/ngân hàng trong Bảng cân đối thử cùng kỳ.",
      ],
    },

    "CALK (SAK EMKM)": {
      summary: "Thuyết minh báo cáo tài chính — thành phần thứ ba mà SAK EMKM yêu cầu, được lập tự động.",
      concept: [
        "SAK EMKM (Chuẩn mực kế toán tài chính của Indonesia cho doanh nghiệp siêu nhỏ, nhỏ và vừa) yêu cầu ba báo cáo: Báo cáo tình hình tài chính (Bảng cân đối kế toán), Báo cáo kết quả kinh doanh và Thuyết minh.",
        "Thuyết minh trình bày thông tin doanh nghiệp, cơ sở lập (dồn tích, giá gốc), chính sách kế toán (hàng tồn kho bình quân gia quyền hoặc FIFO theo lựa chọn của cửa hàng, khấu hao đường thẳng), chi tiết các khoản mục và thuế thu nhập.",
      ],
      uses: [
        "Hoàn thiện báo cáo tài chính cho ngân hàng, nhà đầu tư, hợp tác xã hoặc báo cáo thuế.",
        "In / lưu PDF cùng Bảng cân đối kế toán và Báo cáo kết quả kinh doanh.",
      ],
      watch: [
        "Thông tin doanh nghiệp (tên, địa chỉ, mã số thuế NPWP, loại hình) lấy từ dữ liệu cửa hàng trong Cài đặt — hãy điền đầy đủ ở đó.",
        "Ước tính thuế cuối cùng 0,5% chỉ mang tính tham khảo; nghĩa vụ thực tế tùy tình trạng và ưu đãi thuế của bạn.",
        "Thuyết minh chỉ chính xác như sổ sách — chạy Kiểm toán và đảm bảo kỳ đã đầy đủ trước khi in.",
      ],
      steps: [
        "Chọn kỳ báo cáo (thường là một năm tài chính, hoặc hằng tháng cho báo cáo nội bộ).",
        "Kiểm tra chi tiết tài sản cố định và thuế, rồi bấm In / Lưu PDF.",
      ],
    },

    Audit: {
      summary: "Kiểm tra tự động sức khỏe sổ sách theo nguyên tắc thận trọng — tìm vấn đề trước khi nó đi vào báo cáo.",
      concept: [
        "Kiểm toán xem những điều không thấy trên báo cáo: bút toán trùng, bút toán không cân, giao dịch hủy vẫn còn hiệu lực, nguồn ghi tiền không hợp lệ, ánh xạ tài khoản sai, giá trị tồn kho, tồn kho âm, thiếu giá vốn, số dư bất thường, phải thu quá hạn, kỳ chưa khóa và thuế.",
        "Xanh = an toàn, vàng = cần chú ý, đỏ = phải sửa.",
        "Sửa tự động luôn là bút toán điều chỉnh/đảo được ghi lại và đưa vào nhật ký kiểm toán — không dữ liệu nào bị xóa.",
      ],
      uses: [
        "Kiểm tra định kỳ trước khi khóa sổ hằng tháng.",
        "Tìm nguyên nhân khi số dư Tiền, Phải thu hoặc Lợi nhuận trông bất thường.",
      ],
      watch: [
        "Đọc giải thích của từng phát hiện trước khi bấm nút sửa.",
        "Chỉ điều chỉnh giá trị tồn kho sau khi Giá vốn sản phẩm và kết quả kiểm kê đã đúng.",
        "Phát hiện không có sửa tự động cần xử lý thủ công (vd. điền Giá vốn, xem lại ca).",
      ],
      steps: [
        "Chạy ít nhất mỗi tuần một lần và bắt buộc trước khi Khóa kỳ kế toán.",
        "Xử lý đỏ trước, rồi đến vàng. Chạy lại Kiểm toán cho đến khi sạch.",
      ],
    },

    "Tutup Periode": {
      summary: "Khóa tháng đã báo cáo xong để các con số không thay đổi nữa.",
      concept: [
        "Sau khi khóa kỳ, không bút toán mới nào (tự động hay thủ công) được mang ngày nằm trong kỳ đó.",
        "Điều chỉnh sau khi khóa được ghi với ngày hôm nay (kỳ hiện tại), không mở lại kỳ cũ.",
      ],
      uses: [
        "Giữ nguyên các báo cáo đã nộp cho chủ/ngân hàng/cơ quan thuế.",
        "Ngăn giao dịch lùi ngày (backdate) có thể thành kẽ hở gian lận.",
      ],
      watch: [
        "Chỉ khóa khi mọi giao dịch của tháng đã đầy đủ: đã chốt ca, ghi chi phí, chạy khấu hao, kiểm kê kho, đối chiếu ngân hàng.",
        "Chỉ mở lại kỳ khi thật sự cần và chỉ do Chủ sở hữu thực hiện — mọi lần mở/khóa đều được ghi lại.",
      ],
      steps: [
        "Danh sách kiểm tra cuối tháng (ngày 1–5 tháng sau): chốt mọi ca → ghi chi phí & hóa đơn → chạy khấu hao trong menu Tài sản cố định → kiểm kê kho → đối chiếu số dư ngân hàng/ví điện tử → Đối chiếu → Kiểm toán sạch.",
        "Chọn tháng → Khóa kỳ kế toán.",
        "In Bảng cân đối kế toán, Báo cáo kết quả kinh doanh và Thuyết minh của tháng đó để lưu trữ.",
      ],
    },

    "Migrasi Data": {
      summary: "Chuyển sổ sách từ hệ thống/ghi chép cũ sang NEXBILL.",
      concept: [
        "Cách chuyển chuẩn: một bút toán Số dư đầu kỳ tại ngày chuyển đổi chứa số dư của mọi tài khoản (Tiền mặt, Ngân hàng, Phải thu, Hàng tồn kho, Tài sản, Nợ, Vốn). Không cần chuyển từng giao dịch cũ.",
        "Chênh lệch nợ–có của số dư đầu kỳ được đưa vào 3400 Vốn chủ sở hữu đầu kỳ (mặc định).",
        "Nhập dữ liệu lịch sử (Excel) chỉ phục vụ báo cáo các kỳ trước; dữ liệu đó không xuất hiện trên trang Giao dịch hay tồn kho.",
      ],
      uses: [
        "Bắt đầu dùng NEXBILL mà không mất số dư từ hệ thống cũ.",
        "So sánh báo cáo trước và sau khi dùng NEXBILL.",
      ],
      watch: [
        "Số dư đầu kỳ chỉ nhập MỘT LẦN. Nhập hai lần sẽ nhân đôi mọi số dư.",
        "Tài sản cố định đã sở hữu nên ghi qua Tài sản cố định → Mua tài sản → \"Số dư đầu kỳ\" để được khấu hao theo từng đơn vị — đừng ghi lại trong bút toán số dư đầu kỳ.",
        "Tồn kho đầu kỳ của sản phẩm được ghi qua Kho hàng (tồn kho đầu kỳ), không phải ở đây, để số lượng và giá trị khớp nhau.",
      ],
      steps: [
        "Xác định ngày chuyển đổi (thường là đầu tháng).",
        "Chuẩn bị số dư từng tài khoản từ báo cáo cũ tại ngày đó, rồi nhập vào Số dư đầu kỳ cho đến khi tổng nợ = có.",
        "Tùy chọn: nhập dữ liệu lịch sử qua mẫu Excel.",
        "Kiểm tra Bảng cân đối kế toán tại ngày chuyển đổi — phải khớp với bảng cân đối cũ của bạn.",
      ],
    },
  },

  workflow: [
    {
      when: "Một lần lúc bắt đầu",
      items: [
        "Xem Hệ thống tài khoản; thêm các tài khoản ngân hàng và ví điện tử đang dùng.",
        "Thiết lập Ánh xạ tài khoản của các phương thức thanh toán đến đúng tài khoản.",
        "Nhập Số dư đầu kỳ (tab Di chuyển dữ liệu), tồn kho đầu kỳ của sản phẩm (Kho hàng) và tài sản đã sở hữu (Tài sản cố định → Mua tài sản → Số dư đầu kỳ).",
      ],
    },
    {
      when: "Mỗi ngày",
      items: [
        "Thu ngân mở và chốt ca; đếm tiền ngăn kéo trung thực — chênh lệch tiền là cảnh báo chính.",
        "Ghi mọi khoản chi trong menu Chi phí, mua hàng tồn kho trong Mua hàng NCC, mua PS/TV/nội thất trong Tài sản cố định → Mua tài sản.",
        "Kiểm tra Phải thu: đòi các khoản chưa trả đủ.",
        "Đối chiếu hôm nay: mọi đơn phải Khớp.",
      ],
    },
    {
      when: "Mỗi tuần",
      items: [
        "Đối chiếu số dư Ngân hàng và ví điện tử/QRIS trong Bảng cân đối thử với sao kê/bảng điều khiển của nhà cung cấp.",
        "Trả các khoản nợ nhà cung cấp/tài sản đến hạn (tab Phải trả).",
        "Chạy tab Kiểm toán và xử lý các phát hiện màu đỏ.",
      ],
    },
    {
      when: "Mỗi cuối tháng",
      items: [
        "Ghi các hóa đơn hằng tháng (điện, internet, thuê mặt bằng, lương) — là công nợ nếu chưa trả.",
        "Chạy Khấu hao trong menu Tài sản cố định.",
        "Kiểm kê kho trong Kho hàng.",
        "Kiểm toán cho đến khi sạch, rồi Khóa kỳ kế toán.",
        "Đọc Báo cáo kết quả kinh doanh, Bảng cân đối kế toán và Lưu chuyển tiền tệ; lưu PDF để lưu trữ.",
      ],
    },
    {
      when: "Mỗi cuối năm",
      items: [
        "Đảm bảo đã khóa đủ 12 tháng.",
        "In Báo cáo tình hình tài chính, Báo cáo kết quả kinh doanh và Thuyết minh (SAK EMKM) hằng năm.",
        "Tính và nộp thuế TNDN cuối cùng cho doanh nghiệp vừa và nhỏ (0,5% doanh thu gộp nếu còn đủ điều kiện), rồi ghi nhận khoản nộp.",
      ],
    },
  ],

  goldenRules: [
    "Mỗi giao dịch chỉ ghi một lần, trong menu riêng của nó. Bút toán thủ công chỉ dành cho việc không có menu.",
    "Đừng xóa — hãy hủy. Hủy sẽ tạo bút toán đảo để dấu vết vẫn kiểm toán được.",
    "Tách tiền cá nhân và tiền kinh doanh. Rút tiền cá nhân ghi là Rút vốn của chủ, không phải chi phí.",
    "Mọi chênh lệch (tiền ngăn kéo, số dư ngân hàng, tồn kho) phải được giải thích, không được bỏ qua.",
    "Báo cáo chỉ chính xác như dữ liệu nhập: giá vốn sản phẩm, khấu hao và chi phí đầy đủ quyết định lợi nhuận đúng.",
  ],

  ui: {
    guidePrefix: "Hướng dẫn",
    open: "Đọc hướng dẫn",
    close: "Đóng",
    concept: "Khái niệm kế toán",
    uses: "Công dụng",
    watch: "Cần lưu ý",
    steps: "Các bước thực hiện",
    workflowTitle: "Hướng dẫn quy trình kế toán của cửa hàng",
    workflowIntro:
      "Gần như mọi bút toán đều được tạo tự động từ thu ngân, cho thuê, chi phí, mua hàng NCC và tài sản. Việc của bạn: đảm bảo mọi giao dịch được ghi trong menu của nó, rồi kiểm tra và khóa sổ định kỳ.",
    closeAria: "Đóng hướng dẫn",
    goldenRules: "Nguyên tắc vàng của ghi sổ",
    startFrom: "Bắt đầu từ:",
  },
};
