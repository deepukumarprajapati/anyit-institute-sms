import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap, Mail, Lock, Eye, EyeOff, ArrowRight,
  Shield, BookOpen, Users, Heart, IdCard,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import api from "@/lib/api";

// ── Role config ────────────────────────────────────────────────
type RoleKey = "school_admin" | "teacher" | "student" | "parent";

const ROLES: { key: RoleKey; label: string; icon: any; color: string }[] = [
  { key: "school_admin", label: "Admin",   icon: Shield,   color: "#FF6B2B" },
  { key: "teacher",      label: "Teacher", icon: BookOpen, color: "#33C6E7" },
  { key: "student",      label: "Student", icon: Users,    color: "#4A7DFF" },
  { key: "parent",       label: "Parent",  icon: Heart,    color: "#FF9A5A" },
];


interface SignupFormData {
  schoolName: string; schoolAddress: string; schoolPhone: string;
  name: string; email: string; password: string; phone: string;
}

export default function Login() {
  const [selectedRole, setSelectedRole] = useState<RoleKey>("school_admin");
  const [identifier,   setIdentifier]   = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading,      setLoading]      = useState(false);

  const [signupOpen,    setSignupOpen]    = useState(false);
  const [signupStep,    setSignupStep]    = useState<1 | 2>(1);
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupEmail,   setSignupEmail]   = useState("");
  const [otp,           setOtp]           = useState("");
  const [signupForm,    setSignupForm]    = useState<SignupFormData>({
    schoolName: "", schoolAddress: "", schoolPhone: "",
    name: "", email: "", password: "", phone: "",
  });

  const { login }  = useAuth();
  const navigate   = useNavigate();
  const { toast }  = useToast();

  // ── Role tab switch ──────────────────────────────────────────
  const switchRole = (role: RoleKey) => {
    setSelectedRole(role);
    setIdentifier("");
    setPassword("");
  };

  // ── Login submit ─────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await login(identifier, password, selectedRole);
      setLoading(false);
      if (result.success) {
        const roleLabel = ROLES.find(r => r.key === selectedRole)?.label ?? selectedRole;
        toast({ title: `Welcome back!`, description: `Logged in as ${roleLabel}.` });
        navigate("/");
      } else {
        toast({ title: "Login Failed", description: result.error, variant: "destructive" });
      }
    } catch {
      setLoading(false);
      toast({ title: "Connection Error", description: "Could not reach server. Please try again.", variant: "destructive" });
    }
  };

  // ── Signup handlers ──────────────────────────────────────────
  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);
    try {
      await api.post("/auth/school/signup", signupForm);
      setSignupEmail(signupForm.email);
      setSignupStep(2);
      toast({ title: "Check your email", description: "An OTP has been sent to your email." });
    } catch (err: any) {
      toast({ title: "Signup Failed", description: err.response?.data?.message || "Please try again.", variant: "destructive" });
    } finally { setSignupLoading(false); }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupLoading(true);
    try {
      await api.post("/auth/school/verify-otp", { email: signupEmail, otp });
      toast({ title: "School Registered!", description: "You can now login with your credentials." });
      setSignupOpen(false); setSignupStep(1); setOtp("");
      setSignupForm({ schoolName: "", schoolAddress: "", schoolPhone: "", name: "", email: "", password: "", phone: "" });
    } catch (err: any) {
      toast({ title: "Invalid OTP", description: err.response?.data?.message || "Please check and try again.", variant: "destructive" });
    } finally { setSignupLoading(false); }
  };

  const isStudent    = selectedRole === "student";
  const currentRole  = ROLES.find(r => r.key === selectedRole)!;

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #FFF5EE 0%, #FFFFFF 50%, #FFF0E6 100%)" }}>

      {/* ── Left panel ── */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between p-10 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #FF6B2B 0%, #FF9A5A 60%, #FFD4B3 100%)" }}>
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-white font-heading">Anyit Software</span>
          </div>
          <p className="text-sm text-white/80">Anyit Software</p>
        </div>
        <div className="relative z-10 space-y-6">
          <h2 className="text-3xl font-bold leading-tight text-white font-heading">
            Manage your school with confidence
          </h2>
          <p className="text-base text-white/80 leading-relaxed">
            A complete platform for administrators, teachers, students, and parents.
          </p>
          <div className="flex gap-3">
            {["2,847 Students", "184 Teachers", "12 Schools"].map(stat => (
              <div key={stat} className="bg-white/15 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10">
                <p className="text-sm font-bold text-white">{stat.split(" ")[0]}</p>
                <p className="text-xs text-white/70">{stat.split(" ")[1]}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-xs text-white/50">© 2026 Anyit Software. All rights reserved.</p>
      </div>

      {/* ── Right panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md space-y-6 animate-fade-in">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl btn-gradient flex items-center justify-center">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gradient font-heading">Anyit Software</span>
          </div>

          <div>
            <h1 className="text-2xl font-bold text-foreground font-heading">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">Select your role and sign in</p>
          </div>

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                {isStudent ? (
                  <><IdCard className="h-3.5 w-3.5 text-muted-foreground" /> Student ID</>
                ) : (
                  <><Mail className="h-3.5 w-3.5 text-muted-foreground" /> Email</>
                )}
              </label>
              <div className="relative">
                {isStudent
                  ? <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  : <Mail   className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                }
                <Input
                  type={isStudent ? "text" : "email"}
                  placeholder={isStudent ? "e.g. STU001" : "Enter your email"}
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  className="pl-9 border-[#FFE8D6] focus:border-primary focus:ring-primary/20"
                  required
                  maxLength={255}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-muted-foreground" /> Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="pl-9 pr-10 border-[#FFE8D6] focus:border-primary focus:ring-primary/20"
                  required
                  maxLength={100}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Active role badge */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-secondary">
              <div className="h-5 w-5 rounded-md flex items-center justify-center" style={{ background: `${currentRole.color}20` }}>
                <currentRole.icon className="h-3 w-3" style={{ color: currentRole.color }} />
              </div>
              <span className="text-xs text-muted-foreground">
                Signing in as <span className="font-semibold text-foreground">{currentRole.label}</span>
              </span>
            </div>

            <Button
              type="submit"
              className="w-full gap-2 btn-gradient border-0 rounded-[10px] h-11 text-sm font-semibold"
              disabled={loading}
            >
              {loading ? "Signing in…" : `Sign In as ${currentRole.label}`}
              {!loading && <ArrowRight className="h-4 w-4" />}
            </Button>
          </form>

          <div className="text-center">
            <span className="text-sm text-muted-foreground">New school? </span>
            <button
              type="button"
              onClick={() => { setSignupOpen(true); setSignupStep(1); }}
              className="text-sm font-medium text-primary hover:underline"
            >
              Register School
            </button>
          </div>

          {/* Role selector cards */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 font-heading">
              Select Role
            </p>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(r => {
                const Icon  = r.icon;
                const active = selectedRole === r.key;
                return (
                  <button
                    key={r.key}
                    type="button"
                    onClick={() => switchRole(r.key)}
                    className={`text-left rounded-xl p-3 border transition-all hover:scale-[1.02] ${
                      active
                        ? "border-primary/40 bg-primary/5 shadow-sm"
                        : "border-[#FFE8D6] bg-white hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${r.color}18` }}>
                        <Icon className="h-4 w-4" style={{ color: r.color }} />
                      </div>
                      <p className="text-sm font-semibold text-foreground">{r.label}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {/* ── School Signup Modal ── */}
      <Dialog open={signupOpen} onOpenChange={open => { setSignupOpen(open); if (!open) { setSignupStep(1); setOtp(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-heading">
              {signupStep === 1 ? "Register Your School" : "Verify Email"}
            </DialogTitle>
          </DialogHeader>

          {signupStep === 1 ? (
            <form onSubmit={handleSignupSubmit} className="space-y-3 mt-2">
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">School Name</label>
                <Input placeholder="e.g. Lincoln Academy" value={signupForm.schoolName} onChange={e => setSignupForm(f => ({ ...f, schoolName: e.target.value }))} required maxLength={100} className="border-[#FFE8D6]" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">School Address</label>
                <Input placeholder="Full address" value={signupForm.schoolAddress} onChange={e => setSignupForm(f => ({ ...f, schoolAddress: e.target.value }))} required maxLength={200} className="border-[#FFE8D6]" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">School Phone</label>
                <Input placeholder="+1 234 567 8900" value={signupForm.schoolPhone} onChange={e => setSignupForm(f => ({ ...f, schoolPhone: e.target.value }))} required maxLength={20} className="border-[#FFE8D6]" />
              </div>
              <div className="border-t border-border pt-3 mt-1">
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wider">Admin Account</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Your Name</label>
                <Input placeholder="Full name" value={signupForm.name} onChange={e => setSignupForm(f => ({ ...f, name: e.target.value }))} required maxLength={100} className="border-[#FFE8D6]" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Email</label>
                <Input type="email" placeholder="admin@school.com" value={signupForm.email} onChange={e => setSignupForm(f => ({ ...f, email: e.target.value }))} required maxLength={255} className="border-[#FFE8D6]" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Password</label>
                <Input type="password" placeholder="Min. 8 characters" value={signupForm.password} onChange={e => setSignupForm(f => ({ ...f, password: e.target.value }))} required minLength={8} maxLength={100} className="border-[#FFE8D6]" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Phone</label>
                <Input placeholder="+1 234 567 8900" value={signupForm.phone} onChange={e => setSignupForm(f => ({ ...f, phone: e.target.value }))} required maxLength={20} className="border-[#FFE8D6]" />
              </div>
              <Button type="submit" className="w-full btn-gradient border-0 mt-2" disabled={signupLoading}>
                {signupLoading ? "Registering…" : "Register School"}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleOtpVerify} className="space-y-4 mt-2">
              <p className="text-sm text-muted-foreground">
                We sent a verification code to <span className="font-medium text-foreground">{signupEmail}</span>. Enter it below to activate your account.
              </p>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">OTP Code</label>
                <Input placeholder="Enter 6-digit code" value={otp} onChange={e => setOtp(e.target.value)} required maxLength={6} className="border-[#FFE8D6] text-center text-lg tracking-widest" />
              </div>
              <Button type="submit" className="w-full btn-gradient border-0" disabled={signupLoading}>
                {signupLoading ? "Verifying…" : "Verify & Activate"}
              </Button>
              <button type="button" className="w-full text-sm text-muted-foreground hover:text-foreground" onClick={() => setSignupStep(1)}>
                ← Back to registration
              </button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
