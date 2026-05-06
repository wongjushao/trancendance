const ISO_WITH_TIMEZONE = /(?:Z|[+-]\d{2}:?\d{2})$/;

export function normalizeChatTimestamp(value?: string | null): string {
  if (!value) return new Date(0).toISOString();
  const trimmed = value.trim();
  if (!trimmed) return new Date(0).toISOString();

  // The chat service stores UTC datetimes and may serialize them without a
  // timezone suffix. Treat bare ISO datetimes as UTC instead of browser-local.
  if (trimmed.includes('T') && !ISO_WITH_TIMEZONE.test(trimmed)) {
    return `${trimmed}Z`;
  }

  return trimmed;
}

export function chatTimestampMs(value?: string | null): number {
  const time = new Date(normalizeChatTimestamp(value)).getTime();
  return Number.isNaN(time) ? 0 : time;
}

export function formatChatTime(value?: string | null): string {
  return new Date(normalizeChatTimestamp(value)).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatChatDateKey(value?: string | null): string {
  return new Date(normalizeChatTimestamp(value)).toLocaleDateString();
}
