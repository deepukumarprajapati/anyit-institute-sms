import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Student } from "@/lib/mock-data";
import api from "@/lib/api";

interface ClassOption { _id: string; name: string; section: string; }

interface StudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student?: Student | null;
  onSave: (student: Partial<Student & { studentClass?: string }>) => void;
  classOptions?: ClassOption[];
}

const EMPTY_FORM = {
  name: "", class: "", section: "", rollNumber: "",
  email: "", parentName: "", parentEmail: "", parentPhone: "", address: "", dateOfBirth: "",
};

export function StudentModal({ open, onOpenChange, student, onSave, classOptions: propClasses }: StudentModalProps) {
  const isEdit = !!student;
  const { toast } = useToast();

  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [classOptions, setClassOptions] = useState<ClassOption[]>(propClasses || []);
  const [classLoading, setClassLoading] = useState(false);

  // Sync prop classes whenever parent updates them
  useEffect(() => {
    if (propClasses && propClasses.length > 0) setClassOptions(propClasses);
  }, [propClasses]);

  // Fallback: fetch own classes if none passed from parent, re-fetch each time modal opens
  useEffect(() => {
    if (!open) return;
    if (propClasses && propClasses.length > 0) return;
    setClassLoading(true);
    api.get("/admin/classes")
      .then(res => setClassOptions(res.data?.data || []))
      .catch(() => toast({ title: "Error", description: "Could not load classes.", variant: "destructive" }))
      .finally(() => setClassLoading(false));
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset form whenever modal opens (or a different student is passed)
  useEffect(() => {
    if (!open) return;
    const f = {
      name:        student?.name        || "",
      class:       student?.class       || "",
      section:     student?.section     || "",
      rollNumber:  student?.rollNumber  || "",
      email:       student?.email       || "",
      parentName:  student?.parentName  || "",
      parentEmail: (student as any)?.parentEmail || "",
      parentPhone: student?.parentPhone || "",
      address:     student?.address     || "",
      dateOfBirth: student?.dateOfBirth || "",
    };
    setForm(f);
    // Pre-select matching class
    const match = classOptions.find(c => c.name === f.class && c.section === f.section);
    setSelectedClassId(match?._id || "");
  }, [open, student?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // When classOptions load after modal already open, try to match again
  useEffect(() => {
    if (!open || !classOptions.length) return;
    const match = classOptions.find(c => c.name === form.class && c.section === form.section);
    if (match) setSelectedClassId(match._id);
  }, [classOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  const update = (key: string, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleClassChange = (classId: string) => {
    setSelectedClassId(classId);
    const cls = classOptions.find(c => c._id === classId);
    if (cls) {
      update("class",   cls.name);
      update("section", cls.section);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast({ title: "Validation Error", description: "Name is required.", variant: "destructive" });
      return;
    }
    if (!form.class) {
      toast({ title: "Validation Error", description: "Please select a class.", variant: "destructive" });
      return;
    }
    onSave({
      ...form,
      studentClass: form.class, // backend createStudent expects 'studentClass'
      id: student?.id,
      feeStatus:     student?.feeStatus     || "pending",
      attendance:    student?.attendance    || 0,
      avatar:        student?.avatar        || "",
      admissionDate: student?.admissionDate || new Date().toISOString().split("T")[0],
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Student" : "Add New Student"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Full Name *</label>
              <Input value={form.name} onChange={e => update("name", e.target.value)} placeholder="Student name" maxLength={100} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input value={form.email} onChange={e => update("email", e.target.value)} placeholder="Email" type="email" maxLength={255} />
            </div>

            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-foreground">Class *</label>
              <Select value={selectedClassId} onValueChange={handleClassChange} disabled={classLoading}>
                <SelectTrigger>
                  <SelectValue placeholder={classLoading ? "Loading classes…" : "Select class"} />
                </SelectTrigger>
                <SelectContent>
                  {classOptions.length === 0 && !classLoading && (
                    <SelectItem value="__none__" disabled>No classes found. Create a class first.</SelectItem>
                  )}
                  {classOptions.map(c => (
                    <SelectItem key={c._id} value={c._id}>
                      Class {c.name} – {c.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.class && (
                <p className="text-xs text-muted-foreground">Selected: Class {form.class} – Section {form.section}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Roll Number</label>
              <Input value={form.rollNumber} onChange={e => update("rollNumber", e.target.value)} placeholder="Roll number" maxLength={20} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Date of Birth</label>
              <Input type="date" value={form.dateOfBirth} onChange={e => update("dateOfBirth", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Parent Name</label>
              <Input value={form.parentName} onChange={e => update("parentName", e.target.value)} placeholder="Parent name" maxLength={100} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Parent Phone</label>
              <Input value={form.parentPhone} onChange={e => update("parentPhone", e.target.value)} placeholder="Phone" maxLength={20} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <label className="text-sm font-medium text-foreground">Parent Email <span className="text-muted-foreground text-xs">(account credentials will be sent here)</span></label>
              <Input value={form.parentEmail} onChange={e => update("parentEmail", e.target.value)} placeholder="parent@email.com" type="email" maxLength={255} />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Address</label>
            <Input value={form.address} onChange={e => update("address", e.target.value)} placeholder="Address" maxLength={200} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={classLoading || !form.class}>{isEdit ? "Update" : "Add Student"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
