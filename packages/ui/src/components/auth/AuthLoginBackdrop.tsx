import type { ReactNode } from 'react';

type AuthLoginBackdropProps = {
  children: ReactNode;
};

/**
 * Full-viewport glass backdrop used around the login card (website route + shared shell).
 */
export default function AuthLoginBackdrop({ children }: AuthLoginBackdropProps) {
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
      {children}
    </div>
  );
}
