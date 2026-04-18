import { useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthLoginBackdrop from '@dadei/ui/components/auth/AuthLoginBackdrop';
import AuthLoginCard from '@dadei/ui/components/auth/AuthLoginCard';
import { useAuth } from '@dadei/ui/hooks/useAuth';
import { ASSISTANT_PATH } from '@dadei/ui/lib/assistantPaths';

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
    return ASSISTANT_PATH;
  }, [searchParams]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(nextPath, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, nextPath]);

  if (isLoading || isAuthenticated) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <i className="fas fa-microphone-alt text-6xl text-emerald-400/80 animate-pulse" />
          <p className="text-xl font-medium text-zinc-300 font-secondary">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <AuthLoginBackdrop>
      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-col items-center justify-center">
        <AuthLoginCard
          webOAuthNextPath={nextPath}
          onAuthenticated={() => navigate(nextPath, { replace: true })}
        />
      </div>
    </AuthLoginBackdrop>
  );
}
