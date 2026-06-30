/** India Standard Time (Asia/Kolkata) formatting for API timestamps. */

const TZ = 'Asia/Kolkata';

/** Parse API datetime — supports +05:30, Z (legacy UTC), or naive UTC. */
export function parseApiDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  const s = String(value).trim();
  if (!s) return null;
  if (/[+-]\d{2}:\d{2}$/.test(s) || s.endsWith('Z')) {
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  // Legacy naive UTC from older records
  const d = new Date(`${s}Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** dd/mm/yyyy or dd/mm/yyyy HH:mm IST */
export function formatIST(value, { dateOnly = false } = {}) {
  const d = parseApiDate(value);
  if (!d) return '—';

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...(dateOnly ? {} : { hour: '2-digit', minute: '2-digit', hour12: false }),
  }).formatToParts(d);

  const get = (type) => parts.find((p) => p.type === type)?.value || '';
  const dateStr = `${get('day')}/${get('month')}/${get('year')}`;
  if (dateOnly) return dateStr;
  return `${dateStr} ${get('hour')}:${get('minute')} IST`;
}

export function formatISTDate(value) {
  return formatIST(value, { dateOnly: true });
}

/** Topbar / dashboard — e.g. "Sun, 28 Jun 2026, 2:30 pm IST" */
export function formatISTNow(date = new Date()) {
  return date.toLocaleString('en-IN', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }) + ' IST';
}

export function formatISTLongDate(date = new Date()) {
  return date.toLocaleDateString('en-IN', {
    timeZone: TZ,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
