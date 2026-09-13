/**
 * PCM tag reader wrapper.
 *
 * Architecture: tag reader -> PCM tag -> tag UID / PCM ID -> PCM database.
 * The browser reader is only available on some Android/Chromium builds; every
 * caller must handle the unsupported case with the manual PCM-ID fallback.
 */

export type ScanResult = { pcmId: string | null; serialNumber?: string };

export function isScanSupported(): boolean {
  return typeof window !== "undefined" && "NDEFReader" in window;
}

function extractPcmId(event: any): string | null {
  try {
    for (const record of event?.message?.records ?? []) {
      if (record.recordType === "text" || record.recordType === "url") {
        const decoder = new TextDecoder(record.encoding || "utf-8");
        const text = decoder.decode(record.data);
        const match = text.match(/PCM-[A-Z0-9-]+/i);
        if (match) return match[0].toUpperCase();
      }
    }
  } catch {
    /* ignore malformed payloads */
  }
  return null;
}

/** Reads one tag. Rejects when unsupported, denied, or timed out. */
export function scanOnce(timeoutMs = 20000): Promise<ScanResult> {
  return new Promise((resolve, reject) => {
    if (!isScanSupported()) {
      reject(new Error("Tag scanning is not supported on this device."));
      return;
    }
    const Reader = (window as any).NDEFReader;
    const reader = new Reader();
    const controller = new AbortController();
    const timer = setTimeout(() => {
      controller.abort();
      reject(new Error("No tag detected. Hold the phone against the PCM tag and try again."));
    }, timeoutMs);

    reader
      .scan({ signal: controller.signal })
      .then(() => {
        reader.onreading = (event: any) => {
          clearTimeout(timer);
          controller.abort();
          resolve({ pcmId: extractPcmId(event), serialNumber: event?.serialNumber });
        };
        reader.onreadingerror = () => {
          clearTimeout(timer);
          controller.abort();
          reject(new Error("The tag could not be read. Try again."));
        };
      })
      .catch((err: Error) => {
        clearTimeout(timer);
        reject(new Error(err?.message || "Tag scanning could not be started."));
      });
  });
}
