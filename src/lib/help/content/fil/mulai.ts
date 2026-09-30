import type { HelpCategory } from "../../types";

export const MULAI: HelpCategory[] = [
  {
    id: "mulai-disini",
    group: "mulai",
    label: "Maligayang Pagdating — Magsimula Rito",
    summary:
      "Ang NEXBILL ay app para patakbuhin ang negosyong paupahan ng PlayStation: nagtatakda ng oras ng laro, tumatanggap ng bayad, nagbebenta ng pagkain at inumin, nagbabantay ng stock, at gumagawa ng financial report nang awtomatiko. Ipinapaliwanag ng paksang ito kung paano gamitin ang Help Center at lumipat-lipat sa mga menu, para hindi ka malito sa unang araw.",
    subsections: [
      {
        title: "Paano gamitin ang Help Center na ito",
        steps: [
          "Nasa kaliwa ang listahan ng mga paksa, naka-grupo mula sa pinakasimple (Magsimula Rito) hanggang sa pinaka-advanced (Pamamahala at Sistema).",
          "Mag-type ng salita sa search box (hal. \"shift\", \"resibo\", \"stock\", \"TV\") — agad na sasalain ang listahan sa mga paksang may salitang iyon, kasama ang nasa loob ng mga hakbang.",
          "Bawat paksa ay may Buod (para saan ito), Paano Gamitin (mga hakbang na may numero), at Mahahalagang Paalala (mga karaniwang pagkakamali). Sundin ang mga hakbang ayon sa pagkakasunod.",
          "Bago ka pa lang sa NEXBILL? Basahin sa ganitong ayos: Mga Pangunahing Konsepto → Setup ng Bagong Outlet → Daloy ng Trabaho sa Paupahan ng PlayStation → ang Gabay ayon sa Tungkulin para sa trabaho mo.",
          "Naipit? Buksan ang grupong \"Tulong at Glosaryo\" sa pinakababa: nandoon ang Mga Karaniwang Problema at Solusyon at ang Glosaryo.",
        ],
      },
      {
        title: "Pag-log in at pag-log out",
        steps: [
          "Buksan ang dashboard.nexbill.id, ilagay ang email at password, saka pindutin ang Log In. Ang mga account na ginawa gamit ang Google ay puwedeng gumamit ng Google button.",
          "Nakalimutan ang password? Pindutin ang \"Nakalimutan ang password\" sa login page at sundin ang link na ipinadala sa email mo.",
          "Para sa seguridad, isang device/browser lang ang puwedeng aktibo sa isang account sa isang pagkakataon. Kung naka-log in ka sa phone at sinubukan mong mag-log in sa PC, tatanggihan ang PC hanggang mag-log out ka sa phone, hindi magamit ang account nang 30 minuto, o pindutin ng Owner ang \"I-sign out\" sa Staff at Access.",
          "Kapag tapos na, pindutin ang Log Out sa account menu (kanang itaas) — lalo na sa mga computer na pinagsasaluhan.",
        ],
      },
      {
        title: "Kilalanin ang dashboard",
        steps: [
          "Nasa kaliwang sidebar ang lahat ng menu, nakaayos ayon sa pang-araw-araw na daloy: Operasyon (Upa ng PS, Cashier, Pagpapareserba) sa itaas, saka Benta at Customer, Imbentaryo at Pananalapi, at Setting sa ibaba. Sa phone, buksan ang sidebar gamit ang menu button (☰).",
          "Ipinapakita ng top bar ang pangalan ng aktibong outlet, ang kampanilya ng Notification, ang pagpili ng wika, at ang iyong account menu.",
          "Palitan ang wika gamit ang pagpili sa top bar — may Indonesian, English, Malay, Thai, Filipino, at Vietnamese. Magpapalit din ng wika ang Help Center na ito.",
          "Ang mga menu na hindi ginagamit ng outlet mo (hal. Home Rental, Bayad Bills/PPOB, TV Screensaver) ay puwedeng i-off ng Superuser sa Setting → Feature Management para malinis ang sidebar.",
        ],
      },
    ],
    notes: [
      "Lahat ng data ay naka-save online (cloud). Mabubuksan mo ang NEXBILL mula sa PC, laptop, tablet, o phone — browser lang ang kailangan (inirerekomenda ang pinakabagong Google Chrome o Microsoft Edge).",
      "Kailangan ng tao? Buksan ang menu na Customer Service para direktang maipadala ang tanong mo sa team ng NEXBILL.",
    ],
  },
  {
    id: "konsep-dasar",
    group: "mulai",
    label: "Mga Pangunahing Konsepto ng NEXBILL",
    summary:
      "Limang bagay na dapat maintindihan bago gamitin ang NEXBILL: outlet, mga account at tungkulin ng staff, shift ng cashier, mga transaksyong awtomatikong naitatala, at awtomatikong bookkeeping. Kapag malinaw na ang mga ito, madali nang maintindihan ang ibang menu.",
    subsections: [
      {
        title: "1. Outlet (branch)",
        steps: [
          "Ang outlet ay isang lokasyon ng negosyo. Lahat ng data (PS unit, produkto, transaksyon, report) ay laging pag-aari ng isang partikular na outlet.",
          "Higit sa isang branch? Puwedeng i-link ang isang account sa ilang outlet. Lalabas ang menu na \"Lahat ng Outlet\" para makita mo ang lahat ng branch nang sabay at makalipat sa isang click.",
          "Hindi kailanman naghahalo ang data ng mga outlet — hindi makikita ng ibang outlet (kasama ang sa ibang may-ari) ang data mo.",
        ],
      },
      {
        title: "2. Mga account at tungkulin ng staff",
        steps: [
          "Bawat nagtatrabaho ay dapat may sariling account — huwag magsalo ng isa, para laging malinaw kung sino ang gumawa ng ano.",
          "Tinutukoy ng tungkulin (role) kung ano ang puwedeng gawin ng bawat isa: Superuser (pinakamataas, kayang i-setup ang lahat kasama ang access), Owner, Manager, Accountant, Supervisor, Cashier, at Kitchen.",
          "Karamihan ng menu ay puwedeng TINGNAN ng lahat ng staff, pero ang mga button na nagbabago ng data (magdagdag, mag-edit, magbura, mag-apruba) ay lumalabas lang sa mga tungkuling may pahintulot. Kaya kung mabubuksan ng cashier ang Accounting pero wala siyang mababago, sinadya iyon.",
        ],
      },
      {
        title: "3. Shift ng cashier",
        steps: [
          "Ang shift ay ang panahong responsable ang isang cashier sa cash drawer. Magbukas ng shift bago magbenta (ilagay ang panimulang cash sa drawer) at isara ito kapag tapos (bilangin ang cash sa drawer).",
          "Lahat ng cash na pumasok at lumabas sa shift ay kinukuwenta ng sistema at ikinukumpara sa bilang mo — makikita agad ang anumang diperensya pagkasara ng shift.",
        ],
      },
      {
        title: "4. Awtomatikong naitatala ang mga transaksyon",
        steps: [
          "Bawat rental session, benta sa cashier, take-home rental, benta ng PPOB, gastos, at pagbili ng stock ay awtomatikong naitatala — hindi na kailangang kopyahin sa notebook o Excel.",
          "Lahat ng transaksyon ay mahahanap ulit sa menu na Transaksyon, kasama ang resibo.",
        ],
      },
      {
        title: "5. Awtomatikong bookkeeping (accounting)",
        steps: [
          "Sa likod ng bawat transaksyon, gumagawa ang NEXBILL ng accounting entry (journal) nang awtomatiko. Ang resulta ay laging updated na Income Statement, Balance Sheet, at Cash Flow.",
          "Ang listahan ng mga account (Chart of Accounts) ay inihahanda pagkagawa ng outlet. Hindi kailangang maintindihan ng karaniwang may-ari ang accounting para gamitin ang NEXBILL — tama lang dapat ang pagpapatakbo ng mga transaksyon.",
        ],
      },
    ],
    notes: [
      "Ilang pinaka-mapanganib na button (permanenteng pagbura, pag-edit ng permission matrix) ay lumalabas lang sa mga Superuser account — kahit Owner ay hindi ito nakikita. Kung wala ang \"Burahin\" na button, hindi iyon error.",
      "Halos lahat ng pagkakamali sa input ay puwedeng i-undo (void/refund/kanselahin) nang hindi binubura ang data — nananatili ang kasaysayan para tapat ang mga report.",
    ],
  },
  {
    id: "setup-outlet-baru",
    group: "mulai",
    label: "Setup ng Bagong Outlet (Kumpletong Checklist)",
    summary:
      "Ang inirerekomendang ayos ng mga hakbang bago magsimulang magsilbi ng customer ang outlet — mula sa pagpuno ng business profile hanggang sa unang test na transaksyon. Ang mga hakbang na may (opsyonal) ay puwedeng laktawan at gawin mamaya.",
    subsections: [
      {
        title: "Hakbang 1 — Business profile, buwis at bansa",
        navHint: "Setting → Negosyo at Buwis",
        steps: [
          "Ilagay ang pangalan ng negosyo, logo, numero ng telepono, buong address, at Bansa. Ang Bansa ang nagtatakda ng currency na ipinapakita at ng wikang ginagamit ng Customer Service ng NEXBILL sa pagsagot.",
          "Ilagay ang pangalan at password ng WiFi kung gusto mo itong ipakita sa customer (sa resibo, online booking page, o TV Screensaver). Pangalan lang ng WiFi ang ipinapakita ng TV, hindi kailanman ang password.",
          "I-set ang Buwis (%), Service Charge (%), at pag-round ng bill (hal. i-round sa Rp500/Rp1,000 para walang barya na natitira).",
          "Ilagay ang buwanang Sales Target (break-even). Ipapakita ng Buod na dashboard ang target at progreso kada araw.",
          "I-set ang halaga ng gastos na awtomatikong naaaprubahan (default Rp500,000). Ang mga gastos na lampas dito ay maghihintay ng apruba ng Owner/Manager.",
          "Isulat ang teksto sa ibaba ng resibo (hal. \"Salamat, balik po kayo!\").",
        ],
      },
      {
        title: "Hakbang 2 — Magdagdag ng PlayStation unit at rate",
        navHint: "Upa ng PS → button na \"Pamahalaan ang Unit\"",
        steps: [
          "Idagdag isa-isa ang bawat unit: pangalan ng unit (hal. \"PS5 - Booth 1\"), uri ng console (PS2 hanggang PS5 Slim), uri ng TV, at rate kada oras.",
          "Mahalaga ang uri ng TV para sa awtomatikong kontrol: ang Android TV ay mabubuksan/maisasara sa pamamagitan ng NexbillAgent app, habang ang karaniwang TV (analog o smart TV na hindi Android) ay kailangan ng smart plug.",
          "Kung nagbebenta ka ng package na fixed ang presyo (hal. \"3-Oras na PS4 Package Rp45,000\"), gawin ito sa Promo at Package. Ang mabilisang pagpili ng oras (30/60/90 minuto, atbp.) ay sine-set sa Setting → Tagal ng Rental.",
          "Suriin: lahat ng unit ay lumalabas sa page na Upa ng PS at walang naka-set sa Maintenance.",
        ],
      },
      {
        title: "Hakbang 3 — I-setup ang mga paraan ng pagbabayad",
        navHint: "Menu na \"Mga Bayad\"",
        steps: [
          "Awtomatikong nandiyan na ang Cash.",
          "Idagdag ang mga non-cash na paraan na talagang ginagamit mo: QRIS, bank transfer, GoPay, DANA, debit card, atbp.",
          "Para sa QRIS/transfer, i-upload ang static QRIS image ng outlet at ilagay ang bank account ng outlet — parehong ipinapakita sa customer kapag pinili ng cashier ang paraang iyon. Laging direkta sa account ng outlet ang pera, hindi kailanman dumadaan sa NEXBILL.",
        ],
      },
      {
        title: "Hakbang 4 — Magdagdag ng staff at tungkulin",
        navHint: "Staff at Access",
        steps: [
          "Gumawa ng account para sa bawat staff: pangalan, email, password, at tungkulin (Manager/Accountant/Supervisor/Cashier/Kitchen).",
          "Siguraduhing nasubukan na ng bawat staff na mag-log in bago ang unang araw.",
        ],
      },
      {
        title: "Hakbang 5 (opsyonal) — Ikonekta ang mga TV at device",
        navHint: "Kontrol ng Device",
        steps: [
          "Android TV: sundin ang \"Gabay sa Setup ng Device\" sa page na Kontrol ng Device (humingi ng token, i-download ang NexbillAgent sa PC ng cashier, ikonekta ang TV).",
          "Karaniwang TV (hindi Android): mag-install ng smart plug at irehistro ito sa parehong page. Ipinapaalala ng page kung aling unit ang kailangan pa ng smart plug.",
          "I-link ang bawat device sa rental unit nito. Puwede itong laktawan — mabubuksan pa rin ang TV nang mano-mano gamit ang remote.",
        ],
      },
      {
        title: "Hakbang 6 — I-setup ang receipt printer",
        navHint: "Setting → Negosyo at Buwis → Printer",
        steps: [
          "Isaksak ang receipt printer sa computer ng cashier at siguraduhing naka-install ito sa Windows.",
          "Subukang mag-print ng resibo mula sa test na transaksyon (Hakbang 10). Kung hindi tugma ang lapad, i-set ang lapad ng papel (58mm/80mm) at pindutin ang \"I-save para sa Computer na Ito\" — ulitin sa bawat computer ng cashier.",
        ],
      },
      {
        title: "Hakbang 7 (opsyonal) — Produktong pagkain/inumin at stock",
        navHint: "Imbentaryo",
        steps: [
          "Magdagdag ng produkto isa-isa, o i-download ang Excel template at i-upload lahat nang sabay.",
          "Punan ang Cost Price ng bawat produkto — kung wala ito, ituturing ng mga report na 100% tubo ang bawat benta.",
          "Para sa mga niluluto (hal. pritong noodles, iced tea), gumawa ng Recipe para awtomatikong bumaba ang stock ng sangkap tuwing mabebenta ito.",
          "Magdagdag ng Supplier kung gusto mong itala ang pagbili ng stock.",
        ],
      },
      {
        title: "Hakbang 8 (opsyonal) — I-on ang mga dagdag na module",
        navHint: "Setting → Feature Management (Superuser lang)",
        steps: [
          "Home Rental: kung nagpapaupa rin ang outlet ng PS/TV na iuuwi ng customer.",
          "PPOB: kung nagbebenta rin ang outlet ng load, electricity token, top-up ng e-wallet.",
          "TV Screensaver: kung gusto mong magpakita ng promo ang Android TV sa booth kapag walang gumagamit.",
          "Iwanang naka-off ang mga hindi ginagamit na module para simple ang menu ng staff.",
        ],
      },
      {
        title: "Hakbang 9 — Opening balance (para lang sa outlet na tumatakbo na)",
        navHint: "Accounting → Paglipat ng Data",
        steps: [
          "Puwedeng laktawan ito ng outlet na bagong-bago.",
          "Kung tumatakbo na ang outlet bago gumamit ng NEXBILL, ilagay ang Opening Balance (cash, bangko, receivable, payable, kapital) sa araw na nagsimula kang gumamit ng NEXBILL, para tama ang Balance Sheet mula sa unang araw.",
          "Ang mga asset na pag-aari mo na (PS unit, TV, upuan) ay mailalagay nang sabay-sabay sa Fixed Asset → Upload Excel gamit ang opsyong \"Opening balance\".",
        ],
      },
      {
        title: "Hakbang 10 — Magbukas ng shift at gumawa ng test na transaksyon",
        navHint: "Shift at Cashier, saka Upa ng PS",
        steps: [
          "Buksan ang unang shift gamit ang cash na talagang nasa drawer.",
          "Gumawa ng isang kumpletong test: magsimula ng session sa isang unit, magdagdag ng 1 inumin, tapusin ang session, magbayad (subukan ang cash at isang non-cash na paraan), saka i-print ang resibo.",
          "Suriin na lumabas ang transaksyon sa Transaksyon at (kung may pagkain) sa Kitchen Display.",
          "I-void ang test na transaksyon para hindi mabilang sa totoong sales report.",
        ],
      },
    ],
    notes: [
      "Mungkahi lang ang ayos na ito, hindi patakaran. Ang mahalaga ay tapos na ang Hakbang 1–4, 6, at 10 bago magsilbi ng customer.",
      "Ituloy sa \"Daloy ng Trabaho sa Paupahan ng PlayStation\" para makita kung paano nagkakaugnay ang lahat ng bahagi.",
    ],
  },
  {
    id: "alur-kerja-rental",
    group: "mulai",
    label: "Daloy ng Trabaho sa Paupahan ng PlayStation (Simula hanggang Report)",
    summary:
      "Isang rental session mula pagdating ng customer hanggang lumabas ang pera sa financial report — para maintindihan mo kung paano nagkakaugnay ang Pagpapareserba, Upa ng PS, Kusina, Shift, Transaksyon, at Accounting sa halip na magkakahiwalay na menu.",
    subsections: [
      {
        title: "1. Bago dumating ang customer (opsyonal — reservation)",
        steps: [
          "Nagpa-reserve ang customer sa telepono/WhatsApp → itinatala ito ng cashier sa Pagpapareserba. O nagpa-reserve ang customer sa online booking page ng outlet (nasa Setting → Negosyo at Buwis ang link).",
          "Kung nagbabanggaan ang oras, mapupunta ang reservation sa Waiting List sa halip na tanggihan.",
          "Pagdating ng customer, ita-type ng cashier ang booking code para sa mabilis na check-in.",
        ],
      },
      {
        title: "2. Dumating ang customer — simulan ang session",
        steps: [
          "Buksan ang Upa ng PS, pumili ng bakanteng unit, piliin ang Package (fixed na presyo) o Kada Oras, at ilagay ang pangalan ng customer (o pumili ng member).",
          "Kung hinihingi ng patakaran ng outlet ang down payment (DP), i-tick ang DP at tanggapin ang pera.",
          "Pindutin ang Simulan ang Session. Kung naka-link ang unit sa TV/smart plug, kusang bubukas ang TV.",
        ],
      },
      {
        title: "3. Habang naglalaro",
        steps: [
          "Order ng pagkain/inumin → pindutin ang +F&B sa session card. Lalabas agad ang order sa Kitchen Display ng kusina.",
          "Dagdag na controller → +Accessories (sinisingil kada oras mula nang idagdag).",
          "Dagdag na oras → Magdagdag ng Oras. Lumipat ng booth → Ilipat ang Unit (lilipat din ang bill at oras).",
          "Bantayan ang lahat ng unit nang sabay sa Live Billing Board sa pangalawang screen.",
        ],
      },
      {
        title: "4. Tapos na — pagbabayad",
        steps: [
          "Pindutin ang \"Tapusin ang Session at Magbayad\". Awtomatikong lalabas ang huling bill (rental + accessories + pagkain).",
          "Ilapat ang discount/voucher kung mayroon, piliin ang paraan ng pagbabayad, pindutin ang Magbayad. Puwedeng hatiin (bahagi cash, bahagi QRIS) o i-save bilang \"bayad mamaya\".",
          "I-print ang resibo.",
        ],
      },
      {
        title: "5. Pagkatapos magbayad — kusang naitatala ang lahat",
        steps: [
          "Awtomatikong nagagawa ang bookkeeping (journal) at makikita sa Transaksyon → Detalye.",
          "Ang bayad na cash ay awtomatikong nabibilang sa cash ng kasalukuyang shift.",
          "Awtomatikong nakakakuha ng puntos ang mga member at puwedeng tumaas ang tier.",
          "Agad lumalabas ang halaga ng benta sa Buod na dashboard, sa Mga Ulat, at sa Income Statement.",
        ],
      },
      {
        title: "6. Katapusan ng araw — isara ang shift",
        steps: [
          "Binibilang ng cashier ang drawer ayon sa denominasyon, sinusuri ang balanse sa mga non-cash app, at isinasara ang shift.",
          "Ipinapakita ang anumang diperensya pagkasara at itinatago sa Kasaysayan ng Shift.",
        ],
      },
    ],
    notes: [
      "Para sa rental na IUUWI ng customer, iba ang daloy — tingnan ang paksang Home Rental.",
      "Walang dobleng pag-input: ang isang transaksyon sa Upa ng PS ay awtomatikong dumadaloy sa Kusina, Shift, Transaksyon, Mga Ulat, at Accounting.",
    ],
  },
];
