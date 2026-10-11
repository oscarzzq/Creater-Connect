// Demo clock: all mock data is relative to this date so the story stays coherent
// and server/client renders match.
export const TODAY = new Date("2026-10-08T09:30:00");

const DAY = 86_400_000;

export function compact(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}K`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return `${Math.round(n)}`;
}

export function usd(n: number, cents = false) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: cents ? 2 : 0,
    minimumFractionDigits: cents ? 2 : 0,
  });
}

export function pct(n: number, digits = 0) {
  return `${n.toFixed(digits)}%`;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function shortDate(iso: string | Date) {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

export function daysBetween(a: string | Date, b: string | Date) {
  const da = typeof a === "string" ? new Date(a) : a;
  const db = typeof b === "string" ? new Date(b) : b;
  const start = new Date(da.getFullYear(), da.getMonth(), da.getDate()).getTime();
  const end = new Date(db.getFullYear(), db.getMonth(), db.getDate()).getTime();
  return Math.round((end - start) / DAY);
}

/** "today", "yesterday", "3d ago", "in 5d" relative to the demo clock. */
export function relative(iso: string) {
  const d = daysBetween(TODAY, iso);
  if (d === 0) return "today";
  if (d === -1) return "yesterday";
  if (d === 1) return "tomorrow";
  if (d < 0) return `${-d}d ago`;
  return `in ${d}d`;
}

export function daysFromToday(offset: number, time = "10:00") {
  const d = new Date(TODAY.getTime() + offset * DAY);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}T${time}:00`;
}

export const COUNTRY_NAMES: Record<string, string> = {
  US: "United States",
  CA: "Canada",
  GB: "United Kingdom",
  AU: "Australia",
  MX: "Mexico",
  IN: "India",
  KR: "South Korea",
  NG: "Nigeria",
  IE: "Ireland",
  BR: "Brazil",
  DE: "Germany",
  FR: "France",
};

export const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸", CA: "🇨🇦", GB: "🇬🇧", AU: "🇦🇺", MX: "🇲🇽", IN: "🇮🇳", KR: "🇰🇷", NG: "🇳🇬", IE: "🇮🇪", BR: "🇧🇷", DE: "🇩🇪", FR: "🇫🇷",
};

export function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function plural(n: number, word: string, pluralWord = `${word}s`) {
  return `${n} ${n === 1 ? word : pluralWord}`;
}
