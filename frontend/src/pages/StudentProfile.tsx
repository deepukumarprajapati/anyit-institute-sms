import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, Loader2,
  BookOpen, Wallet, FileText, GraduationCap, BarChart3,
  Trophy, CheckCircle, XCircle, TrendingUp, Download,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Types ──────────────────────────────────────────────────────
interface StudentData {
  _id: string; name: string; studentId: string;
  email?: string; phone?: string; address?: string;
  class: string; section: string; rollNumber?: string;
  dateOfBirth?: string; bloodGroup?: string; gender?: string;
  photo?: string; feeStatus?: string;
  parent?: { name?: string; email?: string; phone?: string; relation?: string } | null;
  classTeacher?: { name?: string } | null;
  attendance?: number; points?: number; streakDays?: number;
}

interface AttRecord { _id: string; date: string; status: string; class?: string; }
interface AttSummary { total: number; present: number; absent: number; late: number; percentage: number; }

interface MonthlyAtt { month: string; present: number; absent: number; late: number; total: number; }

interface FeeRecord {
  _id: string; title: string; amount: number; paidAmount: number;
  status: string; paidDate?: string; dueDate?: string; paymentMode?: string; receiptNo?: string;
}

interface SubjectResult { examType: string; marks: number; total: number; grade: string; percentage: number; }

interface ProfileResult {
  _id: string;
  sourceType?: string;
  exam?:            { title: string; subject: string; date: string; examType: string; totalMarks: number } | null;
  testId?:          { title: string; date: string; totalMarks: number; subjectId?: { name: string } } | null;
  scheduledExamId?: { title: string; examType: string; startDate: string } | null;
  examSubjectId?:   { date: string; totalMarks: number; subjectId?: { name: string } } | null;
  marksObtained: number; totalMarks: number;
  percentage: number; grade: string; isPassed: boolean; remarks: string;
  isPublished: boolean;
}

interface NormResult {
  _id: string; title: string; subject: string; examType: string; date: string;
  marks: number; total: number; pct: number; grade: string; passed: boolean;
  remarks: string; isPublished: boolean;
}

function normalizeProfileResult(r: ProfileResult): NormResult {
  if (r.sourceType === "test" && r.testId) {
    return {
      _id: r._id, title: r.testId.title,
      subject: r.testId.subjectId?.name ?? "—", examType: "test",
      date: r.testId.date, marks: r.marksObtained, total: r.totalMarks,
      pct: r.percentage, grade: r.grade, passed: r.isPassed, remarks: r.remarks, isPublished: r.isPublished,
    };
  }
  if (r.sourceType === "scheduledExam" && r.scheduledExamId) {
    return {
      _id: r._id, title: r.scheduledExamId.title,
      subject: r.examSubjectId?.subjectId?.name ?? "—",
      examType: r.scheduledExamId.examType,
      date: r.examSubjectId?.date ?? r.scheduledExamId.startDate,
      marks: r.marksObtained, total: r.totalMarks,
      pct: r.percentage, grade: r.grade, passed: r.isPassed, remarks: r.remarks, isPublished: r.isPublished,
    };
  }
  return {
    _id: r._id, title: r.exam?.title ?? "—",
    subject: r.exam?.subject ?? "—", examType: r.exam?.examType ?? "—",
    date: r.exam?.date ?? "", marks: r.marksObtained, total: r.exam?.totalMarks ?? r.totalMarks,
    pct: r.percentage, grade: r.grade, passed: r.isPassed, remarks: r.remarks, isPublished: r.isPublished,
  };
}

const EXAM_TYPE_LABEL: Record<string, string> = {
  test: "Unit Test", midterm: "Mid-term", final: "Final", unit: "Unit", annual: "Annual",
};

function gradeColor(g: string) {
  if (["A+","A"].includes(g)) return "bg-green-100 text-green-700";
  if (["B+","B"].includes(g)) return "bg-blue-100 text-blue-700";
  if (g === "C" || g === "D")  return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

// ── Helpers ────────────────────────────────────────────────────
function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function groupByMonth(records: AttRecord[]): MonthlyAtt[] {
  const map: Record<string, MonthlyAtt> = {};
  records.forEach(r => {
    const key = new Date(r.date).toLocaleString("en-US", { month: "long", year: "numeric" });
    if (!map[key]) map[key] = { month: key, present: 0, absent: 0, late: 0, total: 0 };
    map[key].total++;
    if (r.status === "present") map[key].present++;
    else if (r.status === "absent") map[key].absent++;
    else if (r.status === "late")   map[key].late++;
  });
  return Object.values(map);
}

const STATUS_COLORS: Record<string, string> = {
  paid:     "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20",
  pending:  "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20",
  partial:  "bg-blue-50 text-blue-700 border-blue-200",
  overdue:  "bg-destructive/10 text-destructive border-destructive/20",
};

// ── Component ──────────────────────────────────────────────────
export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [student,    setStudent]    = useState<StudentData | null>(null);
  const [loadingS,   setLoadingS]   = useState(true);

  const [attRecords, setAttRecords] = useState<AttRecord[]>([]);
  const [attSummary, setAttSummary] = useState<AttSummary | null>(null);
  const [loadingA,   setLoadingA]   = useState(true);

  const [subjects,   setSubjects]   = useState<Record<string, SubjectResult[]>>({});
  const [loadingM,   setLoadingM]   = useState(true);

  const [fees,       setFees]       = useState<FeeRecord[]>([]);
  const [feeSummary, setFeeSummary] = useState<{ paid: number; pending: number } | null>(null);
  const [loadingF,   setLoadingF]   = useState(true);

  const [profResults,    setProfResults]    = useState<ProfileResult[]>([]);
  const [profAvg,        setProfAvg]        = useState(0);
  const [loadingR,       setLoadingR]       = useState(true);
  const [pdfGenerating,  setPdfGenerating]  = useState(false);

  useEffect(() => {
    if (!id) return;

    // Student info
    const studentUrl = user?.role === "school_admin"
      ? `/admin/students/${id}`
      : `/students/profile/${id}`;

    setLoadingS(true);
    api.get(studentUrl)
      .then(res => setStudent(res.data?.data || null))
      .catch(() => setStudent(null))
      .finally(() => setLoadingS(false));

    // Attendance history
    setLoadingA(true);
    api.get(`/attendance/history/${id}`)
      .then(res => {
        const d = res.data?.data;
        setAttRecords(d?.records || []);
        setAttSummary(d?.summary || null);
      })
      .catch(() => {})
      .finally(() => setLoadingA(false));

    // Report card (marks)
    setLoadingM(true);
    api.get(`/exams/report-card/${id}`)
      .then(res => setSubjects(res.data?.data?.subjects || {}))
      .catch(() => setSubjects({}))
      .finally(() => setLoadingM(false));

    // Fee history
    setLoadingF(true);
    api.get(`/fees/student/${id}`)
      .then(res => {
        setFees(res.data?.data?.fees || []);
        setFeeSummary(res.data?.data?.summary || null);
      })
      .catch(() => {})
      .finally(() => setLoadingF(false));

    // All results (admin/teacher see published + unpublished)
    setLoadingR(true);
    api.get(`/exams/results/student/${id}`)
      .then(res => {
        const d = res.data?.data || {};
        setProfResults(d.results || []);
        setProfAvg(d.averagePercentage || 0);
      })
      .catch(() => {})
      .finally(() => setLoadingR(false));
  }, [id, user?.role]);

  const monthlyAtt  = groupByMonth(attRecords);
  const normResults = profResults.map(normalizeProfileResult);
  const rPassed     = normResults.filter(r => r.passed).length;
  const rFailed     = normResults.filter(r => !r.passed).length;

  const downloadResultPdf = () => {
    if (!student || !normResults.length) return;
    setPdfGenerating(true);
    try {
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Student Result Card", 105, 16, { align: "center" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Name: ${student.name}   |   Class: ${student.class}${student.section ? `-${student.section}` : ""}   |   Roll No: ${student.rollNumber || "—"}`, 105, 24, { align: "center" });
      doc.text(`Average: ${profAvg}%   |   Passed: ${rPassed}   |   Failed: ${rFailed}`, 105, 31, { align: "center" });

      autoTable(doc, {
        startY: 38,
        head: [["#","Exam / Test","Subject","Type","Date","Obtained","Out Of","%","Grade","Result","Published"]],
        body: normResults.map((r, i) => [
          i + 1, r.title, r.subject,
          EXAM_TYPE_LABEL[r.examType] || r.examType,
          r.date ? new Date(r.date).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—",
          r.marks, r.total, `${r.pct}%`, r.grade,
          r.passed ? "Pass" : "Fail",
          r.isPublished ? "Yes" : "Draft",
        ]),
        styles:     { fontSize: 7.5 },
        headStyles: { fillColor: [79, 70, 229] },
        alternateRowStyles: { fillColor: [248, 248, 255] },
      });

      doc.save(`result-${student.studentId}.pdf`);
    } finally {
      setPdfGenerating(false);
    }
  };

  if (loadingS) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!student) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <p className="text-muted-foreground">Student not found.</p>
          <Button variant="outline" onClick={() => navigate("/students")}>← Back</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground -ml-2" onClick={() => navigate("/students")}>
          <ArrowLeft className="h-4 w-4" /> Back to Students
        </Button>

        {/* ── Header card ── */}
        <div className="glass-card rounded-xl p-6 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
            <Avatar className="h-20 w-20 border-4 border-primary/20 shadow-lg">
              <AvatarImage src={student.photo} alt={student.name} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">{initials(student.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-foreground">{student.name}</h1>
                {student.feeStatus && (
                  <Badge variant="outline" className={`text-xs font-medium ${STATUS_COLORS[student.feeStatus] || ""}`}>
                    {student.feeStatus}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground text-sm">
                Class {student.class}{student.section ? `–${student.section}` : ""}
                {student.rollNumber ? ` · Roll #${student.rollNumber}` : ""}
                {student.studentId ? ` · ID: ${student.studentId}` : ""}
              </p>
              <div className="flex flex-wrap gap-4 pt-2 text-sm text-muted-foreground">
                {student.email    && <span className="flex items-center gap-1.5"><Mail     className="h-3.5 w-3.5" />{student.email}</span>}
                {student.phone    && <span className="flex items-center gap-1.5"><Phone    className="h-3.5 w-3.5" />{student.phone}</span>}
                {student.address  && <span className="flex items-center gap-1.5"><MapPin   className="h-3.5 w-3.5" />{student.address}</span>}
                {student.dateOfBirth && <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />DOB: {fmtDate(student.dateOfBirth)}</span>}
              </div>
            </div>
            {/* Quick stats */}
            <div className="flex gap-3 shrink-0">
              {attSummary && (
                <div className="text-center px-4 py-2 rounded-xl bg-primary/5 border border-primary/10">
                  <p className="text-2xl font-bold text-primary">{attSummary.percentage}%</p>
                  <p className="text-xs text-muted-foreground">Attendance</p>
                </div>
              )}
              {(student.points ?? 0) > 0 && (
                <div className="text-center px-4 py-2 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-2xl font-bold text-amber-600">{student.points}</p>
                  <p className="text-xs text-muted-foreground">Points</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-card border border-border p-1 rounded-lg flex-wrap h-auto gap-1">
            {[
              { value: "overview",    label: "Overview",     icon: GraduationCap },
              { value: "attendance",  label: "Attendance",   icon: BarChart3 },
              { value: "marks",       label: "Marks",        icon: BookOpen },
              { value: "results",     label: "Results",      icon: Trophy },
              { value: "fees",        label: "Fee History",  icon: Wallet },
              { value: "documents",   label: "Documents",    icon: FileText },
            ].map(t => (
              <TabsTrigger key={t.value} value={t.value} className="gap-1.5 rounded-md data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <t.icon className="h-3.5 w-3.5" />{t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* ── Overview ── */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-card rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-primary">{attSummary ? `${attSummary.percentage}%` : "—"}</p>
                <p className="text-sm text-muted-foreground mt-1">Attendance Rate</p>
              </div>
              <div className="glass-card rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-foreground">{attSummary?.present ?? "—"}</p>
                <p className="text-sm text-muted-foreground mt-1">Days Present</p>
              </div>
              <div className="glass-card rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-amber-500">{student.streakDays ?? 0}</p>
                <p className="text-sm text-muted-foreground mt-1">Streak Days</p>
              </div>
              <div className="glass-card rounded-xl p-5 text-center">
                <p className="text-3xl font-bold text-violet-600">{student.points ?? 0}</p>
                <p className="text-sm text-muted-foreground mt-1">Points</p>
              </div>
            </div>

            <div className="glass-card rounded-xl p-5">
              <h3 className="text-base font-semibold text-foreground mb-3">Student Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                {[
                  { label: "Student ID",    value: student.studentId },
                  { label: "Class",         value: student.class ? `${student.class}${student.section ? `–${student.section}` : ""}` : "—" },
                  { label: "Roll Number",   value: student.rollNumber || "—" },
                  { label: "Gender",        value: student.gender || "—" },
                  { label: "Blood Group",   value: student.bloodGroup || "—" },
                  { label: "Date of Birth", value: fmtDate(student.dateOfBirth) },
                  { label: "Class Teacher", value: student.classTeacher?.name || "—" },
                  { label: "Address",       value: student.address || "—" },
                ].map(row => (
                  <div key={row.label} className="flex gap-2">
                    <span className="text-muted-foreground min-w-[110px]">{row.label}:</span>
                    <span className="text-foreground font-medium">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {student.parent && (
              <div className="glass-card rounded-xl p-5">
                <h3 className="text-base font-semibold text-foreground mb-3">Parent / Guardian</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {[
                    { label: "Name",     value: student.parent.name     || "—" },
                    { label: "Relation", value: student.parent.relation || "—" },
                    { label: "Phone",    value: student.parent.phone    || "—" },
                    { label: "Email",    value: student.parent.email    || "—" },
                  ].map(row => (
                    <div key={row.label} className="flex gap-2">
                      <span className="text-muted-foreground min-w-[80px]">{row.label}:</span>
                      <span className="text-foreground font-medium">{row.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Attendance ── */}
          <TabsContent value="attendance">
            {loadingA ? (
              <div className="glass-card rounded-xl p-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : attSummary ? (
              <div className="space-y-4">
                {/* Summary chips */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Total Days",  value: attSummary.total,      color: "text-foreground" },
                    { label: "Present",     value: attSummary.present,    color: "text-[hsl(var(--success))]" },
                    { label: "Absent",      value: attSummary.absent,     color: "text-destructive" },
                    { label: "Late",        value: attSummary.late,       color: "text-[hsl(var(--warning))]" },
                  ].map(s => (
                    <div key={s.label} className="glass-card rounded-xl p-4 text-center">
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                    </div>
                  ))}
                </div>
                {/* Monthly breakdown */}
                <div className="glass-card rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-secondary">
                        <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Month</th>
                        <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Present</th>
                        <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Absent</th>
                        <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Late</th>
                        <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Total</th>
                        <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthlyAtt.length === 0 ? (
                        <tr><td colSpan={6} className="text-center py-8 text-muted-foreground text-sm">No attendance records found.</td></tr>
                      ) : monthlyAtt.map(row => (
                        <tr key={row.month} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium text-foreground">{row.month}</td>
                          <td className="px-4 py-3 text-sm text-center text-[hsl(var(--success))] font-medium">{row.present}</td>
                          <td className="px-4 py-3 text-sm text-center text-destructive font-medium">{row.absent}</td>
                          <td className="px-4 py-3 text-sm text-center text-[hsl(var(--warning))] font-medium">{row.late}</td>
                          <td className="px-4 py-3 text-sm text-center text-muted-foreground">{row.total}</td>
                          <td className="px-4 py-3 text-sm text-center font-semibold text-foreground">
                            {row.total > 0 ? `${Math.round(((row.present + row.late) / row.total) * 100)}%` : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-xl p-8 text-center text-muted-foreground text-sm">
                No attendance records found for this student.
              </div>
            )}
          </TabsContent>

          {/* ── Marks / Report Card ── */}
          <TabsContent value="marks">
            {loadingM ? (
              <div className="glass-card rounded-xl p-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : Object.keys(subjects).length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center text-muted-foreground text-sm">
                No exam results recorded yet for this student.
              </div>
            ) : (
              <div className="glass-card rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary">
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Subject</th>
                      <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Exam Type</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Marks</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Total</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">%</th>
                      <th className="text-center text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(subjects).flatMap(([subj, results]) =>
                      results.map((r, i) => (
                        <tr key={`${subj}-${i}`} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                          {i === 0 && (
                            <td rowSpan={results.length} className="px-4 py-3 text-sm font-semibold text-foreground align-top border-r border-border/30">
                              {subj}
                            </td>
                          )}
                          <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{r.examType}</td>
                          <td className="px-4 py-3 text-sm text-center text-foreground font-medium">{r.marks}</td>
                          <td className="px-4 py-3 text-sm text-center text-muted-foreground">{r.total}</td>
                          <td className="px-4 py-3 text-sm text-center text-foreground">{r.percentage}%</td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="secondary" className="bg-primary/10 text-primary text-xs">{r.grade}</Badge>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          {/* ── Results ── */}
          <TabsContent value="results">
            {loadingR ? (
              <div className="glass-card rounded-xl p-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : normResults.length === 0 ? (
              <div className="glass-card rounded-xl p-8 text-center text-muted-foreground text-sm">
                No results recorded for this student yet.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Summary + Download */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="grid grid-cols-3 gap-3 flex-1">
                    {[
                      { icon: CheckCircle, val: rPassed,        label: "Passed",  color: "text-[hsl(var(--success))]", bg: "bg-[hsl(var(--success))]/10" },
                      { icon: XCircle,    val: rFailed,         label: "Failed",  color: "text-destructive",           bg: "bg-destructive/10"            },
                      { icon: TrendingUp, val: `${profAvg}%`,   label: "Average", color: "text-primary",               bg: "bg-primary/10"                },
                    ].map(s => (
                      <div key={s.label} className="glass-card rounded-xl p-4 text-center">
                        <div className={`h-8 w-8 rounded-lg ${s.bg} flex items-center justify-center mx-auto mb-2`}>
                          <s.icon className={`h-4 w-4 ${s.color}`} />
                        </div>
                        <p className={`text-xl font-bold ${s.color}`}>{s.val}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadResultPdf}
                    disabled={pdfGenerating}
                    className="gap-2 shrink-0"
                  >
                    {pdfGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    Download PDF
                  </Button>
                </div>

                {/* Results Table */}
                <div className="glass-card rounded-xl overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-secondary">
                        {["#","Exam / Test","Subject","Type","Date","Marks","Total","%","Grade","Result","Published"].map(h => (
                          <th key={h} className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider whitespace-nowrap">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {normResults.map((r, i) => (
                        <tr key={r._id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                          <td className="px-4 py-3 text-xs text-muted-foreground">{i + 1}</td>
                          <td className="px-4 py-3 max-w-[160px]">
                            <p className="font-medium text-foreground truncate">{r.title}</p>
                            {r.remarks && <p className="text-xs text-muted-foreground italic truncate">"{r.remarks}"</p>}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap text-xs">{r.subject}</td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className="text-[10px] capitalize">{EXAM_TYPE_LABEL[r.examType] || r.examType}</Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                            {r.date ? new Date(r.date).toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" }) : "—"}
                          </td>
                          <td className="px-4 py-3 text-foreground font-bold text-base">{r.marks}</td>
                          <td className="px-4 py-3 text-muted-foreground">{r.total}</td>
                          <td className="px-4 py-3 text-foreground font-medium">{r.pct}%</td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className={`text-xs font-bold ${gradeColor(r.grade)}`}>{r.grade}</Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className={`text-xs ${r.passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {r.passed ? "Pass" : "Fail"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className={`text-xs ${r.isPublished ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                              {r.isPublished ? "Published" : "Draft"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Fee History ── */}
          <TabsContent value="fees">
            {loadingF ? (
              <div className="glass-card rounded-xl p-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-4">
                {feeSummary && (
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: "Total Paid",    value: `₹${feeSummary.paid.toLocaleString()}`,    color: "text-[hsl(var(--success))]" },
                      { label: "Pending",       value: `₹${feeSummary.pending.toLocaleString()}`, color: "text-[hsl(var(--warning))]" },
                      { label: "Total",         value: `₹${(feeSummary.paid + feeSummary.pending).toLocaleString()}`, color: "text-foreground" },
                    ].map(s => (
                      <div key={s.label} className="glass-card rounded-xl p-4 text-center">
                        <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                      </div>
                    ))}
                  </div>
                )}
                {fees.length === 0 ? (
                  <div className="glass-card rounded-xl p-8 text-center text-muted-foreground text-sm">No fee records found.</div>
                ) : (
                  <div className="glass-card rounded-xl overflow-hidden">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-secondary">
                          <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Title</th>
                          <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Amount</th>
                          <th className="text-right text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Paid</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Date Paid</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Mode</th>
                          <th className="text-left text-xs font-semibold text-muted-foreground px-4 py-3 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fees.map(f => (
                          <tr key={f._id} className="border-b border-border/50 hover:bg-accent/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium text-foreground">{f.title}</td>
                            <td className="px-4 py-3 text-sm text-right text-foreground">₹{f.amount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-right text-[hsl(var(--success))] font-medium">₹{f.paidAmount.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{f.paidDate ? fmtDate(f.paidDate) : "—"}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground capitalize">{f.paymentMode || "—"}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={`text-xs font-medium capitalize ${STATUS_COLORS[f.status] || ""}`}>{f.status}</Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          {/* ── Documents ── */}
          <TabsContent value="documents">
            <div className="glass-card rounded-xl p-8 text-center">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <div className="h-12 w-12 rounded-xl bg-accent flex items-center justify-center">
                  <FileText className="h-6 w-6" />
                </div>
                <p className="text-sm">No documents uploaded yet.</p>
                <Button variant="outline" size="sm" className="mt-2">Upload Document</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
