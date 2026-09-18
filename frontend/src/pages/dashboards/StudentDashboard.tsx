import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CalendarCheck, FileText, Bell, BookOpen, Trophy, Download, Clock,
  ArrowUpRight, ArrowDownRight, Check, X, DollarSign, Receipt, AlertCircle,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
interface AttendanceSummary { total: number; present: number; absent: number; late: number; percentage: number }
interface AttendanceRecord  { _id: string; date: string; status: "present"|"absent"|"late"; markedBy: { name: string; role: string }; class: string }
interface FeeRecord { _id: string; title: string; amount: number; paidAmount: number; status: "paid"|"pending"|"partial"|"overdue"; dueDate: string; paidDate: string|null; paymentMode: string; receiptNo: string|null }
interface FeeSummary { paid: number; pending: number; total: number }
interface ExamItem   { _id: string; title: string; subject: string; date: string; examType: string }
interface NoticeItem { _id: string; title: string; content: string; createdAt: string; isUrgent: boolean }
interface GradientStat { title: string; value: string; trend: string; trendUp: boolean; icon: LucideIcon; bg: string }

// ── Period helpers ─────────────────────────────────────────────────────────────
const PERIOD_TIMES: Record<number, string> = {
  1: "8:00–8:45", 2: "8:45–9:30", 3: "9:45–10:30",
  4: "10:30–11:15", 5: "11:15–12:00", 6: "12:45–1:30", 7: "1:30–2:15",
};
const PERIOD_MINS: Record<number, [number, number]> = {
  1:[480,525], 2:[525,570], 3:[585,630], 4:[630,675], 5:[675,720], 6:[765,810], 7:[810,855],
};
function getCurrentPeriod(): number | null {
  const m = new Date().getHours() * 60 + new Date().getMinutes();
  for (const [p, [s, e]] of Object.entries(PERIOD_MINS)) { if (m >= s && m < e) return Number(p); }
  return null;
}

const statusConfig = {
  present: { label: "Present", icon: Check, className: "text-success bg-success/10" },
  absent:  { label: "Absent",  icon: X,     className: "text-destructive bg-destructive/10" },
  late:    { label: "Late",    icon: Clock,  className: "text-warning bg-warning/10" },
};

const feeStatusStyle = (s: string) => {
  switch (s) {
    case "paid":    return "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]";
    case "partial": return "bg-amber-500/10 text-amber-600";
    case "overdue": return "bg-destructive/10 text-destructive";
    default:        return "bg-muted text-muted-foreground";
  }
};

// ── Component ──────────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { user } = useAuth();

  // attendance
  const [attSummary, setAttSummary] = useState<AttendanceSummary | null>(null);
  const [attRecords, setAttRecords] = useState<AttendanceRecord[]>([]);
  const [attLoading, setAttLoading] = useState(true);

  // timetable
  const [todayTimetable, setTodayTimetable] = useState<{ period: string; subject: string; time: string; teacher: string; current: boolean }[]>([]);
  const [ttLoading, setTtLoading] = useState(true);

  // fees
  const [feeSummary,  setFeeSummary]  = useState<FeeSummary | null>(null);
  const [feeRecords,  setFeeRecords]  = useState<FeeRecord[]>([]);
  const [feeLoading,  setFeeLoading]  = useState(true);

  // exams
  const [upcomingExams, setUpcomingExams] = useState<ExamItem[]>([]);
  const [examsLoading,  setExamsLoading]  = useState(true);

  // notices
  const [notices,        setNotices]       = useState<NoticeItem[]>([]);
  const [noticesLoading, setNoticesLoading]= useState(true);

  // ── Fetch timetable ──────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const cur   = getCurrentPeriod();
    api.get(`/timetable/student/${user.id}`)
      .then(res => {
        const entries: any[] = res.data?.data || [];
        setTodayTimetable(
          entries.filter(e => e.day === today).sort((a, b) => a.periodNumber - b.periodNumber)
            .map(e => ({ period: String(e.periodNumber), subject: e.subject, time: PERIOD_TIMES[e.periodNumber] || "", teacher: e.teacherId?.name || "", current: e.periodNumber === cur }))
        );
      })
      .catch(() => setTodayTimetable([]))
      .finally(() => setTtLoading(false));
  }, [user?.id]);

  // ── Fetch attendance ─────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    setAttLoading(true);
    api.get(`/attendance/history/${user.id}`)
      .then(res => {
        const d = res.data?.data;
        if (d) { setAttSummary(d.summary); setAttRecords(d.records.slice(0, 8)); }
      })
      .catch(() => {})
      .finally(() => setAttLoading(false));
  }, [user?.id]);

  // ── Fetch fees ───────────────────────────────────────────────
  useEffect(() => {
    setFeeLoading(true);
    api.get("/fees/student/me")
      .then(res => {
        const d = res.data?.data;
        setFeeSummary(d?.summary || null);
        setFeeRecords(d?.fees || []);
      })
      .catch(() => {})
      .finally(() => setFeeLoading(false));
  }, []);

  // ── Fetch upcoming exams ─────────────────────────────────────
  useEffect(() => {
    api.get("/exams/upcoming")
      .then(res => setUpcomingExams((res.data?.data || []).slice(0, 4)))
      .catch(() => {})
      .finally(() => setExamsLoading(false));
  }, []);

  // ── Fetch notices ────────────────────────────────────────────
  useEffect(() => {
    api.get("/notices")
      .then(res => {
        const raw = res.data?.notices || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setNotices(raw.slice(0, 4));
      })
      .catch(() => {})
      .finally(() => setNoticesLoading(false));
  }, []);

  // ── Stats cards ──────────────────────────────────────────────
  const stats: GradientStat[] = [
    {
      title: "Attendance",
      value: attLoading ? "…" : attSummary ? `${attSummary.percentage}%` : "—",
      trend: attSummary ? `${attSummary.present}P · ${attSummary.absent}A · ${attSummary.late}L` : "No data yet",
      trendUp: (attSummary?.percentage ?? 0) >= 75,
      icon: CalendarCheck,
      bg: "gradient-cyan",
    },
    {
      title: "Total Fees",
      value: feeLoading ? "…" : feeSummary ? `₹${feeSummary.total.toLocaleString()}` : "—",
      trend: feeLoading ? "" : feeSummary ? `₹${feeSummary.paid.toLocaleString()} paid` : "No records",
      trendUp: feeSummary ? feeSummary.pending === 0 : true,
      icon: DollarSign,
      bg: "gradient-green",
    },
    {
      title: "Fee Pending",
      value: feeLoading ? "…" : feeSummary ? `₹${feeSummary.pending.toLocaleString()}` : "—",
      trend: feeLoading ? "" : feeSummary && feeSummary.pending === 0 ? "All clear!" : "Pay soon",
      trendUp: feeSummary ? feeSummary.pending === 0 : true,
      icon: AlertCircle,
      bg: "gradient-orange",
    },
    {
      title: "Upcoming Exams",
      value: examsLoading ? "…" : String(upcomingExams.length),
      trend: upcomingExams.length > 0 ? `Next: ${new Date(upcomingExams[0].date).toLocaleDateString("en-IN",{day:"numeric",month:"short"})}` : "None scheduled",
      trendUp: true,
      icon: FileText,
      bg: "gradient-blue",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Student Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Your academic progress and daily activities.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.title} className="glass-card overflow-hidden hover-lift">
              <div className={`${stat.bg} p-5 text-white`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-90">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1 font-mono-stats">{stat.value}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs font-medium opacity-90">
                      {stat.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {stat.trend}
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Timetable + Exams & Notices */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Today's Timetable */}
          <div className="glass-card">
            <div className="p-5 border-b border-border">
              <h3 className="text-base font-semibold font-heading flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Today's Timetable
              </h3>
            </div>
            <div className="p-5 space-y-2">
              {ttLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-secondary rounded-xl animate-pulse" />)}</div>
              ) : todayTimetable.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No classes scheduled today.</p>
              ) : todayTimetable.map((period) => (
                <div key={period.period} className={`flex items-center justify-between p-3 rounded-xl border transition-all ${period.current ? "border-primary bg-secondary shadow-sm" : "border-border hover:bg-secondary"}`}>
                  <div className="flex items-center gap-3">
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold ${period.current ? "btn-gradient text-white" : "orange-icon-bg text-primary"}`}>P{period.period}</div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{period.subject}</p>
                      <p className="text-xs text-muted-foreground">{period.teacher}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{period.time}</span>
                    {period.current && <Badge className="bg-success/10 text-success border-0 text-[10px]">Now</Badge>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Exams + Notices */}
          <div className="space-y-4">
            <div className="glass-card">
              <div className="p-4 border-b border-border">
                <h3 className="text-base font-semibold font-heading flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Upcoming Exams
                </h3>
              </div>
              <div className="p-4 space-y-2">
                {examsLoading ? (
                  <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-10 bg-secondary rounded-lg animate-pulse" />)}</div>
                ) : upcomingExams.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">No upcoming exams.</p>
                ) : upcomingExams.map((exam) => (
                  <div key={exam._id} className="flex items-center justify-between p-2 rounded-lg bg-secondary">
                    <div>
                      <p className="text-sm font-medium text-foreground">{exam.subject}</p>
                      <p className="text-xs text-muted-foreground capitalize">{exam.examType}</p>
                    </div>
                    <Badge variant="outline" className="text-xs border-border text-primary">
                      {new Date(exam.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card">
              <div className="p-4 border-b border-border">
                <h3 className="text-base font-semibold font-heading flex items-center gap-2">
                  <Bell className="h-4 w-4 text-primary" /> Notices
                </h3>
              </div>
              <div className="p-4 space-y-2">
                {noticesLoading ? (
                  <div className="space-y-2">{[1,2].map(i => <div key={i} className="h-10 bg-secondary rounded-lg animate-pulse" />)}</div>
                ) : notices.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-3">No notices.</p>
                ) : notices.map((n) => (
                  <div key={n._id} className="flex items-center justify-between p-2 rounded-lg bg-secondary">
                    <p className="text-sm text-foreground truncate mr-2">{n.title}</p>
                    <Badge className={`shrink-0 text-[10px] border-0 ${n.isUrgent ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`} variant="secondary">
                      {new Date(n.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── My Fees ─────────────────────────────────────────── */}
        <div className="glass-card">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-base font-semibold font-heading flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" /> My Fees
            </h3>
            {feeSummary && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-[hsl(var(--success))] font-medium">₹{feeSummary.paid.toLocaleString()} Paid</span>
                <span className="text-destructive font-medium">₹{feeSummary.pending.toLocaleString()} Pending</span>
                <Badge className="bg-primary/10 text-primary border-0">
                  ₹{feeSummary.total.toLocaleString()} Total
                </Badge>
              </div>
            )}
          </div>

          {feeLoading ? (
            <div className="p-5 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-14 bg-secondary rounded-xl animate-pulse" />)}
            </div>
          ) : feeRecords.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Receipt className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No fee records found.</p>
            </div>
          ) : (
            <div className="p-5">
              {/* Summary bar */}
              {feeSummary && feeSummary.total > 0 && (
                <div className="mb-5 p-4 rounded-xl bg-secondary/60 border border-border">
                  <div className="flex justify-between text-xs text-muted-foreground mb-2">
                    <span>Payment progress</span>
                    <span>{Math.round((feeSummary.paid / feeSummary.total) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[hsl(var(--success))]" style={{ width: `${Math.round((feeSummary.paid / feeSummary.total) * 100)}%` }} />
                  </div>
                  <div className="flex justify-between text-xs mt-2">
                    <span className="text-[hsl(var(--success))] font-medium">₹{feeSummary.paid.toLocaleString()} paid</span>
                    <span className="text-destructive font-medium">₹{feeSummary.pending.toLocaleString()} pending</span>
                  </div>
                </div>
              )}

              {/* Fee records list */}
              <div className="divide-y divide-border/60">
                {feeRecords.map((fee) => (
                  <div key={fee._id} className="flex items-center justify-between py-3.5 hover:bg-accent/20 px-2 rounded-lg transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                        fee.status === "paid" ? "bg-[hsl(var(--success))]/10" : fee.status === "overdue" ? "bg-destructive/10" : "bg-amber-500/10"
                      }`}>
                        {fee.status === "paid"
                          ? <Check className="h-4 w-4 text-[hsl(var(--success))]" />
                          : fee.status === "overdue"
                          ? <AlertCircle className="h-4 w-4 text-destructive" />
                          : <Clock className="h-4 w-4 text-amber-600" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{fee.title}</p>
                        <p className="text-xs text-muted-foreground">
                          Due: {new Date(fee.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          {fee.receiptNo && <span className="ml-2 font-mono">· {fee.receiptNo}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-sm font-semibold text-foreground">₹{fee.amount.toLocaleString()}</p>
                        {fee.paidAmount > 0 && fee.paidAmount < fee.amount && (
                          <p className="text-xs text-[hsl(var(--success))]">₹{fee.paidAmount.toLocaleString()} paid</p>
                        )}
                      </div>
                      <Badge variant="secondary" className={`text-xs capitalize shrink-0 ${feeStatusStyle(fee.status)}`}>
                        {fee.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Attendance ───────────────────────────────────────── */}
        <div className="glass-card">
          <div className="p-5 border-b border-border flex items-center justify-between">
            <h3 className="text-base font-semibold font-heading flex items-center gap-2">
              <CalendarCheck className="h-4 w-4 text-primary" /> Attendance Overview
            </h3>
            {attSummary && (
              <div className="flex items-center gap-4 text-sm">
                <span className="text-success font-medium">{attSummary.present} Present</span>
                <span className="text-destructive font-medium">{attSummary.absent} Absent</span>
                <span className="text-warning font-medium">{attSummary.late} Late</span>
                <Badge className="bg-primary/10 text-primary border-0">{attSummary.percentage}% overall</Badge>
              </div>
            )}
          </div>
          <div className="p-5">
            {attLoading ? (
              <div className="text-center text-sm text-muted-foreground py-6">Loading attendance…</div>
            ) : attRecords.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-6">No attendance records found.</div>
            ) : (
              <div className="divide-y divide-border/50">
                {attRecords.map((r) => {
                  const cfg = statusConfig[r.status];
                  const StatusIcon = cfg.icon;
                  return (
                    <div key={r._id} className="flex items-center justify-between py-3 hover:bg-accent/30 px-2 rounded-lg transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${cfg.className}`}>
                          <StatusIcon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {new Date(r.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
                          </p>
                          {r.class && <p className="text-xs text-muted-foreground">Class {r.class}</p>}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {r.markedBy?.name && (
                          <span className="text-xs text-muted-foreground hidden sm:block">Marked by {r.markedBy.name}</span>
                        )}
                        <Badge className={`${cfg.className} border-0 capitalize`}>{cfg.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
