import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExamModal } from "@/components/modals/ExamModal";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import type { Exam } from "@/lib/mock-data";
import { FileText, Plus, Calendar, Pencil, Trash2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";

const Exams = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canCreate     = user?.role !== "teacher" || hasPermission("canCreateExam");
  const canEnterMarks = user?.role !== "teacher" || hasPermission("canEnterMarks");

  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editExam, setEditExam] = useState<Exam | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const normalizeExam = (e: any): Exam => ({
    id: e._id || e.id,
    name: e.title || e.name || "Untitled Exam",
    class: e.class || e.className || "",
    subject: e.subject || "",
    date: e.date ? new Date(e.date).toISOString().slice(0, 10) : (e.scheduledDate ? new Date(e.scheduledDate).toISOString().slice(0, 10) : ""),
    totalMarks: e.totalMarks ?? e.maxMarks ?? 100,
    status: e.status || "upcoming",
  });

  const fetchExams = () => {
    setLoading(true);
    api.get("/exams")
      .then((res) => {
        const raw = res.data?.exams || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setExams(raw.map(normalizeExam));
      })
      .catch(() => toast.error("Failed to load exams."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchExams(); }, []);

  const handleSave = async (data: Partial<Exam>) => {
    try {
      const payload = { ...data, title: data.name };
      if (editExam) {
        await api.put(`/exams/${editExam.id}`, payload);
        toast.success("Exam updated.");
      } else {
        await api.post("/exams", payload);
        toast.success("Exam created.");
      }
      fetchExams();
    } catch {
      toast.error("Failed to save exam.");
    }
    setEditExam(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/exams/${deleteId}`);
      toast.success("Exam deleted.");
      fetchExams();
    } catch (err: any) {
      if (err?.response?.status === 404 || err?.response?.status === 405) {
        toast.error("Delete not supported by server.");
      } else {
        toast.error("Failed to delete exam.");
      }
    }
    setDeleteId(null);
  };

  const statusStyle = (s: string) => {
    switch (s) {
      case "upcoming": return "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20";
      case "ongoing": return "bg-primary/10 text-primary border-primary/20";
      case "completed": return "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20";
      default: return "";
    }
  };

  const grouped = {
    upcoming: exams.filter((e) => e.status === "upcoming"),
    ongoing: exams.filter((e) => e.status === "ongoing"),
    completed: exams.filter((e) => e.status === "completed"),
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Exams</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage examinations and mark entry.</p>
          </div>
          <div className="flex gap-2">
            {canEnterMarks && <Button variant="outline" className="gap-2"><ClipboardList className="h-4 w-4" /> Enter Marks</Button>}
            {canCreate && (
              <Button className="gap-2" onClick={() => { setEditExam(null); setModalOpen(true); }}>
                <Plus className="h-4 w-4" /> Create Exam
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="hover-lift animate-pulse">
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                  <div className="h-3 bg-muted rounded" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          (["upcoming", "ongoing", "completed"] as const).map((status) => (
            grouped[status].length > 0 && (
              <div key={status}>
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{status} ({grouped[status].length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {grouped[status].map((exam) => (
                    <Card key={exam.id} className="hover-lift">
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{exam.name}</p>
                              <p className="text-xs text-muted-foreground">{exam.subject} · Class {exam.class}</p>
                            </div>
                          </div>
                          <Badge variant="secondary" className={`text-xs font-medium ${statusStyle(exam.status)}`}>{exam.status}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" /> {exam.date}
                          </div>
                          <span className="text-muted-foreground">Total: {exam.totalMarks}</span>
                        </div>
                        {canCreate && (
                          <div className="flex gap-1 mt-3 pt-3 border-t border-border">
                            <Button variant="ghost" size="sm" className="flex-1 text-xs" onClick={() => { setEditExam(exam); setModalOpen(true); }}>
                              <Pencil className="h-3 w-3 mr-1" /> Edit
                            </Button>
                            <Button variant="ghost" size="sm" className="flex-1 text-xs text-destructive" onClick={() => setDeleteId(exam.id)}>
                              <Trash2 className="h-3 w-3 mr-1" /> Delete
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )
          ))
        )}

        {!loading && exams.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No exams found.</p>
          </div>
        )}
      </div>

      <ExamModal open={modalOpen} onOpenChange={setModalOpen} exam={editExam} onSave={handleSave} />
      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Exam" description="Are you sure you want to delete this exam?" onConfirm={handleDelete} />
    </DashboardLayout>
  );
};

export default Exams;
