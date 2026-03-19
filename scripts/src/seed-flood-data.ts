import { db } from "@workspace/db";
import {
  districtsTable,
  alertsTable,
  stationsTable,
  stationReadingsTable,
  emergencyResourcesTable,
  evacuationOrdersTable,
} from "@workspace/db/schema";
import { sql } from "drizzle-orm";

async function seedData() {
  console.log("Seeding flood platform data...");

  // Clear tables first
  await db.execute(
    sql`TRUNCATE TABLE evacuation_orders, flood_alerts, station_readings, monitoring_stations, emergency_resources, districts RESTART IDENTITY CASCADE`,
  );

  // Seed districts for Bihar, Assam, Kerala.
  // riskLevel/riskScore/rainfall24h are intentionally set to baseline defaults —
  // the API recomputes them live using Open-Meteo + the 0.4/0.3/0.3 formula.
  // riverLevel, dangerLevel, and populationAffected are physical constants from
  // CWC gauge records and census data — they do not change in real time.
  const districts = await db
    .insert(districtsTable)
    .values([
      // Bihar districts
      {
        name: "Darbhanga",
        state: "Bihar",
        riskLevel: "critical",
        riskScore: 94,
        rainfall24h: 187.4,
        riverLevel: 52.8,
        dangerLevel: 51.0,
        latitude: 26.152,
        longitude: 85.897,
        populationAffected: 890000,
        lastUpdated: new Date(),
      },
      {
        name: "Muzaffarpur",
        state: "Bihar",
        riskLevel: "critical",
        riskScore: 91,
        rainfall24h: 162.1,
        riverLevel: 68.3,
        dangerLevel: 67.0,
        latitude: 26.123,
        longitude: 85.39,
        populationAffected: 750000,
        lastUpdated: new Date(),
      },
      {
        name: "Sitamarhi",
        state: "Bihar",
        riskLevel: "high",
        riskScore: 78,
        rainfall24h: 134.6,
        riverLevel: 71.2,
        dangerLevel: 73.0,
        latitude: 26.59,
        longitude: 85.49,
        populationAffected: 520000,
        lastUpdated: new Date(),
      },
      {
        name: "Supaul",
        state: "Bihar",
        riskLevel: "high",
        riskScore: 74,
        rainfall24h: 118.9,
        riverLevel: 62.1,
        dangerLevel: 65.0,
        latitude: 26.123,
        longitude: 86.608,
        populationAffected: 380000,
        lastUpdated: new Date(),
      },
      {
        name: "Madhubani",
        state: "Bihar",
        riskLevel: "high",
        riskScore: 71,
        rainfall24h: 109.3,
        riverLevel: 58.4,
        dangerLevel: 61.0,
        latitude: 26.353,
        longitude: 86.073,
        populationAffected: 430000,
        lastUpdated: new Date(),
      },
      {
        name: "Samastipur",
        state: "Bihar",
        riskLevel: "moderate",
        riskScore: 52,
        rainfall24h: 87.2,
        riverLevel: 44.6,
        dangerLevel: 48.0,
        latitude: 25.858,
        longitude: 85.778,
        populationAffected: 210000,
        lastUpdated: new Date(),
      },
      {
        name: "Begusarai",
        state: "Bihar",
        riskLevel: "moderate",
        riskScore: 48,
        rainfall24h: 76.4,
        riverLevel: 35.8,
        dangerLevel: 40.0,
        latitude: 25.418,
        longitude: 86.129,
        populationAffected: 180000,
        lastUpdated: new Date(),
      },
      {
        name: "Patna",
        state: "Bihar",
        riskLevel: "low",
        riskScore: 22,
        rainfall24h: 41.2,
        riverLevel: 38.2,
        dangerLevel: 50.0,
        latitude: 25.594,
        longitude: 85.137,
        populationAffected: 45000,
        lastUpdated: new Date(),
      },
      // Assam districts
      {
        name: "Dhemaji",
        state: "Assam",
        riskLevel: "critical",
        riskScore: 96,
        rainfall24h: 201.8,
        riverLevel: 88.6,
        dangerLevel: 85.0,
        latitude: 27.479,
        longitude: 94.566,
        populationAffected: 640000,
        lastUpdated: new Date(),
      },
      {
        name: "Lakhimpur",
        state: "Assam",
        riskLevel: "critical",
        riskScore: 89,
        rainfall24h: 178.3,
        riverLevel: 79.4,
        dangerLevel: 78.0,
        latitude: 27.234,
        longitude: 94.102,
        populationAffected: 580000,
        lastUpdated: new Date(),
      },
      {
        name: "Majuli",
        state: "Assam",
        riskLevel: "high",
        riskScore: 82,
        rainfall24h: 156.7,
        riverLevel: 91.2,
        dangerLevel: 95.0,
        latitude: 26.942,
        longitude: 94.164,
        populationAffected: 167000,
        lastUpdated: new Date(),
      },
      {
        name: "Jorhat",
        state: "Assam",
        riskLevel: "high",
        riskScore: 68,
        rainfall24h: 124.5,
        riverLevel: 73.8,
        dangerLevel: 78.0,
        latitude: 26.748,
        longitude: 94.217,
        populationAffected: 290000,
        lastUpdated: new Date(),
      },
      {
        name: "Sibsagar",
        state: "Assam",
        riskLevel: "moderate",
        riskScore: 55,
        rainfall24h: 93.1,
        riverLevel: 62.4,
        dangerLevel: 70.0,
        latitude: 26.984,
        longitude: 94.637,
        populationAffected: 160000,
        lastUpdated: new Date(),
      },
      {
        name: "Kamrup",
        state: "Assam",
        riskLevel: "moderate",
        riskScore: 44,
        rainfall24h: 71.8,
        riverLevel: 48.6,
        dangerLevel: 58.0,
        latitude: 26.156,
        longitude: 91.778,
        populationAffected: 120000,
        lastUpdated: new Date(),
      },
      {
        name: "Goalpara",
        state: "Assam",
        riskLevel: "low",
        riskScore: 28,
        rainfall24h: 52.3,
        riverLevel: 31.2,
        dangerLevel: 45.0,
        latitude: 26.169,
        longitude: 90.623,
        populationAffected: 30000,
        lastUpdated: new Date(),
      },
      // Kerala districts
      {
        name: "Alappuzha",
        state: "Kerala",
        riskLevel: "high",
        riskScore: 76,
        rainfall24h: 142.8,
        riverLevel: 1.8,
        dangerLevel: 2.0,
        latitude: 9.498,
        longitude: 76.338,
        populationAffected: 340000,
        lastUpdated: new Date(),
      },
      {
        name: "Kottayam",
        state: "Kerala",
        riskLevel: "high",
        riskScore: 69,
        rainfall24h: 128.4,
        riverLevel: 3.2,
        dangerLevel: 4.0,
        latitude: 9.591,
        longitude: 76.522,
        populationAffected: 260000,
        lastUpdated: new Date(),
      },
      {
        name: "Ernakulam",
        state: "Kerala",
        riskLevel: "moderate",
        riskScore: 53,
        rainfall24h: 98.7,
        riverLevel: 2.4,
        dangerLevel: 3.5,
        latitude: 9.983,
        longitude: 76.283,
        populationAffected: 190000,
        lastUpdated: new Date(),
      },
      {
        name: "Idukki",
        state: "Kerala",
        riskLevel: "moderate",
        riskScore: 47,
        rainfall24h: 86.2,
        riverLevel: 5.1,
        dangerLevel: 7.0,
        latitude: 9.85,
        longitude: 76.971,
        populationAffected: 95000,
        lastUpdated: new Date(),
      },
      {
        name: "Pathanamthitta",
        state: "Kerala",
        riskLevel: "low",
        riskScore: 31,
        rainfall24h: 58.4,
        riverLevel: 2.8,
        dangerLevel: 5.5,
        latitude: 9.263,
        longitude: 76.787,
        populationAffected: 40000,
        lastUpdated: new Date(),
      },
    ])
    .returning();

  console.log(`Inserted ${districts.length} districts`);

  // Seed alerts for critical/high risk districts
  const criticalDistricts = districts.filter(
    (d) => d.riskLevel === "critical" || d.riskLevel === "high",
  );
  await db.insert(alertsTable).values(
    criticalDistricts.map((d) => ({
      districtId: d.id,
      severity: d.riskLevel as "low" | "moderate" | "high" | "critical",
      message: generateAlertMessage(
        d.name,
        d.riskLevel,
        d.riverLevel,
        d.dangerLevel,
      ),
      triggeredAt: new Date(Date.now() - Math.random() * 6 * 60 * 60 * 1000),
      isActive: 1,
      riverLevel: d.riverLevel,
      dangerLevel: d.dangerLevel,
    })),
  );
  console.log("Inserted alerts");

  // Seed monitoring stations
  const stations = await db
    .insert(stationsTable)
    .values([
      {
        name: "Hayaghat Gauge",
        river: "Bagmati",
        district: "Darbhanga",
        state: "Bihar",
        latitude: 26.18,
        longitude: 85.91,
        currentLevel: 52.8,
        warningLevel: 49.0,
        dangerLevel: 51.0,
        rainfall1h: 18.4,
        status: "critical",
      },
      {
        name: "Rosera Gauge",
        river: "Burhi Gandak",
        district: "Samastipur",
        state: "Bihar",
        latitude: 25.96,
        longitude: 86.0,
        currentLevel: 44.6,
        warningLevel: 46.0,
        dangerLevel: 48.0,
        rainfall1h: 9.2,
        status: "warning",
      },
      {
        name: "Muzaffarpur Gauge",
        river: "Gandak",
        district: "Muzaffarpur",
        state: "Bihar",
        latitude: 26.12,
        longitude: 85.39,
        currentLevel: 68.3,
        warningLevel: 65.0,
        dangerLevel: 67.0,
        rainfall1h: 15.7,
        status: "critical",
      },
      {
        name: "Patna Gandhi Setu",
        river: "Ganga",
        district: "Patna",
        state: "Bihar",
        latitude: 25.6,
        longitude: 85.09,
        currentLevel: 38.2,
        warningLevel: 47.0,
        dangerLevel: 50.0,
        rainfall1h: 4.1,
        status: "normal",
      },
      {
        name: "Dhemaji Station",
        river: "Brahmaputra",
        district: "Dhemaji",
        state: "Assam",
        latitude: 27.48,
        longitude: 94.57,
        currentLevel: 88.6,
        warningLevel: 82.0,
        dangerLevel: 85.0,
        rainfall1h: 22.8,
        status: "critical",
      },
      {
        name: "Jorhat Station",
        river: "Brahmaputra",
        district: "Jorhat",
        state: "Assam",
        latitude: 26.75,
        longitude: 94.22,
        currentLevel: 73.8,
        warningLevel: 75.0,
        dangerLevel: 78.0,
        rainfall1h: 11.4,
        status: "warning",
      },
      {
        name: "Goalpara Station",
        river: "Brahmaputra",
        district: "Goalpara",
        state: "Assam",
        latitude: 26.17,
        longitude: 90.62,
        currentLevel: 31.2,
        warningLevel: 41.0,
        dangerLevel: 45.0,
        rainfall1h: 5.2,
        status: "normal",
      },
      {
        name: "Alappuzha Gauge",
        river: "Pamba",
        district: "Alappuzha",
        state: "Kerala",
        latitude: 9.5,
        longitude: 76.34,
        currentLevel: 1.8,
        warningLevel: 1.7,
        dangerLevel: 2.0,
        rainfall1h: 14.6,
        status: "danger",
      },
      {
        name: "Kottayam Gauge",
        river: "Meenachil",
        district: "Kottayam",
        state: "Kerala",
        latitude: 9.59,
        longitude: 76.52,
        currentLevel: 3.2,
        warningLevel: 3.5,
        dangerLevel: 4.0,
        rainfall1h: 12.1,
        status: "warning",
      },
      {
        name: "Ernakulam Gauge",
        river: "Periyar",
        district: "Ernakulam",
        state: "Kerala",
        latitude: 9.98,
        longitude: 76.28,
        currentLevel: 2.4,
        warningLevel: 3.0,
        dangerLevel: 3.5,
        rainfall1h: 8.7,
        status: "warning",
      },
    ])
    .returning();

  console.log(`Inserted ${stations.length} stations`);

  // Seed 48 half-hourly readings (24 hours) for each station.
  // Darbhanga (Hayaghat Gauge) and Dhemaji must show a rate-of-rise > 0.2m
  // in the last 3 hours so the backend rate-of-rise check is triggered.
  const RAPID_RISE_STATIONS = new Set(["Hayaghat Gauge", "Dhemaji Station"]);
  const now = Date.now();
  const readings = stations.flatMap((station) => {
    return Array.from({ length: 48 }, (_, i) => {
      const timestamp = new Date(now - (47 - i) * 30 * 60 * 1000);
      const isRecentReading = i >= 42; // last 3 hours = readings 42..47
      const fluctuation = (Math.random() - 0.5) * 0.6;

      let riverLevel: number;
      if (RAPID_RISE_STATIONS.has(station.name)) {
        const baselineRise = (i / 47) * 0.5;
        const rapidRise = isRecentReading ? (i - 42) * 0.065 : 0;
        riverLevel = Math.max(
          0,
          station.currentLevel - 0.5 + baselineRise + rapidRise + fluctuation * 0.3,
        );
      } else {
        const gentleTrend = (i / 47) * 0.3;
        riverLevel = Math.max(
          0,
          station.currentLevel - 1.5 + gentleTrend + fluctuation,
        );
      }

      return {
        stationId: station.id,
        timestamp,
        riverLevel,
        rainfall: Math.max(0, station.rainfall1h + (Math.random() - 0.3) * 6),
      };
    });
  });

  await db.insert(stationReadingsTable).values(readings);
  console.log(`Inserted ${readings.length} station readings`);

  // Seed emergency resources
  await db.insert(emergencyResourcesTable).values([
    { type: "rescue_boat", district: "Darbhanga", state: "Bihar", count: 24, deployed: 18, status: "deployed" },
    { type: "ndrf_team", district: "Darbhanga", state: "Bihar", count: 4, deployed: 4, status: "deployed" },
    { type: "helicopter", district: "Muzaffarpur", state: "Bihar", count: 3, deployed: 2, status: "deployed" },
    { type: "medical_team", district: "Muzaffarpur", state: "Bihar", count: 8, deployed: 6, status: "deployed" },
    { type: "relief_camp", district: "Sitamarhi", state: "Bihar", count: 12, deployed: 9, status: "deployed" },
    { type: "rescue_boat", district: "Dhemaji", state: "Assam", count: 18, deployed: 15, status: "deployed" },
    { type: "ndrf_team", district: "Dhemaji", state: "Assam", count: 3, deployed: 3, status: "deployed" },
    { type: "helicopter", district: "Lakhimpur", state: "Assam", count: 2, deployed: 2, status: "deployed" },
    { type: "medical_team", district: "Lakhimpur", state: "Assam", count: 6, deployed: 4, status: "deployed" },
    { type: "rescue_boat", district: "Alappuzha", state: "Kerala", count: 16, deployed: 12, status: "deployed" },
    { type: "ndrf_team", district: "Alappuzha", state: "Kerala", count: 2, deployed: 2, status: "deployed" },
    { type: "relief_camp", district: "Kottayam", state: "Kerala", count: 8, deployed: 5, status: "deployed" },
    { type: "helicopter", district: "Ernakulam", state: "Kerala", count: 2, deployed: 1, status: "deployed" },
    { type: "rescue_boat", district: "Supaul", state: "Bihar", count: 10, deployed: 0, status: "standby" },
    { type: "medical_team", district: "Kamrup", state: "Assam", count: 4, deployed: 0, status: "standby" },
  ]);
  console.log("Inserted emergency resources");

  // Seed evacuation orders for the top critical/high districts
  const criticalAndHighDistricts = districts.filter(
    (d) => d.riskLevel === "critical" || (d.riskLevel === "high" && d.riskScore > 70),
  );
  await db.insert(evacuationOrdersTable).values([
    {
      districtId: criticalAndHighDistricts[0].id,
      villages: JSON.stringify(["Bahera", "Kamtaul", "Benipur", "Alinagar"]),
      estimatedPeople: 28000,
      evacuated: 21400,
      status: "in_progress",
      issuedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
    },
    {
      districtId: criticalAndHighDistricts[1].id,
      villages: JSON.stringify(["Kanti", "Motipur", "Gaighat", "Sahebganj"]),
      estimatedPeople: 34000,
      evacuated: 28900,
      status: "in_progress",
      issuedAt: new Date(Date.now() - 10 * 60 * 60 * 1000),
    },
    {
      districtId: criticalAndHighDistricts[2]?.id ?? criticalAndHighDistricts[0].id,
      villages: JSON.stringify(["Pupri", "Bajpatti", "Parihar"]),
      estimatedPeople: 19500,
      evacuated: 19500,
      status: "completed",
      issuedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    },
    {
      districtId: criticalAndHighDistricts[3]?.id ?? criticalAndHighDistricts[1].id,
      villages: JSON.stringify(["Majgaon", "Dhemaji Town", "Sissiborgaon"]),
      estimatedPeople: 45000,
      evacuated: 31200,
      status: "in_progress",
      issuedAt: new Date(Date.now() - 8 * 60 * 60 * 1000),
    },
    {
      districtId: criticalAndHighDistricts[4]?.id ?? criticalAndHighDistricts[0].id,
      villages: JSON.stringify(["Boginadi", "Narayanpur"]),
      estimatedPeople: 12000,
      evacuated: 4800,
      status: "ordered",
      issuedAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    },
  ]);
  console.log("Inserted evacuation orders");

  console.log("Seed complete!");
}

function generateAlertMessage(
  district: string,
  riskLevel: string,
  riverLevel: number,
  dangerLevel: number,
): string {
  const excess = (riverLevel - dangerLevel).toFixed(1);
  if (riskLevel === "critical") {
    return `CRITICAL FLOOD ALERT: ${district} - River level ${riverLevel.toFixed(1)}m exceeds danger mark of ${dangerLevel.toFixed(1)}m by ${excess}m. Immediate evacuation ordered.`;
  } else if (riskLevel === "high") {
    return `HIGH FLOOD WARNING: ${district} - River level ${riverLevel.toFixed(1)}m approaching danger mark of ${dangerLevel.toFixed(1)}m. Evacuation advisory issued.`;
  }
  return `FLOOD WATCH: ${district} - Elevated river levels observed. Monitoring closely.`;
}

seedData().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
