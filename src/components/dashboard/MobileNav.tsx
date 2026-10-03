"use client";
import { createContext, useContext, useState } from "react";

/**
 * Status buka/tutup menu samping (drawer) di layar < 1024px (ponsel & tablet portrait).
 * Tombol ☰ ada di TopBar, drawer-nya di Sidebar — keduanya berbagi status lewat context ini.
 */
const MobileNavContext = createContext<{ open: boolean; setOpen: (v: boolean) => void }>({
  open: false,
  setOpen: () => {},
});

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return <MobileNavContext.Provider value={{ open, setOpen }}>{children}</MobileNavContext.Provider>;
}

export function useMobileNav() {
  return useContext(MobileNavContext);
}
