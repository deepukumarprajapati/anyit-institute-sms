import { useState, useEffect, useMemo, useCallback } from "react";
import type { ElementType, ReactNode } from "react";
import {
  DollarSign, TrendingUp, CreditCard, Receipt, Users,
  Plus, Pencil, Trash2, Search, Printer, Download, X,
  AlertCircle, Settings, LayoutDashboard, FileText, Tag, Check,
  RefreshCw, ChevronRight,
} from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import api from "@/lib/api";
import { toast } from "sonner";

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface ClassDoc     { _id: string; name: string; section: string }
interface StudentDoc   { _id: string; name: string; studentId: string; class: string; section: string; rollNumber: string; isActive: boolean }
interface StructureDoc { _id: string; class: string; title: string; amount: number; frequency: string; dueDate: string; description: string; academicYear: string; isActive: boolean }
interface PaymentDoc   {
  _id: string
  student: { _id: string; name: string; studentId: string; class: string; section: string; rollNumber: string } | null
  feeStructure: { _id: string; title: string; class: string; amount: number } | null
  title: string; amount: number; paidAmount: number
  dueDate: string; paidDate: string | null
  status: "paid" | "pending" | "partial" | "overdue"
  paymentMode: "cash" | "online" | "cheque" | "dd"
  receiptNo: string | null; remarks: string
  isVirtual?: boolean
}
interface ConcessionDoc {
  _id: string
  student: { _id: string; name: string; studentId: string; class: string; section: string; rollNumber: string }
  feeStructure: { _id: string; title: string; class: string; amount: number } | null
  type: string; value: number; isPct: boolean; description: string
}
interface AnalyticsMonth { month: string; collected: number; pending: number }
interface StudentSummary  { paid: number; pending: number; total: number }

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const FREQ_OPTS  = ["monthly","quarterly","yearly","one-time"];
const MODE_OPTS  = ["cash","online","cheque","dd"] as const;
const CON_TYPES  = ["Sibling","Merit","SC/ST","Staff Ward","Custom"];
const MOS        = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const fmt    = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;
const fmtDate= (d: string | null | undefined) => d ? new Date(d).toLocaleDateString("en-IN") : "—";
const todayStr = () => new Date().toISOString().slice(0, 10);

const statusBadge = (s: string) => {
  const map: Record<string, string> = {
    paid:    "bg-success/10 text-success border-success/20",
    pending: "bg-warning/10 text-warning border-warning/20",
    partial: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    overdue: "bg-destructive/10 text-destructive border-destructive/20",
  };
  return map[s] || "";
};

// ─── SMALL SHARED COMPONENTS ─────────────────────────────────────────────────
const Modal = ({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div className={`bg-background border border-border rounded-2xl shadow-xl w-full ${wide ? "max-w-2xl" : "max-w-md"} max-h-[90vh] overflow-y-auto`}>
      <div className="flex items-center justify-between p-5 border-b border-border">
        <h3 className="text-base font-semibold font-heading">{title}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <div className="p-5">{children}</div>
    </div>
  </div>
);

const StatCard = ({ title, value, sub, icon: Icon, bg }: { title: string; value: string; sub?: string; icon: ElementType; bg: string }) => (
  <div className="glass-card overflow-hidden hover-lift">
    <div className={`${bg} p-5 text-white relative`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm font-medium opacity-90">{title}</p>
          <p className="text-3xl font-bold mt-1 font-mono-stats">{value}</p>
          {sub && <p className="text-xs opacity-75 mt-1">{sub}</p>}
        </div>
        <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center">
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  </div>
);

const LabelRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">{label}</label>
    {children}
  </div>
);

const Sel = ({ value, onChange, children, className = "" }: { value: string; onChange: (v: string) => void; children: ReactNode; className?: string }) => (
  <select value={value} onChange={e => onChange(e.target.value)}
    className={`flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${className}`}>
    {children}
  </select>
);

const Th = ({ children }: { children: ReactNode }) => (
  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 uppercase tracking-wider">{children}</th>
);

const EmptyRow = ({ cols, msg }: { cols: number; msg: string }) => (
  <tr><td colSpan={cols} className="px-4 py-10 text-center text-sm text-muted-foreground">{msg}</td></tr>
);

const Spinner = () => (
  <div className="flex justify-center py-12">
    <RefreshCw className="h-6 w-6 text-muted-foreground animate-spin" />
  </div>
);

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const Fees = () => {
  // ── Global state ────────────────────────────────────────────────────────────
  const [tab, setTab]                 = useState("dashboard");
  const [loading, setLoading]         = useState(true);
  const [classes, setClasses]         = useState<ClassDoc[]>([]);
  const [students, setStudents]       = useState<StudentDoc[]>([]);
  const [structures, setStructures]   = useState<StructureDoc[]>([]);
  const [payments, setPayments]       = useState<PaymentDoc[]>([]);
  const [analytics, setAnalytics]     = useState<AnalyticsMonth[]>([]);
  const [concessions, setConcessions] = useState<ConcessionDoc[]>([]);
  const [pendingFees, setPendingFees] = useState<PaymentDoc[]>([]);
  const [analyticsSum, setAnalyticsSum] = useState({ totalCollected: 0, totalPending: 0 });

  // ── Fee Structure tab ────────────────────────────────────────────────────────
  const [structClass, setStructClass]   = useState("");
  const [structModal, setStructModal]   = useState<{ open: boolean; editing: StructureDoc | null }>({ open: false, editing: null });
  const [structForm, setStructForm]     = useState({ title: "", amount: "", frequency: "monthly", dueDate: "", description: "", academicYear: "" });
  const [structSaving, setStructSaving] = useState(false);

  // ── Collect Fee tab ──────────────────────────────────────────────────────────
  const [collectClass, setCollectClass] = useState("all");
  const [collectStatus, setCollectStatus] = useState("all"); // all | paid | pending
  const [search, setSearch]             = useState("");
  const [selStudent, setSelStudent]     = useState<StudentDoc | null>(null);
  const [stuPayments, setStuPayments]   = useState<PaymentDoc[]>([]);
  const [stuSummary, setStuSummary]     = useState<StudentSummary>({ paid: 0, pending: 0, total: 0 });
  const [stuLoading, setStuLoading]     = useState(false);
  const [payTarget, setPayTarget]       = useState<{ type: "existing"; pay: PaymentDoc } | { type: "new"; struct: StructureDoc } | null>(null);
  const [payForm, setPayForm]           = useState({ paidAmount: "", mode: "cash" as typeof MODE_OPTS[number], date: todayStr(), remarks: "" });
  const [paying, setPaying]             = useState(false);
  const [receiptDoc, setReceiptDoc]     = useState<PaymentDoc | null>(null);

  // ── Reports tab ──────────────────────────────────────────────────────────────
  const [rptTab, setRptTab]       = useState("daybook");
  const [rptDate, setRptDate]     = useState(new Date().toISOString().slice(0, 10));
  const [rptClass, setRptClass]   = useState("");
  const [rptStudent, setRptStudent] = useState("");
  const [ledgerPays, setLedgerPays] = useState<PaymentDoc[]>([]);
  const [ledgerSum, setLedgerSum]   = useState<StudentSummary>({ paid: 0, pending: 0, total: 0 });
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // ── Concessions tab ──────────────────────────────────────────────────────────
  const [conModal, setConModal]   = useState<{ open: boolean; editing: ConcessionDoc | null }>({ open: false, editing: null });
  const [conForm, setConForm]     = useState({ studentId: "", feeStructureId: "", type: "Custom", value: "", isPct: true, description: "" });
  const [conSaving, setConSaving] = useState(false);

  // ── LOAD ALL DATA ────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [clsR, stuR, strR, payR, anaR, conR, pendR] = await Promise.all([
        api.get("/admin/classes"),
        api.get("/admin/students"),
        api.get("/fees/structure"),
        api.get("/fees/all"),
        api.get("/fees/analytics"),
        api.get("/fees/concessions"),
        api.get("/fees/pending"),
      ]);
      const cls = clsR.data.data || [];
      setClasses(cls);
      setStructClass(cls[0]?.name || "");
      setStudents(stuR.data.data || []);
      setStructures(strR.data.data || []);
      setPayments(payR.data.data || []);
      setAnalytics(anaR.data.data || []);
      setAnalyticsSum(anaR.data.summary || { totalCollected: 0, totalPending: 0 });
      setConcessions(conR.data.data || []);
      setPendingFees(pendR.data.data || []);
      if ((stuR.data.data || []).length > 0) setRptStudent((stuR.data.data[0] as StudentDoc)._id);
      if (cls.length > 0) setRptClass(cls[0].name);
    } catch {
      toast.error("Failed to load fee data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── DASHBOARD COMPUTED ───────────────────────────────────────────────────────
  const dash = useMemo(() => {
    const curMonth = MOS[new Date().getMonth()];
    const thisMonthData = analytics.find(a => a.month === curMonth);
    const defaulterIds  = new Set(pendingFees.map(p => p.student?._id).filter(Boolean));

    const classWise = classes.map(cls => ({
      class: cls.name.length > 8 ? cls.name.slice(0, 8) : cls.name,
      collected: payments.filter(p => p.status === "paid" && p.student?.class === cls.name)
        .reduce((s, p) => s + p.paidAmount, 0),
    }));

    return {
      totalYear:       analyticsSum.totalCollected,
      thisMonth:       thisMonthData?.collected || 0,
      totalPending:    analyticsSum.totalPending,
      defaulterCount:  defaulterIds.size,
      classWise,
    };
  }, [analytics, analyticsSum, payments, pendingFees, classes]);

  // ── FEE STRUCTURE HANDLERS ───────────────────────────────────────────────────
  const openAddStruct  = () => {
    setStructForm({ title: "", amount: "", frequency: "monthly", dueDate: "", description: "", academicYear: "" });
    setStructModal({ open: true, editing: null });
  };
  const openEditStruct = (s: StructureDoc) => {
    setStructForm({ title: s.title, amount: String(s.amount), frequency: s.frequency, dueDate: s.dueDate?.slice(0, 10) || "", description: s.description, academicYear: s.academicYear });
    setStructModal({ open: true, editing: s });
  };
  const saveStruct = async () => {
    const needsDueDate = structForm.frequency === "yearly" || structForm.frequency === "one-time";
    if (!structClass) {
      toast.error("Please select a class");
      return;
    }
    if (!structForm.title.trim() || !structForm.amount) {
      toast.error("Title and amount are required");
      return;
    }
    if (needsDueDate && !structForm.dueDate) {
      toast.error("Due date is required for yearly / one-time fees");
      return;
    }
    // For monthly/quarterly, auto-set dueDate to end of current month
    const resolvedDueDate = structForm.dueDate || (() => {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + 1); d.setDate(0);
      return d.toISOString().slice(0, 10);
    })();
    setStructSaving(true);
    try {
      const body = { class: structClass, title: structForm.title.trim(), amount: +structForm.amount, dueDate: resolvedDueDate, frequency: structForm.frequency, description: structForm.description, academicYear: structForm.academicYear };
      if (structModal.editing) {
        const r = await api.put(`/fees/structure/${structModal.editing._id}`, body);
        setStructures(p => p.map(s => s._id === structModal.editing!._id ? r.data.data : s));
        toast.success("Fee structure updated");
      } else {
        const r = await api.post("/fees/structure", body);
        setStructures(p => [r.data.data, ...p]);
        toast.success("Fee structure created");
      }
      setStructModal({ open: false, editing: null });
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed to save"); }
    finally { setStructSaving(false); }
  };
  const deleteStruct = async (id: string) => {
    if (!confirm("Delete this fee structure?")) return;
    try {
      await api.delete(`/fees/structure/${id}`);
      setStructures(p => p.filter(s => s._id !== id));
      toast.success("Fee structure deleted");
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed to delete"); }
  };

  // ── CLASS-WISE FEE STATUS ────────────────────────────────────────────────────
  const classWiseStudents = useMemo(() => {
    const filtered = collectClass === "all"
      ? students
      : students.filter(s => s.class === collectClass);

    return filtered.map(s => {
      const stuPays = payments.filter(p => p.student?._id === s._id);
      const hasPaid = stuPays.some(p => p.status === "paid");
      const totalPaid = stuPays.filter(p => p.status === "paid").reduce((sum, p) => sum + p.paidAmount, 0);
      const totalPending = stuPays.filter(p => p.status !== "paid").reduce((sum, p) => sum + (p.amount - p.paidAmount), 0);
      const classStructures = structures.filter(st => st.class === s.class);
      const totalDue = classStructures.reduce((sum, st) => sum + st.amount, 0);
      const status = totalPending > 0 || (totalDue > 0 && totalPaid === 0) ? "pending" : totalPaid > 0 ? "paid" : "no-structure";
      return { ...s, hasPaid, totalPaid, totalPending, totalDue, status };
    }).filter(s => {
      if (collectStatus === "paid") return s.status === "paid";
      if (collectStatus === "pending") return s.status === "pending";
      return s.status !== "no-structure" || collectClass !== "all";
    });
  }, [students, payments, structures, collectClass, collectStatus]);

  const classWiseStats = useMemo(() => {
    const list = collectClass === "all"
      ? students
      : students.filter(s => s.class === collectClass);
    const withStructure = list.filter(s => structures.some(st => st.class === s.class));
    const paidCount = withStructure.filter(s => payments.some(p => p.student?._id === s._id && p.status === "paid")).length;
    const pendingCount = withStructure.length - paidCount;
    const totalCollected = payments.filter(p => {
      if (collectClass !== "all" && p.student?.class !== collectClass) return false;
      return p.status === "paid";
    }).reduce((sum, p) => sum + p.paidAmount, 0);
    const totalPending = payments.filter(p => {
      if (collectClass !== "all" && p.student?.class !== collectClass) return false;
      return p.status !== "paid";
    }).reduce((sum, p) => sum + (p.amount - p.paidAmount), 0);
    return { paidCount, pendingCount, totalStudents: withStructure.length, totalCollected, totalPending };
  }, [students, payments, structures, collectClass]);

  // ── COLLECT FEE HANDLERS ─────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (search.length < 2) return [];
    const q = search.toLowerCase();
    return students.filter(s =>
      s.name.toLowerCase().includes(q) || s.studentId?.toLowerCase().includes(q) ||
      s.rollNumber?.toLowerCase().includes(q) || s.class?.toLowerCase().includes(q)
    ).slice(0, 8);
  }, [search, students]);

  const loadStudentFees = async (stu: StudentDoc) => {
    setStuLoading(true);
    try {
      const r = await api.get(`/fees/student/${stu._id}`);
      setStuPayments(r.data.data.fees || []);
      setStuSummary(r.data.data.summary || { paid: 0, pending: 0, total: 0 });
    } catch { toast.error("Failed to load student fees"); }
    finally { setStuLoading(false); }
  };

  const selectStudent = (stu: StudentDoc) => {
    setSelStudent(stu);
    setSearch("");
    setPayTarget(null);
    loadStudentFees(stu);
  };

  // Net amount after concession for a structure + student
  const netForStruct = (struct: StructureDoc, stuId: string) => {
    const c = concessions.find(x => x.student?._id === stuId && x.feeStructure?._id === struct._id);
    if (!c) return struct.amount;
    return c.isPct ? struct.amount * (1 - c.value / 100) : Math.max(0, struct.amount - c.value);
  };

  const submitPayment = async () => {
    if (!selStudent || !payTarget || !payForm.paidAmount) return;
    if (+payForm.paidAmount <= 0) { toast.error("Enter a valid amount"); return; }
    setPaying(true);
    try {
      let res;
      if (payTarget.type === "existing") {
        const pay = payTarget.pay;
        const newPaid  = (pay.paidAmount || 0) + +payForm.paidAmount;
        const newStatus= newPaid >= pay.amount ? "paid" : "partial";
        res = await api.put(`/fees/${pay._id}`, {
          status: newStatus, paidAmount: newPaid,
          paymentMode: payForm.mode, remarks: payForm.remarks,
        });
      } else {
        const struct = payTarget.struct;
        const net    = netForStruct(struct, selStudent._id);
        const paid   = +payForm.paidAmount;
        const status = paid >= net ? "paid" : paid > 0 ? "partial" : "pending";
        res = await api.post("/fees/collect", {
          student: selStudent._id, title: struct.title,
          amount: net, paidAmount: paid,
          dueDate: struct.dueDate, paymentMode: payForm.mode,
          remarks: payForm.remarks, feeStructure: struct._id,
          status,
        });
      }
      const updated: PaymentDoc = res.data.data;
      setPayTarget(null);
      setPayForm({ paidAmount: "", mode: "cash", date: todayStr(), remarks: "" });
      toast.success("Payment recorded");
      // refresh student fees
      await loadStudentFees(selStudent);
      // refresh global payments
      const r2 = await api.get("/fees/all");
      setPayments(r2.data.data || []);
      const r3 = await api.get("/fees/pending");
      setPendingFees(r3.data.data || []);
      if (updated.status === "paid" && updated.receiptNo) setReceiptDoc(updated);
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed to record payment"); }
    finally { setPaying(false); }
  };

  // ── REPORT: STUDENT LEDGER ────────────────────────────────────────────────────
  useEffect(() => {
    if (!rptStudent || rptTab !== "ledger") return;
    setLedgerLoading(true);
    api.get(`/fees/student/${rptStudent}`)
      .then(r => { setLedgerPays(r.data.data.fees || []); setLedgerSum(r.data.data.summary || {}); })
      .catch(() => toast.error("Failed to load ledger"))
      .finally(() => setLedgerLoading(false));
  }, [rptStudent, rptTab]);

  // ── CONCESSION HANDLERS ───────────────────────────────────────────────────────
  const openAddCon = () => {
    setConForm({ studentId: students[0]?._id || "", feeStructureId: "", type: "Custom", value: "", isPct: true, description: "" });
    setConModal({ open: true, editing: null });
  };
  const openEditCon = (c: ConcessionDoc) => {
    setConForm({ studentId: c.student?._id || "", feeStructureId: c.feeStructure?._id || "", type: c.type, value: String(c.value), isPct: c.isPct, description: c.description });
    setConModal({ open: true, editing: c });
  };
  const saveCon = async () => {
    if (!conForm.studentId || !conForm.value) { toast.error("Student and value required"); return; }
    setConSaving(true);
    try {
      const body = { student: conForm.studentId, feeStructure: conForm.feeStructureId || null, type: conForm.type, value: +conForm.value, isPct: conForm.isPct, description: conForm.description };
      if (conModal.editing) {
        const r = await api.put(`/fees/concessions/${conModal.editing._id}`, body);
        setConcessions(p => p.map(c => c._id === conModal.editing!._id ? r.data.data : c));
        toast.success("Concession updated");
      } else {
        const r = await api.post("/fees/concessions", body);
        setConcessions(p => [r.data.data, ...p]);
        toast.success("Concession added");
      }
      setConModal({ open: false, editing: null });
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed to save"); }
    finally { setConSaving(false); }
  };
  const deleteCon = async (id: string) => {
    if (!confirm("Remove this concession?")) return;
    try {
      await api.delete(`/fees/concessions/${id}`);
      setConcessions(p => p.filter(c => c._id !== id));
      toast.success("Concession removed");
    } catch (e: any) { toast.error(e.response?.data?.message || "Failed"); }
  };

  // ── CSV EXPORT ────────────────────────────────────────────────────────────────
  const exportCSV = (rows: (string | number)[][], filename: string) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([rows.map(r => r.map(v => `"${v}"`).join(",")).join("\n")], { type: "text/csv" }));
    a.download = filename; a.click();
  };

  // ── TAB CONFIG ────────────────────────────────────────────────────────────────
  const TABS = [
    { id: "dashboard", label: "Dashboard",     icon: LayoutDashboard },
    { id: "structure", label: "Fee Structure", icon: Settings },
    { id: "collect",   label: "Collect Fee",   icon: CreditCard },
    { id: "reports",   label: "Reports",       icon: FileText },
    { id: "settings",  label: "Concessions",   icon: Tag },
  ];

  const ttip = { contentStyle: { background: "hsl(var(--background))", border: "1px solid hsl(var(--border))", borderRadius: 12 } };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 text-primary animate-spin" />
      </div>
    </DashboardLayout>
  );

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading">Fee Management</h1>
            <p className="text-sm text-muted-foreground mt-1">Class-wise fee structure, collection &amp; reports</p>
          </div>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={loadAll}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1 p-1 bg-secondary rounded-xl w-fit flex-wrap">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t.id ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <t.icon className="h-4 w-4" />{t.label}
            </button>
          ))}
        </div>

        {/* ─── DASHBOARD ─── */}
        {tab === "dashboard" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard title="Total Collected (Year)" value={fmt(dash.totalYear)}      sub={`FY ${new Date().getFullYear()}`}  icon={DollarSign}  bg="gradient-orange" />
              <StatCard title="This Month"             value={fmt(dash.thisMonth)}       sub={MOS[new Date().getMonth()]}        icon={TrendingUp}   bg="gradient-cyan"   />
              <StatCard title="Pending Dues"           value={fmt(dash.totalPending)}    sub="Across all students"               icon={AlertCircle}  bg="gradient-blue"   />
              <StatCard title="Defaulters"             value={String(dash.defaulterCount)} sub="Students with due balance"       icon={Users}        bg="gradient-warm"   />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="glass-card">
                <div className="p-4 border-b border-border"><h3 className="text-base font-semibold font-heading">Monthly Collection Trend</h3></div>
                <div className="p-4">
                  {analytics.every(a => a.collected === 0 && a.pending === 0) ? (
                    <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={analytics}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={v => `₹${v / 1000}k`} />
                        <Tooltip formatter={(v: number) => fmt(v)} {...ttip} />
                        <Bar dataKey="collected" fill="#FF9A5A" radius={[6,6,0,0]} name="Collected" />
                        <Bar dataKey="pending"   fill="#33C6E7" radius={[6,6,0,0]} name="Pending"   />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="glass-card">
                <div className="p-4 border-b border-border"><h3 className="text-base font-semibold font-heading">Class-wise Collection</h3></div>
                <div className="p-4">
                  {dash.classWise.every(c => c.collected === 0) ? (
                    <div className="h-[220px] flex items-center justify-center text-sm text-muted-foreground">No data yet</div>
                  ) : (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={dash.classWise}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="class" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} />
                        <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={v => `₹${v / 1000}k`} />
                        <Tooltip formatter={(v: number) => fmt(v)} {...ttip} />
                        <Bar dataKey="collected" fill="#a78bfa" radius={[6,6,0,0]} name="Collected" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* Defaulters / Pending */}
            <div className="glass-card">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h3 className="text-base font-semibold font-heading">Pending / Defaulter List</h3>
                <Badge variant="secondary" className="bg-destructive/10 text-destructive border-destructive/20">{pendingFees.length} records</Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-border bg-secondary">
                    {["Student","Class","Title","Due Date","Amount","Balance","Action"].map(h => <Th key={h}>{h}</Th>)}
                  </tr></thead>
                  <tbody>
                    {pendingFees.length === 0 && <EmptyRow cols={7} msg="No pending dues" />}
                    {pendingFees.map(p => (
                      <tr key={p._id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{p.student?.name || "—"}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{p.student?.class}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{p.title}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{fmtDate(p.dueDate)}</td>
                        <td className="px-4 py-3 text-sm font-mono-stats">{fmt(p.amount)}</td>
                        <td className="px-4 py-3 text-sm font-mono-stats font-semibold text-destructive">{fmt(p.amount - p.paidAmount)}</td>
                        <td className="px-4 py-3">
                          {p.student && (
                            <Button size="sm" variant="ghost" className="text-primary text-xs h-7 hover:bg-primary/10 gap-1"
                              onClick={() => { const stu = students.find(s => s._id === p.student!._id); if (stu) { selectStudent(stu); setTab("collect"); } }}>
                              <ChevronRight className="h-3 w-3" /> Collect
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ─── FEE STRUCTURE ─── */}
        {tab === "structure" && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex gap-2 flex-wrap">
                {classes.map(c => (
                  <button key={c._id} onClick={() => setStructClass(c.name)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${structClass === c.name ? "btn-gradient text-white border-transparent" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>
                    {c.name}{c.section ? `-${c.section}` : ""}
                  </button>
                ))}
              </div>
              <Button size="sm" className="btn-gradient border-0 gap-1.5 ml-auto" onClick={openAddStruct}>
                <Plus className="h-4 w-4" /> Add Fee Head
              </Button>
            </div>

            <div className="glass-card">
              <div className="p-4 border-b border-border">
                <h3 className="text-base font-semibold font-heading">
                  {structClass || "Select a class"} — Fee Heads
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-border bg-secondary">
                    {["Title","Amount","Frequency","Due Date","Academic Year","Actions"].map(h => <Th key={h}>{h}</Th>)}
                  </tr></thead>
                  <tbody>
                    {structures.filter(s => s.class === structClass).length === 0 && (
                      <EmptyRow cols={6} msg={structClass ? "No fee heads for this class. Click 'Add Fee Head' to create one." : "Select a class first."} />
                    )}
                    {structures.filter(s => s.class === structClass).map(s => (
                      <tr key={s._id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                        <td className="px-4 py-3 text-sm font-medium">{s.title}</td>
                        <td className="px-4 py-3 text-sm font-mono-stats text-primary font-semibold">{fmt(s.amount)}</td>
                        <td className="px-4 py-3"><Badge variant="secondary" className="text-xs capitalize">{s.frequency}</Badge></td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{fmtDate(s.dueDate)}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{s.academicYear || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => openEditStruct(s)}><Pencil className="h-3.5 w-3.5" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteStruct(s._id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {structures.filter(s => s.class === structClass).length > 0 && (
                <div className="p-4 border-t border-border text-right text-sm">
                  <span className="text-muted-foreground">Total structures: </span>
                  <span className="font-semibold font-mono-stats">{structures.filter(s => s.class === structClass).length}</span>
                  <span className="mx-3 text-muted-foreground/40">|</span>
                  <span className="text-muted-foreground">Sum of amounts: </span>
                  <span className="font-semibold font-mono-stats text-primary">{fmt(structures.filter(s => s.class === structClass).reduce((sum, s) => sum + s.amount, 0))}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── COLLECT FEE ─── */}
        {tab === "collect" && (
          <div className="space-y-4">

            {/* Class-wise stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="glass-card overflow-hidden"><div className="gradient-green p-4 text-white relative"><div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" /><div className="relative"><p className="text-xs font-medium opacity-90">Paid Students</p><p className="text-2xl font-bold mt-0.5 font-mono-stats">{classWiseStats.paidCount}</p><p className="text-xs opacity-80">of {classWiseStats.totalStudents}</p></div></div></div>
              <div className="glass-card overflow-hidden"><div className="gradient-orange p-4 text-white relative"><div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" /><div className="relative"><p className="text-xs font-medium opacity-90">Pending Students</p><p className="text-2xl font-bold mt-0.5 font-mono-stats">{classWiseStats.pendingCount}</p><p className="text-xs opacity-80">defaulters</p></div></div></div>
              <div className="glass-card overflow-hidden"><div className="gradient-blue p-4 text-white relative"><div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" /><div className="relative"><p className="text-xs font-medium opacity-90">Total Collected</p><p className="text-xl font-bold mt-0.5 font-mono-stats">{fmt(classWiseStats.totalCollected)}</p></div></div></div>
              <div className="glass-card overflow-hidden"><div className="gradient-cyan p-4 text-white relative"><div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" /><div className="relative"><p className="text-xs font-medium opacity-90">Total Pending</p><p className="text-xl font-bold mt-0.5 font-mono-stats">{fmt(classWiseStats.totalPending)}</p></div></div></div>
            </div>

            {/* Class-wise student overview */}
            <div className="glass-card">
              <div className="p-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
                <h3 className="text-base font-semibold font-heading flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" /> Class-wise Fee Status
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <Sel value={collectClass} onChange={v => { setCollectClass(v); setSelStudent(null); }} className="w-36 h-9 text-sm">
                    <option value="all">All Classes</option>
                    {classes.map(c => <option key={c._id} value={c.name}>Class {c.name}{c.section ? `-${c.section}` : ""}</option>)}
                  </Sel>
                  <Sel value={collectStatus} onChange={setCollectStatus} className="w-32 h-9 text-sm">
                    <option value="all">All Status</option>
                    <option value="paid">Paid Only</option>
                    <option value="pending">Pending Only</option>
                  </Sel>
                </div>
              </div>
              <div className="overflow-x-auto">
                {classWiseStudents.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    {collectClass === "all" ? "Select a class to view students." : "No students found for this filter."}
                  </div>
                ) : (
                  <table className="w-full">
                    <thead><tr className="border-b border-border bg-secondary/50">
                      {["Student","Class","Student ID","Total Due","Paid","Pending","Status","Action"].map(h => <Th key={h}>{h}</Th>)}
                    </tr></thead>
                    <tbody>
                      {classWiseStudents.map(s => (
                        <tr key={s._id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full btn-gradient flex items-center justify-center text-white text-xs font-bold shrink-0">{s.name[0]}</div>
                              <span className="text-sm font-medium text-foreground">{s.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{s.class}{s.section ? `-${s.section}` : ""}</td>
                          <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{s.studentId}</td>
                          <td className="px-4 py-3 text-sm font-mono-stats font-semibold">{fmt(s.totalDue)}</td>
                          <td className="px-4 py-3 text-sm font-mono-stats text-success">{s.totalPaid > 0 ? fmt(s.totalPaid) : "—"}</td>
                          <td className="px-4 py-3 text-sm font-mono-stats text-destructive">{s.totalPending > 0 ? fmt(s.totalPending) : "—"}</td>
                          <td className="px-4 py-3">
                            <Badge className={s.status === "paid" ? "bg-success/10 text-success border-0" : s.status === "pending" ? "bg-warning/10 text-warning border-0" : "bg-secondary text-muted-foreground border-0"}>
                              {s.status === "paid" ? "Paid" : s.status === "pending" ? "Pending" : "No Fee"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            {s.status !== "no-structure" && (
                              <Button size="sm" className="btn-gradient border-0 text-xs h-7 px-3"
                                onClick={() => { const { hasPaid, totalPaid, totalPending, totalDue, status: _st, ...stuDoc } = s; selectStudent(stuDoc as StudentDoc); setSearch(""); }}>
                                {s.status === "pending" ? "Collect" : "View"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="relative"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div><div className="relative flex justify-center"><span className="bg-background px-3 text-xs text-muted-foreground">OR SEARCH INDIVIDUAL STUDENT</span></div></div>

            <div className="glass-card p-4">
              <LabelRow label="Search Student (name, student ID or roll no.)">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Type at least 2 characters…" value={search}
                    onChange={e => { setSearch(e.target.value); if (selStudent) setSelStudent(null); }} />
                </div>
                {searchResults.length > 0 && !selStudent && (
                  <div className="mt-1 border border-border rounded-lg bg-background shadow-lg overflow-hidden z-10 relative">
                    {searchResults.map(s => (
                      <button key={s._id} className="w-full text-left px-3 py-2.5 text-sm hover:bg-secondary transition-colors border-b border-border/50 last:border-0"
                        onClick={() => selectStudent(s)}>
                        <span className="font-medium">{s.name}</span>
                        <span className="text-muted-foreground ml-2 text-xs">{s.class}{s.section ? `-${s.section}` : ""} · {s.studentId} · Roll {s.rollNumber}</span>
                      </button>
                    ))}
                  </div>
                )}
              </LabelRow>
            </div>

            {selStudent && (
              <div className="space-y-4">
                {/* Student card */}
                <div className="glass-card p-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full btn-gradient flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {selStudent.name[0]}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{selStudent.name}</p>
                      <p className="text-sm text-muted-foreground">{selStudent.class}{selStudent.section ? `-${selStudent.section}` : ""} · ID: {selStudent.studentId} · Roll: {selStudent.rollNumber}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Total Paid</p>
                      <p className="font-bold font-mono-stats text-success">{fmt(stuSummary.paid)}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground">Balance</p>
                      <p className="font-bold font-mono-stats text-destructive">{fmt(stuSummary.pending)}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => { setSelStudent(null); setPayTarget(null); setStuPayments([]); }}><X className="h-4 w-4" /></Button>
                  </div>
                </div>

                {stuLoading ? <Spinner /> : (
                  <>
                    {/* Existing pending/partial dues */}
                    {stuPayments.filter(p => ["pending","partial","overdue"].includes(p.status)).length > 0 && (
                      <div className="glass-card">
                        <div className="p-4 border-b border-border"><h3 className="text-base font-semibold font-heading">Pending / Partial Dues</h3></div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead><tr className="border-b border-border bg-secondary">
                              {["Title","Total","Paid","Balance","Due Date","Status","Action"].map(h => <Th key={h}>{h}</Th>)}
                            </tr></thead>
                            <tbody>
                              {stuPayments.filter(p => !p.isVirtual && ["pending","partial","overdue"].includes(p.status)).map(p => (
                                <tr key={p._id} className="border-b border-border/50">
                                  <td className="px-4 py-3 text-sm font-medium">{p.title}</td>
                                  <td className="px-4 py-3 text-sm font-mono-stats">{fmt(p.amount)}</td>
                                  <td className="px-4 py-3 text-sm font-mono-stats text-success">{p.paidAmount > 0 ? fmt(p.paidAmount) : "—"}</td>
                                  <td className="px-4 py-3 text-sm font-mono-stats font-semibold text-destructive">{fmt(p.amount - p.paidAmount)}</td>
                                  <td className="px-4 py-3 text-sm text-muted-foreground">{fmtDate(p.dueDate)}</td>
                                  <td className="px-4 py-3"><Badge variant="secondary" className={`text-xs capitalize ${statusBadge(p.status)}`}>{p.status}</Badge></td>
                                  <td className="px-4 py-3">
                                    <Button size="sm" className="btn-gradient border-0 text-xs h-7"
                                      onClick={() => { setPayTarget({ type: "existing", pay: p }); setPayForm(f => ({ ...f, paidAmount: String(p.amount - p.paidAmount) })); }}>
                                      Collect
                                    </Button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Fee structures to create new invoices */}
                    {structures.filter(s => s.class === selStudent.class).length > 0 && (
                      <div className="glass-card">
                        <div className="p-4 border-b border-border"><h3 className="text-base font-semibold font-heading">Create New Invoice from Fee Structure</h3></div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead><tr className="border-b border-border bg-secondary">
                              {["Fee Head","Gross","Concession","Net Amount","Frequency","Action"].map(h => <Th key={h}>{h}</Th>)}
                            </tr></thead>
                            <tbody>
                              {structures.filter(s => s.class === selStudent.class).map(s => {
                                const con = concessions.find(x => x.student?._id === selStudent._id && x.feeStructure?._id === s._id);
                                const net = netForStruct(s, selStudent._id);
                                const disc= s.amount - net;
                                return (
                                  <tr key={s._id} className="border-b border-border/50">
                                    <td className="px-4 py-3 text-sm font-medium">{s.title}</td>
                                    <td className="px-4 py-3 text-sm font-mono-stats">{fmt(s.amount)}</td>
                                    <td className="px-4 py-3 text-sm font-mono-stats text-success">{disc > 0 ? `-${fmt(disc)}` : "—"}{con ? <span className="text-xs text-muted-foreground ml-1">({con.type})</span> : null}</td>
                                    <td className="px-4 py-3 text-sm font-mono-stats font-semibold text-primary">{fmt(net)}</td>
                                    <td className="px-4 py-3"><Badge variant="secondary" className="text-xs capitalize">{s.frequency}</Badge></td>
                                    <td className="px-4 py-3">
                                      <Button size="sm" variant="outline" className="text-xs h-7 gap-1 hover:btn-gradient hover:text-white hover:border-transparent"
                                        onClick={() => { setPayTarget({ type: "new", struct: s }); setPayForm(f => ({ ...f, paidAmount: String(net) })); }}>
                                        <Plus className="h-3 w-3" /> Invoice
                                      </Button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* Paid history */}
                    {stuPayments.filter(p => p.status === "paid").length > 0 && (
                      <div className="glass-card">
                        <div className="p-4 border-b border-border"><h3 className="text-base font-semibold font-heading">Payment History</h3></div>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead><tr className="border-b border-border bg-secondary">
                              {["Receipt No","Title","Amount","Mode","Date","Action"].map(h => <Th key={h}>{h}</Th>)}
                            </tr></thead>
                            <tbody>
                              {stuPayments.filter(p => p.status === "paid").map(p => (
                                <tr key={p._id} className="border-b border-border/50">
                                  <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{p.receiptNo || "—"}</td>
                                  <td className="px-4 py-3 text-sm">{p.title}</td>
                                  <td className="px-4 py-3 text-sm font-mono-stats text-success font-semibold">{fmt(p.paidAmount)}</td>
                                  <td className="px-4 py-3"><Badge variant="secondary" className="text-xs capitalize">{p.paymentMode}</Badge></td>
                                  <td className="px-4 py-3 text-sm text-muted-foreground">{fmtDate(p.paidDate)}</td>
                                  <td className="px-4 py-3">
                                    {p.receiptNo && (
                                      <Button size="sm" variant="ghost" className="text-xs h-7 gap-1 text-muted-foreground" onClick={() => setReceiptDoc(p)}>
                                        <Receipt className="h-3 w-3" /> Receipt
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Payment form */}
                {payTarget && (
                  <div className="glass-card p-5">
                    <h3 className="text-base font-semibold font-heading mb-4">
                      {payTarget.type === "existing" ? `Collect — ${payTarget.pay.title}` : `New Invoice — ${payTarget.struct.title}`}
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <LabelRow label="Amount Paying (₹)">
                        <Input type="number" value={payForm.paidAmount} onChange={e => setPayForm(f => ({ ...f, paidAmount: e.target.value }))} placeholder="0" />
                      </LabelRow>
                      <LabelRow label="Payment Mode">
                        <Sel value={payForm.mode} onChange={v => setPayForm(f => ({ ...f, mode: v as typeof MODE_OPTS[number] }))}>
                          {MODE_OPTS.map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
                        </Sel>
                      </LabelRow>
                      <LabelRow label="Remarks (optional)">
                        <Input value={payForm.remarks} onChange={e => setPayForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Cheque no., reference…" />
                      </LabelRow>
                    </div>
                    <div className="flex gap-3 mt-4">
                      <Button className="btn-gradient border-0 gap-1.5" onClick={submitPayment} disabled={paying}>
                        {paying ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        Confirm &amp; Record
                      </Button>
                      <Button variant="outline" onClick={() => setPayTarget(null)}>Cancel</Button>
                    </div>
                  </div>
                )}

                {!stuLoading && stuPayments.length === 0 && !payTarget && (
                  <div className="glass-card p-8 text-center text-sm text-muted-foreground">No fee records found for this student.</div>
                )}
              </div>
            )}

            {!selStudent && (
              <div className="glass-card p-12 text-center">
                <Search className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">Search for a student above to view their dues and collect fees</p>
              </div>
            )}
          </div>
        )}

        {/* ─── REPORTS ─── */}
        {tab === "reports" && (
          <div className="space-y-4">
            <div className="flex gap-1 p-1 bg-secondary rounded-xl w-fit flex-wrap">
              {[{ id:"daybook",label:"Day Book" },{ id:"class",label:"Class Report" },{ id:"defaulters",label:"Defaulters" },{ id:"ledger",label:"Student Ledger" }].map(t => (
                <button key={t.id} onClick={() => setRptTab(t.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${rptTab === t.id ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Day Book */}
            {rptTab === "daybook" && (() => {
              const rows = payments.filter(p => p.paidDate?.slice(0, 10) === rptDate || p.createdAt?.slice(0, 10) === rptDate);
              return (
                <div className="glass-card">
                  <div className="p-4 border-b border-border flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <h3 className="text-base font-semibold font-heading">Day Book</h3>
                      <Input type="date" value={rptDate} onChange={e => setRptDate(e.target.value)} className="w-40" />
                    </div>
                    <Button size="sm" variant="outline" className="gap-1.5"
                      onClick={() => exportCSV(
                        [["Receipt","Student","Class","Title","Amount","Mode","Date"],
                         ...payments.filter(p => p.status === "paid" && (p.paidDate?.slice(0, 10) === rptDate)).map(p =>
                          [p.receiptNo || "", p.student?.name || "", p.student?.class || "", p.title, p.paidAmount, p.paymentMode, fmtDate(p.paidDate)])],
                        `daybook-${rptDate}.csv`)}>
                      <Download className="h-3.5 w-3.5" /> Export CSV
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead><tr className="border-b border-border bg-secondary">
                        {["Receipt No","Student","Class","Title","Amount","Mode","Status"].map(h => <Th key={h}>{h}</Th>)}
                      </tr></thead>
                      <tbody>
                        {rows.length === 0 && <EmptyRow cols={7} msg={`No transactions on ${rptDate}`} />}
                        {rows.map(p => (
                          <tr key={p._id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                            <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{p.receiptNo || "—"}</td>
                            <td className="px-4 py-3 text-sm font-medium">{p.student?.name || "—"}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{p.student?.class}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{p.title}</td>
                            <td className="px-4 py-3 text-sm font-mono-stats font-semibold text-success">{fmt(p.paidAmount)}</td>
                            <td className="px-4 py-3"><Badge variant="secondary" className="text-xs capitalize">{p.paymentMode}</Badge></td>
                            <td className="px-4 py-3"><Badge variant="secondary" className={`text-xs capitalize ${statusBadge(p.status)}`}>{p.status}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {rows.length > 0 && (
                    <div className="p-4 border-t border-border flex justify-end gap-6 text-sm">
                      <span className="text-muted-foreground">Transactions: <span className="font-semibold">{rows.length}</span></span>
                      <span className="text-muted-foreground">Total Collected: <span className="font-bold font-mono-stats text-success">{fmt(rows.filter(p => p.status === "paid").reduce((s, p) => s + p.paidAmount, 0))}</span></span>
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Class Report */}
            {rptTab === "class" && (
              <div className="glass-card">
                <div className="p-4 border-b border-border flex items-center gap-3 flex-wrap">
                  <h3 className="text-base font-semibold font-heading">Class Report</h3>
                  <Sel value={rptClass} onChange={setRptClass} className="w-40">
                    {classes.map(c => <option key={c._id} value={c.name}>{c.name}{c.section ? `-${c.section}` : ""}</option>)}
                  </Sel>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-border bg-secondary">
                      {["Student","Roll No","Total Invoiced","Total Paid","Balance","Status"].map(h => <Th key={h}>{h}</Th>)}
                    </tr></thead>
                    <tbody>
                      {students.filter(s => s.class === rptClass).map(st => {
                        const sp = payments.filter(p => p.student?._id === st._id);
                        const classStructures = structures.filter(s => s.class === rptClass && s.isActive);
                        // If no payment records exist, use fee structures to compute what's owed
                        const invoiced = sp.length > 0
                          ? sp.reduce((sum, p) => sum + p.amount, 0)
                          : classStructures.reduce((sum, fs) => sum + fs.amount, 0);
                        const paid    = sp.filter(p => p.status === "paid").reduce((sum, p) => sum + p.paidAmount, 0);
                        const balance = invoiced - paid;
                        const hasFeeObligation = classStructures.length > 0;
                        const isClear   = paid > 0 && balance === 0;
                        const isPending = hasFeeObligation && balance > 0;
                        return (
                          <tr key={st._id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                            <td className="px-4 py-3 text-sm font-medium">{st.name}</td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">{st.rollNumber || "—"}</td>
                            <td className="px-4 py-3 text-sm font-mono-stats">{invoiced > 0 ? fmt(invoiced) : "—"}</td>
                            <td className="px-4 py-3 text-sm font-mono-stats text-success">{paid > 0 ? fmt(paid) : "—"}</td>
                            <td className="px-4 py-3 text-sm font-mono-stats font-semibold text-destructive">
                              {balance > 0 ? fmt(balance) : isClear ? <span className="text-success text-xs">✓ Clear</span> : "—"}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="secondary" className={`text-xs ${isClear ? "bg-success/10 text-success border-success/20" : isPending ? "bg-warning/10 text-warning border-warning/20" : "text-muted-foreground"}`}>
                                {isClear ? "Clear" : isPending ? "Pending" : "No Records"}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                      {students.filter(s => s.class === rptClass).length === 0 && <EmptyRow cols={6} msg="No students in this class" />}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Defaulters */}
            {rptTab === "defaulters" && (
              <div className="glass-card">
                <div className="p-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-base font-semibold font-heading">Defaulter Report</h3>
                  <Button size="sm" variant="outline" className="gap-1.5"
                    onClick={() => exportCSV([["Student","Class","Title","Amount","Balance","Due Date"],
                      ...pendingFees.map(p => [p.student?.name || "", p.student?.class || "", p.title, p.amount, p.amount - p.paidAmount, fmtDate(p.dueDate)])],
                      "defaulters.csv")}>
                    <Download className="h-3.5 w-3.5" /> Export
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="border-b border-border bg-secondary">
                      {["Student","Class","Roll No","Title","Due Amount","Due Date","Status"].map(h => <Th key={h}>{h}</Th>)}
                    </tr></thead>
                    <tbody>
                      {pendingFees.length === 0 && <EmptyRow cols={7} msg="No defaulters" />}
                      {pendingFees.map(p => (
                        <tr key={p._id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium">{p.student?.name || "—"}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{p.student?.class}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{p.student?.rollNumber || "—"}</td>
                          <td className="px-4 py-3 text-sm">{p.title}</td>
                          <td className="px-4 py-3 text-sm font-mono-stats font-semibold text-destructive">{fmt(p.amount - p.paidAmount)}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{fmtDate(p.dueDate)}</td>
                          <td className="px-4 py-3"><Badge variant="secondary" className={`text-xs capitalize ${statusBadge(p.status)}`}>{p.status}</Badge></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Student Ledger */}
            {rptTab === "ledger" && (
              <div className="glass-card">
                <div className="p-4 border-b border-border flex items-center gap-3 flex-wrap">
                  <h3 className="text-base font-semibold font-heading">Student Ledger</h3>
                  <Sel value={rptStudent} onChange={v => setRptStudent(v)} className="w-64">
                    {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.class}{s.section ? `-${s.section}` : ""})</option>)}
                  </Sel>
                </div>
                {ledgerLoading ? <Spinner /> : (
                  <>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr className="border-b border-border bg-secondary">
                          {["Receipt No","Title","Amount","Paid","Mode","Due Date","Paid Date","Status"].map(h => <Th key={h}>{h}</Th>)}
                        </tr></thead>
                        <tbody>
                          {ledgerPays.length === 0 && <EmptyRow cols={8} msg="No payment records for this student" />}
                          {ledgerPays.map(p => (
                            <tr key={p._id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                              <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{p.receiptNo || "—"}</td>
                              <td className="px-4 py-3 text-sm">{p.title}</td>
                              <td className="px-4 py-3 text-sm font-mono-stats">{fmt(p.amount)}</td>
                              <td className="px-4 py-3 text-sm font-mono-stats text-success">{p.paidAmount > 0 ? fmt(p.paidAmount) : "—"}</td>
                              <td className="px-4 py-3"><Badge variant="secondary" className="text-xs capitalize">{p.paymentMode}</Badge></td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">{fmtDate(p.dueDate)}</td>
                              <td className="px-4 py-3 text-sm text-muted-foreground">{fmtDate(p.paidDate)}</td>
                              <td className="px-4 py-3"><Badge variant="secondary" className={`text-xs capitalize ${statusBadge(p.status)}`}>{p.status}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {ledgerPays.length > 0 && (
                      <div className="p-4 border-t border-border flex justify-end gap-6 text-sm">
                        <span className="text-muted-foreground">Total Invoiced: <span className="font-semibold font-mono-stats">{fmt(ledgerSum.total)}</span></span>
                        <span className="text-muted-foreground">Total Paid: <span className="font-bold font-mono-stats text-success">{fmt(ledgerSum.paid)}</span></span>
                        <span className="text-muted-foreground">Balance: <span className="font-bold font-mono-stats text-destructive">{fmt(ledgerSum.pending)}</span></span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ─── CONCESSIONS ─── */}
        {tab === "settings" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold font-heading">Concession / Discount Management</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Apply % or flat discounts per student per fee head</p>
              </div>
              <Button size="sm" className="btn-gradient border-0 gap-1.5" onClick={openAddCon}>
                <Plus className="h-4 w-4" /> Add Concession
              </Button>
            </div>
            <div className="glass-card">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr className="border-b border-border bg-secondary">
                    {["Student","Class","Fee Structure","Type","Discount","Effective Amount","Description","Actions"].map(h => <Th key={h}>{h}</Th>)}
                  </tr></thead>
                  <tbody>
                    {concessions.length === 0 && <EmptyRow cols={8} msg="No concessions configured" />}
                    {concessions.map(c => {
                      const eff = c.feeStructure
                        ? c.isPct ? c.feeStructure.amount * (1 - c.value / 100) : Math.max(0, c.feeStructure.amount - c.value)
                        : null;
                      return (
                        <tr key={c._id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                          <td className="px-4 py-3 text-sm font-medium">{c.student?.name || "—"}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{c.student?.class || "—"}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{c.feeStructure?.title || "All Structures"}</td>
                          <td className="px-4 py-3"><Badge variant="secondary" className="text-xs">{c.type}</Badge></td>
                          <td className="px-4 py-3 text-sm font-mono-stats font-semibold text-success">{c.isPct ? `${c.value}%` : fmt(c.value)}</td>
                          <td className="px-4 py-3 text-sm font-mono-stats">{eff !== null ? fmt(eff) : "—"}</td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">{c.description || "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary" onClick={() => openEditCon(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" onClick={() => deleteCon(c._id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── FEE STRUCTURE MODAL ── */}
      {structModal.open && (
        <Modal title={structModal.editing ? "Edit Fee Head" : "Add Fee Head"} onClose={() => setStructModal({ open: false, editing: null })}>
          <div className="space-y-4">
            {!structModal.editing && (
              <LabelRow label="Class">
                <Sel value={structClass} onChange={v => setStructClass(v)}>
                  <option value="">— Select class —</option>
                  {classes.map(c => (
                    <option key={c._id} value={c.name}>{c.name}{c.section ? `-${c.section}` : ""}</option>
                  ))}
                </Sel>
              </LabelRow>
            )}
            <LabelRow label="Title">
              <Input value={structForm.title} onChange={e => setStructForm(f => ({ ...f, title: e.target.value }))} list="fee-titles" placeholder="e.g. Tuition Fee" />
              <datalist id="fee-titles">{["Tuition Fee","Admission Fee","Annual Charges","Exam Fee","Library Fee","Sports Fee","Transport Fee","Lab Fee","Misc Fee"].map(n => <option key={n} value={n} />)}</datalist>
            </LabelRow>
            <div className="grid grid-cols-2 gap-4">
              <LabelRow label="Amount (₹)">
                <Input type="number" value={structForm.amount} onChange={e => setStructForm(f => ({ ...f, amount: e.target.value }))} placeholder="0" />
              </LabelRow>
              <LabelRow label="Frequency">
                <Sel value={structForm.frequency} onChange={v => setStructForm(f => ({ ...f, frequency: v, dueDate: (v === "yearly" || v === "one-time") ? f.dueDate : "" }))}>
                  {FREQ_OPTS.map(o => <option key={o} value={o}>{o}</option>)}
                </Sel>
              </LabelRow>
              {(structForm.frequency === "yearly" || structForm.frequency === "one-time") && (
                <LabelRow label="Due Date">
                  <Input type="date" value={structForm.dueDate} onChange={e => setStructForm(f => ({ ...f, dueDate: e.target.value }))} />
                </LabelRow>
              )}
              <LabelRow label="Academic Year">
                <Input value={structForm.academicYear} onChange={e => setStructForm(f => ({ ...f, academicYear: e.target.value }))} placeholder="e.g. 2024-25" />
              </LabelRow>
            </div>
            <LabelRow label="Description (optional)">
              <Input value={structForm.description} onChange={e => setStructForm(f => ({ ...f, description: e.target.value }))} placeholder="Notes…" />
            </LabelRow>
            <div className="flex gap-3 pt-2">
              <Button className="btn-gradient border-0 flex-1" onClick={saveStruct} disabled={structSaving}>
                {structSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                {structModal.editing ? "Update" : "Add"} Fee Head
              </Button>
              <Button variant="outline" onClick={() => setStructModal({ open: false, editing: null })}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── CONCESSION MODAL ── */}
      {conModal.open && (
        <Modal title={conModal.editing ? "Edit Concession" : "Add Concession"} onClose={() => setConModal({ open: false, editing: null })}>
          <div className="space-y-4">
            <LabelRow label="Student">
              <Sel value={conForm.studentId} onChange={v => setConForm(f => ({ ...f, studentId: v, feeStructureId: "" }))}>
                <option value="">Select student</option>
                {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.class}{s.section ? `-${s.section}` : ""})</option>)}
              </Sel>
            </LabelRow>
            <LabelRow label="Fee Structure (optional — leave blank for all)">
              <Sel value={conForm.feeStructureId} onChange={v => setConForm(f => ({ ...f, feeStructureId: v }))}>
                <option value="">All fee structures</option>
                {structures.filter(s => s.class === students.find(st => st._id === conForm.studentId)?.class)
                  .map(s => <option key={s._id} value={s._id}>{s.title} ({fmt(s.amount)})</option>)}
              </Sel>
            </LabelRow>
            <LabelRow label="Concession Type">
              <Sel value={conForm.type} onChange={v => setConForm(f => ({ ...f, type: v }))}>
                {CON_TYPES.map(t => <option key={t}>{t}</option>)}
              </Sel>
            </LabelRow>
            <div className="grid grid-cols-2 gap-4">
              <LabelRow label="Value">
                <Input type="number" value={conForm.value} onChange={e => setConForm(f => ({ ...f, value: e.target.value }))} placeholder="e.g. 20 or 500" />
              </LabelRow>
              <LabelRow label="Discount Type">
                <div className="flex gap-2">
                  {[{ l: "Percent (%)", v: true }, { l: "Flat (₹)", v: false }].map(opt => (
                    <button key={opt.l} onClick={() => setConForm(f => ({ ...f, isPct: opt.v }))}
                      className={`flex-1 h-10 rounded-lg border text-sm font-medium transition-all ${conForm.isPct === opt.v ? "btn-gradient text-white border-transparent" : "border-border text-muted-foreground hover:border-primary"}`}>
                      {opt.l}
                    </button>
                  ))}
                </div>
              </LabelRow>
            </div>
            <LabelRow label="Description (optional)">
              <Input value={conForm.description} onChange={e => setConForm(f => ({ ...f, description: e.target.value }))} placeholder="Reason for concession…" />
            </LabelRow>
            <div className="flex gap-3 pt-2">
              <Button className="btn-gradient border-0 flex-1" onClick={saveCon} disabled={conSaving}>
                {conSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : null}
                {conModal.editing ? "Update" : "Add"} Concession
              </Button>
              <Button variant="outline" onClick={() => setConModal({ open: false, editing: null })}>Cancel</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── RECEIPT MODAL ── */}
      {receiptDoc && (() => {
        const p  = receiptDoc;
        const st = p.student;
        return (
          <Modal title="Payment Receipt" onClose={() => setReceiptDoc(null)} wide>
            <div className="space-y-4">
              <div className="border border-border rounded-xl p-6 space-y-4">
                <div className="text-center border-b border-border pb-4">
                  <div className="h-10 w-10 rounded-xl btn-gradient flex items-center justify-center mx-auto mb-2">
                    <Receipt className="h-5 w-5 text-white" />
                  </div>
                  <h2 className="text-lg font-bold font-heading text-primary">Anyit Software</h2>
                  <p className="text-xs text-muted-foreground">Fee Payment Receipt</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Receipt No", p.receiptNo || "—"],
                    ["Date",       fmtDate(p.paidDate || p.dueDate)],
                    ["Student",    st?.name || "—"],
                    ["Student ID", st?.studentId || "—"],
                    ["Class",      `${st?.class || ""}${st?.section ? `-${st.section}` : ""}`],
                    ["Roll No",    st?.rollNumber || "—"],
                  ].map(([k, v]) => (
                    <div key={k}><span className="text-muted-foreground text-xs">{k}</span><br /><span className="font-semibold">{v}</span></div>
                  ))}
                </div>
                <div className="border border-border rounded-lg overflow-hidden text-sm">
                  <table className="w-full">
                    <thead><tr className="bg-secondary">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground text-xs">Description</th>
                      <th className="text-right px-4 py-2 font-medium text-muted-foreground text-xs">Amount</th>
                    </tr></thead>
                    <tbody>
                      <tr className="border-t border-border"><td className="px-4 py-2">{p.title}</td><td className="px-4 py-2 text-right font-mono-stats">{fmt(p.amount)}</td></tr>
                    </tbody>
                    <tfoot><tr className="border-t-2 border-border bg-secondary">
                      <td className="px-4 py-2.5 font-semibold">Amount Paid</td>
                      <td className="px-4 py-2.5 text-right font-bold font-mono-stats text-success text-base">{fmt(p.paidAmount)}</td>
                    </tr></tfoot>
                  </table>
                </div>
                <div className="flex justify-between text-sm">
                  <span><span className="text-muted-foreground">Mode: </span><span className="font-semibold capitalize">{p.paymentMode}</span></span>
                  {p.remarks && <span><span className="text-muted-foreground">Ref: </span><span>{p.remarks}</span></span>}
                </div>
                <p className="text-center text-xs text-muted-foreground border-t border-border pt-3">Computer-generated receipt · No signature required</p>
              </div>
              <div className="flex gap-3">
                <Button className="btn-gradient border-0 gap-1.5 flex-1" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" /> Print Receipt
                </Button>
                <Button variant="outline" onClick={() => setReceiptDoc(null)}>Close</Button>
              </div>
            </div>
          </Modal>
        );
      })()}
    </DashboardLayout>
  );
};

export default Fees;
