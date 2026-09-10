import type { AdminSession } from './types';

const SESSION_KEY = 'admin_session';

export function saveSession(session: AdminSession): void {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function getSession(): AdminSession | null {
  const stored = sessionStorage.getItem(SESSION_KEY);
  if (!stored) return null;
  
  try {
    const session: AdminSession = JSON.parse(stored);
    
    // Check if session is expired
    if (Date.now() > session.expires_at) {
      clearSession();
      return null;
    }
    
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function clearSession(): void {
  sessionStorage.removeItem(SESSION_KEY);
}
