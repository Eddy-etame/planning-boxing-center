import {
  buildColumnDescriptors,
  buildDayHeaderGroups,
  getDayLabel,
  getTimeSlotsForSessions,
  hasMultipleSubColumns,
  resolveCellState,
} from "./scheduleGrid";

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderCellHtml(session, coachColors) {
  if (!session || session.activity === "ACCES LIBRE") {
    return `<div style="background-color:rgba(14,18,34,0.4);border:1px solid rgba(30,41,59,0.6);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;text-transform:uppercase;color:rgba(255,255,255,0.1);text-align:center;padding:4px;height:100%;min-height:44px;box-sizing:border-box;">accès libre</div>`;
  }
  const bgCol = coachColors[session.coach?.toUpperCase()] || coachColors[session.coach] || "#475569";
  return `
    <div style="background-color:${bgCol};border:1px solid #020617;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px;text-align:center;box-shadow:0 2px 4px rgba(0,0,0,0.15);box-sizing:border-box;height:100%;min-height:44px;">
      <span style="font-size:9px;font-weight:900;color:#FFF;text-transform:uppercase;line-height:1.1;max-width:100%;word-break:break-word;">${escapeHtml(session.activity)}</span>
      <span style="font-size:8px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-top:4px;letter-spacing:0.05em;">${escapeHtml(session.coach)}</span>
    </div>`;
}

/**
 * Build poster grid HTML matching ScheduleGrid poster variant (ODS sub-columns + spans).
 */
export function buildGymPosterGridHTML({ gymId, sessions, coachColors = {} }) {
  const timeSlots = getTimeSlotsForSessions(sessions);
  const columns = buildColumnDescriptors(gymId);
  const dayGroups = buildDayHeaderGroups(columns);
  const showSubHeader = hasMultipleSubColumns(gymId);

  const thStyle =
    "background-color:#2A4D7E;border:1px solid #1e293b;text-align:center;padding:10px 4px;font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:0.05em;color:#FFF;";
  const subThStyle =
    "background-color:#1a3050;border:1px solid #1e293b;text-align:center;padding:4px;font-size:8px;font-weight:900;text-transform:uppercase;color:rgba(255,255,255,0.6);";
  const timeStyle =
    "background-color:#121829;border:1px solid #0f172a;border-radius:8px;font-size:11px;font-weight:900;color:rgba(255,255,255,0.8);text-align:center;padding:8px 4px;vertical-align:middle;width:72px;";
  const tdStyle = "padding:2px;vertical-align:middle;border:1px solid rgba(30,41,59,0.4);";

  let headerRows = `<tr>
    <th style="${timeStyle.replace("border-radius:8px;", "")} background-color:#121829;color:#64748b;" rowspan="${showSubHeader ? 2 : 1}">Horaire</th>
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
        cells.push(`<td style="${tdStyle}"${rowSpan}${colSpan}>${renderCellHtml(session, coachColors)}</td>`);
      }
      return `<tr>${cells.join("")}</tr>`;
    })
    .join("");

  return `
    <table style="width:100%;border-collapse:collapse;table-layout:fixed;">
      <thead>${headerRows}</thead>
      <tbody>${bodyRows}</tbody>
    </table>`;
}

export function buildGymPosterContainerHTML({ gymId, gymName, sessions, coachColors = {} }) {
  const headerFontSize = gymName.length > 28 ? "22px" : "32px";
  const gridHtml = buildGymPosterGridHTML({ gymId, sessions, coachColors });

  return `
    <div style="width:1200px;min-height:1000px;background:#0A0D1A;display:flex;flex-direction:column;padding:16px;box-sizing:border-box;font-family:Montserrat,sans-serif;color:#FFF;">
      <div style="position:relative;height:200px;width:100%;overflow:hidden;border-bottom:2px solid #020617;border-radius:16px;margin-bottom:16px;background:url('/header-bg.png') center/cover no-repeat;box-sizing:border-box;">
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent,#0A0D1A);opacity:0.95;"></div>
        <div style="position:absolute;inset:0;padding:32px;display:flex;flex-direction:column;justify-content:space-between;box-sizing:border-box;">
          <div style="display:flex;justify-content:space-between;align-items:start;">
            <span style="font-size:20px;font-weight:900;letter-spacing:0.1em;color:rgba(255,255,255,0.9);">2026-2027</span>
            <img src="/logo-light.png" style="height:60px;object-fit:contain;" />
          </div>
          <h2 style="font-size:${headerFontSize};font-weight:900;text-align:center;letter-spacing:0.08em;text-transform:uppercase;margin-bottom:8px;color:#FFF;">
            SALLE ${escapeHtml(gymName.toUpperCase())}
          </h2>
        </div>
      </div>
      <div style="flex-grow:1;display:flex;flex-direction:column;width:100%;box-sizing:border-box;">
        ${gridHtml}
      </div>
    </div>`;
}

/** Coach personal poster — simple 6-day grid (no sub-columns) */
export function buildCoachPosterContainerHTML({ coachName, sessions, coachColors = {}, getGymName }) {
  const timeSlots = getTimeSlotsForSessions(sessions);
  const days = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

  const cleanSlot = (s) => s.replace(/\s+/g, "").replace("-", "/").toLowerCase();
  const matchTimeSlot = (a, b) => a && b && cleanSlot(a) === cleanSlot(b);

  const gridRows = timeSlots
    .map(
      (time) => `
      <div style="display:grid;grid-template-columns:72px repeat(6,1fr);gap:6px;height:100%;min-height:52px;">
        <div style="background-color:#121829;border:1px solid #0f172a;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:rgba(255,255,255,0.8);text-align:center;">${escapeHtml(time)}</div>
        ${days
          .map((day) => {
            const course = sessions.find((c) => c.day === day && matchTimeSlot(c.timeSlot, time));
            if (!course || course.activity === "ACCES LIBRE") {
              return `<div style="background-color:rgba(14,18,34,0.4);border:1px solid rgba(30,41,59,0.6);border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:900;text-transform:uppercase;color:rgba(255,255,255,0.1);">accès libre</div>`;
            }
            const bgCol = coachColors[coachName?.toUpperCase()] || "#475569";
            return `
              <div style="background-color:${bgCol};border:1px solid #020617;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:6px;text-align:center;height:100%;">
                <span style="font-size:9px;font-weight:900;color:#FFF;text-transform:uppercase;line-height:1.1;">${escapeHtml(course.activity)}</span>
                <span style="font-size:8px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;margin-top:4px;">${escapeHtml(getGymName(course.salle).toUpperCase())}</span>
              </div>`;
          })
          .join("")}
      </div>`
    )
    .join("");

  return `
    <div style="width:1000px;min-height:1000px;background:#0A0D1A;display:flex;flex-direction:column;padding:16px;box-sizing:border-box;font-family:Montserrat,sans-serif;color:#FFF;">
      <div style="position:relative;height:220px;width:100%;overflow:hidden;border-bottom:2px solid #020617;border-radius:16px;margin-bottom:16px;background:url('/header-bg.png') center/cover no-repeat;">
        <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent,#0A0D1A);opacity:0.95;"></div>
        <div style="position:absolute;inset:0;padding:32px;display:flex;flex-direction:column;justify-content:space-between;">
          <div style="display:flex;justify-content:space-between;align-items:start;">
            <span style="font-size:20px;font-weight:900;letter-spacing:0.1em;color:rgba(255,255,255,0.9);">2026-2027</span>
            <img src="/logo-light.png" style="height:60px;object-fit:contain;" />
          </div>
          <h2 style="font-size:36px;font-weight:900;text-align:center;letter-spacing:0.08em;text-transform:uppercase;color:#FFF;">COACH ${escapeHtml(coachName.toUpperCase())}</h2>
        </div>
      </div>
      <div style="flex-grow:1;display:flex;flex-direction:column;gap:6px;">
        <div style="display:grid;grid-template-columns:72px repeat(6,1fr);gap:6px;margin-bottom:6px;">
          <div style="background-color:#121829;border:1px solid #1e293b;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:900;text-transform:uppercase;color:#64748b;">Horaire</div>
          ${days.map((d) => `<div style="background-color:#2A4D7E;border:1px solid #1e293b;text-align:center;padding:12px 0;border-radius:8px;font-size:11px;font-weight:900;text-transform:uppercase;color:#FFF;">${escapeHtml(d)}</div>`).join("")}
        </div>
        ${gridRows}
      </div>
    </div>`;
}

export async function capturePosterElement(container, scale = 2) {
  const html2canvas = (await import("html2canvas")).default;
  document.body.appendChild(container);
  try {
    return await html2canvas(container, { scale, useCORS: true, backgroundColor: "#0A0D1A" });
  } finally {
    document.body.removeChild(container);
  }
}

export function createPosterContainer(html, width = "1200px") {
  const el = document.createElement("div");
  el.style.cssText = `position:fixed;left:-9999px;top:-9999px;width:${width};background:#0A0D1A;`;
  el.innerHTML = html;
  return el;
}
