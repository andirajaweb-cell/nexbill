"use client";
import { useEffect, useState } from "react";
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
}

interface RentalUnit {
  id: string;
  name: string;
  deviceId: string | null;
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

/** Pulls { deviceId, switchCode } out of a device's config JSON — malformed/empty config just reads as "unset" rather than throwing. */
function parseTuyaConfig(config: string | null): { deviceId: string; switchCode: string } {
  if (!config) return { deviceId: "", switchCode: "" };
  try {
    const parsed = JSON.parse(config);
    return { deviceId: parsed.deviceId ?? "", switchCode: parsed.switchCode ?? "" };
  } catch {
    return { deviceId: "", switchCode: "" };
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

const emptyForm = {
  name: "",
  protocol: "tasmota_mqtt",
  mqttTopic: "",
  httpOnUrl: "",
  httpOffUrl: "",
  httpStatusUrl: "",
  tuyaDeviceId: "",
  tuyaSwitchCode: "",
  tvIp: "",
  tvPort: "5555",
  tvAdbPath: "",
  relayAgentId: "",
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
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyForm);

  const load = () => {
    fetchJsonArray<Device>("/api/devices").then(setDevices);
    fetchJsonArray<RentalUnit>("/api/rental-units").then(setUnits);
    if (outletId) fetchJsonArray<RelayAgent>(`/api/settings/relay-agents?outletId=${outletId}`).then(setRelayAgents);
  };
  const { data: outlet } = useApi<{ id: string }>("/api/outlets/default");
  useEffect(() => {
    if (outlet) setOutletId(outlet.id);
  }, [outlet]);
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { load(); }, [outletId]);

  const buildConfig = (f: typeof emptyForm) => {
    if (f.protocol === "tuya" && (f.tuyaDeviceId || f.tuyaSwitchCode)) {
      return JSON.stringify({ deviceId: f.tuyaDeviceId || undefined, switchCode: f.tuyaSwitchCode || undefined });
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
  };

  const toggle = async (id: string, on: boolean) => {
    const res = await fetch(`/api/devices/${id}/toggle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ on }),
    });
    if (!res.ok) {
      const err = await res.json();
      showAlert(err.error);
    }
    load();
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
      tvIp: tvCfg.ip,
      tvPort: tvCfg.port || "5555",
      tvAdbPath: tvCfg.adbPath,
      relayAgentId: tvCfg.relayAgentId,
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
  };

  const deleteDevice = async (d: Device) => {
    if (!(await showConfirm(t("devices.confirm.deleteDevice", 'Hapus perangkat "{name}"? Unit rental yang terhubung ke perangkat ini akan otomatis dilepas.').replace("{name}", d.name)))) return;
    const res = await fetch(`/api/devices/${d.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return showAlert(data.error);
    load();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="gm-display text-2xl font-bold gm-gradient-title">{t("devices.pageTitle", "Kontrol Perangkat (Smart Plug & TV)")}</h1>
        <p className="text-sm text-neutral-500">
          {t("devices.pageSubtitle", "Default: Tasmota via MQTT (kontrol lokal, tanpa cloud pihak ketiga). Bisa juga pakai HTTP generik, Tuya, eWeLink, atau TV (Android/Google TV) via aplikasi NexbillAgent — install sekali di PC outlet, lalu cukup isi IP TV di sini.")}
          {!canManage && t("devices.pageSubtitleViewOnly", " Kamu hanya bisa menyalakan/mematikan — hanya role tertentu yang bisa tambah/edit/hapus perangkat.")}
        </p>
      </div>

      {canManage && <DeviceSetupGuide />}

      {canManage && (
        <Card>
          <h2 className="font-medium mb-3">{t("devices.addDevice", "Tambah Perangkat")}</h2>
          <DeviceFormFields form={form} setForm={setForm} relayAgents={relayAgents} />
          <Button className="mt-2" onClick={addDevice}>{t("devices.addDevice", "Tambah Perangkat")}</Button>
        </Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices.map((d) => (
          <Card key={d.id} className="space-y-2">
            {editingId === d.id ? (
              <div className="space-y-2">
                <DeviceFormFields form={editForm} setForm={setEditForm} relayAgents={relayAgents} compact />
                <div className="flex gap-2">
                  <Button className="text-xs" onClick={() => saveEdit(d.id)}>{t("devices.action.save", "Simpan")}</Button>
                  <Button variant="ghost" className="text-xs" onClick={cancelEdit}>{t("devices.action.cancel", "Batal")}</Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{d.name}</div>
                  <Badge status={d.lastKnownState}>{d.lastKnownState}</Badge>
                </div>
                <div className="text-xs text-neutral-500">
                  {PROTOCOL_LABEL_KEYS[d.protocol] ? t(PROTOCOL_LABEL_KEYS[d.protocol].key, PROTOCOL_LABEL_KEYS[d.protocol].fallback) : d.protocol}
                  {d.mqttTopic ? ` · ${d.mqttTopic}` : ""}
                  {d.protocol === "tuya" && parseTuyaConfig(d.config).deviceId ? ` · ${parseTuyaConfig(d.config).deviceId}` : ""}
                  {(d.protocol === "android_tv_adb" || d.protocol === "android_tv_relay") && parseAndroidTvConfig(d.config).ip
                    ? ` · ${parseAndroidTvConfig(d.config).ip}:${parseAndroidTvConfig(d.config).port || "5555"}`
                    : ""}
                  {d.protocol === "android_tv_relay" && parseAndroidTvConfig(d.config).relayAgentId
                    ? ` · via ${relayAgents.find((a) => a.id === parseAndroidTvConfig(d.config).relayAgentId)?.name ?? t("devices.relayNotFound", "agent tidak ditemukan")}`
                    : ""}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" className="flex-1 text-xs" onClick={() => toggle(d.id, true)}>{t("devices.action.turnOn", "Nyalakan")}</Button>
                  <Button variant="secondary" className="flex-1 text-xs" onClick={() => toggle(d.id, false)}>{t("devices.action.turnOff", "Matikan")}</Button>
                </div>
                {canManage && (
                  <div className="flex gap-2 pt-1 border-t border-neutral-800">
                    <button className="text-xs text-emerald-400 hover:underline" onClick={() => startEdit(d)}>{t("devices.action.edit", "Edit")}</button>
                    <button className="text-xs text-red-400 hover:underline" onClick={() => deleteDevice(d)}>{t("devices.action.delete", "Hapus")}</button>
                  </div>
                )}
              </>
            )}
          </Card>
        ))}
        {devices.length === 0 && <div className="text-sm text-neutral-500">{t("devices.empty", "Belum ada perangkat. Tambah perangkat pertama di atas.")}</div>}
      </div>

      <Card>
        <h2 className="font-medium mb-3">{t("devices.linkToUnit.heading", "Hubungkan Perangkat ke Unit Rental")}</h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-500 border-b border-neutral-800">
              <th className="py-2">{t("devices.table.unit", "Unit Rental")}</th>
              <th>{t("devices.table.device", "Perangkat")}</th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => (
              <tr key={u.id} className="border-b border-neutral-900">
                <td className="py-2">{u.name}</td>
                <td>
                  <select
                    className={inputCls}
                    value={u.deviceId ?? ""}
                    onChange={(e) => assignToUnit(u.id, e.target.value)}
                    disabled={!canManage}
                  >
                    <option value="">{t("devices.table.notLinked", "— Belum terhubung —")}</option>
                    {devices.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

/** Shared Add/Edit form fields — protocol-specific inputs switch based on `form.protocol`. */
function DeviceFormFields({
  form,
  setForm,
  relayAgents,
  compact,
}: {
  form: typeof emptyForm;
  setForm: (f: typeof emptyForm) => void;
  relayAgents: RelayAgent[];
  compact?: boolean;
}) {
  const { t } = useDashboardLang();
  const cls = compact ? `${inputCls} text-xs px-2 py-1.5` : inputCls;
  return (
    <div className={`grid grid-cols-2 ${compact ? "" : "sm:grid-cols-3"} gap-2`}>
      <input className={cls} placeholder={t("devices.form.namePlaceholder", "Nama (mis. Plug Bilik 1)")} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <select className={cls} value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })}>
        <option value="tasmota_mqtt">{t("devices.form.protocol.tasmota", "Tasmota (MQTT)")}</option>
        <option value="http_generic">{t("devices.form.protocol.httpGeneric", "HTTP Generik (mis. Shelly)")}</option>
        <option value="tuya">{t("devices.form.protocol.tuya", "Tuya Smart Life")}</option>
        <option value="sonoff_ewelink">{t("devices.form.protocol.ewelink", "Sonoff eWeLink")}</option>
        <option value="android_tv_relay">{t("devices.form.protocol.tv", "TV (Android/Google TV)")}</option>
        {/* Legacy option — only appears while editing a device that already uses it. Not offered for new devices; direct-ADB is a NEXBILL-team self-hosted scenario, not part of the standard outlet setup (NexbillAgent.exe via Relay). */}
        {form.protocol === "android_tv_adb" && (
          <option value="android_tv_adb">{t("devices.form.protocol.androidTvAdb", "Android TV / Google TV (ADB Jaringan langsung)")}</option>
        )}
      </select>
      {form.protocol === "tasmota_mqtt" && (
        <input className={cls} placeholder={t("devices.form.mqttTopicPlaceholder", "MQTT Topic (mis. plug_bilik1)")} value={form.mqttTopic} onChange={(e) => setForm({ ...form, mqttTopic: e.target.value })} />
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
