"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { unitButuhSmartPlug, URL_REKOMENDASI_SMART_PLUG } from "@/lib/tv/smart-plug-need";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { fetchJsonArray, fetchJsonObject } from "@/lib/api/fetch-json";
import { useApi } from "@/lib/api/use-api";
import { useAuth } from "@/lib/auth/client";
import { hasPermission, StaffRole } from "@/lib/auth/permissions";
import { showAlert, showConfirm } from "@/lib/ui/dialog";
import { useDashboardLang } from "@/lib/i18n/dashboard-lang";
import "@/lib/i18n/dict-devices";
import { DeviceSetupGuide } from "./setup-guide";
import { LocalControlCard } from "./local-control-card";
import { DeviceMethodsAndRisks } from "./methods-and-risks";
import { DiscoveredTvsCard, type DiscoveredTvsResponse } from "./discovered-tvs-card";
import "@/lib/i18n/dict-local-control";
import "@/lib/i18n/dict-devices-console";
import { parseTasmotaLocalIp } from "@/lib/relay/local-control";
import { clsx } from "clsx";
import { AlertTriangle, BookOpen, CheckCircle2, ChevronRight, Cpu, LayoutGrid, Link2, Pencil, Plug, PlusCircle, Power, PowerOff, RefreshCw, Search, Trash2, Tv, Wifi, X } from "lucide-react";
import {
  deviceConsoleTabFromSlug,
  deviceHealth,
  deviceKind,
  filterDevices,
  isTvStale,
  sortDevicesForConsole,
  summarizeDeviceConsole,
  visibleDeviceConsoleTabs,
  type DeviceConsoleTab,
  type DeviceKindFilter,
  type DeviceStateFilter,
} from "@/lib/devices/console";
import { HealthPill, Panel, PowerSwitch, SectionHeading, Segmented, StatTile, useAgo, type Tone } from "./console-ui";

interface Device {
  id: string;
  name: string;
  protocol: string;
  mqttTopic: string | null;
  httpOnUrl: string | null;
  httpOffUrl: string | null;
  httpStatusUrl: string | null;
  config: string | null;
  lastKnownState: string;
  lastSeenAt: string | null;
}

/** Akun Tuya Cloud API outlet (GET /api/settings/tuya-accounts) — secret tidak pernah dikirim. */
interface TuyaAccount {
  id: string;
  label: string;
  deviceCount: number;
}

interface RentalUnit {
  id: string;
  name: string;
  deviceId: string | null;
  tvType: string | null;
  isActive?: boolean | null;
}

interface RelayAgent {
  id: string;
  name: string;
  status: "online" | "offline";
  lastSeenAt: string | null;
}

const inputCls = "rounded-lg bg-neutral-800 border border-neutral-700 px-3 py-2 text-sm";

const PROTOCOL_LABEL_KEYS: Record<string, { key: string; fallback: string }> = {
  tasmota_mqtt: { key: "devices.form.protocol.tasmota", fallback: "Tasmota (MQTT)" },
  http_generic: { key: "devices.form.protocol.httpGeneric", fallback: "HTTP Generik (mis. Shelly)" },
  tuya: { key: "devices.form.protocol.tuya", fallback: "Tuya Smart Life" },
  sonoff_ewelink: { key: "devices.form.protocol.ewelink", fallback: "Sonoff eWeLink" },
  android_tv_relay: { key: "devices.form.protocol.tv", fallback: "TV (Android/Google TV)" },
  android_tv_adb: { key: "devices.form.protocol.androidTvAdb", fallback: "Android TV / Google TV (ADB Jaringan langsung)" },
};

/** Pulls { deviceId, switchCode, accountId } out of a device's config JSON — malformed/empty config just reads as "unset" rather than throwing. */
function parseTuyaConfig(config: string | null): { deviceId: string; switchCode: string; accountId: string } {
  if (!config) return { deviceId: "", switchCode: "", accountId: "" };
  try {
    const parsed = JSON.parse(config);
    return { deviceId: parsed.deviceId ?? "", switchCode: parsed.switchCode ?? "", accountId: parsed.accountId ?? "" };
  } catch {
    return { deviceId: "", switchCode: "", accountId: "" };
  }
}

/** Pulls { ip, port, adbPath } out of a device's config JSON for Android TV (ADB) devices — shared by both the direct and relay variants. */
function parseAndroidTvConfig(config: string | null): { ip: string; port: string; adbPath: string; relayAgentId: string } {
  if (!config) return { ip: "", port: "", adbPath: "", relayAgentId: "" };
  try {
    const parsed = JSON.parse(config);
    return {
      ip: parsed.ip ?? "",
      port: parsed.port ? String(parsed.port) : "",
      adbPath: parsed.adbPath ?? "",
      relayAgentId: parsed.relayAgentId ?? "",
    };
  } catch {
    return { ip: "", port: "", adbPath: "", relayAgentId: "" };
  }
}

// isTvStale / deviceHealth / ringkasan angka pindah ke lib/devices/console.ts (diuji di console.test.ts).

/** Status & daftar perangkat disegarkan otomatis selama tab browser terlihat. */
const LIVE_REFRESH_MS = 20_000;

const BADGE_TONE: Record<Tone, string> = {
  neutral: "bg-white/10 text-neutral-300",
  cyan: "bg-cyan-400/20 text-cyan-200",
  emerald: "bg-emerald-400/20 text-emerald-200",
  amber: "bg-amber-400/20 text-amber-200",
  rose: "bg-rose-400/20 text-rose-200",
};
const ATTENTION_TONE: Record<Tone, string> = {
  neutral: "text-neutral-400",
  cyan: "text-cyan-300",
  emerald: "text-emerald-300",
  amber: "text-amber-300",
  rose: "text-rose-300",
};

const emptyForm = {
  name: "",
  protocol: "tasmota_mqtt",
  mqttTopic: "",
  httpOnUrl: "",
  httpOffUrl: "",
  httpStatusUrl: "",
  tuyaDeviceId: "",
  tuyaSwitchCode: "",
  tuyaAccountId: "", // "" = otomatis: server mencari akun Tuya yang memiliki Device ID ini
  tvIp: "",
  tvPort: "5555",
  tvAdbPath: "",
  relayAgentId: "",
  tasmotaLocalIp: "", // IP plug di WiFi outlet — dipakai NexbillAgent saat internet putus (Kontrol Lokal)
};

export default function DevicesPage() {
  const { t } = useDashboardLang();
  const { user } = useAuth();
  const role = (user?.role ?? "cashier") as StaffRole;
  const canManage = hasPermission(role, "manage_devices");

  const [outletId, setOutletId] = useState<string | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [units, setUnits] = useState<RentalUnit[]>([]);
  const [relayAgents, setRelayAgents] = useState<RelayAgent[]>([]);
  const [tuyaAccounts, setTuyaAccounts] = useState<TuyaAccount[]>([]);
  const [tuyaTrialLimit, setTuyaTrialLimit] = useState(8);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);
  // NEXBILL-branded smart plug claim (see lib/hardware/units.ts) — the outlet just types the
  // serial printed on the unit's label instead of a protocol + MQTT topic; the topic was already
  // pre-assigned (and pre-flashed onto the physical unit) before it shipped.
  const [claimSerial, setClaimSerial] = useState("");
  const [claimName, setClaimName] = useState("");
  const [claiming, setClaiming] = useState(false);

  // true setelah perangkat & unit SAMA-SAMA termuat — peringatan smart plug baru dihitung setelah
  // itu, supaya unit yang sudah terpasang smart plug tidak sempat terbaca "butuh" saat daftar
  // perangkat belum datang.
  const [dataLengkap, setDataLengkap] = useState(false);
  // Berganti hanya saat daftar perangkat BENAR-BENAR diubah dari halaman ini (bukan penyegaran
  // otomatis) — dipakai kartu Kontrol Lokal untuk memuat ulang.
  const [reloadKey, setReloadKey] = useState(0);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  // "Sekarang" untuk hitungan TV basi & "x mnt lalu" — maju tiap penyegaran, bukan tiap render.
  const [now, setNow] = useState(() => Date.now());
  const [refreshing, setRefreshing] = useState(false);
  /** Penyegaran ringan: perangkat, unit, dan agent saja. */
  const refreshLive = () =>
    Promise.all([
      fetchJsonArray<Device>("/api/devices").then(setDevices),
      fetchJsonArray<RentalUnit>("/api/rental-units").then(setUnits),
      outletId ? fetchJsonArray<RelayAgent>(`/api/settings/relay-agents?outletId=${outletId}`).then(setRelayAgents) : Promise.resolve(),
    ]).then(() => {
      setDataLengkap(true);
      setLastSync(new Date());
      setNow(Date.now());
    });
  const load = () => {
    setReloadKey((n) => n + 1);
    void refreshLive();
    void fetchJsonObject<{ accounts: TuyaAccount[]; trialLimit: number }>("/api/settings/tuya-accounts").then((r) => {
      if (r) {
        setTuyaAccounts(r.accounts ?? []);
        setTuyaTrialLimit(r.trialLimit ?? 8);
      }
    });
  };

  // --- Peringatan TV non-Android yang belum punya smart plug ---
  const router = useRouter();
  const butuhSmartPlug = useMemo(() => (dataLengkap ? unitButuhSmartPlug(units, devices) : []), [dataLengkap, units, devices]);
  const popupSudahTampil = useRef(false);
  useEffect(() => {
    if (!canManage || !outletId || butuhSmartPlug.length === 0 || popupSudahTampil.current) return;
    popupSudahTampil.current = true;
    // Pop-up cukup sekali per sesi browser per outlet; setelah ditutup, banner di halaman tetap ada.
    const kunci = `nexbill.devices.peringatanSmartPlug.${outletId}`;
    try {
      if (window.sessionStorage.getItem(kunci)) return;
      window.sessionStorage.setItem(kunci, "1");
    } catch {
      /* sessionStorage tidak tersedia — tetap tampilkan */
    }
    const nama = butuhSmartPlug.slice(0, 6).map((u) => u.name).join(", ") + (butuhSmartPlug.length > 6 ? ", …" : "");
    void showConfirm(
      t(
        "devices.smartPlugWarn.body",
        "Ada {n} unit dengan TV non-Android (smart TV biasa / TV analog) yang belum terpasang smart plug: {units}.\n\nTV jenis ini tidak bisa dinyalakan/dimatikan otomatis lewat NexbillAgent — satu-satunya cara adalah smart plug yang mengatur aliran listriknya. Tanpa smart plug, TV di unit tersebut harus dinyalakan/dimatikan manual oleh staf."
      )
        .replace("{n}", String(butuhSmartPlug.length))
        .replace("{units}", nama),
      {
        title: t("devices.smartPlugWarn.title", "TV non-Android perlu Smart Plug"),
        confirmLabel: t("devices.smartPlugWarn.cta", "Lihat Rekomendasi Smart Plug"),
        cancelLabel: t("devices.smartPlugWarn.later", "Nanti saja"),
      }
    ).then((ok) => {
      if (ok) router.push(URL_REKOMENDASI_SMART_PLUG);
    });
  }, [canManage, outletId, butuhSmartPlug, router, t]);
  const { data: outlet } = useApi<{ id: string }>("/api/outlets/default");
  useEffect(() => {
    if (outlet) setOutletId(outlet.id);
  }, [outlet]);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [outletId]);
  useEffect(() => {
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refreshLive();
    }, LIVE_REFRESH_MS);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outletId]);
  const manualRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshLive();
    } finally {
      setRefreshing(false);
    }
  };

  // --- Sub-halaman (?tab=) — bisa di-bookmark dan tombol Back bekerja, sama seperti Accounting. ---
  const [tab, setTabState] = useState<DeviceConsoleTab>("panel");
  const tabs = visibleDeviceConsoleTabs(canManage);
  const activeTab: DeviceConsoleTab = tabs.includes(tab) ? tab : "panel";
  const setTab = (next: DeviceConsoleTab) => {
    setTabState(next);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("tab", next);
    window.history.pushState(null, "", url);
  };
  useEffect(() => {
    const read = () => {
      const want = deviceConsoleTabFromSlug(new URLSearchParams(window.location.search).get("tab"));
      setTabState(want ?? "panel");
    };
    read();
    window.addEventListener("popstate", read);
    return () => window.removeEventListener("popstate", read);
  }, []);

  // --- Filter Panel Kontrol ---
  const [q, setQ] = useState("");
  const [kindFilter, setKindFilter] = useState<DeviceKindFilter>("all");
  const [stateFilter, setStateFilter] = useState<DeviceStateFilter>("all");
  const openPanel = (state: DeviceStateFilter) => {
    setStateFilter(state);
    setKindFilter("all");
    setQ("");
    setTab("panel");
  };
  /** Perintah nyala/mati yang sedang dikirim, per perangkat. */
  const [busy, setBusy] = useState<Record<string, "on" | "off">>({});

  const buildConfig = (f: typeof emptyForm) => {
    if (f.protocol === "tuya" && (f.tuyaDeviceId || f.tuyaSwitchCode)) {
      return JSON.stringify({
        deviceId: f.tuyaDeviceId.trim() || undefined,
        switchCode: f.tuyaSwitchCode.trim() || undefined,
        accountId: f.tuyaAccountId || undefined,
      });
    }
    if (f.protocol === "tasmota_mqtt" && f.tasmotaLocalIp.trim()) {
      return JSON.stringify({ localIp: f.tasmotaLocalIp.trim() });
    }
    if (f.protocol === "android_tv_adb" && f.tvIp) {
      return JSON.stringify({ ip: f.tvIp, port: Number(f.tvPort) || 5555, adbPath: f.tvAdbPath || undefined });
    }
    if (f.protocol === "android_tv_relay" && f.tvIp) {
      // Outlets never manually pick a relay agent when there's only one — the vast majority of
      // outlets have exactly one PC/mini-PC running the agent, so auto-assign it here rather than
      // exposing an agent picker (only DeviceFormFields shows one, and only when there's >1).
      const agentId = f.relayAgentId || (relayAgents.length === 1 ? relayAgents[0].id : "");
      if (!agentId) return undefined;
      return JSON.stringify({ relayAgentId: agentId, ip: f.tvIp, port: Number(f.tvPort) || 5555, adbPath: f.tvAdbPath || undefined });
    }
    return undefined;
  };

  const addDevice = async () => {
    if (!form.name) return showAlert(t("devices.alert.nameRequired", "Nama perangkat wajib diisi."));
    if (form.protocol === "android_tv_relay" && relayAgents.length === 0) {
      return showAlert(t("devices.alert.noRelayAgent", "Belum ada Relay Agent aktif untuk outlet ini. Hubungi tim NEXBILL untuk aktivasi kontrol TV."));
    }
    if (!outletId) return;
    const res = await fetch("/api/devices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        protocol: form.protocol,
        mqttTopic: form.mqttTopic || undefined,
        httpOnUrl: form.httpOnUrl || undefined,
        httpOffUrl: form.httpOffUrl || undefined,
        httpStatusUrl: form.httpStatusUrl || undefined,
        config: buildConfig(form),
        outletId,
      }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    setForm(emptyForm);
    load();
    // Perangkat baru langsung terlihat di Panel Kontrol.
    openPanel("all");
    if (data.tuyaWarning) showAlert(data.tuyaWarning);
  };

  // Self-service .bat generator for the local "keep ADB connected" loop some outlets run on their
  // Relay Agent PC (a fast, offline-tolerant complement to the server-side device heartbeat — see
  // lib/devices/heartbeat.ts). Generated fresh from THIS outlet's current device list every time
  // it's clicked, so there's nothing to hand-edit and nothing to ask NEXBILL support for — an
  // outlet just re-downloads and overwrites the file whenever a TV is added/removed/re-IP'd.
  // NexbillAgent v1.5+ menyambung ulang TV sendiri tiap 30 detik — script .bat hanya untuk agent lama.
  const { data: tvSetupData } = useApi<DiscoveredTvsResponse>("/api/devices/discovered-tvs", { refreshInterval: 10000 });
  const allAgentsAutoReconnect = !!tvSetupData && tvSetupData.agents.length > 0 && tvSetupData.agents.every((a) => a.supportsSetup);
  const tvTargets = devices
    .filter((d) => d.protocol === "android_tv_adb" || d.protocol === "android_tv_relay")
    .map((d) => parseAndroidTvConfig(d.config))
    .filter((cfg) => cfg.ip);

  const downloadReconnectScript = () => {
    if (tvTargets.length === 0) {
      return showAlert(t("devices.reconnectScript.empty", "Belum ada TV dengan IP terisi — tambahkan dulu TV di halaman ini."));
    }
    const lines = [
      "@echo off",
      "REM Dibuat otomatis oleh NEXBILL — jangan edit manual. Kalau ada TV berubah/ditambah, download ulang file ini dari halaman Kontrol Perangkat.",
      ":loop",
      ...tvTargets.map((cfg) => `adb connect ${cfg.ip}:${cfg.port || "5555"}`),
      "timeout /t 30",
      "goto loop",
      "",
    ];
    const blob = new Blob([lines.join("\r\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "auto_reconnect_adb.bat";
    a.click();
    URL.revokeObjectURL(url);
  };

  const claimHardware = async () => {
    if (!claimSerial.trim()) return showAlert(t("devices.hardware.serialRequired", "Nomor seri wajib diisi."));
    if (!claimName.trim()) return showAlert(t("devices.alert.nameRequired", "Nama perangkat wajib diisi."));
    setClaiming(true);
    try {
      const res = await fetch("/api/devices/claim-hardware", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialNumber: claimSerial.trim(), name: claimName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) return showAlert(data.error);
      setClaimSerial("");
      setClaimName("");
      load();
      openPanel("all");
    } finally {
      setClaiming(false);
    }
  };

  const toggle = async (id: string, on: boolean) => {
    if (busy[id]) return;
    setBusy((b) => ({ ...b, [id]: on ? "on" : "off" }));
    try {
      const res = await fetch(`/api/devices/${id}/toggle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ on }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showAlert(err.error ?? t("devices.console.toggleFailed", "Perintah gagal dikirim. Coba lagi."));
      }
      await refreshLive();
    } catch {
      showAlert(t("devices.console.toggleFailed", "Perintah gagal dikirim. Coba lagi."));
    } finally {
      setBusy((b) => {
        const next = { ...b };
        delete next[id];
        return next;
      });
    }
  };

  const assignToUnit = async (unitId: string, deviceId: string) => {
    await fetch(`/api/rental-units/${unitId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId: deviceId || null }),
    });
    load();
  };

  const startEdit = (d: Device) => {
    const tuyaCfg = parseTuyaConfig(d.config);
    const tvCfg = parseAndroidTvConfig(d.config);
    setEditingId(d.id);
    setEditForm({
      name: d.name,
      protocol: d.protocol,
      mqttTopic: d.mqttTopic ?? "",
      httpOnUrl: d.httpOnUrl ?? "",
      httpOffUrl: d.httpOffUrl ?? "",
      httpStatusUrl: d.httpStatusUrl ?? "",
      tuyaDeviceId: tuyaCfg.deviceId,
      tuyaSwitchCode: tuyaCfg.switchCode,
      tuyaAccountId: tuyaCfg.accountId,
      tvIp: tvCfg.ip,
      tvPort: tvCfg.port || "5555",
      tvAdbPath: tvCfg.adbPath,
      relayAgentId: tvCfg.relayAgentId,
      tasmotaLocalIp: d.protocol === "tasmota_mqtt" ? parseTasmotaLocalIp(d.config) ?? "" : "",
    });
  };
  const cancelEdit = () => { setEditingId(null); setEditForm(emptyForm); };

  const saveEdit = async (id: string) => {
    const res = await fetch(`/api/devices/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        protocol: editForm.protocol,
        mqttTopic: editForm.mqttTopic || null,
        httpOnUrl: editForm.httpOnUrl || null,
        httpOffUrl: editForm.httpOffUrl || null,
        httpStatusUrl: editForm.httpStatusUrl || null,
        config: buildConfig(editForm) ?? null,
      }),
    });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    cancelEdit();
    load();
    if (data.tuyaWarning) showAlert(data.tuyaWarning);
  };

  const deleteDevice = async (d: Device) => {
    if (!(await showConfirm(t("devices.confirm.deleteDevice", 'Hapus perangkat "{name}"? Unit rental yang terhubung ke perangkat ini akan otomatis dilepas.').replace("{name}", d.name)))) return;
    const res = await fetch(`/api/devices/${d.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  // ------------------------------------------------------------------ data turunan untuk tampilan
  const ago = useAgo();
  const summary = useMemo(() => summarizeDeviceConsole(devices, units, relayAgents, now), [devices, units, relayAgents, now]);
  /** Nama unit yang memakai tiap perangkat. */
  const unitsByDevice = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const u of units) {
      if (!u.deviceId) continue;
      map.set(u.deviceId, [...(map.get(u.deviceId) ?? []), u.name]);
    }
    return map;
  }, [units]);
  const protocolLabel = (protocol: string) => (PROTOCOL_LABEL_KEYS[protocol] ? t(PROTOCOL_LABEL_KEYS[protocol].key, PROTOCOL_LABEL_KEYS[protocol].fallback) : protocol);
  /** Rincian teknis satu perangkat (alamat/topic/akun) — ditampilkan kecil & ikut dicari. */
  const deviceDetails = (d: Device): string[] => {
    const out: string[] = [];
    if (d.mqttTopic) out.push(d.mqttTopic);
    if (d.protocol === "tasmota_mqtt") {
      const ip = parseTasmotaLocalIp(d.config);
      if (ip) out.push(`IP ${ip}`);
    }
    if (d.protocol === "tuya") {
      const cfg = parseTuyaConfig(d.config);
      if (cfg.deviceId) out.push(cfg.deviceId);
      if (tuyaAccounts.length > 1) out.push(tuyaAccounts.find((a) => a.id === cfg.accountId)?.label ?? tuyaAccounts[0].label);
    }
    if (deviceKind(d.protocol) === "tv") {
      const cfg = parseAndroidTvConfig(d.config);
      if (cfg.ip) out.push(`${cfg.ip}:${cfg.port || "5555"}`);
      if (d.protocol === "android_tv_relay" && cfg.relayAgentId && relayAgents.length > 1) {
        out.push(`via ${relayAgents.find((a) => a.id === cfg.relayAgentId)?.name ?? t("devices.relayNotFound", "agent tidak ditemukan")}`);
      }
    }
    return out;
  };
  const shownDevices = useMemo(
    () =>
      sortDevicesForConsole(
        filterDevices(devices, { q, kind: kindFilter, state: stateFilter }, (d) => `${(unitsByDevice.get(d.id) ?? []).join(" ")} ${deviceDetails(d).join(" ")}`, now),
        now
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [devices, q, kindFilter, stateFilter, unitsByDevice, now, tuyaAccounts, relayAgents]
  );
  const filtering = q.trim() !== "" || kindFilter !== "all" || stateFilter !== "all";
  const resetFilters = () => {
    setQ("");
    setKindFilter("all");
    setStateFilter("all");
  };
  const sortedUnits = useMemo(() => [...units].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })), [units]);
  const deviceById = useMemo(() => new Map(devices.map((d) => [d.id, d])), [devices]);
  const unitsUnlinked = summary.unitsTotal - summary.unitsLinked;
  const agentsOffline = summary.agentsTotal - summary.agentsOnline;
  const tvReadyToAdd = canManage ? (tvSetupData?.tvs ?? []).filter((tv) => !tv.added && tv.state === "ready").length : 0;

  /** Hal yang perlu ditindak, urut dari yang paling menghambat operasional. */
  const attention: { key: string; tone: Tone; text: string; action: string; onClick?: () => void; href?: string }[] = [];
  if (agentsOffline > 0) {
    attention.push({
      key: "agent",
      tone: "rose",
      text: t("devices.console.attention.agentOffline", "{n} NexbillAgent offline — TV tidak bisa dikontrol sampai agent berjalan lagi.").replace("{n}", String(agentsOffline)),
      action: t("devices.console.attention.check", "Periksa"),
      onClick: () => setTab("connection"),
    });
  }
  if (summary.attention > 0) {
    attention.push({
      key: "stale",
      tone: "amber",
      text: t("devices.console.attention.tvStale", "{n} TV tidak merespons — pastikan TV menyala dan tersambung WiFi outlet.").replace("{n}", String(summary.attention)),
      action: t("devices.console.attention.view", "Lihat"),
      onClick: () => openPanel("attention"),
    });
  }
  if (canManage && butuhSmartPlug.length > 0) {
    attention.push({
      key: "plug",
      tone: "amber",
      text: `${t("devices.smartPlugWarn.bannerTitle", "{n} unit TV non-Android belum punya smart plug").replace("{n}", String(butuhSmartPlug.length))}: ${butuhSmartPlug.map((u) => u.name).join(", ")}. ${t("devices.smartPlugWarn.bannerDesc", "TV di unit ini harus dinyalakan/dimatikan manual sampai smart plug dipasang dan dihubungkan di halaman ini.")}`,
      action: t("devices.smartPlugWarn.cta", "Lihat Rekomendasi Smart Plug"),
      href: URL_REKOMENDASI_SMART_PLUG,
    });
  }
  if (unitsUnlinked > 0 && devices.length > 0) {
    attention.push({
      key: "units",
      tone: "amber",
      text: t("devices.console.attention.unitsUnlinked", "{n} unit belum punya perangkat — tidak menyala/mati otomatis saat sesi.").replace("{n}", String(unitsUnlinked)),
      action: t("devices.console.attention.link", "Hubungkan"),
      onClick: () => setTab("units"),
    });
  }
  if (tvReadyToAdd > 0) {
    attention.push({
      key: "found",
      tone: "cyan",
      text: t("devices.console.attention.tvFound", "{n} TV ditemukan NexbillAgent dan siap ditambahkan.").replace("{n}", String(tvReadyToAdd)),
      action: t("devices.console.attention.add", "Tambahkan"),
      onClick: () => setTab("add"),
    });
  }

  const TAB_META: Record<DeviceConsoleTab, { icon: React.ReactNode; label: string; badge?: number; badgeTone?: Tone }> = {
    panel: { icon: <LayoutGrid size={15} />, label: t("devices.console.tab.panel", "Panel Kontrol"), badge: summary.total || undefined },
    units: { icon: <Link2 size={15} />, label: t("devices.console.tab.units", "Unit & Perangkat"), badge: unitsUnlinked || undefined, badgeTone: "amber" },
    add: { icon: <PlusCircle size={15} />, label: t("devices.addDevice", "Tambah Perangkat"), badge: tvReadyToAdd || undefined, badgeTone: "cyan" },
    connection: { icon: <Wifi size={15} />, label: t("devices.console.tab.connection", "Koneksi & Agent"), badge: agentsOffline || undefined, badgeTone: "rose" },
    guide: { icon: <BookOpen size={15} />, label: t("devices.console.tab.guide", "Panduan & Darurat") },
  };
  return (
    <div className="space-y-5">
      {/* ------------------------------------------------------------ kepala halaman */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("devices.pageTitle", "Kontrol Perangkat (Smart Plug & TV)")}</h1>
          <p className="text-sm text-neutral-500">
            {t("devices.console.subtitle", "Nyalakan, matikan, dan pantau smart plug & TV setiap unit dari satu layar.")}
            {!canManage && t("devices.pageSubtitleViewOnly", " Kamu hanya bisa menyalakan/mematikan — hanya role tertentu yang bisa tambah/edit/hapus perangkat.")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={manualRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-neutral-400 transition hover:border-white/20 hover:text-neutral-100 disabled:opacity-60"
            title={t("devices.console.refresh", "Muat ulang")}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
            </span>
            <span className="tabular-nums">
              {lastSync
                ? t("devices.console.updatedAt", "Diperbarui {time}").replace("{time}", lastSync.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }))
                : t("devices.console.loading", "Memuat...")}
            </span>
            <RefreshCw size={13} className={clsx(refreshing && "animate-spin")} />
          </button>
          {canManage && activeTab !== "add" && (
            <Button className="text-xs" onClick={() => setTab("add")}>
              <span className="inline-flex items-center gap-1.5">
                <PlusCircle size={14} /> {t("devices.addDevice", "Tambah Perangkat")}
              </span>
            </Button>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------ ringkasan angka */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <StatTile
          icon={<Cpu size={15} />}
          label={t("devices.console.kpi.devices", "Perangkat")}
          value={summary.total}
          sub={t("devices.console.kpi.devicesSub", "{tv} TV · {plug} smart plug").replace("{tv}", String(summary.tv)).replace("{plug}", String(summary.plug))}
          tone="cyan"
          active={activeTab === "panel" && stateFilter === "all"}
          onClick={() => openPanel("all")}
        />
        <StatTile
          icon={<Power size={15} />}
          label={t("devices.console.health.on", "Menyala")}
          value={summary.on}
          tone={summary.on > 0 ? "emerald" : "neutral"}
          active={activeTab === "panel" && stateFilter === "on"}
          onClick={() => openPanel("on")}
        />
        <StatTile
          icon={<PowerOff size={15} />}
          label={t("devices.console.health.off", "Mati")}
          value={summary.off}
          sub={summary.unknown > 0 ? t("devices.console.kpi.unknownSub", "+{n} belum diketahui").replace("{n}", String(summary.unknown)) : undefined}
          active={activeTab === "panel" && stateFilter === "off"}
          onClick={() => openPanel("off")}
        />
        <StatTile
          icon={<AlertTriangle size={15} />}
          label={t("devices.console.health.attention", "Tidak merespons")}
          value={summary.attention}
          sub={summary.tv === 0 ? undefined : summary.attention > 0 ? t("devices.console.kpi.attentionSub", "TV perlu dicek") : t("devices.console.kpi.attentionNone", "Semua TV merespons")}
          tone={summary.attention > 0 ? "amber" : "neutral"}
          active={activeTab === "panel" && stateFilter === "attention"}
          onClick={() => openPanel("attention")}
        />
        <StatTile
          icon={<Link2 size={15} />}
          label={t("devices.console.kpi.units", "Unit terhubung")}
          value={
            <>
              {summary.unitsLinked}
              <span className="text-base font-medium text-neutral-500">/{summary.unitsTotal}</span>
            </>
          }
          progress={summary.unitsTotal > 0 ? summary.unitsLinked / summary.unitsTotal : null}
          sub={
            summary.unitsTotal === 0
              ? undefined
              : unitsUnlinked > 0
                ? t("devices.console.kpi.unitsSub", "{n} unit belum terhubung").replace("{n}", String(unitsUnlinked))
                : t("devices.console.kpi.unitsAll", "Semua unit terhubung")
          }
          tone={unitsUnlinked > 0 ? "amber" : "neutral"}
          active={activeTab === "units"}
          onClick={() => setTab("units")}
        />
        <StatTile
          icon={<Wifi size={15} />}
          label={t("devices.console.kpi.agents", "NexbillAgent online")}
          value={
            <>
              {summary.agentsOnline}
              <span className="text-base font-medium text-neutral-500">/{summary.agentsTotal}</span>
            </>
          }
          sub={summary.agentsTotal === 0 ? t("devices.console.kpi.agentsNone", "Belum dipasang") : agentsOffline > 0 ? t("devices.console.kpi.agentsOff", "{n} offline").replace("{n}", String(agentsOffline)) : undefined}
          tone={agentsOffline > 0 ? "rose" : summary.agentsOnline > 0 ? "emerald" : "neutral"}
          active={activeTab === "connection"}
          onClick={() => setTab("connection")}
        />
      </div>

      {/* ------------------------------------------------------------ sub-halaman */}
      <nav aria-label={t("devices.console.navLabel", "Bagian Kontrol Perangkat")} className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-white/[0.02] p-1">
        {tabs.map((tb) => {
          const meta = TAB_META[tb];
          const active = tb === activeTab;
          return (
            <button
              key={tb}
              type="button"
              onClick={() => setTab(tb)}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition",
                active ? "bg-cyan-400/15 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.35)]" : "text-neutral-400 hover:bg-white/5 hover:text-neutral-100"
              )}
            >
              {meta.icon}
              {meta.label}
              {meta.badge != null && <span className={clsx("rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none", BADGE_TONE[meta.badgeTone ?? "neutral"])}>{meta.badge}</span>}
            </button>
          );
        })}
      </nav>

      {/* ============================================================ PANEL KONTROL */}
      {activeTab === "panel" && (
        <div className="space-y-4">
          {dataLengkap && attention.length > 0 && (
            <Panel tone="amber" flush>
              <div className="flex items-center gap-2 border-b border-white/5 bg-amber-500/[0.06] px-4 py-2.5 text-sm font-medium text-amber-100">
                <AlertTriangle size={15} /> {t("devices.console.attention.title", "Perlu perhatian")}
                <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums leading-none text-amber-200">{attention.length}</span>
              </div>
              <ul className="divide-y divide-white/5">
                {attention.map((a) => (
                  <li key={a.key} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                    <span className={clsx("mt-0.5 shrink-0", ATTENTION_TONE[a.tone])}>
                      <AlertTriangle size={14} />
                    </span>
                    <span className="min-w-0 flex-1 basis-56 text-xs leading-relaxed text-neutral-300">{a.text}</span>
                    {a.href ? (
                      <Link href={a.href} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-neutral-100 hover:border-cyan-400/40 hover:bg-white/10">
                        {a.action} <ChevronRight size={13} />
                      </Link>
                    ) : (
                      <button type="button" onClick={a.onClick} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-neutral-100 hover:border-cyan-400/40 hover:bg-white/10">
                        {a.action} <ChevronRight size={13} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {dataLengkap && attention.length === 0 && devices.length > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/[0.05] px-4 py-2.5 text-xs text-emerald-200">
              <CheckCircle2 size={15} /> {t("devices.console.attention.allGood", "Tidak ada yang perlu ditindak saat ini.")}
            </div>
          )}

          {devices.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-9 pr-8 text-sm placeholder:text-neutral-600 focus:border-cyan-400/40 focus:outline-none"
                  placeholder={t("devices.console.filter.search", "Cari perangkat, unit, atau IP")}
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
                {q && (
                  <button type="button" onClick={() => setQ("")} aria-label={t("devices.console.filter.reset", "Hapus filter")} className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-200">
                    <X size={14} />
                  </button>
                )}
              </div>
              <Segmented<DeviceKindFilter>
                label={t("devices.console.filter.kind", "Jenis perangkat")}
                value={kindFilter}
                onChange={setKindFilter}
                options={[
                  { value: "all", label: t("devices.console.filter.all", "Semua"), count: summary.total },
                  { value: "tv", label: t("devices.console.filter.tv", "TV"), count: summary.tv },
                  { value: "plug", label: t("devices.console.filter.plug", "Smart plug"), count: summary.plug },
                ]}
              />
              <Segmented<DeviceStateFilter>
                label={t("devices.console.filter.state", "Status")}
                value={stateFilter}
                onChange={setStateFilter}
                options={[
                  { value: "all", label: t("devices.console.filter.all", "Semua") },
                  { value: "on", label: t("devices.console.health.on", "Menyala"), count: summary.on },
                  { value: "off", label: t("devices.console.health.off", "Mati"), count: summary.off },
                  ...(summary.attention > 0 || stateFilter === "attention" ? [{ value: "attention" as const, label: t("devices.console.health.attention", "Tidak merespons"), count: summary.attention }] : []),
                  ...(summary.unknown > 0 || stateFilter === "unknown" ? [{ value: "unknown" as const, label: t("devices.console.health.unknown", "Belum diketahui"), count: summary.unknown }] : []),
                ]}
              />
            </div>
          )}

          {filtering && devices.length > 0 && (
            <div className="flex items-center gap-3 text-xs text-neutral-500">
              <span>{t("devices.console.showing", "{n} dari {total} perangkat").replace("{n}", String(shownDevices.length)).replace("{total}", String(devices.length))}</span>
              <button type="button" onClick={resetFilters} className="text-cyan-300 hover:underline">
                {t("devices.console.filter.reset", "Hapus filter")}
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shownDevices.map((d) => {
              const health = deviceHealth(d, now);
              const kind = deviceKind(d.protocol);
              const linked = unitsByDevice.get(d.id) ?? [];
              const details = deviceDetails(d);
              const seen = kind === "tv" ? ago(d.lastSeenAt, now) : null;
              if (editingId === d.id) {
                return (
                  <Panel key={d.id} tone="cyan" className="space-y-3 md:col-span-2 xl:col-span-3">
                    <SectionHeading icon={<Pencil size={16} />} title={t("devices.console.editTitle", "Ubah perangkat: {name}").replace("{name}", d.name)} />
                    <div>
                      <DeviceFormFields form={editForm} setForm={setEditForm} relayAgents={relayAgents} tuyaAccounts={tuyaAccounts} tuyaTrialLimit={tuyaTrialLimit} />
                    </div>
                    <div className="flex gap-2">
                      <Button className="text-xs" onClick={() => saveEdit(d.id)}>{t("devices.action.save", "Simpan")}</Button>
                      <Button variant="ghost" className="text-xs" onClick={cancelEdit}>{t("devices.action.cancel", "Batal")}</Button>
                    </div>
                  </Panel>
                );
              }
              return (
                <div
                  key={d.id}
                  className={clsx(
                    "relative flex flex-col gap-3 overflow-hidden rounded-xl border bg-[#0f1426]/70 p-4 backdrop-blur-md transition",
                    "shadow-[0_0_0_1px_rgba(56,189,248,0.04),0_8px_24px_-8px_rgba(0,0,0,0.6)]",
                    health === "on" ? "border-emerald-400/25" : health === "attention" ? "border-amber-400/30" : "border-white/10"
                  )}
                >
                  <span
                    aria-hidden
                    className={clsx("absolute inset-y-0 left-0 w-1", health === "on" ? "bg-emerald-400/80" : health === "attention" ? "bg-amber-400/80" : "bg-white/10")}
                  />
                  <div className="flex items-start gap-3">
                    <div
                      className={clsx(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                        health === "on" ? "bg-emerald-400/15 text-emerald-200" : health === "attention" ? "bg-amber-400/15 text-amber-200" : "bg-white/5 text-neutral-400"
                      )}
                    >
                      {kind === "tv" ? <Tv size={18} /> : <Plug size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="truncate font-medium text-neutral-100" title={d.name}>{d.name}</div>
                        <HealthPill health={health} />
                      </div>
                      {linked.length > 0 ? (
                        <div className="mt-0.5 truncate text-xs text-neutral-400" title={linked.join(", ")}>
                          {t("devices.console.card.unit", "Unit: {units}").replace("{units}", linked.join(", "))}
                        </div>
                      ) : (
                        <button type="button" onClick={() => setTab("units")} className="mt-0.5 inline-flex items-center gap-1 text-xs text-amber-300/90 hover:underline">
                          <Link2 size={11} /> {t("devices.console.card.noUnit", "Belum dihubungkan ke unit")}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="rounded-md border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-neutral-300">{protocolLabel(d.protocol)}</span>
                    {details.map((x) => (
                      <span key={x} className="max-w-full truncate rounded-md bg-white/[0.03] px-1.5 py-0.5 font-mono text-neutral-500" title={x}>
                        {x}
                      </span>
                    ))}
                  </div>

                  {kind === "tv" && (
                    <div className={clsx("text-[11px]", isTvStale(d.lastSeenAt, now) ? "text-amber-300" : "text-neutral-500")} title={d.lastSeenAt ? new Date(d.lastSeenAt).toLocaleString() : undefined}>
                      {seen ? t("devices.console.card.seen", "Terakhir merespons {ago}").replace("{ago}", seen) : t("devices.heartbeat.neverSeen", "Belum pernah terdeteksi merespon")}
                    </div>
                  )}

                  <div className="mt-auto flex items-center gap-2">
                    <div className="flex-1">
                      <PowerSwitch state={d.lastKnownState} busy={busy[d.id] ?? null} onToggle={(on) => toggle(d.id, on)} />
                    </div>
                    {canManage && (
                      <>
                        <button
                          type="button"
                          onClick={() => startEdit(d)}
                          title={t("devices.action.edit", "Edit")}
                          aria-label={t("devices.action.edit", "Edit")}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-neutral-400 transition hover:border-cyan-400/40 hover:text-cyan-200"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteDevice(d)}
                          title={t("devices.action.delete", "Hapus")}
                          aria-label={t("devices.action.delete", "Hapus")}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 text-neutral-400 transition hover:border-rose-400/40 hover:text-rose-300"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {dataLengkap && devices.length > 0 && shownDevices.length === 0 && (
            <Card className="text-center text-sm text-neutral-500">
              {t("devices.console.noMatch", "Tidak ada perangkat yang cocok dengan filter.")}{" "}
              <button type="button" onClick={resetFilters} className="text-cyan-300 hover:underline">
                {t("devices.console.filter.reset", "Hapus filter")}
              </button>
            </Card>
          )}

          {dataLengkap && devices.length === 0 && (
            <Card className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-cyan-400/10 text-cyan-300">
                <Plug size={26} />
              </div>
              <div>
                <div className="font-medium text-neutral-100">{t("devices.console.empty.title", "Belum ada perangkat")}</div>
                <p className="mx-auto mt-1 max-w-md text-xs text-neutral-500">
                  {canManage
                    ? t("devices.console.empty.desc", "Tambahkan smart plug atau TV supaya unit menyala saat sesi dimulai dan mati saat waktu habis.")
                    : t("devices.console.empty.descView", "Belum ada perangkat di outlet ini. Minta pemilik atau manajer menambahkannya.")}
                </p>
              </div>
              {canManage && (
                <div className="flex flex-wrap justify-center gap-2">
                  <Button className="text-xs" onClick={() => setTab("add")}>{t("devices.addDevice", "Tambah Perangkat")}</Button>
                  <Button variant="secondary" className="text-xs" onClick={() => setTab("guide")}>{t("devices.console.tab.guide", "Panduan & Darurat")}</Button>
                </div>
              )}
            </Card>
          )}
        </div>
      )}

      {/* ============================================================ UNIT & PERANGKAT */}
      {activeTab === "units" && (
        <Card className="space-y-4">
          <SectionHeading
            icon={<Link2 size={17} />}
            title={t("devices.linkToUnit.heading", "Hubungkan Perangkat ke Unit Rental")}
            desc={t("devices.console.units.desc", "Perangkat yang dihubungkan menyala saat sesi unit dimulai dan mati saat sesi selesai.")}
            right={
              summary.unitsTotal > 0 ? (
                <span className={clsx("rounded-full border px-2.5 py-1 text-[11px] font-medium tabular-nums", unitsUnlinked > 0 ? "border-amber-400/30 bg-amber-500/10 text-amber-200" : "border-emerald-400/30 bg-emerald-500/10 text-emerald-200")}>
                  {summary.unitsLinked}/{summary.unitsTotal}
                </span>
              ) : undefined
            }
          />
          {sortedUnits.length === 0 ? (
            <p className="text-sm text-neutral-500">{t("devices.console.units.empty", "Belum ada unit rental.")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-left text-[11px] uppercase tracking-wide text-neutral-500">
                    <th className="py-2 pr-3 font-medium">{t("devices.table.unit", "Unit Rental")}</th>
                    <th className="py-2 pr-3 font-medium">{t("devices.table.device", "Perangkat")}</th>
                    <th className="py-2 pr-3 font-medium">{t("devices.console.filter.state", "Status")}</th>
                    <th className="py-2 font-medium">{t("devices.console.units.control", "Kontrol")}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUnits.map((u) => {
                    const dv = u.deviceId ? deviceById.get(u.deviceId) : undefined;
                    const inactive = u.isActive === false;
                    return (
                      <tr key={u.id} className={clsx("border-b border-white/5 align-middle hover:bg-white/[0.02]", inactive && "opacity-50")}>
                        <td className="py-2.5 pr-3">
                          <div className="flex items-center gap-2">
                            <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", dv ? "bg-emerald-400" : "bg-amber-400")} />
                            <span className="font-medium text-neutral-100">{u.name}</span>
                            {inactive && <span className="rounded border border-white/10 px-1 text-[10px] text-neutral-500">{t("devices.console.units.inactive", "nonaktif")}</span>}
                          </div>
                        </td>
                        <td className="py-2.5 pr-3">
                          <select
                            className={clsx("w-full min-w-[180px] max-w-xs rounded-lg border bg-neutral-800 px-3 py-1.5 text-sm disabled:opacity-70", dv ? "border-neutral-700" : "border-amber-500/40")}
                            value={dv ? u.deviceId ?? "" : ""}
                            onChange={(e) => assignToUnit(u.id, e.target.value)}
                            disabled={!canManage}
                          >
                            <option value="">{t("devices.table.notLinked", "— Belum terhubung —")}</option>
                            {devices.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2.5 pr-3">{dv ? <HealthPill health={deviceHealth(dv, now)} /> : <span className="text-xs text-neutral-600">—</span>}</td>
                        <td className="py-2.5">
                          {dv ? (
                            <div className="w-44">
                              <PowerSwitch compact state={dv.lastKnownState} busy={busy[dv.id] ?? null} onToggle={(on) => toggle(dv.id, on)} />
                            </div>
                          ) : (
                            <span className="text-xs text-neutral-600">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          {devices.length === 0 && sortedUnits.length > 0 && canManage && (
            <p className="text-xs text-amber-300/90">
              {t("devices.console.units.noDevices", "Belum ada perangkat untuk dihubungkan.")}{" "}
              <button type="button" onClick={() => setTab("add")} className="text-cyan-300 hover:underline">{t("devices.addDevice", "Tambah Perangkat")}</button>
            </p>
          )}
        </Card>
      )}

      {/* ============================================================ TAMBAH PERANGKAT */}
      {activeTab === "add" && canManage && (
        <div className="space-y-4">
          <DiscoveredTvsCard onAdded={load} />
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Panel tone="amber" className="space-y-3">
              <SectionHeading
                icon={<Plug size={17} />}
                title={t("devices.hardware.claimTitle", "Klaim Smart Plug NEXBILL")}
                desc={t(
                  "devices.hardware.claimDesc",
                  "Punya smart plug resmi NEXBILL? Ketik nomor seri yang tertera di label/QR unit — MQTT Topic sudah otomatis ter-setting dari pabrik, tidak perlu diisi manual."
                )}
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  className={inputCls}
                  placeholder={t("devices.hardware.serialPlaceholder", "Nomor Seri (mis. NXB-4F7QATS2)")}
                  value={claimSerial}
                  onChange={(e) => setClaimSerial(e.target.value)}
                />
                <input
                  className={inputCls}
                  placeholder={t("devices.form.namePlaceholder", "Nama (mis. Plug Bilik 1)")}
                  value={claimName}
                  onChange={(e) => setClaimName(e.target.value)}
                />
              </div>
              <Button onClick={claimHardware} disabled={claiming}>
                {claiming ? t("devices.hardware.claiming", "Memproses...") : t("devices.hardware.claimButton", "Klaim Perangkat")}
              </Button>
            </Panel>

            <Card className="space-y-3">
              <SectionHeading
                icon={<PlusCircle size={17} />}
                title={t("devices.console.add.manualTitle", "Tambah manual")}
                desc={t("devices.console.add.manualDesc", "Untuk smart plug Tasmota atau Tuya, dan TV yang alamat IP-nya sudah diketahui.")}
              />
              <div>
                <DeviceFormFields form={form} setForm={setForm} relayAgents={relayAgents} tuyaAccounts={tuyaAccounts} tuyaTrialLimit={tuyaTrialLimit} twoCol />
              </div>
              <Button onClick={addDevice}>{t("devices.addDevice", "Tambah Perangkat")}</Button>
            </Card>
          </div>
          <p className="text-xs text-neutral-500">
            {t("devices.console.add.guideHint", "Belum pernah memasang? Langkah lengkap tiap jenis perangkat ada di")}{" "}
            <button type="button" onClick={() => setTab("guide")} className="text-cyan-300 hover:underline">{t("devices.console.tab.guide", "Panduan & Darurat")}</button>.
          </p>
        </div>
      )}

      {/* ============================================================ KONEKSI & AGENT */}
      {activeTab === "connection" && (
        <div className="space-y-4">
          <Card className="space-y-3">
            <SectionHeading
              icon={<Wifi size={17} />}
              title={t("devices.console.conn.agentsTitle", "NexbillAgent di outlet ini")}
              desc={t("devices.console.conn.agentsDesc", "Aplikasi kecil di PC atau HP outlet yang meneruskan perintah nyala/mati ke TV dan menjaga kontrol tetap jalan saat internet putus.")}
            />
            {relayAgents.length === 0 ? (
              <p className="text-xs text-amber-300/90">{t("devices.form.noRelayAgentsWarning", "Belum ada Relay Agent aktif untuk outlet ini. Hubungi tim NEXBILL untuk aktivasi kontrol TV.")}</p>
            ) : (
              <ul className="divide-y divide-white/5">
                {relayAgents.map((a) => {
                  const online = a.status === "online";
                  const seen = ago(a.lastSeenAt, now);
                  return (
                    <li key={a.id} className="flex flex-wrap items-center gap-3 py-2.5">
                      <span className={clsx("grid h-9 w-9 shrink-0 place-items-center rounded-xl", online ? "bg-emerald-400/15 text-emerald-200" : "bg-rose-400/10 text-rose-300")}>
                        <Cpu size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-neutral-100">{a.name}</div>
                        <div className="text-[11px] text-neutral-500">
                          {seen ? t("devices.console.conn.lastSeen", "Terakhir tersambung {ago}").replace("{ago}", seen) : t("devices.console.conn.never", "Belum pernah tersambung")}
                        </div>
                      </div>
                      <Badge status={online ? "success" : "failed"}>{online ? t("devices.status.online", "online") : t("devices.status.offline", "offline")}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <LocalControlCard canManage={canManage} reloadSignal={reloadKey} onDeviceChanged={load} />

          {canManage && tvTargets.length > 0 && !allAgentsAutoReconnect && (
            <Card className="space-y-3">
              <SectionHeading
                title={t("devices.reconnectScript.title", "Script Auto-Reconnect ADB (opsional)")}
                desc={t(
                  "devices.reconnectScript.desc",
                  'Untuk PC Relay Agent yang mengontrol TV Android — script ini mencoba menyambungkan ulang ADB ke semua TV outlet ini tiap 30 detik, tetap jalan walau internet ke server NEXBILL sempat putus. Dibuat otomatis dari daftar TV saat ini, jadi tidak perlu diedit manual — cukup download ulang & timpa file lama kalau ada TV yang ditambah/dihapus/ganti IP. Taruh di folder yang sama dengan NexbillAgent, lalu jalankan (atau tambahkan ke Windows Startup).'
                )}
              />
              <Button variant="secondary" onClick={downloadReconnectScript}>{t("devices.reconnectScript.button", "Download auto_reconnect_adb.bat")}</Button>
            </Card>
          )}
        </div>
      )}

      {/* ============================================================ PANDUAN & DARURAT */}
      {activeTab === "guide" && (
        <div className="space-y-4">
          {/* Keunggulan tiap metode + rencana darurat (listrik padam, internet putus, error) — untuk semua peran. */}
          <DeviceMethodsAndRisks />
          {canManage && <DeviceSetupGuide />}
        </div>
      )}
    </div>
  );
}

/** Shared Add/Edit form fields — protocol-specific inputs switch based on `form.protocol`. */
function DeviceFormFields({
  form,
  setForm,
  relayAgents,
  tuyaAccounts,
  tuyaTrialLimit,
  compact,
  twoCol,
}: {
  form: typeof emptyForm;
  setForm: (f: typeof emptyForm) => void;
  relayAgents: RelayAgent[];
  tuyaAccounts: TuyaAccount[];
  tuyaTrialLimit: number;
  compact?: boolean;
  /** Dua kolom dengan ukuran isian normal — untuk kartu selebar setengah halaman. */
  twoCol?: boolean;
}) {
  const { t } = useDashboardLang();
  const cls = compact ? `${inputCls} text-xs px-2 py-1.5` : inputCls;
  return (
    <>
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${compact || twoCol ? "" : "lg:grid-cols-3"} gap-2`}>
      <input className={cls} placeholder={t("devices.form.namePlaceholder", "Nama (mis. Plug Bilik 1)")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <select className={cls} value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })}>
        <option value="tasmota_mqtt">{t("devices.form.protocol.tasmota", "Tasmota (MQTT)")}</option>
        <option value="tuya">{t("devices.form.protocol.tuya", "Tuya Smart Life")}</option>
        <option value="android_tv_relay">{t("devices.form.protocol.tv", "TV (Android/Google TV)")}</option>
        {/*
          HTTP Generik dan Sonoff eWeLink sengaja disembunyikan dari pilihan perangkat baru (belum
          jadi cara setup resmi yang didukung penuh tim NEXBILL) — tapi kalau ada perangkat lama
          yang masih memakainya, opsinya tetap muncul di sini SAAT diedit, supaya perangkat itu
          tidak "hilang" jadi tidak bisa disimpan/diubah. Sama seperti pola "android_tv_adb" di
          bawah, yang sudah lebih dulu berstatus legacy.
        */}
        {form.protocol === "http_generic" && (
          <option value="http_generic">{t("devices.form.protocol.httpGeneric", "HTTP Generik (mis. Shelly)")}</option>
        )}
        {form.protocol === "sonoff_ewelink" && (
          <option value="sonoff_ewelink">{t("devices.form.protocol.ewelink", "Sonoff eWeLink")}</option>
        )}
        {/* Legacy option — only appears while editing a device that already uses it. Not offered for new devices; direct-ADB is a NEXBILL-team self-hosted scenario, not part of the standard outlet setup (NexbillAgent.exe via Relay). */}
        {form.protocol === "android_tv_adb" && (
          <option value="android_tv_adb">{t("devices.form.protocol.androidTvAdb", "Android TV / Google TV (ADB Jaringan langsung)")}</option>
        )}
      </select>
      {form.protocol === "tasmota_mqtt" && (
        <>
          <input className={cls} placeholder={t("devices.form.mqttTopicPlaceholder", "MQTT Topic (mis. plug_bilik1)")} value={form.mqttTopic} onChange={(e) => setForm({ ...form, mqttTopic: e.target.value })} />
          <input
            className={cls}
            placeholder={t("devices.local.ipPlaceholder", "IP lokal plug (opsional, mis. 192.168.1.23)")}
            value={form.tasmotaLocalIp}
            onChange={(e) => setForm({ ...form, tasmotaLocalIp: e.target.value })}
          />
        </>
      )}
      {form.protocol === "http_generic" && (
        <>
          <input className={cls} placeholder={t("devices.form.httpOnUrlPlaceholder", "URL untuk ON")} value={form.httpOnUrl} onChange={(e) => setForm({ ...form, httpOnUrl: e.target.value })} />
          <input className={cls} placeholder={t("devices.form.httpOffUrlPlaceholder", "URL untuk OFF")} value={form.httpOffUrl} onChange={(e) => setForm({ ...form, httpOffUrl: e.target.value })} />
        </>
      )}
      {form.protocol === "tuya" && (
        <>
          <input className={cls} placeholder={t("devices.form.tuyaDeviceIdPlaceholder", "Tuya Device ID")} value={form.tuyaDeviceId} onChange={(e) => setForm({ ...form, tuyaDeviceId: e.target.value })} />
          <input className={cls} placeholder={t("devices.form.tuyaSwitchCodePlaceholder", "Kode DP Switch (opsional, default switch_1)")} value={form.tuyaSwitchCode} onChange={(e) => setForm({ ...form, tuyaSwitchCode: e.target.value })} />
          {/* Pilihan akun hanya muncul kalau outlet punya lebih dari satu akun Tuya. */}
          {tuyaAccounts.length > 1 && (
            <select className={cls} value={form.tuyaAccountId} onChange={(e) => setForm({ ...form, tuyaAccountId: e.target.value })}>
              <option value="">{t("devices.form.tuyaAccountAuto", "Akun Tuya: Otomatis (dicari sendiri)")}</option>
              {tuyaAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label} ({t("devices.form.tuyaAccountCount", "{n}/{max} perangkat").replace("{n}", String(a.deviceCount)).replace("{max}", String(tuyaTrialLimit))})
                </option>
              ))}
            </select>
          )}
        </>
      )}
      {form.protocol === "android_tv_adb" && (
        <>
          <input className={cls} placeholder={t("devices.form.tvIpPlaceholder", "IP TV (mis. 192.168.1.50)")} value={form.tvIp} onChange={(e) => setForm({ ...form, tvIp: e.target.value })} />
          <input className={cls} placeholder={t("devices.form.tvPortPlaceholder", "Port (default 5555)")} value={form.tvPort} onChange={(e) => setForm({ ...form, tvPort: e.target.value })} />
          <input className={cls} placeholder={t("devices.form.tvAdbPathPlaceholder", "Path adb.exe (opsional, default: adb)")} value={form.tvAdbPath} onChange={(e) => setForm({ ...form, tvAdbPath: e.target.value })} />
        </>
      )}
      {form.protocol === "android_tv_relay" && (
        <>
          {relayAgents.length === 0 ? (
            <div className="col-span-full text-xs text-amber-400">
              {t("devices.form.noRelayAgentsWarning", "Belum ada Relay Agent aktif untuk outlet ini. Hubungi tim NEXBILL untuk aktivasi kontrol TV.")}
            </div>
          ) : (
            <>
              {/* Almost every outlet has exactly one PC running the agent — only ask when there's a real choice to make. */}
              {relayAgents.length > 1 && (
                <select className={cls} value={form.relayAgentId} onChange={(e) => setForm({ ...form, relayAgentId: e.target.value })}>
                  <option value="">{t("devices.form.selectRelayAgent", "— Pilih PC yang terhubung ke TV ini —")}</option>
                  {relayAgents.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} ({a.status === "online" ? t("devices.status.online", "online") : t("devices.status.offline", "offline")})</option>
                  ))}
                </select>
              )}
              <input className={cls} placeholder={t("devices.form.tvIpPlaceholder", "IP TV (mis. 192.168.1.50)")} value={form.tvIp} onChange={(e) => setForm({ ...form, tvIp: e.target.value })} />
              <input className={cls} placeholder={t("devices.form.tvPortPlaceholder", "Port (default 5555)")} value={form.tvPort} onChange={(e) => setForm({ ...form, tvPort: e.target.value })} />
            </>
          )}
        </>
      )}
    </div>
    {form.protocol === "tuya" && tuyaAccounts.length === 0 && (
      <p className="text-[11px] text-amber-400 mt-1">
        {t("devices.form.tuyaNoAccount", "Outlet ini belum punya akun Tuya Cloud API. Tambahkan dulu di Pengaturan → Business & Tax → Integrasi Tuya Cloud API.")}
      </p>
    )}
    {form.protocol === "tuya" && tuyaAccounts.length > 1 && (
      <p className="text-[11px] text-neutral-500 mt-1">
        {t(
          "devices.form.tuyaAccountHint",
          "Outlet ini punya beberapa akun Tuya. Biarkan \"Otomatis\" supaya sistem mencari sendiri akun yang memiliki Device ID ini, atau pilih akunnya kalau sudah tahu."
        )}
      </p>
    )}
    {form.protocol === "tasmota_mqtt" && (
      <p className="text-[11px] text-neutral-500 mt-1">
        {t(
          "devices.local.ipHint",
          "IP lokal dipakai NexbillAgent untuk menyalakan/mematikan plug lewat WiFi saat internet putus. Kosongkan lalu pakai \"Deteksi IP otomatis\" di kartu Kontrol Lokal, dan atur IP tetap (DHCP reservation) untuk plug di router supaya tidak berubah."
        )}
      </p>
    )}
    {form.protocol === "tasmota_mqtt" && (
      <p className="text-[11px] text-neutral-500 mt-1">
        {t(
          "devices.form.mqttTopicUniqueHint",
          "Semua outlet NEXBILL berbagi satu broker MQTT — pastikan MQTT Topic ini unik (tidak sama dengan outlet lain), mis. sertakan nama outlet: \"outletanda_plug_bilik1\". Harus sama persis dengan topic yang diisi di setting Tasmota device-nya."
        )}
      </p>
    )}
    </>
  );
}

// AndroidTvSetupNote, TuyaCloudApiCard, and RelayAgentsCard used to live here.
// They're gone from this outlet-facing page on purpose: hub URL, tokens, and
// ADB protocol details are NEXBILL's own infrastructure knowledge now, not
// something outlets configure themselves.
//  - Relay Agent token minting moved to /platform-admin/relay-agents — NEXBILL
//    support hands the outlet a ready token + the NexbillAgent.exe download.
//  - Tuya Cloud API credentials were already platform-admin-only
//    (/platform-admin/tuya); this page no longer even shows read-only status.
//  - The old ADB pairing walkthrough (install platform-tools, enable Network
//    debugging, approve "Allow debugging?" on the TV) now ships as
//    on-screen console output inside NexbillAgent.exe itself (see
//    nexbill-agent-dist/index.js) — adb.exe is bundled with the exe, so
//    "install platform-tools" no longer applies to outlets at all. The one
//    step that's inherently unavoidable — approving the on-TV popup once —
//    is an Android OS security gate no app can bypass, so it stays, just
//    surfaced by the agent app instead of this web page.
