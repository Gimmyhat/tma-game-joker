import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated } from './lib/auth';

// Pages
import SignIn from './pages/AuthPages/SignIn';
import NotFound from './pages/OtherPage/NotFound';
import Home from './pages/Dashboard/Home';
import UsersPage from './pages/Admin/UsersPage';
import UserDetailPage from './pages/Admin/UserDetailPage';
import TransactionsPage from './pages/Admin/TransactionsPage';
import EventLogPage from './pages/Admin/EventLogPage';
import SettingsPage from './pages/Admin/SettingsPage';
import TablesPage from './pages/Admin/TablesPage';
import TableDetailPage from './pages/Admin/TableDetailPage';
import TasksPage from './pages/Admin/TasksPage';
import TaskDetailPage from './pages/Admin/TaskDetailPage';
import TaskCreatePage from './pages/Admin/TaskCreatePage';
import NotificationsPage from './pages/Admin/NotificationsPage';
import NotificationDetailPage from './pages/Admin/NotificationDetailPage';

// Layout
import AppLayout from './layout/AppLayout';
import { ScrollToTop } from './components/common/ScrollToTop';

// Protected Route wrapper
function ProtectedRoute() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const isHydrated = useAuthStore((state) => state.isHydrated);

  // Wait for hydration to complete before making auth decision
  if (!isHydrated) {
    return null; // or a loading spinner
  }

  if (!isAuthenticated) {
    return <Navigate to="/signin" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <Router basename="/admin">
      <ScrollToTop />
      <Routes>
        {/* Protected Dashboard Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index path="/" element={<Home />} />
            <Route path="/users" element={<UsersPage />} />
            <Route path="/users/:id" element={<UserDetailPage />} />
            <Route path="/transactions" element={<TransactionsPage />} />
            <Route path="/event-log" element={<EventLogPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/tables" element={<TablesPage />} />
            <Route path="/tables/:id" element={<TableDetailPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/tasks/new" element={<TaskCreatePage />} />
            <Route path="/tasks/:id" element={<TaskDetailPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/notifications/new" element={<NotificationDetailPage />} />
            <Route path="/notifications/:id" element={<NotificationDetailPage />} />
          </Route>
        </Route>

        {/* Auth Routes (public) */}
        <Route path="/signin" element={<SignIn />} />

        {/* Fallback */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}
