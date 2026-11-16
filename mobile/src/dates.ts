export function localDate(timezone: string, instant = new Date()) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const v = (k: string) => parts.find((p) => p.type === k)!.value;
  return `${v("year")}-${v("month")}-${v("day")}`;
}
export function shiftDate(day: string, amount: number) {
  const timestamp = Date.parse(day + "T12:00:00Z");
  if (Number.isNaN(timestamp)) return localDate("Asia/Colombo");
  return new Date(timestamp + amount * 86400000).toISOString().slice(0, 10);
}
