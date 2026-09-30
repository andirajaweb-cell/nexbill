import type { HelpBook } from "../../types";
import { MULAI } from "./mulai";
import { PERAN } from "./peran";
import { OPERASIONAL } from "./operasional";
import { PENJUALAN } from "./penjualan";
import { INVENTORI } from "./inventori";
import { KEUANGAN } from "./keuangan";
import { SISTEM } from "./sistem";
import { BANTUAN } from "./bantuan";

export const HELP_BOOK_VI: HelpBook = {
  groups: {
    mulai: "Bắt đầu tại đây",
    peran: "Hướng dẫn theo vai trò",
    operasional: "Vận hành hằng ngày",
    penjualan: "Bán hàng & Khách hàng",
    inventori: "Kho hàng & Tài sản",
    keuangan: "Tài chính & Kế toán",
    sistem: "Quản lý & Hệ thống",
    bantuan: "Trợ giúp & Thuật ngữ",
  },
  categories: [...MULAI, ...PERAN, ...OPERASIONAL, ...PENJUALAN, ...INVENTORI, ...KEUANGAN, ...SISTEM, ...BANTUAN],
};
