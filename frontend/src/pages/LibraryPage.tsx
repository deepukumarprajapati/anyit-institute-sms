import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  BookOpen, Search, Download, FileText, File, Plus, Eye,
  Loader2, Trash2, Upload, X, BookMarked,
} from "lucide-react";
import api from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Material {
  _id: string;
  title: string;
  description: string;
  subject: string;
  class: string;
  section: string;
  type: "pdf" | "notes" | "paper" | "worksheet";
  fileUrl: string;
  fileName: string;
  uploaderName: string;
  uploaderModel: "Teacher" | "Admin";
  downloads: number;
  createdAt: string;
  uploadedBy?: { _id: string };
}

interface ClassOption { _id: string; name: string; section: string }

const typeIcon: Record<string, typeof FileText> = {
  pdf:       FileText,
  notes:     BookMarked,
  paper:     File,
  worksheet: BookOpen,
};
const typeColor: Record<string, string> = {
  pdf:       "bg-primary/10 text-primary border-primary/20",
  notes:     "bg-blue-500/10 text-blue-600 border-blue-200",
  paper:     "bg-amber-500/10 text-amber-600 border-amber-200",
  worksheet: "bg-green-500/10 text-green-600 border-green-200",
};

const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "";

export default function LibraryPage() {
  const { user } = useAuth();
  const isUploader = user?.role === "school_admin" || user?.role === "teacher";

  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [typeFilter,setTypeFilter]= useState("all");

  // Upload modal state
  const [showModal,     setShowModal]     = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [classes,       setClasses]       = useState<ClassOption[]>([]);
  const [classesLoading,setClassesLoading]= useState(false);
  const [selectedFile,  setSelectedFile]  = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "", description: "", subject: "", classId: "", section: "", type: "pdf",
  });

  // ── Fetch materials ───────────────────────────────────────────────────────
  const fetchMaterials = () => {
    setLoading(true);
    api.get("/study-materials")
      .then((res) => setMaterials(res.data?.data || []))
      .catch(() => toast.error("Failed to load materials."))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchMaterials(); }, []);

  // ── Fetch classes for upload modal ────────────────────────────────────────
  const openModal = async () => {
    setShowModal(true);
    setClassesLoading(true);
    try {
      let data: ClassOption[] = [];
      if (user?.role === "school_admin") {
        const res = await api.get("/admin/classes");
        data = res.data?.data || [];
      } else {
        const res = await api.get("/teachers/me");
        data = res.data?.data?.assignedClasses || res.data?.data?.classes || [];
      }
      setClasses(data);
    } catch {
      toast.error("Failed to load classes.");
    } finally {
      setClassesLoading(false);
    }
  };

  const resetModal = () => {
    setShowModal(false);
    setSelectedFile(null);
    setForm({ title: "", description: "", subject: "", classId: "", section: "", type: "pdf" });
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Upload ────────────────────────────────────────────────────────────────
  const handleUpload = async () => {
    if (!form.title.trim() || !form.subject.trim() || !form.classId)
      return toast.error("Title, subject and class are required.");
    if (!selectedFile)
      return toast.error("Please select a file.");

    const selectedClass = classes.find((c) => c._id === form.classId);
    if (!selectedClass) return toast.error("Invalid class selected.");

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file",        selectedFile);
      fd.append("title",       form.title.trim());
      fd.append("description", form.description.trim());
      fd.append("subject",     form.subject.trim());
      fd.append("class",       selectedClass.name);
      fd.append("section",     form.section || selectedClass.section || "");
      fd.append("type",        form.type);

      await api.post("/study-materials", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Material uploaded successfully!");
      resetModal();
      fetchMaterials();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  // ── Download ──────────────────────────────────────────────────────────────
  const handleDownload = async (mat: Material) => {
    try {
      await api.patch(`/study-materials/${mat._id}/download`);
      window.open(mat.fileUrl, "_blank");
      setMaterials((prev) =>
        prev.map((m) => m._id === mat._id ? { ...m, downloads: m.downloads + 1 } : m)
      );
    } catch {
      window.open(mat.fileUrl, "_blank");
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this material?")) return;
    try {
      await api.delete(`/study-materials/${id}`);
      setMaterials((prev) => prev.filter((m) => m._id !== id));
      toast.success("Material deleted.");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Delete failed.");
    }
  };

  // ── Filter ────────────────────────────────────────────────────────────────
  const filtered = materials.filter((m) => {
    const q = search.toLowerCase();
    const matchSearch = m.title.toLowerCase().includes(q) || m.subject.toLowerCase().includes(q);
    const matchType   = typeFilter === "all" || m.type === typeFilter;
    return matchSearch && matchType;
  });

  const selectedClass = classes.find((c) => c._id === form.classId);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading">Study Materials</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {materials.length} resource{materials.length !== 1 ? "s" : ""} available.
            </p>
          </div>
          {isUploader && (
            <Button className="btn-gradient border-0 rounded-[10px] gap-2" onClick={openModal}>
              <Plus className="h-4 w-4" /> Upload Material
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or subject…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {["all", "pdf", "notes", "paper", "worksheet"].map((t) => (
              <Button
                key={t}
                variant={typeFilter === t ? "default" : "outline"}
                size="sm"
                className={typeFilter === t ? "btn-gradient border-0" : ""}
                onClick={() => setTypeFilter(t)}
              >
                {t === "all" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-lg bg-muted shrink-0" />
                      <div className="flex-1 space-y-1">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                    <div className="h-3 bg-muted rounded" />
                    <div className="h-8 bg-muted rounded" />
                  </CardContent>
                </Card>
              ))
            : filtered.map((mat) => {
                const Icon = typeIcon[mat.type] || FileText;
                const canDelete = isUploader && (
                  user?.role === "school_admin" || mat.uploadedBy?._id === user?.id
                );
                return (
                  <Card key={mat._id} className="hover-lift">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg orange-icon-bg flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-semibold text-foreground truncate" title={mat.title}>
                            {mat.title}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {mat.uploaderName} · {mat.uploaderModel === "Admin" ? "Admin" : "Teacher"}
                          </p>
                        </div>
                        {canDelete && (
                          <button
                            onClick={() => handleDelete(mat._id)}
                            className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>

                      {mat.description && (
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{mat.description}</p>
                      )}

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] ${typeColor[mat.type] || ""}`}>
                          {mat.type}
                        </Badge>
                        <Badge variant="secondary" className="text-[10px]">{mat.subject}</Badge>
                        <Badge variant="outline" className="text-[10px]">
                          Class {mat.class}{mat.section ? `-${mat.section}` : ""}
                        </Badge>
                      </div>

                      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
                        <span>{fmtDate(mat.createdAt)}</span>
                        <span>{mat.downloads} downloads</span>
                      </div>

                      <div className="flex gap-2 mt-3">
                        <Button
                          variant="outline" size="sm"
                          className="flex-1 gap-1 text-xs"
                          onClick={() => window.open(mat.fileUrl, "_blank")}
                        >
                          <Eye className="h-3 w-3" /> Preview
                        </Button>
                        <Button
                          size="sm"
                          className="flex-1 gap-1 text-xs btn-gradient border-0"
                          onClick={() => handleDownload(mat)}
                        >
                          <Download className="h-3 w-3" /> Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No materials found.</p>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <Dialog open={showModal} onOpenChange={(o) => { if (!o) resetModal(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-primary" /> Upload Study Material
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Title */}
            <div className="space-y-1.5">
              <Label className="text-xs">Title <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Chapter 5 - Quadratic Equations Notes"
                value={form.title}
                onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              />
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <Label className="text-xs">Subject <span className="text-destructive">*</span></Label>
              <Input
                placeholder="e.g. Mathematics"
                value={form.subject}
                onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))}
              />
            </div>

            {/* Class */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Class <span className="text-destructive">*</span></Label>
                {classesLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground h-9">
                    <Loader2 className="h-3 w-3 animate-spin" /> Loading…
                  </div>
                ) : (
                  <Select
                    value={form.classId}
                    onValueChange={(v) => setForm((p) => ({ ...p, classId: v, section: "" }))}
                  >
                    <SelectTrigger><SelectValue placeholder="Select class…" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c._id} value={c._id}>
                          Class {c.name}{c.section ? `-${c.section}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Section (optional)</Label>
                <Input
                  placeholder={selectedClass?.section || "e.g. A (leave blank for all)"}
                  value={form.section}
                  onChange={(e) => setForm((p) => ({ ...p, section: e.target.value }))}
                />
              </div>
            </div>

            {/* Type */}
            <div className="space-y-1.5">
              <Label className="text-xs">Material Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm((p) => ({ ...p, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF Document</SelectItem>
                  <SelectItem value="notes">Notes</SelectItem>
                  <SelectItem value="paper">Past Paper</SelectItem>
                  <SelectItem value="worksheet">Worksheet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs">Description (optional)</Label>
              <Textarea
                placeholder="Brief description of this material…"
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="min-h-[70px] resize-none"
              />
            </div>

            {/* File picker */}
            <div className="space-y-1.5">
              <Label className="text-xs">File <span className="text-destructive">*</span></Label>
              {selectedFile ? (
                <div className="flex items-center gap-2 p-3 border border-border rounded-lg bg-secondary/30">
                  <FileText className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-sm flex-1 truncate">{selectedFile.name}</span>
                  <button onClick={() => { setSelectedFile(null); if (fileRef.current) fileRef.current.value = ""; }}>
                    <X className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                  </button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/40 hover:bg-secondary/20 transition-all"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                  <p className="text-sm text-muted-foreground">Click to select a file</p>
                  <p className="text-xs text-muted-foreground mt-1">PDF, DOC, PPT, XLS up to 20 MB</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={resetModal} disabled={uploading}>Cancel</Button>
            <Button className="btn-gradient border-0 gap-2" onClick={handleUpload} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
