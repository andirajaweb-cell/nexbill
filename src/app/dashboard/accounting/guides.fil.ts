import type { AccountingGuideBook } from "./guides";

/** Salin sa Filipino ng guides.ts — parehong mga tab at parehong bilang ng item sa bawat bahagi. */
export const ACCOUNTING_GUIDE_BOOK_FIL: AccountingGuideBook = {
  tabs: {
    "Chart of Accounts": {
      summary: "Ang listahan ng lahat ng \"kahon\" ng pagtatala ng pera ng outlet (mga account). Bawat perang pumapasok o lumalabas ay laging naitatala sa isa sa mga account dito.",
      concept: [
        "Ang Chart of Accounts (CoA) ay listahan ng mga account na nakapangkat sa 5 klase: 1 Asset (pag-aari), 2 Pananagutan (utang/obligasyon), 3 Equity (puhunan ng may-ari), 4 Kita, 5–8 Gastos (COGS at operating costs).",
        "Ang parent account (header, naka-bold) ay nagsusuma lang ng mga account sa ilalim nito at hindi makatatanggap ng journal. Laging pumapasok ang transaksyon sa child account (posting account).",
        "Normal na balanse: tumataas ang Asset at Gastos sa panig ng Debit; tumataas ang Pananagutan, Equity, at Kita sa panig ng Credit.",
      ],
      uses: [
        "Itinatakda ang mga linyang lalabas sa Balance Sheet at Income Statement.",
        "Pagdaragdag ng account na angkop sa negosyo mo, hal. pangalawang bank account, bagong e-wallet account, o partikular na uri ng gastos.",
      ],
      watch: [
        "Huwag burahin o palitan ang klase ng account na may transaksyon na — magbabago rin ang mga nakaraang ulat. Kung hindi na ginagamit, i-deactivate na lang.",
        "Sumusunod sa klase ang code ng account: ang bank account ay dapat magsimula sa 112x, e-wallet sa 113x, gastos sa 6xxx. Ang code na mali ang klase ay lalabas sa maling bahagi ng ulat.",
        "May sariling CoA ang bawat outlet. Hindi magagamit ng ibang outlet ang account ng isang outlet.",
      ],
      steps: [
        "Sa pagsisimula sa NEXBILL: suriin ang mga default na account, idagdag ang mga bank/e-wallet account na talagang ginagamit mo.",
        "Magdagdag lang ng bagong account kapag walang angkop na default — piliin ang tamang parent para mapunta sa tamang klase ng ulat.",
        "Pagkatapos magdagdag ng cash/bank/e-wallet account, ikonekta ito sa tab na Account Mapping (Payment module) para awtomatikong mapunta roon ang mga transaksyon.",
      ],
    },

    "Account Mapping": {
      summary: "Mga awtomatikong panuntunang \"ang transaksyong uri X ay itatala sa account Y\". Hindi pumipili ng account ang kahera — sinusunod ng sistema ang talahanayang ito.",
      concept: [
        "Bawat module (Rental, F&B, Produkto, PPOB, Expense, Asset, Payment, atbp.) ay naghahanap ng target na account nito sa talahanayang ito ayon sa module + uri ng transaksyon.",
        "Halimbawa: Payment module key na \"qris\" → account 1131 QRIS (default), kaya bawat bayad sa QRIS ay nagdaragdag sa balanse ng QRIS account, hindi sa Cash.",
        "Kung walang row, gagamitin ng sistema ang default na account. Kaya ang talahanayang ito ay para MAG-ADJUST, hindi kailangang punan mula sa simula.",
      ],
      uses: [
        "Paghiwalayin ang kita ayon sa uri ng console/produkto para mas detalyado ang Income Statement.",
        "Pagtakda kung saang account papasok ang pera mula sa bawat paraan ng pagbabayad — batayan ng reconciliation ng balanse bawat channel sa pagsasara ng shift.",
        "Pagdirekta ng COGS, depreciation, imbentaryo, at utang sa pagbili ng asset sa mga account na gusto mo.",
      ],
      watch: [
        "Dapat tugma ang uri ng account sa gamit nito: kita → revenue account, bayad → cash/bank account, COGS/gastos → expense account. Awtomatikong sinusuri ito ng tab na Audit.",
        "Ang column na key (transaction key) ay ang salitang hinahanap ng sistema — huwag itong baguhin. Ang pagbago sa key ay magpapatigil sa row nang walang error message.",
        "Sa mga BAGONG transaksyon lang umiiral ang pagbabago sa mapping. Nananatili ang mga lumang transaksyon sa dating account; ilipat sa manual na journal kung kailangan.",
        "Ang custom na paraan ng pagbabayad na hindi pa naka-map ay mapupunta sa pangkalahatang Bank account (1121) — magbababala ang tab na Audit.",
      ],
      steps: [
        "Pagkatapos magdagdag ng bagong paraan ng pagbabayad (hal. ibang e-wallet), magdagdag ng Payment module row para dito papunta sa angkop na e-wallet account.",
        "Palitan ang target na account gamit ang edit button, saka tingnan ang ilang susunod na transaksyon sa tab na Journal para matiyak na tama ang account.",
        "Patakbuhin ang tab na Audit → \"Account Mapping\" pagkatapos magbago ng kahit ano rito.",
      ],
    },

    Jurnal: {
      summary: "Ang talaarawan ng lahat ng transaksyon sa anyong debit–credit. Halos lahat ng journal ay awtomatikong ginagawa ng sistema.",
      concept: [
        "Bawat transaksyon ay itinatala sa prinsipyong double entry: laging magkapareho ang kabuuang Debit at kabuuang Credit. Halimbawa, upa ng PS na binayaran ng cash na Rp50,000: Debit Cash ng Kahera Rp50,000, Credit Kita sa Rental Rp50,000.",
        "Ipinapakita ng column na Pinagmulan kung saan galing ang journal (Rental, POS, Expense, Pagbili ng Asset, Depreciation, Manual, atbp.).",
        "HINDI binubura ang kinanselang transaksyon: gumagawa ang sistema ng reversing entry (binaligtad ang debit/credit) para bumalik sa zero ang balanse at manatili ang audit trail.",
      ],
      uses: [
        "Pagtunton kung saan galing ang isang numero sa ulat.",
        "Pagtatala ng mga transaksyong walang sariling menu sa pamamagitan ng Manual na Journal: dagdag-puhunan ng may-ari, personal na withdrawal, pagwawasto ng maling tala, interes/admin fee ng bangko, pagbayad ng lumang utang.",
      ],
      watch: [
        "Huwag nang itala ulit sa manual na journal ang transaksyong naitala na ng module nito (benta, expense, pagbili sa supplier, pagbili ng asset) — magdodoble ang resulta.",
        "Dapat balanse ang manual na journal at child account ang gamit, hindi parent account.",
        "Hindi makatatanggap ang saradong panahon ng journal na may petsa sa loob nito — itala ang pagwawasto gamit ang petsa ngayon.",
        "Ang paggamit ng Cash account sa manual na journal ay nagbabago sa balanse ng cash; tiyaking talagang gumalaw ang pera.",
      ],
      steps: [
        "Para suriin: i-filter ang panahon, maghanap ayon sa reference/paglalarawan, buksan ang detalye ng row para makita ang debit–credit na account.",
        "Para iwasto: gumawa ng manual na journal na bumabaliktad sa maling bahagi at nagtatala ng tama, na may malinaw na paglalarawan (\"Pagwawasto ng maling expense account noong …\").",
        "Dagdag-puhunan: Debit Cash/Bangko, Credit 3110 Puhunan ng May-ari. Withdrawal: Debit 3130 Withdrawal ng May-ari, Credit Cash/Bangko.",
      ],
    },

    "Neraca Saldo": {
      summary: "Ang balanse ng lahat ng account sa isang panahon. Pangunahing kontrol: dapat magkapareho ang kabuuang Debit at kabuuang Credit.",
      concept: [
        "Ang Trial Balance ay nagbubuod ng journal bawat account: gaano nadagdagan (debit), gaano nabawasan (credit), at ang natitira (balanse).",
        "Kung kabuuang Debit = kabuuang Credit, balanse ang tala. Hindi laging tama ang balanse (puwedeng nagkamali ng account), pero kung hindi balanse, tiyak na may problema.",
        "Itinatago ang pares ng kinanselang transaksyon at ng reversal nito na parehong nasa loob ng panahon dahil nagkakansela ang mga ito.",
      ],
      uses: [
        "Panimulang pagsusuri ng kalusugan ng libro bago tingnan ang Income Statement at Balance Sheet.",
        "Pagtutugma ng balanse ng account sa totoo: Cash ng Kahera sa pera sa kaha, Bangko sa bank statement, QRIS sa dashboard ng QRIS provider.",
      ],
      watch: [
        "Hindi normal na balanse (may marka): Asset na negatibo o Pananagutang may debit na balanse. Kadalasan may totoong transaksyong hindi pa naitatala (deposito, top-up, pagbayad).",
        "Ang malalaking numero sa column na Debit/Credit ay galaw, hindi natitira. Tingnan ang column na balanse para sa huling halaga.",
        "May balanse ang Receivable kahit bayad na nang buo ang lahat ng customer → tingnan ang tab na Receivable at Audit.",
      ],
      steps: [
        "Araw-araw/lingguhan: itugma ang balanse ng Cash ng Kahera, Bangko, at e-wallet sa aktuwal na pera/balanse.",
        "I-click ang anumang account para makita ang journal sa likod nito (general ledger). I-on ang \"ipakita ang kinanselang transaksyon\" para lang sa audit.",
        "Diperensyang hindi maipaliwanag → patakbuhin ang tab na Audit.",
      ],
    },

    "Piutang (AR)": {
      summary: "Mga singil sa customer na hindi pa bayad nang buo — perang karapatan pa ng outlet.",
      concept: [
        "Ang Receivable (Accounts Receivable) ay awtomatikong nalilikha kapag isinara ang order/rental pero kulang ang bayad. Ang natitira ay itinatala sa account 1141 Receivable sa Customer (default).",
        "Kapag nagbayad ang customer, bumababa ang receivable at tumataas ang Cash/Bangko/e-wallet — hindi na madaragdagan ang kita, dahil kinilala na ito noong order.",
        "Ang edad ng receivable (aging) ay nakapangkat sa: hindi pa due, 1–30, 31–60, at higit sa 60 araw.",
      ],
      uses: [
        "Paniningil sa mga customer na hindi pa bayad nang buo at pagbabantay kung gaano na katagal ang singil.",
        "Pagtanggap ng bayad nang direkta mula sa tab na ito gamit ang paraan ng pagbabayad ng customer.",
      ],
      watch: [
        "Ang receivable na lampas 60 araw ay may panganib na hindi masingil. Prinsipyo ng pag-iingat: pag-isipan ang write-off (manual na journal sa bad debt expense) kapag malinaw na hindi na babayaran.",
        "Huwag tumanggap ng bayad sa ibang menu at dito rin — pumili ng isang lugar para hindi maitala nang dalawang beses.",
        "Ang receivable na \"wala na ang pinagmulang transaksyon\" ay hindi mababayaran sa button; tapusin ito gamit ang manual na journal.",
      ],
      steps: [
        "Tingnan ang tab na ito araw-araw bago isara ang shift.",
        "I-click ang Tumanggap ng Bayad → ilagay ang halaga (puwedeng bahagya) → piliin ang paraan → i-save. Papasok ang pera sa account ayon sa Account Mapping ng paraang iyon.",
        "Buwanan: suriin ang aging; singilin ang lampas 30 araw, magpasya sa write-off para sa hindi na masisingil.",
      ],
    },

    "Hutang (AP)": {
      summary: "Lahat ng hindi pa nababayarang obligasyon ng outlet: sa supplier, sa pagbili ng asset, at mga gastos na naitalang utang.",
      concept: [
        "Nalilikha ang Payable (Accounts Payable) kapag tumanggap ka ng produkto/serbisyo pero babayaran mamaya: Pagbili sa Supplier nang utang (2111 Utang sa Supplier), Pagbili ng Asset na may down payment/utang (Utang sa Pagbili ng Asset, default 2163), at Expense na naitalang utang.",
        "Hindi nagdaragdag ng gastos ang pagbayad ng utang — naitala na ang gastos/asset sa orihinal na transaksyon. Binabawasan lang ng bayad ang utang at Cash/Bangko.",
      ],
      uses: [
        "Makita ang lahat ng babayarang singil sa isang lugar kasama ang edad nito.",
        "Magbayad (buo o hulugan) nang direkta mula rito.",
      ],
      watch: [
        "Ang utang na lampas na sa takdang petsa ay nakakasira ng relasyon sa supplier — bantayan ang column ng edad.",
        "Magbayad sa tab na ito o sa pinagmulang menu, huwag nang magdagdag ng manual na journal — magdodoble ang resulta.",
        "Piliin ang cash/bank account na talagang pinaglabasan ng pera. Kung galing sa kaha, binabawasan din ng bayad ang inaasahang cash ng shift.",
      ],
      steps: [
        "Lingguhan: ayusin mula sa pinakaluma, iiskedyul ang pagbabayad.",
        "I-click ang Bayaran → ilagay ang halaga (puwedeng hulugan para sa supplier at asset) → piliin ang paraan at cash/bank account → i-save.",
        "Katapusan ng buwan: dapat kapareho ng kabuuan sa tab na ito ang balanse ng mga account ng utang sa Trial Balance.",
      ],
    },

    "Laba Rugi": {
      summary: "Kung kumita o nalugi ang negosyo sa isang panahon: Kita bawas ang COGS at Gastos.",
      concept: [
        "Ang Income Statement ay inihahanda sa accrual basis (SAK EMKM): kinikilala ang kita kapag naganap ang transaksyon (business date ng order), hindi kapag natanggap ang pera; kinikilala ang gastos kapag naganap.",
        "Gross Profit = Kita − COGS (gastos ng naibentang paninda). Net Profit = Gross Profit − Operating Expenses (sweldo, kuryente, upa, depreciation, atbp.) ± iba pang kita/gastos.",
        "Gastos ang depreciation ng asset kahit walang perang lumalabas — ipinapakita nito ang pagbaba ng halaga ng PS/TV dahil sa paggamit.",
      ],
      uses: [
        "Pagtasa ng performance bawat buwan at paghahambing ng mga panahon.",
        "Pagtingin sa pinakamalaking pinagmumulan ng kita (rental, F&B, produkto, PPOB) at pinakamalaking gastos.",
        "Batayan ng pagkuwenta ng Final Income Tax ng MSME sa Indonesia (0.5% ng gross turnover).",
      ],
      watch: [
        "Normal ang malaking kita pero kaunting cash kung may receivable, dumaming stock, o pagbili ng asset — tingnan ang Cash Flow.",
        "Ang babalang \"hindi pa nakuwenta ang COGS\" ay nangangahulugang may produktong walang Cost Price; mukhang mas malaki ang kita kaysa totoo.",
        "Kung hindi pinapatakbo ang buwanang depreciation, mukhang masyadong mataas ang kita.",
        "Ang gastos na hindi pa naitatala (singil sa kuryente/internet ngayong buwan) ay nagpapalaki sa kita — itala bilang expense na utang kung hindi pa bayad.",
      ],
      steps: [
        "Pumili ng panahon (karaniwang nakaraang buwan pagkatapos isara ang libro) at ihambing sa naunang panahon.",
        "I-click ang anumang row para makita ang mga transaksyon sa likod nito.",
        "Bago basahin ang kita sa katapusan ng buwan: tiyaking naitala ang lahat ng expense, napatakbo ang depreciation, at nagawa ang stock count.",
      ],
    },

    Rekonsiliasi: {
      summary: "Pagtutugma ng mga transaksyon ng benta (page na Transaksyon) sa journal ng kita nito, kada order.",
      concept: [
        "Bawat bayad na order ay dapat may eksaktong isang sales journal na may parehong halaga at business date.",
        "Mga status: Tugma, Naghihintay ng bayad, Iba ang petsa, Iba ang halaga, Nawawala ang journal, Kinanselang order pero may journal pa, at Journal na walang order.",
      ],
      uses: [
        "Tiyaking kapareho ng turnover sa sales report ang kita sa Income Statement.",
        "Ayusin ang nalaktawan/ibang journal gamit ang button na Resync, nang walang manual na input.",
      ],
      watch: [
        "Iba ang halaga o nawawala ang journal ay nangangahulugang hindi tumpak ang Income Statement para sa petsang iyon.",
        "Ang order na lampas hatinggabi ay itinatala sa business date (araw na binuksan), hindi sa oras ng bayad — sinadya ito.",
        "Ang Resync ay nagvo-void ng lumang journal saka muling nagpo-post; hindi ito puwede sa saradong panahon.",
      ],
      steps: [
        "Araw-araw (pagkatapos isara ang shift): piliin ang \"ngayon\", tiyaking Tugma o Naghihintay ng bayad ang lahat ng row.",
        "Row na may problema → i-click ang Resync, saka i-reload para matiyak na Tugma na ang status.",
        "Gawin ito bago ang Close Period bawat buwan.",
      ],
    },

    Neraca: {
      summary: "Ang kalagayang pinansyal sa isang petsa: ano ang pag-aari (Asset), ano ang utang (Pananagutan), at ang puhunan ng may-ari (Equity).",
      concept: [
        "Laging totoo ang pangunahing pormula: Asset = Pananagutan + Equity. Sa SAK EMKM tinatawag ang ulat na ito na Statement of Financial Position.",
        "Ang fixed asset (PS, TV, muwebles) ay ipinapakita sa halaga ng pagkuha bawas ang naipong depreciation = book value.",
        "Pumapasok sa Equity ang kita ng kasalukuyang taon; pagkatapos isara ang taon nagiging Retained Earnings ito.",
      ],
      uses: [
        "Malaman ang netong yaman ng negosyo at kakayahang magbayad ng utang (cash + receivable kumpara sa panandaliang utang).",
        "Dokumentong kadalasang hinihingi ng bangko/leasing sa pag-apply ng loan.",
      ],
      watch: [
        "Dapat balanse ang Balance Sheet. Kung hindi, patakbuhin ang tab na Audit.",
        "Dapat kapareho ng aktuwal na pera ang balanse ng Cash sa Balance Sheet; ang diperensya ay nangangahulugang may transaksyong hindi pa o maling naitala.",
        "Dapat tugma ang imbentaryo sa resulta ng stock count.",
      ],
      steps: [
        "Pumili ng petsa (karaniwang katapusan ng buwan) pagkatapos kumpleto ang lahat ng transaksyon ng buwang iyon.",
        "I-click ang row para tuntunin ang kakaibang numero.",
        "Ihambing sa katapusan ng nakaraang buwan para makita ang pagbabago sa utang, receivable, at puhunan.",
      ],
    },

    "Arus Kas": {
      summary: "Ang perang talagang pumasok at lumabas sa mga cash at bank account sa isang panahon.",
      concept: [
        "Iba sa Income Statement: perang gumalaw lang ang binibilang ng Cash Flow. Hindi kasama ang hindi pa bayad na benta (receivable); kasama ang pagbili ng asset at pagbayad ng utang bilang cash out kahit hindi ito gastos.",
        "Kinukuwenta ito direkta mula sa galaw ng Cash/Bank account sa journal, kaya laging kapareho ng netong cash ang pagbabago sa balanse ng mga account na iyon sa Trial Balance. Nakalista sa ilalim ng ulat ang mga account na binibilang (cash 111x, bangko 112x, at mga account na nakarehistro bilang cash/bangko).",
        "Ang paglilipat ng pera sa pagitan ng sariling kaha/account ay zero ang neto at hindi binibilang na cash flow.",
      ],
      uses: [
        "Malaman kung saan galing at saan napunta ang pera.",
        "Pagplano ng malalaking bayarin (supplier, hulog sa asset, sweldo) batay sa araw-araw na pattern ng cash.",
      ],
      watch: [
        "Malaking kita pero negatibo ang netong cash: tingnan ang pagbili ng asset, pagbayad ng utang, dagdag na stock, o dumaraming receivable.",
        "Ang kakaibang cash in/out ay kadalasang galing sa manual na journal na gumagamit ng Cash account — tuntunin sa Journal.",
      ],
      steps: [
        "Lingguhan/buwanan: pumili ng panahon, tingnan ang pinakamalaking kategorya ng cash out.",
        "Tiyaking ang netong cash ng panahon = ang pagbabago sa balanse ng cash/bank account sa Trial Balance ng parehong panahon.",
      ],
    },

    "CALK (SAK EMKM)": {
      summary: "Mga Tala sa Financial Statements — ang ikatlong bahaging hinihingi ng SAK EMKM, awtomatikong inihahanda.",
      concept: [
        "Ang SAK EMKM (Pamantayan sa Financial Accounting ng Indonesia para sa Micro, Small, at Medium na Entity) ay humihingi ng tatlong ulat: Statement of Financial Position (Balance Sheet), Income Statement, at Mga Tala.",
        "Ipinapaliwanag ng Mga Tala ang pagkakakilanlan ng negosyo, batayan ng paghahanda (accrual, historical cost), mga patakaran sa accounting (imbentaryong weighted average o FIFO ayon sa pinili ng outlet, straight-line depreciation), detalye ng mga linya ng ulat, at income tax.",
      ],
      uses: [
        "Pagkumpleto ng financial statements para sa bangko, investor, kooperatiba, o pag-uulat ng buwis.",
        "Ipi-print / ise-save bilang PDF kasama ng Balance Sheet at Income Statement.",
      ],
      watch: [
        "Ang datos ng pagkakakilanlan (pangalan, address, NPWP, anyo ng negosyo) ay kinukuha sa datos ng outlet sa Setting — kumpletuhin doon.",
        "Pang-impormasyon lang ang tantiyang 0.5% Final Income Tax; ang aktuwal na obligasyon ay ayon sa tax status at pasilidad mo.",
        "Kasintumpak lang ng libro ang Mga Tala — patakbuhin ang Audit at tiyaking kumpleto ang panahon bago mag-print.",
      ],
      steps: [
        "Piliin ang panahon ng ulat (karaniwang isang fiscal year, o buwanan para sa panloob na ulat).",
        "Suriin ang detalye ng fixed asset at buwis, saka i-click ang Print / Save PDF.",
      ],
    },

    Audit: {
      summary: "Awtomatikong pagsusuri ng kalusugan ng libro batay sa prinsipyo ng pag-iingat — hanapin ang problema bago ito mapunta sa ulat.",
      concept: [
        "Sinusuri ng Audit ang mga bagay na hindi nakikita sa ulat: dobleng journal, hindi balanseng journal, kinanselang transaksyong may bisa pa, hindi wastong pinagmulan ng cash posting, maling account mapping, halaga ng imbentaryo, negatibong stock, walang COGS, hindi normal na balanse, tumatandang receivable, hindi pa saradong panahon, at buwis.",
        "Berde = ligtas, dilaw = kailangang bantayan, pula = dapat ayusin.",
        "Ang awtomatikong pag-aayos ay laging naitatalang correcting/reversing entry na pumapasok sa audit log — walang datos na binubura.",
      ],
      uses: [
        "Regular na pagsusuri bago ang buwanang pagsasara ng libro.",
        "Paghahanap ng sanhi kapag kakaiba ang balanse ng Cash, Receivable, o Kita.",
      ],
      watch: [
        "Basahin ang paliwanag ng bawat natuklasan bago pindutin ang button ng pag-aayos.",
        "I-adjust lang ang halaga ng imbentaryo kapag tama na ang Cost Price ng produkto at ang stock count.",
        "Ang mga natuklasang walang awtomatikong pag-aayos ay kailangang asikasuhin nang manual (hal. paglalagay ng Cost Price, pagrepaso ng shift).",
      ],
      steps: [
        "Patakbuhin kahit isang beses kada linggo at laging bago ang Close Period.",
        "Unahin ang pula, saka ang dilaw. Patakbuhin muli ang Audit hanggang malinis.",
      ],
    },

    "Tutup Periode": {
      summary: "Pag-lock ng buwang naiulat na para hindi na magbago ang mga numero nito.",
      concept: [
        "Kapag sarado na ang panahon, walang bagong journal (awtomatiko man o manual) ang puwedeng may petsa sa loob nito.",
        "Ang pagwawasto pagkatapos isara ay itinatala sa petsa ngayon (kasalukuyang panahon), hindi sa muling pagbubukas ng lumang panahon.",
      ],
      uses: [
        "Panatilihing hindi nagbabago ang mga ulat na naibigay na sa may-ari/bangko/opisina ng buwis.",
        "Pigilan ang mga transaksyong backdated na puwedeng maging butas para sa pandaraya.",
      ],
      watch: [
        "Isara lang kapag kumpleto na ang lahat ng transaksyon ng buwan: sarado ang mga shift, naitala ang expense, napatakbo ang depreciation, stock count, bank reconciliation.",
        "Buksan muli ang panahon kung talagang kailangan at ng Owner lang — naitatala ang bawat pagbukas/pagsara.",
      ],
      steps: [
        "Checklist sa katapusan ng buwan (ika-1–5 ng susunod na buwan): isara ang lahat ng shift → itala ang expense at mga singil → patakbuhin ang depreciation sa menu na Fixed Asset → stock count → itugma ang balanse ng bangko/e-wallet → Reconciliation → malinis na Audit.",
        "Piliin ang buwan → Close Period.",
        "I-print ang Balance Sheet, Income Statement, at Mga Tala ng buwang iyon bilang archive.",
      ],
    },

    "Migrasi Data": {
      summary: "Paglilipat ng libro mula sa lumang sistema/tala papunta sa NEXBILL.",
      concept: [
        "Karaniwang paraan ng migration: isang Opening Balance journal sa petsa ng cutover na naglalaman ng balanse ng bawat account (Cash, Bangko, Receivable, Imbentaryo, Asset, Utang, Puhunan). Hindi kailangang ilipat isa-isa ang mga lumang transaksyon.",
        "Ang diperensya ng debit–credit ng opening balance ay inilalagay sa 3400 Opening Balance Equity (default).",
        "Ang Historical Data Import (Excel) ay para lang sa ulat ng nakaraang panahon; hindi lumalabas ang datos na iyon sa page na Transaksyon o sa stock.",
      ],
      uses: [
        "Pagsisimula sa NEXBILL nang hindi nawawala ang mga balanse mula sa dating sistema.",
        "Paghahambing ng mga ulat bago at pagkatapos gumamit ng NEXBILL.",
      ],
      watch: [
        "Isang beses LANG inilalagay ang opening balance. Ang paglalagay nang dalawang beses ay magdodoble sa lahat ng balanse.",
        "Mas maayos itala ang mga fixed asset na pag-aari na sa Fixed Asset → Pagbili ng Asset → \"Opening balance\" para ma-depreciate bawat unit — huwag nang itala ulit sa opening balance journal.",
        "Ang panimulang stock ng produkto ay itinatala sa Imbentaryo (panimulang stock), hindi rito, para magkatugma ang dami at halaga.",
      ],
      steps: [
        "Tukuyin ang petsa ng cutover (karaniwang simula ng buwan).",
        "Ihanda ang balanse ng bawat account mula sa lumang ulat sa petsang iyon, saka ilagay sa Opening Balance hanggang kabuuang debit = credit.",
        "Opsyonal: mag-import ng historical data gamit ang Excel template.",
        "Tingnan ang Balance Sheet sa petsa ng cutover — dapat kapareho ng lumang balance sheet mo.",
      ],
    },
  },

  workflow: [
    {
      when: "Isang beses sa simula",
      items: [
        "Suriin ang Chart of Accounts; idagdag ang mga bank at e-wallet account na ginagamit.",
        "I-set ang Account Mapping ng mga paraan ng pagbabayad sa tamang account.",
        "Ilagay ang Opening Balance (tab na Data Migration), panimulang stock ng produkto (Imbentaryo), at mga asset na pag-aari na (Fixed Asset → Pagbili ng Asset → Opening balance).",
      ],
    },
    {
      when: "Araw-araw",
      items: [
        "Binubuksan at isinasara ng kahera ang shift; bilangin nang tapat ang pera sa kaha — ang diperensya sa cash ang pangunahing babala.",
        "Itala ang bawat gastos sa menu na Expense, pagbili ng stock sa Bili sa Supplier, pagbili ng PS/TV/muwebles sa Fixed Asset → Pagbili ng Asset.",
        "Tingnan ang Receivable: singilin ang hindi pa bayad nang buo.",
        "Reconciliation ngayong araw: dapat Tugma ang lahat ng order.",
      ],
    },
    {
      when: "Bawat linggo",
      items: [
        "Itugma ang balanse ng Bangko at e-wallet/QRIS sa Trial Balance sa bank statement/dashboard ng provider.",
        "Bayaran ang utang sa supplier/asset na due na (tab na Payable).",
        "Patakbuhin ang tab na Audit at asikasuhin ang mga pulang natuklasan.",
      ],
    },
    {
      when: "Bawat katapusan ng buwan",
      items: [
        "Itala ang buwanang singil (kuryente, internet, upa, sweldo) — bilang utang kung hindi pa bayad.",
        "Patakbuhin ang Depreciation sa menu na Fixed Asset.",
        "Mag-stock count sa Imbentaryo.",
        "Audit hanggang malinis, saka Close Period.",
        "Basahin ang Income Statement, Balance Sheet, at Cash Flow; i-save ang PDF bilang archive.",
      ],
    },
    {
      when: "Bawat katapusan ng taon",
      items: [
        "Tiyaking sarado na ang 12 buwan.",
        "I-print ang taunang Statement of Financial Position, Income Statement, at Mga Tala (SAK EMKM).",
        "Kuwentahin at bayaran ang Final Income Tax ng MSME (0.5% ng gross turnover kung kwalipikado pa), saka itala ang bayad.",
      ],
    },
  ],

  goldenRules: [
    "Isang beses itinatala ang isang transaksyon, sa sarili nitong menu. Ang manual na journal ay para lang sa walang menu.",
    "Huwag burahin — kanselahin. Lumilikha ang pagkansela ng reversing entry para ma-audit pa rin ang bakas.",
    "Paghiwalayin ang personal na pera at pera ng negosyo. Ang personal na withdrawal ay itinatala bilang Withdrawal ng May-ari, hindi gastos.",
    "Bawat diperensya (cash sa kaha, balanse ng bangko, stock) ay dapat maipaliwanag, hindi pabayaan.",
    "Kasintumpak lang ng input ang ulat: ang cost price ng produkto, depreciation, at kumpletong expense ang nagtatakda ng tamang kita.",
  ],

  ui: {
    guidePrefix: "Gabay",
    open: "Basahin ang gabay",
    close: "Isara",
    concept: "Ang konsepto sa accounting",
    uses: "Para saan ito",
    watch: "Mga dapat bantayan",
    steps: "Mga hakbang",
    workflowTitle: "Gabay sa Workflow ng Accounting ng Outlet",
    workflowIntro:
      "Halos lahat ng journal ay awtomatikong ginagawa mula sa kahera, rental, expense, pagbili sa supplier, at asset. Ang trabaho mo: tiyaking naitala ang bawat transaksyon sa menu nito, saka regular na suriin at isara ang libro.",
    closeAria: "Isara ang gabay",
    goldenRules: "Mga gintong panuntunan sa bookkeeping",
    startFrom: "Magsimula sa:",
  },
};
