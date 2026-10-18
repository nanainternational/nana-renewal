import assert from "node:assert/strict";
import test from "node:test";
import { koreaDate, koreaScheduleRange } from "./sms-schedule.ts";

test("한국 자정 경계에서 오늘 날짜가 바뀐다", () => {
  assert.equal(koreaDate(new Date("2026-10-18T14:59:59Z")), "2026-10-18");
  assert.equal(koreaDate(new Date("2026-10-18T15:00:00Z")), "2026-10-19");
});

test("선택한 미래 날짜와 한국시간을 정확한 UTC 시각으로 변환한다", () => {
  const range = koreaScheduleRange("2026-12-31", "09:00", "18:00");
  assert.equal(range.startsAt.toISOString(), "2026-12-31T00:00:00.000Z");
  assert.equal(range.endsAt.toISOString(), "2026-12-31T09:00:00.000Z");
  assert.equal(koreaScheduleRange("2027-01-01", "00:05", "01:00").startsAt.toISOString(), "2026-12-31T15:05:00.000Z");
});

test("빈 값, 잘못된 날짜와 시간, 역순 시간을 거부하며 윤년은 허용한다", () => {
  for (const args of [
    ["", "09:00", "18:00"], ["2026-02-30", "09:00", "18:00"],
    ["2026-02-29", "09:00", "18:00"], ["2026-13-01", "09:00", "18:00"],
    ["2026-10-19", "", "18:00"], ["2026-10-19", "24:00", "25:00"],
    ["2026-10-19", "09:60", "18:00"], ["2026-10-19", "18:00", "09:00"],
    ["2026-10-19", "09:00", "09:00"],
  ]) assert.equal(koreaScheduleRange(...args), null, args.join(" "));
  assert.ok(koreaScheduleRange("2028-02-29", "09:00", "18:00"));
});
