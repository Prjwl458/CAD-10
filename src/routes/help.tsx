import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Mail } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Button, Card, Note, SectionTitle } from "@/components/ui-kit";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help Book — CAD-10 PCM Milk Chilling Can" },
      {
        name: "description",
        content:
          "How CAD-10 and its PCM packs work: handling, recharging, tag identification, chilling procedure, cleaning, troubleshooting and safety.",
      },
      { property: "og:title", content: "CAD-10 help book" },
      {
        property: "og:description",
        content:
          "A complete offline guide to using and maintaining the CAD-10 PCM milk chilling can.",
      },
    ],
  }),
  component: HelpPage,
});

type Section = { title: string; items: { heading: string; body: string }[] };

const SECTIONS: Section[] = [
  {
    title: "About CAD-10",
    items: [
      {
        heading: "What is PCM?",
        body: "A Phase Change Material (PCM) is a substance that absorbs a large amount of heat while it melts, at an almost constant temperature. In CAD-10, the PCM pack is frozen beforehand and then absorbs heat from the milk as it melts, cooling the milk without running a compressor during collection.",
      },
      {
        heading: "How CAD-10 works",
        body: "Milk goes into an insulated can. A frozen PCM pack is installed inside. Heat flows from the warm milk into the PCM, which melts and holds the milk near the target temperature. After use, the pack is refrozen and used again — one such use-and-recharge sequence is one PCM cycle.",
      },
      {
        heading: "Why rapid milk cooling matters",
        body: "Milk leaves the animal warm. The longer it stays warm, the faster its quality falls. Cooling soon after milking slows that process. CAD-10 estimates cooling and spoilage risk from configured parameters — it does not test milk quality.",
      },
    ],
  },
  {
    title: "PCM packs",
    items: [
      {
        heading: "Handling",
        body: "Handle packs by the edges, keep them away from sharp objects, and never puncture a pouch. Check for swelling or leakage before every use and report anything unusual under Maintenance.",
      },
      {
        heading: "Freezing and recharging",
        body: "Recharge means fully refreezing the pack after use, until it is solid throughout. A partially frozen pack stores less cooling capacity and the milk may not reach the target temperature.",
      },
      {
        heading: "Storage",
        body: "Store frozen packs flat and clean, away from direct sunlight. Keep spare packs frozen so a second batch can be chilled without waiting.",
      },
      {
        heading: "Tag identification",
        body: "Each pack carries a tag with its PCM ID, for example PCM-CAD10-001. Scanning the tag only identifies the pack — it never changes the cycle count by itself.",
      },
      {
        heading: "Cycle tracking",
        body: "Start Cycle marks that a pack has gone into use. Complete Cycle, confirmed after recharging, increases the count by one. This keeps the count matched to real use instead of to taps.",
      },
    ],
  },
  {
    title: "Using the can",
    items: [
      {
        heading: "Preparing the can",
        body: "Confirm the can is clean, dry and undamaged. Check the lid gasket and the insulation.",
      },
      {
        heading: "Adding milk",
        body: "Pour the milk in and note the quantity and its temperature — both are needed for the cooling estimate.",
      },
      {
        heading: "Installing PCM",
        body: "Place the fully frozen pack in its holder and close the lid so contact with the milk is good.",
      },
      {
        heading: "Starting a chilling cycle",
        body: "Identify the PCM pack using CAD Scan, place the fully frozen pack in its holder and close the lid securely. Live temperatures and estimated spoilage risk can be monitored directly on the Dashboard.",
      },
      {
        heading: "Completing a cycle",
        body: "When collection is complete, remove the PCM pack for recharging/freezing, then confirm cycle completion under CAD Scan to accurately update pack cycle records.",
      },
    ],
  },
  {
    title: "Cleaning",
    items: [
      {
        heading: "Cleaning procedure",
        body: "Rinse, wash with dairy detergent and a soft brush, clean lid, gasket and PCM holder separately, rinse thoroughly and air-dry fully. Record it under Maintenance.",
      },
      {
        heading: "Hygiene precautions",
        body: "Clean after every batch. Never add fresh milk to a wet or unwashed can. Keep the PCM pack surface clean before it goes back into the can.",
      },
    ],
  },
  {
    title: "Troubleshooting",
    items: [
      {
        heading: "Milk is not cooling properly",
        body: "Work through this order: check the PCM condition → check the PCM cycle count and status → check whether the pack was fully frozen → check the insulation and lid seal → check whether the milk quantity exceeds what the loaded PCM can handle.",
      },
      {
        heading: "Cooling takes longer than expected",
        body: "Check whether ambient conditions were unusually warm, ensure the can lid gasket is fully seated, and verify the PCM pack was solid throughout before loading into the can.",
      },
      {
        heading: "The tag does not respond",
        body: "Not every phone or browser supports tag reading. Use Enter PCM ID manually — every function stays available. Report a damaged tag under Maintenance.",
      },
    ],
  },
  {
    title: "Safety",
    items: [
      {
        heading: "Do not open or heat a PCM pouch",
        body: "The material inside is not for contact with milk. If a pouch leaks, remove it, do not use the milk from that batch for sale, and report it.",
      },
      {
        heading: "Handle frozen packs with care",
        body: "Very cold surfaces can hurt bare skin. Use a dry cloth or gloves.",
      },
      {
        heading: "This app does not certify milk",
        body: "All risk indicators are engineering estimates based on configured parameters. No milk safety, quality or bacterial claim is made anywhere in the app.",
      },
    ],
  },
];

function HelpPage() {
  return (
    <AppShell title="Help" subtitle="Digital help book — available offline">
      <div className="mb-4 flex justify-end">
        <a
          href="https://mail.google.com/mail/?view=cm&to=tanmaykarpe24@gmail.com&su=CAD-10%20Support%20Request"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Mail className="h-4 w-4 text-primary" /> Contact Support
        </a>
      </div>
      <LocationCard />
      <div className="mt-4 space-y-4">
        {SECTIONS.map((section) => (
          <Card key={section.title} className="min-w-0">
            <SectionTitle title={section.title} />
            <div className="space-y-2">
              {section.items.map((item) => (
                <details
                  key={item.heading}
                  className="min-w-0 rounded-xl border border-border px-3 py-2"
                >
                  <summary className="min-h-11 cursor-pointer list-none break-words py-2 text-sm font-semibold leading-snug [&::-webkit-details-marker]:hidden">
                    {item.heading}
                  </summary>
                  <p className="break-words pb-2 pt-1 text-sm leading-relaxed text-muted-foreground">
                    {item.body}
                  </p>
                </details>
              ))}
            </div>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}

function LocationCard() {
  const [state, setState] = useState<"idle" | "loading" | "ok" | "denied">("idle");
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [ambient, setAmbient] = useState<number | null>(null);

  useEffect(() => {
    if (state !== "ok" || !coords) return;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => setAmbient(d?.current?.temperature_2m ?? null))
      .catch(() => setAmbient(null));
  }, [state, coords]);

  const advice =
    ambient === null
      ? null
      : ambient >= 35
        ? "Very warm conditions. Keep the can in shade, start chilling as soon as milking finishes and consider loading extra PCM."
        : ambient >= 28
          ? "Warm conditions. Start chilling promptly and keep the lid closed between pours."
          : "Moderate conditions. Normal PCM loading should be sufficient.";

  return (
    <Card>
      <SectionTitle
        title="Local cooling conditions"
        subtitle="Optional — used only to advise on ambient conditions."
      />
      {state === "ok" && ambient !== null ? (
        <>
          <p className="numeric text-2xl font-semibold text-primary">{ambient.toFixed(1)} °C</p>
          <p className="mt-1 text-sm text-muted-foreground">{advice}</p>
        </>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {state === "denied"
              ? "Location was not shared. Everything else in the app continues to work — enter the ambient temperature manually when starting a chilling run."
              : "Share your location to see the current outdoor temperature and a matching cooling suggestion."}
          </p>
          {state !== "denied" ? (
            <Button
              variant="secondary"
              className="mt-3"
              disabled={state === "loading"}
              onClick={() => {
                if (typeof navigator === "undefined" || !navigator.geolocation) {
                  setState("denied");
                  return;
                }
                setState("loading");
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
                    setState("ok");
                  },
                  () => setState("denied"),
                );
              }}
            >
              <MapPin className="h-4 w-4" /> {state === "loading" ? "Checking…" : "Use my location"}
            </Button>
          ) : null}
        </>
      )}
      <div className="mt-3">
        <Note>
          Outdoor temperature comes from a public weather service and is not a measurement from your
          can.
        </Note>
      </div>
    </Card>
  );
}
