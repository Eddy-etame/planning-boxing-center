"use client";

import {
  DEFAULT_DAYS,
  buildColumnDescriptors,
  buildDayHeaderGroups,
  getDayLabel,
  getGymDays,
  getTimeSlotsForSessions,
  hasMultipleSubColumns,
  parseTime,
  readableText,
  resolveCellState,
} from "@/lib/scheduleGrid";

export default function ScheduleGrid({
  gymId,
  sessions,
  coachColors = {},
  variant = "dashboard",
  onAddSlot,
  onDeleteSlot,
  onChangeCoach,
  allCoaches = [],
}) {
  const timeSlots = getTimeSlotsForSessions(sessions);
  const columns = buildColumnDescriptors(gymId);
  const dayGroups = buildDayHeaderGroups(columns);
  const showSubHeader = hasMultipleSubColumns(gymId);

  // Mobile (below md): a per-day list is far more readable than a 900px table
  // that can only be horizontally scrolled. Only used for the viewing dashboard.
  const renderMobileList = () => {
    const days = getGymDays(gymId, sessions);
    return (
      <div className="md:hidden space-y-4">
        {days.map((day) => {
          const dayClasses = sessions
            .filter((s) => s.day === day && s.activity && s.activity !== "ACCES LIBRE")
            .sort((a, b) => parseTime(a.timeSlot) - parseTime(b.timeSlot));
          return (
            <div key={day} className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-wider">
                {getDayLabel(day)}
              </div>
              {dayClasses.length === 0 ? (
                <div className="px-4 py-4 text-[11px] font-bold uppercase tracking-wide text-slate-300">
                  Accès libre
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {dayClasses.map((s) => {
                    const coachColor = coachColors[s.coach] || "#64748B";
                    return (
                      <li key={s.id} className="flex items-stretch gap-3 px-3 py-2.5">
                        <div className="w-16 shrink-0 text-[10px] font-black text-slate-500 uppercase flex items-center">
                          {s.timeSlot}
                        </div>
                        <div className="w-1 rounded-full shrink-0" style={{ backgroundColor: coachColor }} />
                        <div className="min-w-0 flex-1">
                          <div className="text-[12px] font-black uppercase leading-tight" style={{ color: coachColor }}>
                            {s.activity}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">{s.coach}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderEmpty = (col, time) => {
    if (variant === "admin" && onAddSlot) {
      return (
        <button
          onClick={() => onAddSlot(col.day, time, col.subColumn)}
          className="w-full h-full min-h-[68px] border border-dashed border-slate-300 hover:border-slate-400 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-50/50 transition-all"
          title="Créer un cours"
        >
          +
        </button>
      );
    }
    if (variant === "poster") {
      return (
        <div className="bg-white/[0.03] border border-white/5 rounded-lg flex items-center justify-center text-[9px] tracking-[0.15em] text-white/30 font-bold uppercase h-full min-h-[52px]">
          accès libre
        </div>
      );
    }
    return (
      <div className="h-14 bg-slate-50/20 rounded-2xl border border-slate-100 flex items-center justify-center text-[10px] text-slate-300 font-bold uppercase">
        accès libre
      </div>
    );
  };

  const renderSessionContent = (session, col, time) => {
    if (!session || session.activity === "ACCES LIBRE") {
      return renderEmpty(col, time);
    }

    const coachColor = coachColors[session.coach] || "#64748B";

    if (variant === "poster") {
      const ink = readableText(coachColor);
      return (
        <div
          className="rounded-lg flex flex-col items-center justify-center px-1.5 py-1 text-center h-full min-h-[52px] ring-1 ring-black/10 shadow-sm"
          style={{
            background: `linear-gradient(160deg, ${coachColor} 0%, ${coachColor}e6 100%)`,
            color: ink,
          }}
        >
          <span className="text-[10px] font-black uppercase leading-[1.1] break-words tracking-wide">
            {session.activity}
          </span>
          <span
            className="text-[8px] font-bold uppercase mt-1 tracking-[0.12em]"
            style={{ color: ink, opacity: 0.72 }}
          >
            {session.coach}
          </span>
        </div>
      );
    }

    if (variant === "admin") {
      return (
        <div
          className="h-full min-h-[68px] bg-white border border-slate-200 rounded-xl p-2 flex flex-col justify-between"
          style={{ borderLeft: `4px solid ${coachColor}` }}
        >
          <div className="flex justify-between items-start gap-1">
            <span className="text-[9.5px] font-black uppercase leading-tight text-slate-900">{session.activity}</span>
            {onDeleteSlot && (
              <button type="button" onClick={() => onDeleteSlot(session.id)} className="text-slate-300 hover:text-red-500">
                ×
              </button>
            )}
          </div>
          {onChangeCoach && (
            <select
              value={session.coach}
              onChange={(e) => onChangeCoach(session.id, e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-1.5 py-0.5 text-[8.5px] font-black uppercase text-slate-700"
            >
              <option value="Non Assigné">Non Assigné</option>
              {allCoaches.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}
        </div>
      );
    }

    return (
      <div
        className="h-14 p-2.5 rounded-2xl border flex flex-col justify-between"
        style={{ backgroundColor: coachColor + "12", borderColor: coachColor + "35" }}
      >
        <div className="text-[10px] font-black uppercase truncate" style={{ color: coachColor }}>
          {session.activity}
        </div>
        <div className="text-[9px] font-bold text-slate-500 uppercase">{session.coach}</div>
      </div>
    );
  };

  const posterTableClass = "w-full border-collapse table-fixed";
  const dashboardTableClass = "w-full border-collapse min-w-[900px] table-fixed";

  const thClass =
    variant === "poster"
      ? "bg-gradient-to-b from-[#244a86] to-[#1a3464] border border-[#0A0D1A] text-center py-3 px-1 font-black text-[11px] uppercase tracking-[0.18em] text-white"
      : "py-3 px-1 text-center border-r border-slate-100 last:border-0 text-[10px] font-black uppercase text-slate-400 bg-slate-50/50";

  const timeThClass =
    variant === "poster"
      ? "bg-[#10162b] border border-[#0A0D1A] text-center py-3 px-1 font-black text-[10px] uppercase tracking-wider text-white/45 w-24"
      : "py-3 px-2 w-28 text-center border-r border-slate-100 text-[10px] font-black uppercase text-slate-400 bg-slate-50/50";

  const timeTdClass =
    variant === "poster"
      ? "bg-[#10162b] border border-[#0A0D1A] text-[10px] font-black text-white/75 px-1 text-center align-middle w-24 tracking-tight"
      : "p-2 bg-slate-50 border-r border-slate-200 text-[10px] font-black text-center align-middle";

  const tdClass =
    variant === "poster"
      ? "p-1 align-middle"
      : "p-1 border-r border-slate-100 align-middle";

  const rowHeight = variant === "poster" ? "min-h-[48px]" : "h-24";

  const tableBlock = (
    <div
      className={
        variant === "poster"
          ? "flex-grow flex flex-col p-4 overflow-x-auto"
          : variant === "dashboard"
          ? "hidden md:block overflow-x-auto border border-slate-200 rounded-3xl shadow-sm bg-white"
          : "overflow-x-auto border border-slate-200 rounded-3xl shadow-sm bg-white"
      }
    >
      <table className={variant === "poster" ? posterTableClass : dashboardTableClass}>
        <thead>
          <tr className={variant === "dashboard" ? "border-b border-slate-200" : ""}>
            <th className={timeThClass} rowSpan={showSubHeader ? 2 : 1}>
              Horaire
            </th>
            {dayGroups.map((g) => (
              <th key={g.day} className={thClass} colSpan={g.count}>
                {getDayLabel(g.day)}
              </th>
            ))}
          </tr>
          {showSubHeader && (
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={
                    variant === "poster"
                      ? "bg-[#1a3050] border border-slate-800 text-center py-1 font-black text-[8px] uppercase text-white/60"
                      : "py-1 px-1 text-center border-r border-slate-100 text-[8px] font-black uppercase text-slate-300 bg-slate-50/30"
                  }
                >
                  {dayGroups.find((g) => g.day === col.day)?.count > 1 ? col.subColumn + 1 : ""}
                </th>
              ))}
            </tr>
          )}
        </thead>
        <tbody className={variant === "dashboard" ? "divide-y divide-slate-100" : ""}>
          {timeSlots.map((time, timeIndex) => (
            <tr key={time} className={rowHeight}>
              <td className={timeTdClass}>{time}</td>
              {columns.map((col) => {
                const state = resolveCellState(sessions, columns, col.colIndex, timeIndex, timeSlots, gymId);
                if (state.kind === "covered") return null;

                const rowSpan = state.kind === "origin" ? state.rowSpan : 1;
                const colSpan = state.kind === "origin" ? state.colSpan : 1;
                const session = state.kind === "origin" ? state.session : null;

                return (
                  <td
                    key={col.key}
                    className={tdClass}
                    rowSpan={rowSpan > 1 ? rowSpan : undefined}
                    colSpan={colSpan > 1 ? colSpan : undefined}
                  >
                    {renderSessionContent(session, col, time)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (variant === "dashboard") {
    return (
      <>
        {renderMobileList()}
        {tableBlock}
      </>
    );
  }
  return tableBlock;
}
