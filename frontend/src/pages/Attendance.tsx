import { useState, useEffect, useCallback } from "react";
import { Check, X, Clock, ChevronLeft, ChevronRight, TrendingUp } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";

type Status = "present" | "absent" | "late" | null;

interface StudentRow   { id: string; name: string; initials: string; avatar?: string; }
interface ClassOption  { _id: string; name: string; section: string; label: string; }
interface AttRecord    { date: string; status: "present" | "absent" | "late" | "N/A"; remark?: string; }
interface AttSummary   { total: number; present: number; absent: number; late: number; percentage: number; }

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" });

// ══════════════════════════════════════════════════════════════════
// STUDENT VIEW — read-only attendance history
// ══════════════════════════════════════════════════════════════════
function StudentAttendanceView() {
  const { user } = useAuth();
  const now = new Date();
  const [month, setMonth]     = useState(now.getMonth() + 1);  // 1-12
  const [year]                = useState(now.getFullYear());
  const [allRecords, setAll]  = useState<AttRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch ALL records once from the working endpoint (same as dashboard)
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    api.get(`/attendance/history/${user.id}`)
      .then((res) => setAll(res.data?.data?.records || []))
      .catch(() => toast.error("Failed to load attendance."))
      .finally(() => setLoading(false));
  }, [user?.id]);

  // Filter by selected month on the frontend
  const records = allRecords.filter((r) => {
    const d = new Date(r.date);
    return d.getMonth() + 1 === month && d.getFullYear() === year;
  });

  const total   = records.length;
  const present = records.filter((r) => r.status === "present").length;
  const absent  = records.filter((r) => r.status === "absent").length;
  const late    = records.filter((r) => r.status === "late").length;
  const pct     = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  const statusBadge = (status: string) => {
    if (status === "present") return <Badge className="text-[10px] bg-green-100 text-green-700 border-green-200">Present</Badge>;
    if (status === "absent")  return <Badge className="text-[10px] bg-red-100 text-red-700 border-red-200">Absent</Badge>;
    if (status === "late")    return <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">Late</Badge>;
    return <Badge variant="secondary" className="text-[10px]">—</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">My Attendance</h1>
          <p className="text-sm text-muted-foreground mt-1">Your attendance record for this academic year.</p>
        </div>

        {/* Month picker */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground">
            <ChevronLeft className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              onClick={() => setMonth((m) => m === 1 ? 12 : m - 1)} />
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-32 border-0 shadow-none h-auto p-0 focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{m} {year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ChevronRight className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              onClick={() => setMonth((m) => m === 12 ? 1 : m + 1)} />
          </div>
          <span className={`text-sm font-semibold px-3 py-1.5 rounded-lg border ${
            pct >= 75 ? "bg-green-50 text-green-700 border-green-200" :
            pct >= 50 ? "bg-amber-50 text-amber-700 border-amber-200" :
            "bg-red-50 text-destructive border-red-200"
          }`}>
            {pct}% {pct < 75 && "⚠ Below 75%"}
          </span>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-card rounded-xl p-4 animate-pulse text-center">
                <div className="h-8 bg-muted rounded w-12 mx-auto mb-2" />
                <div className="h-3 bg-muted rounded w-16 mx-auto" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* 3 summary cards — same style as teacher/admin view */}
            <div className="grid grid-cols-3 gap-4">
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-success">{present}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">Present</p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-destructive">{absent}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">Absent</p>
              </div>
              <div className="glass-card rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-warning">{late}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium">Late</p>
              </div>
            </div>

            {/* Day-by-day list */}
            <div className="glass-card rounded-xl overflow-hidden animate-fade-in">
              <div className="px-4 py-3 border-b border-border bg-secondary/30 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="text-sm font-semibold text-foreground">
                  {MONTHS[month - 1]} {year} — Daily Records
                </span>
                <span className="ml-auto text-xs text-muted-foreground">{total} school days</span>
              </div>
              {total === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">
                  No attendance records found for this month.
                </div>
              ) : (
                <div className="divide-y divide-border/50 max-h-[420px] overflow-y-auto">
                  {[...records]
                    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                    .map((r, i) => (
                      <div key={i} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                            r.status === "present" ? "bg-success" :
                            r.status === "absent"  ? "bg-destructive" :
                            r.status === "late"    ? "bg-warning" : "bg-muted"
                          }`} />
                          <span className="text-sm font-medium text-foreground">{fmtDate(r.date)}</span>
                        </div>
                        {statusBadge(r.status)}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

// ══════════════════════════════════════════════════════════════════
// ADMIN / TEACHER VIEW — mark attendance
// ══════════════════════════════════════════════════════════════════
function MarkAttendanceView() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canMark = user?.role !== "teacher" || hasPermission("canMarkAttendance");

  const [classes, setClasses]                 = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [students, setStudents]               = useState<StudentRow[]>([]);
  const [attendance, setAttendance]           = useState<Record<string, Status>>({});
  const [selectedDate, setSelectedDate]       = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving]                   = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const formatDisplayDate = (dateStr: string) => {
    try { return new Date(dateStr).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }); }
    catch { return dateStr; }
  };

  const shiftDate = (delta: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + delta);
    setSelectedDate(d.toISOString().slice(0, 10));
  };

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        if (user?.role === "teacher") {
          const res = await api.get("/teachers/me");
          const assigned: any[] = res.data?.data?.assignedClasses || [];
          const opts: ClassOption[] = assigned.map((c: any) => ({
            _id: c._id, name: c.name, section: c.section, label: `Class ${c.name}-${c.section}`,
          }));
          setClasses(opts);
          if (opts.length > 0) setSelectedClassId(opts[0]._id);
        } else {
          const res = await api.get("/admin/classes");
          const raw: any[] = res.data?.data || [];
          const opts: ClassOption[] = raw.map((c: any) => ({
            _id: c._id, name: c.name, section: c.section, label: `Class ${c.name}-${c.section}`,
          }));
          setClasses(opts);
          if (opts.length > 0) setSelectedClassId(opts[0]._id);
        }
      } catch { toast.error("Failed to load classes."); }
    };
    fetchClasses();
  }, [user]);

  const loadAttendance = useCallback(async () => {
    if (!selectedClassId) return;
    setLoadingStudents(true);
    try {
      const res = await api.get(`/attendance/class/${selectedClassId}`, { params: { date: selectedDate } });
      const rows: any[] = res.data?.data || [];
      const studentRows: StudentRow[] = rows.map((r: any) => ({
        id:       r.student._id,
        name:     r.student.name,
        initials: r.student.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase(),
        avatar:   r.student.photo || "",
      }));
      const attMap: Record<string, Status> = {};
      rows.forEach((r: any) => { attMap[r.student._id] = r.status as Status; });
      setStudents(studentRows);
      setAttendance(attMap);
    } catch {
      setStudents([]);
      setAttendance({});
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedClassId, selectedDate]);

  useEffect(() => { loadAttendance(); }, [loadAttendance]);

  const mark    = (id: string, status: Status) => setAttendance((prev) => ({ ...prev, [id]: status }));
  const markAll = (status: Status) => setAttendance(Object.fromEntries(students.map((s) => [s.id, status])));

  const saveAttendance = async () => {
    if (!selectedClassId) return;
    setSaving(true);
    try {
      const payload = students.map((s) => ({ studentId: s.id, status: attendance[s.id] || "absent" }));
      await api.post("/attendance/bulk", { classId: selectedClassId, date: selectedDate, attendance: payload });
      toast.success("Attendance saved successfully.");
    } catch {
      toast.error("Failed to save attendance.");
    } finally {
      setSaving(false);
    }
  };

  const counts = {
    present: Object.values(attendance).filter((v) => v === "present").length,
    absent:  Object.values(attendance).filter((v) => v === "absent").length,
    late:    Object.values(attendance).filter((v) => v === "late").length,
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-1">Mark daily student attendance</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-36 bg-card border-border">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c._id} value={c._id}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 rounded-lg bg-card border border-border px-3 py-2 text-sm text-foreground">
            <ChevronLeft className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" onClick={() => shiftDate(-1)} />
            <span className="font-medium">{formatDisplayDate(selectedDate)}</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" onClick={() => shiftDate(1)} />
          </div>

          {canMark && (
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={() => markAll("present")} className="text-success border-success/30 hover:bg-success/10">Mark All Present</Button>
              <Button variant="outline" size="sm" onClick={() => markAll("absent")} className="text-destructive border-destructive/30 hover:bg-destructive/10">Mark All Absent</Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-success">{counts.present}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Present</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-destructive">{counts.absent}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Absent</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-warning">{counts.late}</p>
            <p className="text-xs text-muted-foreground mt-1 font-medium">Late</p>
          </div>
        </div>

        <div className="glass-card rounded-xl animate-fade-in">
          <div className="divide-y divide-border/50">
            {!selectedClassId ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No class assigned yet.</div>
            ) : loadingStudents ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Loading students…</div>
            ) : students.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">No students found for this class.</div>
            ) : students.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9 border border-border">
                    <AvatarImage src={s.avatar} alt={s.name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs">{s.initials}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium text-foreground">{s.name}</span>
                </div>
                {canMark && (
                  <div className="flex gap-2">
                    <Button size="sm" variant={attendance[s.id] === "present" ? "default" : "outline"}
                      className={`h-8 w-8 p-0 ${attendance[s.id] === "present" ? "bg-success hover:bg-success/90 border-success text-success-foreground" : "text-muted-foreground border-border hover:text-success hover:border-success/50"}`}
                      onClick={() => mark(s.id, "present")}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant={attendance[s.id] === "absent" ? "default" : "outline"}
                      className={`h-8 w-8 p-0 ${attendance[s.id] === "absent" ? "bg-destructive hover:bg-destructive/90 border-destructive text-destructive-foreground" : "text-muted-foreground border-border hover:text-destructive hover:border-destructive/50"}`}
                      onClick={() => mark(s.id, "absent")}>
                      <X className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant={attendance[s.id] === "late" ? "default" : "outline"}
                      className={`h-8 w-8 p-0 ${attendance[s.id] === "late" ? "bg-warning hover:bg-warning/90 border-warning text-warning-foreground" : "text-muted-foreground border-border hover:text-warning hover:border-warning/50"}`}
                      onClick={() => mark(s.id, "late")}>
                      <Clock className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {canMark && students.length > 0 && (
          <div className="flex justify-end">
            <Button className="gap-2 shadow-sm shadow-primary/20" onClick={saveAttendance} disabled={saving}>
              {saving ? "Saving…" : "Save Attendance"}
            </Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

// ══════════════════════════════════════════════════════════════════
// ROUTER — pick view based on role
// ══════════════════════════════════════════════════════════════════
const Attendance = () => {
  const { user } = useAuth();
  if (user?.role === "student") return <StudentAttendanceView />;
  return <MarkAttendanceView />;
};

export default Attendance;
