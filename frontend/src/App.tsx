import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { PermissionsProvider } from "@/contexts/PermissionsContext";
import Login from "./pages/Login";
import RoleDashboard from "./pages/RoleDashboard";
import Students from "./pages/Students";
import StudentProfile from "./pages/StudentProfile";
import Teachers from "./pages/Teachers";
import Classes from "./pages/Classes";
import Attendance from "./pages/Attendance";
import Fees from "./pages/Fees";
import Notices from "./pages/Notices";
import Homework from "./pages/Homework";
import Reports from "./pages/Reports";
import SettingsPage from "./pages/SettingsPage";
import ProgressPage from "./pages/ProgressPage";
import CommunicationPage from "./pages/CommunicationPage";
import LibraryPage from "./pages/LibraryPage";
import Timetable from "./pages/Timetable";
import AiPage from "./pages/AiPage";
import RolesPermissions from "./pages/RolesPermissions";
import SubjectClassAssignment from "./pages/SubjectClassAssignment";
import TestExamPage from "./pages/TestExamPage";
import StudentExamsPage from "./pages/StudentExamsPage";
import ParentFeesPage from "./pages/ParentFeesPage";
import ParentResultsPage from "./pages/ParentResultsPage";
import ParentAttendancePage from "./pages/ParentAttendancePage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><RoleDashboard /></ProtectedRoute>} />
      <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
      <Route path="/students/:id" element={<ProtectedRoute><StudentProfile /></ProtectedRoute>} />
      <Route path="/teachers" element={<ProtectedRoute><Teachers /></ProtectedRoute>} />
      <Route path="/classes" element={<ProtectedRoute><Classes /></ProtectedRoute>} />
      <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
      <Route path="/exams" element={<Navigate to="/test-exams" replace />} />
      <Route path="/fees" element={<ProtectedRoute><Fees /></ProtectedRoute>} />
      <Route path="/notices" element={<ProtectedRoute><Notices /></ProtectedRoute>} />
      <Route path="/homework" element={<ProtectedRoute><Homework /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
      <Route path="/progress" element={<ProtectedRoute><ProgressPage /></ProtectedRoute>} />
      <Route path="/communication" element={<ProtectedRoute><CommunicationPage /></ProtectedRoute>} />
      <Route path="/library" element={<ProtectedRoute><LibraryPage /></ProtectedRoute>} />
      <Route path="/timetable" element={<ProtectedRoute><Timetable /></ProtectedRoute>} />
      <Route path="/ai" element={<ProtectedRoute><AiPage /></ProtectedRoute>} />
      <Route path="/roles-permissions" element={<ProtectedRoute><RolesPermissions /></ProtectedRoute>} />
      <Route path="/subject-class" element={<ProtectedRoute><SubjectClassAssignment /></ProtectedRoute>} />
      <Route path="/test-exams" element={<ProtectedRoute><TestExamPage /></ProtectedRoute>} />
      <Route path="/student-exams" element={<ProtectedRoute><StudentExamsPage /></ProtectedRoute>} />
      <Route path="/parent-fees"        element={<ProtectedRoute><ParentFeesPage /></ProtectedRoute>} />
      <Route path="/parent-results"     element={<ProtectedRoute><ParentResultsPage /></ProtectedRoute>} />
      <Route path="/parent-attendance"  element={<ProtectedRoute><ParentAttendancePage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <PermissionsProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </PermissionsProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
