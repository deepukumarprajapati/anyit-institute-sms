import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, BookOpen } from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface ClassOption   { _id: string; name: string; section: string }
interface SubjectOption { _id: string; name: string; code: string }

interface HomeworkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

const EMPTY = { title: "", description: "", dueDate: "", maxMarks: "" };

export function HomeworkModal({ open, onOpenChange, onSaved }: HomeworkModalProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "school_admin";

  const [form,           setForm]           = useState(EMPTY);
  const [classes,        setClasses]        = useState<ClassOption[]>([]);
  const [selectedClassId,setSelectedClassId]= useState("");
  const [subjects,       setSubjects]       = useState<SubjectOption[]>([]);
  const [selectedSubject,setSelectedSubject]= useState("");
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [loadingSubjects,setLoadingSubjects]= useState(false);
  const [submitting,     setSubmitting]     = useState(false);

  // ── Step 1: load classes when modal opens ─────────────────────────────────
  useEffect(() => {
    if (!open) return;

    // reset everything
    setForm(EMPTY);
    setSelectedClassId("");
    setSubjects([]);
    setSelectedSubject("");

    setLoadingClasses(true);
    const endpoint = isAdmin ? "/admin/classes" : "/teachers/me";

    api.get(endpoint)
      .then(res => {
        if (isAdmin) {
          setClasses(res.data?.data || []);
        } else {
          // teacher profile returns populated assignedClasses
          const profile = res.data?.data;
          const assigned: ClassOption[] = profile?.assignedClasses || [];
          setClasses(assigned);
          if (assigned.length === 0) {
            toast.error("No classes are assigned to you yet. Ask your admin to assign a class.");
          }
        }
      })
      .catch(() => toast.error("Failed to load classes."))
      .finally(() => setLoadingClasses(false));
  }, [open, isAdmin]);

  // ── Step 2: load subjects when a class is selected ────────────────────────
  useEffect(() => {
    if (!selectedClassId) return;

    setSubjects([]);
    setSelectedSubject("");
    setLoadingSubjects(true);

    api.get(`/subjects/class/${selectedClassId}`)
      .then(res => {
        const data: SubjectOption[] = res.data?.data || [];
        setSubjects(data);
        if (data.length === 0) {
          toast.info("No subjects assigned to this class yet. You can still type a subject name.");
        }
      })
      .catch(() => toast.error("Failed to load subjects for this class."))
      .finally(() => setLoadingSubjects(false));
  }, [selectedClassId]);

  const selectedClass = classes.find(c => c._id === selectedClassId);
  const update = (k: keyof typeof EMPTY, v: string) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId)       return toast.error("Please select a class.");
    if (!selectedSubject.trim())return toast.error("Please select or enter a subject.");
    if (!form.title.trim())     return toast.error("Title is required.");
    if (!form.description.trim())return toast.error("Instructions are required.");
    if (!form.dueDate)          return toast.error("Due date is required.");
    if (!selectedClass)         return;

    setSubmitting(true);
    try {
      await api.post("/homework", {
        title:       form.title.trim(),
        description: form.description.trim(),
        subject:     selectedSubject.trim(),
        class:       selectedClass.name,
        section:     selectedClass.section,
        dueDate:     form.dueDate,
        maxMarks:    form.maxMarks ? Number(form.maxMarks) : null,
      });
      toast.success("Homework assigned successfully.");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to assign homework.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            New Homework Assignment
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">

          {/* ── Step 1: Class ── */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              Class <span className="text-destructive">*</span>
            </label>
            {loadingClasses ? (
              <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading classes…
              </div>
            ) : classes.length === 0 ? (
              <div className="flex items-center gap-2 h-10 px-3 border border-destructive/40 rounded-md bg-destructive/5 text-sm text-destructive">
                {isAdmin ? "No classes created yet." : "No classes assigned to you yet."}
              </div>
            ) : (
              <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a class first…" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c._id} value={c._id}>
                      Class {c.name} – Section {c.section}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* ── Step 2: Subject (visible only after class is selected) ── */}
          {selectedClassId && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                Subject <span className="text-destructive">*</span>
              </label>
              {loadingSubjects ? (
                <div className="flex items-center gap-2 h-10 px-3 border rounded-md bg-muted/50 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading subjects…
                </div>
              ) : subjects.length > 0 ? (
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s._id} value={s.name}>
                        {s.name} <span className="text-muted-foreground text-xs ml-1">({s.code})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                // No subjects assigned to class — free text fallback
                <Input
                  value={selectedSubject}
                  onChange={e => setSelectedSubject(e.target.value)}
                  placeholder="Type subject name (e.g. Mathematics)"
                  maxLength={100}
                />
              )}
              {subjects.length === 0 && !loadingSubjects && (
                <p className="text-xs text-muted-foreground">
                  No subjects assigned to this class. Type manually or assign subjects from{" "}
                  <span className="font-medium">Subject Management</span>.
                </p>
              )}
            </div>
          )}

          {/* ── Remaining fields (shown after class is picked) ── */}
          {selectedClassId && !loadingSubjects && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Title <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.title}
                  onChange={e => update("title", e.target.value)}
                  placeholder="e.g. Chapter 5 – Exercise 2"
                  maxLength={200}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground">
                  Instructions <span className="text-destructive">*</span>
                </label>
                <Textarea
                  value={form.description}
                  onChange={e => update("description", e.target.value)}
                  placeholder="Describe the homework task in detail…"
                  rows={4}
                  maxLength={1000}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">
                    Due Date <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={e => update("dueDate", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-foreground">Max Marks</label>
                  <Input
                    type="number"
                    value={form.maxMarks}
                    onChange={e => update("maxMarks", e.target.value)}
                    placeholder="Optional"
                    min={1}
                    max={1000}
                  />
                </div>
              </div>
            </>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || loadingClasses || classes.length === 0 || !selectedClassId}
            >
              {submitting
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Assigning…</>
                : "Assign Homework"
              }
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
