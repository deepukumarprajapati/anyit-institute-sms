import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, CalendarCheck, ClipboardList, TrendingUp, ArrowUpRight, ArrowDownRight, Users, Clock } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";

interface GradientStat {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: LucideIcon;
  bg: string;
}

interface TodayEntry {
  subject: string;
  className: string;
  time: string;
  periodNumber: number;
  isCurrent: boolean;
}

interface HwRow {
  _id: string;
  title: string;
  class: string;
  due: string;
  submissions: number;
  total: number;
  subject: string;
}

interface DashData {
  stats: {
    classCount: number;
    myStudentCount: number;
    todayAttendancePct: number | null;
    pendingHomework: number;
  };
  weeklyTrendMonth: string;
  weeklyTrend: { week: string; label: string; rate: number }[];
  classPerformance: { name: string; avg: number }[];
  recentHomework: HwRow[];
}

const PERIOD_TIMES: Record<number, string> = {
  1: "8:00 AM", 2: "8:45 AM", 3: "9:45 AM",
  4: "10:30 AM", 5: "11:15 AM", 6: "12:45 PM", 7: "1:30 PM",
};

const PERIOD_MINS: Record<number, [number, number]> = {
  1: [480, 525], 2: [525, 570], 3: [585, 630],
  4: [630, 675], 5: [675, 720], 6: [765, 810], 7: [810, 855],
};

function getCurrentPeriod(): number | null {
  const m = new Date().getHours() * 60 + new Date().getMinutes();
  for (const [p, [s, e]] of Object.entries(PERIOD_MINS)) {
    if (m >= s && m < e) return Number(p);
  }
  return null;
}

function fmtDue(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch { return dateStr; }
}

export default function TeacherDashboard() {
  const { user } = useAuth();

  const [todaySchedule,   setTodaySchedule]   = useState<TodayEntry[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [dashData,        setDashData]        = useState<DashData | null>(null);
  const [dashLoading,     setDashLoading]     = useState(true);

  // Load today's timetable
  useEffect(() => {
    if (!user?.id) return;
    const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
    const currentPeriod = getCurrentPeriod();

    api.get(`/timetable/teacher/${user.id}`)
      .then(res => {
        const entries: any[] = res.data?.data || [];
        setTodaySchedule(
          entries
            .filter(e => e.day === today)
            .sort((a, b) => a.periodNumber - b.periodNumber)
            .map(e => ({
              subject:      e.subject,
              className:    e.classId ? `${e.classId.name}${e.classId.section ? "-" + e.classId.section : ""}` : "",
              time:         PERIOD_TIMES[e.periodNumber] || "",
              periodNumber: e.periodNumber,
              isCurrent:    e.periodNumber === currentPeriod,
            }))
        );
      })
      .catch(() => setTodaySchedule([]))
      .finally(() => setScheduleLoading(false));
  }, [user?.id]);

  // Load dashboard stats
  useEffect(() => {
    api.get("/dashboard/teacher")
      .then(res => setDashData(res.data?.data || null))
      .catch(() => setDashData(null))
      .finally(() => setDashLoading(false));
  }, []);

  const s = dashData?.stats;

  const stats: GradientStat[] = [
    {
      title:   "My Classes",
      value:   dashLoading ? "…" : String(s?.classCount ?? 0),
      trend:   s?.classCount ? `${s.classCount} assigned` : "No classes yet",
      trendUp: (s?.classCount ?? 0) > 0,
      icon:    BookOpen,
      bg:      "gradient-blue",
    },
    {
      title:   "Total Students",
      value:   dashLoading ? "…" : String(s?.myStudentCount ?? 0),
      trend:   s?.myStudentCount ? `${s.myStudentCount} enrolled` : "No students",
      trendUp: (s?.myStudentCount ?? 0) > 0,
      icon:    Users,
      bg:      "gradient-orange",
    },
    {
      title:   "Today's Attendance",
      value:   dashLoading ? "…" : s?.todayAttendancePct != null ? `${s.todayAttendancePct}%` : "—",
      trend:   s?.todayAttendancePct != null ? (s.todayAttendancePct >= 75 ? "On track" : "Below target") : "Not marked yet",
      trendUp: (s?.todayAttendancePct ?? 0) >= 75,
      icon:    CalendarCheck,
      bg:      "gradient-cyan",
    },
    {
      title:   "Assignments Pending",
      value:   dashLoading ? "…" : String(s?.pendingHomework ?? 0),
      trend:   s?.pendingHomework ? `${s.pendingHomework} active` : "All done",
      trendUp: (s?.pendingHomework ?? 0) === 0,
      icon:    ClipboardList,
      bg:      "gradient-warm",
    },
  ];

  const weeklyTrend      = dashData?.weeklyTrend      ?? [];
  const weeklyTrendMonth = dashData?.weeklyTrendMonth ?? "";
  const classPerformance = dashData?.classPerformance ?? [];
  const recentHomework   = dashData?.recentHomework   ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Teacher Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Your classes, attendance, and assignments overview.</p>
        </div>

        {/* Gradient stat cards */}
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

        {/* Charts row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="glass-card">
            <div className="p-5 border-b border-border">
              <h3 className="text-base font-semibold font-heading flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Weekly Attendance Trend{weeklyTrendMonth ? ` — ${weeklyTrendMonth}` : ""}
              </h3>
            </div>
            <div className="p-5">
              {dashLoading ? (
                <div className="h-[220px] bg-secondary rounded-xl animate-pulse" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={weeklyTrend.length > 0 ? weeklyTrend : [{ week: "—", label: "—", rate: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} interval={0} />
                    <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                      formatter={(value: number) => [`${value}%`, "Attendance"]}
                    />
                    <Line type="monotone" dataKey="rate" stroke="#FF9A5A" strokeWidth={2.5} dot={{ r: 4, fill: "#FF9A5A" }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="glass-card">
            <div className="p-5 border-b border-border">
              <h3 className="text-base font-semibold font-heading">Class Performance Average</h3>
            </div>
            <div className="p-5">
              {dashLoading ? (
                <div className="h-[220px] bg-secondary rounded-xl animate-pulse" />
              ) : classPerformance.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">
                  No result data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={classPerformance}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 12 }} />
                    <Bar dataKey="avg" fill="#33C6E7" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
