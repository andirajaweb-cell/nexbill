import type { PageGuideBook } from "./page-guides";

export const PAGE_GUIDES_FIL: PageGuideBook = {
  ui: {"guidePrefix": "Gabay", "open": "Buksan", "close": "Isara", "steps": "Mga hakbang", "tips": "Tandaan"},
  pages: {
    rental: {
      summary: "Pangunahing screen para sa PS rental: magsimula ng session, bantayan ang oras, magdagdag ng F&B sa bill, saka tumanggap ng bayad.",
      steps: [
        "Sa Quick Start panel, pumili ng bakanteng unit, itakda ang tagal (o open play) o pumili ng promo package, saka simulan ang session.",
        "Habang naglalaro, magdagdag ng pagkain, inumin o accessory sa bill, at dagdagan ang oras kung hihilingin ng customer.",
        "I-click ang End Session & Bayad, saka piliin ang paraan ng pagbabayad. Puwedeng hatiin ang isang bill sa ilang paraan (split).",
        "Kung magbabayad mamaya ang customer, isara ang payment window — mababayaran pa rin ang bill sa Cashier (POS).",
      ],
      tips: [
        "Zero ang singil sa unit na zero ang rate. Itakda muna gamit ang button na Itakda ang Rate ng Lahat ng Unit.",
        "Kusang bumubukas at namamatay ang TV o smart plug ayon sa session kapag naka-link na ang unit sa Device Control.",
        "Markahan ng Set Maintenance ang sirang unit o inaayos para hindi ito magamit at hindi lumabas sa online booking.",
      ],
    },
    pos: {
      summary: "Magbenta ng pagkain, inumin at iba pang produkto. Dito rin binabayaran ang mga hindi pa bayad na rental bill.",
      steps: [
        "Hanapin ang produkto ayon sa pangalan o i-scan ang barcode (puwede ang camera ng phone), saka i-tap ang produkto para mailagay sa cart.",
        "Ilagay ang discount o voucher code kung mayroon, saka piliin ang paraan ng pagbabayad.",
        "I-click ang Bayad, saka Print Resibo kung gusto ng customer.",
        "Nasa Open Orders ang mga hindi pa bayad na bill, kasama ang rental session na isinara nang \"bayad mamaya\".",
      ],
      tips: [
        "Wala pang menu? Gamitin ang Mabilisang Dagdag ng Menu (pangalan + presyo). Puwedeng kumpletuhin mamaya ang stock, puhunan at barcode sa Inventory.",
        "Para sa maraming produkto nang sabay, gamitin ang Import ng Produkto mula sa Excel sa Inventory.",
        "Ang bayad sa QRIS at bank transfer ay pumapasok sa sariling QRIS at bank account ng outlet ninyo, na itinakda sa menu na Payments.",
      ],
    },
    booking: {
      summary: "Itala ang reservation mula sa tawag/WhatsApp, tumanggap ng online booking, at i-check in ang customer pagdating.",
      steps: [
        "Ibahagi ang online booking link gamit ang button na Ibahagi ang Booking Link para makapag-book ang customer nang mag-isa.",
        "Para sa order sa tawag/WA, punan ang Bagong Booking (pangalan, numero, unit o \"kahit anong unit\", oras, opsyonal na deposit), o i-click ang bakanteng slot sa Booking Map.",
        "Pagdating ng customer, i-type ang booking code (hal. BK-00001) sa Hanapin at Check-in.",
        "Kumpirmahin, ilipat ng unit, kanselahin o markahang no-show mula sa detalye ng booking.",
      ],
      tips: [
        "Kusang napupunta sa waiting list ang nagbabanggaang iskedyul at umaakyat kapag nabakante ang slot.",
        "Kusang inilalabas ang booking na hindi nag-check in pagkatapos ng takdang oras sa Settings.",
        "Puwedeng pansamantalang patayin ang online booking sa Settings kapag puno ang outlet.",
      ],
    },
    inventory: {
      summary: "Listahan ng produkto at stock. Kusang naitatala sa accounting ang benta, pamimili at stock adjustment.",
      steps: [
        "Magdagdag ng produkto sa tab na Products (pangalan, kategorya, presyo, panimulang stock), o i-Import mula sa Excel para sa marami nang sabay.",
        "Itala ang pamimili sa supplier sa tab na Belanja Supplier — tumataas ang stock at naa-update ang puhunan.",
        "Ilagay ang Minimum Stock para sa babala ng paubos na stock. Kapag may Main Supplier ang produkto, kusang gagawa ng draft na Purchase Order.",
        "Bilangin ang aktuwal na stock paminsan-minsan sa tab na Stock Opname.",
      ],
      tips: [
        "Ang lutong pagkain ay ginagawa sa tab na Recipe / BOM, kaya ang sangkap ang nababawasan kapag nabenta.",
        "I-on ang \"Ipadala sa Kitchen Display\" para lang sa produktong ginagawa ng kusina, hindi sa nakabalot na handang ibenta.",
        "Itala ang sira o expired na produkto gamit ang Adjustment na may dahilang Sira / Waste, hindi sa pagbura ng produkto.",
      ],
    },
    membership: {
      summary: "Datos ng customer, loyalty points at member card para bumalik ang mga customer.",
      steps: [
        "Sa tab na Membership Tier, gumawa ng libreng tier (kusang naaabot mula sa kabuuang gastos) o bayad na tier (member card na ibinebenta sa cashier).",
        "Punan ang awtomatikong benepisyo: discount sa rate ng laro (%) at points multiplier. Ang sistema ang naglalapat nito.",
        "Sa tab na Customer, magdagdag ng customer, saka piliin ang pangalan para makita ang history, magbenta o mag-renew ng member card, at mag-redeem ng points.",
        "Punan ang tab na Reward para mapalitan ang points, at ang tab na Voucher para sa discount code.",
      ],
      tips: [
        "Ang manwal na benepisyo (libreng laro, libreng F&B, atbp.) ay lumalabas lang bilang paalala sa screen ng cashier; ang cashier ang nagbibigay.",
        "Nadadagdagan ang points sa bawat natapos na transaksyon sa pangalan ng customer, kaya piliin ang customer habang nagta-transaksyon.",
        "Puwedeng bigyan ang customer ng Member Card QR, kaya i-scan lang ito ng cashier sa Rental PS.",
      ],
    },
    promo: {
      summary: "Mga package na fixed ang presyo para sa takdang tagal, halimbawa 3 oras ng PS4 sa espesyal na presyo.",
      steps: [
        "Ilagay ang pangalan ng package, piliin ang console (o lahat ng console), ang tagal sa minuto at ang presyo ng package.",
        "Opsyonal: magdagdag ng bundle ng pagkain/inumin. Pumapasok sa bill sa presyong zero ang mga item kapag ginamit ang package.",
        "I-save. Agad itong mapipili ng cashier kapag nagsisimula ng session sa Rental PS.",
      ],
      tips: [
        "Halimbawang package: \"Night Package 3 Oras\" (180 minuto) o \"Laro 2 Oras + Iced Tea\".",
        "Ginagamit din ng AI agent ang mga package kapag sumasagot sa chat ng customer.",
        "I-deactivate na lang ang package na hindi na iniaalok para manatili ang history nito.",
      ],
    },
    reports: {
      summary: "Mga operational report ayon sa panahon. Pumili ng panahon, saka buksan ang tab na kailangan.",
      steps: [
        "Piliin ang panahon sa itaas ng tab (hal. ngayon, ngayong buwan o sariling petsa); agad na magre-reload ang report.",
        "Benta: kabuuang kita, araw-araw na trend at kita ayon sa paraan ng pagbabayad.",
        "Rental: dami ng session, karaniwang tagal at kita kada PS unit para makita kung aling unit ang pinakamabenta.",
        "Inventory at COGS para sa margin kada produkto at paubos na stock; Customers para sa nangungunang customer; Expenses para sa gastos ayon sa kategorya.",
      ],
      tips: [
        "Para sa araw-araw na pagsusuri, sapat na ang kabuuang kita, kita kada PS unit at paubos na stock.",
        "Ang opisyal na kita ay nasa Accounting › Profit & Loss. Ipinapakita ng tab na Benta kung paano pagtugmain ang dalawa.",
        "Ipinapakita ng tab na Financial Health ang margin, liquidity at progreso sa break-even target ng outlet.",
      ],
    },
  },
};
