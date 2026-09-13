import { useEffect, useRef, useState } from "react";
import type { SensorReading } from "@/types";
import { useSession, useSettings } from "./useStore";

/**
 * Sensor feed abstraction.
 *
 * Today it produces clearly-labelled DEMO data. When an ESP32 posts readings
 * of the shape below, replace `simulate()` with the live feed — the UI does
 * not change.
 *
 * {
 *   "deviceId": "CAD10-001", "milkTemperature": 8.5,
 *   "ambientTemperature": 31.2, "pcmTemperature": -2.0,
 *   "timestamp": "2026-09-07T18:30:00", "batteryLevel": 87
 * }
 */
export function useSensors() {
  const settings = useSettings();
  const session = useSession();
  const [reading, setReading] = useState<SensorReading | null>(null);
  const [series, setSeries] = useState<
    { time: string; milk: number; ambient: number; pcm: number }[]
  >([]);
  const startRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!settings.demoMode) {
      setReading(null);
      return;
    }
    let cancelled = false;

    const tick = () => {
      const now = new Date();
      const hour = now.getHours() + now.getMinutes() / 60;
      const ambient =
        27 + 6 * Math.sin(((hour - 9) / 24) * Math.PI * 2) + (Math.random() - 0.5) * 0.4;

      let milk: number;
      const target = session?.targetTemperature ?? 4;
      if (session) {
        const minutes = (Date.now() - new Date(session.startTime).getTime()) / 60000;
        const tau = Math.max(session.expectedCoolingTime, 10) / 2.3;
        const floor = target - 0.6;
        milk = floor + (session.initialTemperature - floor) * Math.exp(-minutes / tau);
      } else {
        const minutes = (Date.now() - startRef.current) / 60000;
        milk = 8.6 + Math.sin(minutes / 7) * 0.3 + (Math.random() - 0.5) * 0.15;
      }

      const pcm = -2 + (Math.random() - 0.5) * 0.4;
      const next: SensorReading = {
        deviceId: "CAD10-001",
        milkTemperature: Number(milk.toFixed(1)),
        ambientTemperature: Number(ambient.toFixed(1)),
        pcmTemperature: Number(pcm.toFixed(1)),
        timestamp: now.toISOString(),
        batteryLevel: 87,
        source: "demo",
      };
      if (cancelled) return;
      setReading(next);
      setSeries((prev) =>
        [
          ...prev,
          {
            time: now.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            milk: next.milkTemperature,
            ambient: next.ambientTemperature,
            pcm: next.pcmTemperature,
          },
        ].slice(-40),
      );
    };

    tick();
    const id = setInterval(tick, 4000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [
    settings.demoMode,
    session?.batchId,
    session?.startTime,
    session?.initialTemperature,
    session?.expectedCoolingTime,
    session?.targetTemperature,
    session,
  ]);

  return { reading, series, isDemo: settings.demoMode };
}
