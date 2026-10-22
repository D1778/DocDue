import type { ReactNode } from 'react';
import { Stamp } from './Stamp';

// The picture at the top of the home page: three paper documents with rubber stamps.
// It is built from ordinary HTML, so it stays sharp at any size and needs no image file.

function Paper({
  title,
  className,
  children,
}: {
  title: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`absolute w-[14rem] rounded-sm border border-ink-200 bg-white p-4 pl-7 text-ink-900 shadow-[0_18px_40px_-18px_rgba(14,21,18,0.45)] sm:w-[17rem] ${className}`}
    >
      {/* two punch holes, like a document kept in a ring binder */}
      <span aria-hidden="true" className="absolute left-2.5 top-5 size-2.5 rounded-full bg-paper shadow-inner" />
      <span aria-hidden="true" className="absolute left-2.5 top-[4.5rem] size-2.5 rounded-full bg-paper shadow-inner" />
      <p className="font-display text-base font-bold leading-tight">{title}</p>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

function Line({ w }: { w: string }) {
  return <span aria-hidden="true" className={`block h-1.5 rounded-full bg-ink-100 ${w}`} />;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex items-baseline justify-between gap-3 border-b border-dashed border-ink-200 pb-1 text-xs">
      <span className="text-ink-500">{label}</span>
      <span className="font-stamp text-[13px] text-ink-800">{value}</span>
    </p>
  );
}

export function DocumentStack() {
  return (
    <div
      className="relative mx-auto h-[34rem] w-full max-w-[34rem] sm:h-[27rem]"
      role="img"
      aria-label="Three documents marked with the stamps Valid, Expiring and Expired"
    >
      <Paper title="Trade licence" className="left-0 top-0 -rotate-6 sm:top-8">
        <Field label="Holder" value="Meera Joshi" />
        <Field label="Valid thru" value="14 Mar 2031" />
        <Line w="w-4/5" />
        <Line w="w-3/5" />
        <div className="pt-9" />
        <Stamp tone="valid" rotate={-6} delayMs={500} className="absolute bottom-3 left-8 text-sm">
          Valid
        </Stamp>
      </Paper>

      <Paper title="Fire safety certificate" className="right-0 top-[8.5rem] rotate-3 sm:top-0">
        <Field label="Premises" value="Unit 4" />
        <Field label="Time left" value="7 days" />
        <Line w="w-2/3" />
        <Line w="w-4/5" />
        <div className="pt-9" />
        <Stamp tone="expiring" rotate={5} delayMs={900} className="absolute bottom-3 right-3 text-sm">
          Expiring
        </Stamp>
      </Paper>

      <Paper title="Vehicle insurance" className="bottom-0 left-[4%] -rotate-1 sm:left-[10%]">
        <Field label="Policy holder" value="Meera Joshi" />
        <Field label="Valid thru" value="03 Feb 2025" />
        <Line w="w-3/4" />
        <Line w="w-1/2" />
        <div className="pt-10" />
        <Stamp
          tone="expired"
          rotate={-13}
          delayMs={1350}
          className="absolute bottom-2 right-0 text-xl sm:text-2xl"
        >
          Expired
        </Stamp>
      </Paper>
    </div>
  );
}