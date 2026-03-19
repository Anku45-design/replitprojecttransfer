import { useState, useEffect } from "react";
import { 
  useGetDashboardSummary, 
  useGetDistricts, 
  useGetAlerts, 
  useGetStations, 
  useGetStationReadings, 
  useGetAuthorityResources, 
  useGetEvacuationOrders,
  GetAlertsSeverity
} from "@workspace/api-client-react";

// Command center polling frequency (30s)
const POLLING_INTERVAL = 30000;

const defaultQueryOpts = {
  refetchInterval: POLLING_INTERVAL,
  retry: 1,
};

export function useLiveDashboard() {
  return useGetDashboardSummary({ query: defaultQueryOpts });
}

export function useLiveDistricts() {
  return useGetDistricts({ query: defaultQueryOpts });
}

// ─── Risk score formula (0.4 / 0.3 / 0.3) ───────────────────────────────────
// All inputs normalised to [0, 100]:
//   rainfallScore = min(mm / 200, 1) × 100       (200 mm/day = extreme)
//   riverScore    = min(level / danger / 1.3, 1) × 100
//   riseScore     = min(rateOfRise / 0.5, 1) × 100  (0.5 m/3h = extreme)
function calcRiskScore(
  rainfall24h: number,
  riverLevel: number,
  dangerLevel: number,
  rateOfRise: number,
): { riskScore: number; riskLevel: "low" | "moderate" | "high" | "critical" } {
  const rainfallScore = Math.min(rainfall24h / 200, 1) * 100;
  const riverScore =
    dangerLevel > 0 ? Math.min(riverLevel / dangerLevel / 1.3, 1) * 100 : 0;
  const riseScore = Math.min(rateOfRise / 0.5, 1) * 100;

  const riskScore = Math.round(
    0.4 * rainfallScore + 0.3 * riverScore + 0.3 * riseScore,
  );

  const riskLevel =
    riskScore >= 70
      ? "critical"
      : riskScore >= 48
        ? "high"
        : riskScore >= 28
          ? "moderate"
          : "low";

  return { riskScore, riskLevel };
}

// ─── useEnrichedDistricts ─────────────────────────────────────────────────────
/**
 * Wraps useLiveDistricts with a two-phase loading pattern:
 *
 *  Phase 1 (immediate): districts are returned with rainfall24h = 0 and
 *                       riskScore = 0 so the UI has something to render right away.
 *
 *  Phase 2 (async):     a single batched Open-Meteo request fetches yesterday's
 *                       precipitation_sum for every district's lat/lon, then
 *                       recomputes riskScore / riskLevel using the 0.4/0.3/0.3
 *                       weighted formula and updates the state.
 *
 * On every 30-second poll the enrichment re-runs automatically so values stay fresh.
 */
export function useEnrichedDistricts() {
  const { data: rawDistricts, isLoading: isLoadingBase, ...rest } = useGetDistricts({
    query: defaultQueryOpts,
  });

  type DistrictItem = NonNullable<typeof rawDistricts>[number];

  const [enrichedDistricts, setEnrichedDistricts] = useState<DistrictItem[] | undefined>(
    undefined,
  );
  const [isEnriching, setIsEnriching] = useState(false);

  useEffect(() => {
    if (!rawDistricts || rawDistricts.length === 0) return;

    // Phase 1 — zero-initialise rainfall and riskScore immediately
    setEnrichedDistricts(
      rawDistricts.map((d) => ({
        ...d,
        rainfall24h: 0,
        riskScore: 0,
        riskLevel: "low" as const,
      })),
    );

    // Phase 2 — fetch live rainfall from Open-Meteo for all districts at once
    let cancelled = false;
    setIsEnriching(true);

    const enrich = async () => {
      try {
        const lats = rawDistricts.map((d) => d.latitude).join(",");
        const lons = rawDistricts.map((d) => d.longitude).join(",");

        const url =
          `https://api.open-meteo.com/v1/forecast` +
          `?latitude=${lats}&longitude=${lons}` +
          `&daily=precipitation_sum` +
          `&timezone=auto&past_days=1&forecast_days=1`;

        const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
        if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
        const json = await res.json();

        // Single district → object; multiple districts → array
        const responses: Array<{
          daily?: { precipitation_sum?: (number | null)[] };
        }> = Array.isArray(json) ? json : [json];

        if (cancelled) return;

        const live = rawDistricts.map((d, i) => {
          // index 0 = yesterday (past_days=1)
          const raw = responses[i]?.daily?.precipitation_sum?.[0];
          const rainfall24h = typeof raw === "number" ? Math.round(raw * 10) / 10 : 0;

          const rateOfRise = (d as DistrictItem & { rateOfRise?: number }).rateOfRise ?? 0;
          const rateOfRiseTriggered =
            (d as DistrictItem & { rateOfRiseTriggered?: boolean }).rateOfRiseTriggered ?? false;

          const { riskScore, riskLevel } = calcRiskScore(
            rainfall24h,
            d.riverLevel,
            d.dangerLevel,
            rateOfRise,
          );

          // Rate-of-rise independently forces critical
          const effectiveRiskLevel =
            rateOfRiseTriggered && riskLevel !== "critical" ? "critical" : riskLevel;
          const effectiveRiskScore =
            rateOfRiseTriggered && riskScore < 90 ? Math.max(riskScore, 90) : riskScore;

          return {
            ...d,
            rainfall24h,
            riskScore: effectiveRiskScore,
            riskLevel: effectiveRiskLevel as DistrictItem["riskLevel"],
          };
        });

        setEnrichedDistricts(live);
      } catch {
        // Fallback: use whatever the API already returned (server already enriches too)
        if (!cancelled) setEnrichedDistricts(rawDistricts);
      } finally {
        if (!cancelled) setIsEnriching(false);
      }
    };

    enrich();
    return () => {
      cancelled = true;
    };
  }, [rawDistricts]);

  return {
    data: enrichedDistricts,
    isLoading: isLoadingBase || isEnriching,
    isEnriching,
    ...rest,
  };
}

export function useLiveAlerts(severity?: GetAlertsSeverity, state?: string) {
  return useGetAlerts(
    { severity, state }, 
    { query: defaultQueryOpts }
  );
}

export function useLiveStations() {
  return useGetStations({ query: defaultQueryOpts });
}

export function useStationReadings(id: number, hours: number = 24) {
  return useGetStationReadings(
    id, 
    { hours }, 
    { 
      query: { 
        ...defaultQueryOpts,
        enabled: !!id 
      } 
    }
  );
}

export function useLiveResources() {
  return useGetAuthorityResources({ query: defaultQueryOpts });
}

export function useLiveEvacuations() {
  return useGetEvacuationOrders({ query: defaultQueryOpts });
}
