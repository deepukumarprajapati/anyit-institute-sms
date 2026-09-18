import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  CreditCard, Loader2, CheckCircle2, Clock, AlertCircle,
  Download, TrendingUp, Wallet, FileText, Printer
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";

interface FeeRecord {
  _id: string;
  title: string;
  amount: number;
  paidAmount: number;
  dueDate: string;
  paidDate?: string;
  status: "paid" | "pending" | "partial" | "overdue";
  paymentMode?: string;
  receiptNo?: string;
  isVirtual?: boolean;
  feeStructure?: any;
}

interface ChildFees {
  studentId: string;
  studentName: string;
  studentClass: string;
  section: string;
  fees: FeeRecord[];
  summary: { paid: number; pending: number; total: number };
}

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default function ParentFeesPage() {
  const [children, setChildren] = useState<ChildFees[]>([]);
  const [selectedChild, setSelectedChild] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [payModal, setPayModal] = useState<{ open: boolean; fee: FeeRecord | null }>({ open: false, fee: null });
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState("online");
  const [transactionId, setTransactionId] = useState("");
  const [paying, setPaying] = useState(false);
  const [activeTab, setActiveTab] = useState<"records" | "monthly">("records");

  const fetchFees = async () => {
    try {
      const dashRes = await api.get("/dashboard/parent");
      const kids = dashRes.data.data.children || [];
      const results = await Promise.all(
        kids.map(async (k: any) => {
          try {
            const feeRes = await api.get(`/fees/student/${k.student._id}`);
            console.log("[ParentFees] raw response for", k.student.name, ":", feeRes.data);
            const fees   = feeRes.data?.data?.fees    || [];
            const summary = feeRes.data?.data?.summary || { paid: 0, pending: 0, total: 0 };
            return {
              studentId:   k.student._id,
              studentName: k.student.name,
              studentClass: k.student.class,
              section:     k.student.section,
              fees, summary,
            };
          } catch (err: any) {
            const msg = err?.response?.data?.message || err?.message || "Unknown error";
            console.error("[ParentFees] fee fetch error for", k.student.name, ":", msg, "status:", err?.response?.status);
            toast.error(`Fee load failed for ${k.student.name}: ${msg}`);
            return { studentId: k.student._id, studentName: k.student.name, studentClass: k.student.class, section: k.student.section, fees: [], summary: { paid: 0, pending: 0, total: 0 } };
          }
        })
      );
      setChildren(results);
    } catch (err: any) {
      setError(err?.response?.data?.message || "Failed to load dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFees(); }, []);

  const handlePay = async () => {
    if (!payModal.fee) return;
    if (!payAmount || parseFloat(payAmount) <= 0) { toast.error("Enter a valid amount."); return; }
    setPaying(true);
    try {
      const child = children[selectedChild];
      const isVirtual = payModal.fee.isVirtual;
      const body: any = {
        paidAmount: parseFloat(payAmount),
        paymentMode: payMode,
        transactionId,
      };
      if (isVirtual) body.feeStructureId = payModal.fee.feeStructure?._id || payModal.fee.feeStructure || payModal.fee._id;
      else body.feePaymentId = payModal.fee._id;

      await api.post(`/fees/parent-pay/${child.studentId}`, body);
      toast.success("Payment submitted successfully!");
      setPayModal({ open: false, fee: null });
      setPayAmount(""); setPayMode("online"); setTransactionId("");
      setLoading(true);
      await fetchFees();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Payment failed.");
    } finally {
      setPaying(false);
    }
  };

  const openPay = (fee: FeeRecord) => {
    setPayAmount(String(fee.amount - (fee.paidAmount || 0)));
    setPayModal({ open: true, fee });
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" /> Loading fee details...
      </div>
    </DashboardLayout>
  );

  if (error) return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64 text-destructive">{error}</div>
    </DashboardLayout>
  );

  const child = children[selectedChild];
  const fees = child?.fees || [];

  const filtered = filterStatus === "all" ? fees : fees.filter(f => f.status === filterStatus);

  // Monthly breakdown
  const monthlyMap: Record<string, { paid: number; pending: number; fees: FeeRecord[] }> = {};
  fees.forEach(fee => {
    const d = fee.dueDate ? new Date(fee.dueDate) : null;
    const key = d ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : "Unknown";
    if (!monthlyMap[key]) monthlyMap[key] = { paid: 0, pending: 0, fees: [] };
    if (fee.status === "paid") monthlyMap[key].paid += fee.paidAmount || 0;
    else monthlyMap[key].pending += fee.amount - (fee.paidAmount || 0);
    monthlyMap[key].fees.push(fee);
  });

  const statusIcon = (status: string) => {
    if (status === "paid") return <CheckCircle2 className="h-4 w-4 text-success shrink-0" />;
    if (status === "overdue") return <AlertCircle className="h-4 w-4 text-destructive shrink-0" />;
    return <Clock className="h-4 w-4 text-warning shrink-0" />;
  };

  const statusBadgeCls = (status: string) => {
    if (status === "paid") return "bg-success/10 text-success border-0";
    if (status === "overdue") return "bg-destructive/10 text-destructive border-0";
    if (status === "partial") return "bg-blue-500/10 text-blue-600 border-0";
    return "bg-warning/10 text-warning border-0";
  };

  const canPay = (fee: FeeRecord) => fee.status !== "paid";
  const remaining = (fee: FeeRecord) => fee.amount - (fee.paidAmount || 0);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading">Fee Details</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Complete fee structure and payment history for your child.
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Child selector */}
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
            <Button variant="outline" size="sm" className="gap-2 border-border" onClick={handlePrint}>
              <Printer className="h-4 w-4" /> Print
            </Button>
          </div>
        </div>

        {!child ? (
          <p className="text-center text-muted-foreground py-20">No fee data found.</p>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card overflow-hidden hover-lift">
                <div className="gradient-green p-5 text-white relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium opacity-90">Total Paid</p>
                      <p className="text-2xl font-bold mt-1 font-mono-stats">Rs.{child.summary.paid.toLocaleString()}</p>
                      <p className="text-xs opacity-80 mt-1">{fees.filter(f => f.status === "paid").length} payments</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card overflow-hidden hover-lift">
                <div className="gradient-orange p-5 text-white relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium opacity-90">Total Pending</p>
                      <p className="text-2xl font-bold mt-1 font-mono-stats">Rs.{child.summary.pending.toLocaleString()}</p>
                      <p className="text-xs opacity-80 mt-1">{fees.filter(f => f.status !== "paid").length} dues</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Clock className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card overflow-hidden hover-lift">
                <div className="gradient-blue p-5 text-white relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium opacity-90">Total Fees</p>
                      <p className="text-2xl font-bold mt-1 font-mono-stats">Rs.{child.summary.total.toLocaleString()}</p>
                      <p className="text-xs opacity-80 mt-1">{fees.length} records</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                      <Wallet className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card overflow-hidden hover-lift">
                <div className="gradient-cyan p-5 text-white relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
                  <div className="relative flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium opacity-90">Overdue</p>
                      <p className="text-2xl font-bold mt-1 font-mono-stats">
                        Rs.{fees.filter(f => f.status === "overdue").reduce((s, f) => s + remaining(f), 0).toLocaleString()}
                      </p>
                      <p className="text-xs opacity-80 mt-1">{fees.filter(f => f.status === "overdue").length} overdue</p>
                    </div>
                    <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                      <AlertCircle className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            {child.summary.total > 0 && (
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" /> Payment Progress
                  </p>
                  <p className="text-sm font-bold text-primary font-mono-stats">
                    {Math.round((child.summary.paid / child.summary.total) * 100)}% paid
                  </p>
                </div>
                <div className="w-full h-3 bg-secondary rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${Math.min(100, Math.round((child.summary.paid / child.summary.total) * 100))}%`, background: "linear-gradient(90deg, hsl(var(--primary)), #FF9A5A)" }} />
                </div>
                <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                  <span>Paid: Rs.{child.summary.paid.toLocaleString()}</span>
                  <span>Remaining: Rs.{child.summary.pending.toLocaleString()}</span>
                </div>
              </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-border">
              {(["records", "monthly"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2.5 text-sm font-medium capitalize transition-all border-b-2 -mb-px ${
                    activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}>
                  {tab === "records" ? "Fee Records" : "Monthly Breakdown"}
                </button>
              ))}
            </div>

            {activeTab === "records" && (
              <div className="glass-card">
                <div className="p-4 border-b border-border flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-base font-semibold font-heading flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-primary" />
                    Fee Records — Class {child.studentClass}
                  </h3>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="p-4">
                  {filtered.length === 0 ? (
                    <div className="text-center py-14">
                      <CreditCard className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground text-sm">No fee records found.</p>
                      <p className="text-xs text-muted-foreground mt-1">Fee structures are set by school admin.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filtered.map((fee) => (
                        <div key={String(fee._id)}
                          className="flex items-center justify-between p-4 rounded-xl border border-border hover:bg-secondary/30 transition-colors gap-4 flex-wrap">
                          <div className="flex items-center gap-3 min-w-0">
                            {statusIcon(fee.status)}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{fee.title}</p>
                              <p className="text-xs text-muted-foreground">
                                Due: {fee.dueDate ? new Date(fee.dueDate).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                              </p>
                              {fee.paidDate && (
                                <p className="text-xs text-success">
                                  Paid on: {new Date(fee.paidDate).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                                </p>
                              )}
                              {fee.receiptNo && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                  <FileText className="h-3 w-3" /> {fee.receiptNo}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-4 shrink-0">
                            <div className="text-right">
                              <p className="text-base font-bold font-mono-stats text-foreground">Rs.{fee.amount.toLocaleString()}</p>
                              {fee.paidAmount > 0 && fee.status !== "paid" && (
                                <p className="text-xs text-muted-foreground">
                                  Paid: Rs.{fee.paidAmount.toLocaleString()} · Due: Rs.{remaining(fee).toLocaleString()}
                                </p>
                              )}
                            </div>
                            <Badge className={statusBadgeCls(fee.status)}>{fee.status}</Badge>
                            {canPay(fee) && (
                              <Button size="sm" className="btn-gradient border-0 rounded-lg text-xs h-8 px-3" onClick={() => openPay(fee)}>
                                Pay Now
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "monthly" && (
              <div className="glass-card">
                <div className="p-4 border-b border-border">
                  <h3 className="text-base font-semibold font-heading flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" /> Monthly Fee Breakdown
                  </h3>
                </div>
                <div className="p-4">
                  {Object.keys(monthlyMap).length === 0 ? (
                    <p className="text-center text-muted-foreground py-10 text-sm">No monthly records found.</p>
                  ) : (
                    <div className="space-y-4">
                      {Object.entries(monthlyMap).map(([month, data]) => (
                        <div key={month} className="rounded-xl border border-border overflow-hidden">
                          <div className="flex items-center justify-between px-4 py-3 bg-secondary/50">
                            <p className="text-sm font-semibold text-foreground">{month}</p>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-success font-medium">Paid: Rs.{data.paid.toLocaleString()}</span>
                              {data.pending > 0 && <span className="text-destructive font-medium">Pending: Rs.{data.pending.toLocaleString()}</span>}
                            </div>
                          </div>
                          <div className="divide-y divide-border">
                            {data.fees.map(fee => (
                              <div key={String(fee._id)} className="flex items-center justify-between px-4 py-3 hover:bg-secondary/20 transition-colors">
                                <div className="flex items-center gap-2">
                                  {statusIcon(fee.status)}
                                  <p className="text-sm text-foreground">{fee.title}</p>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-sm font-semibold font-mono-stats">Rs.{fee.amount.toLocaleString()}</span>
                                  <Badge className={`${statusBadgeCls(fee.status)} text-xs`}>{fee.status}</Badge>
                                  {canPay(fee) && (
                                    <Button size="sm" variant="outline" className="h-7 px-2 text-xs border-primary text-primary hover:bg-primary/5" onClick={() => openPay(fee)}>
                                      Pay
                                    </Button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Pay Modal */}
      <Dialog open={payModal.open} onOpenChange={o => { if (!o) setPayModal({ open: false, fee: null }); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" /> Pay Fee
            </DialogTitle>
          </DialogHeader>
          {payModal.fee && (
            <div className="space-y-4 py-2">
              <div className="p-4 rounded-xl bg-secondary/50 border border-border space-y-1">
                <p className="text-sm font-semibold text-foreground">{payModal.fee.title}</p>
                <p className="text-xs text-muted-foreground">
                  Total: Rs.{payModal.fee.amount.toLocaleString()} · Remaining: Rs.{remaining(payModal.fee).toLocaleString()}
                </p>
                {payModal.fee.dueDate && (
                  <p className="text-xs text-muted-foreground">
                    Due: {new Date(payModal.fee.dueDate).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Amount to Pay (Rs.) *</label>
                <Input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)}
                  max={remaining(payModal.fee)} placeholder="Enter amount" />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">Payment Method</label>
                <Select value={payMode} onValueChange={setPayMode}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="online">Online Transfer</SelectItem>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="dd">Demand Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(payMode === "online") && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Transaction ID (optional)</label>
                  <Input value={transactionId} onChange={e => setTransactionId(e.target.value)} placeholder="TXN123456" />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayModal({ open: false, fee: null })}>Cancel</Button>
            <Button className="btn-gradient border-0" onClick={handlePay} disabled={paying}>
              {paying ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Processing...</> : "Submit Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
