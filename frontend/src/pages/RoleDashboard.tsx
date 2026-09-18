import { useAuth } from "@/contexts/AuthContext";
import Index from "./Index";
import TeacherDashboard from "./dashboards/TeacherDashboard";
import StudentDashboard from "./dashboards/StudentDashboard";
import ParentDashboard from "./dashboards/ParentDashboard";

export default function RoleDashboard() {
  const { user } = useAuth();
  
  switch (user?.role) {
    case "teacher":
      return <TeacherDashboard />;
    case "student":
      return <StudentDashboard />;
    case "parent":
      return <ParentDashboard />;
    case "school_admin":
    default:
      return <Index />;
  }
}
