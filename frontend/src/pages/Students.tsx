import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StudentModal } from "@/components/modals/StudentModal";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import type { Student } from "@/lib/mock-data";
import { Search, Plus, MoreHorizontal, Eye, Pencil, Trash2, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";

const ITEMS_PER_PAGE = 6;

interface ClassOption { _id: string; name: string; section: string; }

const Students = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [feeFilter, setFeeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editStudent, setEditStudent] = useState<Student | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [classOptions, setClassOptions] = useState<ClassOption[]>([]);

  const normalizeStudent = (s: any): Student => ({
    id: s._id || s.id,
    name: s.name,
    class: s.class || "",
    section: s.section || "",
    rollNumber: s.rollNumber || s.studentId || "",
    attendance: s.attendance ?? 0,
    feeStatus: s.feeStatus || "pending",
    avatar: s.photo || s.avatar || "",
    parentName: s.parent?.name || s.parentName || "",
    parentEmail: s.parent?.email || s.parentEmail || "",
    parentPhone: s.parent?.phone || s.parentPhone || "",
    email: s.email || "",
    address: s.address || "",
    dateOfBirth: s.dateOfBirth || "",
    admissionDate: s.admissionDate || s.createdAt || "",
  });

  const fetchStudents = () => {
    setLoading(true);
    api.get("/admin/students")
      .then((res) => {
        const raw = res.data?.data || res.data?.students || res.data || [];
        setStudents(Array.isArray(raw) ? raw.map(normalizeStudent) : []);
      })
      .catch(() => toast.error("Failed to load students."))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStudents();
    api.get("/admin/classes")
      .then(res => setClassOptions(res.data?.data || []))
      .catch(() => {});
  }, []);

  const filtered = students.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.rollNumber?.includes(search);
    const matchClass = classFilter === "all" || s.class === classFilter;
    const matchFee = feeFilter === "all" || s.feeStatus === feeFilter;
    return matchSearch && matchClass && matchFee;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const handleSave = async (data: any) => {
    try {
      if (editStudent) {
        // updateStudent backend uses `class`, `section` etc.
        await api.put(`/admin/students/${editStudent.id}`, data);
        toast.success("Student updated.");
      } else {
        // createStudent backend expects `studentClass` (not `class`)
        const { class: _c, ...rest } = data;
        await api.post("/admin/students", { ...rest, studentClass: data.class });
        toast.success("Student added.");
      }
      fetchStudents();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save student.");
    }
    setEditStudent(null);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await api.delete(`/admin/students/${deleteId}`);
      toast.success("Student deleted.");
      fetchStudents();
    } catch {
      toast.error("Failed to delete student.");
    }
    setDeleteId(null);
  };

  const feeColor = (status: string) => {
    switch (status) {
      case "paid":
      case "clear": return "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))] border-[hsl(var(--success))]/20";
      case "pending": return "bg-[hsl(var(--warning))]/10 text-[hsl(var(--warning))] border-[hsl(var(--warning))]/20";
      case "partial": return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "overdue": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "";
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Students</h1>
            <p className="text-sm text-muted-foreground mt-1">{students.length} total students enrolled.</p>
          </div>
          <Button className="gap-2" onClick={() => { setEditStudent(null); setModalOpen(true); }}>
            <Plus className="h-4 w-4" /> Add Student
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search by name or roll number..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-9" maxLength={50} />
          </div>
          <Select value={classFilter} onValueChange={(v) => { setClassFilter(v); setPage(1); }}>
            <SelectTrigger className="w-44"><SelectValue placeholder="Class" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classOptions.map(c => (
                <SelectItem key={c._id} value={c.name}>Class {c.name}–{c.section}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={feeFilter} onValueChange={(v) => { setFeeFilter(v); setPage(1); }}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Fee Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Fee Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 6 }).map((__, j) => (
                        <TableCell key={j}><div className="h-4 bg-muted rounded animate-pulse" /></TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : paginated.map((student) => (
                  <TableRow key={student.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/students/${student.id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={student.avatar} />
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">{student.name.split(" ").map(w => w[0]).join("")}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-foreground">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{student.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{student.class}-{student.section}</TableCell>
                    <TableCell className="text-sm font-mono">{student.rollNumber}</TableCell>
                    <TableCell>
                      {student.attendance > 0 ? (
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                            <div className="h-full bg-primary rounded-full" style={{ width: `${student.attendance}%` }} />
                          </div>
                          <span className="text-sm">{student.attendance}%</span>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={`text-xs font-medium ${feeColor(student.feeStatus)}`}>{student.feeStatus}</Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => navigate(`/students/${student.id}`)}><Eye className="h-4 w-4 mr-2" /> View</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setEditStudent(student); setModalOpen(true); }}><Pencil className="h-4 w-4 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(student.id)}><Trash2 className="h-4 w-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {!loading && paginated.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      No students found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Showing {(page - 1) * ITEMS_PER_PAGE + 1}–{Math.min(page * ITEMS_PER_PAGE, filtered.length)} of {filtered.length}</p>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              {Array.from({ length: totalPages }, (_, i) => (
                <Button key={i} variant={page === i + 1 ? "default" : "outline"} size="icon" className="h-8 w-8" onClick={() => setPage(i + 1)}>{i + 1}</Button>
              ))}
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page === totalPages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </div>

      <StudentModal open={modalOpen} onOpenChange={setModalOpen} student={editStudent} onSave={handleSave} classOptions={classOptions} />
      <ConfirmDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)} title="Delete Student" description="Are you sure? This will permanently remove this student record." onConfirm={handleDelete} />
    </DashboardLayout>
  );
};

export default Students;
