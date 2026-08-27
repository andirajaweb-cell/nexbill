import { createClient } from "@libsql/client";
const c = createClient({ url: "file:./data/pos-rental.db" });
c.execute("PRAGMA table_info(shifts)").then(r => console.log(JSON.stringify(r.rows, null, 2)));
