import { Search, Bell, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";

export function TopNavbar() {
  const { user } = useAuth();

  const schoolName =
    user?.schoolName ||
    (typeof user?.school === "object" ? user?.school?.schoolName : undefined) ||
    "My School";

  return (
    <header className="glass-navbar sticky top-0 z-30 flex h-16 items-center justify-between gap-4 px-6">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-muted-foreground hover:text-primary transition-colors" />
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students, classes..."
            className="w-80 pl-9 bg-white border-[#FFE8D6] text-sm placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary hover:bg-secondary">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-white" />
        </Button>

        <div className="hidden sm:flex items-center gap-2 rounded-lg border border-[#FFE8D6] bg-white px-3 py-1.5 text-sm cursor-pointer hover:bg-secondary transition-colors">
          <SchoolIcon className="h-4 w-4 text-primary" />
          <span className="text-foreground font-medium">{schoolName}</span>
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        </div>

        <div className="flex items-center gap-2 cursor-pointer">
          <Avatar className="h-8 w-8 ring-2 ring-primary/20">
            <AvatarImage src={user?.avatar} alt={user?.name} />
            <AvatarFallback className="orange-icon-bg text-primary text-xs font-medium">
              {user?.name?.split(" ").map(w => w[0]).join("") || "U"}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}

function SchoolIcon(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M14 22v-4a2 2 0 1 0-4 0v4"/><path d="m18 10 4 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8l4-2"/><path d="M18 5v17"/><path d="m4 6 8-4 8 4"/><path d="M6 5v17"/><circle cx="12" cy="9" r="2"/>
    </svg>
  );
}
