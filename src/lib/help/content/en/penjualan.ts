import type { HelpCategory } from "../../types";

export const PENJUALAN: HelpCategory[] = [
  {
    id: "transaksi",
    group: "penjualan",
    label: "Transactions (History, Refunds & Voids)",
    summary:
      "Where you find every transaction (rental, food/drinks, products, PPOB), reprint receipts, see the bookkeeping behind them, and cancel or refund. There's also a Cashier Performance tab.",
    subsections: [
      {
        title: "Finding transactions",
        steps: [
          "Choose a period (Today, Yesterday, This Week, This Month, This Year, or custom dates).",
          "Filter by cashier, transaction type, payment method, status, customer name, or total range.",
          "Press Detail to see the items, payments, and bookkeeping entries (journal).",
          "Press Receipt to reprint the receipt.",
        ],
      },
      {
        title: "Cancelling or refunding",
        steps: [
          "Refund: return money to the customer (e.g. overcharged). Void: cancel a transaction entered by mistake. Both require a reason.",
          "If your role isn't allowed to do it directly, the request goes to the Approval queue in Staff & Permissions and waits for a supervisor.",
          "Cancelled transactions don't disappear — they stay with a cancelled status, and their bookkeeping is reversed automatically.",
          "Mark as Paid (Owner/Superuser only): forces a stuck bill to be settled in cash. Permanent delete is only for special cases and can't be undone — use Void for normal cancellations.",
        ],
      },
      {
        title: "Cashier Performance",
        steps: [
          "Choose a period to see the cashier ranking: number of transactions, total sales, average, breakdown by type, discounts, voids, number of shifts, and cash difference.",
        ],
      },
    ],
    notes: [
      "Viewing the transaction list requires permission to view reports (Owner, Superuser, Manager, Accountant, Supervisor). Cashiers and kitchen staff can't open the list.",
      "For Excel/PDF files, use Reports or Accounting.",
    ],
    roles: "View: Owner, Superuser, Manager, Accountant, Supervisor. Direct refund/void according to role permissions; other roles through Approval.",
  },
  {
    id: "promo",
    group: "penjualan",
    label: "Promos & Rental Packages",
    summary:
      "Create fixed-price PS rental packages (e.g. \"3-Hour PS4 Package Rp45,000\") that cashiers can pick when starting a session. Shopping discount vouchers are created in Membership & CRM.",
    steps: [
      "Enter the package name, console (All/PS3/PS4/PS5), duration in minutes, and package price, then press Save Package.",
      "The package immediately appears as an option in the New Session panel on the PS Rental page.",
      "Edit to change it, Deactivate to hide it temporarily, Delete to remove a package that has never been used.",
      "Quiet-hour promo idea: check the Busy vs Quiet Hours chart on the Overview dashboard, then create a special package for those hours.",
    ],
    notes: [
      "A package that has been used can't be deleted — it's automatically deactivated instead so transaction history stays correct.",
      "Packages only apply in PS Rental, not in the Cashier cart.",
    ],
    roles: "Owner, Superuser, Manager, Supervisor.",
  },
  {
    id: "membership",
    group: "penjualan",
    label: "Membership & CRM (Customers, Points, Vouchers)",
    summary:
      "A customer list with purchase history, points, and member tiers (automatic from total spending or purchased), a catalog of rewards redeemable with points, and discount vouchers.",
    subsections: [
      {
        title: "Customers",
        steps: [
          "Search for a customer (name/phone) or press Add Customer — name and phone number are enough.",
          "Click a customer to see total spending, points, tier, transaction/rental/points history, and redeemable rewards.",
          "Redeem points: press \"Redeem\" on a reward — a redemption code appears. Play-discount rewards automatically become a single-use voucher for that customer.",
          "Sell/renew a membership: choose the tier, choose Cash or QRIS, press \"Pay & Activate\". The payment is automatically recorded in the books and the shift cash.",
        ],
      },
      {
        title: "Member tiers",
        steps: [
          "Add a tier: name (e.g. Silver, Gold), minimum total spending to qualify, membership fee (optional), points multiplier, discount percent, benefits, and validity.",
          "Customers move up automatically whenever a transaction is paid and their total spending qualifies. Tiers never drop automatically.",
          "Tiers with a membership fee can also be sold directly at the cashier.",
        ],
      },
      {
        title: "Rewards",
        steps: ["Add a reward: name, type (partner brand shopping or play discount), points required, then the details for that type."],
      },
      {
        title: "Vouchers",
        steps: [
          "Enter the code (automatically upper-case), type (percent or amount), value, and minimum spend, then press Create Voucher.",
          "The customer just mentions the code; the cashier types it in PS Rental or Cashier.",
        ],
        notes: ["A voucher stops working when its usage quota runs out."],
      },
    ],
    notes: [
      "Points are earned automatically, about 1 point per Rp10,000 spent (times the tier multiplier), plus play points per console for rental sessions.",
      "Some buttons (delete customer, redeem points, edit/delete master data) are only visible to Superusers.",
    ],
    roles: "Selling memberships: Owner, Superuser, Manager, Supervisor, Cashier. Managing tiers/rewards/vouchers: Owner, Superuser, Manager, Supervisor.",
  },
  {
    id: "ppob",
    group: "penjualan",
    label: "Bill Payments / PPOB (Credit, Tokens, Top-ups, Cash Withdrawal)",
    navHint: "Appears in the sidebar when the PPOB module is on (Settings → Feature Management).",
    summary:
      "Record digital product sales — e-wallet top-ups, electricity tokens, phone credit, bill payments, transfers, cash withdrawals — in the same app, with your profit margin and the provider's cost recorded separately.",
    steps: [
      "Once at the start: press \"Manage Provider Prices & Margins\" to set the cost and margin of each product.",
      "Fill in the transaction form: category, product (price & margin filled automatically), amount, destination/reference number, source-of-funds account, and receiving account.",
      "Cash Withdrawal: the money flows the other way — the customer receives cash from the drawer and the provider deposit balance increases.",
      "Entered it wrong? Press Cancel (void). Editing and permanent delete are Superuser only.",
      "The cards at the top show the PPOB deposit balance and this period's transaction count.",
    ],
    notes: [
      "The PPOB deposit balance is checked at every shift close, because all cashiers share it.",
      "If the outlet doesn't sell PPOB, the Superuser can switch the module off — old history stays safe.",
    ],
    roles: "Owner, Superuser, Manager (according to the PPOB management permission).",
  },
  {
    id: "marketplace",
    group: "penjualan",
    label: "Outlet Marketplace (Buy & Sell Used Gear)",
    summary:
      "Sell controllers, consoles, TVs, chairs, or gear you no longer use to other NEXBILL outlets — or buy used items from them. Free, no service fee. Comes with trust profiles, locked bank accounts, transaction proofs, reviews, and a dispute channel.",
    subsections: [
      {
        title: "Before you start — Security & Bank Account",
        steps: [
          "Open the Security & Account tab. Enter the account to receive payments (bank/e-wallet, number, holder name as in the bank book).",
          "Buyers are only directed to pay into this account. If you change it, buyers see a warning for 7 days.",
          "Check your outlet's trust profile: account age, completed deals, reviews, and disputes — this is how other outlets see you.",
        ],
      },
      {
        title: "Selling an item",
        steps: [
          "My Items tab → List an Item: enter the item name (e.g. \"PS4 DualShock controller, used, like new\"), category, price per unit, number of units, and an honest description (condition, completeness, reason for selling).",
          "Add up to 5 photos — items with photos are trusted far more and sell faster.",
          "Enter a phone number you can be reached on. It isn't shown in the listing — it's only revealed to the buyer after you accept their offer.",
          "Press List in Showcase.",
          "Removing an item from the showcase requires choosing a reason.",
        ],
      },
      {
        title: "Buying an item",
        steps: [
          "Browse the showcase, search or filter by category, click an item to see photos and the seller's trust profile.",
          "Press Make an Offer: enter your offer price per unit, a note for the seller, and your phone number, then Send Offer.",
        ],
      },
      {
        title: "Deal & handover",
        steps: [
          "The seller accepts the offer in the Deals tab — both parties' phone numbers are revealed so they can arrange the handover.",
          "The buyer pays ONLY into the account shown on the deal card, then uploads the payment proof. The seller uploads the handover proof/tracking number.",
          "Seller: hand over the item only after the money has really arrived — check your account statement, don't just trust a transfer screenshot.",
          "The buyer presses \"Item Received & Paid\" after receiving it. Then both parties can leave star reviews.",
        ],
      },
      {
        title: "If something goes wrong",
        steps: [
          "Press Report a Problem on the deal card: choose the problem type, write the timeline (what was agreed, dates, amounts), and attach evidence.",
          "The reported party can respond with their own evidence. The NEXBILL team decides after reading both sides.",
          "False reports can result in sanctions against the reporter.",
        ],
      },
    ],
    notes: [
      "Safety tips: check the other party's profile, prefer cash on delivery or pay after seeing the item, transfer only to the account on the deal card, upload proofs in the app.",
      "Don't write phone numbers, other bank accounts, or links in descriptions, reasons, or reviews — the system filters them so the transaction stays protected by in-app evidence.",
      "Newly joined outlets have a limit on the value of items they can list until their reputation is established.",
      "Sales are automatically recorded as the seller's revenue in the books.",
    ],
  },
  {
    id: "chat",
    group: "penjualan",
    label: "Customer Service (Ask the NEXBILL Team)",
    navHint: "This is the help channel to the NEXBILL central team — not your outlet's customer inbox.",
    summary: "Send questions, complaints, suggestions, or technical issues straight to the NEXBILL team, with photos/videos.",
    steps: [
      "Press \"+ New Ticket\", fill in a title (optional), category (Complaint/Suggestion/Technical Issue/Other), and message, then Send to Head Office.",
      "Attach a photo or screen video if there's an error — it's understood much faster.",
      "Pick a ticket in the left list to read the conversation, reply in the \"Reply...\" box.",
      "Requests for a NexbillAgent token (Android TV control) are also answered here.",
    ],
    notes: [
      "Replies appear automatically without refreshing.",
      "The NEXBILL team replies in the language of your outlet's Country (Settings → Business & Tax).",
      "Ticket status (resolved/open) is managed by the NEXBILL team.",
    ],
  },
  {
    id: "notifikasi",
    group: "penjualan",
    label: "Notifications & Announcements",
    navHint: "The bell icon at the top of the screen.",
    summary:
      "Everything that needs your attention in one place: low stock, approval requests, pending expenses, bookings, subscription status, and announcements from the NEXBILL team.",
    steps: [
      "Press the bell icon. The red number shows unread notifications.",
      "Choose All or Unread.",
      "Click a notification title to open the related page directly (automatically marked as read), or press \"Mark as read\".",
      "\"Mark all as read\" clears them all.",
    ],
    notes: [
      "Which notification types are shown can be set in Settings → Notifications.",
      "Important announcements from the NEXBILL team also appear once as a pop-up when you open the dashboard, until you press \"Got it\".",
    ],
  },
];
