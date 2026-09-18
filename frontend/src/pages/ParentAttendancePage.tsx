import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CalendarCheck, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

interface AttendanceRecord {
  _id: string;
  date: string;
  status: "present" | "absent" | "late";
  class: string;
}

interface Summary {
  total: number;
  present: number;
  absent: number;
  late: number;
  percentage: number;
}

const STATUS_COLOR = {
  present: "bg-green-500",
  absent:  "bg-red-500",
  late:    "bg-yellow-400",
};

const STATUS_BADGE: Record<string, string> = {
  present: "bg-success/10 text-success border-0",
  absent:  "bg-destructive/10 text-destructive border-0",
  late:    "bg-warning/10 text-warning border-0",
};

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_NAMES   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

export default function ParentAttendancePage() {
  const { user } = useAuth();
  const students: any[] = (user as any)?.students || [];

  const [selectedChild, setSelectedChild] = useState(0);
  const [records,  setRecords]  = useState<AttendanceRecord[]>([]);
  const [summary,  setSummary]  = useState<Summary | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const now   = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-based

  const child = students[selectedChild];

  useEffect(() => {
    if (!child?._id) return;
    setLoading(true);
    setError("");
    api.get(`/attendance/history/${child._id}?month=${month}&year=${year}`)
      .then(res => {
        setRecords(res.data.data?.records || []);
        setSummary(res.data.data?.summary || null);
      })
      .catch(err => setError(err?.response?.data?.message || "Failed to load attendance."))
      .finally(() => setLoading(false));
  }, [child?._id, month, year]);

  const prevMonth = () => {
    if (month === 1) { setMonth(12); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setMonth(1); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  // Build calendar grid
  const firstDay  = new Date(year, month - 1, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month, 0).getDate();
  const recordMap: Record<string, AttendanceRecord> = {};
  records.forEach(r => {
    const d = new Date(r.date).getDate();
    recordMap[d] = r;
  });

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading">Attendance Record</h1>
            <p className="text-sm text-muted-foreground mt-1">Monthly attendance history for your child.</p>
          </div>

          {/* Child selector */}
          {students.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {students.map((s: any, i: number) => (
                <button key={s._id} onClick={() => setSelectedChild(i)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${i === selectedChild ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-secondary"}`}>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="orange-icon-bg text-primary text-xs font-bold">
                      {s.name?.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">{s.name}</p>
                    <p className="text-xs text-muted-foreground">Class {s.class}{s.section ? ` – ${s.section}` : ""}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {students.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">No children linked to this account.</p>
        ) : (
          <>
            {/* Summary Cards */}
            {summary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: "Present",    value: summary.present,    color: "gradient-green" },
                  { label: "Absent",     value: summary.absent,     color: "gradient-warm" },
                  { label: "Late",       value: summary.late,       color: "gradient-orange" },
                  { label: "Attendance", value: `${summary.percentage}%`, color: "gradient-cyan" },
                ].map(s => (
                  <div key={s.label} className="glass-card overflow-hidden hover-lift">
                    <div className={`${s.color} p-5 text-white relative`}>
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                      <div className="relative">
                        <p className="text-xs font-medium opacity-90">{s.label}</p>
                        <p className="text-3xl font-bold mt-1 font-mono-stats">{s.value}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Calendar */}
            <div className="glass-card p-6">
              {/* Month navigator */}
              <div className="flex items-center justify-between mb-5">
                <Button variant="ghost" size="icon" onClick={prevMonth}><ChevronLeft className="h-4 w-4" /></Button>
                <h3 className="text-base font-semibold font-heading">
                  {MONTH_NAMES[month - 1]} {year}
                </h3>
                <Button variant="ghost" size="icon" onClick={nextMonth}
                  disabled={year === now.getFullYear() && month === now.getMonth() + 1}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Day headers */}
              <div className="grid grid-cols-7 mb-2">
                {DAY_NAMES.map(d => (
                  <div key={d} className="text-center text-xs font-semibold text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : error ? (
                <p className="text-center text-destructive text-sm py-8">{error}</p>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {cells.map((day, i) => {
                    if (!day) return <div key={`empty-${i}`} />;
                    const rec = recordMap[day];
                    const isToday = day === now.getDate() && month === now.getMonth() + 1 && year === now.getFullYear();
                    return (
                      <div key={day}
                        className={`h-10 w-full rounded-lg flex flex-col items-center justify-center text-xs font-medium transition-colors
                          ${rec ? (rec.status === "present" ? "bg-green-100 text-green-700" : rec.status === "absent" ? "bg-red-100 text-red-700" : "bg-yellow-100 text-yellow-700") : "bg-secondary/40 text-muted-foreground"}
                          ${isToday ? "ring-2 ring-primary" : ""}`}>
                        <span>{day}</span>
                        {rec && (
                          <div className={`h-1.5 w-1.5 rounded-full mt-0.5 ${STATUS_COLOR[rec.status]}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border flex-wrap">
                {[
                  { color: "bg-green-500", label: "Present" },
                  { color: "bg-red-500",   label: "Absent" },
                  { color: "bg-yellow-400",label: "Late" },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <div className={`h-3 w-3 rounded-full ${l.color}`} />
                    {l.label}
                  </div>
                ))}
              </div>
            </div>

            {/* Day-by-day list */}
            {!loading && records.length > 0 && (
              <div className="glass-card">
                <div className="p-5 border-b border-border flex items-center gap-2">
                  <CalendarCheck className="h-4 w-4 text-primary" />
                  <h3 className="text-base font-semibold font-heading">Daily Records</h3>
                </div>
                <div className="p-5 space-y-2">
                  {records.map(r => (
                    <div key={r._id} className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-secondary/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-2.5 w-2.5 rounded-full ${STATUS_COLOR[r.status]}`} />
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {new Date(r.date).toLocaleDateString("en-PK", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                          </p>
                          {r.class && <p className="text-xs text-muted-foreground">{r.class}</p>}
                        </div>
                      </div>
                      <Badge className={STATUS_BADGE[r.status] || "border-0"}>
                        {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!loading && !error && records.length === 0 && (
              <div className="glass-card p-10 text-center text-muted-foreground text-sm">
                No attendance records for {MONTH_NAMES[month - 1]} {year}.
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
