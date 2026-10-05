import type { HelpCategory } from "../../types";

export const OPERASIONAL: HelpCategory[] = [
  {
    id: "sop-harian",
    group: "operasional",
    label: "Daily SOP (Opening–Closing Checklist)",
    summary:
      "The same daily work checklist for every staff member, whatever their schedule — from opening to handover. Print it and stick it on the cashier desk if useful.",
    subsections: [
      {
        title: "Opening checklist",
        steps: [
          "Check every PS unit turns on normally, controllers are complete and working, TVs are clear. Suspicious controllers: check them with the Controller Doctor (Maintenance → Gamepad Tester).",
          "If you use automatic TV control, make sure devices show \"online\" on the Device Control page and the cashier PC running NexbillAgent is on.",
          "Check the receipt printer is on and has enough paper.",
          "Open Booking — see today's reservations.",
          "Open Notifications (bell icon) — low stock, expenses awaiting approval, announcements from NEXBILL.",
          "Open a new Shift with Starting Cash matching the money actually in the drawer.",
        ],
      },
      {
        title: "During opening hours",
        steps: [
          "Customers without a booking → start a session from PS Rental. With a booking → check in with the booking code.",
          "Food/drinks for customers who are playing → +F&B on their session card. Buyers who aren't playing → through Cashier (POS).",
          "Watch the Live Billing Board for sessions about to end and offer extensions before time runs out.",
          "Small expenses → record right away in Expense → Quick Cash Out.",
          "Broken unit/controller → take it out of rental (Set Maintenance) and create a ticket in the Maintenance menu.",
          "Need to cancel a transaction but lack permission → request it via Staff & Permissions → Approval; don't find workarounds.",
        ],
      },
      {
        title: "Closing / end-of-shift checklist",
        steps: [
          "End every session whose customer has left and settle the payment.",
          "Count the drawer by denomination in the Close Shift form — don't peek at the system figure first.",
          "Enter the balance shown in each non-cash app (QRIS/e-wallet) at that moment.",
          "Close the shift; write the cause of any difference in the note.",
          "Switch off unused TVs and units, tidy controllers and accessories, lock the drawer.",
        ],
      },
      {
        title: "Handover to the next shift / manager",
        steps: [
          "Pass on: unpaid \"pay later\" bills (check in Transactions), low stock, problem units/devices (make sure there's a Maintenance ticket), and any cash difference.",
          "Tell the authorized person about approval requests still waiting.",
        ],
      },
    ],
    notes: ["Details of each feature mentioned here are in their own topics (PS Rental, Cashier, Shift & Cashier, etc.)."],
  },
  {
    id: "ringkasan",
    group: "operasional",
    label: "Overview Dashboard (Home Page)",
    navHint: "The top menu in the sidebar — the page that opens after logging in.",
    summary:
      "The main monitoring screen: today's revenue and profit, number of transactions, PS unit status, cash position, busy vs quiet hours chart, most productive units, best-selling products, and low stock — all on one page.",
    subsections: [
      {
        title: "Reading the number cards",
        steps: [
          "Today's Break-even Target: the monthly target from Settings divided evenly per day — shows the percentage reached or the shortfall.",
          "Revenue & Profit: today's total revenue (rental, food/drinks, other products), today's expenses, gross profit, and estimated net profit.",
          "Transactions & Customers: number of valid transactions (same as the Transactions page), customers today, new members, and bookings today.",
          "PS Unit Status: how many units are in use, available, booked, under maintenance, and the utilization rate in percent.",
          "Cash & Finance: today's cash in and out, cash balance, bank balance, receivables (unpaid customer bills), and payables to suppliers.",
        ],
      },
      {
        title: "Busy vs Quiet Hours chart",
        steps: [
          "Shows the average number of transactions per day for each hour, based on the last 30 days.",
          "Green bar = busiest hour, yellow bar = quietest hour within operating hours. Grey bars = outside operating hours (only occasional transactions) and are not rated.",
          "Hover/tap a bar to see that hour's average per day and 30-day total.",
          "Use it to plan staff per hour and create special quiet-hour promos.",
        ],
      },
      {
        title: "Lists at the bottom",
        steps: [
          "Revenue per PS Unit (today) and the most productive unit.",
          "Today's Best-Selling Products and Most Played Games (enter the game name when starting a session so this list fills up).",
          "Low Stock: products below their minimum stock.",
          "Revenue Reconciliation: compares revenue by transaction date with revenue in the Income Statement — if there's a difference, check Accounting → Reconciliation.",
        ],
      },
    ],
    notes: [
      "\"Today\" is calculated in the outlet's time zone (e.g. WIB), not the server's.",
      "Profit on this page is a daily estimate. For official monthly figures, use Accounting → Income Statement.",
    ],
  },
  {
    id: "rental-ps",
    group: "operasional",
    label: "PS Rental (Play On Site)",
    summary:
      "The core page for starting, managing, and finishing PlayStation rental sessions per unit — including adding time, moving units, adding food/accessories, TV control, and payment.",
    subsections: [
      {
        title: "Starting a new session",
        steps: [
          "In the \"NEW SESSION\" panel, pick a free unit (units in use or under repair don't appear).",
          "Choose a Package (fixed price from Promos & Packages) or Hourly. For Hourly, pick a duration (e.g. 60 minutes) or \"Open\" (time runs until stopped).",
          "Enter the customer: Non-Member (type any name) or Member (type name/phone and pick from the results — member prices & points apply automatically).",
          "Optional: enter the game being played, and tick \"Customer Pays Upfront (DP)\" if the customer pays at the start.",
          "Press START SESSION. If the unit is linked to TV control, the TV turns on and switches to the PlayStation by itself.",
        ],
      },
      {
        title: "While a session is running",
        steps: [
          "Each unit shows as a card with a countdown and running cost breakdown.",
          "Pause/Resume: temporarily stops the timer (e.g. power cut, customer steps out).",
          "Add Time: add +10 to +120 minutes.",
          "Move Unit: move the session to another free unit — time and bill move with it.",
          "+ Accessories: rent an extra controller/VR/headset, charged per hour from when it's added. Press \"Return\" to stop charging.",
          "+ F&B: add food/drinks to this session's bill — the order goes straight to the Kitchen Display.",
          "TV On / TV Off: switch this unit's TV on/off (requires a device linked in Device Control).",
        ],
      },
      {
        title: "Ending the session & taking payment",
        steps: [
          "Press \"End Session & Pay\". The final bill appears: rental + accessories + food/drinks.",
          "Optional: enter a Discount, tick Tax, or enter a customer voucher/reward code.",
          "Enter the amount paid (default: the full balance), choose the payment method, press Pay.",
          "Cash is settled immediately. QRIS/transfer/e-wallet: the customer pays to the outlet QRIS/account shown on screen, then press \"Mark Received\" once the money arrives and enter the reference number if any.",
          "You can pay part with one method and the rest with another (split payment).",
          "Customer will pay later? Press \"Close (pay later at POS)\" — the bill is saved and can be settled from Cashier (POS) or Transactions.",
          "Print the receipt from the finished session card.",
        ],
      },
      {
        title: "Managing PS units",
        steps: [
          "Press \"Manage Units\" to add/edit units: name, console, TV type, hourly rate.",
          "Set Maintenance: take a unit out of rental temporarily (not possible while it's in use).",
          "Deactivate: archive a unit you no longer use — its history is kept.",
          "Units whose hours of use pass the service limit (set in Settings → Notifications → Predictive Unit Maintenance) get a \"needs service\" badge.",
        ],
      },
    ],
    notes: [
      "Sessions with a set duration stop automatically when time runs out — but the cashier still has to complete the payment.",
      "An alarm sounds once when 5 minutes are left.",
      "All logged-in staff can start and finish sessions.",
    ],
  },
  {
    id: "billing-board",
    group: "operasional",
    label: "Live Billing Board (Monitor Screen)",
    summary:
      "A dedicated screen to watch every running session live — ideal on a second TV/monitor at the cashier area. View only, no action buttons.",
    steps: [
      "Open Live Billing Board on the extra screen and leave it open.",
      "The page refreshes every 3 seconds.",
      "Each card shows: unit name & console, playing/paused status, customer & game, elapsed time, extensions, and cost breakdown.",
      "Summary boxes at the top: active sessions, playing vs paused, food orders in progress, and total running bill.",
    ],
    notes: ["All actions (pay, add time, etc.) are still done on the PS Rental page."],
  },
  {
    id: "booking",
    group: "operasional",
    label: "Booking (Reservations)",
    summary:
      "Manage advance reservations — record bookings, accept online bookings from customers, check in quickly with a code, move units, and mark no-shows.",
    subsections: [
      {
        title: "Recording a new booking",
        steps: [
          "Enter the customer's name and phone number.",
          "Choose a specific unit, or \"Any unit\" + console type.",
          "Enter the start and end time, optional down payment (DP) and note, then press \"Create Booking\".",
          "If the time clashes, the booking automatically goes to the Waiting List and its position is shown.",
          "Booking Map (default view): one row per unit, hours from 08:00 to 08:00 next day, red line = now. Block colour = status. Click a block for details & actions; click an empty spot to fill the booking form with that unit and time.",
        ],
      },
      {
        title: "Online booking by customers",
        steps: [
          "Turn on \"accept online bookings\" and copy the outlet's booking page link in Settings → Business & Tax → Booking / Reservation.",
          "Share the link on WhatsApp, Instagram, or Google Maps. Customers see free units, pick a time, and get a booking code.",
          "Set the gap between bookings, the check-in deadline (no-shows are released automatically), and the minimum time before play that booking is allowed.",
          "Promo banners on the booking page are set in Settings → Ad Banners.",
          "As soon as a customer books online or via WhatsApp, a \"New booking received!\" pop-up appears on any dashboard page (with a sound): Confirm, View on Booking Map, or WhatsApp the customer.",
        ],
      },
      {
        title: "When the customer arrives & other actions",
        steps: [
          "Type the booking code (e.g. BK-00001) in the top search box → press Enter/\"Search & Check-in\".",
          "Confirm: approve a booking that is pending or on the waiting list.",
          "QR: show the booking's QR code to the customer.",
          "Move Unit: move the booking to another unit (reason optional).",
          "No-show: mark a customer who didn't come. Cancel: cancel the booking (reason required).",
        ],
      },
    ],
    notes: [
      "Automatic WhatsApp reminders to customers are currently not active — contact customers manually using the number on the booking if needed.",
      "The colored label shows where a booking came from: Cashier (recorded by staff), Online (booking page), or WhatsApp.",
    ],
    roles: "Record/confirm/check-in/cancel: Owner, Superuser, Manager, Supervisor, Cashier. Undoing a No-show: Owner/Superuser.",
  },
  {
    id: "pos",
    group: "operasional",
    label: "Cashier (POS) — Selling Food, Drinks & Goods",
    summary:
      "For selling products (food, drinks, goods) to buyers who aren't renting — or settling bills saved as \"pay later\". PS play time isn't sold here, but in PS Rental.",
    subsections: [
      {
        title: "Selling products",
        steps: [
          "Click a product in the list (grouped by category), or type the name/scan the barcode in the search box. If only one product matches, press Enter and it goes straight into the cart.",
          "No scanner device? Press \"Camera scan\" next to the search box and point the phone/laptop camera at the barcode — the product goes straight into the cart, several in a row. Member cards: scan their QR in Rental PS (Member mode) — the QR is in Membership → member details.",
          "Set quantities with the +/- buttons in the cart.",
          "Optional: enter a Discount, enter a voucher code (press Check), tick Tax/Service Charge.",
          "Choose the payment method and press Pay.",
          "Cash: take the money, press \"Confirm Cash Received\". QRIS/transfer: show the outlet QRIS/account on screen, wait for the money, then mark it received.",
          "Press Print Receipt.",
        ],
      },
      {
        title: "Open bills (Open Orders)",
        steps: [
          "Unpaid bills (e.g. from rental sessions saved as \"pay later\") appear under Open Orders.",
          "Split: divide one bill into several parts (e.g. friends paying separately).",
          "Merge: tick 2 or more bills and press \"Merge N Orders\" to pay them together.",
        ],
      },
    ],
    notes: [
      "The cart is saved in the browser — switching menus or refreshing doesn't lose it.",
      "Products in the \"Device Rental\" category don't appear here because they belong to Home Rental.",
      "Cashier manual discounts are limited by the owner's setting in Settings → Preferences.",
    ],
  },
  {
    id: "kitchen",
    group: "operasional",
    label: "Kitchen Display",
    summary:
      "A paperless kitchen order board: every food/drink order from the Cashier and from rental sessions shows here, in 4 columns by stage.",
    steps: [
      "New orders enter the New column with an alarm.",
      "Button order: Confirm → Start Cooking → Ready to Serve → Delivered (leaves the board).",
      "Orders in the New column can be cancelled with Cancel and a reason (e.g. \"Out of ingredients\").",
      "The 🔊/🔇 button turns sound on/off. \"Enable Browser Notifications\" keeps orders appearing when the screen is on another app.",
    ],
    notes: [
      "The board refreshes automatically every few seconds.",
      "Orders that just became \"Ready\" play a different sound so waiters know to deliver them.",
      "See also \"I'm Kitchen Staff\" in the Role Guides group.",
    ],
  },
  {
    id: "shift",
    group: "operasional",
    label: "Shift & Cashier (Cash Drawer)",
    summary:
      "Open a shift with starting cash, record cash deposits or transfers, then close the shift by counting cash per denomination. The system compares your count with the transaction records so any cash difference shows immediately.",
    subsections: [
      {
        title: "Opening a shift",
        steps: [
          "First count the cash in the drawer now, enter it as Starting Cash, then press Open Shift.",
          "If it differs from the cash the previous shift left, the system asks for a reason (e.g. \"owner took Rp100,000 for shopping\") and flags it for review.",
          "By default only one shift may be open per outlet, so every difference clearly belongs to someone. Outlets with several drawers can allow multiple shifts in Settings → Preferences.",
        ],
      },
      {
        title: "During the shift",
        steps: [
          "All cash payments (rental, cashier, PPOB, membership, other income) automatically count toward the open shift's cash.",
          "Record Cash Deposit: when drawer cash is handed to the owner, the safe, or deposited at the bank.",
          "Request Cash Transfer: when money moves between cash locations (e.g. extra float from the Main Cash to the drawer). Deposit and transfer history is kept on this page.",
        ],
      },
      {
        title: "Closing the shift",
        steps: [
          "Enter the number of notes/coins for each denomination — the total is calculated automatically. Don't look at the system figure first (\"blind\" count).",
          "Fill in Non-Cash Balance Check: open each e-wallet app or deposit balance used and enter the balance shown at that moment.",
          "Enter the cash left in the drawer for the next shift; the rest is treated as handed to the owner/safe.",
          "Add a note if there's a known difference, then press Close Shift.",
          "The Shift Closing Summary shows: Starting Cash, Cash In, Cash Out, Expected Cash (what should be there), your count, and the Difference. Red = short, yellow = over.",
          "Shift History can be filtered By Day, By Month (default: this month), or By Year — step through with ‹ › — plus staff and status filters (still open, with variance, flagged by anti-fraud). The summary above the table totals shifts, cash variance, and non-cash variance for the filter.",
        ],
      },
      {
        title: "Closing another cashier's shift",
        steps: [
          "If a cashier left without closing the shift, a supervisor can close it: physically count the drawer and write the reason (required).",
          "This closing is recorded under the person who closed it and flagged for review.",
        ],
      },
      {
        title: "Deposit balance channels (non-cash)",
        steps: [
          "The balances that must be checked at every shift close (e.g. PPOB Deposit Balance). The built-in channel can be renamed but not deleted.",
          "Add a new channel by typing its name and pressing \"Add Channel\" — its bookkeeping account is created automatically.",
        ],
        notes: ["This section is only visible to Owner, Superuser, and Accountant."],
      },
    ],
    notes: [
      "Shifts whose difference or number of voids/refunds exceeds the threshold (Settings → Preferences) are flagged for Owner/Manager review automatically. The cashier can still close the shift.",
      "The suggested Starting Cash comes from the cash accounts ticked in Settings → Preferences → Shift Starting Cash Composition. It's only a suggestion — always enter the physical cash.",
    ],
  },
  {
    id: "devices",
    group: "operasional",
    label: "Device Control (TVs & Smart Plugs)",
    summary:
      "Turn TVs and consoles on/off from the dashboard, and let TVs switch on/off by themselves following the sessions. Android TVs are controlled through the NexbillAgent app on the cashier PC; regular TVs (analog or non-Android smart TVs) through a smart plug.",
    subsections: [
      {
        title: "Choosing the right control method",
        steps: [
          "Android TV / Google TV → use NexbillAgent (no extra hardware). The TV can turn on, off, and switch to the PlayStation HDMI automatically.",
          "Analog/tube TVs, regular digital TVs, and non-Android smart TVs (Viva OS, Hisense OS, webOS, etc.) → need a smart plug that cuts/restores their power.",
          "If the outlet has units with non-Android TVs not yet linked to a smart plug, this page shows a warning and a \"See Recommended Smart Plugs\" button leading to suitable products.",
        ],
      },
      {
        title: "Android TV via NexbillAgent (5 steps, once per outlet)",
        steps: [
          "Step 1 — Request Token: press \"Request Relay Agent Token\". The NEXBILL team replies with a secret token via the Customer Service menu.",
          "Step 2 — Download NexbillAgent and extract it on the cashier PC (Windows). Read the \"Complete NexbillAgent Guide\" — available in 6 languages, covering PC & TV setup, how to lock the TV's IP, and 28 common problems with solutions.",
          "Step 3 — Run NexbillAgent and paste the token.",
          "Step 4 — Prepare each TV (once per TV): connect it to the same WiFi, enable the options the guide asks for, lock its IP.",
          "Step 5 — Add the TV on this page (enter the TV's IP) and link it to its rental unit.",
        ],
      },
      {
        title: "Smart plugs",
        steps: [
          "Official NEXBILL smart plug: enter the serial number printed on the label in the \"Claim NEXBILL Smart Plug\" section — no other setup needed.",
          "Tasmota: enter the device name and MQTT topic.",
          "Tuya / Smart Life: each outlet uses its own Tuya Cloud API accounts — more than one is allowed. Add an account (Access ID & Secret) in Settings → Business & Tax → Tuya Cloud API Integration, then add devices with their Device ID. With several accounts, leave the account choice on \"Automatic\": the system finds the account that owns that Device ID.",
          "After adding, link the device to a unit in the \"Link Devices to Rental Units\" table.",
        ],
        notes: [
          "A free Tuya Cloud account (Trial) can only control about 8 devices and must be extended about once a month at iot.tuya.com (Service API → IoT Core → Extend Trial). Have more smart plugs than that? Create a second Tuya Cloud account (different email), link some smart plugs to it, then add it as a new account in Settings. If one account isn't extended, every smart plug on that account stops responding — put each account's extension date in your calendar.",
          "During the subscription trial, smart plugs can't be added yet and Android TV control is limited to 1 unit.",
        ],
      },
      {
        title: "Everyday use",
        steps: [
          "All staff can press Turn On/Turn Off on a device card, or TV On/TV Off on a PS Rental session card.",
          "Each device's online/offline status is shown on this page. Offline devices can still be switched on manually with the remote.",
          "With the latest NexbillAgent, the TV switches to the PlayStation automatically when a session starts and to the TV Screensaver when it ends (see the TV Screensaver topic).",
        ],
      },
    ],
    roles: "Turning on/off: all staff. Adding/editing/deleting/linking devices: Owner, Superuser, Manager, Supervisor.",
  },
  {
    id: "qr-pelanggan",
    group: "operasional",
    label: "Booth Customer QR & Time Alerts on TV",
    navHint: "PS Rental → Manage Units → Customer QR",
    summary:
      "Every booth gets a QR sticker. Customers scan it with their phone to see time left and the estimated bill, order food/drinks, request more time, or call the cashier — without walking to the counter. Every request lands in the Customer Requests panel on PS Rental and only takes effect once a cashier accepts it. Android TVs can also show a time-left warning and a Time's Up screen.",
    subsections: [
      {
        title: "Putting the QR in the booth",
        steps: [
          "Open PS Rental → Manage Units → press \"Customer QR\" on a unit. The QR is created automatically.",
          "Press \"Print stickers for all units\" to print every unit's QR at once, cut them out, and stick one next to each booth's TV.",
          "Set the permissions in the same window: allow F&B orders from phones, allow time-extension requests from phones. Calling the cashier is always on.",
          "If a QR is photographed and misused, press \"Replace QR\" — the old sticker stops working immediately; print the new one.",
        ],
      },
      {
        title: "What customers can do from their phone",
        steps: [
          "See the play time left (ticking every second) and the running estimated bill. A warning appears when 5 minutes or less are left.",
          "Order food/drinks: pick items, set quantities, send. Prices come from the product data, never from the phone.",
          "Request more time: +30/+60/+90/+120 minutes, with an estimated cost.",
          "Call the cashier: request the bill, controller problem, need help, or other (with an optional note). Each request's status shows on the phone: waiting, accepted, or rejected with the reason.",
        ],
      },
      {
        title: "Responding to requests (cashier)",
        steps: [
          "New requests appear in the \"Customer Requests (Booth QR)\" panel at the top of PS Rental, with a sound.",
          "F&B order: press \"Accept & add to bill\" — the items go onto the session bill and straight to the Kitchen Display.",
          "More time: press \"Accept & add time\" — the session duration increases. Call cashier: go to the booth, then press \"Handled\".",
          "Press \"Reject\" when it can't be served (e.g. sold out); the reason you enter shows on the customer's phone.",
        ],
      },
      {
        title: "Time-left warning & Time's Up screen on TV",
        navHint: "Settings → TV Screensaver → Time Alerts & Time's Up Screen",
        steps: [
          "Only for Android TVs whose automation is active and verified (NexbillAgent v1.2).",
          "Time-left warning (off by default): a few minutes before the end, the TV briefly switches to a big \"TIME LEFT\" screen with the booth QR, then returns to the PlayStation HDMI by itself. Set the minutes and how long it shows.",
          "\"TIME'S UP\" screen: after a session stops automatically and the bill is unpaid, the TV invites the customer to pay at the cashier (no amounts shown), until paid or for 15 minutes.",
          "The warning is sent once per session and applies again after time is added.",
        ],
      },
    ],
    notes: [
      "Requests from phones never change the bill by themselves — the cashier decides. Orders for a session that has already ended can't be accepted; serve them through the Cashier instead.",
      "The phone page never shows the customer's name or number, and uses the language of the outlet's Country.",
      "TV warnings and automatic session stops depend on the NEXBILL scheduler running on the server.",
    ],
    roles: "Any logged-in staff can respond to requests and show/print QRs. Changing QR permissions and TV alert settings: Owner, Superuser, Manager.",
  },
  {
    id: "tv-screensaver",
    group: "operasional",
    label: "TV Screensaver (Booth Promo Screen)",
    navHint: "Settings → TV Screensaver (turn the module on first in Settings → Feature Management).",
    summary:
      "When a unit isn't in use, the booth's Android TV shows the outlet name, prices, booking QR, clock, and unit status (AVAILABLE / time left) — and staff can unlock it with a PIN. Android TV only; analog and non-Android smart TVs aren't supported.",
    subsections: [
      {
        title: "Setting up the display",
        steps: [
          "Enter a big Title (e.g. \"Want to Play?\"), a console line (e.g. \"PS5 • PS4 • PS3\"), a price line (e.g. \"From Rp5,000/hour\"), and an extra line (promo, opening hours).",
          "Set how many idle minutes before the screen appears.",
          "Choose what to show: clock & date, unit status, booking QR, and WiFi name (the WiFi password is never shown).",
          "Set a Staff PIN so only staff can close the screen. Without a PIN, anyone pressing the remote can close it.",
          "Night Mode: dim the screen at certain hours (max 90% — the screen is never fully black so nobody thinks the TV is off).",
        ],
      },
      {
        title: "Installing the screen on a TV",
        steps: [
          "In \"Installed Screens\", add a screen: give it a name and pick the rental unit (Android TV) — a 6-digit code appears.",
          "On the TV, open the browser and go to nexbill.id/tv.",
          "Enter the 6-digit code with the remote's number keys. The screen connects to that unit right away.",
          "Repeat for each TV. A screen without a unit can be used for branding only (e.g. a TV in the waiting area).",
        ],
      },
    ],
    notes: [
      "The content drifts slowly so the TV panel doesn't get permanent burn-in.",
      "If the internet drops briefly, the screen keeps showing the last view and keeps trying to reconnect.",
      "Electricity: a TV left on adds roughly Rp25,000–50,000 per TV per month. Use Night Mode or switch TVs off outside opening hours.",
    ],
  },
  {
    id: "home-rental",
    group: "operasional",
    label: "Home Rental (Take-Home Rentals)",
    navHint: "Appears in the sidebar once the module is turned on in Settings → Feature Management (Superuser only).",
    summary:
      "A separate module for renting PS, Playbox, TVs, and accessories that customers TAKE HOME — from booking, handover with a deposit, to return with a condition check and customer rating.",
    subsections: [
      {
        title: "Setting up (once at the start)",
        steps: [
          "Policy tab: set deposits, late fees, delivery fees by distance, damage rules, the return checklist, and the rules printed on the receipt/rental agreement.",
          "Product Catalog tab: set rates per 12 hours, per day, per extra day, and per week for each product.",
          "Assets tab: register each physical item with its code (e.g. PS5-001). Asset statuses: Available, Reserved, Preparing, Rented Out, Out for Delivery, Returning, Inspection, Damaged, Missing, Repair, Retired.",
          "Packages tab: bundle several products into one package (e.g. PS4 + 32\" TV).",
        ],
      },
      {
        title: "Creating a booking & handover (checkout)",
        steps: [
          "Booking tab → create a booking: pick the customer, product/package, start date and planned return. Enter the distance from the store if delivered (leave empty for the flat delivery fee).",
          "For verification, record the customer's ID (national ID card, or a student card plus parent/guardian details for minors).",
          "Rates are calculated automatically: ≤12 hours, daily, 2–3 days (daily + extra days), 7 days or more uses the weekly rate.",
          "When the customer arrives/the item is delivered, do Checkout: assets are allocated, payment and deposit are recorded. Make sure the equipment checklist (HDMI cable, charger, controllers) has been checked.",
          "Date Map tab: click a date to see all bookings on that day.",
        ],
      },
      {
        title: "Returns",
        steps: [
          "Tick every item on the return checklist (required).",
          "Give a 1–5 star rating and a note on the item's condition/customer behavior.",
          "Any damage? Enter the damage cost — it's taken from the deposit first. If it exceeds the deposit, the rest is billed with the chosen payment method.",
          "Late? The late fee is calculated automatically according to the Policy.",
          "After the return, the asset becomes Available again and the deposit status is recorded: fully released, partly deducted, or forfeited.",
        ],
      },
      {
        title: "Risk & Approval",
        steps: [
          "See each customer's rental history and risk score (from ID completeness, confirmed address & active WhatsApp number, late returns, no-shows, damaged/missing items).",
          "High-risk bookings must be approved first — press Approve or Reject.",
          "Problem customers can be blacklisted.",
        ],
      },
    ],
    notes: [
      "All Home Rental revenue (rental, delivery, late fees, damage charges) is recorded in the books automatically and shown in Reports → Home Rental.",
      "Deposits are recorded separately from revenue until the item is returned.",
      "Automatic reminders to customers (pickup schedule, due date) aren't active yet — remind customers manually.",
    ],
  },
];
