import type { HelpCategory } from "../../types";

export const BANTUAN: HelpCategory[] = [
  {
    id: "masalah-umum",
    group: "bantuan",
    label: "Mga Karaniwang Problema at Solusyon",
    summary:
      "Ang mga problemang pinakamadalas maranasan ng mga outlet, kasama ang mga hakbang para ayusin. Subukan muna ang mga ito bago kontakin ang Customer Service.",
    subsections: [
      {
        title: "Hindi makapag-log in",
        steps: [
          "\"Aktibo ang account sa ibang device\": mag-log out muna sa naunang device, maghintay ng 30 minuto, o hilingin sa Owner na pindutin ang \"I-sign out\" sa Staff at Access.",
          "Nakalimutan ang password: pindutin ang \"Nakalimutan ang password\" sa login page at buksan ang link sa email mo (suriin din ang Spam folder).",
          "Na-deactivate ang account: hilingin sa Owner/Manager na i-activate ulit.",
        ],
      },
      {
        title: "Hindi kusang bumubukas/sumasara ang TV",
        steps: [
          "Suriin ang status ng device sa Kontrol ng Device. Kung offline: siguraduhing naka-on at nakakonekta sa internet ang PC ng cashier na nagpapatakbo ng NexbillAgent.",
          "Android TV: siguraduhing nasa parehong WiFi ang TV at PC ng cashier at hindi nagbago ang IP ng TV (i-lock ang IP ayon sa Gabay sa NexbillAgent). Tingnan ang 28 karaniwang problema (code P01–P28) sa Kumpletong Gabay sa NexbillAgent.",
          "Biglang hindi tumutugon ang lahat ng Tuya smart plug: malamang nag-expire na ang Tuya Cloud Trial — i-extend ito sa iot.tuya.com.",
          "TV na hindi Android: kailangan nitong gumamit ng smart plug. Pindutin ang \"Tingnan ang Rekomendadong Smart Plug\" sa Kontrol ng Device.",
          "Habang hindi pa naaayos, buksan nang mano-mano ang TV gamit ang remote — tuloy pa rin nang normal ang rental session.",
        ],
      },
      {
        title: "Hindi nade-detect ang controller sa Gamepad Tester",
        steps: [
          "Gumamit ng Chrome o Edge, isaksak ang controller, saka pindutin ang kahit anong button nang isang beses.",
          "Ang PS3 controller sa Windows ay kailangan ng DsHidMini driver (download button sa page ng Gamepad Tester). Madalas hindi pa rin nade-detect ang mga clone na PS3 controller.",
          "Subukan ang ibang USB cable — maraming murang cable ang pang-charge lang at hindi nagdadala ng data.",
        ],
      },
      {
        title: "Diperensya ng cash sa pagsasara ng shift",
        steps: [
          "Suriin kung may maliliit na gastos na hindi pa naitatala (parking, tubig) — itala sa Gastos → Mabilisang Cash Out.",
          "Suriin kung may perang kinuha ng may-ari/idineposito pero hindi naitala bilang Cash Deposit.",
          "Suriin sa menu na Transaksyon ang mga bayad na dapat QRIS/transfer pero naitala bilang cash (o baligtad).",
          "Suriin kung may maling sukli at mga bill na \"bayad mamaya\" na talagang nabayaran na nang cash.",
          "Isulat ang posibleng sanhi sa tala ng shift para masundan ng may-ari.",
        ],
      },
      {
        title: "Nakalimutang isara ang shift / hindi makapagbukas ng shift",
        steps: [
          "Isang shift lang ang puwedeng bukas kada outlet (maliban kung pinayagan sa Mga Kagustuhan). Kung nakalimutang isara ng naunang cashier, puwedeng isara ng supervisor ang shift na iyon: bilangin ang drawer at isulat ang dahilan.",
          "Saka magbukas ng bagong shift gaya ng dati.",
        ],
      },
      {
        title: "Negatibo o hindi tugma ang stock",
        steps: [
          "Ang binili na stock ay dapat itala sa Pagbili sa Supplier/Purchase Order, hindi basta ilagay sa estante.",
          "Mga niluluto: siguraduhing tama ang recipe — ang stock ng sangkap ang bumababa, hindi ang stock ng menu.",
          "Gumawa ng Stock Count para itugma ang stock sa sistema sa pisikal na stock.",
        ],
      },
      {
        title: "Mukhang masyadong mataas ang tubo",
        steps: [
          "Malamang may mga produktong blangko ang Cost Price. Punan ito sa Imbentaryo → Produkto; nagpapakita rin ng babala ang page ng Income Statement.",
          "Siguraduhing naitala na ang mga regular na gastos (kuryente, sahod, upa) at napatakbo na ang depreciation ng asset para sa buwan.",
        ],
      },
      {
        title: "Hindi nagpi-print / putol ang resibo",
        steps: [
          "Siguraduhing naka-on ang printer, may papel, at napili ang printer sa print dialog ng browser.",
          "I-set ang lapad ng papel (58mm/80mm) sa Setting → Negosyo at Buwis → Printer, saka \"I-save para sa Computer na Ito\".",
        ],
      },
      {
        title: "Hindi pa kumpirmado ang bayad sa QRIS",
        steps: [
          "Suriin ang bank/QRIS app ng outlet — siguraduhing talagang pumasok ang pera (huwag umasa lang sa screenshot ng transfer mula sa customer).",
          "Kapag pumasok na, pindutin ang \"Markahang Natanggap\" at ilagay ang reference number.",
        ],
      },
      {
        title: "Wala ang button na kailangan ko",
        steps: [
          "Maaaring walang pahintulot ang tungkulin mo. Ang permanenteng pagbura, pagpalit ng puntos, at setting ng pahintulot ay Superuser lang.",
          "Maaaring naka-off ang module — suriin ang Setting → Feature Management (Superuser).",
          "Nalilito pa rin? Magpadala ng screenshot sa Customer Service.",
        ],
      },
      {
        title: "Hindi makapagtala ng journal noong nakaraang buwan",
        steps: [
          "Naisara na ang buwang iyon sa Accounting → Close Period. Itala ang pagtatama na may petsa ngayong araw, o hilingin sa Owner/Accountant na buksan ulit ang period kung talagang kailangan lang.",
        ],
      },
    ],
    notes: ["Hindi pa rin naayos? Buksan ang Customer Service, ipaliwanag ang mga nasubukan mo na, at maglakip ng larawan/video ng screen."],
  },
  {
    id: "kamus-istilah",
    group: "bantuan",
    label: "Glosaryo",
    summary: "Maiikli at simpleng paliwanag ng mga salitang madalas mong makikita sa NEXBILL.",
    subsections: [
      {
        title: "Operasyon",
        steps: [
          "Session — isang paupa sa isang unit, mula Simula hanggang Tapusin ang Session.",
          "Unit / Station / Booth — isang set ng PlayStation + TV na pinapaupahan.",
          "Package — fixed na presyo para sa takdang tagal (hal. 3 oras Rp45,000).",
          "Magdagdag ng Oras — pagdaragdag ng oras ng laro sa tumatakbong session.",
          "DP (down payment) — bahagyang bayad sa simula.",
          "Reservation / Booking — pag-reserve ng unit para sa takdang oras. Waiting List = pila kapag nagbabanggaan ang oras. No-show = hindi dumating ang customer.",
          "F&B — pagkain at inumin.",
          "KDS / Kitchen Display — ang screen ng order sa kusina.",
          "Split payment — isang bill na binayaran gamit ang higit sa isang paraan.",
          "Void — pagkansela ng transaksyong mali ang pagkaka-input. Refund — pagbabalik ng pera sa customer.",
        ],
      },
      {
        title: "Cashier at shift",
        steps: [
          "Shift — ang panahong responsable ang isang cashier sa cash drawer.",
          "Panimulang cash — ang cash sa drawer pagbukas ng shift.",
          "Inaasahang cash — ang cash na dapat nasa drawer ayon sa talaan ng transaksyon.",
          "Diperensya — ang pisikal na bilang bawas ang inaasahang cash. Negatibo = kulang ang cash.",
          "Cash deposit — cash sa drawer na iniabot sa may-ari/safe/bangko.",
          "Cash transfer — paglipat ng pera sa pagitan ng mga lokasyon ng cash.",
          "Sinusubaybayang balanse — balanse ng e-wallet/deposit na sinusuri sa bawat pagsasara ng shift.",
        ],
      },
      {
        title: "Stock",
        steps: [
          "SKU — natatanging code ng produkto.",
          "Cost Price / COGS — ang gastos para makuha ang isang nabentang produkto.",
          "Recipe / BOM — listahan ng sangkap para sa isang menu.",
          "PO (Purchase Order) — order sa supplier.",
          "Stock count — pagbilang ng pisikal na stock at pagtutugma nito sa sistema.",
          "Waste — mga sira/itinapong item.",
          "Weighted average / FIFO — mga paraan ng pag-compute ng cost price kapag nagbabago ang presyo ng pagbili.",
        ],
      },
      {
        title: "Pananalapi at accounting",
        steps: [
          "Journal — ang accounting na talaan ng bawat transaksyon (debit at credit).",
          "COA (Chart of Accounts) — listahan ng mga account sa bookkeeping, hal. Cash, Kita sa Rental, Gastos sa Kuryente.",
          "Receivable (AR) — perang utang pa ng customer sa outlet.",
          "Payable (AP) — perang utang pa ng outlet sa supplier.",
          "Income Statement — kita bawas ang gastos sa isang period.",
          "Balance Sheet — posisyon ng ari-arian, utang, at kapital sa isang petsa.",
          "Cash Flow — perang talagang pumapasok at lumalabas.",
          "Opening balance — ang posisyong pinansyal nang magsimula kang gumamit ng NEXBILL.",
          "Close period — pag-lock ng buwan para hindi na magbago ang report nito.",
          "Break-even / sales target — ang pinakamababang kita para hindi malugi ang negosyo.",
          "Cost center — grupo ng gastos kada bahagi ng negosyo.",
        ],
      },
      {
        title: "Asset",
        steps: [
          "Fixed asset — capital item na ginagamit nang higit sa isang taon (PS, TV, upuan).",
          "Acquisition cost — presyo ng pagbili ng asset kasama ang pagpapadala/pag-install.",
          "Useful life — tantiyang tagal ng paggamit ng asset (buwan).",
          "Salvage value — tantiyang presyo ng pagbenta ng asset kapag natapos ang useful life nito.",
          "Depreciation — buwanang pagbaba ng halaga ng asset dahil sa paggamit.",
          "Book value — acquisition cost bawas ang kabuuang depreciation.",
          "Disposal — naibenta, sirang-sira, o nawala ang asset.",
        ],
      },
      {
        title: "Device at sistema",
        steps: [
          "NexbillAgent — maliit na app sa PC ng cashier na kumokontrol sa Android TV.",
          "Smart plug — matalinong saksakan na nagbubukas/nagsasara ng kuryente ng TV mula sa malayo.",
          "Relay Agent / token — ang ugnayan at lihim na susi sa pagitan ng NEXBILL at NexbillAgent.",
          "TV Screensaver — ang promo display sa Android TV kapag hindi ginagamit ang unit.",
          "Drift — kusang gumagalaw ang analog ng controller kahit hindi hinahawakan.",
          "Superuser — ang pinakamataas na account, kayang i-setup ang lahat kasama ang pahintulot ng mga tungkulin.",
          "Feature Management — kung saan ino-on/off ang mga dagdag na module.",
        ],
      },
    ],
  },
];
