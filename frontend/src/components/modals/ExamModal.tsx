import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Exam } from "@/lib/mock-data";

interface ExamModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam?: Exam | null;
  onSave: (exam: Partial<Exam>) => void;
}

export function ExamModal({ open, onOpenChange, exam, onSave }: ExamModalProps) {
  const isEdit = !!exam;
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: exam?.name || "",
    class: exam?.class || "",
    subject: exam?.subject || "",
    date: exam?.date || "",
    totalMarks: String(exam?.totalMarks || "100"),
    status: exam?.status || "upcoming" as Exam["status"],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.subject.trim() || !form.date) {
      toast({ title: "Validation Error", description: "Name, subject, and date are required.", variant: "destructive" });
      return;
    }
    onSave({ ...form, id: exam?.id || `e${Date.now()}`, totalMarks: parseInt(form.totalMarks) || 100, status: form.status as Exam["status"] });
    onOpenChange(false);
    toast({ title: isEdit ? "Exam Updated" : "Exam Created", description: `${form.name} has been ${isEdit ? "updated" : "created"}.` });
  };

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Exam" : "Create New Exam"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Exam Name *</label>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="e.g. Mid-Term Examination" maxLength={100} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Class</label>
              <Input value={form.class} onChange={(e) => update("class", e.target.value)} placeholder="e.g. 10A" maxLength={10} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Subject *</label>
              <Input value={form.subject} onChange={(e) => update("subject", e.target.value)} placeholder="Subject" maxLength={50} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Date *</label>
              <Input type="date" value={form.date} onChange={(e) => update("date", e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Total Marks</label>
              <Input type="number" value={form.totalMarks} onChange={(e) => update("totalMarks", e.target.value)} min="1" max="1000" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Status</label>
            <Select value={form.status} onValueChange={(v) => update("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="ongoing">Ongoing</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{isEdit ? "Update" : "Create Exam"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
