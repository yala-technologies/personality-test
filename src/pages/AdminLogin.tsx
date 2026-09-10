import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';
import { adminLogin } from '../lib/api';
import { saveSession } from '../lib/auth';

export function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const session = await adminLogin(password);
      saveSession(session);
      navigate('/admin', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-yala-cream px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-yala-green/5 p-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-yala-lime rounded-2xl flex items-center justify-center">
              <Lock className="w-8 h-8 text-yala-green" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-center text-yala-green mb-2">
            Yala Hiring
          </h1>
          <p className="text-center text-yala-green/70 mb-8 font-medium">
            BDR Personality Assessment
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-yala-green mb-2">
                Admin Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-yala-cream border-2 border-yala-green/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yala-lime focus:border-yala-green transition-all"
                placeholder="Enter password"
                required
                disabled={loading}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border-2 border-red-200 rounded-xl p-4">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yala-green text-yala-lime py-3.5 px-4 rounded-xl font-semibold hover:bg-yala-green/90 focus:outline-none focus:ring-2 focus:ring-yala-lime focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02]"
            >
              {loading ? 'Logging in...' : 'Log In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
