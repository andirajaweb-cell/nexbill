import type { HelpCategory } from "../../types";

export const BANTUAN: HelpCategory[] = [
  {
    id: "masalah-umum",
    group: "bantuan",
    label: "Common Problems & Solutions",
    summary:
      "The issues outlets run into most often, with steps to fix them. Try these before contacting Customer Service.",
    subsections: [
      {
        title: "Can't log in",
        steps: [
          "\"Account is active on another device\": log out on the previous device first, wait 30 minutes, or ask the Owner to press \"Sign out\" in Staff & Permissions.",
          "Forgot password: press \"Forgot password\" on the login page and open the link in your email (check the Spam folder too).",
          "Account deactivated: ask the Owner/Manager to reactivate it.",
        ],
      },
      {
        title: "TV doesn't turn on/off automatically",
        steps: [
          "Check the device status in Device Control. If offline: make sure the cashier PC running NexbillAgent is on and connected to the internet.",
          "Android TV: make sure the TV and cashier PC are on the same WiFi and the TV's IP hasn't changed (lock the IP as in the NexbillAgent Guide). See the 28 common problems (codes P01–P28) in the Complete NexbillAgent Guide.",
          "All Tuya smart plugs suddenly unresponsive: the Tuya Cloud Trial has probably expired — extend it at iot.tuya.com. If the outlet has several Tuya accounts, check Settings → Tuya Cloud API Integration: the account showing \"Not connected\" is the one to extend.",
          "Non-Android TV: it must use a smart plug. Press \"See Recommended Smart Plugs\" in Device Control.",
          "Until it's fixed, turn the TV on manually with the remote — rental sessions keep running normally.",
        ],
      },
      {
        title: "Controller not detected in the Gamepad Tester",
        steps: [
          "Use Chrome or Edge, plug in the controller, then press any button once.",
          "PS3 controllers on Windows need the DsHidMini driver (download button on the Gamepad Tester page). Clone PS3 controllers are often still not detected.",
          "Try another USB cable — many cheap cables only charge and don't carry data.",
        ],
      },
      {
        title: "Cash difference at shift close",
        steps: [
          "Check for small expenses not yet recorded (parking, water) — record them via Expense → Quick Cash Out.",
          "Check for money taken by the owner/deposited but not recorded as a Cash Deposit.",
          "Check the Transactions menu for payments that should be QRIS/transfer but were recorded as cash (or the other way round).",
          "Check for wrong change and \"pay later\" bills that were actually paid in cash.",
          "Write the likely cause in the shift note so the owner can follow up.",
        ],
      },
      {
        title: "Forgot to close a shift / can't open a shift",
        steps: [
          "Only one shift may be open per outlet (unless allowed in Preferences). If the previous cashier forgot to close, a supervisor can close that shift: count the drawer and write the reason.",
          "Then open a new shift as usual.",
        ],
      },
      {
        title: "Stock is negative or doesn't match",
        steps: [
          "Purchased stock must be recorded via Supplier Purchase/Purchase Order, not just put on the shelf.",
          "Prepared items: make sure the recipe is right — ingredient stock goes down, not the item's stock.",
          "Do a Stock Count to match system stock with physical stock.",
        ],
      },
      {
        title: "Profit looks too high",
        steps: [
          "Most likely some products have an empty Cost Price. Fill it in at Inventory → Products; the Income Statement page also shows a warning.",
          "Make sure routine expenses (electricity, salaries, rent) are recorded and asset depreciation has been run for the month.",
        ],
      },
      {
        title: "Receipt doesn't print / is cut off",
        steps: [
          "Make sure the printer is on, the paper is loaded, and the printer is selected in the browser's print dialog.",
          "Set the paper width (58mm/80mm) in Settings → Business & Tax → Printer, then \"Save for This Computer\".",
        ],
      },
      {
        title: "QRIS payment not confirmed yet",
        steps: [
          "Check the outlet's bank/QRIS app — make sure the money really arrived (don't rely only on a transfer screenshot from the customer).",
          "Once it's in, press \"Mark Received\" and enter the reference number.",
        ],
      },
      {
        title: "The button I need is missing",
        steps: [
          "Your role may not have permission. Permanent delete, redeem points, and permission settings are Superuser only.",
          "The module may be switched off — check Settings → Feature Management (Superuser).",
          "Still confused? Send a screenshot via Customer Service.",
        ],
      },
      {
        title: "Can't record a journal in last month",
        steps: [
          "That month has been closed in Accounting → Close Period. Record the correction with today's date, or ask the Owner/Accountant to reopen the period only if truly necessary.",
        ],
      },
    ],
    notes: ["Still not solved? Open Customer Service, explain what you've already tried, and attach a photo/video of the screen."],
  },
  {
    id: "kamus-istilah",
    group: "bantuan",
    label: "Glossary",
    summary: "Short, everyday explanations of terms you'll see often in NEXBILL.",
    subsections: [
      {
        title: "Operations",
        steps: [
          "Session — one rental on one unit, from Start to End Session.",
          "Unit / Station / Booth — one PlayStation + TV set that is rented out.",
          "Package — a fixed price for a set duration (e.g. 3 hours Rp45,000).",
          "Add Time — adding play time to a running session.",
          "DP (down payment) — a partial payment at the start.",
          "Booking / Reservation — reserving a unit for a certain time. Waiting List = queue when times clash. No-show = the customer didn't come.",
          "F&B — food & beverage.",
          "KDS / Kitchen Display — the kitchen's order screen.",
          "Split payment — one bill paid with more than one method.",
          "Void — cancelling a transaction entered by mistake. Refund — returning money to the customer.",
        ],
      },
      {
        title: "Cashier & shifts",
        steps: [
          "Shift — the period one cashier is responsible for the cash drawer.",
          "Starting cash — the cash in the drawer when the shift opens.",
          "Expected cash — the cash that should be in the drawer according to the transaction records.",
          "Difference — the physical count minus expected cash. Negative = cash short.",
          "Cash deposit — drawer cash handed to the owner/safe/bank.",
          "Cash transfer — moving money between cash locations.",
          "Tracked balance — an e-wallet/deposit balance checked at every shift close.",
        ],
      },
      {
        title: "Stock",
        steps: [
          "SKU — a product's unique code.",
          "Cost Price / COGS — the cost of getting one sold product.",
          "Recipe / BOM — the list of ingredients for one menu item.",
          "PO (Purchase Order) — an order to a supplier.",
          "Stock count — counting physical stock and matching it to the system.",
          "Waste — damaged/discarded items.",
          "Weighted average / FIFO — ways to calculate cost price when purchase prices change.",
        ],
      },
      {
        title: "Finance & accounting",
        steps: [
          "Journal — the bookkeeping record of each transaction (debit and credit).",
          "COA (Chart of Accounts) — the list of bookkeeping accounts, e.g. Cash, Rental Revenue, Electricity Expense.",
          "Receivables (AR) — money customers still owe the outlet.",
          "Payables (AP) — money the outlet still owes suppliers.",
          "Income Statement — revenue minus costs over a period.",
          "Balance Sheet — the position of assets, liabilities, and equity on one date.",
          "Cash Flow — money actually coming in and going out.",
          "Opening balance — the financial position when you start using NEXBILL.",
          "Close period — locking a month so its reports can't change again.",
          "Break-even / sales target — the minimum revenue so the business doesn't lose money.",
          "Cost center — a group of costs per business area.",
        ],
      },
      {
        title: "Assets",
        steps: [
          "Fixed asset — a capital item used for more than a year (PS, TV, chairs).",
          "Acquisition cost — the purchase price of an asset including shipping/installation.",
          "Useful life — the estimated time an asset will be used (months).",
          "Salvage value — the estimated selling price of an asset when its useful life ends.",
          "Depreciation — the monthly reduction in an asset's value due to use.",
          "Book value — acquisition cost minus total depreciation.",
          "Disposal — an asset is sold, broken beyond repair, or lost.",
        ],
      },
      {
        title: "Devices & system",
        steps: [
          "NexbillAgent — a small app on the cashier PC that controls Android TVs.",
          "Smart plug — a smart socket that switches a TV's power on/off remotely.",
          "Relay Agent / token — the link and secret key between NEXBILL and NexbillAgent.",
          "TV Screensaver — the promo display on Android TVs when a unit isn't in use.",
          "Drift — a controller stick moving by itself without being touched.",
          "Superuser — the highest account, able to configure everything including role permissions.",
          "Feature Management — where extra modules are turned on/off.",
        ],
      },
    ],
  },
];
