import { useState } from "react";
import { DashboardLayout } from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings, School, Bell, Shield, Database, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const [schoolName, setSchoolName] = useState("Anyit Software");
  const [email, setEmail] = useState("admin@anyitsoftware.com");
  const [phone, setPhone] = useState("+1 234-567-8900");
  const [address, setAddress] = useState("123 Education Lane, Knowledge City");
  const [academicYear, setAcademicYear] = useState("2025-2026");
  const [gradingScale, setGradingScale] = useState("percentage");

  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    smsAlerts: false,
    attendanceAlerts: true,
    feeReminders: true,
    examNotifications: true,
  });

  const handleSave = () => {
    toast({ title: "Settings Saved", description: "Your changes have been saved successfully." });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading">Settings</h1>
            <p className="text-sm text-muted-foreground mt-1">Manage your school configuration and preferences.</p>
          </div>
          <Button className="btn-gradient border-0 rounded-[10px] gap-2" onClick={handleSave}>
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        </div>

        <Tabs defaultValue="school" className="space-y-4">
          <TabsList>
            <TabsTrigger value="school" className="gap-1.5"><School className="h-3.5 w-3.5" /> School Profile</TabsTrigger>
            <TabsTrigger value="academic" className="gap-1.5"><Settings className="h-3.5 w-3.5" /> Academic</TabsTrigger>
            <TabsTrigger value="notifications" className="gap-1.5"><Bell className="h-3.5 w-3.5" /> Notifications</TabsTrigger>
            <TabsTrigger value="security" className="gap-1.5"><Shield className="h-3.5 w-3.5" /> Security</TabsTrigger>
          </TabsList>

          <TabsContent value="school">
            <Card className="hover-lift">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg orange-icon-bg flex items-center justify-center"><School className="h-4 w-4 text-primary" /></div>
                  School Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>School Name</Label>
                  <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={address} onChange={(e) => setAddress(e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="academic">
            <Card className="hover-lift">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg orange-icon-bg flex items-center justify-center"><Settings className="h-4 w-4 text-primary" /></div>
                  Academic Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Academic Year</Label>
                  <Select value={academicYear} onValueChange={setAcademicYear}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2024-2025">2024-2025</SelectItem>
                      <SelectItem value="2025-2026">2025-2026</SelectItem>
                      <SelectItem value="2026-2027">2026-2027</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Grading Scale</Label>
                  <Select value={gradingScale} onValueChange={setGradingScale}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Percentage (0-100%)</SelectItem>
                      <SelectItem value="gpa">GPA (0-4.0)</SelectItem>
                      <SelectItem value="letter">Letter Grade (A-F)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Term Structure</Label>
                  <Select defaultValue="semester">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semester">Semester (2 terms)</SelectItem>
                      <SelectItem value="trimester">Trimester (3 terms)</SelectItem>
                      <SelectItem value="quarterly">Quarterly (4 terms)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pass Percentage</Label>
                  <Input type="number" defaultValue="35" />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card className="hover-lift">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg orange-icon-bg flex items-center justify-center"><Bell className="h-4 w-4 text-primary" /></div>
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {[
                  { key: "emailAlerts", label: "Email Alerts", desc: "Receive notifications via email" },
                  { key: "smsAlerts", label: "SMS Alerts", desc: "Receive notifications via SMS" },
                  { key: "attendanceAlerts", label: "Attendance Alerts", desc: "Get notified when attendance is below threshold" },
                  { key: "feeReminders", label: "Fee Reminders", desc: "Send automatic fee payment reminders" },
                  { key: "examNotifications", label: "Exam Notifications", desc: "Notify students and parents about upcoming exams" },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.label}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notifications[item.key as keyof typeof notifications]}
                      onCheckedChange={(v) => setNotifications((p) => ({ ...p, [item.key]: v }))}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card className="hover-lift">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <div className="h-8 w-8 rounded-lg orange-icon-bg flex items-center justify-center"><Shield className="h-4 w-4 text-primary" /></div>
                  Security & Backup
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Session Timeout (minutes)</Label>
                    <Input type="number" defaultValue="30" />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Login Attempts</Label>
                    <Input type="number" defaultValue="5" />
                  </div>
                </div>
                <div className="flex items-center justify-between py-3 border-t border-border">
                  <div>
                    <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                    <p className="text-xs text-muted-foreground">Add an extra layer of security</p>
                  </div>
                  <Switch defaultChecked={false} />
                </div>
                <div className="pt-2">
                  <Button variant="outline" className="gap-2"><Database className="h-4 w-4" /> Create Backup</Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
