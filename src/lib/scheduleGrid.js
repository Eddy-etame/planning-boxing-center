import { gymGridConfig } from "@/data/plannings";

export const DEFAULT_DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export function parseTime(s) {
  if (!s) return 0;
  const match = s.match(/(\d+)h(\d*)/i);
  if (!match) return 0;
  return parseInt(match[1], 10) * 60 + (match[2] ? parseInt(match[2], 10) : 0);
}

export function sortTimeSlots(slots) {
  return [...slots].sort((a, b) => parseTime(a) - parseTime(b));
}

export function cleanSlot(s) {
  return (s || "").replace(/\s+/g, "").replace(/-/g, "/").toLowerCase();
}

export function matchTimeSlot(slot1, slot2) {
  if (!slot1 || !slot2) return false;
  return cleanSlot(slot1) === cleanSlot(slot2);
}

export function getGymDays(gymId, sessions) {
  const hasSunday = sessions.some((s) => s.day === "dimanche");
  return hasSunday ? [...DEFAULT_DAYS, "dimanche"] : DEFAULT_DAYS;
}

export function getSubColumns(gymId) {
  return gymGridConfig[gymId]?.subColumns || null;
}

export function getTotalColumns(gymId) {
  const sub = getSubColumns(gymId);
  if (!sub) return DEFAULT_DAYS.length;
  return DEFAULT_DAYS.reduce((sum, day) => sum + (sub[day] || 1), 0);
}

/** Build column descriptors: [{ day, subColumn, key }] */
export function buildColumnDescriptors(gymId) {
  const sub = getSubColumns(gymId);
  if (!sub) {
    return DEFAULT_DAYS.map((day) => ({ day, subColumn: 0, key: day }));
  }
  const cols = [];
  for (const day of DEFAULT_DAYS) {
    const count = sub[day] || 1;
    for (let sc = 0; sc < count; sc++) {
      cols.push({ day, subColumn: sc, key: `${day}-${sc}` });
    }
  }
  return cols;
}

export function getTimeSlotsForSessions(sessions) {
  const slots = sortTimeSlots(Array.from(new Set(sessions.map((c) => c.timeSlot))));
  return slots.length > 0 ? slots : ["10h-12h", "12h40-13h20", "18h20-19h", "19h-20h", "20h-21h15"];
}

/**
 * Find session at grid position, respecting subColumn and rowSpan coverage.
 */
export function findSession(sessions, { day, subColumn = 0, timeSlot, timeIndex, timeSlots }) {
  const direct = sessions.find(
    (c) =>
      c.day === day &&
      (c.subColumn ?? 0) === subColumn &&
      matchTimeSlot(c.timeSlot, timeSlot)
  );
  if (direct) return { session: direct, isSpanContinuation: false };

  if (timeIndex == null || !timeSlots) return { session: null, isSpanContinuation: false };

  for (let i = timeIndex - 1; i >= 0; i--) {
    const prevSlot = timeSlots[i];
    const spanSession = sessions.find(
      (c) =>
        c.day === day &&
        (c.subColumn ?? 0) === subColumn &&
        matchTimeSlot(c.timeSlot, prevSlot) &&
        (c.rowSpan || 1) > 1
    );
    if (spanSession) {
      const span = spanSession.rowSpan || 1;
      if (timeIndex - i < span) {
        return { session: spanSession, isSpanContinuation: true };
      }
    }
  }
  return { session: null, isSpanContinuation: false };
}

export function getDayLabel(day) {
  const labels = {
    lundi: "Lundi",
    mardi: "Mardi",
    mercredi: "Mercredi",
    jeudi: "Jeudi",
    vendredi: "Vendredi",
    samedi: "Samedi",
    dimanche: "Dimanche",
  };
  return labels[day] || day;
}
