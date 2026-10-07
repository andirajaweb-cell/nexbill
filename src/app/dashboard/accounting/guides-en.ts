import type { AccountingGuideSet } from "./guides";

/** English version of guides.ts — same tabs, same number of points per section (checked by guides.test.ts). */
export const GUIDES_EN: AccountingGuideSet = {
  tabs: {
    "Chart of Accounts": {
      summary: "The list of every \"drawer\" the outlet's finances are recorded in (accounts). Every rupiah coming in or going out is always recorded to one of the accounts here.",
      concept: [
        "The Chart of Accounts (CoA) is the list of accounts grouped into 5 classes: 1 Assets (what you own), 2 Liabilities (debts/obligations), 3 Equity (owner's capital), 4 Revenue, 5–8 Expenses (COGS and operating costs).",
        "Parent accounts (headers, shown in bold) only total the accounts beneath them and can't receive journal entries. Transactions always go to child accounts (posting accounts).",
        "Normal balance: Assets and Expenses increase on the Debit side; Liabilities, Equity, and Revenue increase on the Credit side.",
      ],
      uses: [
        "Decides which lines appear in the Balance Sheet and Income Statement.",
        "Adding accounts specific to your business, e.g. a second bank account, a new e-wallet account, or a particular kind of expense.",
      ],
      watch: [
        "Don't delete or change the class of an account that already has transactions — past period reports would change too. If it's no longer used, deactivate it.",
        "Account codes follow their class: bank accounts must start with 112x, e-wallets 113x, expenses 6xxx. A code in the wrong class makes the account appear in the wrong part of the reports.",
        "Each outlet has its own CoA. One outlet's accounts can't be used by another outlet.",
      ],
      steps: [
        "When you start using NEXBILL: review the default accounts and add the bank/e-wallet accounts you actually use.",
        "Only add a new account when no default account fits — pick the right parent so it lands in the right report group.",
        "After adding a cash/bank/e-wallet account, link it in the Account Mapping tab (Payment module) so transactions flow into it automatically.",
      ],
    },

    "Account Mapping": {
      summary: "Automatic rules of the form \"transaction type X is recorded to account Y\". The cashier never picks an account — the system follows this table.",
      concept: [
        "Each module (Rental, F&B, Products, PPOB, Expenses, Assets, Payments, etc.) looks up its target account in this table by module + transaction type.",
        "Example: Payment module key \"qris\" → account 1131 QRIS (default), so every QRIS payment increases the QRIS account balance, not Cash.",
        "If a row is missing, the system uses the default account. So this table is for ADJUSTING, not something you must fill from scratch.",
      ],
      uses: [
        "Splitting revenue by console/product type so the Income Statement is more detailed.",
        "Deciding which account the money from each payment method lands in — the basis for per-channel balance reconciliation at shift close.",
        "Routing COGS, depreciation, inventory, and asset-purchase payables to the accounts you want.",
      ],
      watch: [
        "The account type must match its role: revenue → revenue account, payment → cash/bank account, COGS/expense → expense account. The Audit tab checks this automatically.",
        "The key column (transaction key) is the word the system looks for — don't change it. Changing the key makes the row stop being used, with no error message.",
        "Mapping changes only apply to NEW transactions. Old transactions stay in their old account; move them with a manual journal entry if needed.",
        "Custom payment methods that aren't mapped yet go to the general Bank account (1121) — the Audit tab will warn you.",
      ],
      steps: [
        "After adding a new payment method (e.g. another e-wallet), add a Payment module row for that method pointing to the matching e-wallet account.",
        "Change the target account with the edit button, then check the next few transactions in the Journal tab to make sure the account is right.",
        "Run the Audit tab → \"Account Mapping\" after changing anything here.",
      ],
    },

    Jurnal: {
      summary: "The day book of every transaction in debit–credit form. Almost every journal entry is created automatically by the system.",
      concept: [
        "Every transaction is recorded with double entry: total Debit always equals total Credit. Example, a PS rental paid in cash Rp50,000: Debit Cashier Cash Rp50,000, Credit Rental Revenue Rp50,000.",
        "The Source column shows where the entry came from (Rental, POS, Expense, Asset Purchase, Depreciation, Manual, etc.).",
        "Cancelled transactions are NOT deleted: the system creates a reversing entry (debit/credit swapped) so the balance returns to zero and the audit trail remains.",
      ],
      uses: [
        "Tracing where a figure in a report came from.",
        "Recording transactions that have no menu of their own via a Manual Journal: owner capital injections, drawings (personal withdrawals), corrections of mistakes, bank interest/fees, settling old debts.",
      ],
      watch: [
        "Don't re-record via a manual journal a transaction its module already recorded (sales, expenses, supplier purchases, asset purchases) — it would be counted twice.",
        "A manual journal must balance and must use child accounts, not parent accounts.",
        "A closed period can't receive entries dated inside it — record corrections with today's date.",
        "Using a Cash account in a manual journal changes the cash balance; make sure the money really moved.",
      ],
      steps: [
        "To review: filter the period, search by reference/description, open a row's details to see its debit–credit accounts.",
        "To correct: create a manual journal that reverses the wrong part and records the right one, with a clear description (\"Correction of wrong expense account on …\").",
        "Capital injection: Debit Cash/Bank, Credit 3110 Owner's Capital. Drawings: Debit 3130 Drawings, Credit Cash/Bank.",
      ],
    },

    "Neraca Saldo": {
      summary: "The balances of every account for a period. The main control tool: total Debit must equal total Credit.",
      concept: [
        "The Trial Balance summarises the journal per account: how much increased (debit), how much decreased (credit), and what is left (balance).",
        "If total Debit = total Credit, the books balance. Balanced isn't always correct (an account could be chosen wrongly), but unbalanced is definitely a problem.",
        "A cancelled transaction and its reversal that both fall inside the period are hidden because they cancel each other out.",
      ],
      uses: [
        "The starting point for checking the health of the books before looking at the Income Statement and Balance Sheet.",
        "Matching account balances with reality: Cashier Cash with the money in the drawer, Bank with the bank statement, QRIS with the QRIS provider's dashboard.",
      ],
      watch: [
        "Abnormal balances (flagged): an Asset below zero or a Liability with a debit balance. Usually a real-world transaction hasn't been recorded (deposit, top-up, settlement).",
        "Big numbers in the Debit/Credit columns are movements, not what's left. Look at the balance column for the final value.",
        "A Receivables balance even though every customer has paid in full → check the Receivables and Audit tabs.",
      ],
      steps: [
        "Every day/week: match the Cashier Cash, Bank, and e-wallet balances with the actual money/balances.",
        "Click any account to see the entries behind it (general ledger). Turn on \"show cancelled transactions\" only for audit purposes.",
        "Differences you can't explain → run the Audit tab.",
      ],
    },

    "Piutang (AR)": {
      summary: "Customer bills that haven't been paid in full — money the outlet is still owed.",
      concept: [
        "Receivables appear automatically when an order/rental is closed but underpaid. The remainder is recorded to account 1141 Customer Receivables (default).",
        "When the customer pays, receivables go down and Cash/Bank/e-wallet goes up — revenue doesn't increase again, because it was already recognised at the time of the order.",
        "Receivables are grouped by age (aging): not yet due, 1–30, 31–60, and over 60 days.",
      ],
      uses: [
        "Chasing customers who haven't paid in full and tracking how long their bills have been outstanding.",
        "Receiving payments directly from this tab with the payment method the customer used.",
      ],
      watch: [
        "Receivables older than 60 days risk never being collected. Prudence: consider writing them off (manual journal to bad-debt expense) when they clearly won't be paid.",
        "Don't receive a payment in another menu and also here — pick one place so it isn't recorded twice.",
        "Receivables whose \"source transaction no longer exists\" can't be paid with the button; settle them with a manual journal.",
      ],
      steps: [
        "Check this tab every day before closing the shift.",
        "Click Receive Payment → enter the amount (partial is fine) → choose the method → save. The money goes to the account set in Account Mapping for that method.",
        "Monthly: review the aging; chase anything over 30 days, decide on write-offs for uncollectable amounts.",
      ],
    },

    "Hutang (AP)": {
      summary: "Every obligation the outlet hasn't paid yet: to suppliers, for asset purchases, and expenses recorded as payables.",
      concept: [
        "Payables arise when you receive goods/services but pay later: supplier purchases on credit (2111 Supplier Payables), Asset Purchases with a down payment/credit (Asset Purchase Payables, default 2163), and Expenses recorded as payables.",
        "Paying a payable doesn't add expense again — the expense/asset was recorded with the original transaction. A payment only reduces the payable and Cash/Bank.",
      ],
      uses: [
        "Seeing every bill that has to be paid in one place, with its age.",
        "Paying (in full or in instalments) directly from here.",
      ],
      watch: [
        "Overdue payables hurt your relationship with suppliers — watch the age column.",
        "Pay through this tab or the original menu; don't add a manual journal too — it would be doubled.",
        "Choose the cash/bank account the money actually leaves from. If it comes from the cashier drawer, the payment also reduces the shift's expected cash.",
      ],
      steps: [
        "Weekly: sort from oldest, schedule payments.",
        "Click Pay → enter the amount (suppliers and assets can be paid in instalments) → choose the method and cash/bank account → save.",
        "Month end: the payable account balances in the Trial Balance must equal the total in this tab.",
      ],
    },

    "Laba Rugi": {
      summary: "Whether the business made a profit or a loss in a period: Revenue minus COGS and Expenses.",
      concept: [
        "The Income Statement is prepared on an accrual basis (SAK EMKM): revenue is recognised when the transaction happens (the order's business date), not when the money is received; expenses are recognised when incurred.",
        "Gross Profit = Revenue − COGS (cost of the goods sold). Net Profit = Gross Profit − Operating Expenses (salaries, electricity, rent, depreciation, etc.) ± other income/expenses.",
        "Asset depreciation is an expense even though no money leaves — it reflects the PS/TV losing value as they're used.",
      ],
      uses: [
        "Judging monthly performance and comparing periods.",
        "Seeing the biggest revenue sources (rental, F&B, products, PPOB) and the biggest cost lines.",
        "The basis for calculating Indonesian MSME final income tax (0.5% of gross turnover).",
      ],
      watch: [
        "A big profit but little cash is normal when there are receivables, growing stock, or asset purchases — see the Cash Flow.",
        "A \"COGS not calculated\" warning means some products have no Cost Price; profit looks bigger than it really is.",
        "Without running monthly depreciation, profit looks too high.",
        "Expenses not yet recorded (this month's electricity/internet bills) make profit look bigger — record them as expenses on credit if not yet paid.",
      ],
      steps: [
        "Choose a period (usually last month after closing the books) and compare it with the previous period.",
        "Click any row to see the transactions behind it.",
        "Before reading month-end profit: make sure every expense is recorded, depreciation has been run, and the stock-take is done.",
      ],
    },

    Rekonsiliasi: {
      summary: "Matching sales transactions (Transactions page) with their revenue journal entries, order by order.",
      concept: [
        "Every paid order should have exactly one sales journal entry with the same amount and business date.",
        "Statuses: Matched, Awaiting payment, Date differs, Amount differs, Journal missing, Order cancelled but journal still there, and Journal without order.",
      ],
      uses: [
        "Making sure revenue in the sales report equals revenue in the Income Statement.",
        "Fixing missed/different entries with the Resync button, with no manual input.",
      ],
      watch: [
        "An amount difference or a missing journal means the Income Statement isn't accurate for that date.",
        "Orders that run past midnight are recorded on the business date (the day it opened), not the payment time — this is intentional.",
        "Resync cancels the old entry and posts it again; it can't be done for a closed period.",
      ],
      steps: [
        "Daily (after closing the shift): choose \"today\", make sure every row is Matched or Awaiting payment.",
        "Problem rows → click Resync, then reload to make sure the status is Matched.",
        "Do this before Close Period every month.",
      ],
    },

    Neraca: {
      summary: "The financial position on a date: what is owned (Assets), what is owed (Liabilities), and the owner's capital (Equity).",
      concept: [
        "The basic equation always holds: Assets = Liabilities + Equity. Under SAK EMKM this report is called the Statement of Financial Position.",
        "Fixed assets (PS, TV, furniture) are shown at cost less accumulated depreciation = book value.",
        "Current-year profit goes into Equity; after the year is closed it becomes Retained Earnings.",
      ],
      uses: [
        "Knowing the business's net worth and its ability to pay debts (cash + receivables compared with short-term payables).",
        "A document banks/leasing companies usually ask for in loan applications.",
      ],
      watch: [
        "The Balance Sheet must balance. If it doesn't, run the Audit tab.",
        "The Cash balance in the Balance Sheet must equal the actual money; a difference means a transaction is missing or recorded wrongly.",
        "Inventory must match the stock-take result.",
      ],
      steps: [
        "Choose a date (usually month end) once every transaction for that month is complete.",
        "Click a row to trace any figure that looks odd.",
        "Compare with the end of last month to see changes in payables, receivables, and capital.",
      ],
    },

    "Arus Kas": {
      summary: "The money that actually came into and went out of the cash and bank accounts in a period.",
      concept: [
        "Different from the Income Statement: the Cash Flow only counts money that moved. Unpaid sales (receivables) aren't included; asset purchases and payable payments count as cash out even though they aren't expenses.",
        "Calculated directly from Cash/Bank account movements in the journal, so net cash always equals the change in those accounts' balances in the Trial Balance. The accounts counted (cash 111x, bank 112x, and accounts registered as cash/bank) are listed below the report.",
        "Moving cash between your own drawers/accounts nets to zero and isn't counted as cash flow.",
      ],
      uses: [
        "Knowing where the money came from and where it went.",
        "Planning large payments (suppliers, asset instalments, salaries) based on the daily cash pattern.",
      ],
      watch: [
        "Big profit but negative net cash: check asset purchases, payable settlements, stock build-up, or piling-up receivables.",
        "Odd cash in/out often comes from manual journals that use a Cash account — trace them in the Journal.",
      ],
      steps: [
        "Weekly/monthly: choose a period, look at the largest cash-out categories.",
        "Make sure the period's net cash = the change in cash/bank account balances in the Trial Balance for the same period.",
      ],
    },

    "CALK (SAK EMKM)": {
      summary: "Notes to the Financial Statements — the third component SAK EMKM requires, prepared automatically.",
      concept: [
        "SAK EMKM (Indonesia's Financial Accounting Standard for Micro, Small and Medium Entities) requires three reports: the Statement of Financial Position (Balance Sheet), the Income Statement, and the Notes (CALK).",
        "The Notes explain the business identity, basis of preparation (accrual, historical cost), accounting policies (weighted-average or FIFO inventory as chosen by the outlet, straight-line depreciation), report line details, and income tax.",
      ],
      uses: [
        "Completing the financial statements for banks, investors, cooperatives, or tax reporting.",
        "Printed / saved as PDF together with the Balance Sheet and Income Statement.",
      ],
      watch: [
        "Identity data (name, address, tax ID, legal form) comes from the outlet data in Settings — complete it there.",
        "The 0.5% final income tax estimate is for information only; your actual liability depends on your tax status and facilities.",
        "The Notes are only as accurate as the books — run the Audit and make sure the period is complete before printing.",
      ],
      steps: [
        "Choose the report period (usually one financial year, or monthly for internal reports).",
        "Review the fixed asset and tax details, then click Print / Save PDF.",
      ],
    },

    Audit: {
      summary: "An automatic health check of the books based on the prudence principle — find problems before they reach the reports.",
      concept: [
        "The audit checks things the reports don't show: duplicate entries, unbalanced entries, cancelled transactions still in effect, invalid cash posting sources, wrong account mappings, inventory value, negative stock, missing COGS, abnormal balances, aging receivables, unclosed periods, and tax.",
        "Green = fine, yellow = needs attention, red = must be fixed.",
        "Automatic fixes are always recorded correcting/reversing entries that go into the audit log — no data is deleted.",
      ],
      uses: [
        "A routine check before the monthly close.",
        "Finding the cause when Cash, Receivables, or Profit look odd.",
      ],
      watch: [
        "Read the explanation of each finding before pressing the fix button.",
        "Only adjust the inventory value after the products' Cost Prices and the stock-take are correct.",
        "Findings without an automatic fix must be handled manually (e.g. filling in Cost Prices, reviewing shifts).",
      ],
      steps: [
        "Run it at least once a week and always before Close Period.",
        "Handle red first, then yellow. Run the Audit again until it's clean.",
      ],
    },

    "Tutup Periode": {
      summary: "Locking a month that has been reported so its figures can't change any more.",
      concept: [
        "Once a period is closed, no new journal entry (automatic or manual) can be dated inside that period.",
        "Corrections after closing are recorded with today's date (the current period), not by reopening the old period.",
      ],
      uses: [
        "Keeping reports already handed to the owner/bank/tax office unchanged.",
        "Preventing backdated transactions, which can be a loophole for fraud.",
      ],
      watch: [
        "Only close once every transaction for that month is complete: shifts closed, expenses recorded, depreciation run, stock-take done, bank reconciled.",
        "Reopen a period only when truly necessary and only by the Owner — every open/close is logged.",
      ],
      steps: [
        "Month-end checklist (1st–5th of the following month): close all shifts → record expenses & bills → run depreciation in the Assets menu → stock-take → match bank/e-wallet balances → Reconciliation → clean Audit.",
        "Choose the month → Close Period.",
        "Print that month's Balance Sheet, Income Statement, and Notes as an archive.",
      ],
    },

    "Migrasi Data": {
      summary: "Moving your books from an old system/records into NEXBILL.",
      concept: [
        "The standard way to migrate: one Opening Balance entry on the cutover date holding the balance of every account (Cash, Bank, Receivables, Inventory, Assets, Payables, Capital). Old transactions don't need to be moved one by one.",
        "Any debit–credit difference in the opening balances is held in 3400 Opening Balance Equity (default).",
        "Historical Data Import (Excel) is only for past-period reporting; that data doesn't appear on the Transactions page or in stock.",
      ],
      uses: [
        "Starting NEXBILL without losing the balances from your previous system.",
        "Comparing reports before and after using NEXBILL.",
      ],
      watch: [
        "Opening balances are entered ONCE. Entering them twice doubles every balance.",
        "Fixed assets you already own are better recorded via Assets → Asset Purchase → \"Opening balance\" so they're depreciated per unit — don't record them again in the opening balance entry.",
        "Opening product stock is recorded via Inventory (opening stock), not here, so unit counts and values stay in sync.",
      ],
      steps: [
        "Choose the cutover date (usually the start of a month).",
        "Prepare each account's balance from your old reports as of that date, then enter them in Opening Balance until total debit = credit.",
        "Optional: import historical data via the Excel template.",
        "Check the Balance Sheet as of the cutover date — it must match your old balance sheet.",
      ],
    },
  },

  workflow: [
    {
      when: "Once at the start",
      items: [
        "Review the Chart of Accounts; add the bank and e-wallet accounts you use.",
        "Set Account Mapping for payment methods to the right accounts.",
        "Enter Opening Balances (Data Migration tab), opening product stock (Inventory), and assets you already own (Assets → Asset Purchase → Opening balance).",
      ],
    },
    {
      when: "Every day",
      items: [
        "Cashiers open and close shifts; count the drawer honestly — a cash difference is the main alarm.",
        "Record every expense in the Expense menu, stock purchases in Supplier Purchases, PS/TV/furniture purchases in Assets → Asset Purchase.",
        "Check Receivables: chase anything unpaid.",
        "Today's Reconciliation: every order must be Matched.",
      ],
    },
    {
      when: "Every week",
      items: [
        "Match the Bank and e-wallet/QRIS balances in the Trial Balance with the bank statement/provider dashboard.",
        "Pay supplier/asset payables that are due (Payables tab).",
        "Run the Audit tab and deal with red findings.",
      ],
    },
    {
      when: "Every month end",
      items: [
        "Record monthly bills (electricity, internet, rent, salaries) — as payables if not yet paid.",
        "Run Depreciation in the Assets menu.",
        "Stock-take in Inventory.",
        "Audit until clean, then Close Period.",
        "Read the Income Statement, Balance Sheet, and Cash Flow; save PDFs as an archive.",
      ],
    },
    {
      when: "Every year end",
      items: [
        "Make sure all 12 months are closed.",
        "Print the annual Statement of Financial Position, Income Statement, and Notes (SAK EMKM).",
        "Calculate and pay the Indonesian MSME final income tax (0.5% of gross turnover if you still qualify), then record the payment.",
      ],
    },
  ],

  golden: [
    "Record each transaction once, in its own menu. Manual journals are only for things that have no menu.",
    "Don't delete — cancel. Cancelling creates a reversing entry so the trail can still be audited.",
    "Keep personal money and business money separate. Personal withdrawals are recorded as Drawings, not expenses.",
    "Every difference (drawer cash, bank balance, stock) must be explained, not left alone.",
    "Reports are only as accurate as the input: correct product cost prices, depreciation, and complete expenses determine the true profit.",
  ],
};
