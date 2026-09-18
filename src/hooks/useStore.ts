import { useCallback, useEffect, useState } from "react";
import { store, subscribe } from "@/services/storage";

/** Re-reads a value from storage whenever any part of the store changes. */
export function useStoreValue<T>(selector: () => T, fallback: T): T {
  const [value, setValue] = useState<T>(fallback);
  const refresh = useCallback(() => setValue(selector()), [selector]);

  useEffect(() => {
    refresh();
    return subscribe(refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
}

export function usePcmRecords() {
  return useStoreValue(() => store.getPcmRecords(), []);
}
export function useCoolingRecords() {
  return useStoreValue(() => store.getCoolingRecords(), []);
}
export function useMaintenance() {
  return useStoreValue(() => store.getMaintenance(), []);
}
export function useServiceRequests() {
  return useStoreValue(() => store.getServiceRequests(), []);
}
export function useSettings() {
  return useStoreValue(() => store.getSettings(), {
    demoMode: true,
  });
}
export function useConfig() {
  return useStoreValue(() => store.getConfig(), store.getConfig());
}
export function useSession() {
  return useStoreValue(() => store.getSession(), null);
}
