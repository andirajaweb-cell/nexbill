import type { HelpCategory } from "../../types";

export const SISTEM: HelpCategory[] = [
  {
    id: "staff",
    group: "sistem",
    label: "Staff & Permissions",
    summary:
      "Manage staff accounts and roles, process approval requests (void/refund), view the activity trail, set login security, and (Superuser only) set permissions per role.",
    subsections: [
      {
        title: "Staff list",
        steps: [
          "Add Staff: name, email, password, and role (Manager, Accountant, Supervisor, Cashier, Kitchen, or Owner).",
          "Change the role straight from the dropdown in the table. Deactivate accounts of staff who leave — their data is kept.",
          "Only Owner/Superuser can make another staff member an Owner.",
        ],
      },
      {
        title: "Login security: one account = one device",
        steps: [
          "When this rule is on (default), an account in use in one browser can't log in on another browser/PC until it logs out, is idle for 30 minutes, or is signed out.",
          "Staff forgot to log out on another computer? Press \"Sign out\" on their account in the staff list.",
          "The rule can be turned off per outlet (not recommended).",
        ],
      },
      {
        title: "Approval",
        steps: [
          "Request a Void/Order Cancellation: enter the order number and reason. If your role is allowed, it runs immediately; otherwise it joins the queue.",
          "Request List: permission holders approve or reject.",
          "Flagged shifts (large difference or many voids) are also reviewed from here.",
        ],
      },
      { title: "Audit Log", steps: ["A chronological record of all important activity: who did what, and when. View only."] },
      {
        title: "Roles & Permissions",
        navHint: "Only visible to Superuser accounts.",
        steps: [
          "Permission table: rows = permissions, columns = roles. Tick/untick to change that role's access — it applies immediately.",
          "Press \"reset\" to restore a role's default settings.",
        ],
      },
    ],
    notes: [
      "Everyone should have their own account. Shared accounts make cash differences and mistakes untraceable.",
      "Only Superusers can permanently delete staff accounts; for staff who leave, deactivating is enough.",
    ],
  },
  {
    id: "settings",
    group: "sistem",
    label: "Outlet Settings",
    summary:
      "All outlet settings on one tabbed page: business profile & tax, preferences, branches, units, product categories, rental durations, ad banners, TV Screensaver, notifications, feature modules, audit log, and my account.",
    subsections: [
      {
        title: "Business & Tax",
        steps: [
          "Business profile: name, logo, phone, address, Country (sets the currency and Customer Service reply language), WiFi name & password.",
          "Tax & Billing: tax, service charge, bill rounding to Rp100/Rp500/Rp1,000 (the difference is recorded automatically), and the expense approval limit.",
          "Monthly Sales Target (break-even) — shown as a daily target on the Dashboard.",
          "Booking / Reservation: gap between bookings, check-in deadline, minimum booking notice, accept online bookings, and the outlet booking page link.",
          "Tuya Cloud API Integration (for Tuya smart plugs), Receipt Footer, Printer, and Bank Account for referral commission payouts.",
        ],
      },
      {
        title: "Preferences",
        steps: [
          "Currency (follows Country), accounting period (fiscal year start, monthly/quarterly/yearly), number and date formats.",
          "Shift Starting Cash Composition: which cash accounts are added up as the suggested starting cash.",
          "Shift Anti-Fraud Thresholds: cash difference and number of voids/refunds per shift that get flagged automatically; cashier manual discount limit (%); allow several cash drawers open at once.",
        ],
      },
      {
        title: "Branches, Units, Product Categories, Rental Durations",
        steps: [
          "Branches: add a new branch and press \"Use This Branch\" to switch the active outlet.",
          "Units: pcs, gram, kg, liter, etc. — used in products, recipes, and purchases.",
          "Product Categories: product groups in the cashier and reports.",
          "Rental Durations: quick duration choices when starting a session (e.g. 30, 60, 90, 120 minutes).",
        ],
      },
      {
        title: "Ad Banners, TV Screensaver, Notifications",
        steps: [
          "Ad Banners: promo images (at least 1600×500 px recommended) for the online booking page — set order, link, active/inactive.",
          "TV Screensaver: the promo screen on booth Android TVs — see the TV Screensaver topic.",
          "Notifications: choose which reminders are shown (low stock, expenses awaiting approval, cash differences, bookings). Predictive Unit Maintenance: hours of use before a unit is flagged as needing service.",
        ],
      },
      {
        title: "Feature Management",
        navHint: "Can only be changed by the Superuser.",
        steps: [
          "Turn modules on/off: Home Rental (and its sub-features), PPOB, TV Screensaver.",
          "Turning a module off doesn't delete data — history reappears when the module is turned back on.",
          "Sub-features labelled \"Coming soon\" aren't available yet.",
        ],
      },
      {
        title: "My Account",
        steps: [
          "Change your own login email and password (password at least 8 characters).",
          "Accounts created with Google can set a password so they can also log in with email & password.",
          "Owner: the \"Delete Account & Data\" card deletes the account and outlet data — press \"Send Confirmation Code\", enter the code from your email, type HAPUS. The account and outlets are deactivated immediately; personal data is deleted within 30 days.",
        ],
      },
    ],
    notes: [
      "Changing most settings requires the Owner, Superuser, or Manager role; other staff can only view.",
      "Printer settings are saved per computer — set them on every cashier computer.",
      "Delete All Data (full reset) is in the Admin Data menu.",
    ],
  },
  {
    id: "semua-outlet",
    group: "sistem",
    label: "All Outlets (Multi-Branch)",
    navHint: "This menu only appears for accounts linked to more than one outlet.",
    summary: "A summary of all branches on one screen and the place to manage branches: add, edit profile, deactivate, and jump to any branch's dashboard.",
    steps: [
      "Top card: today's total revenue across all active outlets.",
      "Each outlet appears as a card: subscription status, today's revenue, PS unit availability.",
      "Press \"Open This Outlet's Dashboard\" to switch — every other menu follows that outlet immediately.",
      "Owner/Superuser: \"Add Outlet\" for a new branch (its chart of accounts is created automatically), the pencil icon to edit the profile, the archive icon to deactivate.",
      "Deactivated outlets move to the Archive section and can be reactivated any time.",
    ],
    notes: [
      "Deactivating = archiving, not deleting. All history stays safe.",
      "Your account's main outlet can't be deactivated from here.",
    ],
  },
  {
    id: "billing-subscription",
    group: "sistem",
    label: "NEXBILL Subscription",
    navHint: "\"Subscription\" menu — these are your outlet's bills TO NEXBILL, not outlet revenue.",
    summary: "Your app subscription status, plan choice (Starter per PS unit or Pro per outlet, monthly/yearly), bill payments, hardware purchases (smart plugs, installation service), and the AI Add-on.",
    steps: [
      "See the status: Trial (30 days), Active, Awaiting Payment, Grace Period, or Suspended.",
      "Choose a plan when subscribing: Starter (per active PS unit, minimum 5 units, operational features) or Pro (flat per outlet, unlimited units, every feature + AI). Yearly = pay 10 months, get 12.",
      "Pay a bill: choose QRIS, bank Virtual Account, or another available method. After paying, press \"Mark as Paid\" if asked.",
      "\"Change Plan\": upgrading to Pro or adding Starter unit quota takes effect once the prorated difference is paid; downgrades, smaller quotas, or a different cycle apply at the next renewal. \"Renew Now\" creates the next period's bill early.",
      "Buy hardware: choose smart plugs or installation service, set quantities, check out — they appear on one bill.",
      "AI: free during the trial and included in Pro; on Starter it is activated as the AI Add-on for a monthly fee.",
    ],
    notes: [
      "During the trial every Pro feature is open, but smart plugs can't be added yet and Android TV control is limited to 1 unit.",
      "Starter locks Accounting, Expenses, Other Income, Assets, PPOB, Home Rental, shift anti-fraud detection, and creating new branches (marked PRO in the menu) — the data is kept and opens instantly after upgrading. Active PS units are capped at the quota.",
      "Overdue bills enter a 7-day Grace Period; after that access is suspended except for the Subscription page. A reminder shows every day during the grace period.",
      "Outlets in one billing group (multi-branch) are billed on one invoice; the 2nd and later Pro outlets get a branch discount.",
      "Payments here are costs to NEXBILL and are never recorded as your outlet's revenue.",
    ],
    roles: "Owner, Superuser, Manager.",
  },
  {
    id: "referral",
    group: "sistem",
    label: "Referral Program (Invite Other Outlets)",
    summary:
      "Invite other rental owners to use NEXBILL with your outlet's code/link. They get 20% off their first payment; you earn a commission every time they pay their subscription, for as long as it stays active.",
    steps: [
      "Copy your outlet's referral link (\"?ref=CODE\") and share it. The code is created automatically for every outlet.",
      "Each time an outlet you invited pays its subscription, a commission (default 20%) is recorded automatically.",
      "Summary cards: total commission and balance not yet paid out. Below: payout history and the list of outlets you invited.",
      "Enter your bank account in Settings → Business & Tax. Commissions are paid out manually by the NEXBILL team every Monday.",
    ],
    notes: [
      "Commission only comes from the invited outlets' NEXBILL subscription payments, not from their revenue. It stops automatically if they stop subscribing.",
      "The Affiliate (27%) and Master Partner (35%) levels are granted by the NEXBILL team to partners who actively invite many outlets.",
    ],
  },
  {
    id: "rekomendasi-produk",
    group: "sistem",
    label: "Recommended Gear (Equipment Shopping)",
    navHint: "Linked from the Subscription page, and from the smart plug warning in Device Control.",
    summary:
      "A catalog of rental equipment picked by the NEXBILL team (controllers, accessories, cables, networking, smart plugs, etc.) with direct links to online stores. Purchases are made in the destination store, outside NEXBILL.",
    steps: [
      "Choose a category, click a product to open its store page in a new tab.",
      "When opened from the non-Android TV warning in Device Control, this page filters straight to smart plug products. Press \"See all recommended products\" to see everything.",
      "Always check the final price on the store page — catalog prices are only a reference.",
    ],
    notes: ["Purchases here aren't added to your Subscription bill or the outlet's books automatically. Record them as an asset purchase or expense if needed."],
  },
  {
    id: "ai",
    group: "sistem",
    label: "AI Business Intelligence (Ask Your Business Data)",
    summary:
      "Ask anything about your business in everyday language — the AI reads your outlet's data (sales, rental, costs, profit & loss, cash, stock, assets) and answers. There's also an automatic analysis panel.",
    subsections: [
      {
        title: "Business Assistant",
        steps: [
          "Type a question, e.g. \"How much revenue this month compared to last month?\" or \"Which PS unit is most profitable?\", or click one of the sample questions.",
          "While thinking, the AI shows which data it's checking. Answers use your outlet's latest figures.",
        ],
      },
      {
        title: "Insights & Analysis",
        steps: [
          "30-day revenue & cost trends, a 7-day forecast, and detection of unusual figures — calculated automatically at no cost.",
          "Press \"Generate Recommendations\" to ask the AI for written advice.",
        ],
      },
    ],
    notes: [
      "Owner and Superuser only.",
      "Free during the trial and included in Pro; on Starter it needs the AI Add-on in the Subscription menu.",
      "Double-check important figures in the reports before making big decisions.",
    ],
  },
  {
    id: "admin",
    group: "sistem",
    label: "Admin Data & Data Reset",
    navHint: "Table panel for Superusers only. The Delete All Data section is also available to Owners.",
    summary:
      "A shortcut to fix master data (products, customers, suppliers, staff, units, vouchers, cash/bank accounts, etc.) directly, plus Data Reset to wipe all of the outlet's data. Use with great care.",
    steps: [
      "Choose a table, press Add/Edit on a row, fill it in, then Save.",
      "Delete: in tables with an active status (products, staff, units, vouchers, etc.) it only deactivates; in other tables it deletes permanently and fails if the row is still in use.",
      "Delete All Data (Full Reset) — this outlet only: retype the confirmation phrase, enter your password, then press the delete button.",
      "A reset PERMANENTLY deletes all of this outlet's transactions, bookkeeping, products, stock, customers, expenses, assets, and settings. Only the outlet record and Superuser/Owner accounts remain.",
    ],
    notes: [
      "Transaction data (orders, payments, journals, stock movements, audit log) deliberately can't be changed from here so history stays honest.",
      "A reset can't be undone from the app. Contact Customer Service first if you're unsure.",
    ],
  },
];
