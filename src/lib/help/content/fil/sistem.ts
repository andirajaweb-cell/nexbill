import type { HelpCategory } from "../../types";

export const SISTEM: HelpCategory[] = [
  {
    id: "staff",
    group: "sistem",
    label: "Staff at Access",
    summary:
      "Pamahalaan ang mga account at tungkulin ng staff, iproseso ang mga kahilingan ng apruba (void/refund), tingnan ang bakas ng aktibidad, i-set ang seguridad sa pag-log in, at (Superuser lang) i-set ang pahintulot kada tungkulin.",
    subsections: [
      {
        title: "Listahan ng staff",
        steps: [
          "Magdagdag ng Staff: pangalan, email, password, at tungkulin (Manager, Accountant, Supervisor, Cashier, Kitchen, o Owner).",
          "Palitan ang tungkulin direkta mula sa dropdown sa table. I-deactivate ang account ng staff na umalis — nananatili ang data nila.",
          "Owner/Superuser lang ang makakagawang Owner ng ibang staff.",
        ],
      },
      {
        title: "Seguridad sa pag-log in: isang account = isang device",
        steps: [
          "Kapag naka-on ang patakarang ito (default), ang account na ginagamit sa isang browser ay hindi makakapag-log in sa ibang browser/PC hanggang mag-log out ito, hindi magamit nang 30 minuto, o ma-sign out.",
          "Nakalimutang mag-log out ng staff sa ibang computer? Pindutin ang \"I-sign out\" sa account niya sa listahan ng staff.",
          "Puwedeng i-off ang patakaran kada outlet (hindi inirerekomenda).",
        ],
      },
      {
        title: "Apruba",
        steps: [
          "Humiling ng Void/Pagkansela ng Order: ilagay ang numero ng order at dahilan. Kung pinapayagan ang tungkulin mo, agad itong gagana; kung hindi, papasok ito sa pila.",
          "Listahan ng Kahilingan: inaaprubahan o tinatanggihan ng may pahintulot.",
          "Ang mga naka-flag na shift (malaking diperensya o maraming void) ay sinusuri rin dito.",
        ],
      },
      { title: "Audit Log", steps: ["Talaan ayon sa oras ng lahat ng mahalagang aktibidad: sino ang gumawa ng ano, at kailan. Pantingin lang."] },
      {
        title: "Tungkulin at Pahintulot",
        navHint: "Nakikita lang ng mga Superuser account.",
        steps: [
          "Table ng pahintulot: row = pahintulot, column = tungkulin. I-tick/alisin ang tick para baguhin ang access ng tungkuling iyon — agad itong gumagana.",
          "Pindutin ang \"reset\" para ibalik ang default na setting ng isang tungkulin.",
        ],
      },
    ],
    notes: [
      "Dapat may sariling account ang bawat isa. Hindi masusubaybayan ang diperensya ng cash at pagkakamali kapag pinagsasaluhan ang account.",
      "Superuser lang ang permanenteng makakabura ng account ng staff; para sa staff na umalis, sapat na ang pag-deactivate.",
    ],
  },
  {
    id: "settings",
    group: "sistem",
    label: "Setting ng Outlet",
    summary:
      "Lahat ng setting ng outlet sa iisang page na may mga tab: business profile at buwis, mga kagustuhan, branch, unit, kategorya ng produkto, tagal ng rental, ad banner, TV Screensaver, notification, mga module ng feature, audit log, at ang account ko.",
    subsections: [
      {
        title: "Negosyo at Buwis",
        steps: [
          "Business profile: pangalan, logo, telepono, address, Bansa (nagtatakda ng currency at wika ng sagot ng Customer Service), pangalan at password ng WiFi.",
          "Buwis at Billing: buwis, service charge, pag-round ng bill sa Rp100/Rp500/Rp1,000 (awtomatikong naitatala ang diperensya), at limitasyon sa apruba ng gastos.",
          "Buwanang Sales Target (break-even) — ipinapakita bilang target kada araw sa Dashboard.",
          "Pagpapareserba / Reservation: pagitan ng mga reservation, deadline ng check-in, pinakamaikling abiso sa pag-book, tumanggap ng online booking, at link ng booking page ng outlet.",
          "Tuya Cloud API Integration (para sa Tuya smart plug), Footer ng Resibo, Printer, at Bank Account para sa payout ng referral commission.",
        ],
      },
      {
        title: "Mga Kagustuhan",
        steps: [
          "Currency (sumusunod sa Bansa), accounting period (simula ng fiscal year, buwanan/quarterly/taunan), format ng numero at petsa.",
          "Komposisyon ng Panimulang Cash ng Shift: aling mga cash account ang pinagsasama bilang iminumungkahing panimulang cash.",
          "Anti-Fraud na Threshold ng Shift: diperensya ng cash at bilang ng void/refund kada shift na awtomatikong naka-flag; limitasyon sa manual discount ng cashier (%); payagang bukas ang ilang cash drawer nang sabay.",
        ],
      },
      {
        title: "Branch, Unit, Kategorya ng Produkto, Tagal ng Rental",
        steps: [
          "Branch: magdagdag ng bagong branch at pindutin ang \"Gamitin ang Branch na Ito\" para lumipat ng aktibong outlet.",
          "Unit: pcs, gramo, kg, litro, atbp. — ginagamit sa produkto, recipe, at pagbili.",
          "Kategorya ng Produkto: grupo ng produkto sa cashier at report.",
          "Tagal ng Rental: mabilisang pagpili ng tagal kapag nagsisimula ng session (hal. 30, 60, 90, 120 minuto).",
        ],
      },
      {
        title: "Mga Ad Banner, TV Screensaver, Notification",
        steps: [
          "Mga Ad Banner: larawan ng promo (inirerekomenda ang hindi bababa sa 1600×500 px) para sa online booking page — i-set ang ayos, link, aktibo/hindi aktibo.",
          "TV Screensaver: ang promo screen sa Android TV sa booth — tingnan ang paksang TV Screensaver.",
          "Notification: piliin kung aling paalala ang ipapakita (paubos na stock, gastos na naghihintay ng apruba, diperensya ng cash, reservation). Predictive na Maintenance ng Unit: oras ng paggamit bago ma-flag na kailangan ng serbisyo ang unit.",
        ],
      },
      {
        title: "Feature Management",
        navHint: "Superuser lang ang makakapagbago.",
        steps: [
          "I-on/i-off ang mga module: Home Rental (at mga sub-feature nito), PPOB, TV Screensaver.",
          "Hindi binubura ng pag-off ng module ang data — babalik ang kasaysayan kapag in-on ulit ang module.",
          "Ang mga sub-feature na may label na \"Malapit na\" ay hindi pa available.",
        ],
      },
      {
        title: "Ang Account Ko",
        steps: [
          "Palitan ang sarili mong login email at password (hindi bababa sa 8 character ang password).",
          "Ang mga account na ginawa gamit ang Google ay puwedeng mag-set ng password para makapag-log in din gamit ang email at password.",
        ],
      },
    ],
    notes: [
      "Ang pagbago ng karamihan ng setting ay nangangailangan ng tungkuling Owner, Superuser, o Manager; makakatingin lang ang ibang staff.",
      "Naka-save ang setting ng printer kada computer — i-set ito sa bawat computer ng cashier.",
      "Ang Burahin ang Lahat ng Data (buong reset) ay nasa menu na Admin Data.",
    ],
  },
  {
    id: "semua-outlet",
    group: "sistem",
    label: "Lahat ng Outlet (Maraming Branch)",
    navHint: "Lumalabas lang ang menu na ito sa mga account na naka-link sa higit sa isang outlet.",
    summary: "Buod ng lahat ng branch sa iisang screen at lugar para pamahalaan ang mga branch: magdagdag, mag-edit ng profile, mag-deactivate, at tumalon sa dashboard ng anumang branch.",
    steps: [
      "Card sa itaas: kabuuang kita ngayong araw ng lahat ng aktibong outlet.",
      "Bawat outlet ay lumalabas bilang card: status ng subscription, kita ngayong araw, availability ng PS unit.",
      "Pindutin ang \"Buksan ang Dashboard ng Outlet na Ito\" para lumipat — agad susunod sa outlet na iyon ang lahat ng ibang menu.",
      "Owner/Superuser: \"Magdagdag ng Outlet\" para sa bagong branch (awtomatikong nagagawa ang chart of accounts nito), icon ng lapis para i-edit ang profile, icon ng archive para i-deactivate.",
      "Lumilipat sa bahaging Archive ang mga na-deactivate na outlet at puwedeng i-activate ulit anumang oras.",
    ],
    notes: [
      "Ang pag-deactivate = pag-archive, hindi pagbura. Ligtas ang lahat ng kasaysayan.",
      "Hindi made-deactivate mula rito ang pangunahing outlet ng account mo.",
    ],
  },
  {
    id: "billing-subscription",
    group: "sistem",
    label: "Subscription sa NEXBILL",
    navHint: "Menu na \"Subscription\" — ito ang mga bill ng outlet mo PARA SA NEXBILL, hindi kita ng outlet.",
    summary: "Status ng subscription sa app, pagpili ng plano (Starter kada PS unit o Pro kada outlet, buwanan/taunan), pagbabayad ng bill, pagbili ng hardware (smart plug, serbisyo sa pag-install), at ang AI Add-on.",
    steps: [
      "Tingnan ang status: Trial (30 araw), Aktibo, Naghihintay ng Bayad, Grace Period, o Suspendido.",
      "Pumili ng plano kapag nag-subscribe: Starter (kada aktibong PS unit, minimum 5 unit, operational na feature) o Pro (flat kada outlet, walang limitasyong unit, lahat ng feature + AI). Taunan = magbayad ng 10 buwan, aktibo 12 buwan.",
      "Magbayad ng bill: piliin ang QRIS, bank Virtual Account, o ibang available na paraan. Pagkabayad, pindutin ang \"Markahang Bayad Na\" kung hihingin.",
      "\"Palitan ang Plano\": ang pag-upgrade sa Pro o dagdag na Starter unit quota ay epektibo kapag nabayaran ang prorated na diperensya; ang pag-downgrade, mas maliit na quota, o ibang cycle ay sa susunod na renewal. Gumagawa nang maaga ang \"Mag-renew Ngayon\" ng bill para sa susunod na period.",
      "Bumili ng hardware: piliin ang smart plug o serbisyo sa pag-install, i-set ang dami, mag-checkout — lalabas lahat sa iisang bill.",
      "AI: libre habang nasa trial at kasama sa Pro; sa Starter, ina-activate ito bilang AI Add-on na may buwanang bayad.",
    ],
    notes: [
      "Habang nasa trial, bukas ang lahat ng Pro feature, pero hindi pa makakapagdagdag ng smart plug at limitado sa 1 unit ang kontrol ng Android TV.",
      "Naka-lock sa Starter ang Accounting, Gastos, Ibang Kita, Assets, PPOB, Home Rental, anti-fraud na pag-detect sa shift, at paggawa ng bagong branch (may tatak na PRO sa menu) — nananatili ang data at bukas agad pagka-upgrade. Limitado ang aktibong PS unit ayon sa quota.",
      "Ang lampas-due na bill ay papasok sa 7-araw na Grace Period; pagkatapos noon, masususpendi ang access maliban sa page na Subscription. May paalala araw-araw habang nasa grace period.",
      "Ang mga outlet sa iisang billing group (multi-branch) ay sinisingil sa iisang invoice; may diskwento sa branch ang ika-2 pataas na Pro outlet.",
      "Ang mga bayad dito ay gastos sa NEXBILL at hindi kailanman naitatala bilang kita ng outlet mo.",
    ],
    roles: "Owner, Superuser, Manager.",
  },
  {
    id: "referral",
    group: "sistem",
    label: "Programa sa Referral (Mag-imbita ng Ibang Outlet)",
    summary:
      "Imbitahan ang ibang may-ari ng paupahan na gumamit ng NEXBILL gamit ang code/link ng outlet mo. May 20% discount sila sa unang bayad; may komisyon ka tuwing magbabayad sila ng subscription, hangga't aktibo ito.",
    steps: [
      "Kopyahin ang referral link ng outlet mo (\"?ref=CODE\") at i-share. Awtomatikong nagagawa ang code para sa bawat outlet.",
      "Tuwing magbabayad ng subscription ang outlet na inimbitahan mo, awtomatikong naitatala ang komisyon (default 20%).",
      "Mga card ng buod: kabuuang komisyon at balanseng hindi pa naibabayad. Sa ibaba: kasaysayan ng payout at listahan ng mga outlet na inimbitahan mo.",
      "Ilagay ang bank account mo sa Setting → Negosyo at Buwis. Mano-manong ibinabayad ng team ng NEXBILL ang komisyon tuwing Lunes.",
    ],
    notes: [
      "Galing lang ang komisyon sa bayad sa subscription ng NEXBILL ng mga inimbitahang outlet, hindi sa kita nila. Kusang titigil kapag huminto sila sa pag-subscribe.",
      "Ang antas na Affiliate (27%) at Master Partner (35%) ay ibinibigay ng team ng NEXBILL sa mga partner na aktibong nag-iimbita ng maraming outlet.",
    ],
  },
  {
    id: "rekomendasi-produk",
    group: "sistem",
    label: "Rekomendadong Produkto (Pamimili ng Kagamitan)",
    navHint: "Naka-link mula sa page na Subscription, at mula sa babala tungkol sa smart plug sa Kontrol ng Device.",
    summary:
      "Katalogo ng kagamitan para sa paupahan na pinili ng team ng NEXBILL (controller, accessories, cable, networking, smart plug, atbp.) na may direktang link sa mga online store. Sa pupuntahang tindahan ginagawa ang pagbili, labas sa NEXBILL.",
    steps: [
      "Pumili ng kategorya, i-click ang produkto para buksan ang page ng tindahan nito sa bagong tab.",
      "Kapag binuksan mula sa babala tungkol sa TV na hindi Android sa Kontrol ng Device, agad sinasala ng page na ito ang mga produktong smart plug. Pindutin ang \"Tingnan ang lahat ng rekomendadong produkto\" para makita ang lahat.",
      "Laging suriin ang huling presyo sa page ng tindahan — sanggunian lang ang presyo sa katalogo.",
    ],
    notes: ["Ang mga pagbili rito ay hindi awtomatikong naidadagdag sa bill ng Subscription o sa accounting ng outlet. Itala ito bilang pagbili ng asset o gastos kung kailangan."],
  },
  {
    id: "ai",
    group: "sistem",
    label: "AI Business Intelligence (Magtanong sa Data ng Negosyo)",
    summary:
      "Magtanong ng kahit ano tungkol sa negosyo mo sa pang-araw-araw na wika — binabasa ng AI ang data ng outlet mo (benta, rental, gastos, tubo at lugi, cash, stock, asset) at sumasagot. May panel din ng awtomatikong pagsusuri.",
    subsections: [
      {
        title: "Business Assistant",
        steps: [
          "Mag-type ng tanong, hal. \"Magkano ang kita ngayong buwan kumpara noong nakaraang buwan?\" o \"Aling PS unit ang pinakamalaki ang tubo?\", o i-click ang isa sa mga halimbawang tanong.",
          "Habang nag-iisip, ipinapakita ng AI kung aling data ang sinusuri nito. Ginagamit ng sagot ang pinakabagong numero ng outlet mo.",
        ],
      },
      {
        title: "Insight at Pagsusuri",
        steps: [
          "Trend ng kita at gastos sa 30 araw, forecast sa 7 araw, at pagtukoy ng mga di-pangkaraniwang numero — awtomatikong kinukuwenta nang walang bayad.",
          "Pindutin ang \"Gumawa ng Rekomendasyon\" para humingi ng nakasulat na payo sa AI.",
        ],
      },
    ],
    notes: [
      "Owner at Superuser lang.",
      "Libre habang nasa trial at kasama sa Pro; sa Starter kailangan ng AI Add-on sa menu na Subscription.",
      "Suriin ulit ang mahahalagang numero sa mga report bago gumawa ng malalaking desisyon.",
    ],
  },
  {
    id: "admin",
    group: "sistem",
    label: "Admin Data at Pag-reset ng Data",
    navHint: "Panel ng table para sa Superuser lang. Available din sa Owner ang bahaging Burahin ang Lahat ng Data.",
    summary:
      "Shortcut para direktang ayusin ang master data (produkto, customer, supplier, staff, unit, voucher, cash/bank account, atbp.), at Pag-reset ng Data para burahin ang lahat ng data ng outlet. Gamitin nang napakaingat.",
    steps: [
      "Pumili ng table, pindutin ang Magdagdag/I-edit sa isang row, punan, saka I-save.",
      "Burahin: sa mga table na may status na aktibo (produkto, staff, unit, voucher, atbp.) nagde-deactivate lang ito; sa ibang table permanente itong nagbubura at mabibigo kung ginagamit pa ang row.",
      "Burahin ang Lahat ng Data (Buong Reset) — outlet na ito lang: i-type ulit ang pariralang pangkumpirma, ilagay ang password mo, saka pindutin ang delete button.",
      "PERMANENTENG binubura ng reset ang lahat ng transaksyon, bookkeeping, produkto, stock, customer, gastos, asset, at setting ng outlet na ito. Ang record ng outlet at mga account ng Superuser/Owner lang ang natitira.",
    ],
    notes: [
      "Sinadyang hindi mababago mula rito ang data ng transaksyon (order, bayad, journal, galaw ng stock, audit log) para manatiling tapat ang kasaysayan.",
      "Hindi maibabalik mula sa app ang reset. Kontakin muna ang Customer Service kung hindi sigurado.",
    ],
  },
];
