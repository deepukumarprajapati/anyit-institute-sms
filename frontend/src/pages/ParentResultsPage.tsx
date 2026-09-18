import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, BookOpen, Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import api from "@/lib/api";

interface Result {
  _id: string;
  marksObtained: number;
  totalMarks: number;
  percentage: number;
  grade: string;
  isPassed: boolean;
  remarks?: string;
  createdAt: string;
  exam?: { title: string; subject: string; date: string; examType: string; totalMarks: number; };
}

interface ChildResults {
  studentId: string;
  studentName: string;
  studentClass: string;
  section: string;
  results: Result[];
}

const gradeColor = (grade: string) => {
  if (grade === "A+" || grade === "A") return "#22c55e";
  if (grade === "B+" || grade === "B") return "#3b82f6";
  if (grade === "C" || grade === "D") return "#f59e0b";
  return "#ef4444";
};

const gradeBadge = (grade: string) => {
  if (grade === "A+" || grade === "A") return "bg-success/10 text-success border-0";
  if (grade === "B+" || grade === "B") return "bg-blue-500/10 text-blue-600 border-0";
  if (grade === "C" || grade === "D") return "bg-warning/10 text-warning border-0";
  return "bg-destructive/10 text-destructive border-0";
};

export default function ParentResultsPage() {
  const [children, setChildren] = useState<ChildResults[]>([]);
  const [selectedChild, setSelectedChild] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get("/dashboard/parent")
      .then(async res => {
        const kids = res.data.data.children || [];
        const results = await Promise.all(
          kids.map(async (k: any) => {
            try {
              // Fetch all results for this student
              const rRes = await api.get(`/exams/results/student/${k.student._id}`);
              const allResults: Result[] = rRes.data.data?.results || rRes.data.results || [];
              return {
                studentId: k.student._id,
                studentName: k.student.name,
                studentClass: k.student.class,
                section: k.student.section,
                results: allResults,
              };
            } catch {
              // fallback: use results from dashboard
              return {
                studentId: k.student._id,
                studentName: k.student.name,
                studentClass: k.student.class,
                section: k.student.section,
                results: k.recentResults || [],
              };
            }
          })
        );
        setChildren(results);
      })
      .catch(err => setError(err?.response?.data?.message || "Failed to load results."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading results...
      </div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64 text-destructive">{error}</div>
    </DashboardLayout>
  );

  const child = children[selectedChild];
  const results = child?.results || [];
  const avgMarks = results.length > 0 ? Math.round(results.reduce((s, r) => s + r.percentage, 0) / results.length) : 0;
  const passed = results.filter(r => r.isPassed).length;

  const chartData = results.slice().reverse().map(r => ({
    name: r.exam?.subject || "Exam",
    score: r.percentage,
    grade: r.grade,
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading">Results & Report Card</h1>
            <p className="text-sm text-muted-foreground mt-1">View all exam results for your child.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {children.map((c, i) => (
              <button key={c.studentId} onClick={() => setSelectedChild(i)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${i === selectedChild ? "border-primary bg-primary/5" : "border-border bg-white hover:bg-secondary"}`}>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="orange-icon-bg text-primary text-xs font-bold">
                    {c.studentName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">{c.studentName}</p>
                  <p className="text-xs text-muted-foreground">Class {c.studentClass}{c.section ? ` – ${c.section}` : ""}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {!child ? (
          <p className="text-center text-muted-foreground py-20">No results data found.</p>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="glass-card overflow-hidden hover-lift">
                <div className="gradient-green p-5 text-white relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <div className="relative">
                    <p className="text-sm font-medium opacity-90">Average Score</p>
                    <p className="text-3xl font-bold mt-1 font-mono-stats">{avgMarks}%</p>
                    <p className="text-xs opacity-80 mt-1">Across {results.length} exams</p>
                  </div>
                </div>
              </div>
              <div className="glass-card overflow-hidden hover-lift">
                <div className="gradient-cyan p-5 text-white relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <div className="relative">
                    <p className="text-sm font-medium opacity-90">Passed</p>
                    <p className="text-3xl font-bold mt-1 font-mono-stats">{passed}/{results.length}</p>
                    <p className="text-xs opacity-80 mt-1">Exams cleared</p>
                  </div>
                </div>
              </div>
              <div className="glass-card overflow-hidden hover-lift">
                <div className="gradient-blue p-5 text-white relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <div className="relative">
                    <p className="text-sm font-medium opacity-90">Total Exams</p>
                    <p className="text-3xl font-bold mt-1 font-mono-stats">{results.length}</p>
                    <p className="text-xs opacity-80 mt-1">Appeared</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
              <div className="glass-card">
                <div className="p-5 border-b border-border">
                  <h3 className="text-base font-semibold font-heading flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Performance Chart
                  </h3>
                </div>
                <div className="p-5">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={chartData} barSize={36}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 12 }}
                        formatter={(val: any, _: any, props: any) => [`${val}% (${props.payload.grade})`, "Score"]}
                      />
                      <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={gradeColor(entry.grade)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Results List */}
            <div className="glass-card">
              <div className="p-5 border-b border-border flex items-center gap-2">
                <Trophy className="h-4 w-4 text-primary" />
                <h3 className="text-base font-semibold font-heading">All Exam Results</h3>
              </div>
              <div className="p-5 space-y-3">
                {results.length === 0 ? (
                  <p className="text-center text-muted-foreground py-10">No exam results yet.</p>
                ) : results.map((r) => (
                  <div key={r._id} className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg orange-icon-bg flex items-center justify-center shrink-0">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{r.exam?.subject || "Exam"}</p>
                        <p className="text-xs text-muted-foreground">{r.exam?.title}</p>
                        {r.exam?.date && (
                          <p className="text-xs text-muted-foreground">
                            {new Date(r.exam.date).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                            {r.exam?.examType ? ` · ${r.exam.examType}` : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-base font-bold font-mono-stats text-foreground">{r.marksObtained}/{r.totalMarks}</p>
                        <div className="flex items-center gap-1 justify-end">
                          {r.percentage >= 70 ? <TrendingUp className="h-3 w-3 text-success" /> :
                           r.percentage < 50 ? <TrendingDown className="h-3 w-3 text-destructive" /> :
                           <Minus className="h-3 w-3 text-warning" />}
                          <span className="text-xs text-muted-foreground">{r.percentage}%</span>
                        </div>
                      </div>
                      <div className="w-16 h-2 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${r.percentage}%`, backgroundColor: gradeColor(r.grade) }} />
                      </div>
                      <Badge className={gradeBadge(r.grade)}>{r.grade}</Badge>
                      <Badge className={r.isPassed ? "bg-success/10 text-success border-0" : "bg-destructive/10 text-destructive border-0"}>
                        {r.isPassed ? "Pass" : "Fail"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
