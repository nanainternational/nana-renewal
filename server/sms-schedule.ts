import crypto from "crypto";

/** 각 슬롯 내부 10~90% 지점에 jitter를 주어 순서를 지키면서 종료 전에 배치한다. */
export function generateScheduledTimes(
  start: Date,
  end: Date,
  count: number,
  random = () => crypto.randomInt(0, 1_000_000) / 1_000_000,
) {
  const duration = end.getTime() - start.getTime();
  if (!Number.isInteger(count) || count < 1 || duration < count * 1_000)
    throw new Error("insufficient_schedule_window");
  const slot = duration / count;
  return Array.from({ length: count }, (_, index) => {
    const jitter = 0.1 + random() * 0.8;
    return new Date(start.getTime() + (index + jitter) * slot);
  });
}
