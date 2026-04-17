import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLoginBackdrop from '@dadei/ui/components/auth/AuthLoginBackdrop';
import AuthLoginCard from '@dadei/ui/components/auth/AuthLoginCard';
import { useAuth } from '@dadei/ui/hooks/useAuth';

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
    <AuthLoginBackdrop>
      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center justify-center">
        <div className="mb-6 flex w-full max-w-[420px] justify-start">
          <Link
            to="/"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
          >
            ← Home
          </Link>
        </div>
        <AuthLoginCard
          webOAuthNextPath={nextPath}
          onAuthenticated={() => navigate(nextPath, { replace: true })}
        />
      </div>
    </AuthLoginBackdrop>
  );
}
