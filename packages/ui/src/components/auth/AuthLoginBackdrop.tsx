import type { ReactNode } from 'react';

type AuthLoginBackdropProps = {
  children: ReactNode;
};

/** Full-viewport backdrop for the login route. */
export default function AuthLoginBackdrop({ children }: AuthLoginBackdropProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-x-hidden px-4">
      <div className="absolute inset-0 bg-zinc-950" aria-hidden />
      <div
        className="absolute inset-0 opacity-90"
        style={{
          background:
            'radial-gradient(ellipse 100% 70% at 50% 0%, rgba(16,185,129,0.18), transparent 55%), radial-gradient(circle at 100% 30%, rgba(6,182,212,0.1), transparent 50%)',
        }}
        aria-hidden
      />
      <div className="absolute -left-24 top-1/3 h-64 w-64 rounded-full bg-emerald-600/15 blur-[90px]" aria-hidden />
      <div className="absolute -right-20 bottom-1/4 h-72 w-72 rounded-full bg-teal-600/12 blur-[100px]" aria-hidden />
      <div className="absolute inset-0 backdrop-blur-[28px] backdrop-saturate-150" aria-hidden />
      {children}
    </div>
  );
}
