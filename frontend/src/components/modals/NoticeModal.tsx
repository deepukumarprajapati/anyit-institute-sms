import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { Notice } from "@/lib/mock-data";

interface NoticeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notice?: Notice | null;
  onSave: (notice: Partial<Notice>) => void;
}

export function NoticeModal({ open, onOpenChange, notice, onSave }: NoticeModalProps) {
  const isEdit = !!notice;
  const { toast } = useToast();
  const [form, setForm] = useState({
    title:       notice?.title       || "",
    description: notice?.description || "",
    priority:    (notice?.priority   || "medium") as Notice["priority"],
    author:      notice?.author      || "",
  });

  // Reset form whenever the modal opens or the notice being edited changes
  useEffect(() => {
    setForm({
      title:       notice?.title       || "",
      description: notice?.description || "",
      priority:    (notice?.priority   || "medium") as Notice["priority"],
      author:      notice?.author      || "",
    });
  }, [notice, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) {
      toast({ title: "Validation Error", description: "Title and description are required.", variant: "destructive" });
      return;
    }
    if (form.title.trim().length > 200 || form.description.trim().length > 1000) {
      toast({ title: "Validation Error", description: "Title or description is too long.", variant: "destructive" });
      return;
    }
    onSave({ ...form, id: notice?.id || `n${Date.now()}`, date: notice?.date || new Date().toISOString().split("T")[0], priority: form.priority as Notice["priority"] });
    onOpenChange(false);
    toast({ title: isEdit ? "Notice Updated" : "Notice Published", description: `"${form.title}" has been ${isEdit ? "updated" : "published"}.` });
  };

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Notice" : "Create New Notice"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Title *</label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Notice title" maxLength={200} required />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Description *</label>
            <Textarea value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Write notice details..." maxLength={1000} rows={4} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Priority</label>
              <Select value={form.priority} onValueChange={(v) => update("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Author</label>
              <Input value={form.author} onChange={(e) => update("author", e.target.value)} placeholder="Author name" maxLength={100} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">{isEdit ? "Update" : "Publish Notice"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
