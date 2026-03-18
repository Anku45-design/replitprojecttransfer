import { pgTable, serial, text, real, integer, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const riskLevelEnum = pgEnum("risk_level", ["low", "moderate", "high", "critical"]);
export const alertSeverityEnum = pgEnum("alert_severity", ["low", "moderate", "high", "critical"]);
export const stationStatusEnum = pgEnum("station_status", ["normal", "warning", "danger", "critical"]);
export const resourceTypeEnum = pgEnum("resource_type", ["rescue_boat", "helicopter", "medical_team", "ndrf_team", "relief_camp"]);
export const resourceStatusEnum = pgEnum("resource_status", ["standby", "deployed", "returning"]);
export const evacuationStatusEnum = pgEnum("evacuation_status", ["ordered", "in_progress", "completed"]);

export const districtsTable = pgTable("districts", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  state: text("state").notNull(),
  riskLevel: riskLevelEnum("risk_level").notNull().default("low"),
  riskScore: real("risk_score").notNull().default(0),
  rainfall24h: real("rainfall_24h").notNull().default(0),
  riverLevel: real("river_level").notNull().default(0),
  dangerLevel: real("danger_level").notNull().default(0),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  populationAffected: integer("population_affected").notNull().default(0),
  lastUpdated: timestamp("last_updated").notNull().defaultNow(),
});

export const insertDistrictSchema = createInsertSchema(districtsTable).omit({ id: true });
export type InsertDistrict = z.infer<typeof insertDistrictSchema>;
export type District = typeof districtsTable.$inferSelect;

export const alertsTable = pgTable("flood_alerts", {
  id: serial("id").primaryKey(),
  districtId: integer("district_id").notNull().references(() => districtsTable.id),
  severity: alertSeverityEnum("severity").notNull(),
  message: text("message").notNull(),
  triggeredAt: timestamp("triggered_at").notNull().defaultNow(),
  isActive: integer("is_active").notNull().default(1),
  riverLevel: real("river_level").notNull(),
  dangerLevel: real("danger_level").notNull(),
});

export const insertAlertSchema = createInsertSchema(alertsTable).omit({ id: true });
export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alertsTable.$inferSelect;

export const stationsTable = pgTable("monitoring_stations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  river: text("river").notNull(),
  district: text("district").notNull(),
  state: text("state").notNull(),
  latitude: real("latitude").notNull(),
  longitude: real("longitude").notNull(),
  currentLevel: real("current_level").notNull().default(0),
  warningLevel: real("warning_level").notNull(),
  dangerLevel: real("danger_level").notNull(),
  rainfall1h: real("rainfall_1h").notNull().default(0),
  status: stationStatusEnum("status").notNull().default("normal"),
});

export const insertStationSchema = createInsertSchema(stationsTable).omit({ id: true });
export type InsertStation = z.infer<typeof insertStationSchema>;
export type Station = typeof stationsTable.$inferSelect;

export const stationReadingsTable = pgTable("station_readings", {
  id: serial("id").primaryKey(),
  stationId: integer("station_id").notNull().references(() => stationsTable.id),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  riverLevel: real("river_level").notNull(),
  rainfall: real("rainfall").notNull(),
});

export const emergencyResourcesTable = pgTable("emergency_resources", {
  id: serial("id").primaryKey(),
  type: resourceTypeEnum("type").notNull(),
  district: text("district").notNull(),
  state: text("state").notNull(),
  count: integer("count").notNull().default(0),
  deployed: integer("deployed").notNull().default(0),
  status: resourceStatusEnum("status").notNull().default("standby"),
});

export const evacuationOrdersTable = pgTable("evacuation_orders", {
  id: serial("id").primaryKey(),
  districtId: integer("district_id").notNull().references(() => districtsTable.id),
  villages: text("villages").notNull(),
  estimatedPeople: integer("estimated_people").notNull(),
  evacuated: integer("evacuated").notNull().default(0),
  status: evacuationStatusEnum("status").notNull().default("ordered"),
  issuedAt: timestamp("issued_at").notNull().defaultNow(),
});
