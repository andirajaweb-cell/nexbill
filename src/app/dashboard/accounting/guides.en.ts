import type { AccountingGuideBook } from "./guides";

/** English translation of guides.ts — same tabs, same number of items per section. */
export const ACCOUNTING_GUIDE_BOOK_EN: AccountingGuideBook = {
  tabs: {
    "Chart of Accounts": {
      summary: "The list of every financial \"drawer\" (account) in your outlet. Every rupiah coming in or going out is always recorded to one of these accounts.",
      concept: [
        "The Chart of Accounts (CoA) is the list of accounts grouped into 5 classes: 1 Assets (what you own), 2 Liabilities (debts/obligations), 3 Equity (owner's capital), 4 Revenue, 5–8 Expenses (COGS and operating costs).",
        "Parent accounts (header, shown in bold) only total the accounts beneath them and cannot receive journal entries. Transactions always go to a child (posting) account.",
        "Normal balance: Assets and Expenses increase on the Debit side; Liabilities, Equity, and Revenue increase on the Credit side.",
      ],
      uses: [
        "Determines the line items that appear on the Balance Sheet and Income Statement.",
        "Lets you add accounts specific to your business, e.g. a second bank account, a new e-wallet account, or a particular type of expense.",
      ],
      watch: [
        "Don't delete or change the class of an account that already has transactions — past reports would change too. If it's no longer used, just deactivate it.",
        "Account codes follow their class: bank accounts must start with 112x, e-wallets 113x, expenses 6xxx. A code in the wrong class makes the account appear in the wrong part of the report.",
        "Each outlet has its own CoA. One outlet's accounts can't be used by another outlet.",
      ],
      steps: [
        "When you start using NEXBILL: review the default accounts and add the bank/e-wallet accounts you actually use.",
        "Add a new account only when no default account fits — pick the right parent so it lands in the correct report class.",
        "After adding a cash/bank/e-wallet account, link it in the Account Mapping tab (Payment module) so transactions are posted there automatically.",
      ],
    },

    "Account Mapping": {
      summary: "Automatic rules for \"transaction type X is posted to account Y\". Cashiers never choose an account — the system follows this table.",
      concept: [
        "Every module (Rental, F&B, Products, PPOB, Expense, Assets, Payments, etc.) looks up its target account in this table by module + transaction type.",
        "Example: Payment module key \"qris\" → account 1131 QRIS (default), so every QRIS payment increases the QRIS account balance, not Cash.",
        "If a row is missing, the system uses the default account. So this table is for ADJUSTING, not something you must fill in from scratch.",
      ],
      uses: [
        "Splitting revenue by console/product type so the Income Statement is more detailed.",
        "Deciding which account the money from each payment method goes into — the basis for per-channel balance reconciliation at shift close.",
        "Directing COGS, depreciation, inventory, and asset purchase payables to the accounts you want.",
      ],
      watch: [
        "The account type must match its function: revenue → revenue account, payment → cash/bank account, COGS/expense → expense account. The Audit tab checks this automatically.",
        "The key column (transaction key) is the word the system searches for — don't change it. Changing the key makes the row stop being used without any error message.",
        "Mapping changes only apply to NEW transactions. Old transactions stay in their old accounts; move them with a manual journal if needed.",
        "Custom payment methods that aren't mapped go to the general Bank account (1121) — the Audit tab will warn you.",
      ],
      steps: [
        "After adding a new payment method (e.g. another e-wallet), add a Payment module row for that method pointing to the right e-wallet account.",
        "Change the target account with the edit button, then check the next few transactions in the Journal tab to make sure the account is correct.",
        "Run the Audit tab → \"Account Mapping\" after changing anything here.",
      ],
    },

    Jurnal: {
      summary: "The day book of every transaction in debit–credit form. Almost all journal entries are created automatically by the system.",
      concept: [
        "Every transaction is recorded with the double-entry principle: total Debit always equals total Credit. Example, a PS rental paid in cash for Rp50,000: Debit Cashier Cash Rp50,000, Credit Rental Revenue Rp50,000.",
        "The Source column shows where the entry came from (Rental, POS, Expense, Asset Purchase, Depreciation, Manual, etc.).",
        "Cancelled transactions are NOT deleted: the system creates a reversing entry (debit/credit swapped) so the balance returns to zero and the audit trail remains.",
      ],
      uses: [
        "Tracing where a figure in a report comes from.",
        "Recording transactions that have no menu of their own through a Manual Journal: owner capital contributions, owner drawings, corrections of mistakes, bank interest/admin fees, settling old debts.",
      ],
      watch: [
        "Don't re-record in a manual journal a transaction already recorded by its module (sales, expenses, supplier purchases, asset purchases) — it would be counted twice.",
        "A manual journal must balance and its accounts must be child accounts, not parent accounts.",
        "A closed period cannot receive entries dated inside it — record corrections with today's date.",
        "Using a Cash account in a manual journal changes the cash balance; make sure the money really moved.",
      ],
      steps: [
        "To check: filter the period, search by reference/description, open a row's details to see its debit–credit accounts.",
        "To correct: create a manual journal that reverses the wrong part and records the right one, with a clear description (\"Correction of wrong expense account on …\").",
        "Capital contribution: Debit Cash/Bank, Credit 3110 Owner's Capital. Drawings: Debit 3130 Owner's Drawings, Credit Cash/Bank.",
      ],
    },

    "Neraca Saldo": {
      summary: "The balance of every account for a period. The main control tool: total Debit must equal total Credit.",
      concept: [
        "The Trial Balance summarizes journal entries per account: how much was added (debit), how much was reduced (credit), and what remains (balance).",
        "If total Debit = total Credit, the books balance. Balanced isn't necessarily correct (an account can be chosen wrongly), but unbalanced definitely means a problem.",
        "Pairs of a cancelled transaction and its reversal that both fall within the period are hidden because they cancel each other out.",
      ],
      uses: [
        "The starting point for checking the health of your books before looking at the Income Statement and Balance Sheet.",
        "Matching account balances with reality: Cashier Cash with the money in the drawer, Bank with the bank statement, QRIS with the QRIS provider's dashboard.",
      ],
      watch: [
        "Abnormal balances (flagged): Assets with a negative value or Liabilities with a debit balance. Usually a real-world transaction hasn't been recorded yet (a deposit, top-up, or settlement).",
        "Large figures in the Debit/Credit columns are movements, not what's left. Look at the balance column for the ending value.",
        "A Receivables balance even though every customer has paid in full → check the Receivables and Audit tabs.",
      ],
      steps: [
        "Every day/week: match the Cashier Cash, Bank, and e-wallet balances with the actual money/balances.",
        "Click any account to see the journal entries behind it (general ledger). Turn on \"show cancelled transactions\" only for audit purposes.",
        "Differences you can't explain → run the Audit tab.",
      ],
    },

    "Piutang (AR)": {
      summary: "Amounts customers still owe — money that still belongs to the outlet.",
      concept: [
        "Receivables (Accounts Receivable) are created automatically when an order/rental is closed but underpaid. The remainder is posted to account 1141 Customer Receivables (default).",
        "When the customer pays it off, receivables go down and Cash/Bank/e-wallet go up — revenue doesn't increase again, because it was already recognized at the time of the order.",
        "Receivable age (aging) is grouped into: not yet due, 1–30, 31–60, and more than 60 days.",
      ],
      uses: [
        "Collecting from customers who haven't paid in full and monitoring how long the amount has been outstanding.",
        "Receiving payments directly from this tab with the payment method the customer used.",
      ],
      watch: [
        "Receivables older than 60 days are at risk of not being collected. Prudence principle: consider writing them off (manual journal to bad debt expense) when they clearly won't be paid.",
        "Don't receive a payment in another menu and also here — choose one place so it isn't recorded twice.",
        "Receivables whose \"source transaction no longer exists\" can't be paid with the button; settle them with a manual journal.",
      ],
      steps: [
        "Check this tab every day before closing the shift.",
        "Click Receive Payment → enter the amount (partial is allowed) → choose the method → save. The money goes to the account set in that method's Account Mapping.",
        "Monthly: review the aging; collect anything older than 30 days and decide on write-offs for uncollectible ones.",
      ],
    },

    "Hutang (AP)": {
      summary: "Every unpaid obligation of the outlet: to suppliers, for asset purchases, and expenses recorded as payables.",
      concept: [
        "Payables (Accounts Payable) arise when you receive goods/services but pay later: Supplier Purchases on credit (2111 Supplier Payables), Asset Purchases with a down payment/credit (Asset Purchase Payables, default 2163), and Expenses recorded as payables.",
        "Paying a debt doesn't add an expense again — the expense/asset was already recorded at the original transaction. Payment only reduces the payable and Cash/Bank.",
      ],
      uses: [
        "Seeing every bill to be paid in one place, along with its age.",
        "Paying (in full or in installments) directly from here.",
      ],
      watch: [
        "Overdue payables hurt your relationship with suppliers — watch the age column.",
        "Pay through this tab or the original menu, not with an extra manual journal — it would be counted twice.",
        "Choose the cash/bank account the money actually came out of. If it's from the cash drawer, the payment also reduces the shift's expected cash.",
      ],
      steps: [
        "Weekly: sort from the oldest and schedule payments.",
        "Click Pay → enter the amount (supplier and asset payables can be paid in installments) → choose the method and cash/bank account → save.",
        "End of month: the payable account balances in the Trial Balance must equal the total in this tab.",
      ],
    },

    "Laba Rugi": {
      summary: "Whether the business made a profit or a loss in a period: Revenue minus COGS and Expenses.",
      concept: [
        "The Income Statement is prepared on an accrual basis (SAK EMKM): revenue is recognized when the transaction happens (the order's business date), not when the money is received; expenses are recognized when they are incurred.",
        "Gross Profit = Revenue − COGS (cost of goods sold). Net Profit = Gross Profit − Operating Expenses (salaries, electricity, rent, depreciation, etc.) ± other income/expenses.",
        "Asset depreciation is an expense even though no money goes out — it reflects the value of PS/TVs decreasing through use.",
      ],
      uses: [
        "Assessing monthly performance and comparing periods.",
        "Seeing the largest revenue sources (rental, F&B, products, PPOB) and the largest cost items.",
        "The basis for calculating Indonesia's MSME Final Income Tax (0.5% of gross turnover).",
      ],
      watch: [
        "A large profit but little cash is normal if there are receivables, stock increases, or asset purchases — see Cash Flow.",
        "The \"COGS not calculated\" warning means some products have no Cost Price; profit looks larger than it really is.",
        "Without running monthly depreciation, profit looks too high.",
        "Unrecorded expenses (this month's electricity/internet bills) make profit look larger — record them as payable expenses if not yet paid.",
      ],
      steps: [
        "Choose a period (usually last month after closing the books) and compare it with the previous period.",
        "Click any row to see the transactions behind it.",
        "Before reading the month-end profit: make sure all expenses are recorded, depreciation has been run, and a stock count has been done.",
      ],
    },

    Rekonsiliasi: {
      summary: "Matching sales transactions (Transactions page) with their revenue journal entries, order by order.",
      concept: [
        "Every paid order should have exactly one sales journal entry with the same amount and business date.",
        "Statuses: Matched, Awaiting payment, Date differs, Amount differs, Journal missing, Order cancelled but journal still exists, and Journal without order.",
      ],
      uses: [
        "Making sure the turnover in the sales report equals the revenue in the Income Statement.",
        "Fixing missed/different journal entries with the Resync button, without manual input.",
      ],
      watch: [
        "A different amount or a missing journal means the Income Statement isn't accurate for that date.",
        "Orders past midnight are recorded on the business date (the day it was opened), not the payment time — this is intentional.",
        "Resync voids the old journal entry and posts it again; it can't be done for a period that has already been closed.",
      ],
      steps: [
        "Daily (after closing the shift): choose \"today\" and make sure every row is Matched or Awaiting payment.",
        "Problem rows → click Resync, then reload to confirm the status is Matched.",
        "Do this before Close Period every month.",
      ],
    },

    Neraca: {
      summary: "The financial position on a date: what you own (Assets), what you owe (Liabilities), and the owner's capital (Equity).",
      concept: [
        "The basic equation always holds: Assets = Liabilities + Equity. Under SAK EMKM this report is called the Statement of Financial Position.",
        "Fixed assets (PS, TVs, furniture) are presented at acquisition cost minus accumulated depreciation = book value.",
        "Current-year profit goes into Equity; after the year is closed it becomes Retained Earnings.",
      ],
      uses: [
        "Knowing the business's net worth and its ability to pay debts (cash + receivables compared with short-term debt).",
        "The document banks/leasing companies usually ask for in a loan application.",
      ],
      watch: [
        "The Balance Sheet must balance. If it doesn't, run the Audit tab.",
        "The Cash balance on the Balance Sheet must equal the actual money; a difference means some transactions are unrecorded or recorded wrongly.",
        "Inventory must match the stock count results.",
      ],
      steps: [
        "Choose a date (usually month end) after all transactions for that month are complete.",
        "Click a row to trace any figure that looks odd.",
        "Compare with last month end to see changes in payables, receivables, and capital.",
      ],
    },

    "Arus Kas": {
      summary: "The money that actually came into and went out of the cash and bank accounts in a period.",
      concept: [
        "Unlike the Income Statement, Cash Flow only counts money that moved. Unpaid sales (receivables) aren't included; asset purchases and debt payments count as cash out even though they aren't expenses.",
        "It is calculated directly from the movements of Cash/Bank accounts in the journal, so net cash always equals the change in those accounts' balances in the Trial Balance. The accounts counted (cash 111x, bank 112x, and accounts registered as cash/bank) are listed under the report.",
        "Moving cash between your own drawers/accounts nets to zero and isn't counted as cash flow.",
      ],
      uses: [
        "Knowing where money came from and where it went.",
        "Planning large payments (suppliers, asset installments, salaries) based on daily cash patterns.",
      ],
      watch: [
        "Large profit but negative net cash: check asset purchases, debt payments, stock increases, or piling-up receivables.",
        "Odd cash in/out often comes from a manual journal that uses a Cash account — trace it in the Journal.",
      ],
      steps: [
        "Weekly/monthly: choose the period and look at the largest cash-out categories.",
        "Make sure the period's net cash = the change in cash/bank account balances in the Trial Balance for the same period.",
      ],
    },

    "CALK (SAK EMKM)": {
      summary: "Notes to the Financial Statements — the third component required by SAK EMKM, prepared automatically.",
      concept: [
        "SAK EMKM (Indonesia's Financial Accounting Standard for Micro, Small, and Medium Entities) requires three reports: the Statement of Financial Position (Balance Sheet), the Income Statement, and the Notes.",
        "The Notes explain the business identity, basis of preparation (accrual, historical cost), accounting policies (weighted-average or FIFO inventory as chosen by the outlet, straight-line depreciation), details of report items, and income tax.",
      ],
      uses: [
        "Completing the financial statements for banks, investors, cooperatives, or tax reporting.",
        "Printed / saved as PDF together with the Balance Sheet and Income Statement.",
      ],
      watch: [
        "Identity data (name, address, tax ID/NPWP, legal form) is taken from the outlet data in Settings — complete it there.",
        "The 0.5% Final Income Tax estimate is informational; your actual obligation follows your tax status and facilities.",
        "The Notes are only as accurate as your books — run the Audit and make sure the period is complete before printing.",
      ],
      steps: [
        "Choose the report period (usually one financial year, or monthly for internal reports).",
        "Check the fixed asset and tax details, then click Print / Save PDF.",
      ],
    },

    Audit: {
      summary: "An automatic check of your books' health based on the prudence principle — find problems before they reach your reports.",
      concept: [
        "The Audit checks things you can't see in reports: duplicate entries, unbalanced entries, cancelled transactions still in effect, invalid cash posting sources, wrong account mapping, inventory value, negative stock, missing COGS, abnormal balances, aging receivables, unclosed periods, and tax.",
        "Green = safe, yellow = needs attention, red = must be fixed.",
        "Automatic fixes are always recorded correcting/reversing entries that go into the audit log — no data is deleted.",
      ],
      uses: [
        "A routine check before the monthly close.",
        "Finding the cause when the Cash, Receivables, or Profit balance looks odd.",
      ],
      watch: [
        "Read the explanation of each finding before pressing the fix button.",
        "Only adjust inventory value after product Cost Prices and the stock count are correct.",
        "Findings without an automatic fix need to be handled manually (e.g. filling in Cost Prices, reviewing shifts).",
      ],
      steps: [
        "Run it at least once a week, and always before Close Period.",
        "Handle red first, then yellow. Run the Audit again until it's clean.",
      ],
    },

    "Tutup Periode": {
      summary: "Locking a month that has been reported so its figures can't change anymore.",
      concept: [
        "Once a period is closed, no new journal entry (automatic or manual) can be dated within it.",
        "Corrections after closing are recorded with today's date (the current period), not by reopening the old period.",
      ],
      uses: [
        "Keeping reports already handed to the owner/bank/tax office unchanged.",
        "Preventing backdated transactions that could become a loophole for fraud.",
      ],
      watch: [
        "Close only after all of that month's transactions are complete: shifts closed, expenses recorded, depreciation run, stock count, bank reconciliation.",
        "Reopen a period only when truly necessary and only by the Owner — every open/close is logged.",
      ],
      steps: [
        "Month-end checklist (on the 1st–5th of the following month): close all shifts → record expenses & bills → run depreciation in the Fixed Asset menu → stock count → match bank/e-wallet balances → Reconciliation → clean Audit.",
        "Choose the month → Close Period.",
        "Print that month's Balance Sheet, Income Statement, and Notes as an archive.",
      ],
    },

    "Migrasi Data": {
      summary: "Moving your books from an old system/records into NEXBILL.",
      concept: [
        "The standard way to migrate: one Opening Balance journal entry at the cutover date containing every account's balance (Cash, Bank, Receivables, Inventory, Assets, Payables, Capital). Old transactions don't need to be moved one by one.",
        "Any debit–credit difference in the opening balance goes to 3400 Opening Balance Equity (default).",
        "Historical Data Import (Excel) is only for past-period reporting; that data doesn't appear on the Transactions page or in stock.",
      ],
      uses: [
        "Starting NEXBILL without losing the balances from your previous system.",
        "Comparing reports before and after using NEXBILL.",
      ],
      watch: [
        "The opening balance is entered ONCE. Entering it twice doubles every balance.",
        "Fixed assets you already own are better recorded through Fixed Asset → Asset Purchase → \"Opening balance\" so they are depreciated per unit — don't record them again in the opening balance journal.",
        "Opening product stock is recorded through Inventory (opening stock), not here, so unit quantities and values stay in sync.",
      ],
      steps: [
        "Decide the cutover date (usually the start of a month).",
        "Prepare each account's balance from your old reports as of that date, then enter it in Opening Balance until total debit = credit.",
        "Optional: import historical data with the Excel template.",
        "Check the Balance Sheet as of the cutover date — it must match your old balance sheet.",
      ],
    },
  },

  workflow: [
    {
      when: "Once at the start",
      items: [
        "Review the Chart of Accounts; add the bank and e-wallet accounts you use.",
        "Set the Account Mapping of payment methods to the right accounts.",
        "Enter the Opening Balance (Data Migration tab), opening product stock (Inventory), and assets you already own (Fixed Asset → Asset Purchase → Opening balance).",
      ],
    },
    {
      when: "Every day",
      items: [
        "Cashiers open and close shifts; count the drawer money honestly — cash differences are the main alarm.",
        "Record every expense in the Expense menu, stock purchases in Supplier Purchase, and PS/TV/furniture purchases in Fixed Asset → Asset Purchase.",
        "Check Receivables: collect what hasn't been paid in full.",
        "Today's Reconciliation: every order must be Matched.",
      ],
    },
    {
      when: "Every week",
      items: [
        "Match the Bank and e-wallet/QRIS balances in the Trial Balance with the bank statement/provider dashboard.",
        "Pay supplier/asset debts that are due (Payables tab).",
        "Run the Audit tab and handle the red findings.",
      ],
    },
    {
      when: "Every month end",
      items: [
        "Record monthly bills (electricity, internet, rent, salaries) — as payables if not yet paid.",
        "Run Depreciation in the Fixed Asset menu.",
        "Do a stock count in Inventory.",
        "Audit until clean, then Close Period.",
        "Read the Income Statement, Balance Sheet, and Cash Flow; save PDFs as an archive.",
      ],
    },
    {
      when: "Every year end",
      items: [
        "Make sure all 12 months are closed.",
        "Print the annual Statement of Financial Position, Income Statement, and Notes (SAK EMKM).",
        "Calculate and pay the MSME Final Income Tax (0.5% of gross turnover if you still qualify), then record the payment.",
      ],
    },
  ],

  goldenRules: [
    "Each transaction is recorded once, in its own menu. Manual journals are only for things without a menu.",
    "Don't delete — cancel. Cancelling creates a reversing entry so the trail can still be audited.",
    "Keep personal money and business money separate. Personal withdrawals are recorded as Owner's Drawings, not expenses.",
    "Every difference (drawer cash, bank balance, stock) must be explained, not left alone.",
    "Reports are only as accurate as their input: product cost prices, depreciation, and complete expenses determine the correct profit.",
  ],

  ui: {
    guidePrefix: "Guide",
    open: "Read guide",
    close: "Close",
    concept: "The accounting concept",
    uses: "What it's for",
    watch: "Watch out for",
    steps: "How to work with it",
    workflowTitle: "Outlet Accounting Workflow Guide",
    workflowIntro:
      "Almost all journal entries are created automatically from the cashier, rental, expenses, supplier purchases, and assets. Your job: make sure every transaction is recorded in its menu, then check and close the books regularly.",
    closeAria: "Close guide",
    goldenRules: "Golden rules of bookkeeping",
    startFrom: "Start from:",
  },
};
