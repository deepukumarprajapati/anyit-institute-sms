import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { TeacherModal } from "@/components/modals/TeacherModal";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import type { Teacher } from "@/lib/mock-data";
import { Search, Plus, Pencil, Trash2, Mail, Phone, GraduationCap, BookOpen, School } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface ClassOption { _id: string; name: string; section: string; }
interface RawTeacher extends Teacher {
  assignedClasses?: ClassOption[];
}

const Teachers = () => {
  const [teachers, setTeachers] = useState<RawTeacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editTeacher, setEditTeacher] = useState<RawTeacher | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const normalizeTeacher = (t: any): RawTeacher => ({
    id: t._id || t.id,
    name: t.name,
    subject: (t.subjects?.[0] || t.subject || ""),
    email: t.email || "",
    phone: t.phone || "",
    avatar: t.photo || t.avatar || "",
    classes: t.classes || [],
    qualification: t.qualification || "",
    experience: t.experience || "",
    joinDate: t.joinDate || t.createdAt || "",
    assignedClasses: Array.isArray(t.assignedClasses) ? t.assignedClasses : [],
  });

  const fetchTeachers = () => {
    setLoading(true);
    api.get("/admin/teachers")
      .then((res) => {
        const raw = res.data?.data || res.data?.teachers || res.data || [];
        setTeachers(Array.isArray(raw) ? raw.map(normalizeTeacher) : []);
      })
      .catch(() => toast.error("Failed to load teachers."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTeachers(); }, []);

  const filtered = teachers.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subject.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (data: Partial<Teacher> & { classIds?: string[] }) => {
    try {
      if (editTeacher) {
        await api.put(`/admin/teachers/${editTeacher.id}`, data);
        toast.success("Teacher updated.");
      } else {
        await api.post("/admin/teachers", data);
        toast.success("Teacher added.");
      }
      fetchTeachers();
    } catch {
      toast.error("Failed to save teacher.");
    }
    setEditTeacher(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/admin/teachers/${deleteId}`);
      toast.success("Teacher removed.");
      fetchTeachers();
    } catch {
      toast.error("Failed to remove teacher.");
    }
    setDeleteId(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Teachers</h1>
            <p className="text-sm text-muted-foreground mt-1">{teachers.length} teaching staff members.</p>
          </div>
          <Button className="gap-2" onClick={() => { setEditTeacher(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Teacher
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search teachers..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" maxLength={50} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="hover-lift">
                <CardContent className="p-5 space-y-3 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-muted shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3].map((j) => <div key={j} className="h-3 bg-muted rounded" />)}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : filtered.map((teacher) => (
            <Card key={teacher.id} className="hover-lift">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={teacher.avatar} />
                      <AvatarFallback className="bg-primary/10 text-primary">{teacher.name.split(" ").map(w => w[0]).join("").slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{teacher.name}</p>
                      <Badge variant="secondary" className="mt-1">{teacher.subject}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditTeacher(teacher); setModalOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(teacher.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /> {teacher.email}</div>
                  <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" /> {teacher.phone}</div>
                  <div className="flex items-center gap-2"><GraduationCap className="h-3.5 w-3.5" /> {teacher.qualification}</div>
                </div>

                {/* Assigned Classes display */}
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <School className="h-3.5 w-3.5" /> Assigned Classes
                  </p>
                  {teacher.assignedClasses && teacher.assignedClasses.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {teacher.assignedClasses.map((c) => (
                        <Badge key={c._id} variant="secondary" className="text-xs bg-primary/10 text-primary border-0">
                          {c.name}-{c.section}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No classes assigned</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <GraduationCap className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No teachers found.</p>
            </div>
          )}
        </div>
      </div>

      <TeacherModal open={modalOpen} onOpenChange={setModalOpen} teacher={editTeacher} onSave={handleSave} />
      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Remove Teacher" description="Are you sure you want to remove this teacher?" onConfirm={handleDelete} />
    </DashboardLayout>
  );
};

export default Teachers;
