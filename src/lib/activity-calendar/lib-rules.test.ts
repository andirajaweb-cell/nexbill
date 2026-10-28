import { describe, expect, it } from "vitest";
import { competitionLabel, libNeedsSync, parseCurrentWeek, parseFixturesPage, wibToUtc } from "./lib-rules";

/** Potongan HTML asli ligaindonesiabaru.com (diambil 2026-10-28): satu laga terjadwal, satu laga selesai. */
const SCHEDULED = `<div align="left" style="margin-top:10px" class="col-md-12">
        Jumat, 30 Oktober 2026</div>
<a class="table-row" href="https://www.ligaindonesiabaru.com/result/detail/BRI_SUPER_LEAGUE_2026-27/2026-10-30/JAVA_UNITED_FC/BHAYANGKARA_PRESISI_LAMPUNG_FC">
        <div style="border:0" class="table-cell">
            <table class="table-striped table-hover table-responsive" style="border:0;color: black;">
                <tbody><tr height="25" class="table-row" style="kground-color: white;font-size: 14px">
                    <td style="border:0" width="25%" align="right">
                        <b>JAVA UNITED FC</b>
                    </td>
                    <td style="border:0;padding:0; margin:0;" width="2%">
                        <img src="https://assets.ileague.id/uploads/images/logo/95/h/50/1819851379.png" style="border: none;" width="30" alt="">
                    </td>
                    <td style="border:0;">
                        <span class="badge badge-secondary" style="background-color: #17a2b8;color: white;font-size: 15px">15:30</span>                    </td>
                    <td style="border:0;padding:0; margin:0;" width="2%">
                        <img src="https://assets.ileague.id/uploads/images/logo/95/h/50/30.png" style="border: none" width="30" alt="">
                    </td>
                    <td style="border:0" width="25%" align="left">
                        <b>BHAYANGKARA PRESISI LAMPUNG FC</b>
                    </td>
                    <td style="border:0" width="30%" align="left">
                        Jatidiri                    </td>
                    <td style="border:0;" width="10%" align="center">
                                                                        &nbsp;
                                                                    </td>
                </tr>
            </tbody></table>
        </div>
    </a>`;

const FINISHED = `<a class="table-row" href="https://www.ligaindonesiabaru.com/result/detail/BRI_SUPER_LEAGUE_2026-27/2026-10-24/PSS_SLEMAN_/PSM_MAKASSAR">
        <div style="border:0" class="table-cell"><table><tbody><tr>
                    <td style="border:0" width="25%" align="right"><b>PSS SLEMAN </b></td>
                    <td style="border:0;"><span class="badge badge-secondary" style="background-color: #17a2b8;color: white;font-size: 15px"><span style="font-size:14px;color:#efff00;">FT</span> 0:0</span>                    </td>
                    <td style="border:0" width="25%" align="left"><b>PSM MAKASSAR</b></td>
                    <td style="border:0" width="30%" align="left">Maguwoharjo</td>
                    <td style="border:0;" width="10%" align="center"><img class="broadcast-logo" src="https://assets.ileague.id/assets/img/sponsors/INDOSIAR.png" width="40"></td>
        </tr></tbody></table></div>
    </a>`;

describe("jadwal liga Indonesia (situs resmi operator liga)", () => {
  it("laga terjadwal: tanggal, kick-off WIB → UTC, tim, stadion", () => {
    const [f] = parseFixturesPage(SCHEDULED);
    expect(f).toMatchObject({
      competition: "BRI_SUPER_LEAGUE_2026-27",
      date: "2026-10-30",
      kickoffUtc: "2026-10-30T08:30:00.000Z",
      homeTeam: "JAVA UNITED FC",
      awayTeam: "BHAYANGKARA PRESISI LAMPUNG FC",
      venue: "Jatidiri",
      finished: false,
    });
  });
  it("laga selesai tidak punya jam di halaman → jam tidak dikarang", () => {
    const [f] = parseFixturesPage(FINISHED);
    expect(f).toMatchObject({ date: "2026-10-24", kickoffUtc: null, finished: true, homeTeam: "PSS SLEMAN", awayTeam: "PSM MAKASSAR" });
  });
  it("id stabil & tanpa duplikat", () => {
    const list = parseFixturesPage(SCHEDULED + SCHEDULED + FINISHED);
    expect(list).toHaveLength(2);
    expect(list[0].matchId).toBe("lib:BRI_SUPER_LEAGUE_2026-27:2026-10-30:JAVA_UNITED_FC:BHAYANGKARA_PRESISI_LAMPUNG_FC");
  });
  it("pekan berjalan dari tautan Jadwal di beranda; label kompetisi", () => {
    expect(parseCurrentWeek(`<a href="https://www.ligaindonesiabaru.com/fixtures/index/BRI_SUPER_LEAGUE_2026-27/8/0">Jadwal</a>`)).toEqual({ competition: "BRI_SUPER_LEAGUE_2026-27", week: 8 });
    expect(parseCurrentWeek("<html></html>")).toBeNull();
    expect(competitionLabel("BRI_SUPER_LEAGUE_2026-27")).toBe("BRI Super League 2026-27");
  });
  it("WIB → UTC melewati tengah malam; jam tidak valid ditolak", () => {
    expect(wibToUtc("2026-11-01", "03:00")).toBe("2026-10-31T20:00:00.000Z");
    expect(wibToUtc("2026-11-01", "TBC")).toBeNull();
    expect(wibToUtc("2026-11-01", "25:00")).toBeNull();
  });
  it("sinkron tiap 12 jam, jeda 1 jam setelah gagal", () => {
    const now = Date.parse("2026-10-28T12:00:00Z");
    expect(libNeedsSync(null, null, null, now)).toBe(true);
    expect(libNeedsSync("2026-10-28T06:00:00Z", null, null, now)).toBe(false);
    expect(libNeedsSync("2026-10-27T20:00:00Z", null, null, now)).toBe(true);
    expect(libNeedsSync("2026-10-27T20:00:00Z", "2026-10-28T11:30:00Z", "2026-10-28T11:30:01Z", now)).toBe(false);
  });
});
