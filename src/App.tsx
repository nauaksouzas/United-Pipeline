import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './hooks/useAuth';

// Views
import { Login } from './views/Auth/Login';
import { SignUp } from './views/Auth/SignUp';
import { SetupAccount } from './views/Auth/SetupAccount';
import { AdminDashboard } from './views/Admin/AdminDashboard';
import { DashboardLayout } from './views/Layouts/DashboardLayout';

import { ProgramManagers } from './views/Admin/ProgramManagers';
import { AllUsers } from './views/Admin/AllUsers';
import { Pathways } from './views/Admin/Pathways';
import { Classes } from './views/Admin/Classes';
import { Communities } from './views/Admin/Communities';
import { ReportCycles } from './views/Admin/ReportCycles';
import { AllReports } from './views/Admin/AllReports';
import { TargetedQuestions } from './views/Admin/TargetedQuestions';
import { Analytics } from './views/Admin/Analytics';
import { AuditLogs } from './views/Admin/AuditLogs';
import { Settings } from './views/Admin/Settings';

import { useEffect } from 'react';

function DashboardRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    switch (user.role) {
      case 'ADMIN': navigate('/admin'); break;
      case 'PROGRAM_MANAGER': navigate('/pm'); break;
      case 'INSTRUCTOR': navigate('/instructor'); break;
      case 'COACH': navigate('/coach'); break;
      case 'STUDENT': navigate('/student'); break;
      default: navigate('/login'); break;
    }
  }, [user, navigate]);

  return <div>Redirecting...</div>;
}

import { StudentReportWizard } from './views/Student/StudentReportWizard';
import { StudentDashboard } from './views/Student/StudentDashboard';
import { PMDashboard } from './views/PM/PMDashboard';
import { CoachDashboard } from './views/Coach/CoachDashboard';
import { InstructorDashboard } from './views/Instructor/InstructorDashboard';
import { ReportDetail } from './views/Admin/ReportDetail';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" />
        <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/setup-account" element={<SetupAccount />} />
        <Route path="/dashboard-redirect" element={<DashboardRedirect />} />
        
        <Route element={<DashboardLayout />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/staff" element={<ProgramManagers />} />
          <Route path="/admin/users" element={<AllUsers />} />
          <Route path="/admin/pathways" element={<Pathways />} />
          <Route path="/admin/classes" element={<Classes />} />
          <Route path="/admin/communities" element={<Communities />} />
          <Route path="/admin/cycles" element={<ReportCycles />} />
          <Route path="/admin/reports" element={<AllReports />} />
          <Route path="/admin/targeted-questions" element={<TargetedQuestions />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/audit" element={<AuditLogs />} />
          <Route path="/admin/settings" element={<Settings />} />
          <Route path="/admin/reports/:id" element={<ReportDetail />} />

          <Route path="/pm" element={<PMDashboard />} />
          <Route path="/pm/reports/:id" element={<ReportDetail />} />
          
          <Route path="/coach" element={<CoachDashboard />} />
          <Route path="/coach/reports/:id" element={<ReportDetail />} />
          
          <Route path="/instructor" element={<InstructorDashboard />} />
          <Route path="/instructor/reports/:id" element={<ReportDetail />} />

          <Route path="/student" element={<StudentDashboard />} />
          <Route path="/student/report" element={<StudentReportWizard />} />
          <Route path="/student/reports/:id" element={<ReportDetail />} />
        </Route>
      </Routes>
    </BrowserRouter>
  </AuthProvider>
  );
}
