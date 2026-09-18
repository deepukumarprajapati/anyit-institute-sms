import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClassModal } from "@/components/modals/ClassModal";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import type { ClassData } from "@/lib/mock-data";
import { School, Plus, Search, Users, Pencil, Trash2, MapPin, GraduationCap } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

interface TeacherAssignment { _id: string; name: string; assignedClass?: { _id: string } | null; }

export default function Classes() {
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [teachers, setTeachers] = useState<TeacherAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editClass, setEditClass] = useState<ClassData | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const normalizeClass = (c: any): ClassData => ({
    id: c._id || c.id,
    name: c.name || c.className || `Class ${c.grade || ""}`,
    section: c.section || c.sectionName || "",
    classTeacher: c.classTeacher?.name || c.classTeacher || c.teacher?.name || "",
    studentCount: c.studentCount ?? c.students?.length ?? 0,
    room: c.room || c.roomNumber || "",
  });

  const fetchClasses = () => {
    setLoading(true);
    api.get("/admin/classes")
      .then((res) => {
        const raw = res.data?.classes || res.data?.data || (Array.isArray(res.data) ? res.data : []);
        setClasses(raw.map(normalizeClass));
      })
      .catch(() => toast.error("Failed to load classes."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchClasses();
    api.get("/admin/teachers")
      .then((res) => {
        const raw = res.data?.data || [];
        setTeachers(raw.map((t: any) => ({
          _id: t._id,
          name: t.name,
          assignedClass: t.assignedClass || null,
        })));
      })
      .catch(() => {});
  }, []);

  const getAssignedTeacher = (classId: string) =>
    teachers.find((t) => t.assignedClass?._id === classId);

  const filtered = classes.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.section.toLowerCase().includes(search.toLowerCase()) ||
      c.classTeacher.toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async (data: Partial<ClassData>) => {
    try {
      if (editClass) {
        await api.put(`/admin/classes/${editClass.id}`, data);
        toast.success("Class updated.");
      } else {
        await api.post("/admin/classes", data);
        toast.success("Class created.");
      }
      fetchClasses();
    } catch {
      toast.error("Failed to save class.");
    }
    setEditClass(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/admin/classes/${deleteId}`);
      toast.success("Class deleted.");
      fetchClasses();
    } catch {
      toast.error("Failed to delete class.");
    }
    setDeleteId(null);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Classes</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage classes and sections.</p>
          </div>
          <Button className="gap-2" onClick={() => { setEditClass(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4" /> Create Class
          </Button>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search classes..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" maxLength={50} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="hover-lift animate-pulse">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-muted shrink-0" />
                    <div className="flex-1 space-y-1">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="h-3 bg-muted rounded" />
                </CardContent>
              </Card>
            ))
          ) : filtered.map((c) => (
            <Card key={c.id} className="hover-lift">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <School className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{c.name} - {c.section}</CardTitle>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {getAssignedTeacher(c.id)?.name || "No teacher assigned"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditClass(c); setModalOpen(true); }}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4" /> {c.studentCount} students
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" /> {c.room}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <School className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No classes found.</p>
            </div>
          )}
        </div>
      </div>

      <ClassModal open={modalOpen} onOpenChange={setModalOpen} classData={editClass} onSave={handleSave} />
      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Class" description="Are you sure you want to delete this class? This action cannot be undone." onConfirm={handleDelete} />
    </DashboardLayout>
  );
}
