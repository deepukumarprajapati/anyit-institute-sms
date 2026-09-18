import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NoticeModal } from "@/components/modals/NoticeModal";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import type { Notice } from "@/lib/mock-data";
import { Megaphone, Plus, Calendar, Pencil, Trash2, AlertTriangle, Info, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/contexts/PermissionsContext";

const Notices = () => {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();
  const canPost = user?.role !== "parent" && (user?.role !== "teacher" || hasPermission("canPostNotice"));

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editNotice, setEditNotice] = useState<Notice | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const normalizeNotice = (n: any): Notice => ({
    id: n._id || n.id,
    title: n.title || "Untitled",
    description: n.content || n.description || n.body || "",
    date: n.date ? new Date(n.date).toISOString().slice(0, 10) : (n.createdAt ? new Date(n.createdAt).toISOString().slice(0, 10) : ""),
    author: n.postedBy?.name || n.author || n.createdBy?.name || "Admin",
    priority: n.priority || (n.isUrgent ? "high" : "medium"),
  });

  const fetchNotices = () => {
    setLoading(true);
    api.get("/notices")
      .then((res) => {
        const raw = res.data?.notices || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setNotices(raw.map(normalizeNotice));
      })
      .catch(() => toast.error("Failed to load notices."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchNotices(); }, []);

  const handleSave = async (data: Partial<Notice>) => {
    // Map frontend Notice shape → backend Notice model fields
    const payload = {
      title:    data.title,
      content:  data.description,                      // modal field "description" → model field "content"
      isUrgent: data.priority === "high",              // priority "high" → isUrgent true
      category: data.priority === "high" ? "urgent" : "general",
    };
    try {
      if (editNotice) {
        await api.put(`/notices/${editNotice.id}`, payload);
        toast.success("Notice updated.");
      } else {
        await api.post("/notices", payload);
        toast.success("Notice posted.");
      }
      fetchNotices();
    } catch {
      toast.error("Failed to save notice.");
    }
    setEditNotice(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/notices/${deleteId}`);
      toast.success("Notice deleted.");
      fetchNotices();
    } catch {
      toast.error("Failed to delete notice.");
    }
    setDeleteId(null);
  };

  const priorityIcon = (p: string) => {
    switch (p) {
      case "high": return <AlertTriangle className="h-4 w-4 text-destructive" />;
      case "medium": return <Info className="h-4 w-4 text-[hsl(var(--warning))]" />;
      default: return <CheckCircle className="h-4 w-4 text-[hsl(var(--success))]" />;
    }
  };

  const priorityStyle = (p: string) => {
    switch (p) {
      case "high": return "bg-destructive/10 text-destructive border-destructive/20";
      case "medium": return "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20";
      default: return "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notice Board</h1>
            <p className="text-sm text-muted-foreground mt-1">{notices.length} announcements posted.</p>
          </div>
          {canPost && (
            <Button className="gap-2" onClick={() => { setEditNotice(null); setModalOpen(true); }}>
              <Plus className="h-4 w-4" /> New Notice
            </Button>
          )}
        </div>

        <div className="space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="hover-lift animate-pulse">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className="h-4 w-4 rounded bg-muted mt-1 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-2/3" />
                      <div className="h-3 bg-muted rounded w-full" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : notices.map((notice) => (
            <Card key={notice.id} className="hover-lift">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="mt-0.5">{priorityIcon(notice.priority)}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-semibold text-foreground">{notice.title}</h3>
                        <Badge variant="secondary" className={`text-xs font-medium ${priorityStyle(notice.priority)}`}>
                          {notice.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{notice.description}</p>
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {notice.date}</span>
                        <span>By {notice.author}</span>
                      </div>
                    </div>
                  </div>
                  {canPost && (
                    <div className="flex gap-1 ml-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditNotice(notice); setModalOpen(true); }}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(notice.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {!loading && notices.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No notices posted yet.</p>
            </div>
          )}
        </div>
      </div>

      <NoticeModal open={modalOpen} onOpenChange={setModalOpen} notice={editNotice} onSave={handleSave} />
      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Notice" description="Are you sure you want to delete this notice?" onConfirm={handleDelete} />
    </DashboardLayout>
  );
};

export default Notices;
