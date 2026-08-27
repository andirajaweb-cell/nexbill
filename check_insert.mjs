import { createClient } from "@libsql/client";
const c = createClient({ url: "file:./data/pos-rental.db" });
c.execute({
  sql: `insert into "shifts" ("id","outlet_id","staff_user_id","opened_at","closed_at","opening_cash","expected_cash","actual_cash","variance","non_cash_variance_total","status","notes") values (?,?,?,?,null,?,null,null,null,null,?,null) returning "id"`,
  args: ["test-id-12345", "de135119-5416-44b0-8075-cc0e63ea5824", "daa6b207-74b5-4f68-9909-53a0deb45bf3", new Date().toISOString(), 1000000, "open"]
}).then(r => console.log("SUCCESS:", JSON.stringify(r.rows))).catch(e => console.log("ERROR:", e.message, "\n\nFULL:", JSON.stringify(e, Object.getOwnPropertyNames(e))));
