import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import StudentDashboard from './pages/student/StudentDashboard';
import TopicsBrowsePage from './pages/student/TopicsBrowsePage';
import ProposalForm from './pages/student/ProposalForm';
import ProgressPage from './pages/student/ProgressPage';
import SupervisorDashboard from './pages/supervisor/SupervisorDashboard';
import CoordinatorDashboard from './pages/coordinator/CoordinatorDashboard';
import AllocationsPage from './pages/coordinator/AllocationsPage';
import DefenseSchedulingPage from './pages/coordinator/DefenseSchedulingPage';
import ArchivePage from './pages/coordinator/ArchivePage';
import ReportsPage from './pages/coordinator/ReportsPage';
import StatisticsPage from './pages/coordinator/StatisticsPage';
import UserManagementPage from './pages/coordinator/UserManagementPage';
import TopicManagementPage from './pages/coordinator/TopicManagementPage';
import ProjectMonitoringPage from './pages/coordinator/ProjectMonitoringPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import AuditLogPage from './pages/admin/AuditLogPage';
import ProjectDetailPage from './pages/shared/ProjectDetailPage';
import RepositorySearchPage from './pages/shared/RepositorySearchPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          <Route element={<ProtectedRoute allowedRoles={['student']} />}>
            <Route element={<Layout />}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/topics" element={<TopicsBrowsePage />} />
              <Route path="/student/proposal" element={<ProposalForm />} />
              <Route path="/student/progress/:projectId" element={<ProgressPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['supervisor']} />}>
            <Route element={<Layout />}>
              <Route path="/supervisor" element={<SupervisorDashboard />} />
              <Route path="/supervisor/projects/:projectId" element={<ProjectDetailPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['coordinator']} />}>
            <Route element={<Layout />}>
              <Route path="/coordinator" element={<CoordinatorDashboard />} />
              <Route path="/coordinator/topics" element={<TopicManagementPage />} />
              <Route path="/coordinator/projects" element={<ProjectMonitoringPage />} />
              <Route path="/coordinator/projects/:projectId" element={<ProjectDetailPage />} />
              <Route path="/coordinator/allocations" element={<AllocationsPage />} />
              <Route path="/coordinator/defense" element={<DefenseSchedulingPage />} />
              <Route path="/coordinator/archive" element={<ArchivePage />} />
              <Route path="/coordinator/reports" element={<ReportsPage />} />
              <Route path="/coordinator/statistics" element={<StatisticsPage />} />
            </Route>
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route element={<Layout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<UserManagementPage />} />
              <Route path="/admin/audit" element={<AuditLogPage />} />
            </Route>
          </Route>

          <Route element={<ProtectedRoute allowedRoles={['student', 'supervisor', 'coordinator']} />}>
            <Route element={<Layout />}>
              <Route path="/repository" element={<RepositorySearchPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
