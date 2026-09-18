import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HomeworkModal } from "@/components/modals/HomeworkModal";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { BookOpen, Plus, Search, Calendar, Users, Trash2, User } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";

interface HomeworkItem {
  id: string;
  title: string;
  subject: string;
  class: string;
  section: string;
  teacher: string;
  dueDate: string;
  description: string;
  status: "active" | "completed" | "overdue";
  submissions: number;
  totalStudents: number;
  assignedById?: string;
}

export default function Homework() {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canAssign = user?.role === "school_admin" || hasPermission("canAssignHomework");

  const [homework,   setHomework]   = useState<HomeworkItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [classFilter,setClassFilter]= useState("all");
  const [statusFilter,setStatusFilter]=useState("all");
  const [modalOpen,  setModalOpen]  = useState(false);
  const [deleteId,   setDeleteId]   = useState<string | null>(null);

  const normalize = (h: any): HomeworkItem => {
    const dueDate    = h.dueDate || h.due_date || "";
    const isOverdue  = dueDate && new Date(dueDate) < new Date() && !h.isCompleted;
    const status     = h.status || (h.isCompleted ? "completed" : isOverdue ? "overdue" : "active");
    const submissions= Array.isArray(h.submissions) ? h.submissions.length : (h.submissions ?? 0);
    return {
      id:           h._id || h.id,
      title:        h.title || "Untitled",
      subject:      h.subject || "",
      class:        h.class || h.className || "",
      section:      h.section || "",
      teacher:      h.assignedBy?.name || h.teacher || "",
      dueDate:      dueDate ? new Date(dueDate).toISOString().slice(0, 10) : "",
      description:  h.description || h.instructions || "",
      status,
      submissions,
      totalStudents: h.totalStudents ?? Math.max(submissions, 1),
      assignedById: h.assignedBy?._id || h.assignedBy,
    };
  };

  const fetchHomework = () => {
    setLoading(true);
    api.get("/homework")
      .then(res => {
        const raw = res.data?.data || res.data?.homework || (Array.isArray(res.data) ? res.data : []);
        setHomework(raw.map(normalize));
      })
      .catch(() => toast.error("Failed to load homework."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchHomework(); }, []);

  // unique class list for filter
  const classOptions = [...new Set(homework.map(h => h.class).filter(Boolean))].sort();

  const filtered = homework.filter(hw => {
    const matchSearch  = hw.title.toLowerCase().includes(search.toLowerCase()) || hw.subject.toLowerCase().includes(search.toLowerCase());
    const matchClass   = classFilter  === "all" || hw.class   === classFilter;
    const matchStatus  = statusFilter === "all" || hw.status  === statusFilter;
    return matchSearch && matchClass && matchStatus;
  });

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/homework/${deleteId}`);
      toast.success("Homework deleted.");
      fetchHomework();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete homework.");
    }
    setDeleteId(null);
  };

  const canDelete = (hw: HomeworkItem) => {
    if (user?.role === "school_admin") return true;
    if (user?.role === "teacher") return hw.assignedById === user.id;
    return false;
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":    return "bg-primary/10 text-primary";
      case "completed": return "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]";
      case "overdue":   return "bg-destructive/10 text-destructive";
      default:          return "bg-muted text-muted-foreground";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Homework</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {homework.length} assignment{homework.length !== 1 ? "s" : ""} total.
            </p>
          </div>
          {canAssign && (
            <Button className="gap-2" onClick={() => setModalOpen(true)}>
              <Plus className="h-4 w-4" /> New Assignment
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or subject…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {classOptions.length > 0 && (
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classOptions.map(c => (
                  <SelectItem key={c} value={c}>Class {c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="hover-lift animate-pulse">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-lg bg-muted shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="h-3 bg-muted rounded" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                  <div className="h-2 bg-muted rounded-full" />
                </CardContent>
              </Card>
            ))
          ) : filtered.map((hw) => (
            <Card key={hw.id} className="hover-lift">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-sm font-semibold truncate">{hw.title}</CardTitle>
                      <p className="text-xs text-muted-foreground">{hw.subject}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant="secondary" className={`text-xs capitalize ${statusBadge(hw.status)}`}>
                      {hw.status}
                    </Badge>
                    {canDelete(hw) && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => setDeleteId(hw.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground line-clamp-2">{hw.description}</p>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Due: {hw.dueDate}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Class {hw.class}{hw.section ? `-${hw.section}` : ""}
                  </span>
                  {hw.teacher && (
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {hw.teacher}
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Submissions</span>
                    <span className="font-medium text-foreground">
                      {hw.submissions}/{hw.totalStudents}
                    </span>
                  </div>
                  <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${Math.min(100, (hw.submissions / hw.totalStudents) * 100)}%` }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {!loading && filtered.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No homework found.</p>
              {canAssign && (
                <Button variant="outline" className="mt-3 gap-2" onClick={() => setModalOpen(true)}>
                  <Plus className="h-4 w-4" /> Assign First Homework
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <HomeworkModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSaved={fetchHomework}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={() => setDeleteId(null)}
        title="Delete Homework"
        description="Are you sure you want to delete this homework assignment? This cannot be undone."
        onConfirm={handleDelete}
      />
    </DashboardLayout>
  );
}
