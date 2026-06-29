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

  const parts = normalized.timeSlot.split("-");
  const startTime = parseTime(parts[0]);
  const endTime = parts.length === 2 ? parseTime(parts[1]) : startTime + 60;

  const rowStart = timeSlots.findIndex(t => {
      const p = t.split("-");
      return parseTime(p[0]) === startTime;
  });
  if (rowStart < 0) return null;

  let uiRowSpan = 1;
  for (let i = rowStart + 1; i < timeSlots.length; i++) {
    const tStart = parseTime(timeSlots[i].split("-")[0]);
    if (tStart >= endTime) break;
    uiRowSpan++;
  }
  const colSpan = getEffectiveColSpan(normalized, columns, colStart);
  return {
    session: normalized,
    colStart,
    rowStart,
    colSpan,
    rowSpan: uiRowSpan,
    colEnd: colStart + colSpan,
    rowEnd: rowStart + uiRowSpan,
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

    // Detect if this bounds is overlapping with another session that starts LATER or is smaller, and if so, we should truncate it?
    // Actually, HTML table breaking only happens if we emit a <td colSpan> and then LATER in the SAME row we emit another <td> that wasn't accounted for.
    // The easiest way to fix HTML table overlap is:
    // If we are covered by a previous rowSpan, we just DON'T emit the origin!
    // But then the user doesn't see HYROX!
    // So if HYROX is an origin, it MUST truncate the ACCES LIBRE's rowSpan!
    // Wait, if ACCES LIBRE's rowSpan is truncated, it doesn't cover HYROX anymore.
    // Since we evaluate cell by cell in ScheduleGrid, we can't retroactively truncate.
    // Instead, we just let ScheduleGrid handle it, BUT we can cap `rowSpan` dynamically!

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
    let safeRowSpan = origin.rowSpan;
    let safeColSpan = origin.colSpan;

    // Look ahead to check for collisions with other origins to prevent HTML table layout breaking
    for (const raw of sessions) {
      if (raw === origin.session) continue;
      const other = getSessionGridBounds(raw, columns, timeSlots, gymId);
      if (!other) continue;

      // If the other session starts strictly after us, but within our rowSpan, and overlaps our columns
      if (
        other.rowStart > origin.rowStart &&
        other.rowStart < origin.rowStart + safeRowSpan &&
        other.colStart >= origin.colStart &&
        other.colStart < origin.colStart + safeColSpan
      ) {
        // Truncate our rowSpan so we don't overlap the other origin!
        safeRowSpan = other.rowStart - origin.rowStart;
      }

      // If the other session starts in the SAME row, but strictly after our colStart
      if (
        other.rowStart === origin.rowStart &&
        other.colStart > origin.colStart &&
        other.colStart < origin.colStart + safeColSpan
      ) {
        safeColSpan = other.colStart - origin.colStart;
      }
    }

    return {
      kind: "origin",
      session: origin.session,
      rowSpan: safeRowSpan,
      colSpan: safeColSpan,
      style: { height: `${safeRowSpan * 4}rem` }
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

/** Pick black or white text for legible contrast against a hex background. */
export function readableText(hex) {
  if (!hex || hex[0] !== "#" || hex.length < 7) return "#ffffff";
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#0A0D1A" : "#ffffff";
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
