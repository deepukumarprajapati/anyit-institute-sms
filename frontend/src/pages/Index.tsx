import { useState, useEffect } from "react";
import { Users, GraduationCap, CalendarCheck, DollarSign, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { AttendanceChart } from "@/components/charts/AttendanceChart";
import { FeeChart } from "@/components/charts/FeeChart";
import { PerformanceChart } from "@/components/charts/PerformanceChart";
import { RecentActivity } from "@/components/RecentActivity";
import { UpcomingExams } from "@/components/UpcomingExams";
import { PendingFees } from "@/components/PendingFees";
import { SchoolCalendar } from "@/components/SchoolCalendar";
import api from "@/lib/api";
import type { LucideIcon } from "lucide-react";

interface GradientStat {
  title: string;
  value: string;
  trend: string;
  trendUp: boolean;
  icon: LucideIcon;
  bg: string;
}

interface DashData {
  stats: {
    totalTeachers: number;
    totalStudents: number;
    feeCollected: number;
    todayPresent: number;
    todayAbsent: number;
  };
  attendanceOverview:  { day: string; present: number; absent: number }[];
  feeMonthly:          { month: string; collected: number; pending: number }[];
  classPerformance:    { name: string; avg: number }[];
  upcomingExams:       { title: string; date: string }[];
  pendingFeeStudents:  { name: string; class: string; amount: number; paid: number; photo: string; title: string; dueDate: string | null; status: string }[];
  calendarEvents:      { title: string; startDate: string; eventType: string }[];
  recentActivity:      { type: "fee" | "student" | "notice"; text: string; time: string }[];
}

const defaultStats: GradientStat[] = [
  { title: "Total Students",  value: "…", trend: "", trendUp: true,  icon: Users,        bg: "gradient-orange" },
  { title: "Total Teachers",  value: "…", trend: "", trendUp: true,  icon: GraduationCap, bg: "gradient-blue"  },
  { title: "Attendance Rate", value: "…", trend: "", trendUp: true,  icon: CalendarCheck, bg: "gradient-cyan"  },
  { title: "Fee Collection",  value: "…", trend: "", trendUp: false, icon: DollarSign,    bg: "gradient-warm"  },
];

const Index = () => {
  const [stats,    setStats]    = useState<GradientStat[]>(defaultStats);
  const [dashData, setDashData] = useState<DashData | null>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    api.get("/dashboard/admin")
      .then((res) => {
        const d: DashData = res.data?.data ?? res.data ?? {};
        const s = d.stats ?? {} as DashData["stats"];
        const todayTotal     = (s.todayPresent ?? 0) + (s.todayAbsent ?? 0);
        const attendanceRate = todayTotal > 0 ? Math.round((s.todayPresent / todayTotal) * 100) : null;

        setStats([
          {
            title:   "Total Students",
            value:   s.totalStudents != null ? Number(s.totalStudents).toLocaleString() : "—",
            trend:   "",
            trendUp: true,
            icon:    Users,
            bg:      "gradient-orange",
          },
          {
            title:   "Total Teachers",
            value:   s.totalTeachers != null ? Number(s.totalTeachers).toLocaleString() : "—",
            trend:   "",
            trendUp: true,
            icon:    GraduationCap,
            bg:      "gradient-blue",
          },
          {
            title:   "Attendance Rate",
            value:   attendanceRate != null ? `${attendanceRate}%` : "—",
            trend:   "",
            trendUp: true,
            icon:    CalendarCheck,
            bg:      "gradient-cyan",
          },
          {
            title:   "Fee Collection",
            value:   s.feeCollected != null ? `₹${Number(s.feeCollected).toLocaleString()}` : "—",
            trend:   "",
            trendUp: false,
            icon:    DollarSign,
            bg:      "gradient-warm",
          },
        ]);

        setDashData(d);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const skeleton = <div className="h-[280px] bg-secondary rounded-xl animate-pulse" />;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome back! Here's what's happening today.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div key={stat.title} className="glass-card overflow-hidden hover-lift">
              <div className={`${stat.bg} p-5 text-white`}>
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                <div className="relative flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-90">{stat.title}</p>
                    <p className="text-3xl font-bold mt-1 font-mono-stats">{stat.value}</p>
                    {stat.trend && (
                      <div className="flex items-center gap-1 mt-2 text-xs font-medium opacity-90">
                        {stat.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {stat.trend}
                      </div>
                    )}
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
          {loading ? skeleton : <AttendanceChart data={dashData?.attendanceOverview ?? []} />}
          {loading ? skeleton : <FeeChart        data={dashData?.feeMonthly         ?? []} />}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2">
            {loading ? skeleton : <PerformanceChart data={dashData?.classPerformance ?? []} />}
          </div>
          <RecentActivity items={dashData?.recentActivity ?? []} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <UpcomingExams exams={dashData?.upcomingExams      ?? []} />
          <PendingFees   pending={dashData?.pendingFeeStudents ?? []} />
          <SchoolCalendar events={dashData?.calendarEvents    ?? []} />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
