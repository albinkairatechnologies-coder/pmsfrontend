'use client';

import { useState } from 'react';
import { useAuth } from '../utils/AuthContext';
import { useRouter } from 'next/navigation';

export default function EmployeeLoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const router = useRouter();

  if (user) {
    router.push('/dashboard');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (email: string, password: string) => {
    setEmail(email);
    setPassword(password);
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl w-full max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-2">👥 Employee Portal</h1>
          <p className="text-gray-600 dark:text-gray-400">KairaFlow - Team Login</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Login Form */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Sign In</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                  required
                />
              </div>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full btn-primary py-3 text-lg disabled:opacity-50"
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <a href="/" className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400">
                ← Back to Main Login
              </a>
            </div>
          </div>

          {/* Quick Login Options */}
          <div>
            <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Quick Login (Demo)</h2>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {[
                { emoji: '👑', label: 'Admin', sub: 'Full access', email: 'admin@agency.com', pass: 'admin123', color: 'from-orange-500 to-red-600' },
                { emoji: '📊', label: 'Marketing Lead', sub: 'john@agency.com', email: 'john@agency.com', pass: 'password123', color: 'from-blue-500 to-blue-600' },
                { emoji: '🤝', label: 'CRM Lead', sub: 'sarah@agency.com', email: 'sarah@agency.com', pass: 'password123', color: 'from-pink-500 to-pink-600' },
                { emoji: '💻', label: 'Web Dev Lead', sub: 'jane@agency.com', email: 'jane@agency.com', pass: 'password123', color: 'from-green-500 to-green-600' },
                { emoji: '📱', label: 'Social Media Lead', sub: 'mike@agency.com', email: 'mike@agency.com', pass: 'password123', color: 'from-purple-500 to-purple-600' },
                { emoji: '🎬', label: 'Video Editing Lead', sub: 'emma@agency.com', email: 'emma@agency.com', pass: 'password123', color: 'from-yellow-500 to-orange-500' },
                { emoji: '👤', label: 'Employee (Alice)', sub: 'alice@agency.com', email: 'alice@agency.com', pass: 'password123', color: 'from-gray-500 to-gray-600' },
                { emoji: '👤', label: 'Employee (Jack)', sub: 'jack@agency.com', email: 'jack@agency.com', pass: 'password123', color: 'from-gray-500 to-gray-600' },
              ].map(({ emoji, label, sub, email, pass, color }) => (
                <button key={email}
                  onClick={() => quickLogin(email, pass)}
                  disabled={loading}
                  className={`w-full p-3 bg-gradient-to-r ${color} hover:opacity-90 text-white rounded-lg shadow transition disabled:opacity-50 text-left`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{emoji}</span>
                    <div>
                      <div className="font-semibold text-sm">{label}</div>
                      <div className="text-xs opacity-80">{sub}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-300">
                <strong>💡 Tip:</strong> Click any role above for instant login, or enter credentials manually.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
