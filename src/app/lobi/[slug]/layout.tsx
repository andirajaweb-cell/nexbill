import type { Metadata } from "next";

/** Papan lobi untuk layar TV/monitor di outlet — tidak perlu diindeks mesin pencari. */
export const metadata: Metadata = {
  title: "Papan Unit — NEXBILL",
  robots: { index: false, follow: false },
};

export default function LobbyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
