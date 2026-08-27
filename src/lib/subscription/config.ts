import { DeviceProtocol } from "@/lib/devices/types";

/** Trial window length — see subscriptions.trialStartedAt/trialEndsAt in schema.ts. */
export const TRIAL_DAYS = 30;

/**
 * Protocols that imply physical smart-plug hardware (Tuya-family cloud plugs,
 * Tasmota/Sonoff MQTT/HTTP plugs) — entirely blocked during trial, since the
 * business rule is "beli smart plug dulu baru bisa pakai jalur ini", not just
 * a quantity limit like Android TV gets. See assertDeviceAllowed() below.
 */
export const SMART_PLUG_PROTOCOLS: DeviceProtocol[] = ["tuya", "tasmota_mqtt", "sonoff_ewelink", "http_generic"];

/** Android-TV-family protocols (direct ADB or via Relay Agent) — allowed during trial, capped at 1 device. */
export const ANDROID_TV_PROTOCOLS: DeviceProtocol[] = ["android_tv_adb", "android_tv_relay"];

/** Reminder checkpoints the daily scheduler fires before trialEndsAt, in days-remaining. */
export const TRIAL_REMINDER_DAYS = [5, 2, 0] as const;

/** Days after currentPeriodEnd a renewal invoice may go unpaid before status flips from "grace" to "suspended". */
export const RENEWAL_GRACE_DAYS = 5;

/** How many days before currentPeriodEnd the scheduler generates + sends the next renewal invoice. */
export const RENEWAL_INVOICE_LEAD_DAYS = 7;
