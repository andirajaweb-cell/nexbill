import type { PageGuideBook } from "./page-guides";

export const PAGE_GUIDES_EN: PageGuideBook = {
  ui: {"guidePrefix": "Guide", "open": "Open", "close": "Close", "steps": "Steps", "tips": "Keep in mind"},
  pages: {
    rental: {
      summary: "The main screen for console rental: start sessions, watch the time, add F&B to the bill, then take payment.",
      steps: [
        "In the Quick Start panel, pick an available unit, set a duration (or open play) or choose a promo package, then start the session.",
        "While they play, add food, drinks or accessories to the bill, and extend the time if the customer asks.",
        "Click End Session & Pay, then choose the payment method. One bill can be paid with several methods (split).",
        "If the customer pays later, close the payment window — the bill can still be settled in the Cashier (POS).",
      ],
      tips: [
        "Units with a zero rate are billed zero. Set rates first with the Set Rates for All Units button.",
        "TVs or smart plugs switch on and off with each session once the unit is linked in Device Control.",
        "Mark broken or serviced units with Set Maintenance so they aren't used and don't appear in online booking.",
      ],
    },
    pos: {
      summary: "Sell food, drinks and other products. Unpaid rental bills are also settled here.",
      steps: [
        "Search products by name or scan a barcode (a phone camera works), then tap the product to add it to the cart.",
        "Enter a discount or voucher code if any, then choose the payment method.",
        "Click Pay, then Print Receipt if the customer wants one.",
        "Open Orders lists unpaid bills, including rental sessions closed with \"pay later\".",
      ],
      tips: [
        "No menu yet? Use Quick Add Menu (name + price). Stock, cost price and barcode can be completed later in Inventory.",
        "For many products at once, use Import Products from Excel in Inventory.",
        "QRIS and bank transfer payments go to your outlet's own QRIS and bank account, set in the Payments menu.",
      ],
    },
    booking: {
      summary: "Record reservations from phone/WhatsApp, receive online bookings, and check customers in when they arrive.",
      steps: [
        "Share the online booking link with the Share Booking Link button so customers can book by themselves.",
        "For phone/WA orders, fill in New Booking (name, phone, unit or \"any unit\", time, optional deposit), or click an empty slot on the Booking Map.",
        "When the customer arrives, type their booking code (e.g. BK-00001) in Find & Check-in.",
        "Confirm, move unit, cancel or mark no-show from the booking details.",
      ],
      tips: [
        "Clashing schedules go to the waiting list automatically and move up when the slot frees.",
        "Bookings not checked in are released automatically after the time limit set in Settings.",
        "Online booking can be paused in Settings when the outlet is full.",
      ],
    },
    inventory: {
      summary: "Your product and stock list. Sales, purchases and stock adjustments are posted to accounting automatically.",
      steps: [
        "Add products in the Products tab (name, category, selling price, opening stock), or Import Products from Excel for many at once.",
        "Record supplier purchases in the Supplier Purchases tab — stock goes up and the cost price is updated.",
        "Set Minimum Stock to get low-stock alerts. When a product has a Main Supplier, a draft Purchase Order is created automatically.",
        "Count physical stock regularly in the Stock Opname tab.",
      ],
      tips: [
        "Prepared food is set up in the Recipe / BOM tab, so its ingredients are deducted when it sells.",
        "Turn on \"Send to Kitchen Display\" only for items the kitchen makes, not packaged ready-to-sell goods.",
        "Record damaged or expired goods with an Adjustment using the Damaged / Waste reason, not by deleting the product.",
      ],
    },
    membership: {
      summary: "Customer data, loyalty points and member cards that bring customers back.",
      steps: [
        "In the Membership Tier tab, create a free tier (reached from total spending) or a paid tier (a member card sold at the cashier).",
        "Fill in the automatic benefits: play-rate discount (%) and points multiplier. The system applies them itself.",
        "In the Customer tab, add customers, then pick a name to see their history, sell or renew a member card, and redeem points.",
        "Fill the Reward tab so points can be redeemed, and the Voucher tab for discount codes.",
      ],
      tips: [
        "Manual benefits (free play, free F&B, etc.) only show as a reminder on the cashier screen; the cashier gives them.",
        "Points are added for every completed transaction under the customer's name, so select the customer during the transaction.",
        "Customers can be given a Member Card QR, so the cashier just scans it in Rental PS.",
      ],
    },
    promo: {
      summary: "Fixed-price packages for a set duration, for example 3 hours of PS4 at a special price.",
      steps: [
        "Enter the package name, choose the console (or all consoles), the duration in minutes and the package price.",
        "Optional: add a food/drink bundle. Bundle items go on the bill at zero price when the package is used.",
        "Save. The cashier can pick the package right away when starting a session in Rental PS.",
      ],
      tips: [
        "Package ideas: \"Night Package 3 Hours\" (180 minutes) or \"Play 2 Hours + Iced Tea\".",
        "Packages are also used by the AI agent when replying to customer chats.",
        "Just deactivate packages that are no longer offered so their history is kept.",
      ],
    },
    reports: {
      summary: "Operational reports by period. Choose a period, then open the tab you need.",
      steps: [
        "Choose the period at the top of the tab (e.g. today, this month or custom dates); the report reloads right away.",
        "Sales: total revenue, daily trend and revenue by payment method.",
        "Rental: number of sessions, average duration and revenue per PS unit to see which units sell best.",
        "Inventory & COGS for margin per product and low stock; Customers for top customers; Expenses for spending by category.",
      ],
      tips: [
        "For a daily check, total revenue, revenue per PS unit and low stock are enough.",
        "The official profit figure is in Accounting › Profit & Loss. The Sales tab shows how the two reconcile.",
        "The Financial Health tab shows the outlet's margins, liquidity and break-even target progress.",
      ],
    },
  },
};
