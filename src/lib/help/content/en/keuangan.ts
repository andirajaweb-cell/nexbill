import type { HelpCategory } from "../../types";

export const KEUANGAN: HelpCategory[] = [
  {
    id: "accounting",
    group: "keuangan",
    label: "Accounting (Bookkeeping & Financial Statements)",
    summary:
      "Complete bookkeeping filled automatically from every transaction: chart of accounts, journal, receivables & payables, Income Statement, Balance Sheet, Cash Flow, automatic checks, monthly closing, and opening balances. You don't need to understand accounting to read the main reports.",
    subsections: [
      {
        title: "The most-used reports",
        steps: [
          "Income Statement: choose a period → see total revenue, gross profit, and net profit, with a breakdown by revenue and expense type. Turn on \"Compare Multiple Periods\" to compare 2–4 months side by side.",
          "Balance Sheet: the position of assets (cash, bank, stock, fixed assets), liabilities, and equity at the end of the chosen period — Today, This Week, This Month, This Year, or Custom/a specific date. Profit from closed months is shown as Retained Earnings (closed periods); only profit after that is shown as Current Period Profit. The selected period's profit is shown below for information.",
          "Cash Flow: money actually coming in and going out during the period, by category and by day.",
          "All reports can be downloaded to Excel/PDF, and every figure can be clicked to see the transactions behind it.",
        ],
      },
      {
        title: "Receivables (AR) & Payables (AP)",
        steps: [
          "Receivables: unpaid customer bills, grouped by age (not yet due, 1–30, 31–60, >60 days). Press \"Receive Payment\" when a customer pays.",
          "Payables: supplier bills, expenses recorded as payables, and asset purchase payables. Press Pay and choose the cash/bank account.",
        ],
      },
      {
        title: "Chart of Accounts & Account Mapping",
        steps: [
          "The account list is prepared automatically. Only add a new account if needed (code, name, type, parent account).",
          "Accounts that have been used can't be deleted — they're archived automatically so history stays correct.",
          "Account Mapping decides the automatic target account per transaction type (e.g. PS5 rental → Rental Revenue). Only change it if you understand accounting.",
        ],
      },
      {
        title: "Journal & Trial Balance",
        steps: [
          "Journal: every bookkeeping entry, filterable by source (Rental, POS, Expense, Asset, etc.).",
          "Manual Journal (permission holders only): enter date, description, and debit/credit lines — total debit must equal total credit.",
          "Cancelling a manual journal creates a reversing entry; the original isn't deleted. Automatic journals are cancelled through their source menu (e.g. refund in Transactions).",
          "Trial Balance: the balance of every account for the period. For balances since the beginning, choose Custom and leave both dates empty. It must always show \"Balance\".",
        ],
      },
      {
        title: "Reconciliation, Audit, Notes",
        steps: [
          "Reconciliation: compares transactions (by transaction date) with journals (by posting date) and shows orders whose dates differ or have problems, with a resolution guide — no manual editing needed.",
          "Audit: an automatic bookkeeping check (e.g. products without a cost price, duplicate journals, cross-outlet data). Suggested fixes always require confirmation and are recorded as correcting journals.",
          "Notes (SAK EMKM): the Notes to the Financial Statements for small businesses, ready to complete and print.",
        ],
      },
      {
        title: "Close Period (lock a month)",
        steps: [
          "Once a month's reports are final, choose that month and press Close Period (note optional).",
          "After closing, no new journals — automatic or manual — can be recorded with a date in that month, so reports already submitted don't change.",
          "Corrections after a period is closed are recorded with today's date. Only reopen a period when truly necessary.",
        ],
      },
      {
        title: "Data Migration (opening balances & old data)",
        navHint: "This tab is only visible to Owner/Superuser.",
        steps: [
          "Opening Balance: record the opening balance of all accounts (cash, bank, receivables, payables, assets, capital) as of the day you start using NEXBILL. Press \"Load All Postable Accounts\" to fill in the account list. Only one active Opening Balance is allowed.",
          "Import Historical Data: download the templates (Sales, Purchases, Other Income, Expenses), fill them in, upload — so trends from previous months show in the reports.",
          "Assets you already own are easier to enter via Fixed Asset → Upload Excel with the Opening balance option.",
        ],
        notes: ["Imported historical data goes into the books and reports, but doesn't appear in the Transactions/Expense lists."],
      },
    ],
    notes: [
      "All staff can VIEW this page. Changing the chart of accounts & mapping: Owner, Superuser, Accountant. Manual journals & opening balances: Owner, Superuser, Accountant. Managers view only.",
      "Fill in every product's Cost Price — without it the Income Statement is too high. The Income Statement page warns you if there are sales with an empty cost price.",
    ],
  },
  {
    id: "expenses",
    group: "keuangan",
    label: "Expense Management",
    summary:
      "Record all outlet expenses (electricity, salaries, rent, supplies, parking, etc.) with their proof. Small expenses are approved automatically; large ones wait for Owner/Manager approval. Everything goes into the books automatically.",
    subsections: [
      {
        title: "Recording an expense",
        steps: [
          "Press \"+ New Expense\": choose the expense account (e.g. Electricity Expense), category, description, payee/supplier (optional), quantity and amount, tax (optional).",
          "Choose how it's paid: the cash/bank account used, or tick \"Record as payable\" and set the due date.",
          "Attach a photo of the receipt as proof.",
          "Press Save & Submit. Below the approval limit (default Rp500,000) it's approved immediately; above it the status is Pending Approval.",
          "The save button locks while processing, so double-clicking doesn't create duplicate expenses.",
        ],
      },
      {
        title: "Approval, payment, cancellation",
        steps: [
          "The Owner/Manager presses Approve or Reject (with a reason) on waiting expenses.",
          "Expenses recorded as payables get a Pay button after approval to settle them.",
          "Drafts/pending can be cancelled without a trace. Approved/paid ones are cancelled with Void (reason required) — the bookkeeping is reversed, the data isn't deleted.",
        ],
      },
      {
        title: "Quick Cash Out",
        steps: ["A short 3-field form (category, amount, note) for small daily expenses from the drawer, like parking and water refills. The approval limit still applies."],
      },
      {
        title: "Recurring (routine expenses)",
        steps: [
          "Create templates for repeating costs: name, account, amount, frequency (monthly/weekly/yearly), next due date.",
          "Press \"Generate Due Expenses\" to create draft expenses that are due, then Submit them as usual.",
        ],
      },
      {
        title: "Cost Center & Dashboard",
        steps: [
          "Cost Centers split costs by area (Rental, F&B, Kitchen, Administration) so you can see which area spends the most.",
          "Dashboard tab: expenses today/this month, unpaid, awaiting approval, due in ≤3 days, breakdown by category, and 30-day trend.",
        ],
      },
    ],
    roles: "Record & pay: Owner, Superuser, Manager, Accountant, Cashier. Approve: Owner, Superuser, Manager. Void: Owner, Superuser, Manager, Accountant.",
  },
  {
    id: "other-income",
    group: "keuangan",
    label: "Other Income",
    summary:
      "Record money coming in outside rental, cashier, and PPOB sales — e.g. commissions, renting the space for tournaments, sponsorships, selling used items, customer fines, bank interest or cashback.",
    steps: [
      "Choose a date range (or press Today / This Month) to see the list.",
      "Enter category, description, received from (optional), amount, and payment method, then press Save.",
      "It's recorded in the books immediately, without approval. If it's cash and a shift is open, it's also counted in the shift cash.",
      "Recorded it wrong? Press Void and enter the reason.",
    ],
    roles: "Record/void: Owner, Superuser, Manager, Accountant. Other roles with report permission can only view.",
  },
  {
    id: "payments-methods",
    group: "keuangan",
    label: "Payment Methods (QRIS, Transfer, E-wallet)",
    navHint: "\"Payments\" menu in the sidebar.",
    summary:
      "Set the payment options shown at the cashier, rental, Home Rental, and membership — including the outlet's QRIS image and bank account shown to customers.",
    steps: [
      "Press \"+ Method\", enter a name (e.g. QRIS, BCA Transfer, GoPay), and choose its type:",
      "\"Tracked Balance\" — for e-wallets/balances that must be checked in their app at shift close. \"Info Only\" — for payments going straight into a bank account/EDC that don't need checking per shift.",
      "Upload the outlet's static QRIS image and/or enter the bank account number & name. When the cashier chooses this method, the customer immediately sees where to pay.",
      "Edit to change the name/type/active status. Deleting only hides the method from new transactions; old transactions don't change.",
    ],
    notes: [
      "Customer money always goes straight into the outlet's account/QRIS — never through NEXBILL.",
      "The Cash method can't be deleted because it's used for the shift cash count.",
    ],
    roles: "Owner, Superuser, Manager.",
  },
  {
    id: "reports",
    group: "keuangan",
    label: "Reports (Operations & Financial Health)",
    summary:
      "Easy-to-read operational reports by date range: sales, rental, Home Rental, stock & cost, customers, expenses, and a financial health score. Official financial statements (Income Statement, Balance Sheet, Cash Flow) are in the Accounting menu.",
    subsections: [
      { title: "Sales", steps: ["Total revenue (rental vs cashier), number of paid transactions, daily trend, revenue per payment method, total discounts/tax/service charge. Includes a comparison with the Income Statement for the same period."] },
      { title: "Rental", steps: ["Rental revenue, number of sessions, average play time, and a table per PS unit (sessions, average duration, revenue)."] },
      { title: "Home Rental", steps: ["Take-home rental revenue, late fees, damage charges, breakdown by category and product type, and deposit status."] },
      { title: "Inventory & COGS", steps: ["Product revenue, total cost of goods, margin per product, list of damaged/wasted items, and low stock."] },
      { title: "Customers", steps: ["Number of customers, spread of member tiers, and the biggest-spending customers."] },
      { title: "Expenses", steps: ["Total expenses vs revenue, expense ratio, net profit, trend, and breakdown by category/account/supplier/method/branch/cost center."] },
      {
        title: "Financial Health",
        steps: [
          "A plain-language summary of how healthy the business is: Profitability (how profitable), Liquidity (enough cash to pay obligations), and Operational Efficiency (costs relative to revenue).",
          "Use it at the end of every month alongside the Income Statement.",
        ],
      },
    ],
    notes: [
      "Each tab has its own date picker.",
      "Excel/PDF downloads of the official financial statements are in the Accounting menu.",
    ],
  },
];
