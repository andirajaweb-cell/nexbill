import type { HelpBook } from "../../types";
import { MULAI } from "./mulai";
import { PERAN } from "./peran";
import { OPERASIONAL } from "./operasional";
import { PENJUALAN } from "./penjualan";
import { INVENTORI } from "./inventori";
import { KEUANGAN } from "./keuangan";
import { SISTEM } from "./sistem";
import { BANTUAN } from "./bantuan";

export const HELP_BOOK_FIL: HelpBook = {
  groups: {
    mulai: "Magsimula Rito",
    peran: "Gabay ayon sa Tungkulin",
    operasional: "Pang-araw-araw na Operasyon",
    penjualan: "Benta at Customer",
    inventori: "Imbentaryo at Asset",
    keuangan: "Pananalapi at Accounting",
    sistem: "Pamamahala at Sistema",
    bantuan: "Tulong at Glosaryo",
  },
  categories: [...MULAI, ...PERAN, ...OPERASIONAL, ...PENJUALAN, ...INVENTORI, ...KEUANGAN, ...SISTEM, ...BANTUAN],
};
