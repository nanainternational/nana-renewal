import assert from "node:assert/strict";
import test from "node:test";
import { generateScheduledTimes, resumeScheduleStart } from "./sms-schedule.ts";

const start = new Date("2026-08-27T09:00:00+09:00");
const end = new Date("2026-08-27T18:00:00+09:00");

test("미래 예약을 재개해도 원래 시작일 전에는 발송하지 않는다", () => {
  const now = new Date("2026-08-26T12:00:00+09:00");
  const resumed = resumeScheduleStart(start, now);
  assert.equal(resumed.getTime(), start.getTime());
  assert.ok(generateScheduledTimes(resumed, end, 100).every((value) => value > start && value < end));
});

test("이미 시작된 예약은 현재 이후부터 남은 시간에 분배한다", () => {
  const now = new Date("2026-08-27T12:00:00+09:00");
  const resumed = resumeScheduleStart(start, now);
  assert.equal(resumed.getTime(), now.getTime() + 2_000);
  assert.ok(generateScheduledTimes(resumed, end, 100).every((value) => value > now && value < end));
});

test("100개 스케줄이 순서대로 시작과 종료 사이에 생성된다", () => {
  let seed = 0;
  const schedule = generateScheduledTimes(
    start,
    end,
    100,
    () => ((seed++ * 37) % 100) / 100,
  );
  assert.equal(schedule.length, 100);
  assert.ok(schedule.every((value) => value > start && value < end));
  assert.ok(
    schedule.every(
      (value, index) => index === 0 || value > schedule[index - 1],
    ),
  );
  assert.ok(new Set(schedule.map((value) => value.getUTCSeconds())).size > 10);
});

test("50개의 평균 슬롯 간격은 100개보다 길다", () => {
  const durationSeconds = (end.getTime() - start.getTime()) / 1_000;
  assert.equal(durationSeconds / 100, 324);
  assert.equal(durationSeconds / 50, 648);
  assert.equal(generateScheduledTimes(start, end, 50, () => 0.5).length, 50);
});

test("10건 제외 후 실제 승인 90건으로 다시 계산한다", () => {
  const schedule = generateScheduledTimes(start, end, 90, () => 0.5);
  assert.equal(schedule.length, 90);
  assert.equal((end.getTime() - start.getTime()) / 1_000 / schedule.length, 360);
});

test("공간이 부족하면 스케줄을 생성하지 않는다", () => {
  assert.throws(
    () => generateScheduledTimes(start, new Date(start.getTime() + 999), 1),
    /insufficient_schedule_window/,
  );
});
