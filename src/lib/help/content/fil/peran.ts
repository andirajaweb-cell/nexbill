import type { HelpCategory } from "../../types";

export const PERAN: HelpCategory[] = [
  {
    id: "peran-kasir",
    group: "peran",
    label: "Cashier Ako — Mga Gawain sa Araw-araw",
    summary:
      "Ang listahan ng gawain ng cashier mula pagbukas hanggang pag-uwi, ayon sa ayos na ginagamit araw-araw. Kung bago kang cashier, unahin mong kabisaduhin ang paksang ito.",
    roles: "Tungkuling Cashier. Kaya rin ng Supervisor, Manager, at Owner ang lahat ng hakbang na ito.",
    subsections: [
      {
        title: "Pagdating (pagbubukas)",
        steps: [
          "Mag-log in gamit ang sarili mong account — huwag gamitin ang sa katrabaho.",
          "Buksan ang Shift at Cashier → Magbukas ng Bagong Shift. Bilangin muna ang cash na talagang nasa drawer, saka ilagay ang halagang iyon bilang Panimulang Cash. Kung iba ito sa iniwan ng nakaraang shift, isulat ang dahilan.",
          "Buksan at suriin ang bawat PS unit, controller, at TV. Huwag ipaupa ang sirang unit — sabihan ang supervisor para makagawa ng Maintenance ticket.",
          "Buksan ang Pagpapareserba para makita ang mga reservation ngayong araw, para hindi maibigay sa ibang customer ang mga naka-reserve na unit.",
          "Tingnan ang icon ng kampanilya (Notification) para sa paubos na stock o mahahalagang mensahe.",
        ],
      },
      {
        title: "Pagsilbi sa customer na naglalaro sa loob",
        steps: [
          "Customer na walang reservation → Upa ng PS → pumili ng bakanteng unit → piliin ang package/kada oras → ilagay ang pangalan → Simulan ang Session.",
          "Customer na may reservation → i-type ang booking code sa Pagpapareserba → Check-in.",
          "Order ng pagkain/inumin habang naglalaro → pindutin ang +F&B sa kanilang session card, hindi sa Cashier, para nasa iisang bill lahat.",
          "Gusto pa ng customer ng oras → Magdagdag ng Oras. Pakinggan ang alarma kapag 5 minuto na lang ang natitira at mag-alok ng extension.",
          "Tapos na → Tapusin ang Session at Magbayad → piliin ang paraan → Magbayad → I-print ang Resibo.",
        ],
      },
      {
        title: "Pagbebenta ng pagkain/inumin nang walang rental",
        steps: [
          "Buksan ang Cashier (POS), i-click ang produkto o i-scan ang barcode, i-set ang dami, piliin ang paraan ng pagbabayad, pindutin ang Magbayad.",
          "Cash: tanggapin ang pera, pindutin ang \"Kumpirmahin na Natanggap ang Cash\". QRIS/transfer: ipakita ang QRIS/bank account ng outlet sa screen, hintaying pumasok ang pera, saka markahang natanggap.",
        ],
      },
      {
        title: "Maliliit na cash na lumalabas sa shift mo",
        steps: [
          "Parking, refill ng tubig, atbp. → itala agad sa Pamamahala ng Gastos → Mabilisang Cash Out. Huwag ipagpaliban, para hindi magkulang ang cash ng shift.",
          "Perang kinuha ng may-ari / inilagay sa safe → itala bilang Cash Deposit sa page na Shift at Cashier.",
        ],
      },
      {
        title: "Bago umuwi (isara ang shift)",
        steps: [
          "Siguraduhing walang session na tumatakbo pa para sa customer na umalis na — tapusin ito at ayusin ang bayad (o i-save bilang bayad mamaya).",
          "Buksan ang Shift at Cashier → Isara ang Shift. Bilangin ang drawer ayon sa denominasyon (Rp100,000, Rp50,000, atbp.) nang hindi tinitingnan ang numero ng sistema.",
          "Buksan ang bawat e-wallet/bank app na ginamit ngayong araw at ilagay ang balanse sa bahaging Pagsuri ng Non-Cash na Balanse.",
          "Ilagay kung magkano ang cash na maiiwan sa drawer para sa susunod na shift at magkano ang mapupunta sa may-ari/safe.",
          "Pindutin ang Isara ang Shift. Kung may diperensya, isulat ang posibleng dahilan sa tala.",
          "Patayin ang mga TV/unit na hindi ginagamit, ayusin ang mga controller, at ipasa ang mahalagang impormasyon sa susunod na shift.",
        ],
      },
    ],
    notes: [
      "Nagkamali? Huwag mag-panic. Ang pagkansela (void/refund) ay puwedeng hilingin at aprubahan ng supervisor mo — hindi nawawala ang data, kinakansela lang.",
      "Hindi makapagbibigay ang cashier ng manual discount na lampas sa limitasyong itinakda ng may-ari (Setting → Mga Kagustuhan). Ang mas malaking discount ay kailangan ng Supervisor o mas mataas.",
      "Huwag kailanman ibahagi ang password mo. Bawat transaksyon ay naitatala sa ilalim ng account na naka-log in.",
    ],
  },
  {
    id: "peran-owner",
    group: "peran",
    label: "Owner / Manager Ako — Pagbabantay sa Negosyo",
    summary:
      "Ang dapat suriin ng may-ari o manager araw-araw, linggo-linggo, at buwan-buwan — para kontrolado ang negosyo kahit hindi laging nasa outlet.",
    roles: "Owner, Manager, at Superuser. Ang ilang menu ng pananalapi ay mababago lang ng Owner/Accountant/Superuser (makakatingin ang Manager).",
    subsections: [
      {
        title: "Araw-araw (5 minuto sa phone)",
        steps: [
          "Buksan ang Buod na dashboard: kita ngayong araw, gross profit, mga unit na ginagamit, balanse ng cash, at progreso sa target kada araw.",
          "Suriin ang Notification: mga gastos na naghihintay ng apruba mo, mga kahilingan ng void/refund, paubos na stock.",
          "Aprubahan o tanggihan ang mga kahilingan sa Staff at Access → Apruba at sa Pamamahala ng Gastos (status na Naghihintay ng Apruba).",
          "Buksan ang Shift at Cashier → Kasaysayan ng Shift: tingnan ang mga shift na may pulang diperensya o naka-flag para suriin.",
        ],
      },
      {
        title: "Linggo-linggo",
        steps: [
          "Mga Ulat → Benta at Rental: aling unit ang pinakamalaki ang kita at aling paraan ng pagbabayad ang pinakagamit. Nakakatulong ang chart na Oras ng Dagsa vs Tahimik sa Buod na dashboard sa pag-iskedyul ng staff at promo sa tahimik na oras.",
          "Transaksyon → Performance ng Cashier: ikumpara ang benta, void, discount, at diperensya ng cash kada cashier.",
          "Imbentaryo → Purchase Order: suriin ang mga produktong kailangang i-restock.",
          "Maintenance: siguraduhing hindi natatambak ang mga repair ticket. Gamitin ang Controller Doctor para suriin ang mga controller na inirereklamo ng customer.",
        ],
      },
      {
        title: "Buwan-buwan",
        steps: [
          "Fixed Asset → Depreciation: patakbuhin ang depreciation ng buwan.",
          "Gastos → Paulit-ulit: gawin ang mga regular na gastos na dapat nang bayaran (kuryente, internet, upa, sahod).",
          "Accounting → Income Statement at Balance Sheet: tingnan ang tubo/lugi ngayong buwan at ikumpara sa nakaraang buwan. Mas madaling basahin ang buod sa Mga Ulat → Kalusugan ng Pananalapi.",
          "Accounting → Audit: patakbuhin ang awtomatikong pagsuri ng bookkeeping at sundin ang mga mungkahi nito.",
          "Kapag final na ang report ng buwan, i-lock ang buwan sa Accounting → Close Period para hindi na magbago ang mga numero.",
          "Suriin ang bill ng NEXBILL sa menu na Subscription para hindi maputol ang serbisyo.",
        ],
      },
      {
        title: "Pagtatakda ng patakaran ng outlet",
        steps: [
          "Setting → Negosyo at Buwis: buwis, service charge, pag-round ng bill, sales target, limitasyon sa apruba ng gastos.",
          "Setting → Mga Kagustuhan: limitasyon sa manual discount ng cashier, threshold ng diperensya ng cash na naka-flag, aling cash account ang bumubuo sa iminumungkahing panimulang cash.",
          "Staff at Access: magdagdag/mag-deactivate ng staff, i-sign out ang mga account na naka-log in pa sa ibang device.",
        ],
      },
    ],
    notes: [
      "Magtanong ng kahit ano tungkol sa negosyo mo sa AI Business Intelligence (Owner/Superuser lang), hal. \"aling PS unit ang pinakamalaki ang tubo ngayong buwan?\".",
      "Ilang branch? Ipinapakita ng menu na Lahat ng Outlet ang kita ng bawat branch sa iisang screen.",
    ],
  },
  {
    id: "peran-dapur",
    group: "peran",
    label: "Staff ng Kusina Ako — Kitchen Display",
    summary: "Paano tumatanggap at tumatapos ng order ng pagkain/inumin ang staff ng kusina nang walang papel.",
    roles: "Tungkuling Kitchen. Mabubuksan din ng sinumang staff na naka-log in ang Kitchen Display.",
    steps: [
      "Mag-log in gamit ang account ng kusina at buksan ang Kitchen Display. Iwanang bukas ito sa tablet/monitor ng kusina buong shift.",
      "Pindutin ang 🔊 para tumunog ang alarma ng order, at \"I-enable ang Browser Notification\" para lumabas pa rin ang bagong order kahit nasa ibang app ang screen.",
      "Lumalabas ang bagong order sa column na Bago kasama ang tunog. Pindutin ang Kumpirmahin kapag sisimulan mo na itong asikasuhin.",
      "Pindutin ang Simulang Magluto kapag nagsimula, saka Handa nang Ihain kapag tapos — maririnig ng waiter/cashier ang tunog na \"Handa na ang Pagkain\".",
      "Pagkahatid sa customer, pindutin ang Naihatid. Aalis ang order sa board.",
      "Naubusan ng sangkap? Sa column na Bago pindutin ang Kanselahin at piliin ang dahilan (hal. \"Ubos ang sangkap\") — maaabisuhan ang cashier at mag-a-adjust ang bill ng customer.",
    ],
    notes: [
      "Awtomatikong nagre-refresh ang board kada ilang segundo — hindi na kailangang pindutin ang refresh.",
      "Awtomatikong bumababa ang stock ng sangkap ayon sa recipe kapag nabenta ang item. Kung madalas hindi tugma ang stock ng sangkap, hilingin sa may-ari na suriin ang recipe sa Imbentaryo → Recipe / BOM.",
    ],
  },
  {
    id: "peran-akuntan",
    group: "peran",
    label: "Accountant Ako — Bookkeeping at Report",
    summary:
      "Ang routine ng accountant/finance admin sa NEXBILL: siguraduhing tama ang pagkakatala ng lahat ng gastos, pagbili, at adjustment, saka ihanda ang mga buwanang report.",
    roles: "Accountant, Owner, at Superuser (ang mga may kakayahang magbago ng data ng accounting). Makakatingin lang ang Manager.",
    steps: [
      "Araw-araw/linggo-linggo: suriin ang Pamamahala ng Gastos — kumpletuhin ang attachment, bayaran ang mga gastos na naitala bilang payable, i-void ang mga mali.",
      "Suriin ang Accounting → Payable (AP) at Receivable (AR): bayaran ang mga bill ng supplier na dapat nang bayaran, itala ang bayad ng customer.",
      "Itugma ang balanse sa bangko sa bank statement. Gamitin ang Accounting → Reconciliation para hanapin ang mga transaksyong magkaiba ang petsa ng pagkakatala.",
      "Katapusan ng buwan: patakbuhin ang Depreciation ng asset, gawin ang mga Paulit-ulit na gastos, saka suriin na balanse ang Trial Balance.",
      "Patakbuhin ang Accounting → Audit at ayusin ang mga nakita (hal. produktong walang cost price, dobleng journal).",
      "I-export ang Income Statement, Balance Sheet, at Cash Flow (Excel/PDF). Punan ang Notes to Financial Statements sa tab na Notes (SAK EMKM) kung kailangan.",
      "Isara ang buwan sa Accounting → Close Period pagkatapos aprubahan ng may-ari ang mga report.",
    ],
    notes: [
      "Ang mga awtomatikong transaksyon (benta, gastos, atbp.) ay hindi direktang mae-edit sa journal — itama ang mga ito sa pinagmulang menu (hal. refund sa Transaksyon, void sa Gastos). Pinapanatili nitong buo ang audit trail.",
      "Kung kailangan ng pagtatama pagkasara ng period, itala ito sa kasalukuyang period; huwag nang buksan ulit ang lumang period maliban kung talagang kailangan.",
    ],
  },
];
