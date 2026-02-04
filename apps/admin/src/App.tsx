import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from './lib/auth';

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

// Layout
import AppLayout from './layout/AppLayout';
import { ScrollToTop } from './components/common/ScrollToTop';

// Protected Route wrapper
function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);

  if (!isAuthenticated && !token) {
    return <Navigate to="/signin" replace />;
  }

  return <Outlet />;
}

export default function App() {
  return (
    <Router>
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
