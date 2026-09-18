import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Brain, MessageCircle, ClipboardList, BookOpen, BarChart3, Megaphone,
  Send, Copy, Check, Loader2, Calendar, FileText, DollarSign, TrendingUp,
  Users, GraduationCap, School, Sparkles, Plus, Trash2,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import api from "@/lib/api";
import { toast } from "sonner";

type Tool =
  | "tutor" | "quiz" | "homework"          // student / teacher
  | "notice" | "eventplanner"              // teacher + admin
  | "insights" | "reportcard" | "feeletter"; // admin-only

interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  correct?: string;
  explanation?: string;
}

interface TutorMessage { role: "user" | "ai"; text: string }
interface RcSubject    { id: string; name: string; marks: string; total: string }

const TOOLS: { id: Tool; label: string; icon: React.ComponentType<{ className?: string }>; roles: string[] }[] = [
  // Student tools
  { id: "tutor",       label: "AI Tutor",             icon: MessageCircle, roles: ["student"] },
  { id: "quiz",        label: "Quiz Generator",        icon: ClipboardList, roles: ["student", "teacher"] },
  { id: "homework",    label: "Homework Helper",       icon: BookOpen,      roles: ["student", "teacher"] },
  // Admin tools
  { id: "insights",    label: "School Insights",       icon: TrendingUp,    roles: ["school_admin"] },
  { id: "reportcard",  label: "Report Card Comments",  icon: FileText,      roles: ["school_admin"] },
  { id: "feeletter",   label: "Fee Reminder Letter",   icon: DollarSign,    roles: ["school_admin"] },
  // Admin + Teacher
  { id: "eventplanner",label: "Event Planner",         icon: Calendar,      roles: ["school_admin", "teacher"] },
  { id: "notice",      label: "Notice Generator",      icon: Megaphone,     roles: ["school_admin", "teacher"] },
];

const INSIGHT_PROMPTS = [
  "How is overall student performance this term?",
  "Which areas need immediate attention?",
  "Give me a quick school health summary.",
  "How can I improve fee collection?",
  "Suggest ways to improve attendance.",
];

export default function AiPage() {
  const { user } = useAuth();
  const [activeTool, setActiveTool] = useState<Tool>("tutor");
  const [loading, setLoading]       = useState(false);
  const [copied, setCopied]         = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const visibleTools = TOOLS.filter((t) => t.roles.includes(user?.role || ""));

  // Set role-appropriate default tool
  useEffect(() => {
    if (user?.role === "school_admin") setActiveTool("insights");
    else if (user?.role === "teacher") setActiveTool("quiz");
    else setActiveTool("tutor");
  }, [user?.role]);

  // ── Tutor ────────────────────────────────────────────────────────
  const [tutorMessages, setTutorMessages] = useState<TutorMessage[]>([]);
  const [tutorInput,    setTutorInput]    = useState("");
  const [tutorSubject,  setTutorSubject]  = useState("general");

  // ── Quiz ─────────────────────────────────────────────────────────
  const [quizSubject,   setQuizSubject]   = useState("");
  const [quizTopic,     setQuizTopic]     = useState("");
  const [quizCount,     setQuizCount]     = useState("5");
  const [quizResult,    setQuizResult]    = useState<QuizQuestion[]>([]);
  const [quizAnswers,   setQuizAnswers]   = useState<Record<number, string>>({});
  const [mySubjects,    setMySubjects]    = useState<{ _id: string; name: string }[]>([]);
  const [subjectsReady, setSubjectsReady] = useState(false);

  // ── Homework ─────────────────────────────────────────────────────
  const [hwQuestion,    setHwQuestion]    = useState("");
  const [hwSubject,     setHwSubject]     = useState("");
  const [hwSolution,    setHwSolution]    = useState<{ solution: string; steps: string[] } | null>(null);
  const [myHomework,    setMyHomework]    = useState<{ _id: string; title: string; subject: string; description: string; dueDate: string }[]>([]);

  // ── Notice ───────────────────────────────────────────────────────
  const [noticeType,    setNoticeType]    = useState("");
  const [noticeDetails, setNoticeDetails] = useState("");
  const [noticeResult,  setNoticeResult]  = useState("");

  // ── School Insights ──────────────────────────────────────────────
  const [insightMessages, setInsightMessages] = useState<TutorMessage[]>([]);
  const [insightInput,    setInsightInput]    = useState("");
  const [schoolStats,     setSchoolStats]     = useState<any>(null);
  const [statsLoading,    setStatsLoading]    = useState(false);

  useEffect(() => {
    if (activeTool !== "insights" || schoolStats !== null) return;
    setStatsLoading(true);
    api.get("/ai/school-context")
      .then(res => setSchoolStats(res.data?.data ?? null))
      .catch(() => setSchoolStats(null))
      .finally(() => setStatsLoading(false));
  }, [activeTool, schoolStats]);

  // Fetch subjects + homework for student tools
  useEffect(() => {
    if (user?.role !== "student") return;
    api.get("/subjects/my-class")
      .then((res) => setMySubjects(res.data?.data || []))
      .catch(() => {})
      .finally(() => setSubjectsReady(true));

    api.get("/homework")
      .then((res) => setMyHomework(res.data?.data || []))
      .catch(() => {});
  }, [user?.role]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [insightMessages, tutorMessages]);

  const insightContext = (stats: any) => {
    if (!stats) return "";
    let ctx = `=== LIVE SCHOOL DATABASE — ${stats.currentMonth ?? "This Month"} ===\n\n`;

    ctx += `OVERVIEW:\n`;
    ctx += `• Total Students: ${stats.totalStudents ?? 0}\n`;
    ctx += `• Total Teachers: ${stats.totalTeachers ?? 0}\n`;
    ctx += `• Total Classes: ${stats.totalClasses ?? 0}\n`;
    ctx += `• Total Fee Collected: ₹${(stats.totalCollected ?? 0).toLocaleString()}\n`;
    ctx += `• Total Fee Pending: ₹${(stats.totalPending ?? 0).toLocaleString()}\n\n`;

    if (stats.allStudents?.length > 0) {
      ctx += `ALL STUDENTS IN SCHOOL:\n`;
      stats.allStudents.forEach((s: any) => {
        ctx += `• ${s.name} — Class: ${s.class}${s.section ? "-" + s.section : ""}`;
        if (s.studentId) ctx += ` (ID: ${s.studentId})`;
        ctx += "\n";
      });
      ctx += "\n";
    }

    if (stats.allTeachers?.length > 0) {
      ctx += `ALL TEACHERS:\n`;
      stats.allTeachers.forEach((t: any) => {
        ctx += `• ${t.name} — ${t.designation}`;
        if (t.subjects?.length) ctx += ` | Subjects: ${t.subjects.join(", ")}`;
        ctx += "\n";
      });
      ctx += "\n";
    }

    if (stats.classSummary?.length > 0) {
      ctx += `CLASS-WISE DETAILS:\n`;
      stats.classSummary.forEach((c: any) => {
        ctx += `Class ${c.class} (${c.students} students: ${(c.studentNames || []).join(", ")})\n`;
        if (c.attendancePct !== null) ctx += `  → Attendance this month: ${c.attendancePct}%\n`;
        if (c.pendingFees > 0) {
          ctx += `  → Pending Fees: ₹${c.pendingFees.toLocaleString()} — Students with dues: ${(c.pendingFeeStudentNames || []).join(", ")}\n`;
        } else {
          ctx += `  → Pending Fees: None (all paid)\n`;
        }
        if (c.avgMarks !== null) ctx += `  → Average Marks: ${c.avgMarks}%\n`;
      });
      ctx += "\n";
    }

    if (stats.pendingFeeStudents?.length > 0) {
      ctx += `FEE PENDING — STUDENT-WISE:\n`;
      stats.pendingFeeStudents.forEach((p: any) => {
        ctx += `• ${p.name} (Class ${p.class}${p.section ? "-" + p.section : ""}): ₹${p.amount?.toLocaleString()} pending`;
        if (p.items?.length) ctx += ` [${p.items.join(", ")}]`;
        ctx += "\n";
      });
      ctx += "\n";
    } else {
      ctx += `FEE PENDING: No pending fees found.\n\n`;
    }

    if (stats.lowAttendanceStudents?.length > 0) {
      ctx += `LOW ATTENDANCE STUDENTS (below 75%):\n`;
      stats.lowAttendanceStudents.forEach((s: any) => {
        ctx += `• ${s.name} (Class ${s.class}): ${s.pct}% attendance\n`;
      });
      ctx += "\n";
    }

    ctx += `=== END OF SCHOOL DATA ===\n\n`;
    ctx += `Using the exact data above, answer the following question. If the data contains the answer, state it directly with names and amounts. Do not say data is unavailable if it is listed above.\n\nQuestion: `;
    return ctx;
  };

  // ── Report Card ──────────────────────────────────────────────────
  const [rcStudent,    setRcStudent]    = useState("");
  const [rcClass,      setRcClass]      = useState("");
  const [rcTerm,       setRcTerm]       = useState("");
  const [rcAttendance, setRcAttendance] = useState("");
  const [rcBehavior,   setRcBehavior]   = useState("good");
  const [rcSubjects,   setRcSubjects]   = useState<RcSubject[]>([
    { id: "1", name: "", marks: "", total: "100" },
  ]);
  const [rcComment, setRcComment] = useState("");

  const addRcSubject = () =>
    setRcSubjects((p) => [...p, { id: Date.now().toString(), name: "", marks: "", total: "100" }]);
  const removeRcSubject = (id: string) =>
    setRcSubjects((p) => p.filter((s) => s.id !== id));
  const updateRcSubject = (id: string, field: keyof RcSubject, val: string) =>
    setRcSubjects((p) => p.map((s) => s.id === id ? { ...s, [field]: val } : s));

  // ── Fee Letter ───────────────────────────────────────────────────
  const [flParent,  setFlParent]  = useState("");
  const [flStudent, setFlStudent] = useState("");
  const [flClass,   setFlClass]   = useState("");
  const [flFeeType, setFlFeeType] = useState("");
  const [flAmount,  setFlAmount]  = useState("");
  const [flDueDate, setFlDueDate] = useState("");
  const [flTone,    setFlTone]    = useState("polite");
  const [flLetter,  setFlLetter]  = useState("");

  // ── Event Planner ────────────────────────────────────────────────
  const [epName,         setEpName]         = useState("");
  const [epType,         setEpType]         = useState("");
  const [epDate,         setEpDate]         = useState("");
  const [epParticipants, setEpParticipants] = useState("");
  const [epBudget,       setEpBudget]       = useState("");
  const [epPlan,         setEpPlan]         = useState("");

  // ── Handlers ─────────────────────────────────────────────────────
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const aiPost = async (question: string, subject = "general") => {
    const res = await api.post("/ai/study-assistant", { question, subject });
    return res.data?.answer || res.data?.data?.response || res.data?.response || "";
  };

  const handleTutorSend = async () => {
    if (!tutorInput.trim()) return;
    const msg = tutorInput.trim();
    setTutorInput("");
    setTutorMessages((p) => [...p, { role: "user", text: msg }]);
    setLoading(true);
    try {
      const reply = await aiPost(msg, tutorSubject);
      setTutorMessages((p) => [...p, { role: "ai", text: reply || "I'm here to help!" }]);
    } catch {
      toast.error("AI Tutor failed. Please try again.");
    } finally { setLoading(false); }
  };

  const handleGenerateQuiz = async () => {
    if (!quizSubject.trim() || !quizTopic.trim()) return toast.error("Fill in subject and topic.");
    setLoading(true); setQuizResult([]); setQuizAnswers({});
    try {
      const res = await api.post("/ai/generate-quiz", { subject: quizSubject, topic: quizTopic, count: parseInt(quizCount) });
      setQuizResult(res.data?.questions || res.data?.data?.questions || res.data?.data?.quiz || []);
    } catch { toast.error("Failed to generate quiz."); }
    finally { setLoading(false); }
  };

  const handleHomeworkHelp = async () => {
    if (!hwQuestion.trim()) return toast.error("Enter your question.");
    setLoading(true); setHwSolution(null);
    try {
      const classCtx = user?.role === "student" && user?.class
        ? `[Student Context: Class ${user.class}${user.section ? `-${user.section}` : ""}, Subject: ${hwSubject || "General"}]\n\n`
        : "";
      const reply = await aiPost(classCtx + hwQuestion, hwSubject || "general");
      setHwSolution({ solution: reply, steps: [] });
    } catch { toast.error("Failed to get homework help."); }
    finally { setLoading(false); }
  };

  const handleGenerateNotice = async () => {
    if (!noticeType.trim() || !noticeDetails.trim()) return toast.error("Fill in type and details.");
    setLoading(true); setNoticeResult("");
    try {
      const res = await api.post("/ai/generate-notice", { topic: noticeType, details: noticeDetails });
      setNoticeResult(res.data?.notice || res.data?.data?.notice || "");
    } catch { toast.error("Failed to generate notice."); }
    finally { setLoading(false); }
  };

  const handleInsightSend = async (question?: string) => {
    const msg = (question ?? insightInput).trim();
    if (!msg) return;
    setInsightInput("");
    setInsightMessages((p) => [...p, { role: "user", text: msg }]);
    setLoading(true);
    try {
      // Build conversation history for multi-turn chat
      const history = insightMessages.map(m => ({
        role: m.role === "ai" ? "assistant" : "user",
        content: m.text,
      }));
      const res = await api.post("/ai/study-assistant", {
        question: msg,
        subject: "school management",
        schoolContext: insightContext(schoolStats),
        conversationHistory: history,
      });
      const reply = res.data?.answer || "";
      setInsightMessages((p) => [...p, { role: "ai", text: reply || "How can I help you?" }]);
    } catch { toast.error("AI failed to respond."); }
    finally { setLoading(false); }
  };

  const handleReportCard = async () => {
    if (!rcStudent.trim()) return toast.error("Enter student name.");
    const filled = rcSubjects.filter((s) => s.name.trim() && s.marks.trim());
    if (filled.length === 0) return toast.error("Add at least one subject with marks.");
    setLoading(true); setRcComment("");
    try {
      const subjectLine = filled.map((s) => `${s.name}: ${s.marks}/${s.total}`).join(", ");
      const behaviorLabels: Record<string, string> = {
        excellent: "excellent behavior and discipline",
        good: "good conduct and attitude",
        average: "satisfactory conduct",
        needsImprovement: "behavior that needs improvement",
      };
      const prompt = `Write a professional report card comment for a school student.

Student: ${rcStudent}
Class: ${rcClass || "Not specified"}
Term: ${rcTerm || "This term"}
Attendance: ${rcAttendance ? rcAttendance + "%" : "Not specified"}
Conduct: ${behaviorLabels[rcBehavior] || "good"}
Subject Performance: ${subjectLine}

Write a warm, professional 3–4 sentence comment that:
1. Summarises overall academic performance
2. Highlights specific strengths (reference subjects where appropriate)
3. Notes areas for improvement constructively
4. Ends with encouragement

Reply with only the comment text — no heading, no formatting marks.`;

      const comment = await aiPost(prompt, "education");
      setRcComment(comment);
    } catch { toast.error("Failed to generate comment."); }
    finally { setLoading(false); }
  };

  const handleFeeLetter = async () => {
    if (!flParent.trim() || !flStudent.trim() || !flAmount.trim())
      return toast.error("Enter parent name, student name and amount.");
    setLoading(true); setFlLetter("");
    try {
      const toneMap: Record<string, string> = {
        polite: "polite and understanding",
        firm:   "firm and assertive",
        final:  "urgent — this is a final notice before escalation",
      };
      const prompt = `Draft a professional school fee reminder letter.

Parent Name: ${flParent}
Student Name: ${flStudent}
Class: ${flClass || "Not specified"}
Fee Type: ${flFeeType || "School Fees"}
Amount Due: ₹${flAmount}
Due Date: ${flDueDate || "at the earliest"}
Tone: ${toneMap[flTone] || "polite"}

The letter must:
• Be from the School Administration
• Be formal and professional
• Clearly state the outstanding amount and due date
• Include a request for prompt payment
• For firm/final tone — mention consequences (late fee, admission hold)
• End with [School Name], [Principal Name], [Contact] as placeholders

Write only the complete letter — no extra commentary.`;

      const letter = await aiPost(prompt, "school administration");
      setFlLetter(letter);
    } catch { toast.error("Failed to generate letter."); }
    finally { setLoading(false); }
  };

  const handleEventPlan = async () => {
    if (!epName.trim() || !epType.trim()) return toast.error("Enter event name and type.");
    setLoading(true); setEpPlan("");
    try {
      const prompt = `Create a detailed school event plan.

Event Name: ${epName}
Event Type: ${epType}
Date: ${epDate || "To be confirmed"}
Expected Participants: ${epParticipants || "Not specified"}
Estimated Budget: ${epBudget ? "₹" + epBudget : "Not specified"}

Provide a structured plan with:
1. Event Objectives
2. Full Day Timeline (hour-by-hour schedule)
3. Resources & Materials Required
4. Roles & Responsibilities (Principal, Teachers, Students, Support Staff)
5. Budget Breakdown (if budget provided)
6. Pre-Event Checklist
7. Post-Event Actions

Format with clear headings and bullet points.`;

      const plan = await aiPost(prompt, "event planning");
      setEpPlan(plan);
    } catch { toast.error("Failed to generate event plan."); }
    finally { setLoading(false); }
  };

  // ── Shared UI atoms ───────────────────────────────────────────────
  const CopyButton = ({ text }: { text: string }) => (
    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground" onClick={() => handleCopy(text)}>
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copied!" : "Copy"}
    </Button>
  );

  const ToolHeader = ({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) => (
    <CardHeader className="pb-3 border-b border-border">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-lg btn-gradient flex items-center justify-center shrink-0">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div>
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
    </CardHeader>
  );

  // ── Render ────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading flex items-center gap-2">
            AI Assistant <Sparkles className="h-5 w-5 text-primary" />
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {user?.role === "school_admin"
              ? "AI-powered tools built for school administrators."
              : "Supercharge your school experience with AI-powered tools."}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Tool Selector ── */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider font-heading">AI Tools</p>
            {visibleTools.map((tool) => {
              const isActive = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  onClick={() => setActiveTool(tool.id)}
                  className={`w-full text-left rounded-xl p-3.5 border transition-all duration-200 flex items-center gap-3 ${
                    isActive
                      ? "border-primary bg-secondary shadow-[0_2px_12px_rgba(255,107,43,0.10)]"
                      : "border-border bg-card hover:bg-secondary/50 hover:border-primary/30"
                  }`}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isActive ? "btn-gradient" : "orange-icon-bg"}`}>
                    <tool.icon className={`h-4 w-4 ${isActive ? "text-white" : "text-primary"}`} />
                  </div>
                  <span className={`text-sm font-medium ${isActive ? "text-primary" : "text-foreground"}`}>{tool.label}</span>
                </button>
              );
            })}
          </div>

          {/* ── Active Tool Panel ── */}
          <div className="lg:col-span-2">

            {/* AI Tutor Chat */}
            {activeTool === "tutor" && (
              <Card className="flex flex-col h-[600px]">
                <CardHeader className="pb-3 border-b border-border shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg btn-gradient flex items-center justify-center">
                      <Brain className="h-5 w-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-sm font-semibold">AI Tutor Chat</CardTitle>
                      <p className="text-xs text-muted-foreground">Ask any academic question</p>
                    </div>
                    <Select value={tutorSubject} onValueChange={setTutorSubject}>
                      <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["general", "math", "science", "english", "history", "physics", "chemistry", "biology"].map((s) => (
                          <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 overflow-auto p-4 space-y-3">
                  {tutorMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Brain className="h-12 w-12 mb-3 opacity-30" />
                      <p className="text-sm">Ask me anything about your studies!</p>
                    </div>
                  )}
                  {tutorMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${msg.role === "user" ? "btn-gradient text-white rounded-br-md" : "bg-secondary text-foreground rounded-bl-md"}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {loading && activeTool === "tutor" && (
                    <div className="flex justify-start">
                      <div className="bg-secondary text-muted-foreground rounded-2xl rounded-bl-md px-4 py-2.5 text-sm flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
                      </div>
                    </div>
                  )}
                </CardContent>
                <div className="p-4 border-t border-border shrink-0">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask a question…"
                      value={tutorInput}
                      onChange={(e) => setTutorInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTutorSend(); } }}
                      disabled={loading}
                    />
                    <Button size="icon" className="btn-gradient border-0 shrink-0" onClick={handleTutorSend} disabled={loading || !tutorInput.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Quiz Generator */}
            {activeTool === "quiz" && (
              <Card>
                <ToolHeader icon={ClipboardList} title="Quiz Generator" subtitle="Generate topic-specific quizzes instantly" />
                <CardContent className="p-5 space-y-4">
                  {user?.role === "student" && user?.class && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary rounded-lg px-3 py-2">
                      <GraduationCap className="h-3.5 w-3.5 text-primary" />
                      Class {user.class}{user.section ? `-${user.section}` : ""}
                    </div>
                  )}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Subject</label>
                      {user?.role === "student" && mySubjects.length > 0 ? (
                        <Select value={quizSubject} onValueChange={setQuizSubject} disabled={!subjectsReady}>
                          <SelectTrigger><SelectValue placeholder="Select subject" /></SelectTrigger>
                          <SelectContent>
                            {mySubjects.map((s) => <SelectItem key={s._id} value={s.name}>{s.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input placeholder="e.g. Science" value={quizSubject} onChange={(e) => setQuizSubject(e.target.value)} />
                      )}
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Topic</label>
                      <Input placeholder="e.g. Photosynthesis" value={quizTopic} onChange={(e) => setQuizTopic(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Questions</label>
                      <Select value={quizCount} onValueChange={setQuizCount}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {["3", "5", "10", "15"].map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button className="btn-gradient border-0 gap-2" onClick={handleGenerateQuiz} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ClipboardList className="h-4 w-4" />}
                    {loading ? "Generating…" : "Generate Quiz"}
                  </Button>
                  {quizResult.length > 0 && (
                    <div className="space-y-4 mt-2">
                      {quizResult.map((q, i) => (
                        <Card key={i} className="border border-border">
                          <CardContent className="p-4 space-y-3">
                            <p className="text-sm font-medium">Q{i + 1}. {q.question}</p>
                            <RadioGroup value={quizAnswers[i] || ""} onValueChange={(v) => setQuizAnswers((p) => ({ ...p, [i]: v }))}>
                              {q.options.map((opt, j) => {
                                const correctKey = q.correct || q.answer;
                                const isCorrect = opt === correctKey || opt.startsWith(correctKey + ")") || opt.startsWith(correctKey + ".");
                                return (
                                  <div key={j} className="flex items-center gap-2">
                                    <RadioGroupItem value={opt} id={`q${i}o${j}`} />
                                    <Label htmlFor={`q${i}o${j}`} className={`text-sm cursor-pointer ${quizAnswers[i] === opt ? (isCorrect ? "text-[hsl(var(--success))] font-medium" : "text-destructive font-medium") : ""}`}>
                                      {opt}
                                    </Label>
                                  </div>
                                );
                              })}
                            </RadioGroup>
                            {quizAnswers[i] && (
                              <p className="text-xs text-muted-foreground">
                                Correct: <span className="font-medium text-[hsl(var(--success))]">{q.correct || q.answer}</span>
                                {q.explanation && <span className="ml-2 italic">— {q.explanation}</span>}
                              </p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Homework Helper */}
            {activeTool === "homework" && (
              <Card>
                <ToolHeader icon={BookOpen} title="Homework Helper" subtitle="Get step-by-step explanations for your assignments" />
                <CardContent className="p-5 space-y-4">
                  {user?.role === "student" && myHomework.length > 0 && (
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Pick from assigned homework</label>
                      <Select
                        onValueChange={(id) => {
                          const hw = myHomework.find((h) => h._id === id);
                          if (hw) {
                            setHwSubject(hw.subject);
                            setHwQuestion(hw.description || hw.title);
                          }
                        }}
                      >
                        <SelectTrigger><SelectValue placeholder="Select a homework assignment…" /></SelectTrigger>
                        <SelectContent>
                          {myHomework.map((hw) => (
                            <SelectItem key={hw._id} value={hw._id}>
                              {hw.title} ({hw.subject})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Subject (optional)</label>
                    <Input placeholder="e.g. Mathematics" value={hwSubject} onChange={(e) => setHwSubject(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Your Question</label>
                    <Textarea placeholder="Describe your homework problem…" value={hwQuestion} onChange={(e) => setHwQuestion(e.target.value)} className="min-h-[100px]" />
                  </div>
                  <Button className="btn-gradient border-0 gap-2" onClick={handleHomeworkHelp} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
                    {loading ? "Solving…" : "Get Help"}
                  </Button>
                  {hwSolution && (
                    <Card className="border border-border">
                      <CardContent className="p-4">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Solution</p>
                        <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{hwSolution.solution}</p>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ═══════════════════════════════════════════════════════
                ADMIN TOOLS
            ════════════════════════════════════════════════════════ */}

            {/* School Insights Chat */}
            {activeTool === "insights" && (
              <Card className="flex flex-col" style={{ height: 640 }}>
                <CardHeader className="pb-3 border-b border-border shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg btn-gradient flex items-center justify-center shrink-0">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-semibold">School Insights Chat</CardTitle>
                      <p className="text-xs text-muted-foreground">AI powered by your live school data</p>
                    </div>
                  </div>
                </CardHeader>

                {/* Live Stats Strip */}
                <div className="px-4 py-3 border-b border-border bg-secondary/30 shrink-0">
                  {statsLoading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" /> Loading school data…
                    </div>
                  ) : schoolStats ? (
                    <div className="flex flex-wrap gap-3">
                      {[
                        { icon: Users,          label: "Students", val: schoolStats.totalStudents ?? "—" },
                        { icon: GraduationCap,  label: "Teachers", val: schoolStats.totalTeachers ?? "—" },
                        { icon: School,         label: "Classes",  val: schoolStats.totalClasses  ?? "—" },
                        { icon: DollarSign,     label: "Collected", val: `₹${(schoolStats.totalCollected ?? 0).toLocaleString()}` },
                        { icon: DollarSign,     label: "Pending",  val: `₹${(schoolStats.totalPending  ?? 0).toLocaleString()}` },
                      ].map(({ icon: Icon, label, val }) => (
                        <div key={label} className="flex items-center gap-1.5 bg-card border border-border rounded-lg px-2.5 py-1.5">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                          <span className="text-xs text-muted-foreground">{label}:</span>
                          <span className="text-xs font-semibold text-foreground">{String(val)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">School data unavailable — AI will answer in general context.</p>
                  )}
                </div>

                {/* Chat area */}
                <CardContent className="flex-1 overflow-auto p-4 space-y-3">
                  {insightMessages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full gap-4">
                      <div className="text-center text-muted-foreground">
                        <TrendingUp className="h-10 w-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Ask anything about your school</p>
                        <p className="text-xs mt-1">Or pick a quick prompt below</p>
                      </div>
                      <div className="flex flex-wrap justify-center gap-2">
                        {INSIGHT_PROMPTS.map((q) => (
                          <button
                            key={q}
                            onClick={() => handleInsightSend(q)}
                            disabled={loading}
                            className="text-xs px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {insightMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[82%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${msg.role === "user" ? "btn-gradient text-white rounded-br-md" : "bg-secondary text-foreground rounded-bl-md"}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {loading && activeTool === "insights" && (
                    <div className="flex justify-start">
                      <div className="bg-secondary text-muted-foreground rounded-2xl rounded-bl-md px-4 py-2.5 text-sm flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" /> Analysing school data…
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </CardContent>

                <div className="p-4 border-t border-border shrink-0">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ask about attendance, fees, students, teachers…"
                      value={insightInput}
                      onChange={(e) => setInsightInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleInsightSend(); } }}
                      disabled={loading}
                    />
                    <Button size="icon" className="btn-gradient border-0 shrink-0" onClick={() => handleInsightSend()} disabled={loading || !insightInput.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* Report Card Comments */}
            {activeTool === "reportcard" && (
              <Card>
                <ToolHeader icon={FileText} title="Report Card Comments" subtitle="Generate personalized student comments from marks & attendance" />
                <CardContent className="p-5 space-y-4">
                  {/* Student info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Student Name <span className="text-destructive">*</span></Label>
                      <Input placeholder="e.g. Ayesha Khan" value={rcStudent} onChange={(e) => setRcStudent(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Class</Label>
                      <Input placeholder="e.g. Class 10-A" value={rcClass} onChange={(e) => setRcClass(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Term / Exam</Label>
                      <Input placeholder="e.g. Mid-Term 2025" value={rcTerm} onChange={(e) => setRcTerm(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Attendance %</Label>
                      <Input type="number" min={0} max={100} placeholder="e.g. 87" value={rcAttendance} onChange={(e) => setRcAttendance(e.target.value)} />
                    </div>
                  </div>

                  {/* Conduct */}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Student Conduct</Label>
                    <Select value={rcBehavior} onValueChange={setRcBehavior}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="average">Average</SelectItem>
                        <SelectItem value="needsImprovement">Needs Improvement</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subject marks */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Subject Marks <span className="text-destructive">*</span></Label>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs" onClick={addRcSubject}>
                        <Plus className="h-3.5 w-3.5" /> Add Subject
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {rcSubjects.map((s, idx) => (
                        <div key={s.id} className="grid grid-cols-[1fr_80px_80px_auto] gap-2 items-center">
                          <Input
                            placeholder={`Subject ${idx + 1}`}
                            value={s.name}
                            onChange={(e) => updateRcSubject(s.id, "name", e.target.value)}
                            className="h-8 text-sm"
                          />
                          <Input
                            type="number" placeholder="Marks" min={0}
                            value={s.marks}
                            onChange={(e) => updateRcSubject(s.id, "marks", e.target.value)}
                            className="h-8 text-sm text-center"
                          />
                          <Input
                            type="number" placeholder="Total" min={1}
                            value={s.total}
                            onChange={(e) => updateRcSubject(s.id, "total", e.target.value)}
                            className="h-8 text-sm text-center"
                          />
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() => removeRcSubject(s.id)}
                            disabled={rcSubjects.length === 1}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-muted-foreground">Enter subject name · marks obtained · out of total</p>
                  </div>

                  <Button className="btn-gradient border-0 gap-2 w-full" onClick={handleReportCard} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {loading ? "Generating Comment…" : "Generate Report Card Comment"}
                  </Button>

                  {rcComment && (
                    <Card className="border border-primary/20 bg-primary/[0.03]">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generated Comment</p>
                          <CopyButton text={rcComment} />
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{rcComment}</p>
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Fee Reminder Letter */}
            {activeTool === "feeletter" && (
              <Card>
                <ToolHeader icon={DollarSign} title="Fee Reminder Letter" subtitle="Generate professional fee reminder letters instantly" />
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Parent Name <span className="text-destructive">*</span></Label>
                      <Input placeholder="Mr./Mrs. Ahmed" value={flParent} onChange={(e) => setFlParent(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Student Name <span className="text-destructive">*</span></Label>
                      <Input placeholder="Student full name" value={flStudent} onChange={(e) => setFlStudent(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Class</Label>
                      <Input placeholder="e.g. Class 9-B" value={flClass} onChange={(e) => setFlClass(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Fee Type</Label>
                      <Input placeholder="e.g. Monthly Tuition, Annual Fee" value={flFeeType} onChange={(e) => setFlFeeType(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Amount Due (₹) <span className="text-destructive">*</span></Label>
                      <Input type="number" placeholder="e.g. 5000" value={flAmount} onChange={(e) => setFlAmount(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Due Date</Label>
                      <Input type="date" value={flDueDate} onChange={(e) => setFlDueDate(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Letter Tone</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { val: "polite", label: "Polite", desc: "First reminder, friendly" },
                        { val: "firm",   label: "Firm",   desc: "Second reminder, assertive" },
                        { val: "final",  label: "Final Notice", desc: "Urgent, last warning" },
                      ].map((t) => (
                        <button
                          key={t.val}
                          onClick={() => setFlTone(t.val)}
                          className={`rounded-xl border p-3 text-left transition-all ${flTone === t.val ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                        >
                          <p className={`text-sm font-medium ${flTone === t.val ? "text-primary" : "text-foreground"}`}>{t.label}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button className="btn-gradient border-0 gap-2 w-full" onClick={handleFeeLetter} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DollarSign className="h-4 w-4" />}
                    {loading ? "Generating Letter…" : "Generate Fee Reminder Letter"}
                  </Button>

                  {flLetter && (
                    <Card className="border border-border">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generated Letter</p>
                          <CopyButton text={flLetter} />
                        </div>
                        <Textarea value={flLetter} readOnly className="min-h-[220px] text-sm bg-secondary/50 resize-none" />
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Event Planner */}
            {activeTool === "eventplanner" && (
              <Card>
                <ToolHeader icon={Calendar} title="Event Planner" subtitle="Get a complete AI-generated school event plan" />
                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Event Name <span className="text-destructive">*</span></Label>
                      <Input placeholder="e.g. Annual Sports Day" value={epName} onChange={(e) => setEpName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Event Type <span className="text-destructive">*</span></Label>
                      <Select value={epType} onValueChange={setEpType}>
                        <SelectTrigger><SelectValue placeholder="Select type…" /></SelectTrigger>
                        <SelectContent>
                          {["Sports Day", "Annual Day / Cultural Event", "Science Exhibition", "Parent-Teacher Meeting", "Prize Distribution", "Republic / Independence Day", "Farewell Party", "Field Trip", "Seminar / Workshop", "Other"].map((t) => (
                            <SelectItem key={t} value={t}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Event Date</Label>
                      <Input type="date" value={epDate} onChange={(e) => setEpDate(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Expected Participants</Label>
                      <Input placeholder="e.g. 500 students + 100 parents" value={epParticipants} onChange={(e) => setEpParticipants(e.target.value)} />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs">Estimated Budget (₹)</Label>
                      <Input type="number" placeholder="e.g. 50000 (optional)" value={epBudget} onChange={(e) => setEpBudget(e.target.value)} />
                    </div>
                  </div>

                  <Button className="btn-gradient border-0 gap-2 w-full" onClick={handleEventPlan} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                    {loading ? "Planning Event…" : "Generate Event Plan"}
                  </Button>

                  {epPlan && (
                    <Card className="border border-border">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Event Plan</p>
                          <CopyButton text={epPlan} />
                        </div>
                        <Textarea value={epPlan} readOnly className="min-h-[280px] bg-secondary/50 resize-none font-mono text-xs" />
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Notice Generator */}
            {activeTool === "notice" && (
              <Card>
                <ToolHeader icon={Megaphone} title="Notice Generator" subtitle="Generate professional school announcements" />
                <CardContent className="p-5 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Notice Type</Label>
                    <Input placeholder="e.g. exam, holiday, meeting, sports day" value={noticeType} onChange={(e) => setNoticeType(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Details</Label>
                    <Textarea placeholder="Provide the key details for the notice…" value={noticeDetails} onChange={(e) => setNoticeDetails(e.target.value)} className="min-h-[100px]" />
                  </div>
                  <Button className="btn-gradient border-0 gap-2" onClick={handleGenerateNotice} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
                    {loading ? "Generating…" : "Generate Notice"}
                  </Button>
                  {noticeResult && (
                    <Card className="border border-border">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Generated Notice</p>
                          <CopyButton text={noticeResult} />
                        </div>
                        <Textarea value={noticeResult} readOnly className="min-h-[160px] text-sm bg-secondary/50 resize-none" />
                      </CardContent>
                    </Card>
                  )}
                </CardContent>
              </Card>
            )}

          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
