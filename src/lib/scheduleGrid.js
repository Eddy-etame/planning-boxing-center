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

/** Deux plages horaires se chevauchent-elles ? (bornes en minutes) */
function chevauche(a, b) {
  const bornes = (t) => {
    const p = (t || "").split("-");
    const d = parseTime(p[0]);
    return [d, p.length === 2 ? parseTime(p[1]) : d + 60];
  };
  const [d1, f1] = bornes(a);
  const [d2, f2] = bornes(b);
  return d1 < f2 && d2 < f1;
}

/**
 * Une case SEULE dans sa plage doit remplir sa journee.
 *
 * Sur une journee a plusieurs sous-colonnes, une activite sans voisine
 * restait dans sa demi-colonne et laissait un trou. On n'elargit QUE s'il
 * n'existe aucune autre seance du meme jour dont la plage chevauche la
 * sienne : s'il y a une voisine, c'est elle qui occupe le reste.
 */
function elargirSiSeule(session, gymId, sessions) {
  if (!sessions || !sessions.length) return session;
  const total = getDaySubColumnCount(gymId, session.day);
  if (total <= 1) return session;
  const dejaPleine = (session.colSpan || 1) >= total;
  if (dejaPleine) return session;
  const voisine = sessions.some(
    (a) =>
      a !== session &&
      a.day === session.day &&
      (a.period === undefined || a.period === session.period) &&
      chevauche(a.timeSlot, session.timeSlot)
  );
  if (voisine) return session;
  return { ...session, subColumn: 0, colSpan: total };
}

export function getSessionGridBounds(session, columns, timeSlots, gymId, sessions = null) {
  const normalized = normalizeSessionSpan(elargirSiSeule(session, gymId, sessions), gymId);
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
/**
 * LA MATRICE D'OCCUPATION — la grille resolue une fois pour toutes.
 *
 * Chaque case du tableau recoit exactement un etat : `origin` (une seance
 * commence ici), `covered` (une seance venue d'au-dessus ou de gauche
 * l'occupe) ou `empty` (rien, et c'est une information : la salle est
 * fermee ou libre a cette heure-la).
 *
 * On pose les seances de la plus grande a la plus petite, et chacune ne
 * prend que les cases ENCORE libres : une bande d'acces libre ne peut plus
 * avaler un cours qui tombe dedans, et un cours ne peut plus laisser un
 * trou en repoussant la bande. C'est ce croisement, resolu case par case
 * et sans memoire, qui laissait des lignes plus courtes que le tableau.
 */
export function construireMatrice(sessions, columns, timeSlots, gymId) {
  const L = timeSlots.length;
  const C = columns.length;
  const cases = Array.from({ length: L }, () => Array.from({ length: C }, () => ({ kind: "empty" })));

  const boites = sessions
    .map((s) => getSessionGridBounds(s, columns, timeSlots, gymId, sessions))
    .filter(Boolean)
    /* Les plus grandes d'abord : une bande de quatre heures pose son
       territoire, les cours qui tombent dedans prennent ce qui reste. */
    .sort((a, b) => b.colSpan * b.rowSpan - a.colSpan * a.rowSpan);

  for (const b of boites) {
    /* On rabote a ce qui est REELLEMENT libre, en partant du coin haut
       gauche : autant de lignes et de colonnes qu'on peut prendre sans
       marcher sur une case deja prise. */
    let lignes = 0;
    for (let r = b.rowStart; r < Math.min(L, b.rowStart + b.rowSpan); r++) {
      let libre = true;
      for (let c = b.colStart; c < Math.min(C, b.colStart + b.colSpan); c++) {
        if (cases[r][c].kind !== "empty") { libre = false; break; }
      }
      if (!libre) break;
      lignes++;
    }
    if (lignes === 0) continue;   // entierement recouverte : on ne la rend pas deux fois

    let colonnes = 0;
    for (let c = b.colStart; c < Math.min(C, b.colStart + b.colSpan); c++) {
      let libre = true;
      for (let r = b.rowStart; r < b.rowStart + lignes; r++) {
        if (cases[r][c].kind !== "empty") { libre = false; break; }
      }
      if (!libre) break;
      colonnes++;
    }
    if (colonnes === 0) continue;

    for (let r = b.rowStart; r < b.rowStart + lignes; r++) {
      for (let c = b.colStart; c < b.colStart + colonnes; c++) {
        cases[r][c] = r === b.rowStart && c === b.colStart
          ? { kind: "origin", session: b.session, rowSpan: lignes, colSpan: colonnes }
          : { kind: "covered" };
      }
    }
  }
  return cases;
}

export function resolveCellState(sessions, columns, colIndex, timeIndex, timeSlots, gymId) {
  let origin = null;
  let covered = null;

  for (const raw of sessions) {
    const bounds = getSessionGridBounds(raw, columns, timeSlots, gymId, sessions);
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
