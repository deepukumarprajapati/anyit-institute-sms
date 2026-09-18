import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  BookOpen, School, LayoutGrid, Plus, Pencil, Trash2, Check,
  X, ChevronDown, ChevronRight, Copy, Users, Link2, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Subject {
  _id: string;
  name: string;
  code: string;
  description: string;
}

interface ClassItem {
  _id: string;
  name: string;
  section: string;
  grade: string;
}

interface ClassWithSubjects {
  _id: string;
  name: string;
  section: string;
  assignedSubjects: Subject[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_FORM = { name: "", code: "", description: "" };

// ─── Component ────────────────────────────────────────────────────────────────

export default function SubjectClassAssignment() {
  // ── Remote data ──────────────────────────────────────────────────────────
  const [subjects,         setSubjects]         = useState<Subject[]>([]);
  const [classes,          setClasses]          = useState<ClassItem[]>([]);
  const [classAssignments, setClassAssignments] = useState<ClassWithSubjects[]>([]);

  const [subjectsLoading,    setSubjectsLoading]    = useState(true);
  const [classesLoading,     setClassesLoading]     = useState(true);
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);

  // ── Subject dialog state ──────────────────────────────────────────────────
  const [subjectDialog,  setSubjectDialog]  = useState(false);
  const [editSubject,    setEditSubject]    = useState<Subject | null>(null);
  const [subjectForm,    setSubjectForm]    = useState(EMPTY_FORM);
  const [subjectErrors,  setSubjectErrors]  = useState<Record<string, string>>({});
  const [savingSubject,  setSavingSubject]  = useState(false);
  const [deleteSubjectId, setDeleteSubjectId] = useState<string | null>(null);
  const [deletingSubject,  setDeletingSubject]  = useState(false);

  // ── Assignment UI state ───────────────────────────────────────────────────
  const [singleClassId,   setSingleClassId]   = useState("");
  const [singleSubjectIds, setSingleSubjectIds] = useState<Set<string>>(new Set());
  const [bulkClassIds,    setBulkClassIds]    = useState<Set<string>>(new Set());
  const [bulkSubjectIds,  setBulkSubjectIds]  = useState<Set<string>>(new Set());
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [assigning,       setAssigning]       = useState(false);

  // ── Fetch helpers ─────────────────────────────────────────────────────────
  const fetchSubjects = useCallback(() => {
    setSubjectsLoading(true);
    api.get("/subjects")
      .then((res) => setSubjects(res.data?.data ?? []))
      .catch(() => toast.error("Failed to load subjects"))
      .finally(() => setSubjectsLoading(false));
  }, []);

  const fetchClasses = useCallback(() => {
    setClassesLoading(true);
    api.get("/admin/classes")
      .then((res) => {
        const raw: any[] = res.data?.classes ?? res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
        setClasses(raw.map((c) => ({
          _id:     c._id ?? c.id,
          name:    c.name ?? c.className ?? "",
          section: c.section ?? c.sectionName ?? "",
          grade:   String(c.grade ?? ""),
        })));
      })
      .catch(() => toast.error("Failed to load classes"))
      .finally(() => setClassesLoading(false));
  }, []);

  const fetchAssignments = useCallback(() => {
    setAssignmentsLoading(true);
    api.get("/subjects/assignments")
      .then((res) => setClassAssignments(res.data?.data ?? []))
      .catch(() => toast.error("Failed to load assignments"))
      .finally(() => setAssignmentsLoading(false));
  }, []);

  useEffect(() => {
    fetchSubjects();
    fetchClasses();
    fetchAssignments();
  }, [fetchSubjects, fetchClasses, fetchAssignments]);

  // ── Derived helpers ───────────────────────────────────────────────────────
  const getAssignedIds = (classId: string): string[] => {
    const found = classAssignments.find((c) => c._id === classId);
    return found ? found.assignedSubjects.map((s) => s._id) : [];
  };

  const getAssignedSubjects = (classId: string): Subject[] => {
    const found = classAssignments.find((c) => c._id === classId);
    return found ? found.assignedSubjects : [];
  };

  const getSubjectById = (id: string) => subjects.find((s) => s._id === id);
  const getClassById   = (id: string) => classes.find((c) => c._id === id);

  // ── Subject CRUD ──────────────────────────────────────────────────────────
  const openCreateSubject = () => {
    setEditSubject(null);
    setSubjectForm(EMPTY_FORM);
    setSubjectErrors({});
    setSubjectDialog(true);
  };

  const openEditSubject = (s: Subject) => {
    setEditSubject(s);
    setSubjectForm({ name: s.name, code: s.code, description: s.description });
    setSubjectErrors({});
    setSubjectDialog(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!subjectForm.name.trim()) errors.name = "Subject name is required";
    if (!subjectForm.code.trim()) errors.code = "Subject code is required";
    setSubjectErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveSubject = async () => {
    if (!validateForm()) return;
    setSavingSubject(true);
    try {
      if (editSubject) {
        await api.put(`/subjects/${editSubject._id}`, subjectForm);
        toast.success("Subject updated");
      } else {
        await api.post("/subjects", subjectForm);
        toast.success("Subject created");
      }
      setSubjectDialog(false);
      fetchSubjects();
      fetchAssignments();
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "Failed to save subject";
      // Show server duplicate-code error inline
      if (msg.toLowerCase().includes("code")) {
        setSubjectErrors((e) => ({ ...e, code: msg }));
      } else {
        toast.error(msg);
      }
    } finally {
      setSavingSubject(false);
    }
  };

  const confirmDeleteSubject = async () => {
    if (!deleteSubjectId) return;
    setDeletingSubject(true);
    try {
      await api.delete(`/subjects/${deleteSubjectId}`);
      toast.success("Subject deleted");
      setDeleteSubjectId(null);
      fetchSubjects();
      fetchAssignments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to delete subject");
    } finally {
      setDeletingSubject(false);
    }
  };

  // ── Assignment actions ────────────────────────────────────────────────────
  const toggleSingleSubject = (sid: string, checked: boolean) => {
    setSingleSubjectIds((prev) => {
      const next = new Set(prev);
      if (checked) next.add(sid); else next.delete(sid);
      return next;
    });
  };

  const assignSingle = async () => {
    if (!singleClassId)             { toast.error("Please select a class"); return; }
    if (singleSubjectIds.size === 0) { toast.error("Please select at least one subject"); return; }
    setAssigning(true);
    try {
      await api.post("/subjects/assign", {
        classId:    singleClassId,
        subjectIds: Array.from(singleSubjectIds),
      });
      toast.success("Subjects assigned successfully");
      setSingleSubjectIds(new Set());
      fetchAssignments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Assignment failed");
    } finally {
      setAssigning(false);
    }
  };

  const assignBulk = async () => {
    if (bulkClassIds.size === 0)   { toast.error("Please select at least one class"); return; }
    if (bulkSubjectIds.size === 0) { toast.error("Please select at least one subject"); return; }
    setAssigning(true);
    try {
      await api.post("/subjects/bulk-assign", {
        classIds:   Array.from(bulkClassIds),
        subjectIds: Array.from(bulkSubjectIds),
      });
      toast.success(`${bulkSubjectIds.size} subject(s) assigned to ${bulkClassIds.size} class(es)`);
      setBulkClassIds(new Set());
      setBulkSubjectIds(new Set());
      fetchAssignments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Bulk assignment failed");
    } finally {
      setAssigning(false);
    }
  };

  const removeSubjectFromClass = async (classId: string, subjectId: string) => {
    try {
      await api.delete("/subjects/unassign", { data: { classId, subjectId } });
      fetchAssignments();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to remove subject");
    }
  };

  const toggleExpanded = (classId: string) => {
    setExpandedClasses((prev) => {
      const next = new Set(prev);
      if (next.has(classId)) next.delete(classId); else next.add(classId);
      return next;
    });
  };

  const isLoading = classesLoading || subjectsLoading;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground font-heading">
            Subject & Class Assignment
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage subjects and assign them to existing classes.
          </p>
        </div>

        <Tabs defaultValue="subjects" className="space-y-4">
          <TabsList className="w-full sm:w-auto grid grid-cols-3">
            <TabsTrigger value="subjects" className="gap-1.5 text-xs sm:text-sm">
              <BookOpen className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Subjects</span>
            </TabsTrigger>
            <TabsTrigger value="assign" className="gap-1.5 text-xs sm:text-sm">
              <Link2 className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Assign Subjects</span>
            </TabsTrigger>
            <TabsTrigger value="summary" className="gap-1.5 text-xs sm:text-sm">
              <LayoutGrid className="h-4 w-4 shrink-0" />
              <span className="hidden sm:inline">Summary</span>
            </TabsTrigger>
          </TabsList>

          {/* ==============================================================
              TAB 1 — SUBJECTS
          ============================================================== */}
          <TabsContent value="subjects" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Subjects</h2>
                <p className="text-sm text-muted-foreground">
                  {subjectsLoading ? "Loading…" : `${subjects.length} subject(s)`}
                </p>
              </div>
              <Button onClick={openCreateSubject} className="gap-2" disabled={subjectsLoading}>
                <Plus className="h-4 w-4" /> Add Subject
              </Button>
            </div>

            {subjectsLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading subjects…
                </CardContent>
              </Card>
            ) : subjects.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="font-medium text-sm">No subjects yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Create your first subject to get started.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Subject Name</TableHead>
                        <TableHead>Code</TableHead>
                        <TableHead className="hidden md:table-cell">Description</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {subjects.map((s) => (
                        <TableRow key={s._id}>
                          <TableCell className="font-medium">{s.name}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="font-mono text-xs">
                              {s.code}
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-muted-foreground text-sm max-w-xs truncate">
                            {s.description || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8"
                                onClick={() => openEditSubject(s)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={() => setDeleteSubjectId(s._id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>

          {/* ==============================================================
              TAB 2 — ASSIGN SUBJECTS
          ============================================================== */}
          <TabsContent value="assign" className="space-y-6">

            {/* ── Single Assignment ────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <School className="h-5 w-5 text-primary" />
                  Single Assignment
                </CardTitle>
                <CardDescription>Select one class and assign subjects to it.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                  </div>
                ) : classes.length === 0 || subjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {classes.length === 0
                      ? "No classes found. Create classes from the Classes module first."
                      : "Please create at least one subject first."}
                  </p>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label>Select Class</Label>
                      <Select
                        value={singleClassId}
                        onValueChange={(v) => { setSingleClassId(v); setSingleSubjectIds(new Set()); }}
                      >
                        <SelectTrigger className="max-w-sm">
                          <SelectValue placeholder="Choose a class…" />
                        </SelectTrigger>
                        <SelectContent>
                          {classes.map((c) => (
                            <SelectItem key={c._id} value={c._id}>
                              {c.name}{c.section ? ` — ${c.section}` : ""}
                              {c.grade ? ` (Gr. ${c.grade})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Select Subjects to Assign</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                        {subjects.map((s) => {
                          const assigned = singleClassId
                            ? getAssignedIds(singleClassId).includes(s._id)
                            : false;
                          return (
                            <label
                              key={s._id}
                              htmlFor={`single-${s._id}`}
                              className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                                assigned
                                  ? "opacity-50 cursor-not-allowed bg-muted"
                                  : singleSubjectIds.has(s._id)
                                  ? "border-primary bg-primary/5 cursor-pointer"
                                  : "hover:bg-muted/50 cursor-pointer"
                              }`}
                            >
                              <Checkbox
                                id={`single-${s._id}`}
                                checked={singleSubjectIds.has(s._id)}
                                disabled={assigned}
                                onCheckedChange={(chk) => toggleSingleSubject(s._id, !!chk)}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{s.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{s.code}</p>
                              </div>
                              {assigned && (
                                <Badge variant="outline" className="ml-auto text-[10px] shrink-0">
                                  assigned
                                </Badge>
                              )}
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <Button
                      onClick={assignSingle}
                      className="gap-2"
                      disabled={assigning || !singleClassId || singleSubjectIds.size === 0}
                    >
                      {assigning
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Check className="h-4 w-4" />}
                      Assign{singleSubjectIds.size > 0 ? ` ${singleSubjectIds.size}` : ""}{" "}
                      Subject{singleSubjectIds.size !== 1 ? "s" : ""}
                    </Button>

                    {/* Current assignments for selected class */}
                    {singleClassId && getAssignedSubjects(singleClassId).length > 0 && (
                      <div className="pt-4 border-t space-y-2">
                        <p className="text-sm font-medium">
                          Currently assigned to{" "}
                          <span className="text-primary">{getClassById(singleClassId)?.name}</span>:
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {getAssignedSubjects(singleClassId).map((subj) => (
                            <Badge key={subj._id} variant="secondary" className="gap-1.5 pr-1.5 py-1">
                              <BookOpen className="h-3 w-3 shrink-0" />
                              {subj.name}
                              <button
                                onClick={() => removeSubjectFromClass(singleClassId, subj._id)}
                                className="ml-1 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                                aria-label={`Remove ${subj.name}`}
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            {/* ── Bulk Assignment ──────────────────────────────────────── */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Copy className="h-5 w-5 text-primary" />
                  Bulk Assignment
                </CardTitle>
                <CardDescription>
                  Select multiple classes and subjects, then assign them all at once.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {isLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                  </div>
                ) : classes.length === 0 || subjects.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {classes.length === 0
                      ? "No classes found. Create classes from the Classes module first."
                      : "Please create at least one subject first."}
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Classes picker */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Select Classes</Label>
                          <span className="text-xs text-muted-foreground">
                            {bulkClassIds.size} selected
                          </span>
                        </div>
                        <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
                          {classes.map((c) => (
                            <label
                              key={c._id}
                              htmlFor={`bulk-c-${c._id}`}
                              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                                bulkClassIds.has(c._id) ? "bg-primary/5" : "hover:bg-muted/50"
                              }`}
                            >
                              <Checkbox
                                id={`bulk-c-${c._id}`}
                                checked={bulkClassIds.has(c._id)}
                                onCheckedChange={(chk) => {
                                  setBulkClassIds((prev) => {
                                    const next = new Set(prev);
                                    if (chk) next.add(c._id); else next.delete(c._id);
                                    return next;
                                  });
                                }}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{c.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {c.section ? `Section ${c.section}` : ""}
                                  {c.grade ? ` · Grade ${c.grade}` : ""}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* Subjects picker */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-medium">Select Subjects</Label>
                          <span className="text-xs text-muted-foreground">
                            {bulkSubjectIds.size} selected
                          </span>
                        </div>
                        <div className="border rounded-lg divide-y max-h-56 overflow-y-auto">
                          {subjects.map((s) => (
                            <label
                              key={s._id}
                              htmlFor={`bulk-s-${s._id}`}
                              className={`flex items-center gap-3 px-3 py-2.5 cursor-pointer transition-colors ${
                                bulkSubjectIds.has(s._id) ? "bg-primary/5" : "hover:bg-muted/50"
                              }`}
                            >
                              <Checkbox
                                id={`bulk-s-${s._id}`}
                                checked={bulkSubjectIds.has(s._id)}
                                onCheckedChange={(chk) => {
                                  setBulkSubjectIds((prev) => {
                                    const next = new Set(prev);
                                    if (chk) next.add(s._id); else next.delete(s._id);
                                    return next;
                                  });
                                }}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{s.name}</p>
                                <p className="text-xs text-muted-foreground font-mono">{s.code}</p>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <Button
                      onClick={assignBulk}
                      className="gap-2"
                      disabled={assigning || bulkClassIds.size === 0 || bulkSubjectIds.size === 0}
                    >
                      {assigning
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <Check className="h-4 w-4" />}
                      Assign {bulkSubjectIds.size > 0 ? `${bulkSubjectIds.size} subject(s)` : "subjects"}{" "}
                      to {bulkClassIds.size > 0 ? `${bulkClassIds.size} class(es)` : "selected classes"}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* ── Per-class overview (expandable) ─────────────────────── */}
            {!isLoading && classes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Users className="h-5 w-5 text-primary" />
                    Per-Class Assignment Overview
                  </CardTitle>
                  <CardDescription>
                    Expand a class to view or remove its assigned subjects.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  {assignmentsLoading ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" /> Loading assignments…
                    </div>
                  ) : (
                    <div className="divide-y">
                      {classes.map((c) => {
                        const assignedSubjects = getAssignedSubjects(c._id);
                        const isExpanded       = expandedClasses.has(c._id);
                        return (
                          <div key={c._id}>
                            <button
                              className="w-full flex items-center justify-between px-6 py-3.5 hover:bg-muted/40 transition-colors text-left"
                              onClick={() => toggleExpanded(c._id)}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <School className="h-4 w-4 text-muted-foreground shrink-0" />
                                <span className="font-medium text-sm truncate">
                                  {c.name}{c.section ? ` — ${c.section}` : ""}
                                </span>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  {assignedSubjects.length} subject
                                  {assignedSubjects.length !== 1 ? "s" : ""}
                                </Badge>
                              </div>
                              {isExpanded
                                ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                                : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                            </button>

                            {isExpanded && (
                              <div className="px-6 py-4 bg-muted/20 border-t">
                                {assignedSubjects.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">
                                    No subjects assigned yet.
                                  </p>
                                ) : (
                                  <div className="flex flex-wrap gap-2">
                                    {assignedSubjects.map((subj) => (
                                      <Badge
                                        key={subj._id}
                                        variant="secondary"
                                        className="gap-1.5 pr-1.5 py-1"
                                      >
                                        <BookOpen className="h-3 w-3 shrink-0" />
                                        {subj.name}
                                        <span className="text-muted-foreground font-mono text-[10px]">
                                          {subj.code}
                                        </span>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeSubjectFromClass(c._id, subj._id);
                                          }}
                                          className="ml-0.5 rounded-full hover:bg-destructive/20 p-0.5 transition-colors"
                                          aria-label={`Remove ${subj.name}`}
                                        >
                                          <X className="h-3 w-3" />
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ==============================================================
              TAB 3 — SUMMARY
          ============================================================== */}
          <TabsContent value="summary">
            {isLoading || assignmentsLoading ? (
              <Card>
                <CardContent className="flex items-center justify-center py-16 gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-5 w-5 animate-spin" /> Loading…
                </CardContent>
              </Card>
            ) : classes.length === 0 || subjects.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <LayoutGrid className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="font-medium text-sm">Nothing to show yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {classes.length === 0
                      ? "No classes found. Create classes from the Classes module first."
                      : "Create at least one subject to see the assignment matrix."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle>Assignment Matrix</CardTitle>
                  <CardDescription>
                    Rows = classes · Columns = subjects · ✓ = assigned
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="sticky left-0 bg-card z-10 min-w-[160px] border-r">
                            Class
                          </TableHead>
                          {subjects.map((s) => (
                            <TableHead key={s._id} className="text-center min-w-[110px]">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-xs font-medium">{s.name}</span>
                                <Badge variant="outline" className="text-[10px] font-mono px-1 py-0">
                                  {s.code}
                                </Badge>
                              </div>
                            </TableHead>
                          ))}
                          <TableHead className="text-center min-w-[80px]">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classes.map((c) => {
                          const assignedSet = new Set(getAssignedIds(c._id));
                          return (
                            <TableRow key={c._id}>
                              <TableCell className="sticky left-0 bg-card border-r">
                                <p className="text-sm font-medium">{c.name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {c.section ? `Sec. ${c.section}` : ""}
                                  {c.grade ? ` · Gr. ${c.grade}` : ""}
                                </p>
                              </TableCell>
                              {subjects.map((s) => (
                                <TableCell key={s._id} className="text-center">
                                  {assignedSet.has(s._id) ? (
                                    <div className="flex items-center justify-center">
                                      <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                                        <Check className="h-3.5 w-3.5 text-primary" />
                                      </div>
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground/25 text-lg leading-none">—</span>
                                  )}
                                </TableCell>
                              ))}
                              <TableCell className="text-center">
                                <Badge
                                  variant={assignedSet.size === subjects.length ? "default" : "secondary"}
                                  className="tabular-nums"
                                >
                                  {assignedSet.size}/{subjects.length}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* ── Subject Create/Edit Dialog ──────────────────────────────── */}
        <Dialog open={subjectDialog} onOpenChange={setSubjectDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{editSubject ? "Edit Subject" : "Create Subject"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="sub-name">
                  Subject Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sub-name"
                  placeholder="e.g. Mathematics"
                  value={subjectForm.name}
                  onChange={(e) => setSubjectForm((f) => ({ ...f, name: e.target.value }))}
                  className={subjectErrors.name ? "border-destructive" : ""}
                />
                {subjectErrors.name && (
                  <p className="text-xs text-destructive">{subjectErrors.name}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-code">
                  Subject Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="sub-code"
                  placeholder="e.g. MATH101"
                  value={subjectForm.code}
                  onChange={(e) => setSubjectForm((f) => ({ ...f, code: e.target.value }))}
                  className={subjectErrors.code ? "border-destructive" : ""}
                />
                {subjectErrors.code && (
                  <p className="text-xs text-destructive">{subjectErrors.code}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sub-desc">Description</Label>
                <Textarea
                  id="sub-desc"
                  placeholder="Optional description…"
                  value={subjectForm.description}
                  onChange={(e) => setSubjectForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSubjectDialog(false)} disabled={savingSubject}>
                Cancel
              </Button>
              <Button onClick={saveSubject} disabled={savingSubject}>
                {savingSubject && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {editSubject ? "Save Changes" : "Create Subject"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Subject Delete Confirm ──────────────────────────────────── */}
        <Dialog open={!!deleteSubjectId} onOpenChange={() => setDeleteSubjectId(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <DialogTitle>Delete Subject</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground py-2">
              Are you sure? This subject will be removed from all class assignments and cannot be
              undone.
            </p>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDeleteSubjectId(null)}
                disabled={deletingSubject}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteSubject}
                disabled={deletingSubject}
              >
                {deletingSubject && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
