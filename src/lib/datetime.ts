/** Stable date formatting — avoids SSR/client locale hydration drift. */

const manila = { timeZone: "Asia/Manila" } as const;

function asDate(value: string | Date) {
  return typeof value === "string" ? new Date(value) : value;
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-CA", {
    ...manila,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(asDate(value));
}

export function formatDateShort(value: string | Date) {
  return new Intl.DateTimeFormat("en-GB", {
    ...manila,
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(asDate(value));
}

export function formatDateTime(value: string | Date) {
  const d = asDate(value);
  return `${formatDate(d)} ${new Intl.DateTimeFormat("en-GB", {
    ...manila,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d)}`;
}
