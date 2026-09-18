import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  ClipboardList, GraduationCap, Plus, Pencil, Trash2, Loader2,
  ChevronDown, ChevronRight, BookOpen, Calendar, Clock, Filter,
  BarChart3, Save, Send, SendHorizonal, CheckCircle2, XCircle,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassItem  { _id: string; name: string; section: string; grade: string }
interface SubjectItem { _id: string; name: string; code: string }

interface TestDoc {
  _id: string;
  title: string;
  classId:   { _id: string; name: string; section: string };
  subjectId: { _id: string; name: string; code: string };
  date: string;
  totalMarks: number;
  duration: number;
  description: string;
  status: "upcoming" | "completed" | "cancelled";
}

interface ExamDoc {
  _id: string;
  title: string;
  classId: { _id: string; name: string; section: string };
  examType: "midterm" | "final" | "unit" | "annual";
  startDate: string;
  endDate: string;
  description: string;
  status: "upcoming" | "ongoing" | "completed";
}

interface ExamSubjectDoc {
  _id: string;
  subjectId: { _id: string; name: string; code: string };
  date: string;
  totalMarks: number;
  duration: number;
}

interface SubjectDetail { date: string; totalMarks: string; duration: string }

interface EntryStudent {
  student: { _id: string; name: string; studentId: string; rollNumber: string };
  result: {
    _id: string; marksObtained: number; totalMarks: number;
    grade: string; percentage: number; isPassed: boolean;
    isPublished: boolean; remarks: string;
  } | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_TEST = { title: "", classId: "", subjectId: "", date: "", totalMarks: "", duration: "", description: "" };
const EMPTY_EXAM = { title: "", classId: "", examType: "", startDate: "", endDate: "", description: "" };

const EXAM_TYPES = [
  { value: "midterm", label: "Mid-term" },
  { value: "final",   label: "Final" },
  { value: "unit",    label: "Unit" },
  { value: "annual",  label: "Annual" },
];

const fmtDate = (d: string) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const classLabel = (c: { name: string; section: string } | null | undefined) =>
  c ? `${c.name}${c.section ? ` - ${c.section}` : ""}` : "—";

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    upcoming:  "bg-warning/10 text-warning border border-warning/20",
    ongoing:   "bg-primary/10 text-primary border border-primary/20",
    completed: "bg-success/10 text-success border border-success/20",
    cancelled: "bg-destructive/10 text-destructive border border-destructive/20",
  };
  return map[s] ?? "bg-muted text-muted-foreground";
};

const examTypeLabel: Record<string, string> = {
  midterm: "Mid-term", final: "Final", unit: "Unit", annual: "Annual",
};

function calcGrade(marks: number, total: number) {
  if (!total || isNaN(marks) || marks < 0) return { grade: "—", pct: 0, passed: false };
  const pct = Math.round((marks / total) * 100);
  let grade = "F";
  if (pct >= 90) grade = "A+";
  else if (pct >= 80) grade = "A";
  else if (pct >= 70) grade = "B+";
  else if (pct >= 60) grade = "B";
  else if (pct >= 50) grade = "C";
  else if (pct >= 33) grade = "D";
  return { grade, pct, passed: pct >= 33 };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TestExamPage() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const isAdmin  = user?.role === "school_admin";
  const canCreate = isAdmin || hasPermission("canCreateExam");

  // ── Shared ──────────────────────────────────────────────────────────────
  const [classes, setClasses]           = useState<ClassItem[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);

  // ── Test tab state ───────────────────────────────────────────────────────
  const [tests, setTests]               = useState<TestDoc[]>([]);
  const [testsLoading, setTestsLoading] = useState(true);
  const [testForm, setTestForm]         = useState(EMPTY_TEST);
  const [testErrors, setTestErrors]     = useState<Record<string, string>>({});
  const [testSubmitting, setTestSubmitting] = useState(false);
  const [testSubjects, setTestSubjects] = useState<SubjectItem[]>([]);
  const [testSubjectsLoading, setTestSubjectsLoading] = useState(false);
  const [filterClassId,   setFilterClassId]   = useState("");
  const [filterSubjectId, setFilterSubjectId] = useState("");
  const [filterSubjectOptions, setFilterSubjectOptions] = useState<SubjectItem[]>([]);
  // Edit test
  const [editTestDialog, setEditTestDialog] = useState(false);
  const [editingTest,    setEditingTest]    = useState<TestDoc | null>(null);
  const [editTestForm,   setEditTestForm]   = useState(EMPTY_TEST);
  const [editTestSubjects, setEditTestSubjects] = useState<SubjectItem[]>([]);
  const [editTestSubjectsLoading, setEditTestSubjectsLoading] = useState(false);
  const [deleteTestId,   setDeleteTestId]   = useState<string | null>(null);
  const [deletingTest,   setDeletingTest]   = useState(false);

  // ── Exam tab state ───────────────────────────────────────────────────────
  const [exams, setExams]               = useState<ExamDoc[]>([]);
  const [examsLoading, setExamsLoading] = useState(true);
  const [examForm, setExamForm]         = useState(EMPTY_EXAM);
  const [examErrors, setExamErrors]     = useState<Record<string, string>>({});
  const [examSubmitting, setExamSubmitting] = useState(false);
  const [examSubjects,   setExamSubjects]   = useState<SubjectItem[]>([]);
  const [examSubjectsLoading, setExamSubjectsLoading] = useState(false);
  const [selectedSubjectIds, setSelectedSubjectIds]   = useState<Set<string>>(new Set());
  const [subjectDetails,     setSubjectDetails]       = useState<Record<string, SubjectDetail>>({});
  const [examFilterClassId,  setExamFilterClassId]    = useState("");
  // Expandable rows
  const [expandedExamIds, setExpandedExamIds] = useState<Set<string>>(new Set());
  const [examSubjectsMap, setExamSubjectsMap] = useState<Record<string, ExamSubjectDoc[]>>({});
  const [loadingExamSubjects, setLoadingExamSubjects] = useState<Set<string>>(new Set());
  // Edit exam
  const [editExamDialog, setEditExamDialog]   = useState(false);
  const [editingExam,    setEditingExam]       = useState<ExamDoc | null>(null);
  const [editExamForm,   setEditExamForm]      = useState(EMPTY_EXAM);
  const [editExamSubjects, setEditExamSubjects] = useState<SubjectItem[]>([]);
  const [editExamSubjectsLoading, setEditExamSubjectsLoading] = useState(false);
  const [editSelectedSubjectIds, setEditSelectedSubjectIds] = useState<Set<string>>(new Set());
  const [editSubjectDetails,     setEditSubjectDetails]     = useState<Record<string, SubjectDetail>>({});
  const [deleteExamId,   setDeleteExamId]   = useState<string | null>(null);
  const [deletingExam,   setDeletingExam]   = useState(false);

  // ── Result Entry tab state ───────────────────────────────────────────────
  const [rClassId,        setRClassId]        = useState("");
  const [rSourceType,     setRSourceType]     = useState<"test"|"scheduledExam">("test");
  const [rTests,          setRTests]          = useState<TestDoc[]>([]);
  const [rExams,          setRExams]          = useState<ExamDoc[]>([]);
  const [rTestsLoading,   setRTestsLoading]   = useState(false);
  const [rExamsLoading,   setRExamsLoading]   = useState(false);
  const [rSourceId,       setRSourceId]       = useState("");
  const [rExamSubjects,   setRExamSubjects]   = useState<ExamSubjectDoc[]>([]);
  // ── Test source (single subject) ──
  const [rEntryData,      setREntryData]      = useState<EntryStudent[]>([]);
  const [rTotalMarks,     setRTotalMarks]     = useState(0);
  const [rSourceTitle,    setRSourceTitle]    = useState("");
  const [rEntryLoading,   setREntryLoading]   = useState(false);
  const [rMarks,          setRMarks]          = useState<Record<string, string>>({});
  const [rRemarks,        setRRemarks]        = useState<Record<string, string>>({});
  // ── Scheduled exam (all subjects at once) ──
  const [rActiveEsId,     setRActiveEsId]     = useState("");
  const [rAllLoading,     setRAllLoading]     = useState(false);
  const [rEntryDataMap,   setREntryDataMap]   = useState<Record<string, EntryStudent[]>>({});
  const [rTotalMarksMap,  setRTotalMarksMap]  = useState<Record<string, number>>({});
  const [rMarksMap,       setRMarksMap]       = useState<Record<string, Record<string,string>>>({});
  const [rRemarksMap,     setRRemarksMap]     = useState<Record<string, Record<string,string>>>({});
  // ── Shared saving state ──
  const [rSaving,         setRSaving]         = useState(false);
  const [rPublishing,     setRPublishing]     = useState<Set<string>>(new Set());
  const [rPublishingAll,  setRPublishingAll]  = useState(false);
  const [rRowSaving,      setRRowSaving]      = useState<Set<string>>(new Set());

  // ── Fetch functions ──────────────────────────────────────────────────────
  const fetchClasses = useCallback(() => {
    setClassesLoading(true);
    const endpoint = isAdmin ? "/admin/classes" : "/teachers/me";
    api.get(endpoint)
      .then((res) => {
        let raw: any[];
        if (isAdmin) {
          raw = res.data?.classes ?? res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
        } else {
          const profile = res.data?.data;
          raw = profile?.assignedClasses || [];
        }
        setClasses(raw.map((c) => ({
          _id:     c._id ?? c.id,
          name:    c.name ?? "",
          section: c.section ?? "",
          grade:   String(c.grade ?? ""),
        })));
      })
      .catch(() => toast.error("Failed to load classes"))
      .finally(() => setClassesLoading(false));
  }, [isAdmin]);

  const fetchTests = useCallback(() => {
    setTestsLoading(true);
    const params: Record<string, string> = {};
    if (filterClassId)   params.classId   = filterClassId;
    if (filterSubjectId) params.subjectId = filterSubjectId;
    api.get("/tests", { params })
      .then((res) => setTests(res.data?.data ?? []))
      .catch(() => toast.error("Failed to load tests"))
      .finally(() => setTestsLoading(false));
  }, [filterClassId, filterSubjectId]);

  const fetchExams = useCallback(() => {
    setExamsLoading(true);
    const params: Record<string, string> = {};
    if (examFilterClassId) params.classId = examFilterClassId;
    api.get("/school-exams", { params })
      .then((res) => setExams(res.data?.data ?? []))
      .catch(() => toast.error("Failed to load exams"))
      .finally(() => setExamsLoading(false));
  }, [examFilterClassId]);

  const fetchSubjectsForClass = (classId: string, setter: (s: SubjectItem[]) => void, loadingSetter: (v: boolean) => void) => {
    if (!classId) { setter([]); return; }
    loadingSetter(true);
    api.get(`/subjects/class/${classId}`)
      .then((res) => setter(res.data?.data ?? []))
      .catch(() => toast.error("Failed to load subjects for class"))
      .finally(() => loadingSetter(false));
  };

  useEffect(() => { fetchClasses(); }, [fetchClasses]);
  useEffect(() => { fetchTests(); }, [fetchTests]);
  useEffect(() => { fetchExams(); }, [fetchExams]);

  // Fetch filter subject options when filter class changes
  useEffect(() => {
    if (!filterClassId) { setFilterSubjectOptions([]); setFilterSubjectId(""); return; }
    api.get(`/subjects/class/${filterClassId}`)
      .then((res) => setFilterSubjectOptions(res.data?.data ?? []))
      .catch(() => {});
  }, [filterClassId]);

  // ── Test form handlers ───────────────────────────────────────────────────
  const handleTestClassChange = (classId: string) => {
    setTestForm((f) => ({ ...f, classId, subjectId: "" }));
    setTestSubjects([]);
    fetchSubjectsForClass(classId, setTestSubjects, setTestSubjectsLoading);
  };

  const validateTestForm = (form: typeof EMPTY_TEST) => {
    const e: Record<string, string> = {};
    if (!form.title.trim())                        e.title     = "Title is required";
    if (!form.classId)                             e.classId   = "Select a class";
    if (!form.subjectId)                           e.subjectId = "Select a subject";
    if (!form.date)                                e.date      = "Date is required";
    if (!form.totalMarks || +form.totalMarks < 1)  e.totalMarks = "Must be ≥ 1";
    if (!form.duration   || +form.duration   < 1)  e.duration   = "Must be ≥ 1";
    return e;
  };

  const submitTest = async () => {
    const errs = validateTestForm(testForm);
    if (Object.keys(errs).length) { setTestErrors(errs); return; }
    setTestSubmitting(true);
    try {
      await api.post("/tests", { ...testForm, totalMarks: +testForm.totalMarks, duration: +testForm.duration });
      toast.success("Test created");
      setTestForm(EMPTY_TEST);
      setTestSubjects([]);
      setTestErrors({});
      fetchTests();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to create test");
    } finally {
      setTestSubmitting(false);
    }
  };

  const openEditTest = (t: TestDoc) => {
    setEditingTest(t);
    setEditTestForm({
      title:      t.title,
      classId:    t.classId?._id ?? "",
      subjectId:  t.subjectId?._id ?? "",
      date:       t.date ? t.date.slice(0, 10) : "",
      totalMarks: String(t.totalMarks),
      duration:   String(t.duration),
      description: t.description,
    });
    setEditTestSubjects([]);
    fetchSubjectsForClass(t.classId?._id ?? "", setEditTestSubjects, setEditTestSubjectsLoading);
    setEditTestDialog(true);
  };

  const submitEditTest = async () => {
    if (!editingTest) return;
    const errs = validateTestForm(editTestForm);
    if (Object.keys(errs).length) { setTestErrors(errs); return; }
    setTestSubmitting(true);
    try {
      await api.put(`/tests/${editingTest._id}`, {
        ...editTestForm, totalMarks: +editTestForm.totalMarks, duration: +editTestForm.duration,
      });
      toast.success("Test updated");
      setEditTestDialog(false);
      fetchTests();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to update test");
    } finally {
      setTestSubmitting(false);
    }
  };

  const confirmDeleteTest = async () => {
    if (!deleteTestId) return;
    setDeletingTest(true);
    try {
      await api.delete(`/tests/${deleteTestId}`);
      toast.success("Test deleted");
      setDeleteTestId(null);
      fetchTests();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to delete test");
    } finally {
      setDeletingTest(false);
    }
  };

  // ── Exam form handlers ───────────────────────────────────────────────────
  const handleExamClassChange = (classId: string) => {
    setExamForm((f) => ({ ...f, classId }));
    setExamSubjects([]);
    setSelectedSubjectIds(new Set());
    fetchSubjectsForClass(classId, setExamSubjects, setExamSubjectsLoading);
  };

  const toggleSubject = (sid: string, checked: boolean, isEdit = false) => {
    const setIds     = isEdit ? setEditSelectedSubjectIds : setSelectedSubjectIds;
    const setDetails = isEdit ? setEditSubjectDetails     : setSubjectDetails;
    setIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(sid); else next.delete(sid);
      return next;
    });
    if (checked) {
      setDetails((prev) => ({ ...prev, [sid]: prev[sid] ?? { date: "", totalMarks: "", duration: "" } }));
    }
  };

  const setSubjectDetailField = (
    sid: string, field: keyof SubjectDetail, value: string, isEdit = false,
  ) => {
    const setter = isEdit ? setEditSubjectDetails : setSubjectDetails;
    setter((prev) => ({ ...prev, [sid]: { ...(prev[sid] ?? { date: "", totalMarks: "", duration: "" }), [field]: value } }));
  };

  const validateExamForm = (form: typeof EMPTY_EXAM, selIds: Set<string>, details: Record<string, SubjectDetail>) => {
    const e: Record<string, string> = {};
    if (!form.title.trim())   e.title     = "Title is required";
    if (!form.classId)        e.classId   = "Select a class";
    if (!form.examType)       e.examType  = "Select exam type";
    if (!form.startDate)      e.startDate = "Start date required";
    if (!form.endDate)        e.endDate   = "End date required";
    if (selIds.size === 0)    e.subjects  = "Select at least one subject";
    selIds.forEach((sid) => {
      const d = details[sid];
      if (!d?.date)       e[`${sid}_date`]     = "Required";
      if (!d?.totalMarks || +d.totalMarks < 1) e[`${sid}_marks`] = "Required";
      if (!d?.duration   || +d.duration   < 1) e[`${sid}_dur`]   = "Required";
    });
    return e;
  };

  const buildSubjectsPayload = (selIds: Set<string>, details: Record<string, SubjectDetail>) =>
    Array.from(selIds).map((sid) => ({
      subjectId:  sid,
      date:       details[sid]?.date,
      totalMarks: +(details[sid]?.totalMarks ?? 0),
      duration:   +(details[sid]?.duration ?? 0),
    }));

  const submitExam = async () => {
    const errs = validateExamForm(examForm, selectedSubjectIds, subjectDetails);
    if (Object.keys(errs).length) { setExamErrors(errs); return; }
    setExamSubmitting(true);
    try {
      await api.post("/school-exams", {
        ...examForm,
        subjects: buildSubjectsPayload(selectedSubjectIds, subjectDetails),
      });
      toast.success("Exam created");
      setExamForm(EMPTY_EXAM);
      setExamSubjects([]);
      setSelectedSubjectIds(new Set());
      setSubjectDetails({});
      setExamErrors({});
      fetchExams();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to create exam");
    } finally {
      setExamSubmitting(false);
    }
  };

  const openEditExam = async (exam: ExamDoc) => {
    setEditingExam(exam);
    setEditExamForm({
      title:       exam.title,
      classId:     exam.classId?._id ?? "",
      examType:    exam.examType,
      startDate:   exam.startDate?.slice(0, 10) ?? "",
      endDate:     exam.endDate?.slice(0, 10) ?? "",
      description: exam.description,
    });
    // Load class subjects
    setEditExamSubjects([]);
    fetchSubjectsForClass(exam.classId?._id ?? "", setEditExamSubjects, setEditExamSubjectsLoading);
    // Load existing exam subjects
    try {
      const res = await api.get(`/school-exams/${exam._id}/subjects`);
      const existing: ExamSubjectDoc[] = res.data?.data ?? [];
      const ids = new Set(existing.map((es) => es.subjectId._id));
      const details: Record<string, SubjectDetail> = {};
      existing.forEach((es) => {
        details[es.subjectId._id] = {
          date:       es.date?.slice(0, 10) ?? "",
          totalMarks: String(es.totalMarks),
          duration:   String(es.duration),
        };
      });
      setEditSelectedSubjectIds(ids);
      setEditSubjectDetails(details);
    } catch {
      setEditSelectedSubjectIds(new Set());
      setEditSubjectDetails({});
    }
    setExamErrors({});
    setEditExamDialog(true);
  };

  const submitEditExam = async () => {
    if (!editingExam) return;
    const errs = validateExamForm(editExamForm, editSelectedSubjectIds, editSubjectDetails);
    if (Object.keys(errs).length) { setExamErrors(errs); return; }
    setExamSubmitting(true);
    try {
      await api.put(`/school-exams/${editingExam._id}`, {
        ...editExamForm,
        subjects: buildSubjectsPayload(editSelectedSubjectIds, editSubjectDetails),
      });
      toast.success("Exam updated");
      setEditExamDialog(false);
      fetchExams();
      // Refresh expanded subjects if this exam was expanded
      if (expandedExamIds.has(editingExam._id)) fetchExamSubjects(editingExam._id);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to update exam");
    } finally {
      setExamSubmitting(false);
    }
  };

  const confirmDeleteExam = async () => {
    if (!deleteExamId) return;
    setDeletingExam(true);
    try {
      await api.delete(`/school-exams/${deleteExamId}`);
      toast.success("Exam deleted");
      setDeleteExamId(null);
      fetchExams();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to delete exam");
    } finally {
      setDeletingExam(false);
    }
  };

  // ── Expandable exam row ──────────────────────────────────────────────────
  const fetchExamSubjects = async (examId: string) => {
    setLoadingExamSubjects((prev) => new Set(prev).add(examId));
    try {
      const res = await api.get(`/school-exams/${examId}/subjects`);
      setExamSubjectsMap((prev) => ({ ...prev, [examId]: res.data?.data ?? [] }));
    } catch {
      toast.error("Failed to load exam subjects");
    } finally {
      setLoadingExamSubjects((prev) => { const s = new Set(prev); s.delete(examId); return s; });
    }
  };

  const toggleExpandExam = (examId: string) => {
    setExpandedExamIds((prev) => {
      const next = new Set(prev);
      if (next.has(examId)) { next.delete(examId); return next; }
      next.add(examId);
      if (!examSubjectsMap[examId]) fetchExamSubjects(examId);
      return next;
    });
  };

  // ── Result tab handlers ──────────────────────────────────────────────────
  const resetRExamState = () => {
    setRSourceId(""); setRActiveEsId(""); setRExamSubjects([]);
    setREntryData([]); setRTotalMarks(0); setRSourceTitle("");
    setRMarks({}); setRRemarks({});
    setREntryDataMap({}); setRTotalMarksMap({}); setRMarksMap({}); setRRemarksMap({});
  };

  const handleRClassChange = (classId: string) => {
    setRClassId(classId);
    resetRExamState();
    if (rSourceType === "test") {
      setRTestsLoading(true);
      api.get("/tests", { params: { classId } })
        .then(res => setRTests(res.data?.data ?? []))
        .catch(() => toast.error("Failed to load tests"))
        .finally(() => setRTestsLoading(false));
    } else {
      setRExamsLoading(true);
      api.get("/school-exams", { params: { classId } })
        .then(res => setRExams(res.data?.data ?? []))
        .catch(() => toast.error("Failed to load exams"))
        .finally(() => setRExamsLoading(false));
    }
  };

  const handleRSourceTypeChange = (t: "test"|"scheduledExam") => {
    setRSourceType(t);
    resetRExamState();
    if (!rClassId) return;
    if (t === "test") {
      setRTestsLoading(true);
      api.get("/tests", { params: { classId: rClassId } })
        .then(res => setRTests(res.data?.data ?? []))
        .catch(() => {})
        .finally(() => setRTestsLoading(false));
    } else {
      setRExamsLoading(true);
      api.get("/school-exams", { params: { classId: rClassId } })
        .then(res => setRExams(res.data?.data ?? []))
        .catch(() => {})
        .finally(() => setRExamsLoading(false));
    }
  };

  const handleRExamChange = async (examId: string) => {
    setRSourceId(examId);
    setRActiveEsId(""); setREntryDataMap({}); setRTotalMarksMap({});
    setRMarksMap({}); setRRemarksMap({}); setRExamSubjects([]);
    setRAllLoading(true);
    try {
      const subRes = await api.get(`/school-exams/${examId}/subjects`);
      const subjects: ExamSubjectDoc[] = subRes.data?.data ?? [];
      setRExamSubjects(subjects);
      if (!subjects.length) return;
      setRActiveEsId(subjects[0]._id);

      // Load ALL subjects' entry data in parallel
      const results = await Promise.allSettled(
        subjects.map(es =>
          api.get(`/exams/class/${rClassId}/entry-data`, {
            params: { sourceType: "scheduledExam", sourceId: examId, examSubjectId: es._id },
          })
        )
      );

      const edMap: Record<string, EntryStudent[]> = {};
      const tmMap: Record<string, number>          = {};
      const mkMap: Record<string, Record<string,string>> = {};
      const rmMap: Record<string, Record<string,string>> = {};

      subjects.forEach((es, i) => {
        const r = results[i];
        if (r.status === "fulfilled") {
          const data: EntryStudent[] = r.value.data?.data ?? [];
          edMap[es._id] = data;
          tmMap[es._id] = r.value.data?.totalMarks ?? 0;
          const m: Record<string,string> = {};
          const rm: Record<string,string> = {};
          data.forEach(row => {
            if (row.result) {
              m[row.student._id]  = String(row.result.marksObtained);
              rm[row.student._id] = row.result.remarks || "";
            }
          });
          mkMap[es._id] = m;
          rmMap[es._id] = rm;
        } else {
          edMap[es._id] = []; tmMap[es._id] = 0; mkMap[es._id] = {}; rmMap[es._id] = {};
        }
      });

      setREntryDataMap(edMap);
      setRTotalMarksMap(tmMap);
      setRMarksMap(mkMap);
      setRRemarksMap(rmMap);
    } catch {
      toast.error("Failed to load exam subjects");
    } finally {
      setRAllLoading(false);
    }
  };

  const loadEntryData = async () => {
    if (!rSourceId) return;
    setREntryLoading(true);
    try {
      const params: Record<string, string> = { sourceType: rSourceType, sourceId: rSourceId };
      const res = await api.get(`/exams/class/${rClassId}/entry-data`, { params });
      setREntryData(res.data?.data ?? []);
      setRTotalMarks(res.data?.totalMarks ?? 0);
      setRSourceTitle(res.data?.sourceTitle ?? "");
      // Pre-fill existing marks
      const m: Record<string, string> = {};
      const rm: Record<string, string> = {};
      (res.data?.data ?? []).forEach((row: EntryStudent) => {
        if (row.result) {
          m[row.student._id]  = String(row.result.marksObtained);
          rm[row.student._id] = row.result.remarks || "";
        }
      });
      setRMarks(m); setRRemarks(rm);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to load students");
    } finally {
      setREntryLoading(false);
    }
  };

  const handleSaveResults = async () => {
    const payload = rEntryData
      .filter(row => rMarks[row.student._id] !== "" && rMarks[row.student._id] !== undefined)
      .map(row => ({
        studentId:     row.student._id,
        marksObtained: Number(rMarks[row.student._id]),
        remarks:       rRemarks[row.student._id] || "",
      }));
    if (!payload.length) { toast.error("Enter at least one student's marks."); return; }
    setRSaving(true);
    try {
      await api.post("/exams/bulk-results", {
        sourceType: rSourceType,
        sourceId:   rSourceId,
        totalMarks: rTotalMarks,
        results:    payload,
      });
      toast.success("Marks saved successfully.");
      loadEntryData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to save marks");
    } finally {
      setRSaving(false);
    }
  };

  const handleSaveAndPublishRow = async (studentId: string) => {
    const markVal = rMarks[studentId];
    if (markVal === "" || markVal === undefined) { toast.error("Enter marks first."); return; }
    setRRowSaving(prev => new Set(prev).add(studentId));
    try {
      await api.post("/exams/bulk-results", {
        sourceType: rSourceType,
        sourceId:   rSourceId,
        totalMarks: rTotalMarks,
        results: [{ studentId, marksObtained: Number(markVal), remarks: rRemarks[studentId] || "" }],
      });
      // Reload to get the new result ID, then publish it
      const params: Record<string, string> = { sourceType: rSourceType, sourceId: rSourceId };
      const res = await api.get(`/exams/class/${rClassId}/entry-data`, { params });
      const updatedData: EntryStudent[] = res.data?.data ?? [];
      setREntryData(updatedData);
      setRTotalMarks(res.data?.totalMarks ?? rTotalMarks);
      // Find the saved result ID and publish it
      const savedRow = updatedData.find(r => r.student._id === studentId);
      if (savedRow?.result?._id) {
        await api.patch("/exams/publish-results", { resultIds: [savedRow.result._id], publish: true });
        toast.success("Saved & published.");
        // Update local state
        setREntryData(prev => prev.map(row =>
          row.student._id === studentId ? { ...row, result: { ...row.result!, isPublished: true } } : row
        ));
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to save & publish");
    } finally {
      setRRowSaving(prev => { const s = new Set(prev); s.delete(studentId); return s; });
    }
  };

  const handlePublishResult = async (resultId: string, publish: boolean) => {
    setRPublishing(prev => new Set(prev).add(resultId));
    try {
      await api.patch("/exams/publish-results", { resultIds: [resultId], publish });
      toast.success(publish ? "Result published." : "Result unpublished.");
      setREntryData(prev => prev.map(row =>
        row.result?._id === resultId ? { ...row, result: { ...row.result!, isPublished: publish } } : row
      ));
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to update publish status");
    } finally {
      setRPublishing(prev => { const s = new Set(prev); s.delete(resultId); return s; });
    }
  };

  const handlePublishAll = async (publish: boolean) => {
    const ids = rEntryData.filter(r => r.result?._id).map(r => r.result!._id);
    if (!ids.length) { toast.error("No saved results to publish."); return; }
    setRPublishingAll(true);
    try {
      await api.patch("/exams/publish-results", { resultIds: ids, publish });
      toast.success(publish ? `All ${ids.length} results published.` : "All results unpublished.");
      loadEntryData();
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to publish results");
    } finally {
      setRPublishingAll(false);
    }
  };

  // ── Multi-subject save (exam) ────────────────────────────────────────────
  const handleSaveAllSubjects = async () => {
    setRSaving(true);
    let saved = 0, failed = 0;
    for (const es of rExamSubjects) {
      const esMarks = rMarksMap[es._id] || {};
      const data    = rEntryDataMap[es._id] || [];
      const payload = data
        .filter(row => esMarks[row.student._id] !== "" && esMarks[row.student._id] !== undefined)
        .map(row => ({
          studentId: row.student._id,
          marksObtained: Number(esMarks[row.student._id]),
          remarks: (rRemarksMap[es._id] || {})[row.student._id] || "",
        }));
      if (!payload.length) continue;
      try {
        await api.post("/exams/bulk-results", {
          sourceType: "scheduledExam", sourceId: rSourceId,
          examSubjectId: es._id, totalMarks: rTotalMarksMap[es._id] || 0,
          results: payload,
        });
        saved++;
      } catch { failed++; }
    }
    if (saved)  toast.success(`Marks saved for ${saved} subject(s).`);
    if (failed) toast.error(`Failed to save ${failed} subject(s).`);
    if (saved)  handleRExamChange(rSourceId);
    else        setRSaving(false);
  };

  const handlePublishAllSubjects = async (publish: boolean) => {
    const allIds: string[] = [];
    rExamSubjects.forEach(es => {
      (rEntryDataMap[es._id] || []).forEach(row => {
        if (row.result?._id) allIds.push(row.result._id);
      });
    });
    if (!allIds.length) { toast.error("Save results first, then publish."); return; }
    setRPublishingAll(true);
    try {
      await api.patch("/exams/publish-results", { resultIds: allIds, publish });
      toast.success(publish ? `${allIds.length} results published.` : "All results unpublished.");
      handleRExamChange(rSourceId);
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? "Failed to publish results");
      setRPublishingAll(false);
    }
  };

  // ── Subject detail sub-form (shared between create & edit exam) ──────────
  const SubjectDetailRows = ({
    subjectList, selectedIds, details, errors, isEdit,
  }: {
    subjectList: SubjectItem[];
    selectedIds: Set<string>;
    details: Record<string, SubjectDetail>;
    errors: Record<string, string>;
    isEdit: boolean;
  }) => (
    <div className="space-y-3">
      <Label className="text-sm font-medium">Select Subjects</Label>
      {errors.subjects && <p className="text-xs text-destructive">{errors.subjects}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        {subjectList.map((s) => (
          <label
            key={s._id}
            htmlFor={`${isEdit ? "e" : "c"}-sub-${s._id}`}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
              selectedIds.has(s._id) ? "border-primary bg-primary/5" : "hover:bg-muted/50"
            }`}
          >
            <Checkbox
              id={`${isEdit ? "e" : "c"}-sub-${s._id}`}
              checked={selectedIds.has(s._id)}
              onCheckedChange={(chk) => toggleSubject(s._id, !!chk, isEdit)}
            />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{s.name}</p>
              <p className="text-xs text-muted-foreground font-mono">{s.code}</p>
            </div>
          </label>
        ))}
      </div>

      {selectedIds.size > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-sm font-medium text-muted-foreground">
            Set date, marks & duration per subject:
          </p>
          {Array.from(selectedIds).map((sid) => {
            const subj = subjectList.find((s) => s._id === sid);
            const det  = details[sid] ?? { date: "", totalMarks: "", duration: "" };
            return (
              <div key={sid} className="grid grid-cols-1 sm:grid-cols-4 gap-2 rounded-lg border px-3 py-2.5 bg-muted/20">
                <div className="flex items-center gap-2 sm:col-span-1">
                  <BookOpen className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm font-medium truncate">{subj?.name}</span>
                </div>
                <div>
                  <Input
                    type="date"
                    value={det.date}
                    onChange={(e) => setSubjectDetailField(sid, "date", e.target.value, isEdit)}
                    className={`h-8 text-xs ${errors[`${sid}_date`] ? "border-destructive" : ""}`}
                  />
                  {errors[`${sid}_date`] && <p className="text-[10px] text-destructive mt-0.5">Required</p>}
                </div>
                <div>
                  <Input
                    type="number" min={1} placeholder="Marks"
                    value={det.totalMarks}
                    onChange={(e) => setSubjectDetailField(sid, "totalMarks", e.target.value, isEdit)}
                    className={`h-8 text-xs ${errors[`${sid}_marks`] ? "border-destructive" : ""}`}
                  />
                  {errors[`${sid}_marks`] && <p className="text-[10px] text-destructive mt-0.5">Required</p>}
                </div>
                <div>
                  <Input
                    type="number" min={1} placeholder="Min"
                    value={det.duration}
                    onChange={(e) => setSubjectDetailField(sid, "duration", e.target.value, isEdit)}
                    className={`h-8 text-xs ${errors[`${sid}_dur`] ? "border-destructive" : ""}`}
                  />
                  {errors[`${sid}_dur`] && <p className="text-[10px] text-destructive mt-0.5">Required</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">Tests & Exams</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Schedule unit tests and multi-subject exams for classes.
          </p>
        </div>

        <Tabs defaultValue="tests" className="space-y-4">
          <TabsList className="w-full sm:w-auto grid grid-cols-3">
            <TabsTrigger value="tests" className="gap-1.5 text-xs sm:text-sm">
              <ClipboardList className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Tests</span>
            </TabsTrigger>
            <TabsTrigger value="exams" className="gap-1.5 text-xs sm:text-sm">
              <GraduationCap className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Exams</span>
            </TabsTrigger>
            <TabsTrigger value="results" className="gap-1.5 text-xs sm:text-sm">
              <BarChart3 className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Results</span>
            </TabsTrigger>
          </TabsList>

          {/* ================================================================
              TAB 1 — TESTS
          ================================================================ */}
          <TabsContent value="tests" className="space-y-6">

            {/* ── Create Test Form ──────────────────────────────────────── */}
            {canCreate && <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plus className="h-5 w-5 text-primary" /> Create Test
                </CardTitle>
                <CardDescription>Single-subject unit test for one class.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Row 1: Class + Subject */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Class <span className="text-destructive">*</span></Label>
                    {classesLoading ? (
                      <div className="h-9 rounded-md border flex items-center px-3 gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                      </div>
                    ) : (
                      <Select value={testForm.classId} onValueChange={handleTestClassChange}>
                        <SelectTrigger className={testErrors.classId ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select class…" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((c) => (
                            <SelectItem key={c._id} value={c._id}>{classLabel(c)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {testErrors.classId && <p className="text-xs text-destructive">{testErrors.classId}</p>}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Subject <span className="text-destructive">*</span></Label>
                    {testSubjectsLoading ? (
                      <div className="h-9 rounded-md border flex items-center px-3 gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                      </div>
                    ) : (
                      <Select
                        value={testForm.subjectId}
                        onValueChange={(v) => setTestForm((f) => ({ ...f, subjectId: v }))}
                        disabled={!testForm.classId || testSubjects.length === 0}
                      >
                        <SelectTrigger className={testErrors.subjectId ? "border-destructive" : ""}>
                          <SelectValue placeholder={!testForm.classId ? "Select class first" : testSubjects.length === 0 ? "No subjects assigned" : "Select subject…"} />
                        </SelectTrigger>
                        <SelectContent>
                          {testSubjects.map((s) => (
                            <SelectItem key={s._id} value={s._id}>{s.name} ({s.code})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {testErrors.subjectId && <p className="text-xs text-destructive">{testErrors.subjectId}</p>}
                  </div>
                </div>

                {/* Row 2: Title */}
                <div className="space-y-1.5">
                  <Label>Title <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="e.g. Unit Test 1 — Algebra"
                    value={testForm.title}
                    onChange={(e) => setTestForm((f) => ({ ...f, title: e.target.value }))}
                    className={testErrors.title ? "border-destructive" : ""}
                  />
                  {testErrors.title && <p className="text-xs text-destructive">{testErrors.title}</p>}
                </div>

                {/* Row 3: Date + Marks + Duration */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Date <span className="text-destructive">*</span></Label>
                    <Input
                      type="date"
                      value={testForm.date}
                      onChange={(e) => setTestForm((f) => ({ ...f, date: e.target.value }))}
                      className={testErrors.date ? "border-destructive" : ""}
                    />
                    {testErrors.date && <p className="text-xs text-destructive">{testErrors.date}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Total Marks <span className="text-destructive">*</span></Label>
                    <Input
                      type="number" min={1} placeholder="100"
                      value={testForm.totalMarks}
                      onChange={(e) => setTestForm((f) => ({ ...f, totalMarks: e.target.value }))}
                      className={testErrors.totalMarks ? "border-destructive" : ""}
                    />
                    {testErrors.totalMarks && <p className="text-xs text-destructive">{testErrors.totalMarks}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Duration (min) <span className="text-destructive">*</span></Label>
                    <Input
                      type="number" min={1} placeholder="60"
                      value={testForm.duration}
                      onChange={(e) => setTestForm((f) => ({ ...f, duration: e.target.value }))}
                      className={testErrors.duration ? "border-destructive" : ""}
                    />
                    {testErrors.duration && <p className="text-xs text-destructive">{testErrors.duration}</p>}
                  </div>
                </div>

                {/* Row 4: Description */}
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Optional notes…"
                    rows={2}
                    value={testForm.description}
                    onChange={(e) => setTestForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>

                <Button onClick={submitTest} disabled={testSubmitting} className="gap-2">
                  {testSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create Test
                </Button>
              </CardContent>
            </Card>}

            {/* ── Filter + Tests Table ──────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-primary" />
                    All Tests
                    <Badge variant="secondary">{tests.length}</Badge>
                  </CardTitle>
                  {/* Filters */}
                  <div className="flex flex-wrap items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Select value={filterClassId} onValueChange={(v) => { setFilterClassId(v === "__all__" ? "" : v); setFilterSubjectId(""); }}>
                      <SelectTrigger className="h-8 w-36 text-xs">
                        <SelectValue placeholder="All classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All classes</SelectItem>
                        {classes.map((c) => <SelectItem key={c._id} value={c._id}>{classLabel(c)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select
                      value={filterSubjectId}
                      onValueChange={(v) => setFilterSubjectId(v === "__all__" ? "" : v)}
                      disabled={!filterClassId || filterSubjectOptions.length === 0}
                    >
                      <SelectTrigger className="h-8 w-36 text-xs">
                        <SelectValue placeholder="All subjects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All subjects</SelectItem>
                        {filterSubjectOptions.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {testsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading tests…
                  </div>
                ) : tests.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ClipboardList className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">No tests found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-center">Marks</TableHead>
                          <TableHead className="text-center">Duration</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tests.map((t) => (
                          <TableRow key={t._id}>
                            <TableCell className="font-medium max-w-[160px] truncate">{t.title}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className="font-mono text-xs">
                                {t.subjectId?.name ?? "—"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {classLabel(t.classId)}
                            </TableCell>
                            <TableCell className="text-sm whitespace-nowrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                {fmtDate(t.date)}
                              </span>
                            </TableCell>
                            <TableCell className="text-center text-sm">{t.totalMarks}</TableCell>
                            <TableCell className="text-center text-sm">
                              <span className="flex items-center justify-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                {t.duration} min
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(t.status)}`}>
                                {t.status}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {canCreate && (
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditTest(t)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTestId(t._id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================================================================
              TAB 2 — EXAMS
          ================================================================ */}
          <TabsContent value="exams" className="space-y-6">

            {/* ── Create Exam Form ──────────────────────────────────────── */}
            {canCreate && <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Plus className="h-5 w-5 text-primary" /> Create Exam
                </CardTitle>
                <CardDescription>Multi-subject scheduled exam for one class.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Row 1: Title + Exam Type */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Exam Title <span className="text-destructive">*</span></Label>
                    <Input
                      placeholder="e.g. Mid-Term Examination 2025"
                      value={examForm.title}
                      onChange={(e) => setExamForm((f) => ({ ...f, title: e.target.value }))}
                      className={examErrors.title ? "border-destructive" : ""}
                    />
                    {examErrors.title && <p className="text-xs text-destructive">{examErrors.title}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Exam Type <span className="text-destructive">*</span></Label>
                    <Select value={examForm.examType} onValueChange={(v) => setExamForm((f) => ({ ...f, examType: v }))}>
                      <SelectTrigger className={examErrors.examType ? "border-destructive" : ""}>
                        <SelectValue placeholder="Select type…" />
                      </SelectTrigger>
                      <SelectContent>
                        {EXAM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    {examErrors.examType && <p className="text-xs text-destructive">{examErrors.examType}</p>}
                  </div>
                </div>

                {/* Row 2: Class + Start + End */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Class <span className="text-destructive">*</span></Label>
                    {classesLoading ? (
                      <div className="h-9 rounded-md border flex items-center px-3 gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                      </div>
                    ) : (
                      <Select value={examForm.classId} onValueChange={handleExamClassChange}>
                        <SelectTrigger className={examErrors.classId ? "border-destructive" : ""}>
                          <SelectValue placeholder="Select class…" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((c) => <SelectItem key={c._id} value={c._id}>{classLabel(c)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    {examErrors.classId && <p className="text-xs text-destructive">{examErrors.classId}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Start Date <span className="text-destructive">*</span></Label>
                    <Input
                      type="date"
                      value={examForm.startDate}
                      onChange={(e) => setExamForm((f) => ({ ...f, startDate: e.target.value }))}
                      className={examErrors.startDate ? "border-destructive" : ""}
                    />
                    {examErrors.startDate && <p className="text-xs text-destructive">{examErrors.startDate}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label>End Date <span className="text-destructive">*</span></Label>
                    <Input
                      type="date"
                      value={examForm.endDate}
                      onChange={(e) => setExamForm((f) => ({ ...f, endDate: e.target.value }))}
                      className={examErrors.endDate ? "border-destructive" : ""}
                    />
                    {examErrors.endDate && <p className="text-xs text-destructive">{examErrors.endDate}</p>}
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Optional instructions or notes…"
                    rows={2}
                    value={examForm.description}
                    onChange={(e) => setExamForm((f) => ({ ...f, description: e.target.value }))}
                  />
                </div>

                {/* Subject selection + per-subject details */}
                {examForm.classId && (
                  <div className="pt-2 border-t space-y-3">
                    {examSubjectsLoading ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading subjects…
                      </div>
                    ) : examSubjects.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No subjects assigned to this class. Assign subjects first from the Subject &amp; Class Assignment page.
                      </p>
                    ) : (
                      <SubjectDetailRows
                        subjectList={examSubjects}
                        selectedIds={selectedSubjectIds}
                        details={subjectDetails}
                        errors={examErrors}
                        isEdit={false}
                      />
                    )}
                  </div>
                )}

                <Button onClick={submitExam} disabled={examSubmitting} className="gap-2">
                  {examSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create Exam
                </Button>
              </CardContent>
            </Card>}

            {/* ── Filter + Exams Table ──────────────────────────────────── */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    All Exams
                    <Badge variant="secondary">{exams.length}</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
                    <Select value={examFilterClassId} onValueChange={(v) => setExamFilterClassId(v === "__all__" ? "" : v)}>
                      <SelectTrigger className="h-8 w-40 text-xs">
                        <SelectValue placeholder="All classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__all__">All classes</SelectItem>
                        {classes.map((c) => <SelectItem key={c._id} value={c._id}>{classLabel(c)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {examsLoading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading exams…
                  </div>
                ) : exams.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <GraduationCap className="h-10 w-10 text-muted-foreground/30 mb-2" />
                    <p className="text-sm text-muted-foreground">No exams found.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8"></TableHead>
                          <TableHead>Title</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Start</TableHead>
                          <TableHead>End</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {exams.map((exam) => {
                          const isExpanded = expandedExamIds.has(exam._id);
                          const isLoadingSubs = loadingExamSubjects.has(exam._id);
                          const subs = examSubjectsMap[exam._id] ?? [];
                          return (
                            <>
                              <TableRow key={exam._id} className="cursor-pointer" onClick={() => toggleExpandExam(exam._id)}>
                                <TableCell className="pr-0">
                                  {isLoadingSubs
                                    ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    : isExpanded
                                    ? <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                    : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                                </TableCell>
                                <TableCell className="font-medium max-w-[160px] truncate">{exam.title}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {classLabel(exam.classId)}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="text-xs">
                                    {examTypeLabel[exam.examType] ?? exam.examType}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm whitespace-nowrap">{fmtDate(exam.startDate)}</TableCell>
                                <TableCell className="text-sm whitespace-nowrap">{fmtDate(exam.endDate)}</TableCell>
                                <TableCell>
                                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge(exam.status)}`}>
                                    {exam.status}
                                  </span>
                                </TableCell>
                                <TableCell className="text-right">
                                  {canCreate && (
                                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditExam(exam)}>
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteExamId(exam._id)}>
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>

                              {/* Expanded subjects row */}
                              {isExpanded && (
                                <TableRow key={`${exam._id}-expanded`} className="bg-muted/20 hover:bg-muted/20">
                                  <TableCell colSpan={8} className="py-0">
                                    <div className="px-4 py-3 space-y-1.5">
                                      <p className="text-xs font-medium text-muted-foreground mb-2">Subject Schedule</p>
                                      {subs.length === 0 ? (
                                        <p className="text-xs text-muted-foreground">No subjects found.</p>
                                      ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                          {subs.map((es) => (
                                            <div key={es._id} className="flex items-start gap-2 rounded-lg border bg-background px-3 py-2">
                                              <BookOpen className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                                              <div className="min-w-0">
                                                <p className="text-sm font-medium truncate">{es.subjectId?.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                  {fmtDate(es.date)} · {es.totalMarks} marks · {es.duration} min
                                                </p>
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ================================================================
              TAB 3 — RESULTS
          ================================================================ */}
          <TabsContent value="results" className="space-y-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5 text-primary" /> Result Entry
                </CardTitle>
                <CardDescription>Select a class and exam — all subjects load together for bulk mark entry.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Row 1: Class + Source Type + Test/Exam */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Class <span className="text-destructive">*</span></Label>
                    {classesLoading ? (
                      <div className="h-9 rounded-md border flex items-center px-3 gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                      </div>
                    ) : (
                      <Select value={rClassId} onValueChange={handleRClassChange}>
                        <SelectTrigger><SelectValue placeholder="Select class…" /></SelectTrigger>
                        <SelectContent>
                          {classes.map(c => <SelectItem key={c._id} value={c._id}>{classLabel(c)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label>Source Type</Label>
                    <Select value={rSourceType} onValueChange={(v) => handleRSourceTypeChange(v as "test"|"scheduledExam")}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="test">Unit Test</SelectItem>
                        <SelectItem value="scheduledExam">Scheduled Exam</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {rSourceType === "test" ? (
                    <div className="space-y-1.5">
                      <Label>Select Test <span className="text-destructive">*</span></Label>
                      {rTestsLoading ? (
                        <div className="h-9 rounded-md border flex items-center px-3 gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                        </div>
                      ) : (
                        <Select
                          value={rSourceId}
                          onValueChange={(v) => { setRSourceId(v); setREntryData([]); }}
                          disabled={!rClassId || rTests.length === 0}
                        >
                          <SelectTrigger><SelectValue placeholder={!rClassId ? "Select class first" : rTests.length === 0 ? "No tests for this class" : "Select test…"} /></SelectTrigger>
                          <SelectContent>
                            {rTests.map(t => (
                              <SelectItem key={t._id} value={t._id}>
                                {t.title} — {fmtDate(t.date)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <Label>Select Exam <span className="text-destructive">*</span></Label>
                      {rExamsLoading ? (
                        <div className="h-9 rounded-md border flex items-center px-3 gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                        </div>
                      ) : (
                        <Select
                          value={rSourceId}
                          onValueChange={handleRExamChange}
                          disabled={!rClassId || rExams.length === 0}
                        >
                          <SelectTrigger><SelectValue placeholder={!rClassId ? "Select class first" : rExams.length === 0 ? "No exams for this class" : "Select exam…"} /></SelectTrigger>
                          <SelectContent>
                            {rExams.map(e => (
                              <SelectItem key={e._id} value={e._id}>
                                {e.title} ({examTypeLabel[e.examType] ?? e.examType})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  )}
                </div>

                {/* Load Students button for unit test */}
                {rSourceType === "test" && rSourceId && rEntryData.length === 0 && !rEntryLoading && (
                  <Button variant="outline" size="sm" onClick={() => loadEntryData()} className="gap-2">
                    <BookOpen className="h-4 w-4" /> Load Students
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* ── Loading all subjects ── */}
            {rAllLoading && (
              <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading all subjects…
              </div>
            )}

            {/* ── SCHEDULED EXAM: Subject tabs + unified entry table ── */}
            {rSourceType === "scheduledExam" && !rAllLoading && rExamSubjects.length > 0 && (
              <Card>
                <CardHeader className="pb-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        {rExams.find(e => e._id === rSourceId)?.title ?? "Exam Result Entry"}
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {rExamSubjects.length} subjects · {(rEntryDataMap[rActiveEsId] || []).length} students
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={handleSaveAllSubjects} disabled={rSaving || rPublishingAll} className="gap-2">
                        {rSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save All
                      </Button>
                      <Button size="sm" onClick={() => handlePublishAllSubjects(true)} disabled={rPublishingAll || rSaving} className="gap-2 btn-gradient border-0">
                        {rPublishingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SendHorizonal className="h-3.5 w-3.5" />}
                        Publish All
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handlePublishAllSubjects(false)} disabled={rPublishingAll || rSaving} className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5">
                        Unpublish All
                      </Button>
                    </div>
                  </div>

                  {/* Subject tabs */}
                  <div className="flex gap-1 flex-wrap pt-3 overflow-x-auto">
                    {rExamSubjects.map(es => {
                      const subjectMarks  = rMarksMap[es._id]  || {};
                      const filledCount   = Object.values(subjectMarks).filter(v => v !== "").length;
                      const totalStudents = (rEntryDataMap[es._id] || []).length;
                      const allSaved      = (rEntryDataMap[es._id] || []).every(r => r.result?._id);
                      const isActive      = rActiveEsId === es._id;
                      return (
                        <button
                          key={es._id}
                          onClick={() => setRActiveEsId(es._id)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all border whitespace-nowrap ${
                            isActive
                              ? "border-primary bg-primary/5 text-primary shadow-sm"
                              : "border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                          }`}
                        >
                          <BookOpen className="h-3.5 w-3.5 shrink-0" />
                          {(es as any).subjectId?.name ?? "Subject"}
                          <span className="text-xs opacity-70">({fmtDate(es.date)} · {es.totalMarks}M)</span>
                          {allSaved && <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />}
                          {!allSaved && filledCount > 0 && (
                            <span className="ml-1 text-xs bg-primary/10 text-primary rounded-full px-1.5">{filledCount}/{totalStudents}</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </CardHeader>

                {/* Active subject student table */}
                {rActiveEsId && (rEntryDataMap[rActiveEsId] || []).length > 0 && (
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>Student</TableHead>
                            <TableHead className="w-20">Roll No</TableHead>
                            <TableHead>Marks <span className="font-normal text-muted-foreground text-xs">/ {rTotalMarksMap[rActiveEsId] ?? 0}</span></TableHead>
                            <TableHead>Remarks</TableHead>
                            <TableHead className="text-center">Grade</TableHead>
                            <TableHead className="text-center">Result</TableHead>
                            <TableHead className="text-center">Published</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {(rEntryDataMap[rActiveEsId] || []).map((row, idx) => {
                            const markVal  = (rMarksMap[rActiveEsId] || {})[row.student._id] ?? "";
                            const total    = rTotalMarksMap[rActiveEsId] ?? 0;
                            const { grade, pct, passed } = calcGrade(Number(markVal), total);
                            const hasResult   = !!row.result?._id;
                            const isPublished = row.result?.isPublished ?? false;
                            const hasMarkInput = markVal !== "";
                            return (
                              <TableRow key={row.student._id}>
                                <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                                <TableCell>
                                  <p className="font-medium text-sm">{row.student.name}</p>
                                  <p className="text-xs text-muted-foreground font-mono">{row.student.studentId}</p>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">{row.student.rollNumber || "—"}</TableCell>
                                <TableCell>
                                  <Input
                                    type="number" min={0} max={total}
                                    placeholder={`0–${total}`}
                                    value={markVal}
                                    onChange={e => setRMarksMap(prev => ({
                                      ...prev,
                                      [rActiveEsId]: { ...(prev[rActiveEsId] || {}), [row.student._id]: e.target.value },
                                    }))}
                                    className="h-8 w-28 text-sm"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Input
                                    placeholder="Optional"
                                    value={(rRemarksMap[rActiveEsId] || {})[row.student._id] ?? ""}
                                    onChange={e => setRRemarksMap(prev => ({
                                      ...prev,
                                      [rActiveEsId]: { ...(prev[rActiveEsId] || {}), [row.student._id]: e.target.value },
                                    }))}
                                    className="h-8 w-28 text-xs"
                                  />
                                </TableCell>
                                <TableCell className="text-center">
                                  {hasMarkInput ? (
                                    <Badge variant="secondary" className={`text-xs font-bold ${
                                      grade === "A+" || grade === "A" ? "bg-green-100 text-green-700" :
                                      grade === "B+" || grade === "B" ? "bg-blue-100 text-blue-700" :
                                      grade === "C"  || grade === "D" ? "bg-yellow-100 text-yellow-700" :
                                      "bg-red-100 text-red-700"
                                    }`}>{grade} ({pct}%)</Badge>
                                  ) : <span className="text-muted-foreground text-xs">—</span>}
                                </TableCell>
                                <TableCell className="text-center">
                                  {hasMarkInput ? (
                                    <Badge variant="secondary" className={`text-xs ${passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                      {passed ? "Pass" : "Fail"}
                                    </Badge>
                                  ) : <span className="text-muted-foreground text-xs">—</span>}
                                </TableCell>
                                <TableCell className="text-center">
                                  {hasResult ? (
                                    <Badge variant="secondary" className={`text-xs gap-1 ${isPublished ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                                      {isPublished ? <><CheckCircle2 className="h-3 w-3 inline mr-0.5" />Published</> : "Draft"}
                                    </Badge>
                                  ) : <span className="text-xs text-muted-foreground">{hasMarkInput ? "Unsaved" : "—"}</span>}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                )}
              </Card>
            )}

            {/* ── UNIT TEST: single subject entry table (unchanged) ── */}
            {rEntryLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading students…
              </div>
            ) : rSourceType === "test" && rEntryData.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-primary" />
                        {rSourceTitle}
                        <Badge variant="secondary">Out of {rTotalMarks}</Badge>
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{rEntryData.length} students</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={handleSaveResults} disabled={rSaving} className="gap-2">
                        {rSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Save All
                      </Button>
                      <Button size="sm" onClick={() => handlePublishAll(true)} disabled={rPublishingAll} className="gap-2 btn-gradient border-0">
                        {rPublishingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <SendHorizonal className="h-3.5 w-3.5" />}
                        Publish All
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handlePublishAll(false)} disabled={rPublishingAll} className="gap-2 text-destructive border-destructive/30 hover:bg-destructive/5">
                        Unpublish All
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">#</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead className="w-20">Roll No</TableHead>
                          <TableHead>Marks <span className="font-normal text-muted-foreground text-xs">/ {rTotalMarks}</span></TableHead>
                          <TableHead>Remarks</TableHead>
                          <TableHead className="text-center">Grade</TableHead>
                          <TableHead className="text-center">Result</TableHead>
                          <TableHead className="text-center">Published</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rEntryData.map((row, idx) => {
                          const markVal      = rMarks[row.student._id] ?? "";
                          const { grade, pct, passed } = calcGrade(Number(markVal), rTotalMarks);
                          const hasResult    = !!row.result?._id;
                          const isPublished  = row.result?.isPublished ?? false;
                          const isBusy       = rPublishing.has(row.result?._id ?? "");
                          const isRowSaving  = rRowSaving.has(row.student._id);
                          const hasMarkInput = markVal !== "";
                          return (
                            <TableRow key={row.student._id}>
                              <TableCell className="text-xs text-muted-foreground">{idx + 1}</TableCell>
                              <TableCell>
                                <p className="font-medium text-sm">{row.student.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{row.student.studentId}</p>
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">{row.student.rollNumber || "—"}</TableCell>
                              <TableCell>
                                <Input
                                  type="number" min={0} max={rTotalMarks}
                                  placeholder={`0–${rTotalMarks}`}
                                  value={markVal}
                                  onChange={e => setRMarks(prev => ({ ...prev, [row.student._id]: e.target.value }))}
                                  className="h-8 w-28 text-sm"
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  placeholder="Optional"
                                  value={rRemarks[row.student._id] ?? ""}
                                  onChange={e => setRRemarks(prev => ({ ...prev, [row.student._id]: e.target.value }))}
                                  className="h-8 w-28 text-xs"
                                />
                              </TableCell>
                              <TableCell className="text-center">
                                {hasMarkInput ? (
                                  <Badge variant="secondary" className={`text-xs font-bold ${
                                    grade === "A+" || grade === "A" ? "bg-green-100 text-green-700" :
                                    grade === "B+" || grade === "B" ? "bg-blue-100 text-blue-700" :
                                    grade === "C"  || grade === "D" ? "bg-yellow-100 text-yellow-700" :
                                    "bg-red-100 text-red-700"
                                  }`}>{grade} ({pct}%)</Badge>
                                ) : <span className="text-muted-foreground text-xs">—</span>}
                              </TableCell>
                              <TableCell className="text-center">
                                {hasMarkInput ? (
                                  <Badge variant="secondary" className={`text-xs ${passed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                                    {passed ? "Pass" : "Fail"}
                                  </Badge>
                                ) : <span className="text-muted-foreground text-xs">—</span>}
                              </TableCell>
                              <TableCell className="text-center">
                                {hasResult ? (
                                  <Badge variant="secondary" className={`text-xs gap-1 ${isPublished ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                                    {isPublished ? <><CheckCircle2 className="h-3 w-3 inline mr-0.5" />Published</> : "Draft"}
                                  </Badge>
                                ) : <span className="text-xs text-muted-foreground">{hasMarkInput ? "Unsaved" : "Not saved"}</span>}
                              </TableCell>
                              <TableCell className="text-right">
                                {!hasResult && hasMarkInput && (
                                  <Button size="sm" className="h-7 text-xs gap-1" disabled={isRowSaving} onClick={() => handleSaveAndPublishRow(row.student._id)}>
                                    {isRowSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                    Save & Publish
                                  </Button>
                                )}
                                {hasResult && (
                                  <Button
                                    size="sm" variant={isPublished ? "outline" : "default"}
                                    className={`h-7 text-xs gap-1 ${isPublished ? "text-destructive border-destructive/30 hover:bg-destructive/5" : ""}`}
                                    disabled={isBusy}
                                    onClick={() => handlePublishResult(row.result!._id, !isPublished)}
                                  >
                                    {isBusy ? <Loader2 className="h-3 w-3 animate-spin" /> : isPublished ? <XCircle className="h-3 w-3" /> : <Send className="h-3 w-3" />}
                                    {isPublished ? "Unpublish" : "Publish"}
                                  </Button>
                                )}
                                {!hasResult && !hasMarkInput && (
                                  <span className="text-xs text-muted-foreground">Enter marks first</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* ── Edit Test Dialog ─────────────────────────────────────────── */}
        <Dialog open={editTestDialog} onOpenChange={setEditTestDialog}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Test</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Class <span className="text-destructive">*</span></Label>
                  <Select
                    value={editTestForm.classId}
                    onValueChange={(v) => {
                      setEditTestForm((f) => ({ ...f, classId: v, subjectId: "" }));
                      setEditTestSubjects([]);
                      fetchSubjectsForClass(v, setEditTestSubjects, setEditTestSubjectsLoading);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class…" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => <SelectItem key={c._id} value={c._id}>{classLabel(c)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Subject <span className="text-destructive">*</span></Label>
                  {editTestSubjectsLoading ? (
                    <div className="h-9 rounded-md border flex items-center px-3 gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    </div>
                  ) : (
                    <Select value={editTestForm.subjectId} onValueChange={(v) => setEditTestForm((f) => ({ ...f, subjectId: v }))} disabled={editTestSubjects.length === 0}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject…" />
                      </SelectTrigger>
                      <SelectContent>
                        {editTestSubjects.map((s) => <SelectItem key={s._id} value={s._id}>{s.name} ({s.code})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Title <span className="text-destructive">*</span></Label>
                <Input value={editTestForm.title} onChange={(e) => setEditTestForm((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label>Date <span className="text-destructive">*</span></Label>
                  <Input type="date" value={editTestForm.date} onChange={(e) => setEditTestForm((f) => ({ ...f, date: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Marks <span className="text-destructive">*</span></Label>
                  <Input type="number" min={1} value={editTestForm.totalMarks} onChange={(e) => setEditTestForm((f) => ({ ...f, totalMarks: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Duration (min) <span className="text-destructive">*</span></Label>
                  <Input type="number" min={1} value={editTestForm.duration} onChange={(e) => setEditTestForm((f) => ({ ...f, duration: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={2} value={editTestForm.description} onChange={(e) => setEditTestForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditTestDialog(false)} disabled={testSubmitting}>Cancel</Button>
              <Button onClick={submitEditTest} disabled={testSubmitting}>
                {testSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Delete Test Confirm ──────────────────────────────────────── */}
        <Dialog open={!!deleteTestId} onOpenChange={() => setDeleteTestId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Delete Test</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground py-2">Are you sure you want to delete this test? This cannot be undone.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTestId(null)} disabled={deletingTest}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeleteTest} disabled={deletingTest}>
                {deletingTest && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Edit Exam Dialog ─────────────────────────────────────────── */}
        <Dialog open={editExamDialog} onOpenChange={setEditExamDialog}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Exam</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Exam Title <span className="text-destructive">*</span></Label>
                  <Input value={editExamForm.title} onChange={(e) => setEditExamForm((f) => ({ ...f, title: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Exam Type <span className="text-destructive">*</span></Label>
                  <Select value={editExamForm.examType} onValueChange={(v) => setEditExamForm((f) => ({ ...f, examType: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXAM_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Class <span className="text-destructive">*</span></Label>
                  <Select
                    value={editExamForm.classId}
                    onValueChange={(v) => {
                      setEditExamForm((f) => ({ ...f, classId: v }));
                      setEditExamSubjects([]);
                      setEditSelectedSubjectIds(new Set());
                      fetchSubjectsForClass(v, setEditExamSubjects, setEditExamSubjectsLoading);
                    }}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => <SelectItem key={c._id} value={c._id}>{classLabel(c)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Start Date <span className="text-destructive">*</span></Label>
                  <Input type="date" value={editExamForm.startDate} onChange={(e) => setEditExamForm((f) => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date <span className="text-destructive">*</span></Label>
                  <Input type="date" value={editExamForm.endDate} onChange={(e) => setEditExamForm((f) => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea rows={2} value={editExamForm.description} onChange={(e) => setEditExamForm((f) => ({ ...f, description: e.target.value }))} />
              </div>
              {/* Subjects */}
              {editExamForm.classId && (
                <div className="pt-2 border-t">
                  {editExamSubjectsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading subjects…
                    </div>
                  ) : editExamSubjects.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No subjects assigned to this class.</p>
                  ) : (
                    <SubjectDetailRows
                      subjectList={editExamSubjects}
                      selectedIds={editSelectedSubjectIds}
                      details={editSubjectDetails}
                      errors={examErrors}
                      isEdit={true}
                    />
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditExamDialog(false)} disabled={examSubmitting}>Cancel</Button>
              <Button onClick={submitEditExam} disabled={examSubmitting}>
                {examSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Delete Exam Confirm ──────────────────────────────────────── */}
        <Dialog open={!!deleteExamId} onOpenChange={() => setDeleteExamId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader><DialogTitle>Delete Exam</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              Are you sure? The exam and all its subject schedules will be permanently deleted.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteExamId(null)} disabled={deletingExam}>Cancel</Button>
              <Button variant="destructive" onClick={confirmDeleteExam} disabled={deletingExam}>
                {deletingExam && <Loader2 className="h-4 w-4 animate-spin mr-2" />} Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
