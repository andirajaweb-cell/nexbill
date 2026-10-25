"use client";
import { useState } from "react";
import { whatsappLink } from "@/lib/booking/public-profile-core";

/**
 * Bagian profil publik di /book/[slug] (data dari /api/public/outlet-profile): galeri foto outlet,
 * tombol WhatsApp untuk setiap admin, peta + petunjuk arah, dan cabang lain milik pemilik yang sama.
 */

export interface PublicContact {
  label: string;
  phone: string;
}
export interface PublicProfile {
  photos: { id: string; url: string; caption: string | null }[];
  contacts: PublicContact[];
  location: { hasPin: boolean; directionsUrl: string | null; embedUrl: string | null };
  branches: { name: string; slug: string; address: string | null; city: string | null; photoUrl: string | null; contacts: PublicContact[]; directionsUrl: string | null }[];
}

const WA_GREETING = "Halo, saya mau tanya soal booking PS.";

/** Small brand-accurate WhatsApp glyph — lucide-react only ships generic icons, not brand marks, so this is an inline SVG rather than a new dependency for one icon. */
export function WhatsAppIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.004 3C9.377 3 4 8.373 4 15c0 2.34.657 4.527 1.797 6.39L4 29l7.86-1.75A11.93 11.93 0 0 0 16.004 27C22.63 27 28 21.627 28 15S22.63 3 16.004 3Zm0 21.75a9.7 9.7 0 0 1-4.95-1.36l-.355-.21-4.664 1.04 1.02-4.55-.232-.37A9.7 9.7 0 0 1 5.25 15c0-5.93 4.82-10.75 10.754-10.75S26.75 9.07 26.75 15 21.938 24.75 16.004 24.75Zm5.62-7.77c-.307-.154-1.817-.897-2.1-1-.283-.103-.489-.154-.695.154-.205.308-.797 1-.977 1.205-.18.205-.36.23-.667.077-.307-.154-1.296-.478-2.47-1.524-.913-.814-1.53-1.82-1.71-2.128-.18-.308-.02-.474.135-.627.138-.138.307-.36.46-.54.154-.18.205-.308.308-.513.103-.205.051-.385-.026-.539-.077-.154-.695-1.677-.953-2.296-.25-.6-.505-.52-.695-.53l-.593-.01c-.205 0-.539.077-.82.385-.283.308-1.08 1.056-1.08 2.578s1.106 2.99 1.26 3.196c.154.205 2.176 3.322 5.27 4.658.736.318 1.31.508 1.758.65.738.235 1.41.202 1.94.123.592-.088 1.817-.743 2.073-1.46.256-.717.256-1.332.18-1.46-.077-.128-.283-.205-.59-.36Z" />
    </svg>
  );
}

function PinIcon({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}

function contactLabel(c: PublicContact, i: number, total: number) {
  if (c.label) return c.label;
  return total > 1 ? `Admin ${i + 1}` : "WhatsApp";
}

/** Tombol di header: satu admin → langsung ke WA; beberapa admin → menu pilihan admin. Plus tombol arah. */
export function HeaderContactButtons({ profile, fallbackPhone }: { profile: PublicProfile | null; fallbackPhone: string | null }) {
  const [open, setOpen] = useState(false);
  const contacts = profile?.contacts?.length ? profile.contacts : fallbackPhone ? [{ label: "", phone: fallbackPhone }] : [];
  const directions = profile?.location.directionsUrl ?? null;
  const btn = "flex items-center gap-1.5 rounded-lg border border-blue-500/20 px-2.5 py-1.5 text-sm font-medium text-blue-200 hover:border-blue-400/50 hover:text-blue-100";
  return (
    <div className="ml-auto flex items-center gap-2">
      {directions && (
        <a href={directions} target="_blank" rel="noreferrer" className={btn} aria-label="Petunjuk arah">
          <PinIcon size={16} className="text-sky-300" />
          <span className="hidden sm:inline">Arah</span>
        </a>
      )}
      {contacts.length === 1 && whatsappLink(contacts[0].phone, WA_GREETING) && (
        <a href={whatsappLink(contacts[0].phone, WA_GREETING)!} target="_blank" rel="noreferrer" className={btn}>
          <WhatsAppIcon size={18} className="text-emerald-400" />
          <span className="hidden sm:inline">Hubungi via WA</span>
        </a>
      )}
      {contacts.length > 1 && (
        <div className="relative">
          <button type="button" className={btn} onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            <WhatsAppIcon size={18} className="text-emerald-400" />
            <span className="hidden sm:inline">Hubungi via WA</span>
            <span className="rounded-full bg-emerald-500/20 px-1.5 text-[10px] text-emerald-200">{contacts.length}</span>
          </button>
          {open && (
            <div className="absolute right-0 z-20 mt-2 w-60 overflow-hidden rounded-xl border border-blue-500/20 bg-[#0a1020] shadow-xl">
              {contacts.map((c, i) => {
                const href = whatsappLink(c.phone, WA_GREETING);
                return href ? (
                  <a key={`${c.phone}-${i}`} href={href} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-3 py-2.5 text-sm text-neutral-100 hover:bg-white/5" onClick={() => setOpen(false)}>
                    <WhatsAppIcon size={16} className="text-emerald-400" />
                    <span className="truncate">{contactLabel(c, i, contacts.length)}</span>
                  </a>
                ) : null;
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Galeri foto outlet: strip geser + tampilan besar saat diklik. */
export function PhotoGallery({ photos, outletName }: { photos: PublicProfile["photos"]; outletName: string }) {
  const [active, setActive] = useState<number | null>(null);
  if (!photos.length) return null;
  const cur = active !== null ? photos[active] : null;
  return (
    <section>
      <div className="flex snap-x gap-3 overflow-x-auto pb-2">
        {photos.map((p, i) => (
          <button key={p.id} type="button" onClick={() => setActive(i)} className="relative shrink-0 snap-start overflow-hidden rounded-xl border border-blue-500/15">
            <img src={p.url} alt={p.caption ?? `Foto ${outletName} ${i + 1}`} loading={i > 1 ? "lazy" : "eager"} className="h-40 w-64 object-cover sm:h-48 sm:w-80" />
            {p.caption && <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 py-2 text-left text-xs text-white">{p.caption}</span>}
          </button>
        ))}
      </div>
      {cur && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" onClick={() => setActive(null)}>
          <img src={cur.url} alt={cur.caption ?? outletName} className="max-h-[85vh] max-w-full rounded-lg object-contain" />
          {photos.length > 1 && (
            <>
              <button type="button" aria-label="Sebelumnya" className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-2xl text-white" onClick={(e) => { e.stopPropagation(); setActive((active! - 1 + photos.length) % photos.length); }}>‹</button>
              <button type="button" aria-label="Berikutnya" className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-2xl text-white" onClick={(e) => { e.stopPropagation(); setActive((active! + 1) % photos.length); }}>›</button>
            </>
          )}
          {cur.caption && <p className="absolute bottom-6 left-0 right-0 text-center text-sm text-white">{cur.caption}</p>}
        </div>
      )}
    </section>
  );
}

/** Lokasi & kontak: peta (bila ada titik lokasi), tombol petunjuk arah, dan semua admin WhatsApp. */
export function ContactLocationSection({ profile, address, fallbackPhone, cardCls, titleCls }: { profile: PublicProfile | null; address: string | null; fallbackPhone: string | null; cardCls: string; titleCls: string }) {
  const contacts = profile?.contacts?.length ? profile.contacts : fallbackPhone ? [{ label: "", phone: fallbackPhone }] : [];
  const loc = profile?.location;
  if (!contacts.length && !loc?.directionsUrl) return null;
  return (
    <section className={`${cardCls} overflow-hidden`}>
      <div className="grid md:grid-cols-2">
        {loc?.embedUrl ? (
          <iframe title="Peta lokasi" src={loc.embedUrl} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="h-56 w-full border-0 md:h-full md:min-h-[240px]" />
        ) : null}
        <div className={`space-y-3 p-4 ${loc?.embedUrl ? "" : "md:col-span-2"}`}>
          <h2 className={titleCls}>Lokasi & Kontak</h2>
          {address && <p className="text-sm text-[#93a2c4]">{address}</p>}
          {loc?.directionsUrl && (
            <a href={loc.directionsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg bg-sky-500/90 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500">
              <PinIcon size={16} /> Petunjuk arah
            </a>
          )}
          {contacts.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {contacts.map((c, i) => {
                const href = whatsappLink(c.phone, WA_GREETING);
                return href ? (
                  <a key={`${c.phone}-${i}`} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/20">
                    <WhatsAppIcon size={16} className="text-emerald-400" /> {contactLabel(c, i, contacts.length)}
                  </a>
                ) : null;
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** Cabang lain milik pemilik yang sama — foto, alamat, booking, arah, WhatsApp. */
export function BranchesSection({ branches, cardCls, titleCls }: { branches: PublicProfile["branches"]; cardCls: string; titleCls: string }) {
  if (!branches.length) return null;
  return (
    <section>
      <h2 className={`${titleCls} mb-3`}>Cabang Lainnya</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {branches.map((b) => {
          return (
            <div key={b.slug} className={`${cardCls} overflow-hidden`}>
              {b.photoUrl ? (
                <img src={b.photoUrl} alt={b.name} loading="lazy" className="h-32 w-full object-cover" />
              ) : (
                <div className="flex h-32 items-center justify-center bg-[#0a1020] text-3xl font-bold text-blue-400/60">{b.name.trim().charAt(0).toUpperCase()}</div>
              )}
              <div className="space-y-2 p-3">
                <div className="font-semibold">{b.name}</div>
                {(b.address || b.city) && <p className="text-xs text-[#93a2c4]">{[b.address, b.city].filter(Boolean).join(", ")}</p>}
                <div className="flex flex-wrap gap-2 text-xs">
                  <a href={`/book/${b.slug}`} className="rounded-lg bg-blue-500/90 px-3 py-1.5 font-semibold text-white hover:bg-blue-500">Booking di sini</a>
                  {b.directionsUrl && (
                    <a href={b.directionsUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-sky-400/30 px-2.5 py-1.5 text-sky-200 hover:bg-sky-500/10">
                      <PinIcon size={13} /> Arah
                    </a>
                  )}
                </div>
                {b.contacts.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {b.contacts.slice(0, 3).map((c, i) => {
                      const href = whatsappLink(c.phone, WA_GREETING);
                      return href ? (
                        <a key={`${c.phone}-${i}`} href={href} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 px-2.5 py-1.5 text-emerald-200 hover:bg-emerald-500/10">
                          <WhatsAppIcon size={13} className="text-emerald-400" /> {contactLabel(c, i, b.contacts.length)}
                        </a>
                      ) : null;
                    })}
                    {b.contacts.length > 3 && (
                      <a href={`/book/${b.slug}`} className="px-1.5 py-1.5 text-[#93a2c4] underline">+{b.contacts.length - 3} admin</a>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
