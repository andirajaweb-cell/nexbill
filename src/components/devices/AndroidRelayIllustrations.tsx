/**
 * Ilustrasi sederhana (SVG, tanpa teks bahasa tertentu kecuali perintah/angka) untuk panduan
 * "Relay Agent di HP Android". Dipakai di:
 *  - Kontrol Perangkat → Panduan Setup → TV → tab HP Android (android-relay-guide.tsx)
 *  - Pusat Bantuan → Kontrol Perangkat (AndroidRelayVisualGuide)
 *  - panduan cetak public/downloads/nexbill-agent/panduan-android.html (scripts/build-android-guide.tsx)
 * Gambar sengaja generik (bukan tangkapan layar / logo aplikasi pihak ketiga) supaya tetap benar
 * walau tampilan Termux atau merek HP berbeda.
 */

export type RelayIllustrationKind = "prepare" | "token" | "install" | "paste" | "language" | "tv" | "battery" | "done";

const C = {
  bg: "#0b1222",
  card: "#111a2e",
  line: "#22324f",
  dim: "#64748b",
  text: "#e2e8f0",
  cyan: "#38bdf8",
  green: "#34d399",
  amber: "#fbbf24",
  pink: "#f472b6",
  term: "#05080f",
};

function Phone({ x, y, w = 70, h = 128, children }: { x: number; y: number; w?: number; h?: number; children?: React.ReactNode }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx={12} fill="#1e293b" stroke="#334155" />
      <rect x={4} y={8} width={w - 8} height={h - 16} rx={7} fill={C.bg} />
      <rect x={w / 2 - 9} y={3} width={18} height={2.5} rx={1.25} fill="#475569" />
      <g transform="translate(4 8)">{children}</g>
    </g>
  );
}

export function RelayIllustration({ kind, className }: { kind: RelayIllustrationKind; className?: string }) {
  const common = { viewBox: "0 0 240 150", className, role: "img" as const, "aria-hidden": true, style: { width: "100%", height: "auto", display: "block" } };
  switch (kind) {
    case "prepare":
      return (
        <svg {...common}>
          <rect width="240" height="150" rx="14" fill={C.card} />
          <Phone x={85} y={11}>
            <rect x={8} y={14} width={46} height={10} rx={3} fill={C.line} />
            <rect x={8} y={30} width={30} height={6} rx={3} fill={C.line} />
            <text x={31} y={80} textAnchor="middle" fontSize="20" fill={C.green}>⚡</text>
          </Phone>
          {/* WiFi */}
          <g transform="translate(40 52)" fill="none" stroke={C.cyan} strokeWidth="4" strokeLinecap="round">
            <path d="M-18 0a26 26 0 0 1 36 0" />
            <path d="M-11 9a15 15 0 0 1 22 0" />
            <circle cx="0" cy="18" r="2.5" fill={C.cyan} stroke="none" />
          </g>
          {/* TV */}
          <g transform="translate(168 40)">
            <rect width="56" height="38" rx="4" fill="#0f172a" stroke={C.cyan} strokeWidth="2" />
            <rect x="22" y="40" width="12" height="6" fill="#334155" />
            <rect x="14" y="46" width="28" height="3" rx="1.5" fill="#334155" />
          </g>
          {/* charger cable */}
          <path d="M120 139 C120 146 150 146 160 140" stroke={C.amber} strokeWidth="3" fill="none" strokeLinecap="round" />
          <rect x="158" y="134" width="14" height="10" rx="2" fill={C.amber} />
        </svg>
      );
    case "token":
      return (
        <svg {...common}>
          <rect width="240" height="150" rx="14" fill={C.card} />
          <rect x="30" y="34" width="126" height="54" rx="12" fill="#13223d" stroke={C.line} />
          <path d="M52 88 l-6 14 l18 -14 z" fill="#13223d" />
          <rect x="44" y="48" width="70" height="7" rx="3.5" fill={C.dim} />
          <rect x="44" y="62" width="98" height="12" rx="4" fill={C.term} />
          <text x="50" y="71.5" fontSize="8" fontFamily="monospace" fill={C.green}>nbx_7F3k…92Qa</text>
          <g transform="translate(176 54)">
            <circle cx="14" cy="14" r="13" fill="none" stroke={C.amber} strokeWidth="5" />
            <rect x="24" y="11" width="30" height="6" rx="3" fill={C.amber} />
            <rect x="44" y="11" width="5" height="13" rx="2" fill={C.amber} />
            <rect x="36" y="11" width="5" height="10" rx="2" fill={C.amber} />
          </g>
          <rect x="62" y="110" width="116" height="22" rx="11" fill={C.cyan} />
          <rect x="82" y="118" width="76" height="6" rx="3" fill="#0b1222" opacity=".6" />
        </svg>
      );
    case "install":
      return (
        <svg {...common}>
          <rect width="240" height="150" rx="14" fill={C.card} />
          <Phone x={85} y={11}>
            {[0, 1].map((i) => (
              <g key={i} transform={`translate(${7 + i * 28} 18)`}>
                <rect width="22" height="22" rx="6" fill={C.term} stroke={i ? C.amber : C.green} strokeWidth="1.5" />
                <text x="11" y="15" textAnchor="middle" fontSize="9" fontFamily="monospace" fill={i ? C.amber : C.green}>{i ? "⏻" : ">_"}</text>
              </g>
            ))}
            <rect x="7" y="58" width="48" height="16" rx="8" fill={C.green} />
            <path d="M24 66 l5 4 l9 -8" stroke="#05080f" strokeWidth="2.5" fill="none" strokeLinecap="round" />
          </Phone>
          <g transform="translate(36 56)">
            <rect width="34" height="40" rx="5" fill="#13223d" stroke={C.line} />
            <path d="M17 10 v16 m-7 -7 l7 7 l7 -7" stroke={C.cyan} strokeWidth="3" fill="none" strokeLinecap="round" />
            <text x="17" y="36" textAnchor="middle" fontSize="7" fill={C.dim} fontFamily="monospace">APK</text>
          </g>
          <path d="M74 76 h8" stroke={C.dim} strokeWidth="2" strokeDasharray="3 3" />
          <g transform="translate(170 56)">
            <rect width="40" height="40" rx="10" fill="#13223d" stroke={C.line} />
            <path d="M12 21 l6 6 l11 -12" stroke={C.green} strokeWidth="4" fill="none" strokeLinecap="round" />
          </g>
        </svg>
      );
    case "paste":
      return (
        <svg {...common}>
          <rect width="240" height="150" rx="14" fill={C.card} />
          <rect x="18" y="18" width="204" height="114" rx="10" fill={C.term} stroke={C.line} />
          <circle cx="32" cy="30" r="3" fill="#ef4444" />
          <circle cx="42" cy="30" r="3" fill={C.amber} />
          <circle cx="52" cy="30" r="3" fill={C.green} />
          <text x="30" y="56" fontSize="9" fontFamily="monospace" fill={C.green}>$ <tspan fill={C.text}>pkg install -y curl &amp;&amp;</tspan></text>
          <text x="30" y="70" fontSize="9" fontFamily="monospace" fill={C.text}>  curl -fsSL nexbill.id/…/install.sh | bash</text>
          <text x="30" y="90" fontSize="9" fontFamily="monospace" fill={C.cyan}>[1/5] Node.js + adb …</text>
          <text x="30" y="104" fontSize="9" fontFamily="monospace" fill={C.cyan}>[2/5] NexbillAgent …</text>
          <rect x="30" y="112" width="7" height="11" fill={C.green} />
          <g transform="translate(160 92)">
            <rect width="52" height="22" rx="6" fill="#1e293b" stroke={C.line} />
            <text x="26" y="15" textAnchor="middle" fontSize="9" fill={C.text}>PASTE</text>
          </g>
        </svg>
      );
    case "language":
      return (
        <svg {...common}>
          <rect width="240" height="150" rx="14" fill={C.card} />
          <rect x="18" y="18" width="204" height="114" rx="10" fill={C.term} stroke={C.line} />
          {["1) Bahasa Indonesia", "2) English", "3) Bahasa Melayu", "4) ไทย  5) Filipino  6) Tiếng Việt"].map((l, i) => (
            <text key={i} x="30" y={40 + i * 13} fontSize="8.5" fontFamily="monospace" fill={i === 0 ? C.green : C.dim}>{l}</text>
          ))}
          <text x="30" y="98" fontSize="8.5" fontFamily="monospace" fill={C.amber}>Agent Token: <tspan fill={C.text}>nbx_7F3k…92Qa</tspan></text>
          <text x="30" y="118" fontSize="8.5" fontFamily="monospace" fill={C.green}>✓ Terhubung (1.3.0) …</text>
        </svg>
      );
    case "tv":
      return (
        <svg {...common}>
          <rect width="240" height="150" rx="14" fill={C.card} />
          <rect x="34" y="16" width="172" height="104" rx="8" fill="#0f172a" stroke="#334155" strokeWidth="3" />
          <rect x="108" y="122" width="24" height="8" fill="#334155" />
          <rect x="90" y="130" width="60" height="5" rx="2.5" fill="#334155" />
          <rect x="62" y="34" width="116" height="70" rx="8" fill="#1e293b" stroke={C.line} />
          <rect x="74" y="44" width="70" height="7" rx="3.5" fill={C.text} opacity=".85" />
          <rect x="74" y="56" width="92" height="5" rx="2.5" fill={C.dim} />
          <rect x="74" y="68" width="9" height="9" rx="2" fill={C.green} />
          <path d="M76 72.5 l2 2 l4 -4" stroke="#05080f" strokeWidth="1.6" fill="none" />
          <rect x="88" y="70" width="60" height="5" rx="2.5" fill={C.dim} />
          <rect x="126" y="84" width="42" height="13" rx="6.5" fill={C.green} />
          <rect x="80" y="84" width="40" height="13" rx="6.5" fill="none" stroke={C.dim} />
        </svg>
      );
    case "battery":
      return (
        <svg {...common}>
          <rect width="240" height="150" rx="14" fill={C.card} />
          <Phone x={85} y={11}>
            {[0, 1, 2].map((i) => (
              <g key={i} transform={`translate(6 ${16 + i * 22})`}>
                <circle cx="6" cy="6" r="5.5" fill="none" stroke={i === 0 ? C.green : C.dim} strokeWidth="2" />
                {i === 0 && <circle cx="6" cy="6" r="2.5" fill={C.green} />}
                <rect x="16" y="3" width={i === 0 ? 34 : 28} height="6" rx="3" fill={i === 0 ? C.text : C.line} />
              </g>
            ))}
            <rect x="10" y="88" width="42" height="14" rx="4" fill="#1e293b" stroke={C.line} />
            <rect x="14" y="92" width="30" height="6" rx="2" fill={C.green} />
          </Phone>
          {/* gembok di daftar aplikasi terbaru */}
          <g transform="translate(34 58)">
            <rect x="0" y="12" width="28" height="22" rx="4" fill={C.amber} />
            <path d="M6 12 v-5 a8 8 0 0 1 16 0 v5" stroke={C.amber} strokeWidth="4" fill="none" />
          </g>
          {/* baterai tak dibatasi */}
          <g transform="translate(172 60)">
            <rect width="34" height="18" rx="4" fill="none" stroke={C.green} strokeWidth="3" />
            <rect x="34" y="5" width="4" height="8" rx="1" fill={C.green} />
            <text x="17" y="14" textAnchor="middle" fontSize="12" fill={C.green}>∞</text>
          </g>
        </svg>
      );
    case "done":
    default:
      return (
        <svg {...common}>
          <rect width="240" height="150" rx="14" fill={C.card} />
          <rect x="26" y="24" width="188" height="102" rx="12" fill="#13223d" stroke={C.line} />
          <rect x="40" y="38" width="80" height="8" rx="4" fill={C.text} opacity=".85" />
          <rect x="150" y="35" width="50" height="14" rx="7" fill="rgba(52,211,153,.15)" stroke={C.green} />
          <circle cx="160" cy="42" r="3" fill={C.green} />
          <rect x="167" y="39.5" width="26" height="5" rx="2.5" fill={C.green} />
          <rect x="40" y="62" width="160" height="22" rx="7" fill="#0f172a" stroke={C.line} />
          <rect x="48" y="70" width="60" height="6" rx="3" fill={C.dim} />
          <rect x="150" y="67" width="42" height="12" rx="6" fill={C.cyan} />
          <rect x="40" y="94" width="76" height="20" rx="7" fill="#0f172a" stroke={C.green} />
          <text x="78" y="108" textAnchor="middle" fontSize="9" fill={C.green}>⏻ TV On</text>
          <rect x="124" y="94" width="76" height="20" rx="7" fill="#0f172a" stroke={C.line} />
          <text x="162" y="108" textAnchor="middle" fontSize="9" fill={C.dim}>⏻ TV Off</text>
        </svg>
      );
  }
}
