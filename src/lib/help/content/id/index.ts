import type { HelpBook } from "../../types";
import { MULAI } from "./mulai";
import { PERAN } from "./peran";
import { OPERASIONAL } from "./operasional";
import { PENJUALAN } from "./penjualan";
import { INVENTORI } from "./inventori";
import { KEUANGAN } from "./keuangan";
import { SISTEM } from "./sistem";
import { BANTUAN } from "./bantuan";

/** Bahasa Indonesia — sumber utama. Bahasa lain wajib mengikuti id kategori & strukturnya. */
export const HELP_BOOK_ID: HelpBook = {
  groups: {
    mulai: "Mulai di Sini",
    peran: "Panduan per Peran",
    operasional: "Operasional Harian",
    penjualan: "Penjualan & Pelanggan",
    inventori: "Inventori & Aset",
    keuangan: "Keuangan & Akuntansi",
    sistem: "Manajemen & Sistem",
    bantuan: "Bantuan & Istilah",
  },
  categories: [...MULAI, ...PERAN, ...OPERASIONAL, ...PENJUALAN, ...INVENTORI, ...KEUANGAN, ...SISTEM, ...BANTUAN],
};
