import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { ClassData } from "@/lib/mock-data";

interface ClassModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classData?: ClassData | null;
  onSave: (classData: Partial<ClassData>) => void;
}

export function ClassModal({ open, onOpenChange, classData, onSave }: ClassModalProps) {
  const isEdit = !!classData;
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: classData?.name || "",
    section: classData?.section || "",
    room: classData?.room || "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.section.trim()) {
      toast({ title: "Validation Error", description: "Class name and section are required.", variant: "destructive" });
      return;
    }
    onSave({ ...form, id: classData?.id || `c${Date.now()}`, studentCount: classData?.studentCount || 0 });
    onOpenChange(false);
    toast({ title: isEdit ? "Class Updated" : "Class Created", description: `${form.name} ${form.section} has been ${isEdit ? "updated" : "created"}.` });
  };

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Class" : "Create New Class"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Class Name *</label>
              <Select value={form.name} onValueChange={(v) => update("name", v)}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {["Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Section *</label>
              <Select value={form.section} onValueChange={(v) => update("section", v)}>
                <SelectTrigger><SelectValue placeholder="Section" /></SelectTrigger>
                <SelectContent>
                  {["A", "B", "C", "D"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Room</label>
            <Input value={form.room} onChange={(e) => update("room", e.target.value)} placeholder="e.g. Room 101" maxLength={20} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{isEdit ? "Update" : "Create Class"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
