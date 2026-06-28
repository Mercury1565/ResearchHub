import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin } from '../../api/auth';
import { useAuthStore } from '../../store/auth';

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { mutate: login, isLoading, error } = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    login(
      { email, password },
      {
        onSuccess: (data) => {
          setAuth(data.user, data.token);
          navigate('/', { replace: true });
        },
      }
    );
  }

  const errorMsg = error instanceof Error ? error.message : error ? 'Invalid email or password.' : null;

  return (
    <div className="min-h-screen bg-[#F7F7F5] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-lg font-semibold text-[#1A1A1A]">ResearchHub</h1>
          <p className="mt-1 text-sm text-[#6B6B6B]">Sign in to your account</p>
        </div>

        <div className="rounded border border-[#E3E2DF] bg-white p-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#6B6B6B]" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded border border-[#E3E2DF] bg-white px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#A0A09A] focus:border-[#2383E2] focus:outline-none focus:ring-2 focus:ring-[#EDF3FC] transition-colors duration-100"
                placeholder="you@example.com"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[#6B6B6B]" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-[#E3E2DF] bg-white px-3 py-2 text-sm text-[#1A1A1A] placeholder:text-[#A0A09A] focus:border-[#2383E2] focus:outline-none focus:ring-2 focus:ring-[#EDF3FC] transition-colors duration-100"
                placeholder="••••••••"
              />
            </div>

            {errorMsg && (
              <p className="text-xs text-[#E03E3E]">{errorMsg}</p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="rounded px-4 py-2 text-sm font-medium bg-[#2383E2] text-white hover:bg-[#1a6bbf] transition-colors duration-100 disabled:opacity-50"
            >
              {isLoading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-[#6B6B6B]">
          Don't have an account?{' '}
          <Link to="/register" className="text-[#2383E2] hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
