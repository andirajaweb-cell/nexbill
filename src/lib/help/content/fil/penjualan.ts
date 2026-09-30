import type { HelpCategory } from "../../types";

export const PENJUALAN: HelpCategory[] = [
  {
    id: "transaksi",
    group: "penjualan",
    label: "Transaksyon (Kasaysayan, Refund at Void)",
    summary:
      "Dito mo mahahanap ang bawat transaksyon (rental, pagkain/inumin, produkto, PPOB), makakapag-print ulit ng resibo, makikita ang bookkeeping sa likod nito, at makakapagkansela o makakapag-refund. May tab din na Performance ng Cashier.",
    subsections: [
      {
        title: "Paghahanap ng transaksyon",
        steps: [
          "Pumili ng period (Ngayon, Kahapon, Ngayong Linggo, Ngayong Buwan, Ngayong Taon, o sariling petsa).",
          "Salain ayon sa cashier, uri ng transaksyon, paraan ng pagbabayad, status, pangalan ng customer, o saklaw ng kabuuan.",
          "Pindutin ang Detalye para makita ang mga item, bayad, at accounting entry (journal).",
          "Pindutin ang Resibo para i-print ulit ang resibo.",
        ],
      },
      {
        title: "Pagkansela o pag-refund",
        steps: [
          "Refund: ibalik ang pera sa customer (hal. sobra ang singil). Void: kanselahin ang transaksyong mali ang pagkaka-input. Parehong kailangan ng dahilan.",
          "Kung hindi pinapayagan ang tungkulin mo na gawin ito nang direkta, mapupunta ang kahilingan sa pila ng Apruba sa Staff at Access at maghihintay ng supervisor.",
          "Hindi nawawala ang mga kinanselang transaksyon — nananatili ang mga ito na may status na kinansela, at awtomatikong binabaligtad ang bookkeeping nila.",
          "Markahang Bayad Na (Owner/Superuser lang): pinipilit na mabayaran nang cash ang naipit na bill. Ang permanenteng pagbura ay para lang sa espesyal na kaso at hindi na maibabalik — gamitin ang Void para sa karaniwang pagkansela.",
        ],
      },
      {
        title: "Performance ng Cashier",
        steps: [
          "Pumili ng period para makita ang ranking ng cashier: bilang ng transaksyon, kabuuang benta, average, breakdown ayon sa uri, discount, void, bilang ng shift, at diperensya ng cash.",
        ],
      },
    ],
    notes: [
      "Kailangan ng pahintulot na tumingin ng report para makita ang listahan ng transaksyon (Owner, Superuser, Manager, Accountant, Supervisor). Hindi mabubuksan ng cashier at kusina ang listahan.",
      "Para sa Excel/PDF na file, gamitin ang Mga Ulat o Accounting.",
    ],
    roles: "Tumingin: Owner, Superuser, Manager, Accountant, Supervisor. Direktang refund/void ayon sa pahintulot ng tungkulin; ibang tungkulin sa pamamagitan ng Apruba.",
  },
  {
    id: "promo",
    group: "penjualan",
    label: "Promo at Rental Package",
    summary:
      "Gumawa ng PS rental package na fixed ang presyo (hal. \"3-Oras na PS4 Package Rp45,000\") na mapipili ng cashier kapag nagsisimula ng session. Ang discount voucher sa pamimili ay ginagawa sa Membership & CRM.",
    steps: [
      "Ilagay ang pangalan ng package, console (Lahat/PS3/PS4/PS5), tagal sa minuto, at presyo ng package, saka pindutin ang I-save ang Package.",
      "Agad lalabas ang package bilang opsyon sa panel na Bagong Session sa page na Upa ng PS.",
      "I-edit para baguhin, I-deactivate para pansamantalang itago, Burahin para alisin ang package na hindi pa nagagamit.",
      "Ideya ng promo sa tahimik na oras: tingnan ang chart na Oras ng Dagsa vs Tahimik sa Buod na dashboard, saka gumawa ng espesyal na package para sa mga oras na iyon.",
    ],
    notes: [
      "Hindi mabubura ang package na nagamit na — awtomatiko itong nade-deactivate para manatiling tama ang kasaysayan ng transaksyon.",
      "Sa Upa ng PS lang nalalapat ang package, hindi sa cart ng Cashier.",
    ],
    roles: "Owner, Superuser, Manager, Supervisor.",
  },
  {
    id: "membership",
    group: "penjualan",
    label: "Membership & CRM (Customer, Puntos, Voucher)",
    summary:
      "Listahan ng customer na may kasaysayan ng pagbili, puntos, at tier ng member (awtomatiko mula sa kabuuang gastos o binili), katalogo ng reward na mapapalitan ng puntos, at mga discount voucher.",
    subsections: [
      {
        title: "Customer",
        steps: [
          "Maghanap ng customer (pangalan/telepono) o pindutin ang Magdagdag ng Customer — sapat na ang pangalan at numero ng telepono.",
          "I-click ang customer para makita ang kabuuang gastos, puntos, tier, kasaysayan ng transaksyon/rental/puntos, at mga reward na mapapalitan.",
          "Magpalit ng puntos: pindutin ang \"Ipalit\" sa reward — lalabas ang redemption code. Ang reward na discount sa laro ay awtomatikong nagiging isang beses na voucher para sa customer na iyon.",
          "Magbenta/mag-renew ng membership: piliin ang tier, piliin ang Cash o QRIS, pindutin ang \"Magbayad at I-activate\". Awtomatikong naitatala ang bayad sa accounting at sa cash ng shift.",
        ],
      },
      {
        title: "Tier ng member",
        steps: [
          "Magdagdag ng tier: pangalan (hal. Silver, Gold), pinakamababang kabuuang gastos para umakyat, membership fee (opsyonal), multiplier ng puntos, porsyento ng discount, benepisyo, at bisa.",
          "Awtomatikong umaakyat ang customer tuwing may transaksyong nabayaran at umabot sa kwalipikasyon ang kabuuang gastos niya. Hindi kusang bumababa ang tier.",
          "Ang mga tier na may membership fee ay puwede ring direktang ibenta sa cashier.",
        ],
      },
      {
        title: "Reward",
        steps: ["Magdagdag ng reward: pangalan, uri (pamimili sa partner brand o discount sa laro), kailangang puntos, saka ang detalye para sa uring iyon."],
      },
      {
        title: "Voucher",
        steps: [
          "Ilagay ang code (awtomatikong malalaking titik), uri (porsyento o halaga), value, at minimum na gastos, saka pindutin ang Gumawa ng Voucher.",
          "Babanggitin lang ng customer ang code; ita-type ito ng cashier sa Upa ng PS o Cashier.",
        ],
        notes: ["Titigil gumana ang voucher kapag naubos ang quota ng paggamit nito."],
      },
    ],
    notes: [
      "Awtomatikong nakukuha ang puntos, mga 1 puntos kada Rp10,000 na gastos (beses ang multiplier ng tier), dagdag ang puntos sa laro kada console para sa rental session.",
      "May ilang button (burahin ang customer, ipalit ang puntos, i-edit/burahin ang master data) na Superuser lang ang nakakakita.",
    ],
    roles: "Pagbebenta ng membership: Owner, Superuser, Manager, Supervisor, Cashier. Pamamahala ng tier/reward/voucher: Owner, Superuser, Manager, Supervisor.",
  },
  {
    id: "ppob",
    group: "penjualan",
    label: "Bayad Bills / PPOB (Load, Token, Top-up, Cash Withdrawal)",
    navHint: "Lumalabas sa sidebar kapag naka-on ang module na PPOB (Setting → Feature Management).",
    summary:
      "Itala ang benta ng digital na produkto — top-up ng e-wallet, electricity token, load, bayad sa bill, transfer, cash withdrawal — sa parehong app, na hiwalay na naitatala ang tubo mo at ang gastos sa provider.",
    steps: [
      "Minsan sa simula: pindutin ang \"Pamahalaan ang Presyo ng Provider at Margin\" para i-set ang gastos at margin ng bawat produkto.",
      "Punan ang form ng transaksyon: kategorya, produkto (awtomatikong napupunan ang presyo at margin), halaga, numero ng destinasyon/reference, account na pinagmulan ng pondo, at account na tatanggap.",
      "Cash Withdrawal: pabaligtad ang daloy ng pera — tatanggap ang customer ng cash mula sa drawer at tataas ang deposit balance sa provider.",
      "Mali ang input? Pindutin ang Kanselahin (void). Ang pag-edit at permanenteng pagbura ay Superuser lang.",
      "Ipinapakita ng mga card sa itaas ang PPOB deposit balance at bilang ng transaksyon sa period na ito.",
    ],
    notes: [
      "Sinusuri ang PPOB deposit balance sa bawat pagsasara ng shift, dahil pinagsasaluhan ito ng lahat ng cashier.",
      "Kung hindi nagbebenta ng PPOB ang outlet, puwedeng i-off ng Superuser ang module — ligtas pa rin ang lumang kasaysayan.",
    ],
    roles: "Owner, Superuser, Manager (ayon sa pahintulot sa pamamahala ng PPOB).",
  },
  {
    id: "marketplace",
    group: "penjualan",
    label: "Outlet Marketplace (Bilihan at Bentahan ng Gamit na Kagamitan)",
    summary:
      "Ibenta ang mga controller, console, TV, upuan, o kagamitang hindi mo na ginagamit sa ibang outlet ng NEXBILL — o bumili ng gamit na item mula sa kanila. Libre, walang service fee. May trust profile, naka-lock na bank account, patunay ng transaksyon, review, at channel para sa reklamo.",
    subsections: [
      {
        title: "Bago magsimula — Seguridad at Bank Account",
        steps: [
          "Buksan ang tab na Seguridad at Account. Ilagay ang account na tatanggap ng bayad (bangko/e-wallet, numero, pangalan ng may-ari ayon sa bank book).",
          "Sa account na ito lang papupuntahin ang mamimili para magbayad. Kapag pinalitan mo ito, may babalang makikita ang mamimili sa loob ng 7 araw.",
          "Tingnan ang trust profile ng outlet mo: edad ng account, natapos na deal, review, at reklamo — ganito ka nakikita ng ibang outlet.",
        ],
      },
      {
        title: "Pagbebenta ng item",
        steps: [
          "Tab na Mga Item Ko → Maglista ng Item: ilagay ang pangalan ng item (hal. \"PS4 DualShock controller, gamit na, parang bago\"), kategorya, presyo kada unit, bilang ng unit, at tapat na paglalarawan (kondisyon, kumpleto ba, dahilan ng pagbenta).",
          "Magdagdag ng hanggang 5 larawan — mas pinagkakatiwalaan at mas mabilis mabenta ang item na may larawan.",
          "Ilagay ang numero ng teleponong matatawagan ka. Hindi ito ipinapakita sa listing — ibinubunyag lang sa mamimili pagkatapos mong tanggapin ang alok niya.",
          "Pindutin ang Ilista sa Showcase.",
          "Kailangang pumili ng dahilan kapag inaalis ang item sa showcase.",
        ],
      },
      {
        title: "Pagbili ng item",
        steps: [
          "Tingnan ang showcase, maghanap o magsala ayon sa kategorya, i-click ang item para makita ang larawan at trust profile ng nagbebenta.",
          "Pindutin ang Mag-alok: ilagay ang alok na presyo kada unit, tala para sa nagbebenta, at numero ng telepono mo, saka Ipadala ang Alok.",
        ],
      },
      {
        title: "Kasunduan at pag-abot",
        steps: [
          "Tatanggapin ng nagbebenta ang alok sa tab na Mga Deal — ibubunyag ang numero ng telepono ng dalawang panig para maayos ang pag-abot.",
          "Magbabayad ang mamimili LAMANG sa account na nakikita sa deal card, saka mag-a-upload ng patunay ng bayad. Mag-a-upload ang nagbebenta ng patunay ng pag-abot/tracking number.",
          "Nagbebenta: iabot lang ang item kapag talagang pumasok na ang pera — suriin ang bank statement mo, huwag basta magtiwala sa screenshot ng transfer.",
          "Pipindutin ng mamimili ang \"Natanggap ang Item at Bayad Na\" pagkatanggap nito. Saka makakapagbigay ng star review ang dalawang panig sa isa't isa.",
        ],
      },
      {
        title: "Kung may problema",
        steps: [
          "Pindutin ang Mag-ulat ng Problema sa deal card: piliin ang uri ng problema, isulat ang kronolohiya (ano ang napagkasunduan, petsa, halaga), at ilakip ang ebidensya.",
          "Puwedeng sumagot ang inireklamong panig kasama ang sarili niyang ebidensya. Magpapasya ang team ng NEXBILL matapos basahin ang dalawang panig.",
          "Ang maling ulat ay puwedeng humantong sa parusa sa nag-ulat.",
        ],
      },
    ],
    notes: [
      "Mga tip sa kaligtasan: suriin ang profile ng kabilang panig, mas mainam ang COD o magbayad pagkakita ng item, mag-transfer lang sa account sa deal card, mag-upload ng patunay sa app.",
      "Huwag magsulat ng numero ng telepono, ibang bank account, o link sa paglalarawan, dahilan, o review — sinasala ito ng sistema para protektado ang transaksyon ng ebidensya sa loob ng app.",
      "Ang mga bagong sali na outlet ay may limitasyon sa halaga ng item na maililista hanggang mabuo ang reputasyon nila.",
      "Awtomatikong naitatala ang benta bilang kita ng nagbebenta sa accounting.",
    ],
  },
  {
    id: "chat",
    group: "penjualan",
    label: "Customer Service (Magtanong sa Team ng NEXBILL)",
    navHint: "Ito ang channel ng tulong papunta sa central team ng NEXBILL — hindi inbox ng mga customer ng outlet mo.",
    summary: "Direktang magpadala ng tanong, reklamo, mungkahi, o teknikal na problema sa team ng NEXBILL, kasama ang larawan/video.",
    steps: [
      "Pindutin ang \"+ Bagong Ticket\", punan ang pamagat (opsyonal), kategorya (Reklamo/Mungkahi/Teknikal na Problema/Iba pa), at mensahe, saka Ipadala sa Head Office.",
      "Maglakip ng larawan o video ng screen kung may error — mas mabilis itong maiintindihan.",
      "Pumili ng ticket sa kaliwang listahan para basahin ang usapan, sumagot sa kahong \"Sumagot...\".",
      "Ang mga kahilingan ng token ng NexbillAgent (kontrol ng Android TV) ay sinasagot din dito.",
    ],
    notes: [
      "Awtomatikong lumalabas ang mga sagot nang hindi nagre-refresh.",
      "Sumasagot ang team ng NEXBILL sa wika ayon sa Bansa ng outlet mo (Setting → Negosyo at Buwis).",
      "Ang status ng ticket (nalutas/bukas) ay pinamamahalaan ng team ng NEXBILL.",
    ],
  },
  {
    id: "notifikasi",
    group: "penjualan",
    label: "Notification at Anunsyo",
    navHint: "Ang icon ng kampanilya sa itaas ng screen.",
    summary:
      "Lahat ng nangangailangan ng atensyon mo sa iisang lugar: paubos na stock, kahilingan ng apruba, nakabinbing gastos, reservation, status ng subscription, at anunsyo mula sa team ng NEXBILL.",
    steps: [
      "Pindutin ang icon ng kampanilya. Ipinapakita ng pulang numero ang mga hindi pa nababasang notification.",
      "Piliin ang Lahat o Hindi Pa Nababasa.",
      "I-click ang pamagat ng notification para direktang buksan ang kaugnay na page (awtomatikong minamarkahang nabasa), o pindutin ang \"Markahang nabasa\".",
      "Nililinis lahat ng \"Markahang nabasa lahat\".",
    ],
    notes: [
      "Ang mga uri ng notification na ipinapakita ay sine-set sa Setting → Notification.",
      "Lumalabas din nang isang beses bilang pop-up ang mahahalagang anunsyo mula sa team ng NEXBILL kapag binuksan mo ang dashboard, hanggang pindutin mo ang \"Nakuha ko\".",
    ],
  },
];
