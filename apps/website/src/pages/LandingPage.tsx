import { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  useReducedMotion,
} from 'framer-motion';

const DESKTOP_APP_URL =
  import.meta.env.VITE_DESKTOP_APP_URL || 'https://github.com/mira-assistant/desktop-app/releases';

function FloatingAppMockup() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const rotateX = useTransform(scrollYProgress, [0, 0.45], reduce ? [0, 0] : [14, 0]);
  const rotateY = useTransform(scrollYProgress, [0, 0.45], reduce ? [0, 0] : [-10, 4]);
  const y = useTransform(scrollYProgress, [0, 0.5], reduce ? [0, 0] : [80, -20]);
  const scale = useTransform(scrollYProgress, [0, 0.35], reduce ? [1, 1] : [0.92, 1]);
  const springRotateX = useSpring(rotateX, { stiffness: 80, damping: 22 });
  const springRotateY = useSpring(rotateY, { stiffness: 80, damping: 22 });

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[min(92vw,520px)] [perspective:1400px]">
      <motion.div
        style={{
          rotateX: springRotateX,
          rotateY: springRotateY,
          y,
          scale,
          transformStyle: 'preserve-3d',
        }}
        className="relative rounded-[1.35rem] border border-white/40 bg-white/80 p-2 shadow-[0_50px_120px_-20px_rgba(15,23,42,0.35),0_0_0_1px_rgba(255,255,255,0.6)_inset] backdrop-blur-xl"
      >
        <motion.div
          animate={reduce ? undefined : { y: [0, -10, 0] }}
          transition={
            reduce ? undefined : { duration: 5.5, repeat: Infinity, ease: 'easeInOut' }
          }
        >
        <div className="absolute -inset-8 -z-10 rounded-[2rem] bg-linear-to-br from-[#00ff88]/25 via-violet-400/20 to-sky-400/25 blur-3xl" />
        <div className="flex items-stretch gap-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-linear-to-br from-[#f8fffc] to-[#eefcfb] shadow-inner">
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-10">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-[#00ff88]/35 blur-xl" />
              <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-linear-to-br from-[#00ff88] to-[#00b359] text-white shadow-[0_20px_50px_rgba(0,204,106,0.45)]">
                <i className="fas fa-microphone-alt text-4xl" aria-hidden />
              </div>
            </div>
            <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#00a855]/80">
              Listening
            </p>
          </div>
          <div className="min-h-[220px] w-[min(48%,220px)] border-l border-slate-200/70 bg-white/70 p-3">
            <div className="mb-2 flex items-center gap-2 border-b border-slate-100 pb-2">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-[10px] font-semibold text-slate-500">Interactions</span>
            </div>
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-lg bg-slate-50/90 px-2 py-2 shadow-sm"
                  style={{ opacity: 1 - i * 0.18 }}
                >
                  <div className="mb-1 h-1.5 w-3/4 rounded-full bg-slate-200" />
                  <div className="h-1 w-1/2 rounded-full bg-slate-100" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute -right-6 top-1/4 hidden h-24 w-24 rounded-2xl border border-white/50 bg-white/60 shadow-lg sm:block md:-right-10 md:h-28 md:w-28" />
        <div
          className="pointer-events-none absolute -left-5 bottom-1/4 hidden h-16 w-16 rounded-xl border border-violet-200/60 bg-violet-50/80 shadow-md sm:block"
          style={{ transform: 'translateZ(40px)' }}
        />
        </motion.div>
      </motion.div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-[#00a855]">{eyebrow}</p>
      <h2 className="font-display text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h2>
      <p className="mt-4 text-lg text-slate-600">{subtitle}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-[#fafbfc] text-slate-900 antialiased">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,rgba(0,255,136,0.18),transparent)]" />
        <div className="absolute right-0 top-1/3 h-[500px] w-[500px] translate-x-1/3 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-[420px] w-[420px] -translate-x-1/3 rounded-full bg-sky-200/25 blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="flex items-center gap-2 text-lg font-semibold text-[#00a855]">
            <i className="fas fa-microphone-alt" aria-hidden />
            Mira
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition-colors hover:text-slate-900">
              Features
            </a>
            <a href="#how" className="transition-colors hover:text-slate-900">
              How it works
            </a>
            <a href="#faq" className="transition-colors hover:text-slate-900">
              FAQ
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href={DESKTOP_APP_URL}
              className="rounded-full border border-slate-200/90 bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:px-4 sm:text-sm"
            >
              Get the app
            </a>
            <Link
              to="/app"
              className="rounded-full bg-linear-to-r from-[#00e070] to-[#00b359] px-3 py-2 text-xs font-semibold text-white shadow-[0_8px_24px_rgba(0,204,106,0.35)] transition hover:brightness-110 sm:px-5 sm:text-sm"
            >
              Open web app
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className="relative mx-auto max-w-6xl px-5 pb-24 pt-16 sm:px-8 sm:pt-24">
          <div className="grid items-center gap-14 lg:grid-cols-[1fr_minmax(0,1.05fr)] lg:gap-10">
            <div>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-3 py-1 text-xs font-semibold text-[#007a47]"
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                </span>
                Distributed personal assistant
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.05 }}
                className="font-display text-[2.35rem] font-normal leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem]"
              >
                One assistant,{' '}
                <span className="bg-linear-to-r from-[#00c95f] via-emerald-500 to-teal-500 bg-clip-text text-transparent">
                  everywhere you are
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.12 }}
                className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600"
              >
                Mira is a personal assistant that runs across your devices and keeps context with you—
                whether you are at your desk, on your laptop, or checking in from another screen. Speak
                naturally, stay organized, and let the network do the coordination.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.18 }}
                className="mt-10 flex flex-wrap items-center gap-4"
              >
                <Link
                  to="/app"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-7 py-3.5 text-sm font-semibold text-white shadow-xl transition hover:bg-slate-800"
                >
                  Start in browser
                  <i className="fas fa-arrow-right text-xs opacity-80" aria-hidden />
                </Link>
                <a
                  href={DESKTOP_APP_URL}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-3.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50"
                >
                  <i className="fab fa-apple text-lg" aria-hidden />
                  Get the app
                </a>
              </motion.div>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.5 }}
                className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500"
              >
                <span className="flex items-center gap-2">
                  <i className="fas fa-check-circle text-emerald-500" aria-hidden />
                  Voice-first interactions
                </span>
                <span className="flex items-center gap-2">
                  <i className="fas fa-check-circle text-emerald-500" aria-hidden />
                  Multi-device presence
                </span>
              </motion.p>
            </div>
            <FloatingAppMockup />
          </div>
        </section>

        <section className="border-y border-slate-200/80 bg-white/50 py-14 backdrop-blur-sm">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-center gap-4 px-5 text-center sm:flex-row sm:gap-12 sm:px-8">
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-400">
              Built for people who live across machines
            </p>
            <div className="hidden h-8 w-px bg-slate-200 sm:block" />
            <p className="max-w-xl text-base text-slate-600">
              Your phone, your workstation, your travel laptop—same assistant, same thread of context,
              orchestrated so you never feel like you are switching products.
            </p>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
          <SectionTitle
            eyebrow="Features"
            title="Save hours, stay sharper."
            subtitle="From quick voice captures to richer follow-ups, Mira is designed around how you actually work."
          />
          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: 'fa-wave-square',
                title: 'Natural voice',
                body: 'Talk the way you would to a person. Mira focuses on intent, not rigid commands.',
                tint: 'from-emerald-400/20 to-teal-400/10',
              },
              {
                icon: 'fa-network-wired',
                title: 'Distributed by design',
                body: 'Clients on different devices can participate in the same assistant network.',
                tint: 'from-violet-400/20 to-indigo-400/10',
              },
              {
                icon: 'fa-bolt',
                title: 'Low-friction flow',
                body: 'Jump in, capture a thought, and get back to deep work without changing gears.',
                tint: 'from-amber-400/25 to-orange-400/10',
              },
              {
                icon: 'fa-users',
                title: 'People-aware',
                body: 'Keep interactions and context aligned with the people you collaborate with.',
                tint: 'from-sky-400/20 to-blue-400/10',
              },
              {
                icon: 'fa-shield-halved',
                title: 'You stay in control',
                body: 'Sign in on the devices you trust. Your sessions belong to you.',
                tint: 'from-slate-400/15 to-slate-300/10',
              },
              {
                icon: 'fa-mobile-screen',
                title: 'Wherever you open it',
                body: 'Use the web experience here, or grab the desktop build when you want native hooks.',
                tint: 'from-fuchsia-400/15 to-pink-400/10',
              },
            ].map((card) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.45 }}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm transition hover:shadow-md"
              >
                <div
                  className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-linear-to-br ${card.tint} blur-2xl transition group-hover:scale-110`}
                />
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white">
                  <i className={`fas ${card.icon}`} aria-hidden />
                </div>
                <h3 className="text-lg font-semibold text-slate-900">{card.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{card.body}</p>
              </motion.div>
            ))}
          </div>
        </section>

        <section id="how" className="bg-linear-to-b from-slate-900 via-slate-900 to-slate-950 py-24 text-white">
          <div className="mx-auto max-w-6xl px-5 sm:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.25em] text-emerald-400/90">
                How it works
              </p>
              <h2 className="font-display text-3xl font-normal tracking-tight sm:text-4xl">
                Three beats of the same rhythm
              </h2>
              <p className="mt-4 text-lg text-slate-400">
                Install or open Mira on each device you use. The experience stays familiar while the
                assistant coordinates in the background.
              </p>
            </div>
            <div className="mt-16 grid gap-8 md:grid-cols-3">
              {[
                {
                  step: '01',
                  title: 'Connect',
                  body: 'Authenticate once per device. Tokens stay on the machine you trust.',
                },
                {
                  step: '02',
                  title: 'Speak & act',
                  body: 'Use voice and panels to capture interactions and follow up in context.',
                },
                {
                  step: '03',
                  title: 'Stay in sync',
                  body: 'Native clients can wire into deeper OS hooks; the web app keeps you mobile.',
                },
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  className="relative rounded-2xl border border-white/10 bg-white/[0.06] p-8 backdrop-blur-md"
                >
                  <span className="text-4xl font-bold text-emerald-400/30">{item.step}</span>
                  <h3 className="mt-4 text-xl font-semibold">{item.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.body}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section id="get-app" className="mx-auto max-w-6xl scroll-mt-24 px-5 py-24 sm:px-8">
          <div className="overflow-hidden rounded-[2rem] border border-slate-200/90 bg-linear-to-br from-white to-emerald-50/40 p-10 shadow-[0_40px_100px_-40px_rgba(15,23,42,0.2)] sm:p-14">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="font-display text-3xl font-normal tracking-tight text-slate-900 sm:text-4xl">
                  Prefer native? Grab the desktop build.
                </h2>
                <p className="mt-4 text-lg text-slate-600">
                  The desktop app adds secure token storage, OAuth sign-in, and webhook bridges for power
                  users. By default, the &quot;Get the app&quot; buttons open the latest desktop release page.
                  Set <code className="rounded bg-slate-100 px-1.5 py-0.5 text-sm">VITE_DESKTOP_APP_URL</code>{' '}
                  to override this destination.
                </p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <a
                    href={DESKTOP_APP_URL}
                    className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <i className="fas fa-download" aria-hidden />
                    Get the app
                  </a>
                  <Link
                    to="/app"
                    className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                  >
                    Continue in browser
                  </Link>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-4 lg:justify-end">
                {['macOS', 'Windows', 'Linux'].map((os) => (
                  <div
                    key={os}
                    className="flex min-w-[140px] flex-col items-center rounded-2xl border border-slate-200/80 bg-white/80 px-6 py-8 text-center shadow-sm"
                  >
                    <i
                      className={`mb-3 text-3xl text-slate-700 ${
                        os === 'macOS' ? 'fab fa-apple' : os === 'Windows' ? 'fab fa-windows' : 'fab fa-linux'
                      }`}
                      aria-hidden
                    />
                    <span className="text-sm font-semibold text-slate-800">{os}</span>
                    <span className="mt-1 text-xs text-slate-500">Desktop build</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="faq" className="border-t border-slate-200/80 bg-white/60 py-24 backdrop-blur-sm">
          <div className="mx-auto max-w-3xl px-5 sm:px-8">
            <h2 className="text-center font-display text-3xl font-normal text-slate-900 sm:text-4xl">
              Frequently asked questions
            </h2>
            <dl className="mt-12 space-y-4">
              {[
                {
                  q: 'What is Mira?',
                  a: 'Mira is a distributed personal assistant: you interact through voice and rich panels, and your experience can span multiple devices on the same network.',
                },
                {
                  q: 'How is the web app different from the desktop app?',
                  a: 'The web app runs entirely in your browser—ideal for quick access. The Electron desktop build can integrate more tightly with your OS for OAuth, secure storage, and webhooks.',
                },
                {
                  q: 'Is my data shared across devices automatically?',
                  a: 'Your account ties sessions together; device-specific features depend on whether you use the browser or native client. Check your deployment settings for the backend you connect to.',
                },
              ].map((faq) => (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-slate-200/90 bg-white px-5 py-5 shadow-sm"
                >
                  <dt className="font-semibold text-slate-900">{faq.q}</dt>
                  <dd className="mt-2 text-sm leading-relaxed text-slate-600">{faq.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-slate-50 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 px-5 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2 text-slate-600">
            <i className="fas fa-microphone-alt text-[#00a855]" aria-hidden />
            <span className="font-semibold text-slate-800">Mira</span>
            <span className="text-sm text-slate-500">© {new Date().getFullYear()}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-slate-600">
            <Link to="/app" className="hover:text-slate-900">
              Web app
            </Link>
            <a href="#features" className="hover:text-slate-900">
              Features
            </a>
            <a href={DESKTOP_APP_URL} className="hover:text-slate-900">
              Get the app
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
