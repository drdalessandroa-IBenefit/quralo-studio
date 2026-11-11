import { z } from "zod";
export const AGENDA_SETTINGS = { start: "09:00", end: "19:00" };
export const customMinutesSchema = z.number().int().min(10).max(240).multipleOf(5);
export function localDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; }
export function weekBounds(date: string) { const start = new Date(`${date}T00:00:00`); start.setDate(start.getDate() - (start.getDay()+6)%7); const end = new Date(start); end.setDate(end.getDate()+7); return { start, end }; }
export interface Interval { start_time: string; end_time: string; status: string }
export function freeIntervals(day: string, appointments: Interval[], settings = AGENDA_SETTINGS) {
  const start = new Date(`${day}T${settings.start}`).getTime(), end = new Date(`${day}T${settings.end}`).getTime();
  const busy = appointments.filter(a=>a.status!=="cancelled").map(a=>({start:Math.max(start,new Date(a.start_time).getTime()),end:Math.min(end,new Date(a.end_time).getTime())})).filter(a=>a.start<a.end).sort((a,b)=>a.start-b.start);
  const slots: {start:number;end:number}[]=[]; let cursor=start;
  for(const a of busy) { if(a.start>cursor) slots.push({start:cursor,end:a.start}); cursor=Math.max(cursor,a.end); }
  if(cursor<end) slots.push({start:cursor,end}); return slots;
}
export interface CalendarEvent { id: string; start_time:string; end_time:string; patientName:string; service:string }
const stamp = (s:string) => new Date(s).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const escape = (s:string) => s.replace(/\\/g,"\\\\").replace(/\r\n|\r|\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,");
function fold(line:string) { let out="",chunk="",bytes=0; for(const c of line) {const n=new TextEncoder().encode(c).length;if(bytes+n>75){out+=chunk+"\r\n";chunk=" ";bytes=1;}chunk+=c;bytes+=n;} return out+chunk; }
export function buildIcs(events:CalendarEvent[], now=new Date()) {return ["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//CareConnect//Agenda//EN","CALSCALE:GREGORIAN",...events.flatMap(e=>["BEGIN:VEVENT",`UID:${escape(e.id)}@quralo`, `DTSTAMP:${stamp(now.toISOString())}`,`DTSTART:${stamp(e.start_time)}`,`DTEND:${stamp(e.end_time)}`,`SUMMARY:${escape(`${e.patientName} · ${e.service}`)}`,"END:VEVENT"]),"END:VCALENDAR"].map(fold).join("\r\n")+"\r\n";}
export function downloadIcs(events:CalendarEvent[], name:string) { const url=URL.createObjectURL(new Blob([buildIcs(events)],{type:"text/calendar;charset=utf-8"})); const a=document.createElement("a");a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000); }
