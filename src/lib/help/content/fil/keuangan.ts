import type { HelpCategory } from "../../types";

export const KEUANGAN: HelpCategory[] = [
  {
    id: "accounting",
    group: "keuangan",
    label: "Accounting (Bookkeeping at Financial Statement)",
    summary:
      "Kumpletong bookkeeping na awtomatikong napupunan mula sa bawat transaksyon: chart of accounts, journal, receivable at payable, Income Statement, Balance Sheet, Cash Flow, awtomatikong pagsuri, buwanang pagsasara, at opening balance. Hindi mo kailangang maintindihan ang accounting para mabasa ang mga pangunahing report.",
    subsections: [
      {
        title: "Mga report na pinakamadalas buksan",
        steps: [
          "Income Statement: pumili ng period → tingnan ang kabuuang kita, gross profit, at net profit, kasama ang breakdown ayon sa uri ng kita at gastos. I-on ang \"Ikumpara ang Maraming Period\" para ikumpara ang 2–4 na buwan nang magkatabi.",
          "Balance Sheet: ang posisyon ng ari-arian (cash, bangko, stock, asset), utang, at kapital sa isang petsa. Iwanang blangko ang petsa para sa ngayon.",
          "Cash Flow: perang talagang pumasok at lumabas sa period, ayon sa kategorya at ayon sa araw.",
          "Lahat ng report ay mada-download sa Excel/PDF, at bawat numero ay puwedeng i-click para makita ang mga transaksyong bumubuo rito.",
        ],
      },
      {
        title: "Receivable (AR) at Payable (AP)",
        steps: [
          "Receivable: mga bill ng customer na hindi pa bayad, naka-grupo ayon sa tagal (hindi pa due, 1–30, 31–60, >60 araw). Pindutin ang \"Tanggapin ang Bayad\" kapag nagbayad ang customer.",
          "Payable: mga bill ng supplier, gastos na naitala bilang payable, at payable sa pagbili ng asset. Pindutin ang Magbayad at piliin ang cash/bank account.",
        ],
      },
      {
        title: "Chart of Accounts at Account Mapping",
        steps: [
          "Awtomatikong inihanda ang listahan ng account. Magdagdag lang ng bagong account kung kailangan (code, pangalan, uri, parent account).",
          "Hindi mabubura ang account na nagamit na — awtomatiko itong ina-archive para manatiling tama ang kasaysayan.",
          "Tinutukoy ng Account Mapping ang awtomatikong target na account kada uri ng transaksyon (hal. PS5 rental → Kita sa Rental). Baguhin lang kung naiintindihan mo ang accounting.",
        ],
      },
      {
        title: "Journal at Trial Balance",
        steps: [
          "Journal: lahat ng accounting entry, puwedeng salain ayon sa pinagmulan (Rental, POS, Gastos, Asset, atbp.).",
          "Manual Journal (para lang sa may pahintulot): ilagay ang petsa, paglalarawan, at mga linya ng debit/credit — dapat magkapareho ang kabuuang debit at credit.",
          "Ang pagkansela ng manual journal ay gumagawa ng reversing entry; hindi binubura ang orihinal. Ang mga awtomatikong journal ay kinakansela sa pinagmulang menu nito (hal. refund sa Transaksyon).",
          "Trial Balance: ang balanse ng bawat account sa period. Para sa balanse mula sa simula, piliin ang Custom at iwanang blangko ang dalawang petsa. Dapat laging \"Balance\".",
        ],
      },
      {
        title: "Reconciliation, Audit, Notes",
        steps: [
          "Reconciliation: ikinukumpara ang mga transaksyon (ayon sa petsa ng transaksyon) sa mga journal (ayon sa petsa ng pagtatala) at ipinapakita ang mga order na magkaiba ang petsa o may problema, kasama ang gabay sa pag-aayos — hindi kailangang mag-edit nang mano-mano.",
          "Audit: awtomatikong pagsuri ng bookkeeping (hal. produktong walang cost price, dobleng journal, data sa pagitan ng outlet). Laging kailangan ng kumpirmasyon ang mga iminumungkahing pag-aayos at naitatala bilang correcting journal.",
          "Notes (SAK EMKM): ang Notes to the Financial Statements para sa maliliit na negosyo, handang kumpletuhin at i-print.",
        ],
      },
      {
        title: "Close Period (i-lock ang buwan)",
        steps: [
          "Kapag final na ang report ng isang buwan, piliin ang buwang iyon at pindutin ang Close Period (opsyonal ang tala).",
          "Pagkasara, wala nang bagong journal — awtomatiko man o manual — na maitatala na may petsa sa buwang iyon, kaya hindi na magbabago ang mga report na naisumite na.",
          "Ang mga pagtatama pagkasara ng period ay itinatala na may petsa ngayong araw. Buksan lang ulit ang period kung talagang kailangan.",
        ],
      },
      {
        title: "Paglipat ng Data (opening balance at lumang data)",
        navHint: "Ang tab na ito ay nakikita lang ng Owner/Superuser.",
        steps: [
          "Opening Balance: itala ang panimulang balanse ng lahat ng account (cash, bangko, receivable, payable, asset, kapital) sa araw na nagsimula kang gumamit ng NEXBILL. Pindutin ang \"I-load ang Lahat ng Postable na Account\" para mapunan ang listahan ng account. Isang aktibong Opening Balance lang ang pinapayagan.",
          "Mag-import ng Lumang Data: i-download ang mga template (Benta, Pagbili, Iba pang Kita, Gastos), punan, i-upload — para makita sa report ang trend ng mga nakaraang buwan.",
          "Mas madaling ilagay ang mga asset na pag-aari na sa Fixed Asset → Upload Excel gamit ang opsyong Opening balance.",
        ],
        notes: ["Pumapasok sa accounting at report ang in-import na lumang data, pero hindi lumalabas sa listahan ng Transaksyon/Gastos."],
      },
    ],
    notes: [
      "Lahat ng staff ay puwedeng TUMINGIN sa page na ito. Pagbago ng chart of accounts at mapping: Owner, Superuser, Accountant. Manual journal at opening balance: Owner, Superuser, Accountant. Tumitingin lang ang Manager.",
      "Punan ang Cost Price ng bawat produkto — kung wala ito, masyadong mataas ang Income Statement. Nagbababala ang page ng Income Statement kung may benta na blangko ang cost price.",
    ],
  },
  {
    id: "expenses",
    group: "keuangan",
    label: "Pamamahala ng Gastos",
    summary:
      "Itala ang lahat ng gastos ng outlet (kuryente, sahod, upa, sangkap, parking, atbp.) kasama ang patunay. Awtomatikong naaaprubahan ang maliliit na gastos; ang malalaki ay naghihintay ng apruba ng Owner/Manager. Awtomatikong napupunta lahat sa accounting.",
    subsections: [
      {
        title: "Pagtatala ng gastos",
        steps: [
          "Pindutin ang \"+ Bagong Gastos\": piliin ang expense account (hal. Gastos sa Kuryente), kategorya, paglalarawan, binayaran/supplier (opsyonal), dami at halaga, buwis (opsyonal).",
          "Piliin kung paano binayaran: ang cash/bank account na ginamit, o i-tick ang \"Itala bilang payable\" at ilagay ang due date.",
          "Maglakip ng larawan ng resibo bilang patunay.",
          "Pindutin ang I-save at Isumite. Kapag mas mababa sa limitasyon ng apruba (default Rp500,000) naaaprubahan agad; kapag mas mataas, ang status ay Naghihintay ng Apruba.",
          "Naka-lock ang save button habang nagpoproseso, kaya hindi gagawa ng dobleng gastos ang pag-double-click.",
        ],
      },
      {
        title: "Apruba, pagbabayad, pagkansela",
        steps: [
          "Pinipindot ng Owner/Manager ang Aprubahan o Tanggihan (may dahilan) sa mga gastos na naghihintay.",
          "Ang mga gastos na naitala bilang payable ay may button na Magbayad pagkaapruba para mabayaran ang mga ito.",
          "Ang draft/pending ay puwedeng kanselahin nang walang bakas. Ang naaprubahan/nabayaran na ay kinakansela gamit ang Void (kailangan ng dahilan) — binabaligtad ang bookkeeping, hindi binubura ang data.",
        ],
      },
      {
        title: "Mabilisang Cash Out",
        steps: ["Maikling form na may 3 field (kategorya, halaga, tala) para sa maliliit na pang-araw-araw na gastos mula sa drawer, gaya ng parking at refill ng tubig. Nalalapat pa rin ang limitasyon ng apruba."],
      },
      {
        title: "Paulit-ulit (regular na gastos)",
        steps: [
          "Gumawa ng template para sa mga gastos na umuulit: pangalan, account, halaga, dalas (buwanan/lingguhan/taunan), susunod na due date.",
          "Pindutin ang \"Gawin ang mga Gastos na Due Na\" para gumawa ng draft ng mga gastos na dapat nang bayaran, saka Isumite gaya ng dati.",
        ],
      },
      {
        title: "Cost Center at Dashboard",
        steps: [
          "Hinahati ng Cost Center ang gastos ayon sa bahagi (Rental, F&B, Kusina, Administrasyon) para makita kung aling bahagi ang pinakamalaki ang gastos.",
          "Tab na Dashboard: gastos ngayong araw/ngayong buwan, hindi pa bayad, naghihintay ng apruba, due sa loob ng ≤3 araw, breakdown ayon sa kategorya, at trend sa 30 araw.",
        ],
      },
    ],
    roles: "Magtala at magbayad: Owner, Superuser, Manager, Accountant, Cashier. Mag-apruba: Owner, Superuser, Manager. Void: Owner, Superuser, Manager, Accountant.",
  },
  {
    id: "other-income",
    group: "keuangan",
    label: "Iba pang Kita",
    summary:
      "Itala ang perang pumapasok na labas sa benta ng rental, cashier, at PPOB — hal. komisyon, pagpapaupa ng lugar para sa torneo, sponsorship, pagbenta ng gamit na item, multa ng customer, interes o cashback ng bangko.",
    steps: [
      "Pumili ng saklaw ng petsa (o pindutin ang Ngayon / Ngayong Buwan) para makita ang listahan.",
      "Ilagay ang kategorya, paglalarawan, tinanggap mula kay (opsyonal), halaga, at paraan ng pagbabayad, saka pindutin ang I-save.",
      "Agad itong naitatala sa accounting nang walang apruba. Kung cash at may bukas na shift, nabibilang din ito sa cash ng shift.",
      "Mali ang pagkakatala? Pindutin ang Void at ilagay ang dahilan.",
    ],
    roles: "Magtala/mag-void: Owner, Superuser, Manager, Accountant. Ang ibang tungkuling may pahintulot sa report ay makakatingin lang.",
  },
  {
    id: "payments-methods",
    group: "keuangan",
    label: "Mga Paraan ng Pagbabayad (QRIS, Transfer, E-wallet)",
    navHint: "Menu na \"Mga Bayad\" sa sidebar.",
    summary:
      "I-set ang mga opsyon sa pagbabayad na lumalabas sa cashier, rental, Home Rental, at membership — kasama ang QRIS image at bank account ng outlet na ipinapakita sa customer.",
    steps: [
      "Pindutin ang \"+ Paraan\", ilagay ang pangalan (hal. QRIS, BCA Transfer, GoPay), at piliin ang uri nito:",
      "\"Sinusubaybayang Balanse\" — para sa e-wallet/balanseng dapat suriin sa app nito tuwing pagsasara ng shift. \"Impormasyon Lang\" — para sa bayad na diretso sa bank account/EDC na hindi kailangang suriin kada shift.",
      "I-upload ang static QRIS image ng outlet at/o ilagay ang numero at pangalan ng bank account. Kapag pinili ng cashier ang paraang ito, agad makikita ng customer kung saan magbabayad.",
      "I-edit para baguhin ang pangalan/uri/status na aktibo. Ang pagbura ay nagtatago lang ng paraan sa mga bagong transaksyon; hindi nagbabago ang mga lumang transaksyon.",
    ],
    notes: [
      "Laging diretso ang pera ng customer sa account/QRIS ng outlet — hindi kailanman dumadaan sa NEXBILL.",
      "Hindi mabubura ang paraang Cash dahil ginagamit ito sa pagbilang ng cash ng shift.",
    ],
    roles: "Owner, Superuser, Manager.",
  },
  {
    id: "reports",
    group: "keuangan",
    label: "Mga Ulat (Operasyon at Kalusugan ng Pananalapi)",
    summary:
      "Madaling basahing report ng operasyon ayon sa saklaw ng petsa: benta, rental, Home Rental, stock at cost, customer, gastos, at financial health score. Ang opisyal na financial statement (Income Statement, Balance Sheet, Cash Flow) ay nasa menu na Accounting.",
    subsections: [
      { title: "Benta", steps: ["Kabuuang kita (rental vs cashier), bilang ng bayad na transaksyon, trend kada araw, kita kada paraan ng pagbabayad, kabuuang discount/buwis/service charge. May paghahambing sa Income Statement sa parehong period."] },
      { title: "Rental", steps: ["Kita sa rental, bilang ng session, average na tagal ng laro, at table kada PS unit (session, average na tagal, kita)."] },
      { title: "Home Rental", steps: ["Kita sa paupahang iuuwi, multa sa late, singil sa sira, breakdown ayon sa kategorya at uri ng produkto, at status ng deposit."] },
      { title: "Imbentaryo at COGS", steps: ["Kita sa produkto, kabuuang cost of goods, margin kada produkto, listahan ng sira/itinapong item, at paubos na stock."] },
      { title: "Customer", steps: ["Bilang ng customer, distribusyon ng tier ng member, at mga customer na pinakamalaki ang gastos."] },
      { title: "Gastos", steps: ["Kabuuang gastos vs kita, expense ratio, net profit, trend, at breakdown ayon sa kategorya/account/supplier/paraan/branch/cost center."] },
      {
        title: "Kalusugan ng Pananalapi",
        steps: [
          "Buod sa simpleng wika kung gaano kalusog ang negosyo: Profitability (gaano kalaki ang tubo), Liquidity (sapat ba ang cash para bayaran ang obligasyon), at Operational Efficiency (gastos kumpara sa kita).",
          "Gamitin tuwing katapusan ng buwan kasabay ng Income Statement.",
        ],
      },
    ],
    notes: [
      "Bawat tab ay may sariling pagpili ng petsa.",
      "Ang pag-download ng Excel/PDF ng opisyal na financial statement ay nasa menu na Accounting.",
    ],
  },
];
