import Link from 'next/link';
import { EmailMock, LockArt, ScanMock, TeamMock, UploadArt } from '@/components/brand/Art';
import { DocumentStack } from '@/components/brand/DocumentStack';
import { Logo } from '@/components/brand/Logo';
import { Backdrop } from '@/components/brand/Backdrop';
import { ButtonLink } from '@/components/ui';
import { ExpiryWordings, VaultSamples } from './SampleCards';

// The public home page. It is a server component: no state, no hooks, just markup.

const FAQ: { q: string; a: string }[] = [
  {
    q: 'Which files can I upload?',
    a: 'PDF, JPEG and PNG files, up to 10 MB each. A clear photo taken with a phone works as well as a scan.',
  },
  {
    q: 'What if DocDue cannot read the date?',
    a: 'It tells you. DocDue shows its best guess and asks you to confirm it or type the right date. A date you enter always replaces the automatic one.',
  },
  {
    q: 'Who receives the reminder emails?',
    a: 'The person who uploaded the document and every admin of the organization. Each person gets one email a day that lists everything needing attention, not one email per document.',
  },
  {
    q: 'Where are my files kept?',
    a: 'In a private storage bucket. A link to open a file works for a few minutes and then stops, so a copied link cannot be used later.',
  },
  {
    q: 'Can other organizations see my documents?',
    a: 'No. Every account is separate, and the server checks this on every single request.',
  },
];

const LADDER: { label: string; note: string; dot: string }[] = [
  { label: '30 days before', note: 'Time to start the renewal', dot: 'bg-brand-300' },
  { label: '14 days before', note: 'Book the appointment', dot: 'bg-brand-400' },
  { label: '7 days before', note: 'Last comfortable week', dot: 'bg-amber-400' },
  { label: '1 day before', note: 'Renew today', dot: 'bg-amber-500' },
  { label: 'On the day', note: 'Expires today', dot: 'bg-red-500' },
];

function Header() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-5 sm:py-5">
      <Link href="/" aria-label="DocDue home">
        <Logo />
      </Link>
      <nav aria-label="Sections" className="hidden items-center gap-6 text-sm font-medium text-ink-700 lg:flex">
        <a href="#vault" className="hover:text-brand-700">Your vault</a>
        <a href="#how" className="hover:text-brand-700">How it works</a>
        <a href="#dates" className="hover:text-brand-700">Date reading</a>
        <a href="#features" className="hover:text-brand-700">What you get</a>
        <a href="#faq" className="hover:text-brand-700">Questions</a>
      </nav>
      <div className="flex items-center gap-2">
        <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-medium text-ink-800 hover:bg-ink-100">
          Log in
        </Link>
        <ButtonLink href="/register" className="whitespace-nowrap">
          <span className="sm:hidden">Sign up</span>
          <span className="hidden sm:inline">Create account</span>
        </ButtonLink>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-6 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:pb-24 lg:pt-12">
      <div>
        <h1 className="font-display text-[3.1rem] font-extrabold leading-[0.95] tracking-tight text-balance text-ink-950 sm:text-7xl">
          Know before it expires.
        </h1>
        <p className="mt-6 max-w-[34rem] text-lg leading-relaxed text-ink-700">
          Keep every licence, certificate and permit in one place. DocDue reads the expiry date from
          your scan and emails you in time to renew.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <ButtonLink href="/register" large>
            Create an account
          </ButtonLink>
          <ButtonLink href="/login" variant="secondary" large>
            Log in
          </ButtonLink>
        </div>
        <p className="mt-5 text-sm text-ink-500">Works with PDF, JPEG and PNG files up to 10 MB.</p>
      </div>
      <DocumentStack />
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: '1',
      title: 'Upload a scan',
      text: 'Drop in a PDF or a photo of the document. It goes straight to private storage.',
      art: <UploadArt className="mx-auto h-40 w-full max-w-[15rem]" />,
    },
    {
      n: '2',
      title: 'Check the date',
      text: 'DocDue reads the expiry date. When it is not sure, it asks you to confirm instead of guessing.',
      art: <ScanMock className="mx-auto w-full max-w-[15rem]" />,
    },
    {
      n: '3',
      title: 'Get the reminder',
      text: 'An email arrives before the date, in time to renew. Each reminder is sent once, never twice.',
      art: <EmailMock className="mx-auto w-full max-w-[17rem]" />,
    },
  ];
  return (
    <section id="how" className="scroll-mt-6 border-y border-ink-200 bg-white py-16 lg:py-24">
      <div className="mx-auto max-w-6xl px-5">
        <h2 className="max-w-xl font-display text-3xl font-bold leading-tight tracking-tight text-balance sm:text-5xl">
          From scan to reminder in three steps
        </h2>
        <ol className="mt-12 grid gap-12 md:grid-cols-3 md:gap-8">
          {steps.map((step) => (
            <li key={step.n}>
              <div className="flex h-44 items-center">{step.art}</div>
              <div className="mt-6 flex items-baseline gap-3">
                <span className="font-display text-5xl font-extrabold leading-none text-brand-700">{step.n}</span>
                <h3 className="font-display text-xl font-bold">{step.title}</h3>
              </div>
              <p className="mt-2 max-w-sm leading-relaxed text-ink-600">{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function DashboardPreview() {
  const tiles = [
    { n: '1', label: 'Expired', num: 'text-red-700' },
    { n: '2', label: 'Expiring soon', num: 'text-amber-700' },
    { n: '1', label: 'Needs review', num: 'text-violet-700' },
    { n: '14', label: 'Valid', num: 'text-emerald-700' },
  ];
  const rows = [
    { title: 'Vehicle insurance', when: 'Expired 2 days ago', stripe: 'border-l-red-500' },
    { title: 'Fire safety certificate', when: '7 days left', stripe: 'border-l-amber-500' },
  ];
  return (
    <div aria-label="Example dashboard" role="img">
      <div className="grid grid-cols-4 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg bg-ink-50 p-3 ring-1 ring-ink-200">
            <span className={`block font-display text-3xl font-bold leading-none ${t.num}`}>{t.n}</span>
            <span className="mt-1 block text-[11px] leading-tight text-ink-600">{t.label}</span>
          </div>
        ))}
      </div>
      <ul className="mt-3 space-y-2">
        {rows.map((r) => (
          <li key={r.title} className={`flex items-center justify-between gap-3 rounded-lg border-l-4 bg-white px-4 py-3 text-sm ring-1 ring-ink-200 ${r.stripe}`}>
            <span className="truncate font-medium">{r.title}</span>
            <span className="shrink-0 font-stamp text-xs text-ink-600">{r.when}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Vault() {
  return (
    <section id="vault" className="mx-auto max-w-6xl scroll-mt-6 px-4 py-16 sm:px-5 lg:py-24">
      <p className="font-stamp text-sm uppercase tracking-[0.2em] text-brand-700">Your vault</p>
      <h2 className="mt-2 max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight text-balance sm:text-5xl">
        Every document, with its date up front
      </h2>
      <p className="mt-4 max-w-xl leading-relaxed text-ink-600">
        Each document becomes a card: what it is, when it expires, how much time is left and how the
        date was found.
      </p>
      <div className="mt-10">
        <VaultSamples />
      </div>
    </section>
  );
}

function Wordings() {
  return (
    <section id="dates" className="scroll-mt-6 border-y border-ink-200 bg-white/80 py-16 backdrop-blur-sm lg:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-5">
        <p className="font-stamp text-sm uppercase tracking-[0.2em] text-brand-700">Smart date reading</p>
        <h2 className="mt-2 max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-balance sm:text-5xl">
          Not every document says &ldquo;expiry&rdquo;
        </h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-ink-600">
          Licences say <em>validity</em>, insurance gives a period, permits say <em>renew before</em>.
          DocDue knows the common wordings, and for a range such as &ldquo;01/04/2026 to
          31/03/2027&rdquo; it takes the end date. Issue and birth dates are never mistaken for an
          expiry date.
        </p>
        <div className="mt-10">
          <ExpiryWordings />
        </div>
        <p className="mt-6 max-w-2xl text-sm text-ink-500">
          If a document uses unusual words or shows two competing dates, DocDue does not guess. It
          marks the document &ldquo;needs review&rdquo; and asks you.
        </p>
      </div>
    </section>
  );
}

function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-6 px-5 py-16 lg:py-24">
      <h2 className="max-w-2xl font-display text-3xl font-bold leading-tight tracking-tight text-balance sm:text-5xl">
        Made for people who carry more than one deadline
      </h2>

      <div className="mt-12 grid gap-5 lg:grid-cols-12">
        <article className="rounded-2xl bg-white p-6 ring-1 ring-ink-200 lg:col-span-7 lg:p-8">
          <h3 className="font-display text-2xl font-bold">Every deadline on one screen</h3>
          <p className="mt-2 max-w-md leading-relaxed text-ink-600">
            Four counts tell you where you stand. Click one to see only those documents.
          </p>
          <div className="mt-6">
            <DashboardPreview />
          </div>
        </article>

        <article className="rounded-2xl bg-brand-900 p-6 text-brand-50 lg:col-span-5 lg:p-8">
          <h3 className="font-display text-2xl font-bold">Reminders on a fixed schedule</h3>
          <p className="mt-2 leading-relaxed text-brand-200">
            The same five reminders for every document, so nothing depends on you remembering.
          </p>
          <ol className="mt-6 space-y-3">
            {LADDER.map((rung) => (
              <li key={rung.label} className="flex items-center gap-3">
                <span aria-hidden="true" className={`size-3 shrink-0 rounded-full ${rung.dot}`} />
                <span className="font-medium">{rung.label}</span>
                <span className="ml-auto text-right text-sm text-brand-300">{rung.note}</span>
              </li>
            ))}
          </ol>
        </article>

        <article className="rounded-2xl bg-white p-6 ring-1 ring-ink-200 lg:col-span-5 lg:p-8">
          <h3 className="font-display text-2xl font-bold">Your whole team is covered</h3>
          <p className="mt-2 leading-relaxed text-ink-600">
            Admins are told about every document in the organization, so one person on leave never
            means a missed renewal.
          </p>
          <TeamMock className="mt-6" />
        </article>

        <article className="flex flex-col gap-6 rounded-2xl bg-brand-100 p-6 sm:flex-row sm:items-center lg:col-span-7 lg:p-8">
          <LockArt className="h-36 w-full max-w-[12rem] shrink-0 self-center" />
          <div>
            <h3 className="font-display text-2xl font-bold">Private by default</h3>
            <p className="mt-2 leading-relaxed text-ink-700">
              Your documents are personal, so DocDue treats them that way.
            </p>
            <ul className="mt-4 space-y-2 text-ink-800">
              {['Files sit in a private bucket', 'Links that open a file expire within minutes', 'Each organization sees only its own documents'].map((line) => (
                <li key={line} className="flex items-start gap-2.5">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-700" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </article>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-6xl scroll-mt-6 px-5 pb-16 lg:pb-24">
      <div className="max-w-3xl">
      <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Questions people ask</h2>
      <div className="mt-8 divide-y divide-ink-200 border-y border-ink-200">
        {FAQ.map((item) => (
          <details key={item.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium marker:hidden focus-visible:outline-2 focus-visible:outline-brand-600 [&::-webkit-details-marker]:hidden">
              {item.q}
              <span aria-hidden="true" className="text-2xl leading-none text-brand-700 transition group-open:rotate-45">+</span>
            </summary>
            <p className="mt-3 max-w-xl leading-relaxed text-ink-600">{item.a}</p>
          </details>
        ))}
      </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="bg-brand-950 py-16 text-brand-50 lg:py-20">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-5 md:flex-row md:items-center">
        <h2 className="max-w-xl font-display text-3xl font-bold leading-tight tracking-tight text-balance sm:text-5xl">
          Add your first document today.
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/register"
            className="inline-flex items-center justify-center rounded-lg bg-amber-300 px-6 py-3 text-base font-semibold text-ink-950 transition hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            Create an account
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg px-6 py-3 text-base font-medium text-brand-50 ring-1 ring-inset ring-brand-700 transition hover:bg-brand-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
          >
            Log in
          </Link>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-ink-200 py-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 text-sm text-ink-600">
        <Logo className="text-ink-900" />
        <p>Document expiry tracking for people and teams.</p>
        <nav aria-label="Account" className="flex gap-5">
          <Link href="/login" className="hover:text-brand-700">Log in</Link>
          <Link href="/register" className="hover:text-brand-700">Create account</Link>
        </nav>
      </div>
    </footer>
  );
}

export function Landing() {
  return (
    <div className="relative overflow-x-clip">
      <Backdrop variant="landing" />
      <Header />
      {/* overflow-x-clip: the stamps start at 1.9x size while they land, which would otherwise widen the page on a phone */}
      <main className="overflow-x-clip">
        <Hero />
        <Vault />
        <HowItWorks />
        <Wordings />
        <Features />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  );
}