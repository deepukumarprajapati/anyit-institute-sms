import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ClipboardList, Trophy, TrendingUp, Calendar,
  BookOpen, CheckCircle, XCircle, Loader2, GraduationCap,
  FileText, Timer, ArrowUpRight, Clock, Download,
} from "lucide-react";
import api from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Types ─────────────────────────────────────────────────────────────────────

interface SubjectEntry {
  _id: string;
  subject: string;
  subjectCode: string;
  date: string;
  totalMarks: number;
  passingMarks: number;
  duration: number;
}

interface ExamItem {
  _id: string;
  title: string;
  subject: string;
  subjectCode: string;
  date: string;
  endDate?: string;
  examType: string;
  class: string;
  section: string;
  status: string;
  totalMarks?: number;
  passingMarks?: number;
  duration?: number;
  description?: string;
  source: "test" | "scheduledExam";
  subjects: SubjectEntry[];
}

interface ResultItem {
  _id: string;
  sourceType?: string;
  exam:            { title: string; subject: string; date: string; examType: string; totalMarks: number } | null;
  testId?:         { title: string; date: string; totalMarks: number; subjectId?: { name: string; code: string } } | null;
  scheduledExamId?:{ title: string; examType: string; startDate: string } | null;
  examSubjectId?:  { date: string; totalMarks: number; subjectId?: { name: string; code: string } } | null;
  marksObtained:   number;
  totalMarks:      number;
  percentage:      number;
  grade:           string;
  isPassed:        boolean;
  remarks:         string;
}

interface NormalizedResult {
  _id: string;
  title:     string;
  subject:   string;
  examType:  string;
  date:      string;
  marks:     number;
  total:     number;
  pct:       number;
  grade:     string;
  passed:    boolean;
  remarks:   string;
}

function normalizeResult(r: ResultItem): NormalizedResult {
  if (r.sourceType === "test" && r.testId) {
    return {
      _id: r._id, title: r.testId.title,
      subject: r.testId.subjectId?.name ?? "—",
      examType: "test", date: r.testId.date,
      marks: r.marksObtained, total: r.totalMarks,
      pct: r.percentage, grade: r.grade, passed: r.isPassed, remarks: r.remarks,
    };
  }
  if (r.sourceType === "scheduledExam" && r.scheduledExamId) {
    return {
      _id: r._id, title: r.scheduledExamId.title,
      subject: r.examSubjectId?.subjectId?.name ?? "—",
      examType: r.scheduledExamId.examType,
      date: r.examSubjectId?.date ?? r.scheduledExamId.startDate,
      marks: r.marksObtained, total: r.totalMarks,
      pct: r.percentage, grade: r.grade, passed: r.isPassed, remarks: r.remarks,
    };
  }
  return {
    _id: r._id, title: r.exam?.title ?? "—",
    subject: r.exam?.subject ?? "—",
    examType: r.exam?.examType ?? "—",
    date: r.exam?.date ?? "",
    marks: r.marksObtained, total: r.exam?.totalMarks ?? r.totalMarks,
    pct: r.percentage, grade: r.grade, passed: r.isPassed, remarks: r.remarks,
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const fmtDay = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { weekday: "short" }) : "";

function daysUntil(dateStr: string) {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function CountdownBadge({ date }: { date: string }) {
  const days = daysUntil(date);
  if (days <= 0) return <Badge className="text-[10px] bg-destructive/10 text-destructive border border-destructive/20">Today</Badge>;
  if (days === 1) return <Badge className="text-[10px] bg-warning/10 text-warning border border-warning/20">Tomorrow</Badge>;
  if (days <= 7)  return <Badge className="text-[10px] bg-warning/10 text-warning border border-warning/20">{days}d left</Badge>;
  return <Badge variant="secondary" className="text-[10px] text-muted-foreground">{days}d left</Badge>;
}

const examTypeLabel: Record<string, string> = {
  test: "Unit Test", midterm: "Mid-term", final: "Final Exam", unit: "Unit Exam", annual: "Annual Exam",
};
const examTypeBadge: Record<string, string> = {
  test:    "bg-primary/10 text-primary border-primary/20",
  midterm: "bg-warning/10 text-warning border-warning/20",
  final:   "bg-destructive/10 text-destructive border-destructive/20",
  unit:    "bg-primary/10 text-primary border-primary/20",
  annual:  "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20",
};

function gradeColor(g: string) {
  if (["A+","A"].includes(g)) return "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]";
  if (["B+","B"].includes(g)) return "bg-primary/10 text-primary";
  if (g === "C")              return "bg-warning/10 text-warning";
  return "bg-destructive/10 text-destructive";
}

// ── Stats Card ─────────────────────────────────────────────────────────────────

function StatCard({ title, value, sub, icon: Icon, gradient }: {
  title: string; value: string; sub: string;
  icon: React.ComponentType<{ className?: string }>; gradient: string;
}) {
  return (
    <Card className="hover-lift overflow-hidden">
      <div className={`${gradient} p-5 text-white`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium opacity-90">{title}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
            <p className="text-xs mt-2 opacity-80 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" />{sub}
            </p>
          </div>
          <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </div>
    </Card>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────

function Empty({ icon: Icon, title, sub }: {
  icon: React.ComponentType<{ className?: string }>; title: string; sub: string;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
        <Icon className="h-12 w-12 mb-3 opacity-25" />
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs mt-1 text-center max-w-xs">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function StudentExamsPage() {
  const [upcoming,        setUpcoming]        = useState<ExamItem[]>([]);
  const [results,         setResults]         = useState<ResultItem[]>([]);
  const [avgPct,          setAvgPct]          = useState(0);
  const [loadingUpcoming, setLoadingUpcoming] = useState(true);
  const [loadingResults,  setLoadingResults]  = useState(true);
  const [pdfGenerating,   setPdfGenerating]   = useState(false);

  useEffect(() => {
    api.get("/exams/upcoming")
      .then((res) => setUpcoming(res.data?.data || []))
      .catch(() => {})
      .finally(() => setLoadingUpcoming(false));

    api.get("/exams/results/me")
      .then((res) => {
        const d = res.data?.data || {};
        setResults(d.results || []);
        setAvgPct(d.averagePercentage || 0);
      })
      .catch(() => {})
      .finally(() => setLoadingResults(false));
  }, []);

  const tests    = upcoming.filter((e) => e.source === "test");
  const exams    = upcoming.filter((e) => e.source === "scheduledExam");
  const normResults = results.map(normalizeResult);
  const passed   = normResults.filter((r) => r.passed).length;
  const failed   = normResults.filter((r) => !r.passed).length;
  const passRate = normResults.length > 0 ? Math.round((passed / normResults.length) * 100) : 0;

  const downloadPdf = () => {
    if (!normResults.length) return;
    setPdfGenerating(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Result Card", 105, 18, { align: "center" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated: ${new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`, 105, 26, { align: "center" });
      doc.text(`Total Results: ${normResults.length}   |   Average: ${avgPct}%   |   Pass Rate: ${passRate}%`, 105, 33, { align: "center" });

      autoTable(doc, {
        startY: 40,
        head: [["#","Exam / Test","Subject","Type","Date","Obtained","Out Of","%","Grade","Status"]],
        body: normResults.map((r, i) => [
          i + 1, r.title, r.subject,
          examTypeLabel[r.examType] || r.examType,
          r.date ? new Date(r.date).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—",
          r.marks, r.total, `${r.pct}%`, r.grade, r.passed ? "Pass" : "Fail",
        ]),
        styles:     { fontSize: 8 },
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [248, 248, 255] },
        columnStyles: { 9: { fontStyle: "bold" } },
      });

      doc.save("result-card.pdf");
    } finally {
      setPdfGenerating(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" /> Tests & Exams
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete schedule with subject-wise dates, marks, and your results.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Upcoming Tests" gradient="gradient-blue" icon={FileText}
            value={loadingUpcoming ? "…" : String(tests.length)}
            sub={tests.length > 0 ? `Next: ${fmtDate(tests[0].date)}` : "None scheduled"}
          />
          <StatCard
            title="Upcoming Exams" gradient="gradient-orange" icon={GraduationCap}
            value={loadingUpcoming ? "…" : String(exams.length)}
            sub={exams.length > 0 ? `Next: ${fmtDate(exams[0].date)}` : "None scheduled"}
          />
          <StatCard
            title="Average Score" gradient="gradient-green" icon={TrendingUp}
            value={loadingResults ? "…" : results.length > 0 ? `${avgPct}%` : "—"}
            sub={avgPct >= 75 ? "Good performance" : avgPct > 0 ? "Needs improvement" : "No results yet"}
          />
          <StatCard
            title="Pass Rate" gradient="gradient-cyan" icon={Trophy}
            value={loadingResults ? "…" : results.length > 0 ? `${passRate}%` : "—"}
            sub={results.length > 0 ? `${passed} passed · ${failed} failed` : "No results yet"}
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tests" className="space-y-4">
          <TabsList>
            <TabsTrigger value="tests" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Tests
              {!loadingUpcoming && tests.length > 0 && (
                <Badge className="ml-1 h-4 min-w-4 px-1 text-[10px] btn-gradient border-0 text-white rounded-full">
                  {tests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="exams" className="gap-1.5">
              <GraduationCap className="h-3.5 w-3.5" /> Exams
              {!loadingUpcoming && exams.length > 0 && (
                <Badge className="ml-1 h-4 min-w-4 px-1 text-[10px] btn-gradient border-0 text-white rounded-full">
                  {exams.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-1.5">
              <Trophy className="h-3.5 w-3.5" /> My Results
              {!loadingResults && results.length > 0 && (
                <Badge className="ml-1 h-4 min-w-4 px-1 text-[10px] btn-gradient border-0 text-white rounded-full">
                  {results.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── TESTS TAB ──────────────────────────────────────────────────── */}
          <TabsContent value="tests">
            {loadingUpcoming ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : tests.length === 0 ? (
              <Empty icon={FileText} title="No upcoming tests" sub="Tests scheduled by your teacher will appear here with full details." />
            ) : (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Upcoming Tests — {tests.length} scheduled
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-y border-border bg-muted/50">
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">#</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Subject</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Test Name</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Day</th>
                          <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Date</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Total Marks</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Passing Marks</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">Duration</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                          <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground">Countdown</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {tests.map((t, i) => (
                          <tr key={t._id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-3.5 text-xs text-muted-foreground">{i + 1}</td>
                            <td className="px-4 py-3.5">
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <div>
                                  <p className="font-semibold text-foreground text-sm">{t.subject || "—"}</p>
                                  {t.subjectCode && <p className="text-[10px] text-muted-foreground">{t.subjectCode}</p>}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-foreground max-w-[180px]">
                              <p className="font-medium truncate">{t.title}</p>
                              {t.description && (
                                <p className="text-xs text-muted-foreground truncate mt-0.5">{t.description}</p>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-muted-foreground text-sm whitespace-nowrap">
                              {fmtDay(t.date)}
                            </td>
                            <td className="px-4 py-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5 text-sm text-foreground font-medium">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                {fmtDate(t.date)}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="text-lg font-bold text-foreground">{t.totalMarks ?? "—"}</span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="text-base font-semibold text-[hsl(var(--success))]">
                                {t.passingMarks ?? (t.totalMarks ? Math.ceil(t.totalMarks * 0.33) : "—")}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-1 text-sm font-medium text-muted-foreground">
                                <Timer className="h-3.5 w-3.5" />
                                {t.duration ? `${t.duration} min` : "—"}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <Badge variant="secondary" className={`text-[10px] capitalize border ${examTypeBadge["test"]}`}>
                                {t.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <CountdownBadge date={t.date} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── EXAMS TAB ──────────────────────────────────────────────────── */}
          <TabsContent value="exams">
            {loadingUpcoming ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : exams.length === 0 ? (
              <Empty icon={GraduationCap} title="No upcoming exams" sub="Scheduled exams created by your admin will appear here with the full paper-wise schedule." />
            ) : (
              <div className="space-y-5">
                {exams.map((exam) => {
                  const spanDays = exam.endDate
                    ? Math.ceil((new Date(exam.endDate).getTime() - new Date(exam.date).getTime()) / (1000 * 60 * 60 * 24)) + 1
                    : null;
                  const now     = Date.now();
                  const started = new Date(exam.date).getTime() <= now;
                  const ended   = exam.endDate && new Date(exam.endDate).getTime() < now;
                  const isOngoing = started && !ended;
                  const days    = daysUntil(exam.date);

                  return (
                    <Card key={exam._id} className="hover-lift">
                      {/* Exam Header */}
                      <CardHeader className="pb-3 border-b border-border">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                              <GraduationCap className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <Badge variant="secondary" className={`text-[10px] capitalize border ${examTypeBadge[exam.examType] || examTypeBadge["test"]}`}>
                                  {examTypeLabel[exam.examType] || exam.examType}
                                </Badge>
                                <Badge variant="secondary" className="text-[10px] bg-muted text-muted-foreground border border-border">
                                  Class {exam.class}{exam.section ? `-${exam.section}` : ""}
                                </Badge>
                                {isOngoing && (
                                  <Badge className="text-[10px] bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border border-[hsl(var(--success))]/20">
                                    Ongoing
                                  </Badge>
                                )}
                              </div>
                              <CardTitle className="text-base font-bold text-foreground">{exam.title}</CardTitle>
                            </div>
                          </div>

                          {/* Date range summary */}
                          <div className="flex items-center gap-4 text-sm shrink-0">
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground mb-0.5">Start</p>
                              <p className="font-semibold text-foreground">{fmtDate(exam.date)}</p>
                            </div>
                            <div className="text-muted-foreground text-xs">→</div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground mb-0.5">End</p>
                              <p className="font-semibold text-foreground">{exam.endDate ? fmtDate(exam.endDate) : "—"}</p>
                            </div>
                            <div className="text-center">
                              <p className="text-xs text-muted-foreground mb-0.5">Duration</p>
                              <p className="font-semibold text-primary">{spanDays ? `${spanDays} days` : "—"}</p>
                            </div>
                            {!isOngoing && (
                              <div className="text-center">
                                <p className="text-xs text-muted-foreground mb-0.5">Starts in</p>
                                <CountdownBadge date={exam.date} />
                              </div>
                            )}
                          </div>
                        </div>
                        {exam.description && (
                          <p className="text-xs text-muted-foreground mt-2 ml-13 pl-13">
                            {exam.description}
                          </p>
                        )}
                      </CardHeader>

                      {/* Per-subject paper table */}
                      <CardContent className="p-0">
                        {exam.subjects.length === 0 ? (
                          <div className="flex items-center gap-2 px-5 py-4 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4 shrink-0" />
                            Subject-wise schedule will be updated by your admin. Check back later.
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-muted/40">
                                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground">#</th>
                                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Subject / Paper</th>
                                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Day</th>
                                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Date</th>
                                  <th className="text-center px-5 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Total Marks</th>
                                  <th className="text-center px-5 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Passing Marks</th>
                                  <th className="text-center px-5 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">Duration</th>
                                  <th className="text-center px-5 py-2.5 text-xs font-semibold text-muted-foreground">Countdown</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/60">
                                {exam.subjects.map((s, idx) => (
                                  <tr key={s._id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-5 py-3 text-xs text-muted-foreground">{idx + 1}</td>
                                    <td className="px-5 py-3">
                                      <div className="flex items-center gap-2">
                                        <div className="h-6 w-6 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                          <BookOpen className="h-3 w-3 text-primary" />
                                        </div>
                                        <div>
                                          <p className="font-semibold text-foreground">{s.subject}</p>
                                          {s.subjectCode && <p className="text-[10px] text-muted-foreground">{s.subjectCode}</p>}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-5 py-3 text-muted-foreground text-sm">{fmtDay(s.date)}</td>
                                    <td className="px-5 py-3 whitespace-nowrap">
                                      <div className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                        {fmtDate(s.date)}
                                      </div>
                                    </td>
                                    <td className="px-5 py-3 text-center">
                                      <span className="text-lg font-bold text-foreground">{s.totalMarks}</span>
                                    </td>
                                    <td className="px-5 py-3 text-center">
                                      <span className="text-base font-semibold text-[hsl(var(--success))]">{s.passingMarks}</span>
                                    </td>
                                    <td className="px-5 py-3 text-center">
                                      <div className="flex items-center justify-center gap-1 text-sm font-medium text-muted-foreground">
                                        <Timer className="h-3.5 w-3.5" />
                                        {s.duration} min
                                      </div>
                                    </td>
                                    <td className="px-5 py-3 text-center">
                                      <CountdownBadge date={s.date} />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                              {/* Totals row */}
                              {exam.subjects.length > 1 && (
                                <tfoot>
                                  <tr className="border-t-2 border-border bg-muted/40">
                                    <td colSpan={4} className="px-5 py-2.5 text-xs font-semibold text-muted-foreground">
                                      Total ({exam.subjects.length} papers)
                                    </td>
                                    <td className="px-5 py-2.5 text-center">
                                      <span className="text-sm font-bold text-foreground">
                                        {exam.subjects.reduce((s, e) => s + e.totalMarks, 0)}
                                      </span>
                                    </td>
                                    <td className="px-5 py-2.5 text-center">
                                      <span className="text-sm font-semibold text-[hsl(var(--success))]">
                                        {exam.subjects.reduce((s, e) => s + e.passingMarks, 0)}
                                      </span>
                                    </td>
                                    <td colSpan={2} />
                                  </tr>
                                </tfoot>
                              )}
                            </table>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* ── RESULTS TAB ────────────────────────────────────────────────── */}
          <TabsContent value="results">
            {loadingResults ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : normResults.length === 0 ? (
              <Empty icon={Trophy} title="No results yet" sub="Results will appear here once your teacher publishes your marks." />
            ) : (
              <div className="space-y-4">
                {/* Summary row with PDF download */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="grid grid-cols-3 gap-3 flex-1">
                    {[
                      { icon: CheckCircle, val: passed,       label: "Passed",  color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success))]/10" },
                      { icon: XCircle,    val: failed,        label: "Failed",  color: "text-destructive",           bg: "bg-destructive/10"            },
                      { icon: TrendingUp, val: `${avgPct}%`,  label: "Average", color: "text-primary",               bg: "orange-icon-bg"               },
                    ].map((s) => (
                      <Card key={s.label} className="hover-lift">
                        <CardContent className="p-4 text-center">
                          <div className={`h-9 w-9 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                            <s.icon className={`h-5 w-5 ${s.color}`} />
                          </div>
                          <p className={`text-2xl font-bold ${s.color}`}>{s.val}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  <Button
                    onClick={downloadPdf}
                    disabled={pdfGenerating}
                    className="gap-2 shrink-0"
                    variant="outline"
                  >
                    {pdfGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Download Result Card (PDF)
                  </Button>
                </div>

                {/* Results Table */}
                <Card className="hover-lift">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <ClipboardList className="h-4 w-4 text-primary" /> All Results ({normResults.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-y border-border bg-muted/50">
                            {["#","Exam / Test","Subject","Type","Date","Obtained","Out Of","Percentage","Grade","Status"].map((h) => (
                              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {normResults.map((r, i) => (
                            <tr key={r._id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-3.5 text-xs text-muted-foreground">{i + 1}</td>
                              <td className="px-4 py-3.5 max-w-[160px]">
                                <p className="font-medium text-foreground truncate">{r.title}</p>
                                {r.remarks && <p className="text-xs text-muted-foreground italic truncate mt-0.5">"{r.remarks}"</p>}
                              </td>
                              <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap">{r.subject}</td>
                              <td className="px-4 py-3.5">
                                <Badge variant="secondary" className="text-[10px] capitalize">
                                  {examTypeLabel[r.examType] || r.examType}
                                </Badge>
                              </td>
                              <td className="px-4 py-3.5 text-muted-foreground whitespace-nowrap text-xs">
                                {r.date ? fmtDate(r.date) : "—"}
                              </td>
                              <td className="px-4 py-3.5">
                                <span className="text-xl font-bold text-foreground">{r.marks}</span>
                              </td>
                              <td className="px-4 py-3.5 text-muted-foreground font-medium">{r.total}</td>
                              <td className="px-4 py-3.5">
                                <div className="flex items-center gap-2">
                                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                      className={`h-full rounded-full ${r.pct >= 75 ? "bg-[hsl(var(--success))]" : r.pct >= 50 ? "bg-warning" : "bg-destructive"}`}
                                      style={{ width: `${Math.min(r.pct, 100)}%` }}
                                    />
                                  </div>
                                  <span className="text-xs font-semibold">{r.pct}%</span>
                                </div>
                              </td>
                              <td className="px-4 py-3.5">
                                <Badge variant="secondary" className={`text-xs font-bold ${gradeColor(r.grade)}`}>{r.grade}</Badge>
                              </td>
                              <td className="px-4 py-3.5">
                                <Badge variant="secondary" className={`text-xs ${r.passed ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : "bg-destructive/10 text-destructive"}`}>
                                  {r.passed ? "Pass" : "Fail"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>

                {/* Subject-wise performance */}
                {normResults.length >= 2 && (() => {
                  const m: Record<string, { sum: number; n: number }> = {};
                  normResults.forEach((r) => {
                    const k = r.subject || "General";
                    if (!m[k]) m[k] = { sum: 0, n: 0 };
                    m[k].sum += r.pct; m[k].n++;
                  });
                  const list = Object.entries(m)
                    .map(([subject, d]) => ({ subject, avg: Math.round(d.sum / d.n), count: d.n }))
                    .sort((a, b) => b.avg - a.avg);
                  return (
                    <Card className="hover-lift">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary" /> Subject-wise Performance
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-5 space-y-3">
                        {list.map((s) => (
                          <div key={s.subject}>
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{s.subject}</span>
                                <span className="text-xs text-muted-foreground">({s.count} result{s.count > 1 ? "s" : ""})</span>
                              </div>
                              <span className={`text-sm font-bold ${s.avg >= 75 ? "text-[hsl(var(--success))]" : s.avg >= 50 ? "text-warning" : "text-destructive"}`}>
                                {s.avg}%
                              </span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${s.avg >= 75 ? "bg-[hsl(var(--success))]" : s.avg >= 50 ? "bg-warning" : "bg-destructive"}`}
                                style={{ width: `${s.avg}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  );
                })()}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
