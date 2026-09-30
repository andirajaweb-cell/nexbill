import type { HelpCategory } from "../../types";

export const PERAN: HelpCategory[] = [
  {
    id: "peran-kasir",
    group: "peran",
    label: "I'm a Cashier — Daily Tasks",
    summary:
      "A cashier's to-do list from opening to going home, in the order used every day. If you're a new cashier, master this topic first.",
    roles: "Cashier role. Supervisors, Managers, and Owners can also do all of these steps.",
    subsections: [
      {
        title: "On arrival (opening)",
        steps: [
          "Log in with your own account — never use a colleague's.",
          "Open Shift & Cashier → Open New Shift. First count the cash actually in the drawer, then enter that amount as Starting Cash. If it differs from what the previous shift left, write the reason.",
          "Turn on and check every PS unit, controller, and TV. Don't rent out broken units — tell your supervisor so a Maintenance ticket is created.",
          "Open Booking to see today's reservations, so booked units aren't given to other customers.",
          "Check the bell icon (Notifications) for low stock or important messages.",
        ],
      },
      {
        title: "Serving customers who play on site",
        steps: [
          "Customer without a booking → PS Rental → pick a free unit → choose package/hourly → enter name → Start Session.",
          "Customer with a booking → type the booking code in Booking → Check-in.",
          "Food/drink orders while playing → press +F&B on their session card, not through the Cashier, so it's all on one bill.",
          "Customer wants more time → Add Time. Watch for the alarm at 5 minutes left and offer an extension.",
          "Finished → End Session & Pay → choose method → Pay → Print Receipt.",
        ],
      },
      {
        title: "Selling food/drinks without a rental",
        steps: [
          "Open Cashier (POS), click the product or scan its barcode, set the quantity, choose the payment method, press Pay.",
          "Cash: take the money, press \"Confirm Cash Received\". QRIS/transfer: show the outlet's QRIS/bank account on screen, wait for the money to arrive, then mark it received.",
        ],
      },
      {
        title: "Small cash going out during your shift",
        steps: [
          "Parking, water refills, etc. → record it right away in Expense Management → Quick Cash Out. Don't postpone it, so the shift cash doesn't come up short.",
          "Money taken by the owner / put in the safe → record it as a Cash Deposit on the Shift & Cashier page.",
        ],
      },
      {
        title: "Before going home (close the shift)",
        steps: [
          "Make sure no session is still running for a customer who has left — end it and settle the payment (or save it as pay later).",
          "Open Shift & Cashier → Close Shift. Count the drawer by denomination (Rp100,000, Rp50,000, etc.) without looking at the system figure.",
          "Open each e-wallet/bank app used today and enter its balance in the Non-Cash Balance Check section.",
          "Enter how much cash stays in the drawer for the next shift and how much goes to the owner/safe.",
          "Press Close Shift. If there's a difference, write the likely cause in the note.",
          "Switch off unused TVs/units, tidy the controllers, and hand over important information to the next shift.",
        ],
      },
    ],
    notes: [
      "Made a mistake? Don't panic. A cancellation (void/refund) can be requested and approved by your supervisor — data isn't lost, just cancelled.",
      "Cashiers can't give a manual discount above the limit set by the owner (Settings → Preferences). Larger discounts need a Supervisor or higher.",
      "Never share your password. Every transaction is recorded under the logged-in account.",
    ],
  },
  {
    id: "peran-owner",
    group: "peran",
    label: "I'm an Owner / Manager — Monitoring the Business",
    summary:
      "What an owner or manager should check every day, every week, and every month — so the business is under control without always being at the outlet.",
    roles: "Owner, Manager, and Superuser. Some finance menus can only be changed by Owner/Accountant/Superuser (Managers can view).",
    subsections: [
      {
        title: "Every day (5 minutes on your phone)",
        steps: [
          "Open the Overview dashboard: today's revenue, gross profit, units in use, cash balance, and progress toward the daily target.",
          "Check Notifications: expenses waiting for your approval, void/refund requests, low stock.",
          "Approve or reject requests in Staff & Permissions → Approval and in Expense Management (status Pending Approval).",
          "Open Shift & Cashier → Shift History: look at shifts with red differences or flagged for review.",
        ],
      },
      {
        title: "Every week",
        steps: [
          "Reports → Sales & Rental: which units earn the most and which payment methods are used most. The Busy vs Quiet Hours chart on the Overview dashboard helps plan staff schedules and quiet-hour promos.",
          "Transactions → Cashier Performance: compare sales, voids, discounts, and cash differences per cashier.",
          "Inventory → Purchase Order: check products that need restocking.",
          "Maintenance: make sure repair tickets don't pile up. Use the Controller Doctor to check controllers customers complain about.",
        ],
      },
      {
        title: "Every month",
        steps: [
          "Fixed Asset → Depreciation: run depreciation for the month.",
          "Expense → Recurring: generate the routine expenses that are due (electricity, internet, rent, salaries).",
          "Accounting → Income Statement and Balance Sheet: see this month's profit/loss and compare with last month. Reports → Financial Health gives an easier-to-read summary.",
          "Accounting → Audit: run the automatic bookkeeping check and follow its suggestions.",
          "Once the month's reports are final, lock the month in Accounting → Close Period so the figures can't change again.",
          "Check the NEXBILL bill in the Subscription menu so service isn't interrupted.",
        ],
      },
      {
        title: "Setting the outlet's rules",
        steps: [
          "Settings → Business & Tax: tax, service charge, bill rounding, sales target, expense approval limit.",
          "Settings → Preferences: cashier manual discount limit, cash difference threshold that gets flagged, which cash accounts make up the suggested starting cash.",
          "Staff & Permissions: add/deactivate staff, sign out accounts still logged in on another device.",
        ],
      },
    ],
    notes: [
      "Ask anything about your business in AI Business Intelligence (Owner/Superuser only), e.g. \"which PS unit was most profitable this month?\".",
      "Several branches? The All Outlets menu shows every branch's revenue on one screen.",
    ],
  },
  {
    id: "peran-dapur",
    group: "peran",
    label: "I'm Kitchen Staff — Kitchen Display",
    summary: "How kitchen staff receive and complete food/drink orders without paper tickets.",
    roles: "Kitchen role. Any logged-in staff can also open the Kitchen Display.",
    steps: [
      "Log in with the kitchen account and open Kitchen Display. Keep it open on the kitchen tablet/monitor throughout your shift.",
      "Press 🔊 so the order alarm sounds, and \"Enable Browser Notifications\" so new orders still appear when the screen is on another app.",
      "New orders appear in the New column with a sound. Press Confirm when you start handling one.",
      "Press Start Cooking when you begin, then Ready to Serve when done — the waiter/cashier hears a \"Food Ready\" sound.",
      "After it's delivered to the customer, press Delivered. The order leaves the board.",
      "Out of an ingredient? In the New column press Cancel and choose the reason (e.g. \"Out of ingredients\") — the cashier is informed and the customer's bill adjusts.",
    ],
    notes: [
      "The board refreshes automatically every few seconds — no need to press refresh.",
      "Ingredient stock drops automatically according to the recipe when an item sells. If ingredient stock often doesn't match, ask the owner to check the recipes in Inventory → Recipe / BOM.",
    ],
  },
  {
    id: "peran-akuntan",
    group: "peran",
    label: "I'm an Accountant — Bookkeeping & Reports",
    summary:
      "An accountant/finance admin's routine in NEXBILL: making sure all expenses, purchases, and adjustments are recorded correctly, then preparing the monthly reports.",
    roles: "Accountant, Owner, and Superuser (who can change accounting data). Managers can only view.",
    steps: [
      "Daily/weekly: review Expense Management — complete attachments, pay expenses recorded as payables, void incorrect ones.",
      "Review Accounting → Payables (AP) and Receivables (AR): pay supplier bills that are due, record customer payments.",
      "Match bank balances with bank statements. Use Accounting → Reconciliation to find transactions whose recording dates differ.",
      "Month end: run asset Depreciation, generate Recurring expenses, then check that the Trial Balance balances.",
      "Run Accounting → Audit and resolve findings (e.g. products without a cost price, duplicate journals).",
      "Export the Income Statement, Balance Sheet, and Cash Flow (Excel/PDF). Fill in the Notes to the Financial Statements in the Notes (SAK EMKM) tab if needed.",
      "Close the month in Accounting → Close Period after the owner approves the reports.",
    ],
    notes: [
      "Automatic transactions (sales, expenses, etc.) can't be edited directly in the journal — correct them through their source menu (e.g. refund in Transactions, void in Expense). This keeps the audit trail intact.",
      "If a correction is needed after a period is closed, record it in the current period; don't reopen the old period unless truly necessary.",
    ],
  },
];
