import dayjs from "dayjs";

export function getCalendarDays(month) {
  const firstDay = dayjs(`${month}-01`);
  const gridStart = firstDay.startOf("month").subtract(firstDay.day(), "day");

  return Array.from({ length: 42 }, (_, index) => gridStart.add(index, "day"));
}
