/******************** Constants ********************/

export const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/******************** Helpers ********************/

export function formatPeriod(month, year) {
  return `${MONTHS[month - 1] || month} | ${year}`;
}

/******************** New: Commute Helpers **************************/
export function compareCommutesDesc(a, b) {
  // a.startTime might be "YYYY-MM-DD HH:mm:ss"
  // Convert to something Date can parse consistently
  const aStr = String(a.startTime || "").replace(" ", "T");
  const bStr = String(b.startTime || "").replace(" ", "T");

  const aMs = new Date(aStr).getTime();
  const bMs = new Date(bStr).getTime();

  if (!Number.isFinite(aMs) || !Number.isFinite(bMs)) return 0; //prevent the .sort from failing if suddenly string is empty
  return bMs - aMs;
}
