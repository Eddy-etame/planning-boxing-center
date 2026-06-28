"use client";

import {
  buildColumnDescriptors,
  buildDayHeaderGroups,
  getDayLabel,
  getTimeSlotsForSessions,
  hasMultipleSubColumns,
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
        <div className="bg-[#0E1222]/40 border border-slate-900/60 rounded-lg flex items-center justify-center text-[10px] text-white/10 font-black uppercase h-full min-h-[48px]">
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
      return (
        <div
          className="border border-slate-950 rounded-lg flex flex-col items-center justify-center p-1.5 text-center shadow-md h-full min-h-[48px]"
          style={{ backgroundColor: coachColor }}
        >
          <span className="text-[10px] font-black text-white uppercase leading-tight break-words">
            {session.activity}
          </span>
          <span className="text-[8px] font-bold text-white/70 uppercase mt-1">{session.coach}</span>
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
      ? "bg-[#2A4D7E] border border-slate-800 text-center py-2 px-1 font-black text-[10px] uppercase text-white"
      : "py-3 px-1 text-center border-r border-slate-100 last:border-0 text-[10px] font-black uppercase text-slate-400 bg-slate-50/50";

  const timeThClass =
    variant === "poster"
      ? "bg-[#121829] border border-slate-900 text-center py-2 px-1 font-black text-[10px] uppercase text-slate-500 w-20"
      : "py-3 px-2 w-28 text-center border-r border-slate-100 text-[10px] font-black uppercase text-slate-400 bg-slate-50/50";

  const timeTdClass =
    variant === "poster"
      ? "bg-[#121829] border border-slate-900 rounded-lg text-[10px] font-black text-white/80 px-1 text-center align-middle w-20"
      : "p-2 bg-slate-50 border-r border-slate-200 text-[10px] font-black text-center align-middle";

  const tdClass =
    variant === "poster"
      ? "p-0.5 align-middle border border-slate-900/40"
      : "p-1 border-r border-slate-100 align-middle";

  const rowHeight = variant === "poster" ? "min-h-[48px]" : "h-24";

  return (
    <div
      className={
        variant === "poster"
          ? "flex-grow flex flex-col p-4 overflow-x-auto"
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
}
