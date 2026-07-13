import {
  BadgeCheck,
  Handshake,
  MessageCircle,
  Package,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { CardSlider } from "@/components/ui/CardSlider";

/** Verifiable trust points only — no invented shipping/return promises. */
const ITEMS = [
  {
    icon: ShieldCheck,
    title: "Distributor i licencuar",
    text: "Nga Agjencia e MSh së Kosovës",
  },
  {
    icon: BadgeCheck,
    title: "Produkte origjinale",
    text: "Nga brende ndërkombëtare të njohura",
  },
  {
    icon: UserRound,
    title: "Këshillim profesional",
    text: "Ekipi ynë është këtu për ju",
  },
  {
    icon: Package,
    title: "Mbi 2000 produkte",
    text: "Zgjedhje e gjerë në katalogun tonë",
  },
  {
    icon: Handshake,
    title: "Furnizim për barnatore",
    text: "Partneritet i besueshëm me shumicë",
  },
  {
    icon: MessageCircle,
    title: "Porosi të lehta",
    text: "Përmes WhatsApp ose telefonit",
  },
];

/** "Pse SHEMO PHARM" trust slider — pastel icon discs, alternating tints. */
export function UspBand() {
  return (
    <section aria-labelledby="pse-shemo-titulli" className="bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 lg:px-6 lg:py-20">
        <div className="mb-8 max-w-xl">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent-600">
            Cilësi. Besim. Kujdes.
          </p>
          <h2
            id="pse-shemo-titulli"
            className="mt-2 text-2xl font-extrabold text-ink-900 sm:text-3xl"
          >
            Besim që ndërtohet çdo ditë
          </h2>
          <p className="mt-2 text-sm text-ink-500 sm:text-base">
            Kujdes profesional, produkte të zgjedhura dhe shërbim i
            qëndrueshëm për barnatore dhe partnerë.
          </p>
        </div>

        <CardSlider
          label="Pse SHEMO PHARM"
          itemWidthClassName="w-[68%] sm:w-[42%] md:w-[30%] lg:w-[22%]"
        >
          {ITEMS.map((item, i) => (
            <div
              key={item.title}
              className="flex h-full flex-col rounded-xl border border-ink-900/6 bg-white p-5"
            >
              <span
                className={`flex size-12 items-center justify-center rounded-full ${
                  i % 2 === 0 ? "bg-accent-50 text-accent-600" : "bg-brand-50 text-brand-600"
                }`}
              >
                <item.icon className="size-5.5" strokeWidth={1.75} aria-hidden />
              </span>
              <h3 className="mt-3.5 font-bold text-ink-900">{item.title}</h3>
              <p className="mt-1 text-sm leading-snug text-ink-500">{item.text}</p>
            </div>
          ))}
        </CardSlider>
      </div>
    </section>
  );
}
