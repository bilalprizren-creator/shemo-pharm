import Link from "next/link";
import { ArrowRight, BadgeCheck, Handshake, ShieldCheck, Truck } from "lucide-react";
import { SITE } from "@/lib/site";

const POINTS = [
  {
    icon: ShieldCheck,
    title: "E licencuar",
    text: "Nga Agjencia për Produkte dhe Pajisje Mjekësore e Ministrisë së Shëndetësisë së Kosovës",
  },
  {
    icon: Truck,
    title: "Furnizim me shumicë",
    text: "Shpërndarje e besueshme për barnatore dhe institucione në gjithë Kosovën",
  },
  {
    icon: BadgeCheck,
    title: "Produkte të përzgjedhura",
    text: "Brende ndërkombëtare me cilësi të verifikuar",
  },
  {
    icon: Handshake,
    title: "Partneritet afatgjatë",
    text: "Mbështetje profesionale për klientët dhe partnerët tanë",
  },
];

export function AboutSection() {
  return (
    <section aria-labelledby="rreth-nesh-titulli" className="bg-mint">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 lg:grid-cols-2 lg:gap-16 lg:px-6 lg:py-20">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
            Rreth nesh
          </p>
          <h2
            id="rreth-nesh-titulli"
            className="mt-2 text-2xl font-extrabold leading-tight text-ink-900 sm:text-3xl"
          >
            Përkushtim ndaj cilësisë dhe shëndetit
          </h2>
          <p className="mt-4 leading-relaxed text-ink-500">
            SHEMO PHARM operon si {SITE.taglineLong.toLowerCase()} në territorin
            e Kosovës. Kompania bashkëpunon me barnatore, profesionistë dhe
            partnerë të sektorit të shëndetësisë, duke ofruar produkte të
            përzgjedhura me kujdes dhe shërbim të besueshëm.
          </p>
          <Link
            href="/rreth-nesh"
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full border border-brand-600 px-6 py-3 text-sm font-semibold text-brand-700 transition-colors hover:bg-brand-600 hover:text-white"
          >
            Mëso më shumë
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {POINTS.map((p) => (
            <li
              key={p.title}
              className="rounded-2xl border border-ink-900/6 bg-white p-5 shadow-card"
            >
              <p.icon className="size-6 text-brand-600" strokeWidth={1.75} aria-hidden />
              <h3 className="mt-3 font-semibold text-ink-900">{p.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink-500">{p.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
