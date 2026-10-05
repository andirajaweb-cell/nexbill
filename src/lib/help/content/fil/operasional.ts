import type { HelpCategory } from "../../types";

export const OPERASIONAL: HelpCategory[] = [
  {
    id: "sop-harian",
    group: "operasional",
    label: "Pang-araw-araw na SOP (Checklist ng Pagbubukas–Pagsasara)",
    summary:
      "Iisang checklist ng trabaho araw-araw para sa bawat staff, anuman ang iskedyul — mula pagbubukas hanggang pagpapasa ng gawain. I-print at idikit sa mesa ng cashier kung makakatulong.",
    subsections: [
      {
        title: "Checklist ng pagbubukas",
        steps: [
          "Suriin na normal na bumubukas ang bawat PS unit, kumpleto at gumagana ang mga controller, malinaw ang mga TV. Kahina-hinalang controller: suriin gamit ang Controller Doctor (Maintenance → Gamepad Tester).",
          "Kung gumagamit ng awtomatikong kontrol ng TV, siguraduhing \"online\" ang mga device sa page na Kontrol ng Device at naka-on ang PC ng cashier na nagpapatakbo ng NexbillAgent.",
          "Suriin na naka-on ang receipt printer at may sapat na papel.",
          "Buksan ang Pagpapareserba — tingnan ang mga reservation ngayong araw.",
          "Buksan ang Notification (icon ng kampanilya) — paubos na stock, mga gastos na naghihintay ng apruba, anunsyo mula sa NEXBILL.",
          "Magbukas ng bagong Shift na ang Panimulang Cash ay tugma sa perang talagang nasa drawer.",
        ],
      },
      {
        title: "Habang bukas",
        steps: [
          "Customer na walang reservation → magsimula ng session sa Upa ng PS. May reservation → mag-check-in gamit ang booking code.",
          "Pagkain/inumin para sa customer na naglalaro → +F&B sa session card nila. Mamimiling hindi naglalaro → sa Cashier (POS).",
          "Bantayan ang Live Billing Board para sa mga session na malapit nang matapos at mag-alok ng extension bago maubos ang oras.",
          "Maliliit na gastos → itala agad sa Gastos → Mabilisang Cash Out.",
          "Sirang unit/controller → alisin sa paupahan (I-set sa Maintenance) at gumawa ng ticket sa menu na Maintenance.",
          "Kailangang kanselahin ang transaksyon pero walang pahintulot → hilingin sa Staff at Access → Apruba; huwag humanap ng ibang paraan.",
        ],
      },
      {
        title: "Checklist ng pagsasara / katapusan ng shift",
        steps: [
          "Tapusin ang bawat session na umalis na ang customer at ayusin ang bayad.",
          "Bilangin ang drawer ayon sa denominasyon sa form na Isara ang Shift — huwag munang silipin ang numero ng sistema.",
          "Ilagay ang balanseng nakikita sa bawat non-cash app (QRIS/e-wallet) sa oras na iyon.",
          "Isara ang shift; isulat sa tala ang dahilan ng anumang diperensya.",
          "Patayin ang mga TV at unit na hindi ginagamit, ayusin ang mga controller at accessories, i-lock ang drawer.",
        ],
      },
      {
        title: "Pagpapasa sa susunod na shift / manager",
        steps: [
          "Ipasa: mga hindi pa bayad na bill na \"bayad mamaya\" (suriin sa Transaksyon), paubos na stock, mga unit/device na may problema (siguraduhing may Maintenance ticket), at anumang diperensya ng cash.",
          "Sabihan ang may awtoridad tungkol sa mga kahilingan ng apruba na naghihintay pa.",
        ],
      },
    ],
    notes: ["Nasa kanya-kanyang paksa ang detalye ng bawat feature na nabanggit dito (Upa ng PS, Cashier, Shift at Cashier, atbp.)."],
  },
  {
    id: "ringkasan",
    group: "operasional",
    label: "Buod na Dashboard (Home Page)",
    navHint: "Ang pinakataas na menu sa sidebar — ang page na bumubukas pagka-log in.",
    summary:
      "Ang pangunahing screen ng pagbabantay: kita at tubo ngayong araw, bilang ng transaksyon, status ng PS unit, posisyon ng cash, chart ng oras ng dagsa vs tahimik, mga pinakaproduktibong unit, pinakamabentang produkto, at paubos na stock — lahat sa iisang page.",
    subsections: [
      {
        title: "Pagbasa ng mga card ng numero",
        steps: [
          "Break-even Target Ngayong Araw: ang buwanang target mula sa Setting na hinati nang pantay kada araw — ipinapakita ang porsyentong naabot o ang kulang pa.",
          "Kita at Tubo: kabuuang kita ngayong araw (rental, pagkain/inumin, ibang produkto), gastos ngayong araw, gross profit, at tantiyang net profit.",
          "Transaksyon at Customer: bilang ng balidong transaksyon (kapareho ng page na Transaksyon), customer ngayong araw, bagong member, at reservation ngayong araw.",
          "Status ng PS Unit: ilan ang ginagamit, bakante, naka-reserve, nasa maintenance, at ang utilization rate sa porsyento.",
          "Cash at Pananalapi: cash na pumasok at lumabas ngayong araw, balanse ng cash, balanse sa bangko, receivable (hindi pa bayad na bill ng customer), at payable sa supplier.",
        ],
      },
      {
        title: "Chart ng Oras ng Dagsa vs Tahimik",
        steps: [
          "Ipinapakita ang average na bilang ng transaksyon kada araw sa bawat oras, batay sa huling 30 araw.",
          "Berdeng bar = pinakamataong oras, dilaw na bar = pinakatahimik na oras sa loob ng oras ng operasyon. Ang abong bar = labas sa oras ng operasyon (paminsan-minsang transaksyon lang) at hindi nira-rank.",
          "I-hover/i-tap ang bar para makita ang average kada araw at kabuuan sa 30 araw ng oras na iyon.",
          "Gamitin ito sa pagplano ng staff kada oras at paggawa ng espesyal na promo sa tahimik na oras.",
        ],
      },
      {
        title: "Mga listahan sa ibaba",
        steps: [
          "Kita kada PS Unit (ngayong araw) at ang pinakaproduktibong unit.",
          "Pinakamabentang Produkto Ngayong Araw at Pinakamadalas Laruing Laro (ilagay ang pangalan ng laro kapag nagsisimula ng session para mapuno ang listahang ito).",
          "Paubos na Stock: mga produktong mas mababa sa minimum na stock.",
          "Reconciliation ng Kita: ikinukumpara ang kita ayon sa petsa ng transaksyon sa kita sa Income Statement — kung may diperensya, suriin ang Accounting → Reconciliation.",
        ],
      },
    ],
    notes: [
      "Ang \"ngayong araw\" ay kinukuwenta ayon sa time zone ng outlet (hal. WIB), hindi ng server.",
      "Ang tubo sa page na ito ay tantiya kada araw. Para sa opisyal na buwanang numero, gamitin ang Accounting → Income Statement.",
    ],
  },
  {
    id: "rental-ps",
    group: "operasional",
    label: "Upa ng PS (Laro sa Loob)",
    summary:
      "Ang pangunahing page para magsimula, mamahala, at tumapos ng rental session ng PlayStation kada unit — kasama ang pagdagdag ng oras, paglipat ng unit, pagdagdag ng pagkain/accessories, kontrol ng TV, at pagbabayad.",
    subsections: [
      {
        title: "Pagsisimula ng bagong session",
        steps: [
          "Sa panel na \"BAGONG SESSION\", pumili ng bakanteng unit (hindi lumalabas ang mga unit na ginagamit o inaayos).",
          "Piliin ang Package (fixed na presyo mula sa Promo at Package) o Kada Oras. Para sa Kada Oras, pumili ng tagal (hal. 60 minuto) o \"Open\" (tuloy-tuloy ang oras hanggang ihinto).",
          "Ilagay ang customer: Hindi Member (i-type ang kahit anong pangalan) o Member (i-type ang pangalan/telepono at pumili sa resulta — awtomatikong nalalapat ang presyo at puntos ng member).",
          "Opsyonal: ilagay ang larong nilalaro, at i-tick ang \"Magbabayad Muna ang Customer (DP)\" kung magbabayad ang customer sa simula.",
          "Pindutin ang SIMULAN ANG SESSION. Kung naka-link ang unit sa kontrol ng TV, kusang bubukas ang TV at lilipat sa PlayStation.",
        ],
      },
      {
        title: "Habang tumatakbo ang session",
        steps: [
          "Ipinapakita ang bawat unit bilang card na may countdown at breakdown ng tumatakbong singil.",
          "Pause/Ituloy: pansamantalang pinapahinto ang timer (hal. brownout, lumabas sandali ang customer).",
          "Magdagdag ng Oras: magdagdag ng +10 hanggang +120 minuto.",
          "Ilipat ang Unit: ilipat ang session sa ibang bakanteng unit — kasama ang oras at bill.",
          "+ Accessories: magpaupa ng dagdag na controller/VR/headset, sinisingil kada oras mula nang idagdag. Pindutin ang \"Ibalik\" para ihinto ang singil.",
          "+ F&B: magdagdag ng pagkain/inumin sa bill ng session na ito — direktang napupunta ang order sa Kitchen Display.",
          "TV On / TV Off: buksan/isara ang TV ng unit na ito (kailangan ng device na naka-link sa Kontrol ng Device).",
        ],
      },
      {
        title: "Pagtatapos ng session at pagtanggap ng bayad",
        steps: [
          "Pindutin ang \"Tapusin ang Session at Magbayad\". Lalabas ang huling bill: rental + accessories + pagkain/inumin.",
          "Opsyonal: maglagay ng Discount, i-tick ang Buwis, o ilagay ang voucher/reward code ng customer.",
          "Ilagay ang halagang ibinayad (default: buong balanse), piliin ang paraan ng pagbabayad, pindutin ang Magbayad.",
          "Ang cash ay bayad agad. QRIS/transfer/e-wallet: magbabayad ang customer sa QRIS/account ng outlet na nakikita sa screen, saka pindutin ang \"Markahang Natanggap\" kapag pumasok na ang pera at ilagay ang reference number kung mayroon.",
          "Puwedeng bayaran ang bahagi gamit ang isang paraan at ang natitira sa iba (split payment).",
          "Magbabayad mamaya ang customer? Pindutin ang \"Isara (bayad mamaya sa POS)\" — mase-save ang bill at mababayaran mula sa Cashier (POS) o Transaksyon.",
          "I-print ang resibo mula sa card ng tapos na session.",
        ],
      },
      {
        title: "Pamamahala ng PS unit",
        steps: [
          "Pindutin ang \"Pamahalaan ang Unit\" para magdagdag/mag-edit ng unit: pangalan, console, uri ng TV, rate kada oras.",
          "I-set sa Maintenance: pansamantalang alisin ang unit sa paupahan (hindi puwede habang ginagamit).",
          "I-deactivate: i-archive ang unit na hindi na ginagamit — nananatili ang kasaysayan nito.",
          "Ang mga unit na lumampas sa limitasyon ng serbisyo ang oras ng paggamit (sine-set sa Setting → Notification → Predictive na Maintenance ng Unit) ay may badge na \"kailangan ng serbisyo\".",
        ],
      },
    ],
    notes: [
      "Ang mga session na may takdang tagal ay kusang humihinto kapag naubos ang oras — pero kailangan pa ring tapusin ng cashier ang pagbabayad.",
      "Tumutunog ang alarma nang isang beses kapag 5 minuto na lang ang natitira.",
      "Lahat ng staff na naka-log in ay puwedeng magsimula at tumapos ng session.",
    ],
  },
  {
    id: "billing-board",
    group: "operasional",
    label: "Live Billing Board (Monitor Screen)",
    summary:
      "Isang espesyal na screen para bantayan nang live ang bawat tumatakbong session — mainam sa pangalawang TV/monitor sa lugar ng cashier. Pantingin lang, walang action button.",
    steps: [
      "Buksan ang Live Billing Board sa dagdag na screen at iwanang bukas.",
      "Nagre-refresh ang page kada 3 segundo.",
      "Ipinapakita ng bawat card: pangalan ng unit at console, status na naglalaro/naka-pause, customer at laro, lumipas na oras, mga extension, at breakdown ng singil.",
      "Mga kahon ng buod sa itaas: aktibong session, naglalaro vs naka-pause, order ng pagkain na inaasikaso, at kabuuang tumatakbong bill.",
    ],
    notes: ["Lahat ng aksyon (magbayad, magdagdag ng oras, atbp.) ay ginagawa pa rin sa page na Upa ng PS."],
  },
  {
    id: "booking",
    group: "operasional",
    label: "Pagpapareserba (Reservation)",
    summary:
      "Pamahalaan ang mga advance reservation — itala ang booking, tumanggap ng online booking mula sa customer, mabilisang check-in gamit ang code, maglipat ng unit, at markahan ang no-show.",
    subsections: [
      {
        title: "Pagtatala ng bagong reservation",
        steps: [
          "Ilagay ang pangalan at numero ng telepono ng customer.",
          "Pumili ng partikular na unit, o \"Kahit anong unit\" + uri ng console.",
          "Ilagay ang oras ng simula at pagtatapos, opsyonal na down payment (DP) at tala, saka pindutin ang \"Gumawa ng Reservation\".",
          "Kung nagbabanggaan ang oras, awtomatikong mapupunta ang reservation sa Waiting List at ipapakita ang puwesto nito.",
          "Booking Map (default na view): isang row bawat unit, oras mula 08:00 hanggang 08:00 kinabukasan, pulang linya = ngayon. Kulay ng block = status. I-click ang block para sa detalye at aksyon; i-click ang bakanteng bahagi para punan ang booking form sa unit at oras na iyon.",
        ],
      },
      {
        title: "Online booking ng customer",
        steps: [
          "I-on ang \"tumanggap ng online booking\" at kopyahin ang link ng booking page ng outlet sa Setting → Negosyo at Buwis → Pagpapareserba / Reservation.",
          "I-share ang link sa WhatsApp, Instagram, o Google Maps. Makikita ng customer ang mga bakanteng unit, pipili ng oras, at makakakuha ng booking code.",
          "I-set ang pagitan ng mga reservation, ang deadline ng check-in (awtomatikong pinapakawalan ang mga no-show), at ang pinakamaikling oras bago maglaro na puwede pang mag-book.",
          "Ang mga promo banner sa booking page ay sine-set sa Setting → Mga Ad Banner.",
          "Kapag nag-book ang customer online o sa WhatsApp, lalabas ang pop-up na \"May bagong booking!\" sa kahit anong page ng dashboard (may tunog): Kumpirmahin, Tingnan sa Booking Map, o i-WhatsApp ang customer.",
        ],
      },
      {
        title: "Pagdating ng customer at iba pang aksyon",
        steps: [
          "I-type ang booking code (hal. BK-00001) sa search box sa itaas → pindutin ang Enter/\"Hanapin at Check-in\".",
          "Kumpirmahin: aprubahan ang reservation na pending o nasa waiting list.",
          "QR: ipakita sa customer ang QR code ng reservation.",
          "Ilipat ang Unit: ilipat ang reservation sa ibang unit (opsyonal ang dahilan).",
          "No-show: markahan ang customer na hindi dumating. Kanselahin: kanselahin ang reservation (kailangan ng dahilan).",
        ],
      },
    ],
    notes: [
      "Hindi pa aktibo sa ngayon ang awtomatikong paalala sa WhatsApp sa customer — kontakin ang customer nang mano-mano gamit ang numero sa reservation kung kailangan.",
      "Ipinapakita ng may kulay na label kung saan galing ang reservation: Cashier (itinala ng staff), Online (booking page), o WhatsApp.",
    ],
    roles: "Magtala/magkumpirma/mag-check-in/magkansela: Owner, Superuser, Manager, Supervisor, Cashier. Pag-undo ng No-show: Owner/Superuser.",
  },
  {
    id: "pos",
    group: "operasional",
    label: "Cashier (POS) — Pagbebenta ng Pagkain, Inumin at Paninda",
    summary:
      "Para magbenta ng produkto (pagkain, inumin, paninda) sa mamimiling hindi umuupa — o bayaran ang mga bill na naka-save bilang \"bayad mamaya\". Ang oras ng laro sa PS ay hindi ibinebenta rito, kundi sa Upa ng PS.",
    subsections: [
      {
        title: "Pagbebenta ng produkto",
        steps: [
          "I-click ang produkto sa listahan (naka-grupo ayon sa kategorya), o i-type ang pangalan/i-scan ang barcode sa search box. Kung iisa lang ang tugmang produkto, pindutin ang Enter at direkta itong papasok sa cart.",
          "Walang scanner? Pindutin ang \"Camera scan\" sa tabi ng search box at itutok ang camera ng phone/laptop sa barcode — direktang papasok sa cart ang produkto, puwedeng sunod-sunod. Member card: i-scan ang QR nito sa Rental PS (Member mode) — nasa Membership → detalye ng member ang QR.",
          "I-set ang dami gamit ang +/- button sa cart.",
          "Opsyonal: maglagay ng Discount, maglagay ng voucher code (pindutin ang Suriin), i-tick ang Buwis/Service Charge.",
          "Piliin ang paraan ng pagbabayad at pindutin ang Magbayad.",
          "Cash: tanggapin ang pera, pindutin ang \"Kumpirmahin na Natanggap ang Cash\". QRIS/transfer: ipakita ang QRIS/account ng outlet sa screen, hintayin ang pera, saka markahang natanggap.",
          "Pindutin ang I-print ang Resibo.",
        ],
      },
      {
        title: "Mga bukas na bill (Open Orders)",
        steps: [
          "Ang mga hindi pa bayad na bill (hal. mula sa rental session na naka-save bilang \"bayad mamaya\") ay lumalabas sa Open Orders.",
          "Hatiin: hatiin ang isang bill sa ilang bahagi (hal. magkakaibigang magkakahiwalay magbayad).",
          "Pagsamahin: i-tick ang 2 o higit pang bill at pindutin ang \"Pagsamahin ang N Order\" para sabay silang bayaran.",
        ],
      },
    ],
    notes: [
      "Naka-save ang cart sa browser — hindi ito nawawala kahit lumipat ng menu o mag-refresh.",
      "Ang mga produkto sa kategoryang \"Paupahang Device\" ay hindi lumalabas dito dahil bahagi sila ng Home Rental.",
      "Nililimitahan ang manual discount ng cashier ng setting ng may-ari sa Setting → Mga Kagustuhan.",
    ],
  },
  {
    id: "kitchen",
    group: "operasional",
    label: "Kitchen Display",
    summary:
      "Isang board ng order sa kusina na walang papel: lahat ng order ng pagkain/inumin mula sa Cashier at sa rental session ay lumalabas dito, sa 4 na column ayon sa yugto.",
    steps: [
      "Pumapasok ang bagong order sa column na Bago kasama ang alarma.",
      "Ayos ng button: Kumpirmahin → Simulang Magluto → Handa nang Ihain → Naihatid (aalis sa board).",
      "Ang mga order sa column na Bago ay puwedeng kanselahin gamit ang Kanselahin at dahilan (hal. \"Ubos ang sangkap\").",
      "Ang 🔊/🔇 button ay nagbubukas/nagsasara ng tunog. Pinapanatili ng \"I-enable ang Browser Notification\" na lumalabas ang mga order kahit nasa ibang app ang screen.",
    ],
    notes: [
      "Awtomatikong nagre-refresh ang board kada ilang segundo.",
      "Ang mga order na kakagiging \"Handa\" ay may ibang tunog para malaman ng waiter na ihahatid na ang mga ito.",
      "Tingnan din ang \"Staff ng Kusina Ako\" sa grupong Gabay ayon sa Tungkulin.",
    ],
  },
  {
    id: "shift",
    group: "operasional",
    label: "Shift at Cashier (Cash Drawer)",
    summary:
      "Magbukas ng shift na may panimulang cash, magtala ng cash deposit o transfer, saka isara ang shift sa pagbilang ng cash ayon sa denominasyon. Ikinukumpara ng sistema ang bilang mo sa talaan ng transaksyon kaya agad makikita ang anumang diperensya ng cash.",
    subsections: [
      {
        title: "Pagbubukas ng shift",
        steps: [
          "Bilangin muna ang cash na nasa drawer ngayon, ilagay ito bilang Panimulang Cash, saka pindutin ang Buksan ang Shift.",
          "Kung iba ito sa cash na iniwan ng nakaraang shift, hihingi ang sistema ng dahilan (hal. \"kinuha ng may-ari ang Rp100,000 pamalengke\") at ifa-flag ito para suriin.",
          "Sa default, isang shift lang ang puwedeng bukas kada outlet, para malinaw kung kanino ang bawat diperensya. Ang mga outlet na may ilang drawer ay puwedeng payagan ang maraming shift sa Setting → Mga Kagustuhan.",
        ],
      },
      {
        title: "Habang may shift",
        steps: [
          "Lahat ng bayad na cash (rental, cashier, PPOB, membership, iba pang kita) ay awtomatikong nabibilang sa cash ng bukas na shift.",
          "Magtala ng Cash Deposit: kapag ibinigay ang cash sa drawer sa may-ari, sa safe, o idineposito sa bangko.",
          "Humiling ng Cash Transfer: kapag lumipat ang pera sa pagitan ng mga lokasyon ng cash (hal. dagdag na panukli mula sa Main Cash papunta sa drawer). Nakatago sa page na ito ang kasaysayan ng deposit at transfer.",
        ],
      },
      {
        title: "Pagsasara ng shift",
        steps: [
          "Ilagay ang bilang ng papel/barya para sa bawat denominasyon — awtomatikong kinukuwenta ang kabuuan. Huwag munang tingnan ang numero ng sistema (\"blind\" na pagbilang).",
          "Punan ang Pagsuri ng Non-Cash na Balanse: buksan ang bawat e-wallet app o deposit balance na ginamit at ilagay ang balanseng nakikita sa oras na iyon.",
          "Ilagay ang cash na maiiwan sa drawer para sa susunod na shift; ituturing na naibigay sa may-ari/safe ang natitira.",
          "Magdagdag ng tala kung may alam na diperensya, saka pindutin ang Isara ang Shift.",
          "Ipinapakita ng Buod ng Pagsasara ng Shift: Panimulang Cash, Cash na Pumasok, Cash na Lumabas, Inaasahang Cash (dapat nandoon), ang bilang mo, at ang Diperensya. Pula = kulang, dilaw = sobra.",
        ],
      },
      {
        title: "Pagsasara ng shift ng ibang cashier",
        steps: [
          "Kung umalis ang cashier nang hindi isinasara ang shift, puwede itong isara ng supervisor: bilangin nang pisikal ang drawer at isulat ang dahilan (kailangan).",
          "Itinatala ang pagsasarang ito sa ilalim ng nagsara at ifa-flag para suriin.",
        ],
      },
      {
        title: "Mga channel ng deposit balance (non-cash)",
        steps: [
          "Ang mga balanseng dapat suriin sa bawat pagsasara ng shift (hal. PPOB Deposit Balance). Ang built-in na channel ay puwedeng palitan ng pangalan pero hindi mabubura.",
          "Magdagdag ng bagong channel sa pag-type ng pangalan at pagpindot ng \"Magdagdag ng Channel\" — awtomatikong nagagawa ang accounting account nito.",
        ],
        notes: ["Ang bahaging ito ay nakikita lang ng Owner, Superuser, at Accountant."],
      },
    ],
    notes: [
      "Ang mga shift na lumampas sa threshold (Setting → Mga Kagustuhan) ang diperensya o bilang ng void/refund ay awtomatikong naka-flag para suriin ng Owner/Manager. Maisasara pa rin ng cashier ang shift.",
      "Ang iminumungkahing Panimulang Cash ay mula sa mga cash account na naka-tick sa Setting → Mga Kagustuhan → Komposisyon ng Panimulang Cash ng Shift. Mungkahi lang ito — laging ilagay ang pisikal na cash.",
    ],
  },
  {
    id: "devices",
    group: "operasional",
    label: "Kontrol ng Device (TV at Smart Plug)",
    summary:
      "Buksan/isara ang mga TV at console mula sa dashboard, at hayaang kusang bumukas/sumara ang TV ayon sa session. Ang Android TV ay kinokontrol sa NexbillAgent app sa PC ng cashier; ang karaniwang TV (analog o smart TV na hindi Android) sa smart plug.",
    subsections: [
      {
        title: "Pagpili ng tamang paraan ng kontrol",
        steps: [
          "Android TV / Google TV → gamitin ang NexbillAgent (walang dagdag na hardware). Kusang bumubukas, sumasara, at lumilipat ang TV sa HDMI ng PlayStation.",
          "Analog/tube TV, karaniwang digital TV, at smart TV na hindi Android (Viva OS, Hisense OS, webOS, atbp.) → kailangan ng smart plug na pumuputol/nagbabalik ng kuryente nila.",
          "Kung may unit ang outlet na may TV na hindi Android at hindi pa naka-link sa smart plug, may babala sa page na ito at button na \"Tingnan ang Rekomendadong Smart Plug\" papunta sa angkop na produkto.",
        ],
      },
      {
        title: "Android TV sa NexbillAgent (5 hakbang, minsan kada outlet)",
        steps: [
          "Hakbang 1 — Humingi ng Token: pindutin ang \"Humingi ng Relay Agent Token\". Sasagot ang team ng NEXBILL ng lihim na token sa menu na Customer Service.",
          "Hakbang 2 — I-download ang NexbillAgent at i-extract sa PC ng cashier (Windows). Basahin ang \"Kumpletong Gabay sa NexbillAgent\" — may 6 na wika, sakop ang setup ng PC at TV, paano i-lock ang IP ng TV, at 28 karaniwang problema at solusyon.",
          "Hakbang 3 — Patakbuhin ang NexbillAgent at i-paste ang token.",
          "Hakbang 4 — Ihanda ang bawat TV (minsan kada TV): ikonekta sa parehong WiFi, i-enable ang mga opsyong hinihingi ng gabay, i-lock ang IP nito.",
          "Hakbang 5 — Idagdag ang TV sa page na ito (ilagay ang IP ng TV) at i-link sa rental unit nito.",
        ],
      },
      {
        title: "Mga smart plug",
        steps: [
          "Opisyal na smart plug ng NEXBILL: ilagay ang serial number na nakaprint sa label sa bahaging \"I-claim ang NEXBILL Smart Plug\" — wala nang ibang setup.",
          "Tasmota: ilagay ang pangalan ng device at MQTT topic.",
          "Tuya / Smart Life: bawat outlet ay gumagamit ng sariling Tuya Cloud API account — puwedeng higit sa isa. Magdagdag ng account (Access ID at Secret) sa Setting → Negosyo at Buwis → Tuya Cloud API Integration, saka idagdag ang mga device gamit ang Device ID nila. Kung ilan ang account, iwanang \"Awtomatiko\" ang pagpili ng account: hahanapin ng sistema ang account na may-ari ng Device ID na iyon.",
          "Pagkatapos idagdag, i-link ang device sa unit sa table na \"I-link ang Device sa Rental Unit\".",
        ],
        notes: [
          "Mga 8 device lang ang kayang kontrolin ng libreng Tuya Cloud account (Trial) at kailangan itong i-extend mga isang beses kada buwan sa iot.tuya.com (Service API → IoT Core → Extend Trial). Mas marami ang smart plug mo? Gumawa ng pangalawang Tuya Cloud account (ibang email), i-link dito ang ilang smart plug, saka idagdag bilang bagong account sa Setting. Kapag nakalimutang i-extend ang isang account, titigil tumugon ang lahat ng smart plug sa account na iyon — ilagay sa kalendaryo ang petsa ng extension ng bawat account.",
          "Habang nasa trial ng subscription, hindi pa makakapagdagdag ng smart plug at limitado sa 1 unit ang kontrol ng Android TV.",
        ],
      },
      {
        title: "Pang-araw-araw na paggamit",
        steps: [
          "Lahat ng staff ay puwedeng pumindot ng Buksan/Isara sa device card, o TV On/TV Off sa session card sa Upa ng PS.",
          "Ipinapakita sa page na ito ang online/offline na status ng bawat device. Ang mga offline na device ay mabubuksan pa rin nang mano-mano gamit ang remote.",
          "Sa pinakabagong NexbillAgent, kusang lumilipat ang TV sa PlayStation kapag nagsimula ang session at sa TV Screensaver kapag natapos (tingnan ang paksang TV Screensaver).",
        ],
      },
    ],
    roles: "Magbukas/magsara: lahat ng staff. Magdagdag/mag-edit/magbura/mag-link ng device: Owner, Superuser, Manager, Supervisor.",
  },
  {
    id: "qr-pelanggan",
    group: "operasional",
    label: "Customer QR sa Bawat Booth at Alerto ng Oras sa TV",
    navHint: "Upa ng PS → Pamahalaan ang Unit → Customer QR",
    summary:
      "May QR sticker ang bawat booth. Ini-scan lang ito ng customer gamit ang phone para makita ang natitirang oras at tantiyang bill, mag-order ng pagkain/inumin, humiling ng dagdag na oras, o tawagin ang cashier — nang hindi pumupunta sa counter. Lahat ng hiling ay papasok sa panel na Mga Hiling ng Customer sa Upa ng PS at gagana lang kapag tinanggap ng cashier. Kaya ring magpakita ng Android TV ng alerto sa natitirang oras at screen na Ubos na ang Oras.",
    subsections: [
      {
        title: "Paglalagay ng QR sa booth",
        steps: [
          "Buksan ang Upa ng PS → Pamahalaan ang Unit → pindutin ang \"Customer QR\" sa unit. Awtomatikong nagagawa ang QR.",
          "Pindutin ang \"I-print ang sticker ng lahat ng unit\" para i-print nang sabay-sabay ang QR ng lahat ng unit, gupitin, at idikit malapit sa TV ng bawat booth.",
          "I-set ang pahintulot sa parehong window: payagan ang F&B order mula sa phone, payagan ang hiling na dagdag na oras mula sa phone. Laging naka-on ang pagtawag sa cashier.",
          "Kapag kinunan ng litrato at inabuso ang QR, pindutin ang \"Palitan ang QR\" — agad na hindi na gagana ang lumang sticker; i-print ang bago.",
        ],
      },
      {
        title: "Ang magagawa ng customer mula sa phone",
        steps: [
          "Makita ang natitirang oras ng laro (tumatakbo bawat segundo) at ang tantiyang bill. May alerto kapag 5 minuto o mas kaunti na lang.",
          "Mag-order ng pagkain/inumin: pumili ng menu, i-set ang dami, ipadala. Galing sa data ng produkto ang presyo, hindi sa phone.",
          "Humiling ng dagdag na oras: +30/+60/+90/+120 minuto, may tantiyang gastos.",
          "Tawagin ang cashier: humingi ng bill, problema sa controller, kailangan ng tulong, o iba pa (may opsyonal na tala). Makikita sa phone ang status ng bawat hiling: naghihintay, tinanggap, o tinanggihan kasama ang dahilan.",
        ],
      },
      {
        title: "Pagsagot sa mga hiling (cashier)",
        steps: [
          "Lumalabas ang mga bagong hiling sa panel na \"Mga Hiling ng Customer (Booth QR)\" sa itaas ng Upa ng PS, may tunog.",
          "F&B order: pindutin ang \"Tanggapin at idagdag sa bill\" — papasok ang mga item sa bill ng session at diretso sa Kitchen Display.",
          "Dagdag na oras: pindutin ang \"Tanggapin at magdagdag ng oras\" — hahaba ang session. Tawag sa cashier: puntahan ang booth, saka pindutin ang \"Naasikaso na\".",
          "Pindutin ang \"Tanggihan\" kapag hindi maibibigay (hal. ubos na ang menu); makikita sa phone ng customer ang dahilang ilalagay mo.",
        ],
      },
      {
        title: "Alerto sa natitirang oras at screen na Ubos na ang Oras sa TV",
        navHint: "Setting → TV Screensaver → Alerto sa Oras at Screen na Ubos na ang Oras",
        steps: [
          "Para lang sa Android TV na naka-on at na-verify ang automation (NexbillAgent v1.2).",
          "Alerto sa natitirang oras (naka-off sa default): ilang minuto bago matapos, saglit na lilipat ang TV sa malaking screen na \"NATITIRANG ORAS\" na may booth QR, saka kusang babalik sa HDMI ng PlayStation. I-set ang minuto at gaano katagal ito ipapakita.",
          "Screen na \"UBOS NA ANG ORAS\": kapag kusang huminto ang session at hindi pa bayad ang bill, iniimbitahan ng TV ang customer na magbayad sa cashier (walang halagang ipinapakita), hanggang mabayaran o sa loob ng 15 minuto.",
          "Isang beses kada session ipinapadala ang alerto at gagana ulit pagkatapos magdagdag ng oras.",
        ],
      },
    ],
    notes: [
      "Hindi kailanman binabago ng hiling mula sa phone ang bill nang mag-isa — ang cashier ang nagpapasya. Hindi matatanggap ang order para sa session na tapos na; asikasuhin ito sa Cashier.",
      "Hindi ipinapakita ng phone page ang pangalan o numero ng customer, at ginagamit nito ang wika ayon sa Bansa ng outlet.",
      "Nakadepende ang alerto sa TV at ang awtomatikong paghinto ng session sa scheduler ng NEXBILL na tumatakbo sa server.",
    ],
    roles: "Kayang sumagot sa mga hiling at magpakita/mag-print ng QR ang sinumang staff na naka-log in. Pagbago ng pahintulot sa QR at setting ng alerto sa TV: Owner, Superuser, Manager.",
  },
  {
    id: "tv-screensaver",
    group: "operasional",
    label: "TV Screensaver (Promo Screen sa Booth)",
    navHint: "Setting → TV Screensaver (i-on muna ang module sa Setting → Feature Management).",
    summary:
      "Kapag hindi ginagamit ang unit, ipinapakita ng Android TV sa booth ang pangalan ng outlet, presyo, QR para mag-book, orasan, at status ng unit (BAKANTE / natitirang oras) — at mabubuksan ito ng staff gamit ang PIN. Android TV lang; hindi suportado ang analog at smart TV na hindi Android.",
    subsections: [
      {
        title: "Pag-setup ng display",
        steps: [
          "Ilagay ang malaking Pamagat (hal. \"Gusto Mo Bang Maglaro?\"), linya ng console (hal. \"PS5 • PS4 • PS3\"), linya ng presyo (hal. \"Mula Rp5,000/oras\"), at dagdag na linya (promo, oras ng operasyon).",
          "I-set kung ilang minutong walang gumagamit bago lumabas ang screen.",
          "Piliin ang ipapakita: orasan at petsa, status ng unit, QR para mag-book, at pangalan ng WiFi (hindi kailanman ipinapakita ang password ng WiFi).",
          "Mag-set ng Staff PIN para staff lang ang makapagsara ng screen. Kung walang PIN, maisasara ito ng kahit sinong pumindot sa remote.",
          "Night Mode: padilimin ang screen sa ilang oras (max 90% — hindi kailanman ganap na itim ang screen para walang mag-akalang patay ang TV).",
        ],
      },
      {
        title: "Pag-install ng screen sa TV",
        steps: [
          "Sa \"Mga Naka-install na Screen\", magdagdag ng screen: bigyan ng pangalan at piliin ang rental unit (Android TV) — lalabas ang 6-digit na code.",
          "Sa TV, buksan ang browser at pumunta sa nexbill.id/tv.",
          "Ilagay ang 6-digit na code gamit ang mga number key ng remote. Agad makokonekta ang screen sa unit na iyon.",
          "Ulitin sa bawat TV. Ang screen na walang unit ay puwedeng gamitin para sa branding lang (hal. TV sa waiting area).",
        ],
      },
    ],
    notes: [
      "Dahan-dahang gumagalaw ang nilalaman para hindi magkaroon ng permanenteng burn-in ang panel ng TV.",
      "Kung sandaling mawala ang internet, ipapakita pa rin ng screen ang huling view at patuloy na susubok kumonekta ulit.",
      "Kuryente: ang TV na iniwang bukas ay nagdadagdag ng humigit-kumulang Rp25,000–50,000 kada TV kada buwan. Gamitin ang Night Mode o patayin ang TV sa labas ng oras ng operasyon.",
    ],
  },
  {
    id: "home-rental",
    group: "operasional",
    label: "Home Rental (Paupahang Iuuwi)",
    navHint: "Lumalabas sa sidebar kapag na-on ang module sa Setting → Feature Management (Superuser lang).",
    summary:
      "Hiwalay na module para magpaupa ng PS, Playbox, TV, at accessories na IUUWI ng customer — mula reservation, pag-abot na may deposit, hanggang pagbalik na may pagsuri ng kondisyon at rating ng customer.",
    subsections: [
      {
        title: "Pag-setup (minsan sa simula)",
        steps: [
          "Tab na Patakaran: i-set ang deposit, multa sa late, delivery fee ayon sa layo, patakaran sa sira, checklist ng pagbalik, at mga patakarang nakaprint sa resibo/kasunduan sa pag-upa.",
          "Tab na Katalogo ng Produkto: i-set ang rate kada 12 oras, kada araw, kada dagdag na araw, at kada linggo para sa bawat produkto.",
          "Tab na Asset: irehistro ang bawat pisikal na item kasama ang code nito (hal. PS5-001). Mga status ng asset: Bakante, Naka-reserve, Inihahanda, Nakapaupa, Dine-deliver, Ibinabalik, Sinusuri, Sira, Nawawala, Inaayos, Retirado.",
          "Tab na Package: pagsamahin ang ilang produkto sa isang package (hal. PS4 + 32\" TV).",
        ],
      },
      {
        title: "Paggawa ng reservation at pag-abot (checkout)",
        steps: [
          "Tab na Reservation → gumawa ng reservation: piliin ang customer, produkto/package, petsa ng simula at planong pagbalik. Ilagay ang layo mula sa tindahan kung ide-deliver (iwanang blangko para sa flat na delivery fee).",
          "Para sa beripikasyon, itala ang ID ng customer (national ID, o student ID kasama ang detalye ng magulang/tagapag-alaga para sa menor de edad).",
          "Awtomatikong kinukuwenta ang rate: ≤12 oras, kada araw, 2–3 araw (kada araw + dagdag na araw), 7 araw o higit pa ay gumagamit ng lingguhang rate.",
          "Pagdating ng customer/pagka-deliver ng item, gawin ang Checkout: naa-allocate ang mga asset, naitatala ang bayad at deposit. Siguraduhing nasuri ang checklist ng kagamitan (HDMI cable, charger, controller).",
          "Tab na Mapa ng Petsa: i-click ang petsa para makita ang lahat ng reservation sa araw na iyon.",
        ],
      },
      {
        title: "Pagbabalik",
        steps: [
          "I-tick ang bawat item sa checklist ng pagbalik (kailangan).",
          "Magbigay ng 1–5 star na rating at tala tungkol sa kondisyon ng item/ugali ng customer.",
          "May sira? Ilagay ang halaga ng sira — kinukuha muna ito sa deposit. Kung lumampas sa deposit, sisingilin ang natitira gamit ang napiling paraan ng pagbabayad.",
          "Late? Awtomatikong kinukuwenta ang multa ayon sa Patakaran.",
          "Pagkabalik, magiging Bakante ulit ang asset at maitatala ang status ng deposit: buong naibalik, may bahaging ibinawas, o na-forfeit.",
        ],
      },
      {
        title: "Panganib at Apruba",
        steps: [
          "Tingnan ang kasaysayan ng pag-upa at risk score ng bawat customer (mula sa kumpletong ID, kumpirmadong address at aktibong numero ng WhatsApp, late na pagbalik, no-show, sira/nawawalang item).",
          "Ang mga high-risk na reservation ay kailangang aprubahan muna — pindutin ang Aprubahan o Tanggihan.",
          "Ang mga problemadong customer ay puwedeng i-blacklist.",
        ],
      },
    ],
    notes: [
      "Lahat ng kita sa Home Rental (rental, delivery, multa sa late, singil sa sira) ay awtomatikong naitatala sa accounting at ipinapakita sa Mga Ulat → Home Rental.",
      "Hiwalay na naitatala ang deposit sa kita hanggang maibalik ang item.",
      "Hindi pa aktibo ang awtomatikong paalala sa customer (iskedyul ng pagkuha, due date) — paalalahanan ang customer nang mano-mano.",
    ],
  },
];
