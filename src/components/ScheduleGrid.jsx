"use client";

import {
  buildColumnDescriptors,
  findSession,
  getTimeSlotsForSessions,
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

  const renderCell = (col, time, timeIndex) => {
    const { session, isSpanContinuation } = findSession(sessions, {
      day: col.day,
      subColumn: col.subColumn,
      timeSlot: time,
      timeIndex,
      timeSlots,
    });

    if (isSpanContinuation) return null;
    if (!session) return renderEmpty(col, time);

    if (session.activity === "ACCES LIBRE") {
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

  if (variant === "poster") {
    return (
      <div className="flex-grow flex flex-col p-4">
        <div
          className="grid gap-1.5 mb-1.5"
          style={{ gridTemplateColumns: `80px repeat(${columns.length}, minmax(0, 1fr))` }}
        >
          <div />
          {columns.map((col) => (
            <div
              key={col.key}
              className="bg-[#2A4D7E] border border-slate-800 text-center py-3 rounded-lg font-black text-[10px] uppercase text-white"
            >
              {col.subColumn === 0 ? col.day : ""}
            </div>
          ))}
        </div>
        <div className="flex-grow flex flex-col gap-1.5">
          {timeSlots.map((time, timeIndex) => (
            <div
              key={time}
              className="grid gap-1.5 flex-1"
              style={{ gridTemplateColumns: `80px repeat(${columns.length}, minmax(0, 1fr))` }}
            >
              <div className="bg-[#121829] border border-slate-900 rounded-lg flex items-center justify-center text-[10px] font-black text-white/80 px-1">
                {time}
              </div>
              {columns.map((col) => (
                <div key={col.key} className="min-h-[48px]">
                  {renderCell(col, time, timeIndex)}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-3xl shadow-sm bg-white">
      <table className="w-full border-collapse min-w-[900px] table-fixed">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/50 text-[10px] font-black uppercase text-slate-400">
            <th className="py-3 px-2 w-28 text-center border-r border-slate-100">Horaire</th>
            {columns.map((col) => (
              <th key={col.key} className="py-3 px-1 text-center border-r border-slate-100 last:border-0">
                {col.subColumn === 0 ? col.day : "·"}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {timeSlots.map((time, timeIndex) => (
            <tr key={time} className="h-24">
              <td className="p-2 bg-slate-50 border-r border-slate-200 text-[10px] font-black text-center align-middle">
                {time}
              </td>
              {columns.map((col) => {
                const { isSpanContinuation } = findSession(sessions, {
                  day: col.day,
                  subColumn: col.subColumn,
                  timeSlot: time,
                  timeIndex,
                  timeSlots,
                });
                if (isSpanContinuation) return null;
                return (
                  <td key={col.key} className="p-1 border-r border-slate-100 align-middle">
                    {renderCell(col, time, timeIndex)}
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
