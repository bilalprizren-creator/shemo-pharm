import Image from "next/image";

/** Shared centered card layout for the login and registration pages. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gradient-to-br from-surface via-white to-accent-50/40">
      <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-12">
        <div className="rounded-3xl border border-ink-900/8 bg-white p-6 shadow-card sm:p-8">
          <div className="mb-6 text-center">
            <Image
              src="/logo.svg"
              alt="SHEMO PHARM"
              width={150}
              height={54}
              className="mx-auto h-11 w-auto"
            />
            <h1 className="mt-5 text-2xl font-extrabold text-ink-900">{title}</h1>
            <p className="mt-1.5 text-sm text-ink-500">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
