import { useState, useEffect } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import api from "@/lib/api";
import { Shield, ChevronRight, Loader2, Save } from "lucide-react";

interface TeacherItem {
  _id: string;
  name: string;
  email: string;
  teacherId: string;
}

interface PermissionGroup {
  label: string;
  keys: { key: string; label: string }[];
}

const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: "Students",
    keys: [
      { key: "canViewAllStudents", label: "View All Students" },
      { key: "canCreateStudent",   label: "Create Student" },
      { key: "canEditStudent",     label: "Edit Student" },
      { key: "canDeleteStudent",   label: "Delete Student" },
    ],
  },
  {
    label: "Attendance",
    keys: [
      { key: "canViewAttendance", label: "View Attendance" },
      { key: "canMarkAttendance", label: "Mark Attendance" },
    ],
  },
  {
    label: "Exams & Results",
    keys: [
      { key: "canViewExams",  label: "View Exams" },
      { key: "canCreateExam", label: "Create Exam" },
      { key: "canEnterMarks", label: "Enter Marks" },
    ],
  },
  {
    label: "Homework",
    keys: [
      { key: "canViewHomework",   label: "View Homework" },
      { key: "canAssignHomework", label: "Assign Homework" },
    ],
  },
  {
    label: "Notice Board",
    keys: [
      { key: "canViewNotices",    label: "View Notices" },
      { key: "canPostNotice",     label: "Post Notice" },
      { key: "canPostNoticeBoard",label: "Post on Notice Board" },
    ],
  },
  {
    label: "Fees",
    keys: [
      { key: "canViewFees",   label: "View Fees" },
      { key: "canManageFees", label: "Manage Fees" },
    ],
  },
  {
    label: "Other",
    keys: [
      { key: "canManageLibrary",  label: "Manage Library" },
      { key: "canDailyChallenge", label: "Daily Challenge" },
      { key: "canAwardBadges",    label: "Award Badges" },
    ],
  },
];

export default function RolesPermissions() {
  const [teachers, setTeachers] = useState<TeacherItem[]>([]);
  const [selected, setSelected]  = useState<TeacherItem | null>(null);
  const [perms, setPerms]        = useState<string[]>([]);
  const [saving, setSaving]      = useState(false);
  const [loading, setLoading]    = useState(true);
  const [loadingPerms, setLoadingPerms] = useState(false);

  useEffect(() => {
    api.get("/admin/teachers")
      .then((res) => {
        const raw: any[] = res.data?.data || [];
        setTeachers(raw.map((t) => ({ _id: t._id, name: t.name, email: t.email, teacherId: t.teacherId })));
      })
      .catch(() => toast.error("Failed to load teachers."))
      .finally(() => setLoading(false));
  }, []);

  const selectTeacher = async (t: TeacherItem) => {
    setSelected(t);
    setLoadingPerms(true);
    try {
      const res = await api.get(`/permissions/${t._id}`);
      setPerms(res.data?.data?.permissions || []);
    } catch {
      setPerms([]);
    } finally {
      setLoadingPerms(false);
    }
  };

  const toggle = (key: string) => {
    setPerms((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.post(`/permissions/${selected._id}`, { permissions: perms });
      toast.success(`Permissions saved for ${selected.name}`);
    } catch {
      toast.error("Failed to save permissions.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl orange-icon-bg flex items-center justify-center">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold font-heading">Roles & Permissions</h1>
            <p className="text-sm text-muted-foreground">Assign permissions to teachers</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Teacher list */}
          <Card className="border-[#FFE8D6]">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold font-heading">Teachers</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : teachers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No teachers found.</p>
              ) : (
                <div className="divide-y divide-border">
                  {teachers.map((t) => (
                    <button
                      key={t._id}
                      onClick={() => selectTeacher(t)}
                      className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors text-left ${
                        selected?._id === t._id ? "bg-secondary border-l-[3px] border-l-primary" : ""
                      }`}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="orange-icon-bg text-primary text-xs">
                          {t.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{t.teacherId}</p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Permissions panel */}
          <div className="lg:col-span-2">
            {!selected ? (
              <Card className="border-[#FFE8D6] h-full flex items-center justify-center min-h-[300px]">
                <div className="text-center text-muted-foreground">
                  <Shield className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Select a teacher to manage permissions</p>
                </div>
              </Card>
            ) : (
              <Card className="border-[#FFE8D6]">
                <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-sm font-semibold font-heading">{selected.name}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">{selected.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {perms.length} active
                    </Badge>
                    <Button size="sm" className="btn-gradient border-0 gap-1.5" onClick={save} disabled={saving}>
                      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      Save
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loadingPerms ? (
                    <div className="flex justify-center py-10">
                      <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {PERMISSION_GROUPS.map((group) => (
                        <div key={group.label}>
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 font-heading">
                            {group.label}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {group.keys.map(({ key, label }) => (
                              <div
                                key={key}
                                className={`flex items-center justify-between rounded-xl px-3 py-2.5 border transition-colors ${
                                  perms.includes(key)
                                    ? "border-primary/30 bg-primary/5"
                                    : "border-[#FFE8D6] bg-white"
                                }`}
                              >
                                <span className="text-sm font-medium">{label}</span>
                                <Switch
                                  checked={perms.includes(key)}
                                  onCheckedChange={() => toggle(key)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
