import type { HelpCategory } from "../../types";

export const INVENTORI: HelpCategory[] = [
  {
    id: "inventory",
    group: "inventori",
    label: "Imbentaryo (Produkto, Recipe, Supplier, Stock)",
    summary:
      "Pamahalaan ang mga produktong ibinebenta, recipe ng mga niluluto, supplier, pagbili ng stock, purchase order (PO), at pisikal na pagbilang ng stock. Awtomatikong napupunta sa accounting ang bawat pagbabago sa stock at cost price.",
    subsections: [
      {
        title: "Produkto",
        steps: [
          "Magdagdag nang mano-mano: pangalan, kategorya, presyo ng benta, Cost Price, panimulang stock, unit, minimum na stock, at pangunahing supplier (opsyonal).",
          "Magdagdag ng marami nang sabay: i-download ang Excel template, punan, saka i-upload. Ang mga row na may SKU na mayroon na ay mag-a-update sa produktong iyon (hindi nagbabago ang stock sa upload).",
          "Ang mga kategorya ng produkto at unit (pcs, gramo, atbp.) ay sine-set sa Setting → Kategorya ng Produkto at Setting → Unit.",
          "Pagbago ng stock nang walang pagbili (sira, nawala, maling bilang): gamitin ang Stock Adjustment — Dagdagan, Bawasan (dahilang Diperensya o Sira/Waste), o I-set sa partikular na dami.",
          "Ang stock na binili sa supplier ay hindi dapat dumaan sa Stock Adjustment — gamitin ang Pagbili sa Supplier o Purchase Order para makuwenta ang Cost Price.",
        ],
        notes: [
          "Kailangang punan ang Cost Price. Kung wala ito, ituturing ng report na puro tubo ang benta ng produkto at masyadong mataas ang Income Statement.",
          "Ang pagbura ng produkto (Superuser lang) ay hindi bumubura sa kasaysayan ng benta nito.",
        ],
      },
      {
        title: "Recipe / BOM (mga niluluto)",
        steps: [
          "Piliing gumawa ng bagong produkto o gumamit ng umiiral na produktong pagkain.",
          "Ilagay ang pangalan ng recipe at yield (ilang serving kada luto), saka idagdag ang mga sangkap: produktong hilaw na sangkap, dami, at unit.",
          "I-save. Awtomatikong kinukuwenta ang gastos kada serving mula sa mga sangkap. Tuwing mabebenta ang item, ang stock ng SANGKAP ang bumababa.",
        ],
        notes: ["Isang recipe lang ang puwede sa isang produkto."],
      },
      {
        title: "Supplier",
        steps: [
          "Magdagdag ng supplier: pangalan, telepono, address, at termino ng pagbabayad (araw).",
          "Hindi mabubura ang supplier na may transaksyon na — i-archive na lang para hindi lumabas sa bagong pagpipilian; buo pa rin ang kasaysayan.",
        ],
      },
      {
        title: "Pagbili sa Supplier (direktang pagbili ng stock)",
        steps: [
          "Piliin ang supplier, ilagay ang mga produkto, dami, at presyo ng pagbili.",
          "Magdagdag ng gastos sa transportasyon/parking/iba pa kung mayroon — awtomatikong hinahati ito sa mga produkto para ipakita ng Cost Price ang tunay na gastos.",
          "I-tick ang \"Bayad nang cash ngayon\" kung bayad na; iwanang hindi naka-tick para itala bilang payable sa supplier.",
          "Ang paraan ng pag-compute ng gastos (Weighted average o FIFO — una pasok, una labas) ay pinipili sa tab na ito. Kung hindi sigurado, gamitin ang Weighted average (default). Walang LIFO dahil hindi ito pinapayagan ng pamantayan sa accounting at buwis ng Indonesia.",
        ],
      },
      {
        title: "Purchase Order (order sa supplier)",
        steps: [
          "Ipinapakita ng \"Mga Produktong Kailangang I-restock\" ang mga produktong mas mababa sa minimum — pindutin ang \"+ Idagdag sa form ng PO\".",
          "Gumagawa ang \"Suriin at Gumawa ng Awtomatikong PO\" ng draft na PO para sa lahat ng produktong mas mababa sa minimum na may pangunahing supplier. Kailangan pa ring suriin at ipadala nang mano-mano ang mga draft.",
          "Gumawa ng PO nang mano-mano: piliin ang supplier, ilagay ang mga produkto, dami, at presyo, pindutin ang Gumawa ng PO.",
          "Pagdating ng paninda, pindutin ang Tanggapin ang Paninda: tataas ang stock at awtomatikong gagawa ng bill (payable) sa supplier.",
        ],
      },
      {
        title: "Stock Count (pisikal na pagbilang)",
        steps: [
          "Bilangin ang stock sa estante/bodega at ilagay ang resulta katabi ng numero ng sistema — agad makikita ang diperensya. I-save bilang draft.",
          "Buksan ang draft para suriin ang diperensya kada produkto.",
          "Pindutin ang Ilapat ang Adjustment: itinatala ang sobra bilang adjustment, ang kulang bilang waste. Hindi ito mailalapat nang dalawang beses.",
        ],
      },
    ],
    notes: ["Karamihan ng aksyon sa page na ito (upload, magdagdag ng produkto/recipe, PO, stock count) ay para lang sa Owner at Manager."],
    roles: "Owner, Superuser, Manager.",
  },
  {
    id: "assets",
    group: "inventori",
    label: "Fixed Asset (PS Unit, TV, Controller, Muwebles)",
    summary:
      "Listahan ng mga capital item ng outlet (PlayStation, TV, controller, muwebles, sasakyan) na may awtomatikong buwanang depreciation, pagbili ng asset, pag-aayos, at disposal (naibenta/nasira/nawala). Puwedeng salain ang listahan, i-download sa Excel, at punan sa pag-upload ng Excel.",
    subsections: [
      {
        title: "Listahan ng Asset — pagtingin at pagsala",
        steps: [
          "Maghanap ayon sa pangalan, tala, o pangalan ng PS unit. Salain ayon sa kategorya, status (Aktibo, Maintenance, Na-dispose, o lahat maliban sa na-dispose), naka-link sa PS unit o hindi, at saklaw ng petsa ng pagkuha.",
          "Sa ilalim ng mga filter makikita kung ilang asset ang tumutugma, kasama ang kabuuang acquisition cost, accumulated depreciation, at book value.",
          "Pindutin ang I-download ang Excel para i-download ang listahang tugma sa aktibong filter (may row na KABUUAN).",
        ],
      },
      {
        title: "Pagdagdag ng asset",
        steps: [
          "Isang asset: pindutin ang \"+ Bagong Asset\" — ilagay ang pangalan, kategorya, kaugnay na PS unit (opsyonal), acquisition cost, salvage value, useful life (buwan), supplier, at paano binayaran (cash/bangko o naitala bilang payable).",
          "Ilang asset nang sabay, gastos sa pagpapadala/pag-install, down payment, o mga asset na pag-aari na: gamitin ang tab na Pagbili ng Asset.",
          "Maraming asset mula sa Excel: pindutin ang Upload Excel → i-download ang template → punan → piliin ang paraan ng pagtatala (Opening balance para sa mga asset na pag-aari na, Binayaran mula sa cash/bangko, o Naitala bilang payable) → Suriin ang File → I-save.",
          "Sa pag-upload, sinusuri muna ang file: ipinapakita ang mga maling row kasama ang dahilan, at walang mase-save hanggang tama ang bawat row. Ang mga row na pareho ang petsa ay nagiging iisang dokumento ng Pagbili ng Asset.",
        ],
        notes: [
          "Salvage value = tantiyang presyo ng pagbenta kapag natapos ang useful life. Halimbawa ng useful life: PS 36 buwan, TV 60 buwan, controller 12 buwan.",
          "Nagkamali sa pag-upload? Kanselahin ang dokumento mula sa tab na Pagbili ng Asset (basta hindi pa nade-depreciate o na-dispose ang mga asset nito).",
        ],
      },
      {
        title: "Pagbili ng Asset",
        steps: [
          "Ang isang dokumento ng pagbili ay puwedeng maglaman ng ilang item. Ang Qty 3 ay awtomatikong nagiging 3 asset na may numero (#1, #2, #3).",
          "Hinahati ang gastos sa pagpapadala/pag-install sa acquisition cost ng bawat item.",
          "Mga opsyon sa pagbabayad: buong bayad, payable, down payment (DP), o opening balance. Ang payable sa pagbili ng asset ay lumalabas sa Accounting → Payable at puwedeng hulugan.",
          "Maaaring kanselahin ang pagbili basta wala pang asset dito na nade-depreciate o na-dispose.",
        ],
      },
      {
        title: "Pag-aayos at disposal",
        steps: [
          "+ Maintenance sa aktibong asset: ilagay ang paglalarawan at gastos, i-tick ang \"Gumawa ng Gastos\" para maitala ang gastos bilang expense.",
          "I-dispose ang Asset (naibenta, sirang-sira, nawala): ilagay ang kinita sa pagbenta (0 kung wala), ang cash/bank account na tatanggap, at dahilan. Awtomatikong kinukuwenta ang tubo/lugi sa disposal.",
        ],
      },
      {
        title: "Depreciation (buwanan)",
        steps: [
          "Buksan ang tab na Depreciation, piliin ang buwan, tingnan ang tantiyang kabuuan, saka pindutin ang Patakbuhin ang Depreciation.",
          "Ligtas pindutin nang paulit-ulit: awtomatikong nilalaktawan ang mga buwang naproseso na o mga asset na ubos na ang halaga.",
          "Ipinapakita ng Kasaysayan ng Depreciation ang lahat ng depreciation na naitala na.",
        ],
      },
    ],
    roles: "Tumingin at mag-download: sinumang staff na makakapagbukas ng page na ito. Magdagdag, mag-upload, mag-ayos, mag-dispose, mag-depreciate: Owner, Superuser, Manager, Accountant.",
  },
  {
    id: "maintenance",
    group: "inventori",
    label: "Maintenance (Repair Ticket)",
    summary:
      "Subaybayan ang pag-aayos ng TV, console, controller, at ibang kagamitan mula pagpasok hanggang matapos, para walang sirang makalimutan at maitala ang gastos sa pag-aayos.",
    subsections: [
      {
        title: "Paggawa at pagproseso ng ticket",
        steps: [
          "Pindutin ang \"+ Magdagdag ng Maintenance\": piliin ang asset, ilarawan ang sira at gastos, i-tick ang \"Gumawa ng Gastos\" kung dapat itala ang gastos bilang expense.",
          "Ang bagong ticket ay may status na \"Nasa Maintenance\" at awtomatikong minamarkahang Maintenance ang asset nito.",
          "Pindutin ang \"Simulan ang Proseso\" kapag nagsimula ang pag-aayos, saka \"Markahang Tapos\" kapag natapos — babalik sa Aktibo ang asset kung walang ibang bukas na ticket.",
          "Mae-edit ang ticket anumang oras. Naka-lock ang gastos kapag nagawa na ang expense (baguhin sa menu na Gastos). Hindi mabubura ang ticket na may expense na.",
        ],
      },
      {
        title: "Buod kada kategorya",
        steps: ["Ipinapakita ng mga card sa itaas kada kategorya (PlayStation, TV, Controller, atbp.): bakanteng unit kumpara sa kabuuan, at ang mga inaayos."],
      },
    ],
    notes: [
      "Hindi sigurado kung sira ang controller? Suriin muna gamit ang Controller Doctor (Gamepad Tester) — may link sa page na ito.",
    ],
    roles: "Owner, Superuser, Manager, Accountant.",
  },
  {
    id: "dokter-stik",
    group: "inventori",
    label: "Controller Doctor (Gamepad Tester) at Driver ng PS3 Controller",
    navHint: "Maintenance → Gamepad Tester",
    summary:
      "Suriin ang PS3, PS4, at PS5 controller mismo sa browser: patay na button, analog na kusang gumagalaw (drift), balanse ng analog, at diin ng trigger — ang resulta ay health score, pagsusuri ng sira, at rekomendasyon sa serbisyo.",
    subsections: [
      {
        title: "Pagsuri ng controller",
        steps: [
          "Buksan ang page na ito sa Google Chrome o Microsoft Edge sa PC/laptop.",
          "Isaksak ang controller gamit ang USB cable (puwede ring Bluetooth ang PS4/PS5), saka pindutin ang kahit anong button nang isang beses — nade-detect lang ng browser ang controller pagkatapos pindutin ang isang button.",
          "Pataas na tunog = nakakonekta ang controller, pababang tunog = nadiskonekta. Maisasara ang tunog gamit ang button na \"Tunog: On\". Kung walang marinig, i-click muna nang isang beses ang page (patakaran ng browser).",
          "Pindutin ang bawat button at igalaw ang dalawang analog: sisindi ang mga indicator ayon sa pinipindot mo.",
          "Sa bahaging \"Gabay na pagsuri (Controller Doctor)\" pindutin ang Simulan ang Pagsuri, saka sundin ang tagubilin sa screen: ilapag ang controller sa mesa nang hindi hinahawakan habang nagbibilang, iikot nang buo ang dalawang analog, at dahan-dahang hilahin ang L2/R2 hanggang dulo. Sa huli makukuha mo ang health score, mga natuklasan, posibleng sanhi, at rekomendasyon — puwedeng i-print o i-save bilang PDF.",
        ],
      },
      {
        title: "Hindi nade-detect ang PS3 controller sa Windows",
        steps: [
          "Hindi ito sirang controller: walang built-in na driver ang Windows para sa PS3 controller, kaya hindi naipapasa ang mga button sa browser.",
          "I-download ang DsHidMini driver gamit ang button sa page na ito, i-install, saka isaksak ulit ang controller.",
          "Garantisado lang ang driver para sa ORIHINAL na Sony PS3 controller. Maraming clone na PS3 controller ang hindi pa rin nade-detect kahit naka-install na ang driver.",
          "Nang walang ini-install na driver: buksan ang page na ito sa Chrome ng Android phone at ikonekta ang PS3 controller gamit ang OTG cable.",
        ],
      },
    ],
    notes: [
      "Direktang binabasa ang resulta mula sa hardware ng controller, hindi simulation.",
      "Hindi binabasa ng tool na ito ang gyro/adaptive trigger ng DualSense at hindi kinokontrol ang vibration — para lang sa function ng button at analog.",
      "Mga controller na pangit ang resulta: gumawa ng Maintenance ticket para maitala at hindi maipaupa sa customer.",
    ],
  },
];
