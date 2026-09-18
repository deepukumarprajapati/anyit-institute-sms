import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Teacher } from "@/lib/mock-data";
import api from "@/lib/api";
import { X, School, Loader2 } from "lucide-react";

interface ClassOption   { _id: string; name: string; section: string; }
interface SubjectOption { _id: string; name: string; code?: string; }

interface TeacherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  teacher?: (Teacher & { assignedClasses?: ClassOption[] }) | null;
  onSave: (teacher: Partial<Teacher> & { classIds?: string[] }) => void;
}

export function TeacherModal({ open, onOpenChange, teacher, onSave }: TeacherModalProps) {
  const isEdit = !!teacher;
  const { toast } = useToast();

  const [form, setForm] = useState({
    name:          teacher?.name || "",
    subject:       teacher?.subject || "",
    email:         teacher?.email || "",
    phone:         teacher?.phone || "",
    qualification: teacher?.qualification || "",
    experience:    teacher?.experience || "",
  });

  const [classes,        setClasses]        = useState<ClassOption[]>([]);
  const [subjects,       setSubjects]       = useState<SubjectOption[]>([]);
  const [subjectsLoading, setSubjectsLoading] = useState(false);
  const [selectedIds,    setSelectedIds]    = useState<string[]>(
    teacher?.assignedClasses?.map((c) => c._id) || []
  );

  // Reset form when teacher prop changes
  useEffect(() => {
    setForm({
      name:          teacher?.name || "",
      subject:       teacher?.subject || "",
      email:         teacher?.email || "",
      phone:         teacher?.phone || "",
      qualification: teacher?.qualification || "",
      experience:    teacher?.experience || "",
    });
    setSelectedIds(teacher?.assignedClasses?.map((c) => c._id) || []);
  }, [teacher]);

  // Fetch classes and subjects when modal opens
  useEffect(() => {
    if (!open) return;

    api.get("/admin/classes")
      .then((res) => {
        const raw = res.data?.data || [];
        setClasses(raw.map((c: any) => ({ _id: c._id, name: c.name, section: c.section })));
      })
      .catch(() => {});

    setSubjectsLoading(true);
    api.get("/subjects")
      .then((res) => {
        const raw = res.data?.data || res.data || [];
        setSubjects(Array.isArray(raw) ? raw.map((s: any) => ({ _id: s._id, name: s.name, code: s.code })) : []);
      })
      .catch(() => {})
      .finally(() => setSubjectsLoading(false));
  }, [open]);

  const toggleClass = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.subject.trim() || !form.email.trim()) {
      toast({ title: "Validation Error", description: "Name, subject, and email are required.", variant: "destructive" });
      return;
    }
    onSave({
      ...form,
      id: teacher?.id || `t${Date.now()}`,
      classIds: selectedIds,
      classes: teacher?.classes || [],
      avatar: teacher?.avatar || "",
      joinDate: teacher?.joinDate || new Date().toISOString().split("T")[0],
    });
    onOpenChange(false);
    toast({ title: isEdit ? "Teacher Updated" : "Teacher Added", description: `${form.name} has been ${isEdit ? "updated" : "added"} successfully.` });
  };

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Teacher" : "Add New Teacher"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Full Name *</label>
              <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Full name" maxLength={100} required />
            </div>

            {/* Subject — dynamic dropdown */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Subject *</label>
              {subjectsLoading ? (
                <div className="h-9 rounded-md border flex items-center px-3 gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
                </div>
              ) : subjects.length === 0 ? (
                <Input
                  value={form.subject}
                  onChange={(e) => update("subject", e.target.value)}
                  placeholder="Subject"
                  maxLength={50}
                  required
                />
              ) : (
                <Select
                  value={form.subject}
                  onValueChange={(v) => update("subject", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject…" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s._id} value={s.name}>
                        {s.name}{s.code ? ` (${s.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email *</label>
              <Input value={form.email} onChange={(e) => update("email", e.target.value)} type="email" placeholder="Email" maxLength={255} required disabled={isEdit} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Phone</label>
              <Input value={form.phone} onChange={(e) => update("phone", e.target.value)} placeholder="Phone" maxLength={20} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Qualification</label>
              <Input value={form.qualification} onChange={(e) => update("qualification", e.target.value)} placeholder="e.g. BSc, MSc" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Experience</label>
              <Input value={form.experience} onChange={(e) => update("experience", e.target.value)} placeholder="e.g. 5 years" maxLength={20} />
            </div>
          </div>

          {/* Assign Classes */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
              <School className="h-4 w-4 text-primary" /> Assign Classes
            </label>
            {classes.length === 0 ? (
              <p className="text-xs text-muted-foreground">No classes found. Create classes first.</p>
            ) : (
              <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-[#FFE8D6] bg-secondary/30 min-h-[52px]">
                {classes.map((c) => {
                  const selected = selectedIds.includes(c._id);
                  return (
                    <button
                      key={c._id}
                      type="button"
                      onClick={() => toggleClass(c._id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        selected
                          ? "bg-primary text-white border-primary"
                          : "bg-white text-muted-foreground border-[#FFE8D6] hover:border-primary/50"
                      }`}
                    >
                      {c.name}-{c.section}
                      {selected && <X className="h-3 w-3" />}
                    </button>
                  );
                })}
              </div>
            )}
            {selectedIds.length > 0 && (
              <p className="text-xs text-muted-foreground">{selectedIds.length} class{selectedIds.length > 1 ? "es" : ""} selected</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="btn-gradient border-0">{isEdit ? "Update" : "Add Teacher"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
