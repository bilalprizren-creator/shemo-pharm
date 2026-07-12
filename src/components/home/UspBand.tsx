import {
  MessageCircle,
  Package,
  ShieldCheck,
  UserRound,
} from "lucide-react";

/** Verifiable value props only — no shipping/payment promises. */
const ITEMS = [
  {
    icon: Package,
    title: "Mbi 2000 Produkte",
    text: "Zgjedhje e gjerë me cilësi të garantuar",
  },
  {
    icon: ShieldCheck,
    title: "Distributor i licencuar",
    text: "Nga Agjencia e MSh së Kosovës",
  },
  {
    icon: UserRound,
    title: "Këshillim Profesional",
    text: "Ekipi ynë është këtu për ju",
  },
  {
    icon: MessageCircle,
    title: "Porosi të lehta",
    text: "Përmes WhatsApp ose telefonit",
  },
];

export function UspBand() {
  return (
    <section aria-label="Përparësitë tona" className="mx-auto max-w-7xl px-4 pb-12 lg:px-6 lg:pb-16">
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {ITEMS.map((item) => (
          <li
            key={item.title}
            className="flex items-center gap-4 rounded-xl bg-surface px-5 py-4"
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent-500 text-white">
              <item.icon className="size-5" strokeWidth={1.75} aria-hidden />
            </span>
            <span>
              <span className="block text-sm font-bold text-ink-900">{item.title}</span>
              <span className="block text-xs leading-snug text-ink-500">{item.text}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
