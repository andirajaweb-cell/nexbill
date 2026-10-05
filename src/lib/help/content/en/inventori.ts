import type { HelpCategory } from "../../types";

export const INVENTORI: HelpCategory[] = [
  {
    id: "inventory",
    group: "inventori",
    label: "Inventory Control (Products, Recipes, Suppliers, Stock)",
    summary:
      "Manage the products you sell, recipes for prepared items, suppliers, stock purchases, purchase orders (PO), and physical stock counts. Every change in stock and cost price goes into the books automatically.",
    subsections: [
      {
        title: "Products",
        steps: [
          "Add manually: name, category, selling price, Cost Price, starting stock, unit, minimum stock, and main supplier (optional).",
          "Barcode: fill it in when adding/editing a product — type it, shoot it with a USB/Bluetooth scanner, or tap the camera icon to scan from a phone/laptop. One barcode belongs to one active product only. The same barcode is read straight away at the Cashier. The Camera scan button above the product list finds a product by its barcode; if it isn't registered yet, the barcode is filled into the Add New Product form. Scan buttons are also in Recipe/BOM, Supplier Purchases, and Purchase Orders to pick a product.",
          "Add many at once: download the Excel template, fill it in, then upload. Rows with an existing SKU update that product (stock doesn't change via upload).",
          "Product categories and units (pcs, gram, etc.) are set in Settings → Product Categories and Settings → Units.",
          "Changing stock without a purchase (damaged, lost, miscounted): use Stock Adjustment — Add, Reduce (reason Difference or Damaged/Waste), or Set to a specific quantity.",
          "Stock bought from a supplier shouldn't go through Stock Adjustment — use Supplier Purchase or Purchase Order so the Cost Price is calculated.",
        ],
        notes: [
          "Cost Price must be filled in. Without it, reports treat product sales as pure profit and the Income Statement is too high.",
          "Deleting a product (Superuser only) doesn't delete its sales history.",
        ],
      },
      {
        title: "Recipe / BOM (prepared items)",
        steps: [
          "Choose to create a new product or use an existing food product.",
          "Enter the recipe name and yield (portions per batch), then add ingredients: raw-material product, quantity, and unit.",
          "Save. The cost per portion is calculated automatically from the ingredients. Every time the item sells, INGREDIENT stock goes down.",
        ],
        notes: ["One product can only have one recipe."],
      },
      {
        title: "Suppliers",
        steps: [
          "Add a supplier: name, phone, address, and payment terms (days).",
          "Suppliers with transactions can't be deleted — archive them instead so they don't appear in new choices; their history stays intact.",
        ],
      },
      {
        title: "Supplier Purchase (buy stock directly)",
        steps: [
          "Choose the supplier, enter products, quantities, and purchase prices.",
          "Add transport/parking/other costs if any — they're spread automatically across the products so the Cost Price reflects the real cost.",
          "Tick \"Paid in cash now\" if paid; leave it unticked to record it as a payable to the supplier.",
          "The cost method (Weighted average or FIFO — first in, first out) is chosen in this tab. If unsure, use Weighted average (default). LIFO isn't available because Indonesian accounting and tax standards don't allow it.",
        ],
      },
      {
        title: "Purchase Order (orders to suppliers)",
        steps: [
          "\"Products Needing Restock\" lists products below their minimum — press \"+ Add to PO form\".",
          "\"Check & Create Automatic PO\" creates draft POs for all below-minimum products that have a main supplier. Drafts still need to be reviewed and sent manually.",
          "Create a PO manually: choose the supplier, enter products, quantities, and prices, press Create PO.",
          "When goods arrive, press Receive Goods: stock increases and a bill (payable) to the supplier is created automatically.",
        ],
      },
      {
        title: "Stock Count (physical count)",
        steps: [
          "Count the stock on the shelf/in storage and enter the results next to the system figure — differences show immediately. Save as a draft.",
          "Scan to count: tap \"Scan to count\" (camera) or shoot a scanner into the search box — every scan adds 1 to that product's count. Numbers can still be corrected manually.",
          "Open the draft to review the difference per product.",
          "Press Apply Adjustment: surpluses are recorded as adjustments, shortages as waste. It can't be applied twice.",
        ],
      },
    ],
    notes: ["Most actions on this page (upload, add product/recipe, PO, stock count) are for Owners and Managers only."],
    roles: "Owner, Superuser, Manager.",
  },
  {
    id: "assets",
    group: "inventori",
    label: "Fixed Assets (PS Units, TVs, Controllers, Furniture)",
    summary:
      "The list of the outlet's capital items (PlayStations, TVs, controllers, furniture, vehicles) with automatic monthly depreciation, asset purchases, repairs, and disposals (sold/broken/lost). The list can be filtered, downloaded to Excel, and filled in by uploading Excel.",
    subsections: [
      {
        title: "Asset List — viewing & filtering",
        steps: [
          "Search by name, notes, or PS unit name. Filter by category, status (Active, Maintenance, Disposed, or all except disposed), linked to a PS unit or not, and acquisition date range.",
          "Below the filters you see how many assets match, with total acquisition cost, accumulated depreciation, and book value.",
          "Press Download Excel to download the list matching the active filters (with a TOTAL row).",
        ],
      },
      {
        title: "Adding assets",
        steps: [
          "One asset: press \"+ New Asset\" — enter name, category, linked PS unit (optional), acquisition cost, salvage value, useful life (months), supplier, and how it was paid (cash/bank or recorded as payable).",
          "Several assets at once, shipping/installation costs, down payments, or assets you already owned: use the Asset Purchases tab.",
          "Many assets from Excel: press Upload Excel → download the template → fill it in → choose the recording method (Opening balance for assets already owned, Paid from cash/bank, or Recorded as payable) → Check File → Save.",
          "On upload, the file is checked first: incorrect rows are shown with the reason, and nothing is saved until every row is correct. Rows with the same date become one Asset Purchase document.",
        ],
        notes: [
          "Salvage value = estimated selling price when the useful life ends. Example useful lives: PS 36 months, TV 60 months, controller 12 months.",
          "Uploaded by mistake? Cancel the document from the Asset Purchases tab (as long as its assets haven't been depreciated or disposed).",
        ],
      },
      {
        title: "Asset Purchases",
        steps: [
          "One purchase document can contain several items. Qty 3 automatically becomes 3 numbered assets (#1, #2, #3).",
          "Shipping/installation costs are spread into each item's acquisition cost.",
          "Payment options: paid in full, payable, down payment (DP), or opening balance. Asset purchase payables appear in Accounting → Payables and can be paid in installments.",
          "A purchase can be cancelled as long as none of its assets has been depreciated or disposed.",
        ],
      },
      {
        title: "Repairs & disposal",
        steps: [
          "+ Maintenance on an active asset: enter the description and cost, tick \"Create Expense\" so the cost is recorded as an expense.",
          "Dispose Asset (sold, broken beyond repair, lost): enter the sale proceeds (0 if none), the receiving cash/bank account, and the reason. The gain/loss on disposal is calculated automatically.",
        ],
      },
      {
        title: "Depreciation (monthly)",
        steps: [
          "Open the Depreciation tab, choose the month, check the estimated total, then press Run Depreciation.",
          "Safe to press repeatedly: months already processed or fully depreciated assets are skipped automatically.",
          "Depreciation History shows all depreciation recorded so far.",
        ],
      },
    ],
    roles: "View & download: any staff who can open this page. Add, upload, repair, dispose, depreciate: Owner, Superuser, Manager, Accountant.",
  },
  {
    id: "maintenance",
    group: "inventori",
    label: "Maintenance (Repair Tickets)",
    summary:
      "Track repairs of TVs, consoles, controllers, and other equipment from drop-off to done, so no damage is forgotten and repair costs are recorded.",
    subsections: [
      {
        title: "Creating & processing tickets",
        steps: [
          "Press \"+ Add Maintenance\": choose the asset, describe the damage and cost, tick \"Create Expense\" if the cost should be recorded as an expense.",
          "A new ticket has status \"In Maintenance\" and its asset is automatically marked Maintenance.",
          "Press \"Start Process\" when repair begins, then \"Mark Done\" when finished — the asset returns to Active if no other ticket is open.",
          "Tickets can be edited any time. The cost is locked once an expense has been created (change it in the Expense menu). Tickets with an expense can't be deleted.",
        ],
      },
      {
        title: "Summary per category",
        steps: ["The cards at the top show, per category (PlayStation, TV, Controller, etc.): available units versus total, and those under repair."],
      },
    ],
    notes: [
      "Not sure whether a controller is faulty? Check it first with the Controller Doctor (Gamepad Tester) — there's a link on this page.",
    ],
    roles: "Owner, Superuser, Manager, Accountant.",
  },
  {
    id: "dokter-stik",
    group: "inventori",
    label: "Controller Doctor (Gamepad Tester) & PS3 Controller Driver",
    navHint: "Maintenance → Gamepad Tester",
    summary:
      "Test PS3, PS4, and PS5 controllers right in the browser: dead buttons, analog sticks moving by themselves (drift), stick balance, and trigger pressure — resulting in a health score, damage analysis, and service recommendations.",
    subsections: [
      {
        title: "Testing a controller",
        steps: [
          "Open this page in Google Chrome or Microsoft Edge on a PC/laptop.",
          "Plug the controller in with a USB cable (PS4/PS5 can also use Bluetooth), then press any button once — the browser only detects a controller after a button is pressed.",
          "A rising tone = controller connected, a falling tone = disconnected. Sound can be turned off with the \"Sound: On\" button. If you hear nothing, click once on the page first (a browser rule).",
          "Press every button and move both sticks: the indicators light up for whatever you press.",
          "In the \"Guided check (Controller Doctor)\" section press Start Check, then follow the on-screen instructions: put the controller on the table without touching it during the countdown, rotate both sticks fully, and pull L2/R2 slowly all the way. At the end you get a health score, findings, likely causes, and recommendations — which can be printed or saved as PDF.",
        ],
      },
      {
        title: "PS3 controller not detected on Windows",
        steps: [
          "This isn't a faulty controller: Windows has no built-in driver for PS3 controllers, so the buttons aren't passed to the browser.",
          "Download the DsHidMini driver with the button on this page, install it, then plug the controller in again.",
          "The driver is only guaranteed for ORIGINAL Sony PS3 controllers. Many clone PS3 controllers are still not detected even with the driver installed.",
          "Without installing a driver: open this page in Chrome on an Android phone and connect the PS3 controller with an OTG cable.",
        ],
      },
    ],
    notes: [
      "Results are read directly from the controller hardware, not simulated.",
      "This tool doesn't read DualSense gyro/adaptive triggers or control vibration — it's for button and stick function only.",
      "Controllers with poor results: create a Maintenance ticket so it's recorded and not rented to customers.",
    ],
  },
];
