import { Outlet } from 'react-router-dom';
import { getSession } from '../lib/auth';
import { AdminLogin } from '../pages/AdminLogin';

export function AdminRoute() {
  const session = getSession();

  if (!session) {
    return <AdminLogin />;
  }

  return <Outlet />;
}
