import { useState, useEffect, useMemo } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CalendarClock, Clock, Trash2, Settings, Plus, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";

// ── Subject colours ───────────────────────────────────────────────
const SUBJECT_COLORS: Record<string, string> = {
  Mathematics: "bg-primary/10 text-primary border-primary/20",
  English:     "bg-[hsl(var(--info))]/10 text-[hsl(var(--info))] border-[hsl(var(--info))]/20",
  Science:     "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20",
  History:     "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20",
  Geography:   "bg-cyan-50 text-cyan-700 border-cyan-200",
  "Phys. Ed.": "bg-rose-50 text-rose-700 border-rose-200",
  Art:         "bg-violet-50 text-violet-700 border-violet-200",
  Computer:    "bg-indigo-50 text-indigo-700 border-indigo-200",
  Music:       "bg-amber-50 text-amber-700 border-amber-200",
  Library:     "bg-teal-50 text-teal-700 border-teal-200",
};

const FALLBACK_COLORS = [
  "bg-blue-50 text-blue-700 border-blue-200",
  "bg-purple-50 text-purple-700 border-purple-200",
  "bg-pink-50 text-pink-700 border-pink-200",
  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "bg-orange-50 text-orange-700 border-orange-200",
];

function subjectColor(subject: string, allSubjects: string[]) {
  if (SUBJECT_COLORS[subject]) return SUBJECT_COLORS[subject];
  const idx = Math.max(0, allSubjects.indexOf(subject)) % FALLBACK_COLORS.length;
  return FALLBACK_COLORS[idx];
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// ── Types ─────────────────────────────────────────────────────────
interface SchoolPeriod {
  _id: string;
  label: string;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  periodNumber: number | null;
  order: number;
}

interface ClassOption   { _id: string; name: string; section: string; label: string; }
interface TeacherOption { _id: string; name: string; }
interface SubjectOption { _id: string; name: string; code: string; }
interface TTEntry {
  _id: string;
  classId:   { _id: string; name: string; section: string } | null;
  teacherId: { _id: string; name: string } | null;
  day: string;
  periodNumber: number;
  subject: string;
}

// ── Helpers ───────────────────────────────────────────────────────
function timeToMins(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function currentPeriodFrom(periods: SchoolPeriod[]): number | null {
  const now = new Date().getHours() * 60 + new Date().getMinutes();
  for (const p of periods) {
    if (!p.isBreak && p.periodNumber !== null) {
      const s = timeToMins(p.startTime);
      const e = timeToMins(p.endTime);
      if (now >= s && now < e) return p.periodNumber;
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────
export default function Timetable() {
  const { user } = useAuth();
  const isAdmin   = user?.role === "school_admin";
  const isTeacher = user?.role === "teacher";

  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });

  // ── State ───────────────────────────────────────────────────────
  const [periods,         setPeriods]         = useState<SchoolPeriod[]>([]);
  const [periodsLoading,  setPeriodsLoading]  = useState(true);

  const [classes,         setClasses]         = useState<ClassOption[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [teachers,        setTeachers]        = useState<TeacherOption[]>([]);
  const [entries,         setEntries]         = useState<TTEntry[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [filterSubject,   setFilterSubject]   = useState<string | null>(null);

  // Cell edit modal (admin)
  const [editCell,           setEditCell]           = useState<{ day: string; periodNumber: number; entry?: TTEntry } | null>(null);
  const [editSubject,        setEditSubject]        = useState("");
  const [editTeacherId,      setEditTeacherId]      = useState("");
  const [saving,             setSaving]             = useState(false);
  const [editSubjects,       setEditSubjects]       = useState<SubjectOption[]>([]);
  const [editSubjectsLoading,setEditSubjectsLoading]= useState(false);

  // Manage periods dialog (admin)
  const [manageOpen,   setManageOpen]   = useState(false);
  const [newLabel,     setNewLabel]     = useState("");
  const [newStart,     setNewStart]     = useState("");
  const [newEnd,       setNewEnd]       = useState("");
  const [newIsBreak,   setNewIsBreak]   = useState(false);
  const [addingPeriod, setAddingPeriod] = useState(false);

  // ── Derived ─────────────────────────────────────────────────────
  const currentPeriod = useMemo(() => currentPeriodFrom(periods), [periods]);

  const grid = useMemo<Record<string, Record<number, TTEntry>>>(() => {
    const g: Record<string, Record<number, TTEntry>> = {};
    entries.forEach(e => {
      if (!g[e.day]) g[e.day] = {};
      g[e.day][e.periodNumber] = e;
    });
    return g;
  }, [entries]);

  const uniqueSubjects     = useMemo(() => [...new Set(entries.map(e => e.subject))].sort(), [entries]);
  const uniqueTeacherCount = useMemo(
    () => new Set(entries.filter(e => e.teacherId).map(e => e.teacherId!._id)).size,
    [entries]
  );

  // ── Load periods ─────────────────────────────────────────────────
  const loadPeriods = () => {
    setPeriodsLoading(true);
    api.get("/periods")
      .then(res => setPeriods(res.data?.data || []))
      .catch(() => setPeriods([]))
      .finally(() => setPeriodsLoading(false));
  };

  useEffect(() => { loadPeriods(); }, []);

  // ── Load admin data ──────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    api.get("/admin/classes")
      .then(res => {
        const raw: any[] = res.data?.data || [];
        const opts = raw.map(c => ({ _id: c._id, name: c.name, section: c.section, label: `Class ${c.name}-${c.section}` }));
        setClasses(opts);
        if (opts.length > 0) setSelectedClassId(opts[0]._id);
      })
      .catch(() => {});

    api.get("/admin/teachers")
      .then(res => {
        const raw: any[] = res.data?.data || res.data?.teachers || res.data || [];
        setTeachers(Array.isArray(raw) ? raw.map(t => ({ _id: t._id || t.id, name: t.name })) : []);
      })
      .catch(() => {});
  }, [isAdmin]);

  // ── Load timetable ───────────────────────────────────────────────
  const loadTimetable = async (classIdOverride?: string) => {
    const cid = classIdOverride ?? selectedClassId;
    if (isAdmin && !cid) { setLoading(false); return; }
    setLoading(true);
    setEntries([]);
    try {
      let url = "";
      if (isAdmin)        url = `/timetable/class/${cid}`;
      else if (isTeacher) url = `/timetable/teacher/${user!.id}`;
      else                url = `/timetable/student/${user!.id}`;
      const res = await api.get(url);
      setEntries(res.data?.data || []);
    } catch { setEntries([]); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadTimetable();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, isTeacher, selectedClassId, user?.id]);

  // ── Cell click (admin) ───────────────────────────────────────────
  const openEditModal = (day: string, periodNumber: number) => {
    if (!isAdmin) return;
    const entry = grid[day]?.[periodNumber];
    setEditCell({ day, periodNumber, entry });
    setEditSubject(entry?.subject ?? "");
    setEditTeacherId(entry?.teacherId?._id ?? "");

    // Load subjects for the currently selected class
    setEditSubjects([]);
    if (selectedClassId) {
      setEditSubjectsLoading(true);
      api.get(`/subjects/class/${selectedClassId}`)
        .then(res => setEditSubjects(res.data?.data || []))
        .catch(() => {})
        .finally(() => setEditSubjectsLoading(false));
    }
  };

  const handleSave = async () => {
    if (!editCell || !editSubject.trim() || !selectedClassId) return;
    setSaving(true);
    try {
      await api.post("/timetable", {
        classId:      selectedClassId,
        teacherId:    editTeacherId || undefined,
        day:          editCell.day,
        periodNumber: editCell.periodNumber,
        subject:      editSubject.trim(),
      });
      await loadTimetable();
      setEditCell(null);
      toast.success("Timetable saved.");
    } catch { toast.error("Failed to save."); }
    finally { setSaving(false); }
  };

  const handleDeleteEntry = async () => {
    if (!editCell?.entry) return;
    setSaving(true);
    try {
      await api.delete(`/timetable/${editCell.entry._id}`);
      setEntries(prev => prev.filter(e => e._id !== editCell.entry!._id));
      setEditCell(null);
      toast.success("Entry removed.");
    } catch { toast.error("Failed to delete."); }
    finally { setSaving(false); }
  };

  // ── Add period ───────────────────────────────────────────────────
  const handleAddPeriod = async () => {
    if (!newLabel.trim() || !newStart || !newEnd) {
      toast.error("Label, start time and end time are required.");
      return;
    }
    setAddingPeriod(true);
    try {
      await api.post("/periods", {
        label:     newLabel.trim(),
        startTime: newStart,
        endTime:   newEnd,
        isBreak:   newIsBreak,
      });
      setNewLabel(""); setNewStart(""); setNewEnd(""); setNewIsBreak(false);
      loadPeriods();
      toast.success("Period added.");
    } catch { toast.error("Failed to add period."); }
    finally { setAddingPeriod(false); }
  };

  // ── Delete period ────────────────────────────────────────────────
  const handleDeletePeriod = async (id: string) => {
    try {
      await api.delete(`/periods/${id}`);
      loadPeriods();
      toast.success("Period removed.");
    } catch { toast.error("Failed to remove period."); }
  };

  // ── Render ───────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading">Weekly Timetable</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {isAdmin ? "View and manage class schedules" : "Your class schedule for the week"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <Select
                  value={selectedClassId}
                  onValueChange={v => { setSelectedClassId(v); setFilterSubject(null); }}
                >
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c._id} value={c._id}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 border-border"
                  onClick={() => setManageOpen(true)}
                >
                  <Settings className="h-4 w-4" /> Manage Periods
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Subject filter chips */}
        <div className="flex flex-wrap gap-2">
          {uniqueSubjects.map(subj => (
            <Badge
              key={subj}
              variant="outline"
              onClick={() => setFilterSubject(filterSubject === subj ? null : subj)}
              className={`text-xs cursor-pointer select-none transition-all ${
                filterSubject === subj
                  ? subjectColor(subj, uniqueSubjects) + " ring-2 ring-primary/40"
                  : subjectColor(subj, uniqueSubjects)
              }`}
            >
              {subj}
            </Badge>
          ))}
        </div>

        {/* Grid */}
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-secondary">
                  <th className="p-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[140px] border-b border-border">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-primary" /> Time
                    </div>
                  </th>
                  {DAYS.map(day => (
                    <th
                      key={day}
                      className={`p-3 text-center text-xs font-semibold uppercase tracking-wider border-b border-border ${
                        day === today ? "text-primary bg-primary/5" : "text-muted-foreground"
                      }`}
                    >
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periodsLoading || loading ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">
                      Loading timetable…
                    </td>
                  </tr>
                ) : periods.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground text-sm">
                      {isAdmin
                        ? 'No periods configured. Click "Manage Periods" to add periods.'
                        : "No periods configured yet."}
                    </td>
                  </tr>
                ) : (
                  periods.map(period => (
                    <tr
                      key={period._id}
                      className={period.isBreak ? "bg-secondary/50" : "hover:bg-secondary/30 transition-colors"}
                    >
                      {/* Time column */}
                      <td className="p-3 border-b border-border">
                        <div className="text-xs font-semibold text-foreground">{period.label}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {period.startTime} – {period.endTime}
                        </div>
                      </td>

                      {DAYS.map(day => {
                        if (period.isBreak) {
                          return (
                            <td key={day} className="p-2 border-b border-border text-center">
                              <span className="text-xs text-muted-foreground italic">{period.label}</span>
                            </td>
                          );
                        }

                        const pNum  = period.periodNumber!;
                        const entry = grid[day]?.[pNum];
                        const isToday   = day === today;
                        const isCurrent = isToday && pNum === currentPeriod;
                        const dimmed    = filterSubject !== null && entry?.subject !== filterSubject;

                        return (
                          <td
                            key={day}
                            className={`p-1.5 border-b border-border ${isToday ? "bg-primary/[0.02]" : ""}`}
                          >
                            {entry ? (
                              <div
                                onClick={() => openEditModal(day, pNum)}
                                className={`rounded-xl p-2.5 border text-center transition-all hover:scale-[1.03] ${
                                  isAdmin ? "cursor-pointer" : "cursor-default"
                                } ${
                                  dimmed
                                    ? "bg-secondary text-muted-foreground border-border opacity-40"
                                    : subjectColor(entry.subject, uniqueSubjects)
                                } ${isCurrent ? "ring-2 ring-primary ring-offset-1 shadow-md" : ""}`}
                              >
                                <p className="text-xs font-semibold leading-tight">{entry.subject}</p>
                                {entry.teacherId && (
                                  <p className="text-[10px] opacity-70 mt-0.5">{entry.teacherId.name}</p>
                                )}
                                {isTeacher && entry.classId && (
                                  <p className="text-[10px] opacity-60 mt-0.5">
                                    {entry.classId.name}{entry.classId.section ? `-${entry.classId.section}` : ""}
                                  </p>
                                )}
                                {isCurrent && (
                                  <Badge className="mt-1 text-[9px] bg-primary text-white border-0 px-1.5 py-0">NOW</Badge>
                                )}
                              </div>
                            ) : (
                              <div
                                onClick={() => openEditModal(day, pNum)}
                                className={`h-full min-h-[48px] flex items-center justify-center rounded-xl transition-colors ${
                                  isAdmin ? "cursor-pointer hover:bg-primary/5" : ""
                                }`}
                              >
                                <span className="text-muted-foreground/30 text-xs">—</span>
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Periods",  value: String(entries.length),                                    icon: CalendarClock },
            { label: "Subjects",       value: String(uniqueSubjects.length),                             icon: CalendarClock },
            { label: "Teachers",       value: String(uniqueTeacherCount),                                icon: CalendarClock },
            { label: "Period Rows",    value: String(periods.filter(p => !p.isBreak).length),            icon: Clock },
          ].map(s => (
            <div key={s.label} className="glass-card p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg orange-icon-bg flex items-center justify-center shrink-0">
                <s.icon className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground font-mono-stats">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Cell edit dialog (admin) ── */}
      {isAdmin && (
        <Dialog open={!!editCell} onOpenChange={open => !open && setEditCell(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-sm">
                {editCell?.entry ? "Edit Entry" : "Add Entry"} —{" "}
                {editCell?.day} · Period {editCell?.periodNumber}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-1">
              <div className="space-y-1.5">
                <Label>Subject <span className="text-destructive">*</span></Label>
                {editSubjectsLoading ? (
                  <div className="flex items-center gap-2 h-9 px-3 border rounded-md bg-muted/50 text-sm text-muted-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading subjects…
                  </div>
                ) : editSubjects.length > 0 ? (
                  <Select value={editSubject} onValueChange={setEditSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject…" />
                    </SelectTrigger>
                    <SelectContent>
                      {editSubjects.map(s => (
                        <SelectItem key={s._id} value={s.name}>
                          {s.name}
                          <span className="ml-1 text-xs text-muted-foreground font-mono">({s.code})</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    value={editSubject}
                    onChange={e => setEditSubject(e.target.value)}
                    placeholder="e.g. Mathematics"
                    maxLength={80}
                    autoFocus
                  />
                )}
                {editSubjects.length === 0 && !editSubjectsLoading && (
                  <p className="text-xs text-muted-foreground">
                    No subjects assigned to this class — type manually or assign subjects from{" "}
                    <span className="font-medium">Subject & Class</span>.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tt-teacher">Teacher (optional)</Label>
                <Select
                  value={editTeacherId || "__none__"}
                  onValueChange={v => setEditTeacherId(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger id="tt-teacher">
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">— None —</SelectItem>
                    {teachers.map(t => (
                      <SelectItem key={t._id} value={t._id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="flex gap-2 sm:justify-between mt-2">
              {editCell?.entry && (
                <Button variant="destructive" size="sm" onClick={handleDeleteEntry} disabled={saving} className="gap-1.5">
                  <Trash2 className="h-3.5 w-3.5" /> Clear
                </Button>
              )}
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" onClick={() => setEditCell(null)} disabled={saving}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !editSubject.trim()}>
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Manage Periods dialog (admin) ── */}
      {isAdmin && (
        <Dialog open={manageOpen} onOpenChange={setManageOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Manage Periods</DialogTitle>
            </DialogHeader>

            {/* Existing periods list */}
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {periods.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No periods yet. Add your first period below.</p>
              ) : (
                periods.map(p => (
                  <div
                    key={p._id}
                    className={`flex items-center justify-between gap-3 px-3 py-2 rounded-lg border ${
                      p.isBreak ? "bg-secondary/60 border-border/50" : "bg-card border-border"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="text-xs text-muted-foreground w-5 shrink-0 font-mono text-center">
                        {p.isBreak ? "—" : p.periodNumber}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{p.label}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {p.startTime} – {p.endTime}
                          {p.isBreak && <span className="ml-2 text-warning italic">break</span>}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive shrink-0 hover:bg-destructive/10"
                      onClick={() => handleDeletePeriod(p._id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Add new period form */}
            <div className="border-t border-border pt-4 space-y-3">
              <p className="text-sm font-semibold text-foreground">Add New Row</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <Label htmlFor="p-label">Label</Label>
                  <Input
                    id="p-label"
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    placeholder="e.g. Period 8, Lunch, Assembly"
                    maxLength={40}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-start">Start Time</Label>
                  <Input
                    id="p-start"
                    type="time"
                    value={newStart}
                    onChange={e => setNewStart(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="p-end">End Time</Label>
                  <Input
                    id="p-end"
                    type="time"
                    value={newEnd}
                    onChange={e => setNewEnd(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="p-isbreak"
                  type="checkbox"
                  checked={newIsBreak}
                  onChange={e => setNewIsBreak(e.target.checked)}
                  className="h-4 w-4 accent-primary"
                />
                <Label htmlFor="p-isbreak" className="cursor-pointer text-sm font-normal">
                  This is a break / lunch (not editable in timetable)
                </Label>
              </div>

              <Button
                className="w-full gap-2"
                onClick={handleAddPeriod}
                disabled={addingPeriod || !newLabel.trim() || !newStart || !newEnd}
              >
                <Plus className="h-4 w-4" />
                {addingPeriod ? "Adding…" : "Add Period"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </DashboardLayout>
  );
}
