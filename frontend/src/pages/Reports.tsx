import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  BarChart3, Users, CalendarCheck, DollarSign, Download, FileText,
  GraduationCap, TrendingUp, Loader2, BookOpen, AlertCircle, Trophy, Clock, Check,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Tab = "overview" | "attendance" | "exams" | "finance";

interface ClassDoc   { _id: string; name: string; section: string }
interface ExamDoc    { _id: string; title: string; subject: string; class: string; section: string; date: string; totalMarks: number; status: string }
interface ResultDoc  { student: { _id: string; name: string; studentId: string; rollNumber: string } | null; marksObtained: number; percentage: number; grade: string; isPassed: boolean }
interface AttendanceRow { class: string; section: string; date: string; records: { student: string; status: string }[] }

// Student-specific interfaces
interface StudentResult { _id: string; exam: { title: string; subject: string; date: string; examType: string; totalMarks: number } | null; marksObtained: number; percentage: number; grade: string; isPassed: boolean; remarks: string }
interface StudentFee    {
  _id: string; title: string; amount: number; paidAmount: number
  status: string; dueDate: string; paidDate?: string | null
  receiptNo?: string | null; paymentMode?: string
  isVirtual?: boolean
  feeStructure?: { _id: string; title: string } | null
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const YEARS  = [2024, 2025, 2026];

const fmt = (n: number) => `₹${(n || 0).toLocaleString("en-IN")}`;

const feeStatusStyle = (s: string) => {
  switch (s) {
    case "paid":    return "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20";
    case "partial": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "overdue": return "bg-destructive/10 text-destructive border-destructive/20";
    default:        return "bg-warning/10 text-warning border-warning/20";
  }
};

const PAYMENT_MODES = [
  { value: "online", label: "Online / UPI" },
  { value: "cash",   label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "dd",     label: "Demand Draft" },
];

// ── Student Report View ───────────────────────────────────────────────────────
function StudentReports() {
  const [tab,          setTab]          = useState<"exams" | "finance">("exams");
  const [results,      setResults]      = useState<StudentResult[]>([]);
  const [avgPct,       setAvgPct]       = useState(0);
  const [fees,         setFees]         = useState<StudentFee[]>([]);
  const [feeSummary,   setFeeSummary]   = useState<{ paid: number; pending: number; total: number } | null>(null);
  const [loadingExams, setLoadingExams] = useState(true);
  const [loadingFees,  setLoadingFees]  = useState(true);

  // Payment modal
  const [payFee,       setPayFee]       = useState<StudentFee | null>(null);
  const [payAmount,    setPayAmount]    = useState("");
  const [payMode,      setPayMode]      = useState("online");
  const [payTxn,       setPayTxn]       = useState("");
  const [payRemarks,   setPayRemarks]   = useState("");
  const [paying,       setPaying]       = useState(false);

  // Receipt modal
  const [receipt,      setReceipt]      = useState<StudentFee | null>(null);

  const loadFees = () => {
    setLoadingFees(true);
    api.get("/fees/student/me")
      .then((res) => {
        const d = res.data?.data || {};
        setFees(d.fees || []);
        setFeeSummary(d.summary || null);
      })
      .catch(() => {})
      .finally(() => setLoadingFees(false));
  };

  useEffect(() => {
    api.get("/exams/results/me")
      .then((res) => { const d = res.data?.data || {}; setResults(d.results || []); setAvgPct(d.averagePercentage || 0); })
      .catch(() => {})
      .finally(() => setLoadingExams(false));
    loadFees();
  }, []);

  const openPayModal = (f: StudentFee) => {
    const balance = f.amount - (f.paidAmount || 0);
    setPayFee(f);
    setPayAmount(String(balance));
    setPayMode("online");
    setPayTxn("");
    setPayRemarks("");
  };

  const submitPayment = async () => {
    if (!payFee) return;
    const amt = parseFloat(payAmount);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount."); return; }
    if (payMode === "online" && !payTxn.trim()) { toast.error("Transaction ID is required for online payment."); return; }

    const balance = payFee.amount - (payFee.paidAmount || 0);
    if (amt > balance) { toast.error(`Maximum payable is ${fmt(balance)}.`); return; }

    setPaying(true);
    try {
      const body: Record<string, unknown> = {
        paidAmount:    amt,
        paymentMode:   payMode,
        transactionId: payTxn.trim() || undefined,
        remarks:       payRemarks.trim() || undefined,
      };
      if (payFee.isVirtual && payFee.feeStructure?._id) {
        body.feeStructureId = payFee.feeStructure._id;
      } else {
        body.feePaymentId = payFee._id;
      }

      const res = await api.post("/fees/pay", body);
      const updated: StudentFee = res.data?.data;

      toast.success(
        updated.status === "paid"
          ? `Payment successful! Receipt: ${updated.receiptNo}`
          : "Partial payment recorded."
      );

      setPayFee(null);
      loadFees();

      if (updated.status === "paid" && updated.receiptNo) setReceipt(updated);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Payment failed. Try again.");
    } finally {
      setPaying(false);
    }
  };

  const pendingFees = fees.filter((f) => ["pending", "partial", "overdue"].includes(f.status));
  const paidFees    = fees.filter((f) => f.status === "paid");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Your exam results and fee history.</p>
        </div>

        <div className="flex gap-0 border-b border-border">
          {[
            { id: "exams" as const, label: "Exam Results", icon: GraduationCap },
            { id: "finance" as const, label: "My Fees", icon: DollarSign },
          ].map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}>
              <t.icon className="h-4 w-4" />{t.label}
              {t.id === "finance" && pendingFees.length > 0 && !loadingFees && (
                <span className="ml-1 h-4 min-w-4 px-1 text-[10px] bg-destructive text-white rounded-full flex items-center justify-center">
                  {pendingFees.length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── EXAMS TAB ── */}
        {tab === "exams" && (
          <div className="space-y-4">
            {!loadingExams && results.length > 0 && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total Exams", value: results.length,                          color: "" },
                  { label: "Passed",      value: results.filter(r => r.isPassed).length,  color: "text-[hsl(var(--success))]" },
                  { label: "Failed",      value: results.filter(r => !r.isPassed).length, color: "text-destructive" },
                  { label: "Average",     value: `${avgPct}%`,                            color: "text-primary" },
                ].map((s) => (
                  <Card key={s.label} className="hover-lift">
                    <CardContent className="p-4 text-center">
                      <p className={`text-2xl font-bold ${s.color || "text-foreground"}`}>{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
            {loadingExams ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : results.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Trophy className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No exam results yet.</p>
              </div>
            ) : (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">All Results ({results.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          {["#","Exam","Subject","Type","Marks","Percentage","Grade","Status"].map((h) => (
                            <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {results.map((r, i) => (
                          <tr key={r._id} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                            <td className="px-4 py-2.5 font-medium text-foreground">{r.exam?.title || "—"}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{r.exam?.subject || "—"}</td>
                            <td className="px-4 py-2.5 text-muted-foreground capitalize">{r.exam?.examType || "—"}</td>
                            <td className="px-4 py-2.5 text-foreground">{r.marksObtained}/{r.exam?.totalMarks || "—"}</td>
                            <td className="px-4 py-2.5 font-medium text-foreground">{r.percentage}%</td>
                            <td className="px-4 py-2.5"><Badge variant="secondary" className="text-xs">{r.grade}</Badge></td>
                            <td className="px-4 py-2.5">
                              <Badge variant="secondary" className={`text-xs ${r.isPassed ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : "bg-destructive/10 text-destructive"}`}>
                                {r.isPassed ? "Pass" : "Fail"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* ── FEES TAB ── */}
        {tab === "finance" && (
          <div className="space-y-5">
            {/* Summary cards */}
            {feeSummary && (
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: "Total Paid",  value: fmt(feeSummary.paid),    icon: Check,         bg: "bg-[hsl(var(--success))]" },
                  { label: "Pending",     value: fmt(feeSummary.pending),  icon: AlertCircle,   bg: "bg-amber-500" },
                  { label: "Total Fees",  value: fmt(feeSummary.total),    icon: DollarSign,    bg: "bg-blue-500" },
                ].map((s) => (
                  <Card key={s.label} className="hover-lift">
                    <CardContent className="p-5">
                      <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                        <s.icon className="h-5 w-5 text-white" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {loadingFees ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : fees.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No fee records found.</p>
              </div>
            ) : (
              <>
                {/* Pending / Due fees */}
                {pendingFees.length > 0 && (
                  <Card className="hover-lift border-warning/30">
                    <CardHeader className="pb-3 border-b border-border">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-warning" />
                        Pending Dues ({pendingFees.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y divide-border">
                        {pendingFees.map((f) => {
                          const balance  = f.amount - (f.paidAmount || 0);
                          const isOverdue = f.status === "overdue";
                          return (
                            <div key={f._id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4">
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${isOverdue ? "bg-destructive/10" : "bg-warning/10"}`}>
                                  <AlertCircle className={`h-5 w-5 ${isOverdue ? "text-destructive" : "text-warning"}`} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground">{f.title}</p>
                                  <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                                    <span>Due: {new Date(f.dueDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                                    {f.paidAmount > 0 && (
                                      <span className="text-[hsl(var(--success))]">{fmt(f.paidAmount)} already paid</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">Balance Due</p>
                                  <p className={`text-lg font-bold ${isOverdue ? "text-destructive" : "text-warning"}`}>{fmt(balance)}</p>
                                </div>
                                <Badge variant="secondary" className={`text-xs capitalize border ${feeStatusStyle(f.status)}`}>{f.status}</Badge>
                                <Button
                                  size="sm"
                                  className="btn-gradient border-0 gap-1.5 text-xs"
                                  onClick={() => openPayModal(f)}
                                >
                                  <DollarSign className="h-3.5 w-3.5" /> Pay Now
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Paid fees */}
                {paidFees.length > 0 && (
                  <Card className="hover-lift">
                    <CardHeader className="pb-3 border-b border-border">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <Check className="h-4 w-4 text-[hsl(var(--success))]" />
                        Payment History ({paidFees.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border bg-muted/50">
                              {["Receipt No","Fee Title","Amount Paid","Mode","Paid On",""].map((h) => (
                                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border">
                            {paidFees.map((f) => (
                              <tr key={f._id} className="hover:bg-muted/30 transition-colors">
                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{f.receiptNo || "—"}</td>
                                <td className="px-4 py-3 font-medium text-foreground">{f.title}</td>
                                <td className="px-4 py-3 font-semibold text-[hsl(var(--success))]">{fmt(f.paidAmount)}</td>
                                <td className="px-4 py-3">
                                  <Badge variant="secondary" className="text-xs capitalize">{f.paymentMode || "—"}</Badge>
                                </td>
                                <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                                  {f.paidDate ? new Date(f.paidDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                                </td>
                                <td className="px-4 py-3">
                                  {f.receiptNo && (
                                    <Button size="sm" variant="ghost" className="text-xs h-7 gap-1 text-muted-foreground hover:text-primary"
                                      onClick={() => setReceipt(f)}>
                                      <FileText className="h-3 w-3" /> Receipt
                                    </Button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── PAY NOW MODAL ── */}
      {payFee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border border-border rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h3 className="text-base font-semibold">Pay Fee</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{payFee.title}</p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setPayFee(null)}>
                <AlertCircle className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-5 space-y-4">
              {/* Fee summary */}
              <div className="grid grid-cols-3 gap-3 rounded-xl bg-muted/50 p-4 text-center">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Total</p>
                  <p className="text-sm font-bold text-foreground">{fmt(payFee.amount)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Paid</p>
                  <p className="text-sm font-bold text-[hsl(var(--success))]">{fmt(payFee.paidAmount || 0)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Balance</p>
                  <p className="text-sm font-bold text-destructive">{fmt(payFee.amount - (payFee.paidAmount || 0))}</p>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Amount to Pay (₹) <span className="text-destructive">*</span>
                </label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  max={payFee.amount - (payFee.paidAmount || 0)}
                  min={1}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Enter amount"
                />
              </div>

              {/* Payment Mode */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Payment Mode <span className="text-destructive">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PAYMENT_MODES.map((m) => (
                    <button key={m.value} onClick={() => setPayMode(m.value)}
                      className={`h-10 rounded-lg border text-sm font-medium transition-all ${payMode === m.value ? "btn-gradient text-white border-transparent" : "border-border text-muted-foreground hover:border-primary hover:text-primary"}`}>
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Transaction ID (online only) */}
              {payMode === "online" && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                    Transaction / UTR ID <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    value={payTxn}
                    onChange={(e) => setPayTxn(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    placeholder="e.g. UPI ref / UTR number"
                  />
                </div>
              )}

              {/* Remarks */}
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
                  Remarks (optional)
                </label>
                <input
                  type="text"
                  value={payRemarks}
                  onChange={(e) => setPayRemarks(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Cheque no., note, etc."
                />
              </div>

              <div className="flex gap-3 pt-1">
                <Button className="btn-gradient border-0 flex-1 gap-1.5" onClick={submitPayment} disabled={paying}>
                  {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  {paying ? "Processing…" : "Confirm Payment"}
                </Button>
                <Button variant="outline" onClick={() => setPayFee(null)} disabled={paying}>Cancel</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── RECEIPT MODAL ── */}
      {receipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border border-border rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-6 space-y-4">
              <div className="text-center border-b border-border pb-4">
                <div className="h-12 w-12 rounded-xl btn-gradient flex items-center justify-center mx-auto mb-3">
                  <Check className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-[hsl(var(--success))]">Payment Successful!</h3>
                <p className="text-xs text-muted-foreground mt-1">Your payment has been recorded.</p>
              </div>
              <div className="space-y-2.5 text-sm">
                {[
                  ["Receipt No",   receipt.receiptNo || "—"],
                  ["Fee Title",    receipt.title],
                  ["Amount Paid",  fmt(receipt.paidAmount)],
                  ["Mode",         receipt.paymentMode || "—"],
                  ["Date",         receipt.paidDate ? new Date(receipt.paidDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : new Date().toLocaleDateString("en-IN")],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-4 py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">{k}</span>
                    <span className="font-semibold text-right">{v}</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-center text-muted-foreground">Computer-generated receipt · No signature required</p>
              <Button className="btn-gradient border-0 w-full" onClick={() => setReceipt(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

function downloadCSV(headers: string[], rows: (string | number)[][], filename: string) {
  const csv = [headers, ...rows].map(r => r.map(c => `"${c}"`).join(",")).join("\n");
  const a   = Object.assign(document.createElement("a"), {
    href:     URL.createObjectURL(new Blob([csv], { type: "text/csv" })),
    download: filename,
  });
  a.click();
}

export default function Reports() {
  const { user } = useAuth();

  if (user?.role === "student") return <StudentReports />;

  const isAdmin = user?.role === "school_admin";

  const [tab, setTab] = useState<Tab>("overview");

  // ── shared data ──────────────────────────────────────────────
  const [classes,      setClasses]      = useState<ClassDoc[]>([]);
  const [stats,        setStats]        = useState<{ totalStudents: number; activeStudents: number; totalTeachers: number; activeTeachers: number } | null>(null);
  const [feeSummary,   setFeeSummary]   = useState<{ totalCollected: number; totalPending: number } | null>(null);
  const [feeMonthly,   setFeeMonthly]   = useState<{ month: string; collected: number; pending: number }[]>([]);
  const [loadingInit,  setLoadingInit]  = useState(true);

  // ── attendance ───────────────────────────────────────────────
  const [attMonth,    setAttMonth]    = useState(new Date().getMonth() + 1);
  const [attYear,     setAttYear]     = useState(new Date().getFullYear());
  const [attClassId,  setAttClassId]  = useState("all");
  const [attData,     setAttData]     = useState<{ class: string; rate: number; present: number; total: number }[]>([]);
  const [loadingAtt,  setLoadingAtt]  = useState(false);

  // ── exams ────────────────────────────────────────────────────
  const [exams,         setExams]         = useState<ExamDoc[]>([]);
  const [selectedExam,  setSelectedExam]  = useState("");
  const [examResults,   setExamResults]   = useState<{ results: ResultDoc[]; summary: { total: number; passed: number; failed: number; avgPercentage: number } } | null>(null);
  const [loadingExams,  setLoadingExams]  = useState(false);
  const [loadingResults,setLoadingResults]= useState(false);

  // ── finance extra ────────────────────────────────────────────
  const [pendingFees,    setPendingFees]    = useState<any[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  // Initial load: stats + classes + fee analytics
  useEffect(() => {
    const calls = [
      isAdmin ? api.get("/admin/stats")      : Promise.resolve(null),
      api.get("/admin/classes"),
      isAdmin ? api.get("/fees/analytics")   : Promise.resolve(null),
    ] as const;

    Promise.allSettled(calls).then(([s, c, f]) => {
      if (s.status === "fulfilled" && s.value) setStats(s.value.data?.data || null);
      if (c.status === "fulfilled")             setClasses(c.value?.data?.data || []);
      if (f.status === "fulfilled" && f.value)  {
        setFeeMonthly(f.value.data?.data    || []);
        setFeeSummary(f.value.data?.summary || null);
      }
      setLoadingInit(false);
    });
  }, [isAdmin]);

  // Load attendance when tab opens or user clicks "Generate"
  const loadAttendance = () => {
    setLoadingAtt(true);
    const params: Record<string, string | number> = { month: attMonth, year: attYear };
    if (attClassId !== "all") {
      const cls = classes.find((c) => c._id === attClassId);
      if (cls) { params.studentClass = cls.name; params.section = cls.section; }
    }
    api.get("/attendance/monthly", { params })
      .then((res) => {
        const rows: AttendanceRow[] = res.data?.data || [];
        const map: Record<string, { present: number; total: number }> = {};
        rows.forEach((doc) => {
          const key = doc.section ? `${doc.class}-${doc.section}` : doc.class;
          if (!map[key]) map[key] = { present: 0, total: 0 };
          doc.records.forEach((r) => {
            map[key].total++;
            if (r.status === "present") map[key].present++;
          });
        });
        setAttData(
          Object.entries(map)
            .map(([cls, v]) => ({ class: cls, rate: v.total > 0 ? Math.round((v.present / v.total) * 100) : 0, present: v.present, total: v.total }))
            .sort((a, b) => a.class.localeCompare(b.class))
        );
      })
      .catch(() => toast.error("Failed to load attendance data."))
      .finally(() => setLoadingAtt(false));
  };

  useEffect(() => { if (tab === "attendance") loadAttendance(); }, [tab]);

  // Load exams list when tab opens
  useEffect(() => {
    if (tab !== "exams" || exams.length > 0) return;
    setLoadingExams(true);
    api.get("/exams")
      .then((res) => setExams(res.data?.data || []))
      .catch(() => toast.error("Failed to load exams."))
      .finally(() => setLoadingExams(false));
  }, [tab]);

  // Load exam results when an exam is selected
  useEffect(() => {
    if (!selectedExam) return;
    setLoadingResults(true);
    setExamResults(null);
    api.get(`/exams/results/class/${selectedExam}`)
      .then((res) => setExamResults(res.data?.data || { results: [], summary: { total: 0, passed: 0, failed: 0, avgPercentage: 0 } }))
      .catch(() => toast.error("Failed to load exam results."))
      .finally(() => setLoadingResults(false));
  }, [selectedExam]);

  // Load pending fees when Finance tab opens
  useEffect(() => {
    if (tab !== "finance") return;
    setLoadingPending(true);
    api.get("/fees/pending")
      .then((res) => setPendingFees(res.data?.data || []))
      .catch(() => {})
      .finally(() => setLoadingPending(false));
  }, [tab]);

  const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "overview",   label: "Overview",      icon: TrendingUp     },
    { id: "attendance", label: "Attendance",    icon: CalendarCheck  },
    { id: "exams",      label: "Exam Results",  icon: GraduationCap  },
    { id: "finance",    label: "Finance",       icon: DollarSign     },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-1">Live data across attendance, exams and finances.</p>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-0 border-b border-border overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                tab === t.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW ─────────────────────────────────────────── */}
        {tab === "overview" && (
          <div className="space-y-6">
            {loadingInit ? (
              <div className="flex items-center justify-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Active Students", value: stats?.activeStudents ?? "—", icon: Users,        bg: "btn-gradient"    },
                    { label: "Active Teachers", value: stats?.activeTeachers ?? "—", icon: BookOpen,     bg: "bg-blue-500"     },
                    { label: "Total Collected",  value: feeSummary ? `₹${(feeSummary.totalCollected/1000).toFixed(1)}k` : "—", icon: DollarSign, bg: "bg-green-500" },
                    { label: "Fee Pending",      value: feeSummary ? `₹${(feeSummary.totalPending/1000).toFixed(1)}k`   : "—", icon: AlertCircle,bg: "bg-amber-500" },
                  ].map((s) => (
                    <Card key={s.label} className="hover-lift">
                      <CardContent className="p-5">
                        <div className={`h-10 w-10 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
                          <s.icon className="h-5 w-5 text-white" />
                        </div>
                        <p className="text-2xl font-bold text-foreground">{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {feeMonthly.filter((d) => d.collected > 0 || d.pending > 0).length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-primary" /> Monthly Fee Overview
                        </CardTitle>
                        <Button size="sm" variant="outline" className="gap-1" onClick={() =>
                          downloadCSV(["Month","Collected","Pending"], feeMonthly.map((d) => [d.month, d.collected, d.pending]), "fee-overview.csv")
                        }>
                          <Download className="h-3 w-3" /> Export
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={feeMonthly}>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                          <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} />
                          <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, ""]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                          <Legend />
                          <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[4,4,0,0]} />
                          <Bar dataKey="pending"   name="Pending"   fill="#f59e0b" radius={[4,4,0,0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}

                {classes.length > 0 && (
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-semibold flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" /> Classes ({classes.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {classes.map((c) => (
                          <Badge key={c._id} variant="secondary" className="text-sm px-3 py-1">{c.name}-{c.section}</Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </div>
        )}

        {/* ── ATTENDANCE ───────────────────────────────────────── */}
        {tab === "attendance" && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Month</p>
                <Select value={String(attMonth)} onValueChange={(v) => setAttMonth(Number(v))}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Year</p>
                <Select value={String(attYear)} onValueChange={(v) => setAttYear(Number(v))}>
                  <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Class</p>
                <Select value={attClassId} onValueChange={setAttClassId}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((c) => <SelectItem key={c._id} value={c._id}>{c.name}-{c.section}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button className="btn-gradient border-0 gap-2" onClick={loadAttendance} disabled={loadingAtt}>
                {loadingAtt ? <Loader2 className="h-4 w-4 animate-spin" /> : <BarChart3 className="h-4 w-4" />}
                Generate
              </Button>
              {attData.length > 0 && (
                <Button variant="outline" size="sm" className="gap-1 ml-auto" onClick={() =>
                  downloadCSV(["Class","Rate (%)","Present","Total"], attData.map((d) => [d.class, d.rate, d.present, d.total]), `attendance-${MONTHS[attMonth-1]}-${attYear}.csv`)
                }>
                  <Download className="h-3 w-3" /> Export CSV
                </Button>
              )}
            </div>

            {loadingAtt ? (
              <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : attData.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <CalendarCheck className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No attendance data for {MONTHS[attMonth-1]} {attYear}.</p>
              </div>
            ) : (
              <>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" /> Attendance by Class — {MONTHS[attMonth-1]} {attYear}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={attData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="class" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                        <YAxis domain={[0, 100]} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} unit="%" />
                        <Tooltip formatter={(v: any) => [`${v}%`, "Attendance"]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                        <Bar dataKey="rate" name="Attendance %" fill="#4A7DFF" radius={[6,6,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Class-wise Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y divide-border">
                      {attData.map((d) => (
                        <div key={d.class} className="flex items-center justify-between px-5 py-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{d.class}</p>
                            <p className="text-xs text-muted-foreground">{d.present} present out of {d.total} total</p>
                          </div>
                          <Badge variant="secondary" className={`font-semibold ${
                            d.rate >= 90 ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
                            : d.rate >= 75 ? "bg-amber-500/10 text-amber-600"
                            : "bg-destructive/10 text-destructive"
                          }`}>
                            {d.rate}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ── EXAM RESULTS ─────────────────────────────────────── */}
        {tab === "exams" && (
          <div className="space-y-5">
            <div className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[240px] space-y-1">
                <p className="text-xs font-medium text-muted-foreground">Select Exam</p>
                <Select value={selectedExam} onValueChange={setSelectedExam} disabled={loadingExams}>
                  <SelectTrigger>
                    <SelectValue placeholder={loadingExams ? "Loading exams…" : "Choose an exam to view results"} />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((e) => (
                      <SelectItem key={e._id} value={e._id}>
                        {e.title} — {e.class}{e.section ? `-${e.section}` : ""} ({e.subject}) [{e.status}]
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {examResults && !loadingResults && (
                <Button variant="outline" size="sm" className="gap-1" onClick={() =>
                  downloadCSV(
                    ["Name","Student ID","Roll No","Marks","Percentage","Grade","Status"],
                    examResults.results.map((r) => [r.student?.name || "—", r.student?.studentId || "—", r.student?.rollNumber || "—", r.marksObtained, r.percentage, r.grade, r.isPassed ? "Pass" : "Fail"]),
                    `exam-results.csv`
                  )
                }>
                  <Download className="h-3 w-3" /> Export CSV
                </Button>
              )}
            </div>

            {!selectedExam && !loadingExams && (
              <div className="text-center py-16 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Select an exam above to view results and grade distribution.</p>
              </div>
            )}

            {loadingResults && (
              <div className="flex items-center justify-center h-48"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            )}

            {examResults && !loadingResults && (
              <>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total Students", value: examResults.summary.total,           color: ""                             },
                    { label: "Passed",          value: examResults.summary.passed,          color: "text-[hsl(var(--success))]"   },
                    { label: "Failed",          value: examResults.summary.failed,          color: "text-destructive"             },
                    { label: "Average Score",   value: `${examResults.summary.avgPercentage}%`, color: "text-primary"            },
                  ].map((s) => (
                    <Card key={s.label} className="hover-lift">
                      <CardContent className="p-4 text-center">
                        <p className={`text-2xl font-bold ${s.color || "text-foreground"}`}>{s.value}</p>
                        <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Grade distribution */}
                {(() => {
                  const gc: Record<string, number> = {};
                  examResults.results.forEach((r) => { gc[r.grade] = (gc[r.grade] || 0) + 1; });
                  const gradeData = Object.entries(gc).map(([grade, count]) => ({ grade, count })).sort((a, b) => a.grade.localeCompare(b.grade));
                  return gradeData.length > 0 ? (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <BarChart3 className="h-4 w-4 text-primary" /> Grade Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ResponsiveContainer width="100%" height={240}>
                          <BarChart data={gradeData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                            <XAxis dataKey="grade" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                            <YAxis allowDecimals={false} tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                            <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                            <Bar dataKey="count" name="Students" fill="hsl(var(--primary))" radius={[4,4,0,0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  ) : null;
                })()}

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Student Results ({examResults.results.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border bg-muted/50">
                            {["#","Student","Roll No","Marks","Percentage","Grade","Status"].map((h) => (
                              <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {examResults.results.map((r, i) => (
                            <tr key={i} className="hover:bg-muted/30 transition-colors">
                              <td className="px-4 py-2.5 text-muted-foreground">{i + 1}</td>
                              <td className="px-4 py-2.5 font-medium text-foreground">{r.student?.name || "—"}</td>
                              <td className="px-4 py-2.5 text-muted-foreground">{r.student?.rollNumber || "—"}</td>
                              <td className="px-4 py-2.5 text-foreground">{r.marksObtained}</td>
                              <td className="px-4 py-2.5 font-medium text-foreground">{r.percentage}%</td>
                              <td className="px-4 py-2.5">
                                <Badge variant="secondary" className="text-xs">{r.grade}</Badge>
                              </td>
                              <td className="px-4 py-2.5">
                                <Badge variant="secondary" className={`text-xs ${r.isPassed ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]" : "bg-destructive/10 text-destructive"}`}>
                                  {r.isPassed ? "Pass" : "Fail"}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {examResults.results.length === 0 && (
                        <p className="text-center text-sm text-muted-foreground py-10">No results entered for this exam yet.</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        )}

        {/* ── FINANCE ──────────────────────────────────────────── */}
        {tab === "finance" && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="hover-lift">
                <CardContent className="p-5">
                  <div className="h-10 w-10 rounded-lg bg-green-500 flex items-center justify-center mb-3">
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">₹{feeSummary ? feeSummary.totalCollected.toLocaleString() : "—"}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Collected (This Year)</p>
                </CardContent>
              </Card>
              <Card className="hover-lift">
                <CardContent className="p-5">
                  <div className="h-10 w-10 rounded-lg bg-amber-500 flex items-center justify-center mb-3">
                    <AlertCircle className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">₹{feeSummary ? feeSummary.totalPending.toLocaleString() : "—"}</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Pending</p>
                </CardContent>
              </Card>
              <Card className="hover-lift col-span-2 lg:col-span-1">
                <CardContent className="p-5">
                  <div className="h-10 w-10 rounded-lg bg-blue-500 flex items-center justify-center mb-3">
                    <TrendingUp className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-2xl font-bold text-foreground">
                    {feeSummary && (feeSummary.totalCollected + feeSummary.totalPending) > 0
                      ? `${Math.round((feeSummary.totalCollected / (feeSummary.totalCollected + feeSummary.totalPending)) * 100)}%`
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Collection Rate</p>
                </CardContent>
              </Card>
            </div>

            {feeMonthly.filter((d) => d.collected > 0 || d.pending > 0).length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" /> Monthly Collection vs Pending
                    </CardTitle>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() =>
                      downloadCSV(["Month","Collected","Pending"], feeMonthly.map((d) => [d.month, d.collected, d.pending]), "monthly-finance.csv")
                    }>
                      <Download className="h-3 w-3" /> Export CSV
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={feeMonthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="month" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: any) => [`₹${Number(v).toLocaleString()}`, ""]} contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                      <Legend />
                      <Bar dataKey="collected" name="Collected" fill="#22c55e" radius={[4,4,0,0]} />
                      <Bar dataKey="pending"   name="Pending"   fill="#f59e0b" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold">
                    Pending Fee Records {pendingFees.length > 0 && `(${pendingFees.length})`}
                  </CardTitle>
                  {pendingFees.length > 0 && (
                    <Button variant="outline" size="sm" className="gap-1" onClick={() =>
                      downloadCSV(
                        ["Student","Class","Fee Title","Amount","Paid","Balance","Due Date","Status"],
                        pendingFees.map((f) => [f.student?.name || "—", f.student?.class || "—", f.title, f.amount, f.paidAmount, (f.amount - f.paidAmount), f.dueDate?.slice(0,10) || "—", f.status]),
                        "pending-fees.csv"
                      )
                    }>
                      <Download className="h-3 w-3" /> Export
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {loadingPending ? (
                  <div className="flex items-center justify-center h-24">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : pendingFees.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-10">No pending fees.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          {["Student","Class","Fee Title","Total","Paid","Balance","Due Date","Status"].map((h) => (
                            <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {pendingFees.slice(0, 25).map((f, i) => (
                          <tr key={i} className="hover:bg-muted/30 transition-colors">
                            <td className="px-4 py-2.5 font-medium text-foreground">{f.student?.name || "—"}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{f.student?.class || "—"}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{f.title}</td>
                            <td className="px-4 py-2.5 text-foreground">₹{f.amount?.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-[hsl(var(--success))]">₹{f.paidAmount?.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-destructive font-medium">₹{(f.amount - f.paidAmount)?.toLocaleString()}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{f.dueDate?.slice(0, 10) || "—"}</td>
                            <td className="px-4 py-2.5">
                              <Badge variant="secondary" className={`text-xs capitalize ${f.status === "overdue" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-600"}`}>
                                {f.status}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {pendingFees.length > 25 && (
                      <p className="text-xs text-center text-muted-foreground py-3 border-t border-border">
                        Showing 25 of {pendingFees.length} records. Export CSV for the full list.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
