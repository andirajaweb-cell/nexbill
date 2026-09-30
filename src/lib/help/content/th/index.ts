import type { HelpBook } from "../../types";
import { MULAI } from "./mulai";
import { PERAN } from "./peran";
import { OPERASIONAL } from "./operasional";
import { PENJUALAN } from "./penjualan";
import { INVENTORI } from "./inventori";
import { KEUANGAN } from "./keuangan";
import { SISTEM } from "./sistem";
import { BANTUAN } from "./bantuan";

export const HELP_BOOK_TH: HelpBook = {
  groups: {
    mulai: "เริ่มที่นี่",
    peran: "คู่มือตามบทบาท",
    operasional: "งานประจำวัน",
    penjualan: "การขายและลูกค้า",
    inventori: "คลังสินค้าและสินทรัพย์",
    keuangan: "การเงินและบัญชี",
    sistem: "การจัดการและระบบ",
    bantuan: "ความช่วยเหลือและอภิธานศัพท์",
  },
  categories: [...MULAI, ...PERAN, ...OPERASIONAL, ...PENJUALAN, ...INVENTORI, ...KEUANGAN, ...SISTEM, ...BANTUAN],
};
