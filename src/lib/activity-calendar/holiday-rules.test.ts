import { describe, expect, it } from "vitest";
import {
  classifyHoliday,
  datesInRange,
  effectiveHolidayCountry,
  googleCalendarId,
  holidayNeedsSync,
  isDayOff,
  mergeHolidays,
  parseApiEvents,
  parseIcs,
  syncWindow,
} from "./holiday-rules";
import { defaultAcademicTitle, isExam, parseAcademicInput } from "./academic-rules";

/** Bentuk feed iCal publik Google Calendar (dipersingkat). */
const ICS_EN = [
  "BEGIN:VCALENDAR",
  "PRODID:-//Google Inc//Google Calendar 70.9054//EN",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20260817",
  "DTEND;VALUE=DATE:20260818",
  "UID:20260817_abc@google.com",
  "SUMMARY:Indonesian Independence Day",
  "DESCRIPTION:Public holiday",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20260320",
  "DTEND;VALUE=DATE:20260322",
  "UID:20260320_idul@google.com",
  "SUMMARY:Idul Fitri",
  "DESCRIPTION:Public holiday\\nTo hide observances\\, go to Google Calendar Settings",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20260323",
  "DTEND;VALUE=DATE:20260324",
  "UID:20260323_cuti@google.com",
  "SUMMARY:Cuti Bersama Idul Fitri",
  "DESCRIPTION:Observance",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20261222",
  "DTEND;VALUE=DATE:20261223",
  "UID:20261222_ibu@google.com",
  "SUMMARY:Mother's Day",
  "DESCRIPTION:Observance",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART;VALUE=DATE:20261225",
  "UID:20261225_xmas@google.com",
  "SUMMARY:Christmas Day long name that is folded acro",
  " ss two lines",
  "DESCRIPTION:Public holiday",
  "END:VEVENT",
  "BEGIN:VEVENT",
  "DTSTART:bukan-tanggal",
  "UID:broken@google.com",
  "SUMMARY:Rusak",
  "END:VEVENT",
  "END:VCALENDAR",
].join("\r\n");

const ICS_ID = ["BEGIN:VCALENDAR", "BEGIN:VEVENT", "DTSTART;VALUE=DATE:20260817", "DTEND;VALUE=DATE:20260818", "UID:20260817_abc@google.com", "SUMMARY:Hari Kemerdekaan Indonesia", "DESCRIPTION:Hari libur nasional", "END:VEVENT", "END:VCALENDAR"].join("\r\n");

describe("Libur nasional (Google Calendar)", () => {
  it("ID kalender publik Google", () => {
    expect(googleCalendarId("id", "indonesian")).toBe("id.indonesian#holiday@group.v.calendar.google.com");
  });

  it("negara efektif: pilihan → negara outlet → ID", () => {
    expect(effectiveHolidayCountry("th", "ID")).toBe("TH");
    expect(effectiveHolidayCountry(null, "MY")).toBe("MY");
    expect(effectiveHolidayCountry("XX", "US")).toBe("ID");
  });

  it("mengurai iCal: tanggal, akhir eksklusif, baris lanjutan, escape, event rusak dibuang", () => {
    const ev = parseIcs(ICS_EN);
    expect(ev).toHaveLength(5);
    expect(ev[1]).toMatchObject({ start: "2026-03-20", endExclusive: "2026-03-22" });
    expect(ev[4].summary).toBe("Christmas Day long name that is folded across two lines");
    expect(ev[4].endExclusive).toBe("2026-12-26");
    expect(ev[1].description).toContain("observances, go");
  });

  it("mengurai respons API events.list", () => {
    const ev = parseApiEvents({
      items: [
        { id: "a", iCalUID: "20260817_abc@google.com", summary: "Independence Day", description: "Public holiday", start: { date: "2026-08-17" }, end: { date: "2026-08-18" } },
        { id: "b", summary: "Batal", status: "cancelled", start: { date: "2026-01-01" }, end: { date: "2026-01-02" } },
        { id: "c", summary: "Jam", start: { dateTime: "2026-01-01T10:00:00Z" } },
      ],
    });
    expect(ev).toHaveLength(1);
    expect(ev[0].uid).toBe("20260817_abc@google.com");
  });

  it("klasifikasi: libur resmi, cuti bersama, peringatan", () => {
    expect(classifyHoliday("Independence Day", "Public holiday")).toBe("public");
    expect(classifyHoliday("Cuti Bersama Idul Fitri", "Observance")).toBe("joint_leave");
    expect(classifyHoliday("Mother's Day", "Observance")).toBe("observance");
    expect(classifyHoliday("Something", "")).toBe("other");
    expect(isDayOff("public") && isDayOff("joint_leave") && !isDayOff("observance")).toBe(true);
  });

  it("menggabungkan nama lokal lewat UID, akhir tanggal inklusif", () => {
    const rows = mergeHolidays("ID", parseIcs(ICS_EN), parseIcs(ICS_ID));
    const merdeka = rows.find((r) => r.date === "2026-08-17")!;
    expect(merdeka.name).toBe("Hari Kemerdekaan Indonesia");
    expect(merdeka.nameEn).toBe("Indonesian Independence Day");
    expect(merdeka.id).toBe("ID:20260817_abc@google.com");
    const lebaran = rows.find((r) => r.date === "2026-03-20")!;
    expect(lebaran.endDate).toBe("2026-03-21");
    expect(lebaran.name).toBe("Idul Fitri");
  });

  it("jadwal sinkron 24 jam, jeda 1 jam setelah gagal", () => {
    const now = Date.parse("2026-11-01T10:00:00Z");
    expect(holidayNeedsSync(null, null, now)).toBe(true);
    expect(holidayNeedsSync("2026-11-01T01:00:00Z", "2026-11-01T01:00:00Z", now)).toBe(false);
    expect(holidayNeedsSync("2026-10-30T09:00:00Z", "2026-10-30T09:00:00Z", now)).toBe(true);
    expect(holidayNeedsSync("2026-10-30T09:00:00Z", "2026-11-01T09:30:00Z", now)).toBe(false);
    expect(holidayNeedsSync("2026-10-30T09:00:00Z", "2026-11-01T08:30:00Z", now)).toBe(true);
  });

  it("jendela sinkron & tanggal dalam rentang", () => {
    expect(syncWindow("2026-11-01")).toEqual({ from: "2025-01-01", to: "2027-12-31" });
    expect(datesInRange("2026-03-30", "2026-04-02", "2026-04-01", "2026-04-30")).toEqual(["2026-04-01", "2026-04-02"]);
  });
});

describe("Kalender akademik outlet", () => {
  it("validasi masukan", () => {
    const ok = parseAcademicInput({ level: "smp", kind: "midterm", title: "", startDate: "2026-10-05", endDate: "2026-10-10" });
    expect(ok.ok && ok.value.title).toBe("UTS SMP");
    expect(parseAcademicInput({ level: "smp", kind: "midterm", startDate: "2026-10-10", endDate: "2026-10-05" }).ok).toBe(false);
    expect(parseAcademicInput({ level: "x", kind: "midterm", startDate: "2026-10-05", endDate: "2026-10-05" }).ok).toBe(false);
    expect(parseAcademicInput({ level: "sd", kind: "school_holiday", startDate: "2026-01-01", endDate: "2026-06-30" }).ok).toBe(false);
    expect(parseAcademicInput({ level: "sd", kind: "school_holiday", startDate: "2026-02-30", endDate: "2026-03-01" }).ok).toBe(false);
  });

  it("judul bawaan", () => {
    expect(defaultAcademicTitle("kuliah", "school_holiday")).toBe("Libur kuliah");
    expect(defaultAcademicTitle("sma", "final_exam")).toBe("UAS SMA/SMK");
    expect(defaultAcademicTitle("all", "school_holiday")).toBe("Libur sekolah");
    expect(isExam("midterm") && isExam("final_exam") && !isExam("school_holiday")).toBe(true);
  });
});
