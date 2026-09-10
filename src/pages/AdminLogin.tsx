import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { adminLogin } from '../lib/api';
import { saveSession } from '../lib/auth';

export function AdminLogin() {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const session = await adminLogin(password);
      saveSession(session);
      // Force full page reload to ensure AdminRoute re-checks session
      window.location.href = '/admin';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-yala-cream px-4">
      <div className="w-full max-w-md animate-fade-in">
        <div className="bg-white rounded-3xl shadow-2xl border-2 border-yala-green/5 p-8">
          <div className="flex items-center justify-center mb-6">
            <img 
              src="/assets/yala-logo.svg" 
              alt="Yala" 
              className="h-12 w-auto"
            />
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
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 bg-yala-cream border-2 border-yala-green/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-yala-lime focus:border-yala-green transition-all"
                  placeholder="Enter password"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-yala-green/50 hover:text-yala-green transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
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
