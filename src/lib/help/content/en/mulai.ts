import type { HelpCategory } from "../../types";

export const MULAI: HelpCategory[] = [
  {
    id: "mulai-disini",
    group: "mulai",
    label: "Welcome — Start Here",
    summary:
      "NEXBILL is an app for running a PlayStation rental business: it times play sessions, takes payments, sells food and drinks, tracks stock, and produces financial reports automatically. This topic explains how to use the Help Center and move around the menus, so your first day isn't confusing.",
    subsections: [
      {
        title: "How to use this Help Center",
        steps: [
          "The topic list is on the left, grouped from the most basic (Start Here) to the most advanced (Management & System).",
          "Type a word in the search box (e.g. \"shift\", \"receipt\", \"stock\", \"TV\") — the list instantly filters to topics containing it, including inside the steps.",
          "Every topic has a Summary (what it's for), How to Use (numbered steps), and Important Notes (common mistakes). Follow the steps in order.",
          "New to NEXBILL? Read in this order: Basic Concepts → New Outlet Setup → PlayStation Rental Workflow → the Role Guide for your job.",
          "Stuck? Open the \"Help & Glossary\" group at the very bottom: it has Common Problems & Solutions and a Glossary.",
        ],
      },
      {
        title: "Logging in and out",
        steps: [
          "Open dashboard.nexbill.id, enter your email and password, then press Log In. Accounts created with Google can use the Google button.",
          "Forgot your password? Press \"Forgot password\" on the login page and follow the link sent to your email.",
          "For security, one account can only be active on one device/browser at a time. If you're logged in on your phone and try to log in on a PC, the PC is refused until you log out on the phone, the account is idle for 30 minutes, or the Owner presses \"Sign out\" in Staff & Permissions.",
          "When you finish, press Log Out in the account menu (top right) — especially on shared computers.",
        ],
      },
      {
        title: "Getting to know the dashboard",
        steps: [
          "The left sidebar holds every menu, ordered by daily workflow: Operations (PS Rental, Cashier, Booking) at the top, then Sales & Customers, Inventory & Finance, and Settings at the bottom. On a phone, open the sidebar with the menu button (☰).",
          "The top bar shows the active outlet name, the Notifications bell, the language picker, and your account menu.",
          "Change the language with the picker in the top bar — Indonesian, English, Malay, Thai, Filipino, and Vietnamese are available. This Help Center switches language too.",
          "Menus your outlet doesn't use (e.g. Home Rental, Bill Payments/PPOB, TV Screensaver) can be switched off by the Superuser in Settings → Feature Management to keep the sidebar tidy.",
        ],
      },
    ],
    notes: [
      "All data is stored online (cloud). You can open NEXBILL from a PC, laptop, tablet, or phone — just use a browser (latest Google Chrome or Microsoft Edge recommended).",
      "Need a human? Open the Customer Service menu to send your question straight to the NEXBILL team.",
    ],
  },
  {
    id: "konsep-dasar",
    group: "mulai",
    label: "Basic Concepts of NEXBILL",
    summary:
      "Five things to understand before using NEXBILL: outlets, staff accounts & roles, cashier shifts, automatically recorded transactions, and automatic bookkeeping. Once these are clear, the other menus will make sense.",
    subsections: [
      {
        title: "1. Outlet (branch)",
        steps: [
          "An outlet is one business location. All data (PS units, products, transactions, reports) always belongs to a specific outlet.",
          "More than one branch? One account can be linked to several outlets. The \"All Outlets\" menu appears so you can see every branch at a glance and switch with one click.",
          "Data is never mixed between outlets — other outlets (including other owners') can't see your data.",
        ],
      },
      {
        title: "2. Staff accounts and roles",
        steps: [
          "Everyone who works should have their own account — don't share one, so it's always clear who did what.",
          "Roles decide what each person may do: Superuser (highest, can configure everything including permissions), Owner, Manager, Accountant, Supervisor, Cashier, and Kitchen.",
          "Most menus can be VIEWED by all staff, but buttons that change data (add, edit, delete, approve) only appear for roles allowed to use them. So if a cashier can open Accounting but can't change anything, that's intentional.",
        ],
      },
      {
        title: "3. Cashier shifts",
        steps: [
          "A shift is the period one cashier is responsible for the cash drawer. Open a shift before selling (enter the starting cash in the drawer) and close it when done (count the cash in the drawer).",
          "All cash coming in and out during the shift is totalled by the system and compared to your count — any difference shows right after the shift is closed.",
        ],
      },
      {
        title: "4. Transactions are recorded automatically",
        steps: [
          "Every rental session, cashier sale, take-home rental, PPOB sale, expense, and stock purchase is recorded automatically — no need to copy anything into a book or Excel.",
          "All transactions can be found again in the Transactions menu, with their receipts.",
        ],
      },
      {
        title: "5. Automatic bookkeeping (accounting)",
        steps: [
          "Behind every transaction, NEXBILL creates the bookkeeping entry (journal) automatically. The result is an always-up-to-date Income Statement, Balance Sheet, and Cash Flow.",
          "The list of accounts (Chart of Accounts) is prepared when the outlet is created. A typical owner doesn't need to understand accounting to use NEXBILL — just run transactions correctly.",
        ],
      },
    ],
    notes: [
      "A few of the riskiest buttons (permanent delete, editing the permission matrix) only appear for Superuser accounts — even Owners don't see them. If a \"Delete\" button is missing, it isn't an error.",
      "Almost every input mistake can be undone (void/refund/cancel) without deleting data — the history stays so reports remain honest.",
    ],
  },
  {
    id: "setup-outlet-baru",
    group: "mulai",
    label: "New Outlet Setup (Complete Checklist)",
    summary:
      "The recommended order of steps before the outlet starts serving customers — from filling in the business profile to the first test transaction. Steps marked (optional) can be skipped and done later.",
    subsections: [
      {
        title: "Step 1 — Business profile, tax & country",
        navHint: "Settings → Business & Tax",
        steps: [
          "Enter the business name, logo, phone number, full address, and Country. Country decides the currency shown and the language NEXBILL Customer Service replies in.",
          "Enter the WiFi name & password if you want to show them to customers (on receipts, the online booking page, or the TV Screensaver). The TV only ever shows the WiFi name, never the password.",
          "Set Tax (%), Service Charge (%), and bill rounding (e.g. round to Rp500/Rp1,000 so there's no small change left over).",
          "Enter the monthly Sales Target (break-even). The Overview dashboard will show the daily target and progress.",
          "Set the expense amount that is approved automatically (default Rp500,000). Expenses above it wait for Owner/Manager approval.",
          "Write the Receipt Footer text (e.g. \"Thank you, see you again!\").",
        ],
      },
      {
        title: "Step 2 — Add PlayStation units & rates",
        navHint: "PS Rental → \"Manage Units\" button",
        steps: [
          "Add each unit one by one: unit name (e.g. \"PS5 - Booth 1\"), console type (PS2 to PS5 Slim), TV type, and hourly rate.",
          "TV type matters for automatic control: an Android TV can be switched on/off through the NexbillAgent app, while a regular TV (analog or non-Android smart TV) needs a smart plug.",
          "If you sell fixed-price packages (e.g. \"3-Hour PS4 Package Rp45,000\"), create them in Promos & Packages. Quick duration choices (30/60/90 minutes, etc.) are set in Settings → Rental Durations.",
          "Check: all units appear on the PS Rental page and none is set to Maintenance.",
        ],
      },
      {
        title: "Step 3 — Set up payment methods",
        navHint: "\"Payments\" menu",
        steps: [
          "Cash exists automatically.",
          "Add the non-cash methods you actually use: QRIS, bank transfer, GoPay, DANA, debit card, etc.",
          "For QRIS/transfer, upload the outlet's static QRIS image and enter the outlet's bank account — both are shown to the customer when the cashier picks that method. Money always goes straight into the outlet's account, never through NEXBILL.",
        ],
      },
      {
        title: "Step 4 — Add staff & roles",
        navHint: "Staff & Permissions",
        steps: [
          "Create an account for every staff member: name, email, password, and role (Manager/Accountant/Supervisor/Cashier/Kitchen).",
          "Make sure every staff member has tried logging in before the first day.",
        ],
      },
      {
        title: "Step 5 (optional) — Connect TVs & devices",
        navHint: "Device Control",
        steps: [
          "Android TV: follow the \"Device Setup Guide\" on the Device Control page (request a token, download NexbillAgent to the cashier PC, connect the TV).",
          "Regular (non-Android) TV: install a smart plug and register it on the same page. The page reminds you which units still need a smart plug.",
          "Link each device to its rental unit. You can skip this — TVs can still be switched on manually with the remote.",
        ],
      },
      {
        title: "Step 6 — Set up the receipt printer",
        navHint: "Settings → Business & Tax → Printer",
        steps: [
          "Plug the receipt printer into the cashier computer and make sure it's installed in Windows.",
          "Try printing a receipt from the test transaction (Step 10). If the width doesn't fit, set the paper width (58mm/80mm) and press \"Save for This Computer\" — repeat on every cashier computer.",
          "Using a phone/the NEXBILL Android app with a Bluetooth printer? In Settings → Printer set How this device prints to \"Direct Bluetooth from phone (BLE printer)\", then tap \"Choose Bluetooth Printer\" and \"Test Print\" — or \"Via the RawBT app\" for Bluetooth Classic printers.",
        ],
      },
      {
        title: "Step 7 (optional) — Food/drink products & stock",
        navHint: "Inventory Control",
        steps: [
          "Add products one by one, or download the Excel template and upload them all at once.",
          "Fill in each product's Cost Price — without it, reports treat every sale as 100% profit.",
          "For prepared items (e.g. fried noodles, iced tea), create a Recipe so ingredient stock drops automatically whenever the item sells.",
          "Add Suppliers if you want to record stock purchases.",
        ],
      },
      {
        title: "Step 8 (optional) — Turn on extra modules",
        navHint: "Settings → Feature Management (Superuser only)",
        steps: [
          "Home Rental: if the outlet also rents PS/TVs for customers to take home.",
          "PPOB: if the outlet also sells phone credit, electricity tokens, e-wallet top-ups.",
          "TV Screensaver: if you want booth Android TVs to show promotions when idle.",
          "Leave unused modules off so staff menus stay simple.",
        ],
      },
      {
        title: "Step 9 — Opening balances (only for outlets already running)",
        navHint: "Accounting → Data Migration",
        steps: [
          "A brand-new outlet can skip this step.",
          "If the outlet operated before using NEXBILL, enter Opening Balances (cash, bank, receivables, payables, capital) as of the day you start using NEXBILL, so the Balance Sheet is correct from day one.",
          "Assets you already own (PS units, TVs, chairs) can be entered in one go via Fixed Asset → Upload Excel with the \"Opening balance\" option.",
        ],
      },
      {
        title: "Step 10 — Open a shift & do a test transaction",
        navHint: "Shift & Cashier, then PS Rental",
        steps: [
          "Open the first shift with the cash actually in the drawer.",
          "Do one complete test: start a session on one unit, add 1 drink, end the session, pay (try cash and one non-cash method), then print the receipt.",
          "Check the transaction appears in Transactions and (if it had food) on the Kitchen Display.",
          "Void the test transaction so it doesn't count in real sales reports.",
        ],
      },
    ],
    notes: [
      "This order is a suggestion, not a rule. What matters is that Steps 1–4, 6, and 10 are done before serving customers.",
      "Continue with \"PlayStation Rental Workflow\" to see how all the parts connect.",
    ],
  },
  {
    id: "alur-kerja-rental",
    group: "mulai",
    label: "PlayStation Rental Workflow (Start to Report)",
    summary:
      "One rental session from the customer arriving until the money shows up in the financial reports — so you understand how Booking, PS Rental, Kitchen, Shift, Transactions, and Accounting connect instead of being separate menus.",
    subsections: [
      {
        title: "1. Before the customer arrives (optional — booking)",
        steps: [
          "The customer books by phone/WhatsApp → the cashier records it in Booking. Or the customer books on the outlet's online booking page (the link is in Settings → Business & Tax).",
          "If the time clashes, the booking goes to the Waiting List instead of being rejected.",
          "When the customer arrives, the cashier types the booking code for a quick check-in.",
        ],
      },
      {
        title: "2. The customer arrives — start the session",
        steps: [
          "Open PS Rental, pick a free unit, choose a Package (fixed price) or Hourly, and enter the customer's name (or pick a member).",
          "If outlet policy requires a down payment (DP), tick DP and take the money.",
          "Press Start Session. If the unit is linked to a TV/smart plug, the TV can turn on by itself.",
        ],
      },
      {
        title: "3. While playing",
        steps: [
          "Food/drink order → press +F&B on the session card. The order appears instantly on the kitchen's Kitchen Display.",
          "Extra controller → +Accessories (charged per hour from when it's added).",
          "More time → Add Time. Change booth → Move Unit (bill and time move too).",
          "Watch all units at once on the Live Billing Board on a second screen.",
        ],
      },
      {
        title: "4. Finished — payment",
        steps: [
          "Press \"End Session & Pay\". The final bill (rental + accessories + food) appears automatically.",
          "Apply a discount/voucher if any, choose the payment method, press Pay. It can be split (part cash, part QRIS) or saved as \"pay later\".",
          "Print the receipt.",
        ],
      },
      {
        title: "5. After payment — everything records itself",
        steps: [
          "The bookkeeping (journal) is created automatically and visible under Transactions → Detail.",
          "Cash payments automatically count toward the current shift's cash.",
          "Members automatically earn points and may move up a tier.",
          "The sales figure immediately appears on the Overview dashboard, in Reports, and in the Income Statement.",
        ],
      },
      {
        title: "6. End of day — close the shift",
        steps: [
          "The cashier counts the drawer by denomination, checks non-cash app balances, and closes the shift.",
          "Any difference is shown after closing and kept in Shift History.",
        ],
      },
    ],
    notes: [
      "For rentals customers TAKE HOME, the flow is different — see the Home Rental topic.",
      "Nothing is entered twice: one transaction in PS Rental flows automatically to Kitchen, Shift, Transactions, Reports, and Accounting.",
    ],
  },
];
