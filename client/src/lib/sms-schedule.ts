export function koreaDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function koreaScheduleRange(date: string, startTime: string, endTime: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      ![startTime, endTime].every((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)))
    return null;
  const startsAt = new Date(`${date}T${startTime}:00+09:00`);
  const endsAt = new Date(`${date}T${endTime}:00+09:00`);
  if (!Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) ||
      koreaDate(startsAt) !== date || endsAt <= startsAt)
    return null;
  return { startsAt, endsAt };
}
