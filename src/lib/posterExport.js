import {
  buildColumnDescriptors,
  buildDayHeaderGroups,
  getDayLabel,
  getTimeSlotsForSessions,
  hasMultipleSubColumns,
  readableText,
  resolveCellState,
} from "./scheduleGrid";

// ---------------------------------------------------------------------------
// Canonical poster renderer (the SINGLE source of truth for printable /
// downloadable posters). Used by the on-screen /poster routes AND the admin
// batch export, so the design can never drift.
//
// Public-facing rule (per the coaching staff): cells are coloured BY LESSON
// TYPE (discipline) — never by coach — and coach names are never shown.
// ---------------------------------------------------------------------------

const INK_DARK = "#0A0D1A";

// Curated discipline palette. Order matters: first match wins.
const DISCIPLINES = [
  { label: "Lady", color: "#EC4899", test: /LADY/ },
  { label: "Compétition", color: "#DC2626", test: /COMP[EÉ]TITEUR|AMATEURS ET PRO|\bPRO\b|CONFIRMES/ },
  { label: "Boxing Camp", color: "#F59E0B", test: /BOXING CAMP/ },
  { label: "MMA / Grappling", color: "#8B5CF6", test: /MMA|GRAPPLING|\bJJB\b|JIU-JITSU/ },
  { label: "École de Boxe", color: "#0EA5E9", test: /BABY BOXE|EDUCATIVE|PIEDS POINGS.*(3\/6|7\/11|12\/16)/ },
  { label: "Cross / Fitness", color: "#10B981", test: /CROSS|HYROX|HIIT|PR[EÉ]PA|\bFIT\b/ },
  { label: "Pieds-Poings / Kick", color: "#F97316", test: /THA[ÏI]|KICK|K1|PIEDS POINGS|FRANCAISE/ },
  { label: "Boxe Anglaise", color: "#3B82F6", test: /ANGLAISE|SPARRING/ },
  { label: "Cours Été", color: "#CA8A04", test: /COURS ETE/ },
];
const DEFAULT_DISCIPLINE = { label: "Autre", color: "#64748B" };

export function disciplineOf(activity) {
  const a = (activity || "").toUpperCase();
  return DISCIPLINES.find((d) => d.test.test(a)) || DEFAULT_DISCIPLINE;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Shared hero banner (photo + cinematic dark treatment + accent ribbon).
function heroHtml({ eyebrow, title }) {
  const size = title.length > 30 ? 30 : title.length > 22 ? 38 : 48;
  return `
    <div style="position:relative;height:230px;width:100%;overflow:hidden;border-radius:18px;margin-bottom:14px;background:url('/header-bg.png') center/cover no-repeat;box-sizing:border-box;">
      <div style="position:absolute;inset:0;background:rgba(10,13,26,0.74);"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(10,13,26,0.55),transparent,${INK_DARK});"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(to right,rgba(10,13,26,0.85),transparent,rgba(10,13,26,0.85));"></div>
      <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(to right,#DC2626,#F59E0B,#3B82F6);"></div>
      <div style="position:absolute;inset:0;padding:34px 40px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <span style="border:1px solid rgba(255,255,255,0.25);border-radius:999px;padding:7px 16px;font-size:11px;font-weight:900;letter-spacing:0.25em;color:rgba(255,255,255,0.9);text-transform:uppercase;">Saison 2026 — 2027</span>
          <img src="/logo-white.png" crossorigin="anonymous" style="height:56px;object-fit:contain;" />
        </div>
        <div style="text-align:center;padding-bottom:4px;">
          <div style="font-size:12px;font-weight:800;letter-spacing:0.45em;color:#FBBF24;text-transform:uppercase;margin-bottom:12px;">${escapeHtml(eyebrow)}</div>
          <div style="font-size:${size}px;font-weight:900;color:#FFF;text-transform:uppercase;letter-spacing:-0.01em;line-height:1;text-shadow:0 2px 20px rgba(0,0,0,0.5);">${escapeHtml(title)}</div>
          <div style="margin:16px auto 0;height:3px;width:110px;border-radius:999px;background:linear-gradient(to right,#DC2626,#F59E0B);"></div>
        </div>
      </div>
    </div>`;
}

function footerHtml() {
  return `
    <div style="background:#0c1224;border-top:1px solid rgba(255,255,255,0.06);padding:14px 32px;display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:10px;font-weight:800;letter-spacing:0.2em;color:rgba(255,255,255,0.5);text-transform:uppercase;">Boxing Center · Toulouse</span>
      <span style="font-size:10px;font-weight:800;letter-spacing:0.2em;color:rgba(255,255,255,0.5);text-transform:uppercase;">boxingcenter.fr</span>
    </div>`;
}

// Legend of the disciplines actually present in this poster.
function disciplineLegendHtml(sessions) {
  const present = new Map();
  for (const s of sessions) {
    if (!s.activity || s.activity === "ACCES LIBRE") continue;
    const d = disciplineOf(s.activity);
    present.set(d.label, d.color);
  }
  // Preserve the palette's canonical order.
  const ordered = DISCIPLINES.filter((d) => present.has(d.label));
  if (!ordered.length) return "";
  const chips = ordered
    .map(
      (d) => `
      <div style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:999px;padding:5px 15px 5px 7px;">
        <span style="height:13px;width:13px;border-radius:999px;background:${d.color};box-shadow:0 0 0 1px rgba(255,255,255,0.25);"></span>
        <span style="font-size:10px;font-weight:900;letter-spacing:0.05em;color:rgba(255,255,255,0.88);text-transform:uppercase;">${escapeHtml(d.label)}</span>
      </div>`
    )
    .join("");
  return `<div style="padding:6px 24px 18px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:9px;">${chips}</div>`;
}

const ACCES_LIBRE_HTML = `<div style="background:rgba(255,255,255,0.025);border:1px solid rgba(255,255,255,0.05);border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;letter-spacing:0.18em;color:rgba(255,255,255,0.28);text-transform:uppercase;height:100%;min-height:54px;box-sizing:border-box;">accès libre</div>`;

// A class cell coloured by discipline. `sub` is optional (used on coach posters
// to show the venue); gym posters pass no sub so nothing identifies the coach.
function classCellHtml(activity, sub) {
  const { color } = disciplineOf(activity);
  const ink = readableText(color);
  const subHtml = sub
    ? `<span style="font-size:8px;font-weight:800;text-transform:uppercase;margin-top:4px;letter-spacing:0.12em;opacity:0.78;">${escapeHtml(sub)}</span>`
    : "";
  return `
    <div style="background:linear-gradient(155deg,${color} 0%,${color}d9 100%);color:${ink};border-radius:9px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:7px 6px;text-align:center;box-shadow:inset 0 0 0 1px rgba(255,255,255,0.12),0 4px 10px rgba(0,0,0,0.18);box-sizing:border-box;height:100%;min-height:54px;">
      <span style="font-size:10.5px;font-weight:900;text-transform:uppercase;line-height:1.12;word-break:break-word;letter-spacing:0.02em;">${escapeHtml(activity)}</span>
      ${subHtml}
    </div>`;
}

// ---------------------------------------------------------------------------
// Gym poster (handles ODS sub-columns + row/col spans via resolveCellState)
// ---------------------------------------------------------------------------
export function buildGymPosterGridHTML({ gymId, sessions }) {
  const timeSlots = getTimeSlotsForSessions(sessions);
  const columns = buildColumnDescriptors(gymId);
  const dayGroups = buildDayHeaderGroups(columns);
  const showSubHeader = hasMultipleSubColumns(gymId);

  const thStyle =
    "background:linear-gradient(to bottom,#1f3a63,#152a4d);border:1px solid " + INK_DARK + ";text-align:center;padding:12px 4px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.18em;color:#FFF;";
  const subThStyle =
    "background:#16263f;border:1px solid " + INK_DARK + ";text-align:center;padding:4px;font-size:8px;font-weight:900;text-transform:uppercase;color:rgba(255,255,255,0.55);";
  const timeHeadStyle =
    "background:#0c1326;border:1px solid " + INK_DARK + ";text-align:center;padding:12px 4px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.4);width:96px;";
  const timeStyle =
    "background:#0c1326;border:1px solid " + INK_DARK + ";font-size:10px;font-weight:900;color:rgba(255,255,255,0.72);text-align:center;padding:8px 4px;vertical-align:middle;width:96px;";
  const tdStyle = "padding:4px;vertical-align:middle;";

  let headerRows = `<tr>
    <th style="${timeHeadStyle}" rowspan="${showSubHeader ? 2 : 1}">Horaire</th>
    ${dayGroups.map((g) => `<th style="${thStyle}" colspan="${g.count}">${escapeHtml(getDayLabel(g.day))}</th>`).join("")}
  </tr>`;

  if (showSubHeader) {
    headerRows += `<tr>${columns
      .map((col) => {
        const multi = dayGroups.find((g) => g.day === col.day)?.count > 1;
        return `<th style="${subThStyle}">${multi ? col.subColumn + 1 : ""}</th>`;
      })
      .join("")}</tr>`;
  }

  const bodyRows = timeSlots
    .map((time, timeIndex) => {
      const cells = [`<td style="${timeStyle}">${escapeHtml(time)}</td>`];
      for (const col of columns) {
        const state = resolveCellState(sessions, columns, col.colIndex, timeIndex, timeSlots, gymId);
        if (state.kind === "covered") continue;
        const rowSpan = state.kind === "origin" && state.rowSpan > 1 ? ` rowspan="${state.rowSpan}"` : "";
        const colSpan = state.kind === "origin" && state.colSpan > 1 ? ` colspan="${state.colSpan}"` : "";
        const session = state.kind === "origin" ? state.session : null;
        const inner = !session || session.activity === "ACCES LIBRE" ? ACCES_LIBRE_HTML : classCellHtml(session.activity);
        cells.push(`<td style="${tdStyle}"${rowSpan}${colSpan}>${inner}</td>`);
      }
      return `<tr>${cells.join("")}</tr>`;
    })
    .join("");

  return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><thead>${headerRows}</thead><tbody>${bodyRows}</tbody></table>`;
}

export function buildGymPosterContainerHTML({ gymId, gymName, sessions }) {
  return `
    <div style="width:1200px;background:${INK_DARK};display:flex;flex-direction:column;border-radius:24px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,0.08);font-family:Montserrat,system-ui,sans-serif;color:#FFF;">
      <div style="padding:14px 14px 0;">${heroHtml({ eyebrow: "Planning des cours", title: gymName.toUpperCase() })}</div>
      <div style="padding:0 14px;">${buildGymPosterGridHTML({ gymId, sessions })}</div>
      ${disciplineLegendHtml(sessions)}
      ${footerHtml()}
    </div>`;
}

// ---------------------------------------------------------------------------
// Coach poster — one coach's week across every gym (single column per day).
// Still coloured by discipline; shows the venue (never another coach's name).
// ---------------------------------------------------------------------------
export function buildCoachPosterContainerHTML({ coachName, sessions, getGymName }) {
  const days = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const timeSlots = getTimeSlotsForSessions(sessions);

  const cleanSlot = (s) => (s || "").replace(/\s+/g, "").replace(/-/g, "/").toLowerCase();
  const matchSlot = (a, b) => a && b && cleanSlot(a) === cleanSlot(b);

  const thStyle =
    "background:linear-gradient(to bottom,#1f3a63,#152a4d);border:1px solid " + INK_DARK + ";text-align:center;padding:12px 0;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.18em;color:#FFF;border-radius:9px;";
  const timeBoxStyle =
    "background:#0c1326;border:1px solid " + INK_DARK + ";border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:rgba(255,255,255,0.72);text-align:center;";

  const headerRow = `
    <div style="display:grid;grid-template-columns:96px repeat(6,1fr);gap:6px;margin-bottom:6px;">
      <div style="${timeBoxStyle};color:rgba(255,255,255,0.4);">Horaire</div>
      ${days.map((d) => `<div style="${thStyle}">${escapeHtml(getDayLabel(d))}</div>`).join("")}
    </div>`;

  const gridRows = timeSlots
    .map((time) => {
      const dayCells = days
        .map((day) => {
          const course = sessions.find((c) => c.day === day && matchSlot(c.timeSlot, time) && c.activity !== "ACCES LIBRE");
          if (!course) return ACCES_LIBRE_HTML;
          const salle = getGymName ? getGymName(course.salle) : course.salle;
          return classCellHtml(course.activity, salle);
        })
        .join("");
      return `<div style="display:grid;grid-template-columns:96px repeat(6,1fr);gap:6px;">
        <div style="${timeBoxStyle};min-height:54px;">${escapeHtml(time)}</div>${dayCells}
      </div>`;
    })
    .join("");

  return `
    <div style="width:1100px;background:${INK_DARK};display:flex;flex-direction:column;border-radius:24px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,0.08);font-family:Montserrat,system-ui,sans-serif;color:#FFF;">
      <div style="padding:14px 14px 0;">${heroHtml({ eyebrow: "Planning du coach", title: "COACH " + coachName.toUpperCase() })}</div>
      <div style="padding:0 14px;display:flex;flex-direction:column;gap:6px;">
        ${headerRow}
        ${gridRows}
      </div>
      ${disciplineLegendHtml(sessions)}
      ${footerHtml()}
    </div>`;
}

// ---------------------------------------------------------------------------
// html2canvas helpers (used by admin batch export)
// ---------------------------------------------------------------------------
export async function capturePosterElement(container, scale = 2) {
  const html2canvas = (await import("html2canvas")).default;
  document.body.appendChild(container);
  try {
    return await html2canvas(container, { scale, useCORS: true, backgroundColor: INK_DARK });
  } finally {
    document.body.removeChild(container);
  }
}

export function createPosterContainer(html, width = "1200px") {
  const el = document.createElement("div");
  el.style.cssText = `position:fixed;left:-9999px;top:-9999px;width:${width};background:${INK_DARK};`;
  el.innerHTML = html;
  return el;
}
