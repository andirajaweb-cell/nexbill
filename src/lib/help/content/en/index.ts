import type { HelpBook } from "../../types";
import { MULAI } from "./mulai";
import { PERAN } from "./peran";
import { OPERASIONAL } from "./operasional";
import { PENJUALAN } from "./penjualan";
import { INVENTORI } from "./inventori";
import { KEUANGAN } from "./keuangan";
import { SISTEM } from "./sistem";
import { BANTUAN } from "./bantuan";

export const HELP_BOOK_EN: HelpBook = {
  groups: {
    mulai: "Start Here",
    peran: "Role Guides",
    operasional: "Daily Operations",
    penjualan: "Sales & Customers",
    inventori: "Inventory & Assets",
    keuangan: "Finance & Accounting",
    sistem: "Management & System",
    bantuan: "Help & Glossary",
  },
  categories: [...MULAI, ...PERAN, ...OPERASIONAL, ...PENJUALAN, ...INVENTORI, ...KEUANGAN, ...SISTEM, ...BANTUAN],
};
