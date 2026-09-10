import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AdminDashboard } from './pages/AdminDashboard';
import { Assessment } from './pages/Assessment';
import { Complete } from './pages/Complete';
import { AdminRoute } from './components/AdminRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="/admin" element={<AdminRoute />}>
          <Route index element={<AdminDashboard />} />
        </Route>
        <Route path="/assessment/:token" element={<Assessment />} />
        <Route path="/assessment/:token/complete" element={<Complete />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
