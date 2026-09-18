import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CalendarCheck, CreditCard, MessageSquare, TrendingUp,
  ArrowUpRight, ArrowDownRight, Bell, BookOpen, ClipboardList, Loader2
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "@/lib/api";

interface ChildData {
  student: { _id: string; name: string; studentId: string; class: string; section: string; photo?: string; points: number; streakDays: number; };
  stats: { attendanceThisMonth: number; attendancePresent: number; attendanceTotal: number; avgMarks: number; totalPending: number; };
  feePayments: any[];
  recentResults: any[];
  upcomingExams: any[];
  notices: any[];
  pendingHomework: any[];
  upcomingEvents: any[];
}

interface DashboardData {
  parent: { name: string; email: string; phone: string; relation: string; };
  children: ChildData[];
}

export default function ParentDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChild, setSelectedChild] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/dashboard/parent")
      .then(res => setData(res.data.data))
      .catch(err => setError(err?.response?.data?.message || "Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading dashboard...
      </div>
    </DashboardLayout>
  );

  if (error || !data) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64 text-destructive">{error || "No data found."}</div>
    </DashboardLayout>
  );

  const child = data.children[selectedChild];

  // Build chart data from recent results
  const chartData = child?.recentResults?.slice().reverse().map((r: any) => ({
    month: r.exam?.subject || "Exam",
    score: r.percentage || 0,
  })) || [];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading">Parent Dashboard</h1>
            <p className="text-sm text-muted-foreground mt-1">Welcome, {data.parent.name} — Monitor your child's progress.</p>
          </div>

          {/* Child selector */}
          {data.children.length > 0 ? (
            <div className="flex gap-2 flex-wrap">
              {data.children.map((c, i) => (
                <button key={c.student._id} onClick={() => setSelectedChild(i)}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${i === selectedChild ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-secondary"}`}>
                  <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                    <AvatarFallback className="orange-icon-bg text-primary text-xs font-bold">
                      {c.student.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="text-left">
                    <p className="text-sm font-semibold text-foreground">{c.student.name}</p>
                    <p className="text-xs text-muted-foreground">Class {c.student.class}{c.student.section ? ` – ${c.student.section}` : ""}</p>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No children linked to this account.</p>
          )}
        </div>

        {!child ? (
          <div className="text-center text-muted-foreground py-20">No child data available.</div>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card overflow-hidden hover-lift">
                <div className="gradient-cyan p-5 text-white relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium opacity-90">Attendance</p>
                      <p className="text-3xl font-bold mt-1 font-mono-stats">{child.stats.attendanceThisMonth}%</p>
                      <div className="flex items-center gap-1 mt-2 text-xs font-medium opacity-90">
                        <ArrowUpRight className="h-3 w-3" />
                        {child.stats.attendancePresent}/{child.stats.attendanceTotal} days this month
                      </div>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                      <CalendarCheck className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card overflow-hidden hover-lift">
                <div className="gradient-orange p-5 text-white relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium opacity-90">Pending Fees</p>
                      <p className="text-3xl font-bold mt-1 font-mono-stats">Rs.{child.stats.totalPending}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs font-medium opacity-90">
                        <ArrowDownRight className="h-3 w-3" />
                        {child.feePayments.filter((f: any) => f.status === "pending" || f.status === "overdue").length} pending
                      </div>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                      <CreditCard className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card overflow-hidden hover-lift">
                <div className="gradient-green p-5 text-white relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium opacity-90">Avg Score</p>
                      <p className="text-3xl font-bold mt-1 font-mono-stats">{child.stats.avgMarks}%</p>
                      <div className="flex items-center gap-1 mt-2 text-xs font-medium opacity-90">
                        <TrendingUp className="h-3 w-3" />
                        Last {child.recentResults.length} exams
                      </div>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                      <TrendingUp className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card overflow-hidden hover-lift">
                <div className="gradient-blue p-5 text-white relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium opacity-90">Homework Due</p>
                      <p className="text-3xl font-bold mt-1 font-mono-stats">{child.pendingHomework.length}</p>
                      <div className="flex items-center gap-1 mt-2 text-xs font-medium opacity-90">
                        <ClipboardList className="h-3 w-3" />
                        Upcoming tasks
                      </div>
                    </div>
                    <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                      <ClipboardList className="h-6 w-6" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart + Exam Results */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass-card">
                <div className="p-5 border-b border-border">
                  <h3 className="text-base font-semibold font-heading flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Academic Progress
                  </h3>
                </div>
                <div className="p-5">
                  {chartData.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-10">No exam results yet.</p>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="parentGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#FF9A5A" stopOpacity={0.2} />
                            <stop offset="95%" stopColor="#FF9A5A" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                        <Area type="monotone" dataKey="score" stroke="#FF9A5A" fill="url(#parentGrad)" strokeWidth={2.5} />
                      </AreaChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="glass-card">
                <div className="p-5 border-b border-border">
                  <h3 className="text-base font-semibold font-heading">Recent Exam Results</h3>
                </div>
                <div className="p-5 space-y-3">
                  {child.recentResults.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No results yet.</p>
                  ) : child.recentResults.map((r: any) => (
                    <div key={r._id} className="flex items-center justify-between p-3 rounded-xl border border-border">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg orange-icon-bg flex items-center justify-center">
                          <BookOpen className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{r.exam?.subject || "Exam"}</p>
                          <p className="text-xs text-muted-foreground">{r.exam?.title}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-2 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${r.percentage}%`, background: "linear-gradient(90deg, hsl(var(--primary)), #FF9A5A)" }} />
                        </div>
                        <span className="text-sm font-semibold w-10 text-right font-mono-stats">{r.percentage}%</span>
                        <Badge className={r.grade?.startsWith("A") ? "bg-success/10 text-success border-0" : r.grade === "F" ? "bg-destructive/10 text-destructive border-0" : "bg-warning/10 text-warning border-0"}>
                          {r.grade}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Fees + Upcoming Exams + Notices */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Fee History */}
              <div className="glass-card">
                <div className="p-5 border-b border-border flex items-center justify-between">
                  <h3 className="text-base font-semibold font-heading flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" /> Fee History
                  </h3>
                </div>
                <div className="p-5 space-y-3">
                  {child.feePayments.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No fee records found.</p>
                  ) : child.feePayments.map((fee: any) => (
                    <div key={fee._id} className="flex items-center justify-between p-3 rounded-xl border border-border">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{fee.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {fee.dueDate ? new Date(fee.dueDate).toLocaleDateString("en-PK") : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold font-mono-stats">Rs.{fee.amount}</span>
                        <Badge className={
                          fee.status === "paid" ? "bg-success/10 text-success border-0" :
                          fee.status === "overdue" ? "bg-destructive/10 text-destructive border-0" :
                          "bg-warning/10 text-warning border-0"
                        }>{fee.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Upcoming Exams */}
              <div className="glass-card">
                <div className="p-5 border-b border-border">
                  <h3 className="text-base font-semibold font-heading flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-primary" /> Upcoming Exams
                  </h3>
                </div>
                <div className="p-5 space-y-3">
                  {child.upcomingExams.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No upcoming exams.</p>
                  ) : child.upcomingExams.map((exam: any) => (
                    <div key={exam._id} className="flex items-start gap-3 p-3 rounded-xl border border-border">
                      <div className="h-8 w-8 rounded-lg orange-icon-bg flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{exam.subject}</p>
                        <p className="text-xs text-muted-foreground">{exam.title}</p>
                        <p className="text-xs text-primary font-medium mt-1">
                          {new Date(exam.date).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                          {exam.startTime ? ` · ${exam.startTime}` : ""}
                        </p>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-0 text-xs shrink-0">{exam.examType}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notices */}
              <div className="glass-card">
                <div className="p-5 border-b border-border">
                  <h3 className="text-base font-semibold font-heading flex items-center gap-2">
                    <Bell className="h-4 w-4 text-primary" /> School Notices
                  </h3>
                </div>
                <div className="p-5 space-y-3">
                  {child.notices.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No notices.</p>
                  ) : child.notices.map((n: any) => (
                    <div key={n._id} className="flex items-start gap-3 p-3 rounded-xl border border-border">
                      <div className={`h-2 w-2 rounded-full shrink-0 mt-2 ${n.priority === "high" ? "bg-destructive" : n.priority === "medium" ? "bg-warning" : "bg-success"}`} />
                      <div>
                        <p className="text-sm font-semibold text-foreground">{n.title}</p>
                        {n.content && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.content}</p>}
                        <p className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleDateString("en-PK")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Pending Homework */}
            {child.pendingHomework.length > 0 && (
              <div className="glass-card">
                <div className="p-5 border-b border-border">
                  <h3 className="text-base font-semibold font-heading flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" /> Pending Homework
                  </h3>
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {child.pendingHomework.map((hw: any) => (
                    <div key={hw._id} className="flex items-start gap-3 p-3 rounded-xl border border-border">
                      <div className="h-8 w-8 rounded-lg orange-icon-bg flex items-center justify-center shrink-0">
                        <ClipboardList className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{hw.subject}</p>
                        <p className="text-xs text-muted-foreground line-clamp-1">{hw.title}</p>
                        <p className="text-xs text-destructive font-medium mt-1">
                          Due: {new Date(hw.dueDate).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
