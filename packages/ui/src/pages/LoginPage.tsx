import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLoginCard from '@mira/ui/components/auth/AuthLoginCard';
import { useAuth } from '@mira/ui/hooks/useAuth';

function isSafeInternalPath(path: string): boolean {
  if (!path.startsWith('/') || path.startsWith('//') || path.includes('://')) return false;
  if (path.startsWith('/login')) return false;
  return true;
}

export default function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const nextPath = useMemo(() => {
    const raw = searchParams.get('next');
    if (raw && isSafeInternalPath(raw)) return raw;
    return '/app';
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(nextPath, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, nextPath]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-linear-to-br from-[#00ff88] to-[#00cc6a]">
        <div className="flex flex-col items-center gap-4">
          <i className="fas fa-microphone-alt text-6xl text-white animate-pulse" />
          <p className="text-xl font-medium text-white">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden px-4 flex items-center justify-center">
      <div className="absolute inset-0 bg-white/35" aria-hidden />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_0%,rgba(0,255,136,0.14),transparent_55%)]"
        aria-hidden
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_100%_30%,rgba(0,204,106,0.08),transparent_50%)]"
        aria-hidden
      />
      <div className="absolute -left-24 top-1/3 h-64 w-64 rounded-full bg-emerald-200/35 blur-[90px]" aria-hidden />
      <div className="absolute -right-20 bottom-1/4 h-72 w-72 rounded-full bg-teal-200/30 blur-[100px]" aria-hidden />
      <div className="absolute inset-0 backdrop-blur-[28px] backdrop-saturate-150" aria-hidden />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center justify-center">
        <div className="mb-6 flex w-full max-w-[420px] justify-start">
          <Link
            to="/"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            ← Home
          </Link>
        </div>
        <AuthLoginCard onAuthenticated={() => navigate(nextPath, { replace: true })} />
      </div>
    </div>
  );
}
