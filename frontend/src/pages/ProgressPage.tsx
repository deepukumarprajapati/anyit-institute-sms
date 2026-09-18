import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, Award, BookOpen, BarChart3, ArrowUpRight, Loader2 } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar,
} from "recharts";
import api from "@/lib/api";

interface ProgressData {
  overallGPA:       string;
  rank:             string;
  subjectCount:     number;
  avgScore:         string;
  performanceTrend: { month: string; score: number }[];
  subjectData:      { subject: string; score: number; classAvg: number; grade: string }[];
  remarks:          { date: string; teacher: string; subject: string; remark: string; positive: boolean }[];
  hasResults:       boolean;
}

export default function ProgressPage() {
  const [data,    setData]    = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/progress/student/me")
      .then((res) => setData(res.data?.data || null))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const performanceTrend = data?.performanceTrend || [];
  const subjectData      = data?.subjectData      || [];
  const radarData        = subjectData.map((s) => ({ subject: s.subject, student: s.score, classAvg: s.classAvg }));
  const remarks          = data?.remarks          || [];
  const overallGPA       = data?.overallGPA       || "—";
  const rank             = data?.rank             || "—";

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Progress Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">Detailed insights into academic performance and growth.</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { title: "Overall GPA",  value: loading ? "…" : overallGPA,                        trend: "From exam results",    up: true, icon: Award,     bg: "gradient-orange" },
            { title: "Class Rank",   value: loading ? "…" : rank,                               trend: "In your class",        up: true, icon: TrendingUp, bg: "gradient-blue"   },
            { title: "Subjects",     value: loading ? "…" : String(data?.subjectCount ?? 0),    trend: "Across all subjects",  up: true, icon: BookOpen,   bg: "gradient-cyan"   },
            { title: "Avg Score",    value: loading ? "…" : (data?.avgScore || "—"),             trend: "Overall performance",  up: true, icon: BarChart3,  bg: "gradient-green"  },
          ].map((s) => (
            <Card key={s.title} className="hover-lift overflow-hidden">
              <div className={`${s.bg} p-5 text-white`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-90">{s.title}</p>
                    <p className="text-3xl font-bold mt-1 font-mono-stats">{s.value}</p>
                    <div className="flex items-center gap-1 mt-2 text-xs font-medium opacity-90">
                      <ArrowUpRight className="h-3 w-3" />
                      {s.trend}
                    </div>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
                    <s.icon className="h-6 w-6" />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !data?.hasResults ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">No exam results yet. Results will appear here once exams are graded.</p>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="overview" className="space-y-4">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="subjects">Subject-wise</TabsTrigger>
              <TabsTrigger value="remarks">Teacher Remarks</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="hover-lift">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg orange-icon-bg flex items-center justify-center"><TrendingUp className="h-4 w-4 text-primary" /></div>
                      Performance Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {performanceTrend.length === 0 ? (
                      <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No attendance data available.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <LineChart data={performanceTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                          <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                          <Line type="monotone" dataKey="score" stroke="#FF9A5A" strokeWidth={3} dot={{ fill: "#FF6B2B", r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <Card className="hover-lift">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg orange-icon-bg flex items-center justify-center"><BarChart3 className="h-4 w-4 text-primary" /></div>
                      Student vs Class Average
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {radarData.length === 0 ? (
                      <div className="flex items-center justify-center h-[280px] text-muted-foreground text-sm">No subject data available.</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={280}>
                        <RadarChart data={radarData}>
                          <PolarGrid stroke="hsl(var(--border))" />
                          <PolarAngleAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                          <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                          <Radar name="Student" dataKey="student" stroke="#FF9A5A" fill="#FF9A5A" fillOpacity={0.3} />
                          <Radar name="Class Avg" dataKey="classAvg" stroke="#33C6E7" fill="#33C6E7" fillOpacity={0.15} />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                        </RadarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="subjects">
              <Card className="hover-lift">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base font-semibold">Subject-wise Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  {subjectData.length === 0 ? (
                    <div className="flex items-center justify-center h-[300px] text-muted-foreground text-sm">No subject data available.</div>
                  ) : (
                    <>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={subjectData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="subject" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                          <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                          <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                          <Bar dataKey="score" fill="#FF9A5A" radius={[6, 6, 0, 0]} name="Your Score" />
                          <Bar dataKey="classAvg" fill="#33C6E7" radius={[6, 6, 0, 0]} name="Class Average" />
                        </BarChart>
                      </ResponsiveContainer>

                      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                        {subjectData.map((s) => (
                          <div key={s.subject} className="p-3 rounded-xl bg-secondary text-center">
                            <p className="text-xs text-muted-foreground">{s.subject}</p>
                            <p className="text-lg font-bold text-foreground font-mono-stats mt-1">{s.score}%</p>
                            <Badge variant="secondary" className="mt-1 text-[10px]">{s.grade}</Badge>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="remarks">
              {remarks.length === 0 ? (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <BookOpen className="h-10 w-10 mb-3 opacity-30" />
                    <p className="text-sm">No teacher remarks yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {remarks.map((r, i) => (
                    <Card key={i} className="hover-lift">
                      <CardContent className="p-5">
                        <div className="flex items-start gap-3">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${r.positive ? "bg-[hsl(var(--success))]/10" : "bg-[hsl(var(--warning))]/10"}`}>
                            <BookOpen className={`h-5 w-5 ${r.positive ? "text-[hsl(var(--success))]" : "text-[hsl(var(--warning))]"}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-semibold text-foreground">{r.teacher}</span>
                              <Badge variant="secondary" className="text-[10px]">{r.subject}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{r.remark}</p>
                            <p className="text-xs text-muted-foreground mt-2">{r.date}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
