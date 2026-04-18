import { useLayoutEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@dadei/ui/hooks/useAuth';
import { authApi } from '@dadei/ui/lib/api/auth';
import { buildWebGoogleOAuthLoginUrl } from '@dadei/ui/lib/webOAuthUrls';
import { ASSISTANT_PATH } from '@dadei/ui/lib/assistantPaths';
import logoUrl from '../../assets/logo.png';

const veilEase = [0.22, 1, 0.36, 1] as const;

const glassInput =
  'w-full rounded-xl border border-white/10 bg-zinc-900/55 px-3.5 py-2.5 font-sans text-sm text-zinc-100 shadow-inner shadow-black/30 placeholder:text-zinc-500 backdrop-blur-md transition-[border-color,background-color,box-shadow,opacity] duration-200 focus:border-emerald-500/45 focus:bg-zinc-900/75 focus:outline-none focus:ring-2 focus:ring-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-40';

type AuthLoginCardProps = {
  onAuthenticated?: () => void;
  webOAuthNextPath?: string;
};

export default function AuthLoginCard({
  onAuthenticated,
  webOAuthNextPath = ASSISTANT_PATH,
}: AuthLoginCardProps) {
  const { login, register, saveTokens } = useAuth();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const authBlockRef = useRef<HTMLDivElement>(null);
  const [authBlockHeightPx, setAuthBlockHeightPx] = useState<number | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useLayoutEffect(() => {
    const el = authBlockRef.current;
    if (!el) return;

    const measure = () => {
      setAuthBlockHeightPx(el.scrollHeight);
    };

    measure();
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(measure);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [isLoginMode, error, loading]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLoginMode) {
        await login({ email, password });
        onAuthenticated?.();
        return;
      }

      if (password !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }

      await register({ email, password });
      onAuthenticated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : isLoginMode ? 'Sign in failed' : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    if (window.electronAPI) {
      setLoading(true);
      try {
        const result = await window.electronAPI.loginWithGoogle();
        if (!result.success || !result.data) {
          throw new Error(result.error || 'Google OAuth failed');
        }
        const { code, state } = result.data;
        const response = await authApi.googleCallback(code, state);
        await window.electronAPI.storeTokens(response.access_token, response.refresh_token);
        await saveTokens({
          accessToken: response.access_token,
          refreshToken: response.refresh_token,
        });
        onAuthenticated?.();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Google login failed');
      } finally {
        setLoading(false);
      }
      return;
    }

    const spaOrigin = typeof window !== 'undefined' ? window.location.origin : undefined;
    window.location.href = buildWebGoogleOAuthLoginUrl(webOAuthNextPath, spaOrigin);
  };

  return (
    <motion.div
      initial={{ y: 18, scale: 0.98, opacity: 0 }}
      animate={{ y: 0, scale: 1, opacity: 1 }}
      transition={{
        duration: prefersReducedMotion ? 0.16 : 0.36,
        ease: veilEase,
        delay: prefersReducedMotion ? 0 : 0.05,
      }}
      className="relative w-full max-w-[420px] rounded-2xl border border-white/10 bg-zinc-900/55 p-8 shadow-[0_24px_80px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] ring-1 ring-emerald-500/15 backdrop-blur-2xl"
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-2xl bg-linear-to-b from-emerald-500/10 via-transparent to-zinc-950/40 opacity-90"
        aria-hidden
      />

      <div className="relative mb-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl border border-emerald-500/30 bg-zinc-950/60 shadow-[0_8px_32px_rgba(16,185,129,0.12)]">
          <img src={logoUrl} alt="" className="h-full w-full object-cover" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 font-brand">Welcome to Dadei</h1>
        <p className="mt-2 text-sm text-zinc-500 font-secondary">
          Sign in to your intelligent voice workspace
        </p>
      </div>

      <div className="relative">
        <div
          className="overflow-hidden"
          style={{
            height: authBlockHeightPx === null ? undefined : authBlockHeightPx,
            transitionProperty:
              prefersReducedMotion || authBlockHeightPx === null ? 'none' : 'height',
            transitionDuration: prefersReducedMotion ? '0.01ms' : '0.42s',
            transitionTimingFunction: 'cubic-bezier(0.22, 1, 0.36, 1)',
          }}
        >
          <div ref={authBlockRef}>
            <motion.form
              key={isLoginMode ? 'login' : 'register'}
              initial={{ opacity: 0, y: 10, filter: prefersReducedMotion ? 'none' : 'blur(6px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              <div>
                <label
                  htmlFor="auth-email"
                  className="mb-1.5 block text-xs font-medium text-zinc-400 font-secondary"
                >
                  Email
                </label>
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className={glassInput}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="mb-1.5 block text-xs font-medium text-zinc-400 font-secondary"
                >
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className={glassInput}
                  placeholder={isLoginMode ? '••••••••' : 'At least 6 characters'}
                  autoComplete={isLoginMode ? 'current-password' : 'new-password'}
                />
              </div>

              <AnimatePresence initial={false}>
                {!isLoginMode ? (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <label
                      htmlFor="auth-confirm"
                      className="mb-1.5 block text-xs font-medium text-zinc-400 font-secondary"
                    >
                      Confirm password
                    </label>
                    <input
                      id="auth-confirm"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required={!isLoginMode}
                      disabled={loading}
                      className={glassInput}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full rounded-xl border border-emerald-500/35 bg-linear-to-r from-emerald-600 to-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] drop-shadow-[0_8px_22px_rgba(5,150,105,0.45)] transition-[filter,opacity] hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    {isLoginMode ? 'Signing in…' : 'Creating account…'}
                  </span>
                ) : isLoginMode ? (
                  'Sign in'
                ) : (
                  'Create account'
                )}
              </button>
            </motion.form>

            <AnimatePresence initial={false}>
              {error ? (
                <motion.div
                  key="auth-error"
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-start gap-2 rounded-xl border border-rose-500/35 bg-rose-950/50 px-3 py-2.5 text-sm text-rose-100 backdrop-blur-md">
                    <i className="fas fa-exclamation-circle mt-0.5 shrink-0 text-rose-400" aria-hidden />
                    <span>{error}</span>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-zinc-500 font-secondary">
          {isLoginMode ? "Don't have an account?" : 'Already have an account?'}{' '}
          <button
            type="button"
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError('');
            }}
            disabled={loading}
            className="font-sans font-semibold text-emerald-400/95 transition-colors hover:text-emerald-300 disabled:opacity-50"
          >
            {isLoginMode ? 'Create one' : 'Sign In'}
          </button>
        </p>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center" aria-hidden>
            <div className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="rounded-full border border-white/10 bg-zinc-950/60 px-3 py-1 font-medium text-zinc-500 shadow-sm backdrop-blur-md font-secondary">
              Or continue with
            </span>
          </div>
        </div>

        <div className="space-y-2.5">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-2.5 text-sm font-medium text-zinc-200 shadow-sm backdrop-blur-md transition-[background-color,border-color,box-shadow] hover:border-white/15 hover:bg-zinc-800/60 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {loading ? 'Connecting…' : 'Google'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
