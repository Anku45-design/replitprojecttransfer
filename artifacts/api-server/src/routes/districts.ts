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

// ─── Rate-of-Rise helpers ────────────────────────────────────────────────────
const RISE_THRESHOLD_METERS = 0.2; // trigger CRITICAL if rise > this in 3h
const RISE_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours

/**
 * Compute per-district rate-of-rise from station readings in the last 3 hours.
 * Returns a map of districtName → { rise: number, triggered: boolean }.
 *
 * Logic:
 *   - Find all monitoring stations and group by district name.
 *   - For each station, compare the oldest reading in the window to the newest.
 *   - If ANY station in a district shows a rise > RISE_THRESHOLD_METERS, the
 *     district is "triggered" and its riskLevel is upgraded to "critical".
 */
async function computeRateOfRise(): Promise<
  Map<string, { rise: number; triggered: boolean }>
> {
  const windowStart = new Date(Date.now() - RISE_WINDOW_MS);

  // All stations (lightweight – no readings yet)
  const allStations = await db.select().from(stationsTable);
  if (allStations.length === 0) return new Map();

  const stationIds = allStations.map((s) => s.id);

  // Readings inside the 3-hour window for all stations in one query
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
        inArray(stationReadingsTable.stationId, stationIds)
      )
    )
    .orderBy(stationReadingsTable.timestamp);

  // Group readings by stationId
  const byStation = new Map<number, { ts: Date; level: number }[]>();
  for (const r of recentReadings) {
    const arr = byStation.get(r.stationId) ?? [];
    arr.push({ ts: r.timestamp, level: r.riverLevel });
    byStation.set(r.stationId, arr);
  }

  // Build district name → station ids map
  const stationsByDistrict = new Map<string, number[]>();
  for (const s of allStations) {
    const ids = stationsByDistrict.get(s.district) ?? [];
    ids.push(s.id);
    stationsByDistrict.set(s.district, ids);
  }

  // Compute max rise per district
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
      rise: Math.round(maxRise * 100) / 100, // 2 dp
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

    const result = districts.map((d) => {
      const ror = rateOfRiseMap.get(d.name) ?? { rise: 0, triggered: false };

      // Upgrade risk level to CRITICAL if rapid rise detected, even when the
      // absolute river level is still below the danger mark.
      const effectiveRiskLevel =
        ror.triggered && d.riskLevel !== "critical" ? "critical" : d.riskLevel;

      return {
        id: d.id,
        name: d.name,
        state: d.state,
        riskLevel: effectiveRiskLevel,
        riskScore: ror.triggered && d.riskScore < 90 ? Math.max(d.riskScore, 90) : d.riskScore,
        rainfall24h: d.rainfall24h,
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
    const ror = rateOfRiseMap.get(district.name) ?? { rise: 0, triggered: false };
    const effectiveRiskLevel =
      ror.triggered && district.riskLevel !== "critical" ? "critical" : district.riskLevel;

    res.json({
      ...district,
      riskLevel: effectiveRiskLevel,
      riskScore: ror.triggered && district.riskScore < 90 ? Math.max(district.riskScore, 90) : district.riskScore,
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
      }))
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
      .where(and(eq(stationReadingsTable.stationId, id), gte(stationReadingsTable.timestamp, since)))
      .orderBy(stationReadingsTable.timestamp);
    res.json(
      readings.map((r) => ({
        ...r,
        timestamp: r.timestamp.toISOString(),
      }))
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

    // Apply rate-of-rise upgrades before summarising
    const effectiveDistricts = districts.map((d) => {
      const ror = rateOfRiseMap.get(d.name) ?? { rise: 0, triggered: false };
      return {
        ...d,
        riskLevel: ror.triggered && d.riskLevel !== "critical" ? "critical" : d.riskLevel,
      };
    });

    const criticalDistricts = effectiveDistricts.filter((d) => d.riskLevel === "critical").length;
    const highRiskDistricts = effectiveDistricts.filter((d) => d.riskLevel === "high").length;
    const moderateRiskDistricts = effectiveDistricts.filter((d) => d.riskLevel === "moderate").length;
    const lowRiskDistricts = effectiveDistricts.filter((d) => d.riskLevel === "low").length;
    const totalPopulationAtRisk = effectiveDistricts
      .filter((d) => d.riskLevel !== "low")
      .reduce((sum, d) => sum + d.populationAffected, 0);
    const avgRainfall24h = districts.length
      ? districts.reduce((sum, d) => sum + d.rainfall24h, 0) / districts.length
      : 0;
    const statesAffected = new Set(
      effectiveDistricts.filter((d) => d.riskLevel !== "low").map((d) => d.state)
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
      }))
    );
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch evacuation orders" });
  }
});

export default router;
