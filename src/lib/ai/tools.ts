import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db/client";
import { rentalUnits, products, promos, orders, orderItems, chatThreads } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const toolDefinitions: Anthropic.Tool[] = [
  {
    name: "check_rental_availability",
    description:
      "Cek ketersediaan bilik/unit PS (PS3/PS4/PS5) saat ini — mana yang kosong, mana yang lagi dipakai, dan tarif per jam.",
    input_schema: {
      type: "object",
      properties: {
        consoleType: {
          type: "string",
          enum: ["ps2", "ps3", "ps4", "ps5", "ps4_pro", "ps5_slim", "ps6", "wii", "xbox", "driving_simulator", "any"],
          description: "Filter jenis konsol, atau 'any' untuk semua.",
        },
      },
    },
  },
  {
    name: "get_menu",
    description: "Ambil daftar menu makanan & minuman beserta harga dan stok tersedia.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["food", "drink", "snack", "device_rental", "other"],
        },
      },
    },
  },
  {
    name: "get_active_promos",
    description: "Ambil daftar paket promo rental / diskon yang sedang aktif.",
    input_schema: { type: "object", properties: {} },
  },
  {
    name: "create_preorder",
    description:
      "Buat pre-order (makanan/minuman/voucher) untuk pelanggan yang chat via WhatsApp/Instagram, supaya sudah siap saat pelanggan datang ke outlet. Bayar tetap dilakukan di kasir/lewat link pembayaran terpisah.",
    input_schema: {
      type: "object",
      properties: {
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              productName: { type: "string" },
              qty: { type: "number" },
            },
            required: ["productName", "qty"],
          },
        },
        customerName: { type: "string" },
      },
      required: ["items"],
    },
  },
  {
    name: "request_human_handoff",
    description:
      "Alihkan percakapan ke staf manusia — gunakan ini untuk komplain, refund, kerusakan alat, atau pertanyaan yang di luar kemampuanmu.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string" },
      },
      required: ["reason"],
    },
  },
];

interface AgentToolInput {
  consoleType?: string;
  category?: string;
  items?: { productName: string; qty: number }[];
  customerName?: string;
  reason?: string;
}

export async function executeTool(name: string, rawInput: unknown, threadId: string, outletId: string): Promise<string> {
  const input = (rawInput && typeof rawInput === "object" ? rawInput : {}) as AgentToolInput;
  switch (name) {
    case "check_rental_availability": {
      const rows = await db.select().from(rentalUnits).where(and(eq(rentalUnits.outletId, outletId), eq(rentalUnits.isActive, true)));
      const filtered =
        input.consoleType && input.consoleType !== "any"
          ? rows.filter((r) => r.consoleType === input.consoleType)
          : rows;
      return JSON.stringify(
        filtered.map((r) => ({
          name: r.name,
          consoleType: r.consoleType,
          tvType: r.tvType,
          status: r.status,
          hourlyRate: r.hourlyRate,
        }))
      );
    }

    case "get_menu": {
      const rows = await db.select().from(products).where(and(eq(products.outletId, outletId), eq(products.isActive, true)));
      const filtered = input.category ? rows.filter((r) => r.category === input.category) : rows;
      return JSON.stringify(
        filtered.map((r) => ({ name: r.name, category: r.category, price: r.price, stock: r.stockQty }))
      );
    }

    case "get_active_promos": {
      const rows = await db.select().from(promos).where(and(eq(promos.outletId, outletId), eq(promos.isActive, true)));
      return JSON.stringify(rows.map((p) => ({ name: p.name, type: p.type, description: p.description, consoleType: p.consoleType, durationMinutes: p.durationMinutes, packagePrice: p.packagePrice, discountPercent: p.discountPercent, discountAmount: p.discountAmount, validUntil: p.validUntil })));
    }

    case "create_preorder": {
      const [thread] = await db.select().from(chatThreads).where(eq(chatThreads.id, threadId)).limit(1);
      const allProducts = await db.select().from(products).where(and(eq(products.outletId, outletId), eq(products.isActive, true)));

      let subtotal = 0;
      const lineItems: { productId?: string; description: string; qty: number; unitPrice: number; lineTotal: number }[] = [];

      for (const item of input.items ?? []) {
        const product = allProducts.find((p) => p.name.toLowerCase().includes(item.productName.toLowerCase()));
        const unitPrice = product?.price ?? 0;
        const lineTotal = unitPrice * item.qty;
        subtotal += lineTotal;
        lineItems.push({
          productId: product?.id,
          description: product?.name ?? item.productName,
          qty: item.qty,
          unitPrice,
          lineTotal,
        });
      }

      const [order] = await db
        .insert(orders)
        .values({
          outletId,
          customerId: thread?.customerId ?? null,
          status: "open",
          subtotal,
          total: subtotal,
          source: "ai_agent",
        })
        .returning();

      for (const li of lineItems) {
        await db.insert(orderItems).values({ orderId: order.id, ...li });
      }

      return JSON.stringify({ orderId: order.id, subtotal, items: lineItems });
    }

    case "request_human_handoff": {
      await db.update(chatThreads).set({ aiEnabled: false }).where(eq(chatThreads.id, threadId));
      return JSON.stringify({ ok: true, message: "Percakapan dialihkan ke staf." });
    }

    default:
      return JSON.stringify({ error: `Unknown tool ${name}` });
  }
}

/** Outlet bot Instagram: env IG_AGENT_OUTLET_ID, cadangan outlet pertama (perilaku lama). */
export async function agentOutletId(): Promise<string | null> {
  if (process.env.IG_AGENT_OUTLET_ID) return process.env.IG_AGENT_OUTLET_ID;
  const { outlets } = await import("@/db/schema");
  const [row] = await db.select({ id: outlets.id }).from(outlets).limit(1);
  return row?.id ?? null;
}
