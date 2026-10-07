import { describe, it, expect } from "vitest";
import { planDeviceCommands, type SentDeviceState } from "./local-devices";
import type { LocalUnit, LocalSession } from "./engine";

const T0 = Date.parse("2026-10-07T10:00:00.000Z");
const MIN = 60_000;

function session(over: Partial<LocalSession> = {}): LocalSession {
  return {
    id: "s1",
    rentalUnitId: "u1",
    customerName: null,
    startedAt: new Date(T0).toISOString(),
    status: "running",
    pausedAt: null,
    accumulatedPauseMs: 0,
    plannedMinutes: 60,
    extendedMinutes: 0,
    ratePerHour: 10000,
    promoId: null,
    promoPackagePrice: null,
    discountAmount: 0,
    origin: "offline",
    items: [],
    paidTotal: 0,
    ...over,
  };
}

const unit = (s: LocalSession | null, id = "u1"): LocalUnit => ({ id, name: id, consoleType: "PS5", hourlyRate: 10000, status: s ? "occupied" : "available", hasDevice: true, session: s });
const covered = { u1: "agent-1" };

describe("planDeviceCommands", () => {
  it("turns the device on with the remaining time when a session starts offline", () => {
    const plans = planDeviceCommands([unit(session())], {}, covered, T0 + 10 * MIN);
    expect(plans).toEqual([{ unitId: "u1", body: { power: "on", remainingMs: 50 * MIN }, next: { sessionId: "s1", status: "running", endsAt: T0 + 60 * MIN } }]);
  });

  it("only hands over the timer for a session that was already running before the outage", () => {
    const plans = planDeviceCommands([unit(session({ origin: "server", plannedMinutes: null }))], {}, covered, T0);
    expect(plans[0].body).toEqual({ remainingMs: null });
  });

  it("sends nothing when nothing changed, a new timer on extend, and stops the timer on pause", () => {
    const sent: Record<string, SentDeviceState> = { u1: { sessionId: "s1", status: "running", endsAt: T0 + 60 * MIN } };
    expect(planDeviceCommands([unit(session())], sent, covered, T0 + MIN)).toEqual([]);
    expect(planDeviceCommands([unit(session({ extendedMinutes: 30 }))], sent, covered, T0 + MIN)[0].body).toEqual({ remainingMs: 89 * MIN });
    expect(planDeviceCommands([unit(session({ status: "paused", pausedAt: new Date(T0).toISOString() }))], sent, covered, T0 + MIN)[0].body).toEqual({ remainingMs: null });
  });

  it("turns the device back on when a paused session resumes", () => {
    const sent: Record<string, SentDeviceState> = { u1: { sessionId: "s1", status: "paused", endsAt: null } };
    const plans = planDeviceCommands([unit(session({ accumulatedPauseMs: 5 * MIN }))], sent, covered, T0 + 15 * MIN);
    expect(plans[0].body).toEqual({ power: "on", remainingMs: 50 * MIN });
  });

  it("turns the device off when the session ends, but never touches idle units it never controlled", () => {
    const sent: Record<string, SentDeviceState> = { u1: { sessionId: "s1", status: "running", endsAt: T0 + 60 * MIN } };
    expect(planDeviceCommands([unit(null)], sent, covered, T0)[0]).toEqual({ unitId: "u1", body: { power: "off" }, next: { sessionId: null, status: null, endsAt: null } });
    expect(planDeviceCommands([unit(null)], {}, covered, T0)).toEqual([]);
    expect(planDeviceCommands([unit(session(), "u2")], {}, covered, T0)).toEqual([]); // not controlled by any agent
  });
});
