/** KST scheduling for follow-up messages; never schedule lunch or late weekends. */
const SEOUL_OFFSET = 9 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
export const HAPPY_CALL_DAILY_LIMIT = 50;
export const HAPPY_CALL_MONTHLY_LIMIT = 1500;
export const kstDate = (value: Date) => new Date(value.getTime() + SEOUL_OFFSET);
export const kstDayStart = (value: Date) =>
  new Date(Math.floor((value.getTime() + SEOUL_OFFSET) / DAY) * DAY - SEOUL_OFFSET);
export const kstMonthStart = (value: Date) => {
  const k = kstDate(value);
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), 1) - SEOUL_OFFSET);
};
export const kstNextMonthStart = (value: Date) => {
  const k = kstDate(value);
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth() + 1, 1) - SEOUL_OFFSET);
};
export function permittedHappyCallTime(date: Date) {
  const k = kstDate(date);
  const minutes = k.getUTCHours() * 60 + k.getUTCMinutes();
  const isWeekend = [0, 6].includes(k.getUTCDay());
  return minutes >= 9 * 60 && minutes < (isWeekend ? 18 : 20) * 60 &&
    !(minutes >= 12 * 60 && minutes < 13 * 60);
}
/** Walk one four-minute slot at a time until a legal period is found. */
export function nextHappyCallSlot(date: Date): Date {
  const rounded = new Date(Math.ceil(date.getTime() / 240000) * 240000);
  for (let i = 0; i < 3000; i++) {
    if (permittedHappyCallTime(rounded)) return rounded;
    rounded.setTime(rounded.getTime() + 240000);
  }
  throw new Error("no_available_happycall_slot");
}
export function sixMonthsAfter(date: Date) {
  const k = kstDate(date);
  const day = k.getUTCDate();
  const m = new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth() + 7, 0));
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth() + 6, Math.min(day, m.getUTCDate()), 0, 0, 0) - SEOUL_OFFSET);
}
