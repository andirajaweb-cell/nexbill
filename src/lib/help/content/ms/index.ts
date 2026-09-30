import type { HelpBook } from "../../types";
import { MULAI } from "./mulai";
import { PERAN } from "./peran";
import { OPERASIONAL } from "./operasional";
import { PENJUALAN } from "./penjualan";
import { INVENTORI } from "./inventori";
import { KEUANGAN } from "./keuangan";
import { SISTEM } from "./sistem";
import { BANTUAN } from "./bantuan";

export const HELP_BOOK_MS: HelpBook = {
  groups: {
    mulai: "Mula di Sini",
    peran: "Panduan Peranan",
    operasional: "Operasi Harian",
    penjualan: "Jualan & Pelanggan",
    inventori: "Inventori & Aset",
    keuangan: "Kewangan & Perakaunan",
    sistem: "Pengurusan & Sistem",
    bantuan: "Bantuan & Istilah",
  },
  categories: [...MULAI, ...PERAN, ...OPERASIONAL, ...PENJUALAN, ...INVENTORI, ...KEUANGAN, ...SISTEM, ...BANTUAN],
};
