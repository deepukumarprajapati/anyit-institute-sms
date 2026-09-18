import {
  LayoutDashboard, Users, GraduationCap, School, CalendarCheck,
  DollarSign, BookOpen, Megaphone, BarChart3, Settings,
  MessageSquare, Trophy, LogOut, Clock, CalendarClock, Brain, Shield, Link2, ClipboardList,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { roleLabels } from "@/lib/mock-data";

type NavItem = { title: string; url: string; icon: React.ComponentType<{ className?: string }>; comingSoon?: boolean };

const navByRole: Record<UserRole, NavItem[]> = {
  school_admin: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Students", url: "/students", icon: Users },
    { title: "Teachers", url: "/teachers", icon: GraduationCap },
    { title: "Classes", url: "/classes", icon: School },
    { title: "Attendance", url: "/attendance", icon: CalendarCheck },
    { title: "Fees", url: "/fees", icon: DollarSign },
    { title: "Homework", url: "/homework", icon: BookOpen },
    { title: "Timetable", url: "/timetable", icon: CalendarClock },
    { title: "Notice Board", url: "/notices", icon: Megaphone },
    { title: "Communication", url: "/communication", icon: MessageSquare },
    { title: "Reports", url: "/reports", icon: BarChart3 },
    { title: "AI Assistant", url: "/ai", icon: Brain },
    { title: "Roles & Permissions", url: "/roles-permissions", icon: Shield },
    { title: "Subject & Class", url: "/subject-class", icon: Link2 },
    { title: "Tests & Exams", url: "/test-exams", icon: ClipboardList },
    { title: "Study Materials", url: "/library", icon: BookOpen },
    { title: "Settings", url: "/settings", icon: Settings },
  ],
  teacher: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Attendance", url: "/attendance", icon: CalendarCheck },
    { title: "Homework", url: "/homework", icon: BookOpen },
    { title: "Tests & Exams", url: "/test-exams", icon: ClipboardList },
    { title: "Timetable", url: "/timetable", icon: CalendarClock },
    { title: "Notices", url: "/notices", icon: Megaphone },
    { title: "Communication", url: "/communication", icon: MessageSquare },
    { title: "AI Assistant", url: "/ai", icon: Brain },
    { title: "Study Materials", url: "/library", icon: BookOpen },
  ],
  student: [
    { title: "Dashboard", url: "/", icon: LayoutDashboard },
    { title: "Attendance", url: "/attendance", icon: CalendarCheck },
    { title: "Homework", url: "/homework", icon: BookOpen },
    { title: "Tests & Exams", url: "/student-exams", icon: ClipboardList },
    { title: "Notices", url: "/notices", icon: Megaphone },
    { title: "Communication", url: "/communication", icon: MessageSquare },
    { title: "Report Card", url: "/reports", icon: Trophy },
    { title: "Progress", url: "/progress", icon: BarChart3 },
    { title: "AI Assistant", url: "/ai", icon: Brain },
    { title: "Study Materials", url: "/library", icon: BookOpen },
  ],
  parent: [
    { title: "Dashboard",  url: "/",                   icon: LayoutDashboard },
    { title: "Attendance", url: "/parent-attendance",   icon: CalendarCheck   },
    { title: "Results",    url: "/parent-results",      icon: Trophy          },
    { title: "Fees",       url: "/parent-fees",         icon: DollarSign      },
    { title: "Notices",    url: "/notices",              icon: Megaphone       },
  ],
};

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { user, logout } = useAuth();

  const navItems = navByRole[user?.role || "school_admin"];

  return (
    <Sidebar collapsible="icon" className="border-r border-border" style={{ boxShadow: "4px 0 20px rgba(255,107,43,0.06)" }}>
      <div className="flex h-16 items-center gap-3 px-4 border-b border-border">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl btn-gradient">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gradient tracking-tight font-heading">Anyit Software</span>
            <span className="text-[11px] text-muted-foreground">{roleLabels[user?.role || "school_admin"]}</span>
          </div>
        )}
      </div>
      <SidebarContent className="px-3 py-4 flex flex-col justify-between h-[calc(100%-4rem)]">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground mb-1 font-heading">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.url;
                const linkContent = (
                  <NavLink
                    to={item.url}
                    end={item.url === "/"}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-secondary text-primary border-l-[3px] border-l-primary"
                        : item.comingSoon
                        ? "text-muted-foreground/60 hover:bg-secondary/50"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                    activeClassName="bg-secondary text-primary border-l-[3px] border-l-primary"
                  >
                    <item.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : ""}`} />
                    {!collapsed && (
                      <span className="flex-1 flex items-center gap-2">
                        {item.title}
                        {item.comingSoon && (
                          <span className="coming-soon-badge ml-auto">
                            <Clock className="h-2.5 w-2.5" />
                            Soon
                          </span>
                        )}
                      </span>
                    )}
                  </NavLink>
                );

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      {collapsed ? (
                        <Tooltip delayDuration={0}>
                          <TooltipTrigger asChild>
                            {linkContent}
                          </TooltipTrigger>
                          <TooltipContent side="right" className="flex items-center gap-2">
                            {item.title}
                            {item.comingSoon && <span className="text-[10px] text-muted-foreground">(Soon)</span>}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        linkContent
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto pt-4 border-t border-border">
          {!collapsed && user && (
            <div className="flex items-center gap-2 px-3 py-2 mb-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} />
                <AvatarFallback className="orange-icon-bg text-primary text-xs">{user.name.split(" ").map(w => w[0]).join("")}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user.name}</p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          )}
          {collapsed ? (
            <Tooltip delayDuration={0}>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="w-full text-muted-foreground hover:text-destructive hover:bg-destructive/5" onClick={logout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Logout</TooltipContent>
            </Tooltip>
          ) : (
            <Button variant="ghost" size="default" className="w-full justify-start gap-2 text-muted-foreground hover:text-destructive hover:bg-destructive/5" onClick={logout}>
              <LogOut className="h-4 w-4" />
              <span>Logout</span>
            </Button>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
