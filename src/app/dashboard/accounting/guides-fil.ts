import type { AccountingGuideSet } from "./guides";

/** Filipino na bersyon ng guides.ts. */
export const GUIDES_FIL: AccountingGuideSet = {
  tabs: {
    "Chart of Accounts": {
      summary: "Listahan ng lahat ng \"drawer\" kung saan naitatala ang pananalapi ng outlet (mga account). Bawat perang pumapasok o lumalabas ay laging naitatala sa isa sa mga account dito.",
      concept: [
        "Ang Chart of Accounts (CoA) ay listahan ng mga account na nakagrupo sa 5 klase: 1 Assets (pag-aari), 2 Liabilities (utang/obligasyon), 3 Equity (kapital ng may-ari), 4 Kita, 5–8 Gastos (COGS at gastos sa operasyon).",
        "Ang parent account (header, naka-bold) ay nagsusuma lang ng mga account sa ilalim nito at hindi puwedeng tumanggap ng journal entry. Laging pumapasok ang transaksyon sa child account (posting account).",
        "Normal na balanse: tumataas ang Assets at Gastos sa Debit; tumataas ang Liabilities, Equity, at Kita sa Credit.",
      ],
      uses: [
        "Tinutukoy kung aling mga linya ang lalabas sa Balance Sheet at Income Statement.",
        "Pagdagdag ng account na akma sa negosyo mo, hal. pangalawang bank account, bagong e-wallet account, o partikular na uri ng gastos.",
      ],
      watch: [
        "Huwag burahin o palitan ang klase ng account na may transaksyon na — magbabago rin ang ulat ng mga nakaraang period. Kung hindi na ginagamit, i-deactivate na lang.",
        "Sumusunod sa klase ang account code: ang bank account ay dapat magsimula sa 112x, e-wallet 113x, gastos 6xxx. Kapag mali ang klase ng code, lalabas ang account sa maling bahagi ng ulat.",
        "May sariling CoA ang bawat outlet. Hindi magagamit ng ibang outlet ang account ng isang outlet.",
      ],
      steps: [
        "Pagsimula sa NEXBILL: suriin ang mga default account, idagdag ang bank/e-wallet account na talagang ginagamit mo.",
        "Magdagdag lang ng bagong account kung walang angkop na default — piliin ang tamang parent para mapunta sa tamang grupo ng ulat.",
        "Pagkatapos magdagdag ng cash/bank/e-wallet account, i-link ito sa tab na Account Mapping (Payment module) para awtomatikong pumasok doon ang mga transaksyon.",
      ],
    },

    "Account Mapping": {
      summary: "Mga awtomatikong panuntunan na \"ang transaksyong uri X ay itatala sa account Y\". Hindi pumipili ng account ang cashier — sinusunod ng system ang talahanayang ito.",
      concept: [
        "Bawat module (Rental, F&B, Produkto, PPOB, Gastos, Assets, Bayad, atbp.) ay naghahanap ng target account nito sa talahanayang ito ayon sa module + uri ng transaksyon.",
        "Halimbawa: Payment module key \"qris\" → account 1131 QRIS (default), kaya bawat bayad sa QRIS ay nagdaragdag sa balanse ng QRIS account, hindi sa Cash.",
        "Kung walang row, ang default account ang ginagamit. Kaya ang talahanayang ito ay para MAG-ADJUST, hindi kailangang punan mula sa zero.",
      ],
      uses: [
        "Paghiwalayin ang kita ayon sa uri ng console/produkto para mas detalyado ang Income Statement.",
        "Tukuyin kung saang account papasok ang pera mula sa bawat paraan ng bayad — batayan ng reconciliation ng balanse kada channel sa pagsara ng shift.",
        "Idirekta ang COGS, depreciation, inventory, at utang sa pagbili ng asset sa account na gusto mo.",
      ],
      watch: [
        "Dapat tugma ang uri ng account sa gamit nito: kita → revenue account, bayad → cash/bank account, COGS/gastos → expense account. Awtomatiko itong sinusuri ng Audit tab.",
        "Ang key column (transaction key) ay ang salitang hinahanap ng system — huwag itong baguhin. Kapag binago ang key, titigil sa paggamit ang row nang walang error message.",
        "Ang pagbabago sa mapping ay para lang sa BAGONG transaksyon. Nananatili sa lumang account ang mga lumang transaksyon; ilipat gamit ang manual journal kung kailangan.",
        "Ang custom na paraan ng bayad na hindi pa naka-map ay papasok sa pangkalahatang Bank account (1121) — magbababala ang Audit tab.",
      ],
      steps: [
        "Pagkatapos magdagdag ng bagong paraan ng bayad (hal. ibang e-wallet), magdagdag ng Payment module row para dito papunta sa tamang e-wallet account.",
        "Palitan ang target account gamit ang edit button, saka tingnan ang susunod na ilang transaksyon sa Journal tab para matiyak na tama ang account.",
        "Patakbuhin ang Audit tab → \"Account Mapping\" pagkatapos magbago ng kahit ano rito.",
      ],
    },

    Jurnal: {
      summary: "Ang talaarawan ng lahat ng transaksyon sa anyong debit–credit. Halos lahat ng journal entry ay awtomatikong ginagawa ng system.",
      concept: [
        "Bawat transaksyon ay naitatala sa double entry: laging pantay ang kabuuang Debit at kabuuang Credit. Halimbawa, PS rental na binayaran ng cash Rp50,000: Debit Cashier Cash Rp50,000, Credit Rental Revenue Rp50,000.",
        "Ipinapakita ng Source column kung saan galing ang entry (Rental, POS, Gastos, Pagbili ng Asset, Depreciation, Manual, atbp.).",
        "HINDI binubura ang kinanselang transaksyon: gumagawa ang system ng reversing entry (pinagpalit ang debit/credit) para bumalik sa zero ang balanse at manatili ang audit trail.",
      ],
      uses: [
        "Pagsubaybay kung saan galing ang isang numero sa ulat.",
        "Pagtatala ng transaksyong walang sariling menu sa Manual Journal: dagdag-kapital ng may-ari, personal na pag-withdraw (drawings), pagwawasto ng mali, interes/bayarin sa bangko, pagbabayad ng lumang utang.",
      ],
      watch: [
        "Huwag nang itala muli sa manual journal ang transaksyong naitala na ng module nito (benta, gastos, pagbili sa supplier, pagbili ng asset) — madodoble ito.",
        "Dapat balanse ang manual journal at child account ang gamit, hindi parent account.",
        "Hindi na puwedeng tumanggap ang saradong period ng entry na may petsa sa loob nito — itala ang pagwawasto gamit ang petsa ngayon.",
        "Ang paggamit ng Cash account sa manual journal ay nagbabago sa balanse ng cash; siguraduhing gumalaw talaga ang pera.",
      ],
      steps: [
        "Para suriin: i-filter ang period, maghanap ayon sa reference/description, buksan ang detalye ng row para makita ang debit–credit accounts nito.",
        "Para iwasto: gumawa ng manual journal na binabaligtad ang maling bahagi at itinatala ang tama, na may malinaw na description (\"Pagwawasto ng maling expense account noong …\").",
        "Dagdag-kapital: Debit Cash/Bangko, Credit 3110 Owner's Capital. Drawings: Debit 3130 Drawings, Credit Cash/Bangko.",
      ],
    },

    "Neraca Saldo": {
      summary: "Ang balanse ng lahat ng account sa isang period. Pangunahing kontrol: dapat pantay ang kabuuang Debit at kabuuang Credit.",
      concept: [
        "Ibinubuod ng Trial Balance ang journal kada account: magkano ang nadagdag (debit), magkano ang nabawas (credit), at ang natira (balanse).",
        "Kapag kabuuang Debit = kabuuang Credit, balanse ang libro. Ang balanse ay hindi laging tama (puwedeng mali ang napiling account), pero kapag hindi balanse, siguradong may problema.",
        "Itinatago ang pares ng kinanselang transaksyon + reversal nito na parehong nasa loob ng period dahil nagkakansela sila.",
      ],
      uses: [
        "Panimulang punto sa pagsusuri ng kalusugan ng libro bago tingnan ang Income Statement at Balance Sheet.",
        "Itugma ang balanse ng account sa totoo: Cashier Cash sa pera sa drawer, Bangko sa bank statement, QRIS sa dashboard ng QRIS provider.",
      ],
      watch: [
        "Abnormal na balanse (may marka): Asset na mas mababa sa zero o Liability na may debit balance. Kadalasan may totoong transaksyong hindi pa naitatala (deposito, top-up, bayad).",
        "Ang malalaking numero sa Debit/Credit column ay galaw, hindi natira. Tingnan ang balance column para sa huling halaga.",
        "May balanse ang Receivables kahit bayad na lahat ng customer → suriin ang Receivables at Audit tab.",
      ],
      steps: [
        "Araw-araw/linggo-linggo: itugma ang balanse ng Cashier Cash, Bangko, at e-wallet sa tunay na pera/balanse.",
        "I-click ang kahit anong account para makita ang mga entry sa likod nito (general ledger). I-on ang \"ipakita ang kinanselang transaksyon\" para lang sa audit.",
        "Diperensyang hindi maipaliwanag → patakbuhin ang Audit tab.",
      ],
    },

    "Piutang (AR)": {
      summary: "Mga singil sa customer na hindi pa buong bayad — perang may karapatan pa ang outlet.",
      concept: [
        "Awtomatikong lumalabas ang Receivables kapag isinara ang order/rental pero kulang ang bayad. Ang natira ay naitatala sa account 1141 Customer Receivables (default).",
        "Kapag nagbayad ang customer, bumababa ang receivables at tumataas ang Cash/Bangko/e-wallet — hindi na madaragdagan ang kita, dahil kinilala na ito noong order.",
        "Nakagrupo ayon sa edad (aging) ang receivables: hindi pa due, 1–30, 31–60, at higit 60 araw.",
      ],
      uses: [
        "Paningilin ang mga customer na hindi pa buong bayad at bantayan kung gaano katagal nang nakabinbin ang singil.",
        "Tumanggap ng bayad direkta mula sa tab na ito gamit ang paraan ng bayad ng customer.",
      ],
      watch: [
        "Ang receivables na higit 60 araw ay may panganib na hindi na makolekta. Pag-iingat: isaalang-alang ang write-off (manual journal sa bad-debt expense) kung malinaw na hindi na babayaran.",
        "Huwag tumanggap ng bayad sa ibang menu at dito rin — pumili ng isang lugar para hindi maitala nang dalawang beses.",
        "Ang receivables na \"wala na ang pinagmulang transaksyon\" ay hindi mababayaran gamit ang button; ayusin gamit ang manual journal.",
      ],
      steps: [
        "Tingnan ang tab na ito araw-araw bago isara ang shift.",
        "I-click ang Tanggapin ang Bayad → ilagay ang halaga (puwedeng bahagi lang) → piliin ang paraan → i-save. Papasok ang pera sa account ayon sa Account Mapping ng paraang iyon.",
        "Buwanan: suriin ang aging; paningilin ang higit 30 araw, magpasya ng write-off para sa hindi na makokolekta.",
      ],
    },

    "Hutang (AP)": {
      summary: "Lahat ng obligasyon ng outlet na hindi pa bayad: sa supplier, sa pagbili ng asset, at mga gastos na naitalang utang.",
      concept: [
        "Nagkakaroon ng Payables kapag tumanggap ka ng paninda/serbisyo pero babayaran mamaya: pagbili sa supplier nang pautang (2111 Supplier Payables), Pagbili ng Asset na may down payment/pautang (Asset Purchase Payables, default 2163), at Gastos na naitalang utang.",
        "Ang pagbabayad ng utang ay hindi na nagdaragdag ng gastos — naitala na ang gastos/asset sa orihinal na transaksyon. Binabawasan lang ng bayad ang utang at ang Cash/Bangko.",
      ],
      uses: [
        "Makita sa iisang lugar ang lahat ng singil na kailangang bayaran kasama ang edad nito.",
        "Magbayad (buo o hulugan) direkta mula rito.",
      ],
      watch: [
        "Ang utang na lampas na sa due date ay nakakasira sa relasyon sa supplier — bantayan ang age column.",
        "Magbayad sa tab na ito o sa orihinal na menu; huwag nang magdagdag ng manual journal — madodoble.",
        "Piliin ang cash/bank account kung saan talaga lumabas ang pera. Kung galing sa drawer ng cashier, babawasan din ng bayad ang inaasahang cash ng shift.",
      ],
      steps: [
        "Lingguhan: ayusin mula sa pinakaluma, i-iskedyul ang mga bayad.",
        "I-click ang Bayaran → ilagay ang halaga (puwedeng hulugan para sa supplier at asset) → piliin ang paraan at cash/bank account → i-save.",
        "Katapusan ng buwan: ang balanse ng payable account sa Trial Balance ay dapat katumbas ng kabuuan sa tab na ito.",
      ],
    },

    "Laba Rugi": {
      summary: "Kung kumita o nalugi ang negosyo sa isang period: Kita bawas ang COGS at Gastos.",
      concept: [
        "Inihahanda ang Income Statement sa accrual basis (SAK EMKM): kinikilala ang kita kapag nangyari ang transaksyon (business date ng order), hindi kapag natanggap ang pera; kinikilala ang gastos kapag natamo.",
        "Gross Profit = Kita − COGS (puhunan ng nabentang paninda). Net Profit = Gross Profit − Gastos sa Operasyon (sahod, kuryente, renta, depreciation, atbp.) ± ibang kita/gastos.",
        "Ang depreciation ng asset ay gastos kahit walang perang lumabas — ipinapakita nito ang pagbaba ng halaga ng PS/TV dahil ginagamit.",
      ],
      uses: [
        "Pagtatasa ng buwanang performance at paghahambing ng mga period.",
        "Makita ang pinakamalalaking pinagmumulan ng kita (rental, F&B, produkto, PPOB) at pinakamalalaking gastos.",
        "Batayan sa pagkalkula ng final income tax ng MSME sa Indonesia (0.5% ng gross turnover).",
      ],
      watch: [
        "Normal ang malaking kita pero kaunting cash kapag may receivables, dumaming stock, o pagbili ng asset — tingnan ang Cash Flow.",
        "Ang babalang \"hindi pa nakalkula ang COGS\" ay nangangahulugang may produktong walang Cost Price; mukhang mas malaki ang kita kaysa totoo.",
        "Kapag hindi pinatakbo ang buwanang depreciation, mukhang masyadong mataas ang kita.",
        "Ang mga gastos na hindi pa naitatala (bayarin sa kuryente/internet ngayong buwan) ay nagpapalaki sa kita — itala bilang gastos na utang kung hindi pa bayad.",
      ],
      steps: [
        "Pumili ng period (kadalasan ay nakaraang buwan pagkatapos isara ang libro) at ihambing sa naunang period.",
        "I-click ang kahit anong row para makita ang mga transaksyon sa likod nito.",
        "Bago basahin ang kita sa katapusan ng buwan: siguraduhing naitala ang lahat ng gastos, napatakbo ang depreciation, at tapos na ang stock count.",
      ],
    },

    Rekonsiliasi: {
      summary: "Pagtutugma ng mga transaksyon ng benta (Transactions page) sa kanilang revenue journal, kada order.",
      concept: [
        "Bawat bayad na order ay dapat may eksaktong isang sales journal na may parehong halaga at business date.",
        "Mga status: Tugma, Naghihintay ng bayad, Magkaibang petsa, Magkaibang halaga, Nawawalang journal, Kinanselang order pero may journal pa, at Journal na walang order.",
      ],
      uses: [
        "Tiyaking ang benta sa sales report ay katumbas ng kita sa Income Statement.",
        "Ayusin ang nalaktawan/magkaibang journal gamit ang Resync button nang walang manual input.",
      ],
      watch: [
        "Ang magkaibang halaga o nawawalang journal ay nangangahulugang hindi tumpak ang Income Statement para sa petsang iyon.",
        "Ang order na lumampas ng hatinggabi ay naitatala sa business date (araw na binuksan), hindi sa oras ng bayad — sinadya ito.",
        "Kinakansela ng Resync ang lumang journal at ipino-post ulit; hindi ito magagawa sa saradong period.",
      ],
      steps: [
        "Araw-araw (pagkatapos isara ang shift): piliin ang \"ngayon\", siguraduhing Tugma o Naghihintay ng bayad ang lahat ng row.",
        "Row na may problema → i-click ang Resync, saka i-reload para matiyak na Tugma na ang status.",
        "Gawin ito bago ang Close Period bawat buwan.",
      ],
    },

    Neraca: {
      summary: "Ang posisyong pinansyal sa isang petsa: ang pag-aari (Assets), ang inuutang (Liabilities), at ang kapital ng may-ari (Equity).",
      concept: [
        "Laging totoo ang pangunahing equation: Assets = Liabilities + Equity. Sa SAK EMKM, tinatawag ang ulat na ito na Statement of Financial Position.",
        "Ipinapakita ang fixed assets (PS, TV, muwebles) sa halaga ng pagbili bawas ang naipong depreciation = book value.",
        "Ang kita ng kasalukuyang taon ay pumapasok sa Equity; pagkatapos isara ang taon, nagiging Retained Earnings.",
      ],
      uses: [
        "Malaman ang netong halaga ng negosyo at kakayahang magbayad ng utang (cash + receivables kumpara sa panandaliang utang).",
        "Dokumentong karaniwang hinihingi ng bangko/leasing para sa loan application.",
      ],
      watch: [
        "Dapat balanse ang Balance Sheet. Kung hindi, patakbuhin ang Audit tab.",
        "Ang balanse ng Cash sa Balance Sheet ay dapat katumbas ng tunay na pera; ang diperensya ay nangangahulugang may transaksyong hindi pa o maling naitala.",
        "Dapat tugma ang Inventory sa resulta ng stock count.",
      ],
      steps: [
        "Pumili ng petsa (kadalasan ay katapusan ng buwan) kapag kumpleto na ang lahat ng transaksyon ng buwang iyon.",
        "I-click ang row para sundan ang numerong kakaiba.",
        "Ihambing sa katapusan ng nakaraang buwan para makita ang pagbabago sa utang, receivables, at kapital.",
      ],
    },

    "Arus Kas": {
      summary: "Ang perang talagang pumasok at lumabas sa mga cash at bank account sa isang period.",
      concept: [
        "Iba sa Income Statement: ang Cash Flow ay nagbibilang lang ng perang gumalaw. Hindi kasama ang hindi pa bayad na benta (receivables); ang pagbili ng asset at pagbabayad ng utang ay binibilang na cash out kahit hindi gastos.",
        "Kinakalkula direkta mula sa galaw ng Cash/Bank account sa journal, kaya ang net cash ay laging katumbas ng pagbabago ng balanse ng mga account na iyon sa Trial Balance. Nakalista sa ibaba ng ulat ang mga account na binibilang (cash 111x, bank 112x, at mga account na nakarehistro bilang cash/bank).",
        "Ang paglipat ng cash sa pagitan ng sariling drawer/account ay zero ang net at hindi binibilang na cash flow.",
      ],
      uses: [
        "Malaman kung saan galing ang pera at saan ito napunta.",
        "Planuhin ang malalaking bayarin (supplier, hulog sa asset, sahod) batay sa pang-araw-araw na pattern ng cash.",
      ],
      watch: [
        "Malaking kita pero negatibo ang net cash: suriin ang pagbili ng asset, pagbabayad ng utang, pagdami ng stock, o naiipong receivables.",
        "Ang kakaibang cash in/out ay madalas galing sa manual journal na gumagamit ng Cash account — sundan sa Journal.",
      ],
      steps: [
        "Lingguhan/buwanan: pumili ng period, tingnan ang pinakamalaking kategorya ng cash out.",
        "Siguraduhing ang net cash ng period = pagbabago ng balanse ng cash/bank account sa Trial Balance sa parehong period.",
      ],
    },

    "CALK (SAK EMKM)": {
      summary: "Mga Tala sa Financial Statements — ang ikatlong bahaging hinihingi ng SAK EMKM, awtomatikong inihahanda.",
      concept: [
        "Ang SAK EMKM (pamantayan sa accounting ng Indonesia para sa Micro, Small at Medium Entities) ay humihingi ng tatlong ulat: Statement of Financial Position (Balance Sheet), Income Statement, at ang Mga Tala (CALK).",
        "Ipinapaliwanag ng Mga Tala ang pagkakakilanlan ng negosyo, batayan ng paghahanda (accrual, historical cost), mga patakaran sa accounting (weighted-average o FIFO na inventory ayon sa pinili ng outlet, straight-line depreciation), detalye ng mga linya ng ulat, at income tax.",
      ],
      uses: [
        "Kumpletuhin ang financial statements para sa bangko, investor, kooperatiba, o pag-uulat ng buwis.",
        "Ipi-print / ise-save bilang PDF kasama ang Balance Sheet at Income Statement.",
      ],
      watch: [
        "Ang datos ng pagkakakilanlan (pangalan, address, tax ID, uri ng negosyo) ay galing sa datos ng outlet sa Settings — kumpletuhin doon.",
        "Ang tantiyang 0.5% final income tax ay pang-impormasyon lang; ang tunay na obligasyon ay nakadepende sa tax status at pasilidad mo.",
        "Kasingtumpak lang ng libro ang Mga Tala — patakbuhin ang Audit at tiyaking kumpleto ang period bago mag-print.",
      ],
      steps: [
        "Piliin ang period ng ulat (kadalasan isang financial year, o buwanan para sa internal na ulat).",
        "Suriin ang detalye ng fixed assets at buwis, saka i-click ang I-print / I-save ang PDF.",
      ],
    },

    Audit: {
      summary: "Awtomatikong pagsusuri sa kalusugan ng libro batay sa prinsipyo ng pag-iingat — hanapin ang problema bago ito pumasok sa ulat.",
      concept: [
        "Sinusuri ng audit ang mga bagay na hindi nakikita sa ulat: dobleng entry, hindi balanseng entry, kinanselang transaksyong may bisa pa, hindi valid na pinagmulan ng cash posting, maling account mapping, halaga ng inventory, negatibong stock, walang COGS, abnormal na balanse, tumatandang receivables, hindi pa saradong period, at buwis.",
        "Berde = ligtas, dilaw = kailangang bantayan, pula = dapat ayusin.",
        "Ang awtomatikong pag-aayos ay laging naitatalang correcting/reversing entry na pumapasok sa audit log — walang datos na binubura.",
      ],
      uses: [
        "Regular na pagsusuri bago ang buwanang pagsara ng libro.",
        "Hanapin ang dahilan kapag kakaiba ang balanse ng Cash, Receivables, o Kita.",
      ],
      watch: [
        "Basahin ang paliwanag ng bawat finding bago pindutin ang fix button.",
        "I-adjust lang ang halaga ng inventory kapag tama na ang Cost Price ng produkto at ang stock count.",
        "Ang finding na walang awtomatikong pag-aayos ay kailangang ayusin nang manu-mano (hal. punan ang Cost Price, suriin ang shift).",
      ],
      steps: [
        "Patakbuhin kahit isang beses kada linggo at laging bago ang Close Period.",
        "Unahin ang pula, saka ang dilaw. Patakbuhin muli ang Audit hanggang malinis.",
      ],
    },

    "Tutup Periode": {
      summary: "Pag-lock sa buwang naiulat na para hindi na magbago ang mga numero nito.",
      concept: [
        "Kapag sarado na ang period, walang bagong journal entry (awtomatiko o manual) ang puwedeng may petsa sa loob nito.",
        "Ang pagwawasto pagkatapos isara ay itinatala gamit ang petsa ngayon (kasalukuyang period), hindi sa pagbubukas muli ng lumang period.",
      ],
      uses: [
        "Panatilihing pareho ang mga ulat na naibigay na sa may-ari/bangko/opisina ng buwis.",
        "Pigilan ang backdated na transaksyon na puwedeng maging butas sa pandaraya.",
      ],
      watch: [
        "Isara lang kapag kumpleto na ang lahat ng transaksyon ng buwang iyon: sarado ang shift, naitala ang gastos, napatakbo ang depreciation, stock count, bank reconciliation.",
        "Buksan muli ang period kapag talagang kailangan lang at ng Owner lang — naitatala ang bawat bukas/sara.",
      ],
      steps: [
        "Checklist sa katapusan ng buwan (ika-1–5 ng susunod na buwan): isara lahat ng shift → itala ang gastos at bayarin → patakbuhin ang depreciation sa Assets menu → stock count → itugma ang balanse ng bangko/e-wallet → Reconciliation → malinis na Audit.",
        "Piliin ang buwan → Close Period.",
        "I-print ang Balance Sheet, Income Statement, at Mga Tala ng buwang iyon bilang archive.",
      ],
    },

    "Migrasi Data": {
      summary: "Paglipat ng libro mula sa lumang system/record papunta sa NEXBILL.",
      concept: [
        "Karaniwang paraan ng migration: isang Opening Balance entry sa cutover date na naglalaman ng balanse ng bawat account (Cash, Bangko, Receivables, Inventory, Assets, Utang, Kapital). Hindi kailangang ilipat isa-isa ang lumang transaksyon.",
        "Ang diperensya sa debit–credit ng opening balance ay inilalagay sa 3400 Opening Balance Equity (default).",
        "Ang Historical Data Import (Excel) ay para lang sa ulat ng nakaraang period; hindi lalabas ang datos na iyon sa Transactions page o sa stock.",
      ],
      uses: [
        "Simulan ang NEXBILL nang hindi nawawala ang balanse mula sa dating system.",
        "Ihambing ang ulat bago at pagkatapos gumamit ng NEXBILL.",
      ],
      watch: [
        "Isang beses LANG ilalagay ang opening balance. Kapag inilagay nang dalawang beses, madodoble ang lahat ng balanse.",
        "Mas maayos itala ang fixed assets na pag-aari na sa Assets → Pagbili ng Asset → \"Opening balance\" para ma-depreciate kada unit — huwag na itong itala ulit sa opening balance entry.",
        "Ang opening stock ng produkto ay itinatala sa Inventory (opening stock), hindi rito, para magkatugma ang bilang ng unit at halaga.",
      ],
      steps: [
        "Tukuyin ang cutover date (kadalasan ay simula ng buwan).",
        "Ihanda ang balanse ng bawat account mula sa lumang ulat sa petsang iyon, saka ilagay sa Opening Balance hanggang kabuuang debit = credit.",
        "Opsyonal: i-import ang historical data gamit ang Excel template.",
        "Suriin ang Balance Sheet sa cutover date — dapat katumbas ng luma mong balance sheet.",
      ],
    },
  },

  workflow: [
    {
      when: "Isang beses sa simula",
      items: [
        "Suriin ang Chart of Accounts; idagdag ang bank at e-wallet account na ginagamit.",
        "I-set ang Account Mapping ng mga paraan ng bayad sa tamang account.",
        "Ilagay ang Opening Balance (Data Migration tab), opening stock ng produkto (Inventory), at assets na pag-aari na (Assets → Pagbili ng Asset → Opening balance).",
      ],
    },
    {
      when: "Araw-araw",
      items: [
        "Binubuksan at isinasara ng cashier ang shift; bilangin nang tapat ang pera sa drawer — ang diperensya sa cash ang pangunahing babala.",
        "Itala ang bawat gastos sa Expense menu, pagbili ng stock sa Supplier Purchases, pagbili ng PS/TV/muwebles sa Assets → Pagbili ng Asset.",
        "Suriin ang Receivables: paningilin ang hindi pa bayad.",
        "Reconciliation ngayong araw: dapat Tugma ang lahat ng order.",
      ],
    },
    {
      when: "Linggo-linggo",
      items: [
        "Itugma ang balanse ng Bangko at e-wallet/QRIS sa Trial Balance sa bank statement/dashboard ng provider.",
        "Bayaran ang utang sa supplier/asset na due na (Payables tab).",
        "Patakbuhin ang Audit tab at ayusin ang pulang finding.",
      ],
    },
    {
      when: "Tuwing katapusan ng buwan",
      items: [
        "Itala ang buwanang bayarin (kuryente, internet, renta, sahod) — bilang utang kung hindi pa bayad.",
        "Patakbuhin ang Depreciation sa Assets menu.",
        "Stock count sa Inventory.",
        "Audit hanggang malinis, saka Close Period.",
        "Basahin ang Income Statement, Balance Sheet, at Cash Flow; i-save ang PDF bilang archive.",
      ],
    },
    {
      when: "Tuwing katapusan ng taon",
      items: [
        "Siguraduhing sarado na ang 12 buwan.",
        "I-print ang taunang Statement of Financial Position, Income Statement, at Mga Tala (SAK EMKM).",
        "Kalkulahin at bayaran ang final income tax ng MSME sa Indonesia (0.5% ng gross turnover kung kwalipikado pa), saka itala ang bayad.",
      ],
    },
  ],

  golden: [
    "Isang beses lang itala ang bawat transaksyon, sa sarili nitong menu. Ang manual journal ay para lang sa walang menu.",
    "Huwag burahin — kanselahin. Gumagawa ang pagkansela ng reversing entry para ma-audit pa rin ang bakas.",
    "Paghiwalayin ang personal na pera at pera ng negosyo. Ang personal na pag-withdraw ay itinatala bilang Drawings, hindi gastos.",
    "Bawat diperensya (cash sa drawer, balanse sa bangko, stock) ay dapat ipaliwanag, hindi pabayaan.",
    "Kasingtumpak lang ng input ang ulat: tamang cost price ng produkto, depreciation, at kumpletong gastos ang nagtatakda ng tunay na kita.",
  ],
};
