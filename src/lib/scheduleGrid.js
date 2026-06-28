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

export function getDaySubColumnCount(gymId, day) {
  const sub = getSubColumns(gymId);
  return sub?.[day] || 1;
}

export function getTotalColumns(gymId) {
  const sub = getSubColumns(gymId);
  if (!sub) return DEFAULT_DAYS.length;
  return DEFAULT_DAYS.reduce((sum, day) => sum + (sub[day] || 1), 0);
}

/** Build column descriptors: [{ day, subColumn, key, colIndex }] */
export function buildColumnDescriptors(gymId) {
  const sub = getSubColumns(gymId);
  if (!sub) {
    return DEFAULT_DAYS.map((day, colIndex) => ({ day, subColumn: 0, key: day, colIndex }));
  }
  const cols = [];
  let colIndex = 0;
  for (const day of DEFAULT_DAYS) {
    const count = sub[day] || 1;
    for (let sc = 0; sc < count; sc++) {
      cols.push({ day, subColumn: sc, key: `${day}-${sc}`, colIndex: colIndex++ });
    }
  }
  return cols;
}

/** Group columns by day for header colspan */
export function buildDayHeaderGroups(columns) {
  const groups = [];
  let i = 0;
  while (i < columns.length) {
    const day = columns[i].day;
    let count = 0;
    while (i + count < columns.length && columns[i + count].day === day) {
      count++;
    }
    groups.push({ day, count, startIndex: i });
    i += count;
  }
  return groups;
}

export function hasMultipleSubColumns(gymId) {
  const sub = getSubColumns(gymId);
  if (!sub) return false;
  return Object.values(sub).some((n) => n > 1);
}

export function getTimeSlotsForSessions(sessions) {
  const slots = sortTimeSlots(Array.from(new Set(sessions.map((c) => c.timeSlot))));
  return slots.length > 0 ? slots : ["10h-12h", "12h40-13h20", "18h20-19h", "19h-20h", "20h-21h15"];
}

/**
 * Normalize full-width ODS cells that were anchored on the last sub-column.
 */
export function normalizeSessionSpan(session, gymId) {
  const daySubs = getDaySubColumnCount(gymId, session.day);
  const sc = session.subColumn ?? 0;
  const cs = session.colSpan || 1;
  if (cs >= daySubs && sc > 0) {
    return { ...session, subColumn: 0, colSpan: daySubs };
  }
  if (cs > daySubs - sc) {
    return { ...session, colSpan: Math.max(1, daySubs - sc) };
  }
  return session;
}

export function getSessionColStart(session, columns) {
  return columns.findIndex(
    (c) => c.day === session.day && c.subColumn === (session.subColumn ?? 0)
  );
}

/** Effective colspan capped to remaining sub-columns for that day */
export function getEffectiveColSpan(session, columns, colStart) {
  const cs = session.colSpan || 1;
  const day = session.day;
  let count = 0;
  for (let i = colStart; i < columns.length && columns[i].day === day && count < cs; i++) {
    count++;
  }
  return Math.max(1, count);
}

export function getSessionGridBounds(session, columns, timeSlots, gymId) {
  const normalized = normalizeSessionSpan(session, gymId);
  const colStart = getSessionColStart(normalized, columns);
  if (colStart < 0) return null;
  const rowStart = timeSlots.findIndex((t) => matchTimeSlot(t, normalized.timeSlot));
  if (rowStart < 0) return null;
  const colSpan = getEffectiveColSpan(normalized, columns, colStart);
  const rowSpan = normalized.rowSpan || 1;
  return {
    session: normalized,
    colStart,
    rowStart,
    colSpan,
    rowSpan,
    colEnd: colStart + colSpan,
    rowEnd: rowStart + rowSpan,
  };
}

/**
 * Resolve what to render at grid position (colIndex, timeIndex).
 * Returns { kind: 'origin'|'covered'|'empty', session?, rowSpan?, colSpan? }
 */
export function resolveCellState(sessions, columns, colIndex, timeIndex, timeSlots, gymId) {
  let origin = null;
  let covered = null;

  for (const raw of sessions) {
    const bounds = getSessionGridBounds(raw, columns, timeSlots, gymId);
    if (!bounds) continue;

    const inRect =
      colIndex >= bounds.colStart &&
      colIndex < bounds.colEnd &&
      timeIndex >= bounds.rowStart &&
      timeIndex < bounds.rowEnd;

    if (!inRect) continue;

    const isOrigin = colIndex === bounds.colStart && timeIndex === bounds.rowStart;
    if (isOrigin) {
      if (!origin || bounds.colSpan * bounds.rowSpan > origin.colSpan * origin.rowSpan) {
        origin = bounds;
      }
    } else if (!covered) {
      covered = bounds;
    }
  }

  if (origin) {
    return {
      kind: "origin",
      session: origin.session,
      rowSpan: origin.rowSpan,
      colSpan: origin.colSpan,
    };
  }
  if (covered) {
    return { kind: "covered", session: covered.session };
  }
  return { kind: "empty" };
}

/**
 * @deprecated Use resolveCellState — kept for compatibility
 */
export function findSession(sessions, { day, subColumn = 0, timeSlot, timeIndex, timeSlots, gymId = null, columns = null }) {
  if (columns && timeIndex != null && timeSlots && gymId) {
    const colIndex = columns.findIndex((c) => c.day === day && c.subColumn === subColumn);
    if (colIndex < 0) return { session: null, isSpanContinuation: false };
    const state = resolveCellState(sessions, columns, colIndex, timeIndex, timeSlots, gymId);
    if (state.kind === "origin") return { session: state.session, isSpanContinuation: false };
    if (state.kind === "covered") return { session: state.session, isSpanContinuation: true };
    return { session: null, isSpanContinuation: false };
  }

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
