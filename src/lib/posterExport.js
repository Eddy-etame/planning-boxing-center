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
// Canonical poster renderer.
//
// This file is the SINGLE source of truth for the printable / downloadable
// posters. Both the on-screen /poster routes and the admin batch export
// (ZIP / PNG / PDF) render from here, so the design can never drift again.
// ---------------------------------------------------------------------------

const INK_DARK = "#0A0D1A";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Shared hero banner (photo + dark treatment + accent ribbon + branding).
function heroHtml({ eyebrow, title }) {
  const size = title.length > 30 ? 30 : title.length > 22 ? 38 : 48;
  return `
    <div style="position:relative;height:230px;width:100%;overflow:hidden;border-radius:18px;margin-bottom:14px;background:url('/header-bg.png') center/cover no-repeat;box-sizing:border-box;">
      <div style="position:absolute;inset:0;background:rgba(10,13,26,0.72);"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(to bottom,rgba(10,13,26,0.5),transparent,${INK_DARK});"></div>
      <div style="position:absolute;inset:0;background:linear-gradient(to right,rgba(10,13,26,0.85),transparent,rgba(10,13,26,0.85));"></div>
      <div style="position:absolute;top:0;left:0;right:0;height:6px;background:linear-gradient(to right,#c9211e,#e0a04a,#244a86);"></div>
      <div style="position:absolute;inset:0;padding:34px 40px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <span style="border:1px solid rgba(255,255,255,0.25);border-radius:999px;padding:7px 16px;font-size:11px;font-weight:900;letter-spacing:0.25em;color:rgba(255,255,255,0.85);text-transform:uppercase;">Saison 2026 — 2027</span>
          <img src="/logo-white.png" crossorigin="anonymous" style="height:56px;object-fit:contain;" />
        </div>
        <div style="text-align:center;padding-bottom:4px;">
          <div style="font-size:12px;font-weight:700;letter-spacing:0.45em;color:#e0a04a;text-transform:uppercase;margin-bottom:12px;">${escapeHtml(eyebrow)}</div>
          <div style="font-size:${size}px;font-weight:900;color:#FFF;text-transform:uppercase;letter-spacing:-0.01em;line-height:1;">${escapeHtml(title)}</div>
          <div style="margin:16px auto 0;height:3px;width:110px;border-radius:999px;background:linear-gradient(to right,#c9211e,#e0a04a);"></div>
        </div>
      </div>
    </div>`;
}

function footerHtml() {
  return `
    <div style="background:#10162b;border-top:1px solid rgba(255,255,255,0.06);padding:14px 32px;display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.45);text-transform:uppercase;">Boxing Center · Toulouse</span>
      <span style="font-size:10px;font-weight:700;letter-spacing:0.2em;color:rgba(255,255,255,0.45);text-transform:uppercase;">Émargement GPS obligatoire en salle</span>
    </div>`;
}

function legendHtml(items) {
  if (!items.length) return "";
  const chips = items
    .map(
      ({ label, color }) => `
      <div style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:999px;padding:4px 14px 4px 6px;">
        <span style="height:14px;width:14px;border-radius:999px;background:${color};box-shadow:0 0 0 1px rgba(255,255,255,0.2);"></span>
        <span style="font-size:10px;font-weight:900;letter-spacing:0.05em;color:rgba(255,255,255,0.8);text-transform:uppercase;">${escapeHtml(label)}</span>
      </div>`
    )
    .join("");
  return `<div style="padding:4px 24px 18px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px;">${chips}</div>`;
}

const ACCES_LIBRE_HTML = `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;letter-spacing:0.15em;color:rgba(255,255,255,0.3);text-transform:uppercase;height:100%;min-height:52px;box-sizing:border-box;">accès libre</div>`;

// Coach posters: an empty slot means the coach has no class — show "REPOS".
const REPOS_HTML = `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;letter-spacing:0.15em;color:rgba(255,255,255,0.3);text-transform:uppercase;height:100%;min-height:52px;box-sizing:border-box;">repos</div>`;

function classCellHtml(activity, sub, bgCol) {
  const ink = readableText(bgCol);
  return `
    <div style="background:linear-gradient(160deg,${bgCol} 0%,${bgCol}e6 100%);color:${ink};border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px;text-align:center;box-shadow:inset 0 0 0 1px rgba(0,0,0,0.1);box-sizing:border-box;height:100%;min-height:52px;">
      <span style="font-size:10px;font-weight:900;text-transform:uppercase;line-height:1.1;word-break:break-word;letter-spacing:0.02em;">${escapeHtml(activity)}</span>
      <span style="font-size:8px;font-weight:700;text-transform:uppercase;margin-top:4px;letter-spacing:0.12em;opacity:0.72;">${escapeHtml(sub)}</span>
    </div>`;
}

// ---------------------------------------------------------------------------
// Gym poster (handles ODS sub-columns + row/col spans via resolveCellState)
// ---------------------------------------------------------------------------
export function buildGymPosterGridHTML({ gymId, sessions, coachColors = {} }) {
  const timeSlots = getTimeSlotsForSessions(sessions);
  const columns = buildColumnDescriptors(gymId);
  const dayGroups = buildDayHeaderGroups(columns);
  const showSubHeader = hasMultipleSubColumns(gymId);

  const thStyle =
    "background:linear-gradient(to bottom,#244a86,#1a3464);border:1px solid " + INK_DARK + ";text-align:center;padding:11px 4px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.18em;color:#FFF;";
  const subThStyle =
    "background:#1a3050;border:1px solid " + INK_DARK + ";text-align:center;padding:4px;font-size:8px;font-weight:900;text-transform:uppercase;color:rgba(255,255,255,0.6);";
  const timeHeadStyle =
    "background:#10162b;border:1px solid " + INK_DARK + ";text-align:center;padding:11px 4px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:0.08em;color:rgba(255,255,255,0.45);width:96px;";
  const timeStyle =
    "background:#10162b;border:1px solid " + INK_DARK + ";font-size:10px;font-weight:900;color:rgba(255,255,255,0.75);text-align:center;padding:8px 4px;vertical-align:middle;width:96px;";
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
        let inner;
        if (!session || session.activity === "ACCES LIBRE") {
          inner = ACCES_LIBRE_HTML;
        } else {
          const bgCol = coachColors[session.coach?.toUpperCase()] || coachColors[session.coach] || "#64748B";
          inner = classCellHtml(session.activity, session.coach, bgCol);
        }
        cells.push(`<td style="${tdStyle}"${rowSpan}${colSpan}>${inner}</td>`);
      }
      return `<tr>${cells.join("")}</tr>`;
    })
    .join("");

  return `<table style="width:100%;border-collapse:collapse;table-layout:fixed;"><thead>${headerRows}</thead><tbody>${bodyRows}</tbody></table>`;
}

export function buildGymPosterContainerHTML({ gymId, gymName, sessions, coachColors = {} }) {
  const legendItems = Array.from(new Set(sessions.map((s) => s.coach)))
    .filter((c) => c && !["ACCES LIBRE", "Non Assigné"].includes(c))
    .sort()
    .map((coach) => ({ label: coach, color: coachColors[coach.toUpperCase()] || coachColors[coach] || "#64748B" }));

  return `
    <div style="width:1200px;background:${INK_DARK};display:flex;flex-direction:column;border-radius:24px;overflow:hidden;box-shadow:0 0 0 1px rgba(255,255,255,0.08);font-family:Montserrat,system-ui,sans-serif;color:#FFF;">
      <div style="padding:14px 14px 0;">${heroHtml({ eyebrow: "Planning des cours", title: gymName.toUpperCase() })}</div>
      <div style="padding:0 14px;">${buildGymPosterGridHTML({ gymId, sessions, coachColors })}</div>
      ${legendHtml(legendItems)}
      ${footerHtml()}
    </div>`;
}

// ---------------------------------------------------------------------------
// Coach poster — one coach's week across every gym (single column per day)
// ---------------------------------------------------------------------------
export function buildCoachPosterContainerHTML({ coachName, sessions, coachColors = {}, getGymName }) {
  const days = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const timeSlots = getTimeSlotsForSessions(sessions);
  const bgCol = coachColors[coachName?.toUpperCase()] || coachColors[coachName] || "#64748B";

  const cleanSlot = (s) => (s || "").replace(/\s+/g, "").replace(/-/g, "/").toLowerCase();
  const matchSlot = (a, b) => a && b && cleanSlot(a) === cleanSlot(b);

  const thStyle =
    "background:linear-gradient(to bottom,#244a86,#1a3464);border:1px solid " + INK_DARK + ";text-align:center;padding:12px 0;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.18em;color:#FFF;border-radius:8px;";
  const timeBoxStyle =
    "background:#10162b;border:1px solid " + INK_DARK + ";border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;color:rgba(255,255,255,0.75);text-align:center;";

  const headerRow = `
    <div style="display:grid;grid-template-columns:96px repeat(6,1fr);gap:6px;margin-bottom:6px;">
      <div style="${timeBoxStyle};color:rgba(255,255,255,0.45);">Horaire</div>
      ${days.map((d) => `<div style="${thStyle}">${escapeHtml(getDayLabel(d))}</div>`).join("")}
    </div>`;

  const gridRows = timeSlots
    .map((time) => {
      const dayCells = days
        .map((day) => {
          const course = sessions.find((c) => c.day === day && matchSlot(c.timeSlot, time) && c.activity !== "ACCES LIBRE");
          if (!course) return REPOS_HTML;
          const salle = getGymName ? getGymName(course.salle) : course.salle;
          return classCellHtml(course.activity, salle, bgCol);
        })
        .join("");
      return `<div style="display:grid;grid-template-columns:96px repeat(6,1fr);gap:6px;">
        <div style="${timeBoxStyle};min-height:52px;">${escapeHtml(time)}</div>${dayCells}
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
      <div style="height:14px;"></div>
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
