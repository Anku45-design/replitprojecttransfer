import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { districtsTable, alertsTable, stationsTable, stationReadingsTable, emergencyResourcesTable, evacuationOrdersTable } from "@workspace/db/schema";
import { eq, desc, and, gte } from "drizzle-orm";

const router: IRouter = Router();

router.get("/districts", async (_req, res) => {
  try {
    const districts = await db.select().from(districtsTable).orderBy(desc(districtsTable.riskScore));
    const result = districts.map((d) => ({
      id: d.id,
      name: d.name,
      state: d.state,
      riskLevel: d.riskLevel,
      riskScore: d.riskScore,
      rainfall24h: d.rainfall24h,
      riverLevel: d.riverLevel,
      dangerLevel: d.dangerLevel,
      latitude: d.latitude,
      longitude: d.longitude,
      populationAffected: d.populationAffected,
      lastUpdated: d.lastUpdated.toISOString(),
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch districts" });
  }
});

router.get("/districts/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [district] = await db.select().from(districtsTable).where(eq(districtsTable.id, id));
    if (!district) {
      return res.status(404).json({ error: "District not found" });
    }
    res.json({
      ...district,
      lastUpdated: district.lastUpdated.toISOString(),
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
    const districts = await db.select().from(districtsTable);
    const alerts = await db.select().from(alertsTable).where(eq(alertsTable.isActive, 1));

    const criticalDistricts = districts.filter((d) => d.riskLevel === "critical").length;
    const highRiskDistricts = districts.filter((d) => d.riskLevel === "high").length;
    const moderateRiskDistricts = districts.filter((d) => d.riskLevel === "moderate").length;
    const lowRiskDistricts = districts.filter((d) => d.riskLevel === "low").length;
    const totalPopulationAtRisk = districts
      .filter((d) => d.riskLevel !== "low")
      .reduce((sum, d) => sum + d.populationAffected, 0);
    const avgRainfall24h = districts.length
      ? districts.reduce((sum, d) => sum + d.rainfall24h, 0) / districts.length
      : 0;
    const statesAffected = new Set(districts.filter((d) => d.riskLevel !== "low").map((d) => d.state)).size;

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
