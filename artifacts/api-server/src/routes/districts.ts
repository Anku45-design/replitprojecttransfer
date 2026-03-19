import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  districtsTable,
  alertsTable,
  stationsTable,
  stationReadingsTable,
  emergencyResourcesTable,
  evacuationOrdersTable,
} from "@workspace/db/schema";
import { eq, desc, and, gte, inArray } from "drizzle-orm";

const router: IRouter = Router();

// ─── Open-Meteo live rainfall cache ──────────────────────────────────────────
// Cache TTL: 20 minutes — weather data is not meaningful at sub-minute granularity.
const RAINFALL_CACHE_TTL_MS = 20 * 60 * 1000;

interface RainfallCache {
  fetchedAt: number;
  data: Map<number, number>; // districtId → rainfall_mm_24h
}

let rainfallCache: RainfallCache | null = null;

/**
 * Fetch yesterday's precipitation sum (mm) from Open-Meteo for every district
 * using a single batched request (comma-separated lat/lon arrays).
 * Falls back to the district's seeded rainfall24h value on any error.
 */
async function fetchLiveRainfall(
  districts: Array<{ id: number; latitude: number; longitude: number; rainfall24h: number }>,
): Promise<Map<number, number>> {
  // Return cached value if still fresh
  if (rainfallCache && Date.now() - rainfallCache.fetchedAt < RAINFALL_CACHE_TTL_MS) {
    return rainfallCache.data;
  }

  try {
    const lats = districts.map((d) => d.latitude).join(",");
    const lons = districts.map((d) => d.longitude).join(",");

    const url =
      `https://api.open-meteo.com/v1/forecast` +
      `?latitude=${lats}&longitude=${lons}` +
      `&daily=precipitation_sum` +
      `&timezone=auto&past_days=1&forecast_days=1`;

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);

    const json = await res.json();

    // Single district returns an object; multiple return an array
    const responses: Array<{ daily: { precipitation_sum: (number | null)[] } }> =
      Array.isArray(json) ? json : [json];

    const map = new Map<number, number>();
    districts.forEach((d, i) => {
      // index 0 = yesterday (past_days=1), index 1 = today forecast
      const raw = responses[i]?.daily?.precipitation_sum?.[0];
      map.set(d.id, typeof raw === "number" ? raw : d.rainfall24h);
    });

    rainfallCache = { fetchedAt: Date.now(), data: map };
    return map;
  } catch (err) {
    console.warn("[Open-Meteo] Rainfall fetch failed, using seeded values:", (err as Error).message);
    // On failure: build map from seeded values so nothing downstream breaks
    const fallback = new Map(districts.map((d) => [d.id, d.rainfall24h]));
    return fallback;
  }
}

// ─── Risk score formula (0.4 / 0.3 / 0.3) ───────────────────────────────────
/**
 * All three inputs are normalised to [0, 100] before weighting so the formula
 * is dimensionally consistent:
 *
 *   rainfallScore = min(rainfall_mm / 200, 1) × 100   (200mm/day = extreme)
 *   riverScore    = min(riverLevel / dangerLevel / 1.3, 1) × 100
 *                   (130% of danger level = maximum hazard)
 *   riseScore     = min(rateOfRise_m / 0.5, 1) × 100  (0.5m/3h = extreme)
 *
 *   riskScore = 0.4 × rainfallScore + 0.3 × riverScore + 0.3 × riseScore
 *
 * Risk levels derived from riskScore:
 *   >= 70  → critical
 *   >= 48  → high
 *   >= 28  → moderate
 *   <  28  → low
 */
function computeRiskScore(
  rainfall24h: number,
  riverLevel: number,
  dangerLevel: number,
  rateOfRise: number,
): { riskScore: number; riskLevel: "low" | "moderate" | "high" | "critical" } {
  const rainfallScore = Math.min(rainfall24h / 200, 1) * 100;
  const riverScore =
    dangerLevel > 0 ? Math.min(riverLevel / dangerLevel / 1.3, 1) * 100 : 0;
  const riseScore = Math.min(rateOfRise / 0.5, 1) * 100;

  const riskScore = Math.round(0.4 * rainfallScore + 0.3 * riverScore + 0.3 * riseScore);

  const riskLevel: "low" | "moderate" | "high" | "critical" =
    riskScore >= 70
      ? "critical"
      : riskScore >= 48
        ? "high"
        : riskScore >= 28
          ? "moderate"
          : "low";

  return { riskScore, riskLevel };
}

// ─── Rate-of-Rise helpers ────────────────────────────────────────────────────
const RISE_THRESHOLD_METERS = 0.2;
const RISE_WINDOW_MS = 3 * 60 * 60 * 1000;

async function computeRateOfRise(): Promise<
  Map<string, { rise: number; triggered: boolean }>
> {
  const windowStart = new Date(Date.now() - RISE_WINDOW_MS);

  const allStations = await db.select().from(stationsTable);
  if (allStations.length === 0) return new Map();

  const stationIds = allStations.map((s) => s.id);

  const recentReadings = await db
    .select({
      stationId: stationReadingsTable.stationId,
      timestamp: stationReadingsTable.timestamp,
      riverLevel: stationReadingsTable.riverLevel,
    })
    .from(stationReadingsTable)
    .where(
      and(
        gte(stationReadingsTable.timestamp, windowStart),
        inArray(stationReadingsTable.stationId, stationIds),
      ),
    )
    .orderBy(stationReadingsTable.timestamp);

  const byStation = new Map<number, { ts: Date; level: number }[]>();
  for (const r of recentReadings) {
    const arr = byStation.get(r.stationId) ?? [];
    arr.push({ ts: r.timestamp, level: r.riverLevel });
    byStation.set(r.stationId, arr);
  }

  const stationsByDistrict = new Map<string, number[]>();
  for (const s of allStations) {
    const ids = stationsByDistrict.get(s.district) ?? [];
    ids.push(s.id);
    stationsByDistrict.set(s.district, ids);
  }

  const result = new Map<string, { rise: number; triggered: boolean }>();
  for (const [districtName, ids] of stationsByDistrict) {
    let maxRise = 0;
    for (const id of ids) {
      const readings = byStation.get(id);
      if (!readings || readings.length < 2) continue;
      const oldest = readings[0].level;
      const newest = readings[readings.length - 1].level;
      const rise = newest - oldest;
      if (rise > maxRise) maxRise = rise;
    }
    result.set(districtName, {
      rise: Math.round(maxRise * 100) / 100,
      triggered: maxRise > RISE_THRESHOLD_METERS,
    });
  }

  return result;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get("/districts", async (_req, res) => {
  try {
    const [districts, rateOfRiseMap] = await Promise.all([
      db.select().from(districtsTable).orderBy(desc(districtsTable.riskScore)),
      computeRateOfRise(),
    ]);

    // Fetch live rainfall for all districts in one batched request
    const rainfallMap = await fetchLiveRainfall(districts);

    const result = districts.map((d) => {
      const ror = rateOfRiseMap.get(d.name) ?? { rise: 0, triggered: false };
      const liveRainfall = rainfallMap.get(d.id) ?? d.rainfall24h;

      // Compute risk score using the 0.4/0.3/0.3 formula with live data
      const { riskScore, riskLevel } = computeRiskScore(
        liveRainfall,
        d.riverLevel,
        d.dangerLevel,
        ror.rise,
      );

      // Rate-of-rise can independently force "critical" regardless of formula
      const effectiveRiskLevel =
        ror.triggered && riskLevel !== "critical" ? "critical" : riskLevel;
      const effectiveRiskScore =
        ror.triggered && riskScore < 90 ? Math.max(riskScore, 90) : riskScore;

      return {
        id: d.id,
        name: d.name,
        state: d.state,
        riskLevel: effectiveRiskLevel,
        riskScore: effectiveRiskScore,
        rainfall24h: Math.round(liveRainfall * 10) / 10,
        riverLevel: d.riverLevel,
        dangerLevel: d.dangerLevel,
        latitude: d.latitude,
        longitude: d.longitude,
        populationAffected: d.populationAffected,
        lastUpdated: d.lastUpdated.toISOString(),
        rateOfRise: ror.rise,
        rateOfRiseTriggered: ror.triggered,
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch districts" });
  }
});

router.get("/districts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [[district], rateOfRiseMap] = await Promise.all([
      db.select().from(districtsTable).where(eq(districtsTable.id, id)),
      computeRateOfRise(),
    ]);
    if (!district) {
      return res.status(404).json({ error: "District not found" });
    }

    const rainfallMap = await fetchLiveRainfall([district]);
    const ror = rateOfRiseMap.get(district.name) ?? { rise: 0, triggered: false };
    const liveRainfall = rainfallMap.get(district.id) ?? district.rainfall24h;

    const { riskScore, riskLevel } = computeRiskScore(
      liveRainfall,
      district.riverLevel,
      district.dangerLevel,
      ror.rise,
    );
    const effectiveRiskLevel =
      ror.triggered && riskLevel !== "critical" ? "critical" : riskLevel;
    const effectiveRiskScore =
      ror.triggered && riskScore < 90 ? Math.max(riskScore, 90) : riskScore;

    res.json({
      ...district,
      riskLevel: effectiveRiskLevel,
      riskScore: effectiveRiskScore,
      rainfall24h: Math.round(liveRainfall * 10) / 10,
      lastUpdated: district.lastUpdated.toISOString(),
      rateOfRise: ror.rise,
      rateOfRiseTriggered: ror.triggered,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch district" });
  }
});

router.get("/alerts", async (req, res) => {
  try {
    const { severity, state } = req.query;
    const alerts = await db
      .select({
        id: alertsTable.id,
        districtId: alertsTable.districtId,
        districtName: districtsTable.name,
        state: districtsTable.state,
        severity: alertsTable.severity,
        message: alertsTable.message,
        triggeredAt: alertsTable.triggeredAt,
        isActive: alertsTable.isActive,
        riverLevel: alertsTable.riverLevel,
        dangerLevel: alertsTable.dangerLevel,
      })
      .from(alertsTable)
      .innerJoin(districtsTable, eq(alertsTable.districtId, districtsTable.id))
      .where(eq(alertsTable.isActive, 1))
      .orderBy(desc(alertsTable.triggeredAt));

    let filtered = alerts;
    if (severity) filtered = filtered.filter((a) => a.severity === severity);
    if (state) filtered = filtered.filter((a) => a.state === state);

    res.json(
      filtered.map((a) => ({
        ...a,
        isActive: a.isActive === 1,
        triggeredAt: a.triggeredAt.toISOString(),
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch alerts" });
  }
});

router.get("/stations", async (_req, res) => {
  try {
    const stations = await db.select().from(stationsTable);
    res.json(stations);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch stations" });
  }
});

router.get("/stations/:id/readings", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const hours = Number(req.query.hours) || 24;
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const readings = await db
      .select()
      .from(stationReadingsTable)
      .where(
        and(
          eq(stationReadingsTable.stationId, id),
          gte(stationReadingsTable.timestamp, since),
        ),
      )
      .orderBy(stationReadingsTable.timestamp);
    res.json(
      readings.map((r) => ({
        ...r,
        timestamp: r.timestamp.toISOString(),
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch station readings" });
  }
});

router.get("/summary", async (_req, res) => {
  try {
    const [districts, alerts, rateOfRiseMap] = await Promise.all([
      db.select().from(districtsTable),
      db.select().from(alertsTable).where(eq(alertsTable.isActive, 1)),
      computeRateOfRise(),
    ]);

    const rainfallMap = await fetchLiveRainfall(districts);

    // Apply live formula to each district before summarising
    const effectiveDistricts = districts.map((d) => {
      const ror = rateOfRiseMap.get(d.name) ?? { rise: 0, triggered: false };
      const liveRainfall = rainfallMap.get(d.id) ?? d.rainfall24h;
      const { riskScore, riskLevel } = computeRiskScore(
        liveRainfall,
        d.riverLevel,
        d.dangerLevel,
        ror.rise,
      );
      const effectiveRiskLevel =
        ror.triggered && riskLevel !== "critical" ? "critical" : riskLevel;
      return {
        ...d,
        riskLevel: effectiveRiskLevel,
        riskScore,
        rainfall24h: liveRainfall,
      };
    });

    const criticalDistricts = effectiveDistricts.filter((d) => d.riskLevel === "critical").length;
    const highRiskDistricts = effectiveDistricts.filter((d) => d.riskLevel === "high").length;
    const moderateRiskDistricts = effectiveDistricts.filter((d) => d.riskLevel === "moderate").length;
    const lowRiskDistricts = effectiveDistricts.filter((d) => d.riskLevel === "low").length;
    const totalPopulationAtRisk = effectiveDistricts
      .filter((d) => d.riskLevel !== "low")
      .reduce((sum, d) => sum + d.populationAffected, 0);
    const avgRainfall24h = effectiveDistricts.length
      ? effectiveDistricts.reduce((sum, d) => sum + d.rainfall24h, 0) / effectiveDistricts.length
      : 0;
    const statesAffected = new Set(
      effectiveDistricts.filter((d) => d.riskLevel !== "low").map((d) => d.state),
    ).size;

    res.json({
      totalDistricts: districts.length,
      criticalDistricts,
      highRiskDistricts,
      moderateRiskDistricts,
      lowRiskDistricts,
      activeAlerts: alerts.length,
      totalPopulationAtRisk,
      avgRainfall24h: Math.round(avgRainfall24h * 10) / 10,
      statesAffected,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch summary" });
  }
});

router.get("/authorities/resources", async (_req, res) => {
  try {
    const resources = await db.select().from(emergencyResourcesTable);
    res.json(resources);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch resources" });
  }
});

router.get("/authorities/evacuations", async (_req, res) => {
  try {
    const orders = await db
      .select({
        id: evacuationOrdersTable.id,
        districtId: evacuationOrdersTable.districtId,
        districtName: districtsTable.name,
        state: districtsTable.state,
        villages: evacuationOrdersTable.villages,
        estimatedPeople: evacuationOrdersTable.estimatedPeople,
        evacuated: evacuationOrdersTable.evacuated,
        status: evacuationOrdersTable.status,
        issuedAt: evacuationOrdersTable.issuedAt,
      })
      .from(evacuationOrdersTable)
      .innerJoin(districtsTable, eq(evacuationOrdersTable.districtId, districtsTable.id))
      .orderBy(desc(evacuationOrdersTable.issuedAt));

    res.json(
      orders.map((o) => ({
        ...o,
        villages: JSON.parse(o.villages),
        issuedAt: o.issuedAt.toISOString(),
      })),
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch evacuation orders" });
  }
});

export default router;
