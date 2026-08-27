import { createClient } from "@libsql/client";
const c = createClient({ url: "file:./data/pos-rental.db" });
(async () => {
  const outlets = await c.execute("SELECT id, name FROM outlets");
  const staff = await c.execute("SELECT id, name, email FROM staff_users");
  console.log("OUTLETS:", JSON.stringify(outlets.rows, null, 2));
  console.log("STAFF:", JSON.stringify(staff.rows, null, 2));
  console.log("Does browser outletId exist?", outlets.rows.some(o => o.id === "de135119-5416-44b0-8075-cc0e63ea5824"));
  console.log("Does browser staffUserId exist?", staff.rows.some(s => s.id === "daa6b207-74b5-4f68-9909-53a0deb45bf3"));
})();
