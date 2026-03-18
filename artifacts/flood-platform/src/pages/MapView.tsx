import { useState } from "react";
import { useLiveDistricts } from "@/hooks/use-flood-data";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { CloudRain, Waves, Users, AlertTriangle, X } from "lucide-react";

const RISK_COLORS = {
  low: "#10b981",
  moderate: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

const RISK_BG = {
  low: "rgba(16,185,129,0.12)",
  moderate: "rgba(234,179,8,0.12)",
  high: "rgba(249,115,22,0.12)",
  critical: "rgba(239,68,68,0.12)",
};

type RiskLevel = keyof typeof RISK_COLORS;

interface District {
  id: number;
  name: string;
  state: string;
  riskLevel: string;
  riskScore: number;
  rainfall24h: number;
  riverLevel: number;
  dangerLevel: number;
  latitude: number;
  longitude: number;
  populationAffected: number;
  lastUpdated: string;
}

function RiverLevelGauge({ current, danger }: { current: number; danger: number }) {
  const warningLevel = danger * 0.85;
  const maxLevel = danger * 1.15;
  const pct = Math.min((current / maxLevel) * 100, 100);
  const warningPct = (warningLevel / maxLevel) * 100;
  const dangerPct = (danger / maxLevel) * 100;

  let barColor = "#10b981";
  if (current >= danger) barColor = "#ef4444";
  else if (current >= warningLevel) barColor = "#f97316";

  const excess = current - danger;

  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs mb-1" style={{ color: "#94a3b8" }}>
        <span>River Level Gauge</span>
        <span style={{ color: current >= danger ? "#ef4444" : "#f97316" }}>
          {current >= danger
            ? `+${Math.abs(excess).toFixed(1)}m above danger`
            : `${Math.abs(excess).toFixed(1)}m to danger`}
        </span>
      </div>
      <div
        style={{
          position: "relative",
          height: "20px",
          background: "rgba(255,255,255,0.08)",
          borderRadius: "6px",
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {/* Filled bar */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${pct}%`,
            background: barColor,
            borderRadius: "6px",
            transition: "width 0.4s",
          }}
        />
        {/* Warning marker */}
        <div
          style={{
            position: "absolute",
            left: `${warningPct}%`,
            top: 0,
            height: "100%",
            width: "2px",
            background: "#eab308",
            zIndex: 2,
          }}
          title="Warning Level"
        />
        {/* Danger marker */}
        <div
          style={{
            position: "absolute",
            left: `${dangerPct}%`,
            top: 0,
            height: "100%",
            width: "2px",
            background: "#ef4444",
            zIndex: 2,
          }}
          title="Danger Level"
        />
      </div>
      {/* Scale labels */}
      <div className="flex justify-between text-xs mt-1" style={{ color: "#64748b", fontFamily: "monospace" }}>
        <span>0m</span>
        <span style={{ color: "#eab308" }}>⚠ {warningLevel.toFixed(1)}m</span>
        <span style={{ color: "#ef4444" }}>🚨 {danger.toFixed(1)}m</span>
      </div>
    </div>
  );
}

function DistrictSidePanel({
  district,
  onClose,
}: {
  district: District;
  onClose: () => void;
}) {
  const risk = district.riskLevel as RiskLevel;
  const color = RISK_COLORS[risk] || RISK_COLORS.low;
  const bg = RISK_BG[risk] || RISK_BG.low;

  return (
    <div
      style={{
        position: "absolute",
        top: "1rem",
        left: "1rem",
        zIndex: 800,
        width: "300px",
        background: "#0f172a",
        border: `1px solid ${color}44`,
        borderRadius: "12px",
        boxShadow: `0 0 24px ${color}33`,
        color: "#e2e8f0",
        fontFamily: "system-ui, sans-serif",
        fontSize: "13px",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: bg,
          borderBottom: `1px solid ${color}33`,
          padding: "14px 16px",
          borderRadius: "12px 12px 0 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div style={{ fontSize: "16px", fontWeight: 700, color: "#f1f5f9" }}>{district.name}</div>
          <div style={{ color: "#94a3b8", fontSize: "12px", marginTop: "2px" }}>{district.state}</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              background: color + "22",
              border: `1px solid ${color}55`,
              color,
              borderRadius: "6px",
              padding: "2px 8px",
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {district.riskLevel}
          </span>
          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "6px",
              padding: "4px",
              cursor: "pointer",
              color: "#94a3b8",
              display: "flex",
              alignItems: "center",
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "14px 16px" }}>
        {/* Risk score */}
        <div style={{ marginBottom: "14px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "6px",
              color: "#94a3b8",
              fontSize: "11px",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            <span>Risk Score</span>
            <span style={{ color, fontWeight: 700, fontSize: "14px" }}>{district.riskScore}/100</span>
          </div>
          <div
            style={{
              height: "6px",
              background: "rgba(255,255,255,0.08)",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${district.riskScore}%`,
                background: color,
                borderRadius: "4px",
              }}
            />
          </div>
        </div>

        {/* River level gauge — main focus */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px" }}>
            <Waves size={14} color="#38bdf8" />
            <span style={{ fontWeight: 600, color: "#f1f5f9", fontSize: "12px" }}>River Level vs Danger Mark</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: 800, fontFamily: "monospace", color: district.riverLevel >= district.dangerLevel ? "#ef4444" : "#f97316" }}>
                {district.riverLevel.toFixed(1)}m
              </div>
              <div style={{ color: "#64748b", fontSize: "11px" }}>Current</div>
            </div>
            <div style={{ borderLeft: "1px solid rgba(255,255,255,0.08)" }} />
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "20px", fontWeight: 800, fontFamily: "monospace", color: "#ef4444" }}>
                {district.dangerLevel.toFixed(1)}m
              </div>
              <div style={{ color: "#64748b", fontSize: "11px" }}>Danger Mark</div>
            </div>
          </div>
          <RiverLevelGauge current={district.riverLevel} danger={district.dangerLevel} />
        </div>

        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "4px" }}>
          <div
            style={{
              background: "rgba(56,189,248,0.08)",
              border: "1px solid rgba(56,189,248,0.15)",
              borderRadius: "8px",
              padding: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
              <CloudRain size={12} color="#38bdf8" />
              <span style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>Rainfall 24h</span>
            </div>
            <div style={{ fontWeight: 700, fontFamily: "monospace", color: "#38bdf8" }}>
              {district.rainfall24h.toFixed(1)} mm
            </div>
          </div>
          <div
            style={{
              background: "rgba(168,85,247,0.08)",
              border: "1px solid rgba(168,85,247,0.15)",
              borderRadius: "8px",
              padding: "10px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "4px" }}>
              <Users size={12} color="#a855f7" />
              <span style={{ color: "#64748b", fontSize: "11px", textTransform: "uppercase" }}>At Risk</span>
            </div>
            <div style={{ fontWeight: 700, fontFamily: "monospace", color: "#a855f7" }}>
              {formatNumber(district.populationAffected)}
            </div>
          </div>
        </div>

        <div style={{ color: "#475569", fontSize: "11px", marginTop: "10px", textAlign: "right" }}>
          Updated: {new Date(district.lastUpdated).toLocaleTimeString()}
        </div>
      </div>
    </div>
  );
}

export default function MapView() {
  const { data: districts } = useLiveDistricts();
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);
  const mapCenter: [number, number] = [26.0, 87.0];

  return (
    <div className="space-y-4 h-[calc(100vh-6rem)] flex flex-col">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Spatial Risk Map</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Click any district marker to inspect river level vs danger mark.
        </p>
      </div>

      <div className="flex-1 relative rounded-xl overflow-hidden border border-border">
        {/* Risk Legend */}
        <div
          style={{
            position: "absolute",
            top: "1rem",
            right: "1rem",
            zIndex: 800,
            background: "rgba(15,23,42,0.92)",
            backdropFilter: "blur(8px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px",
            padding: "14px",
            minWidth: "160px",
          }}
        >
          <div style={{ color: "#94a3b8", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "10px", fontWeight: 600 }}>
            Risk Legend
          </div>
          {(Object.entries(RISK_COLORS) as [RiskLevel, string][]).map(([level, color]) => (
            <div key={level} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
              <span
                style={{
                  width: "10px",
                  height: "10px",
                  borderRadius: "50%",
                  background: color,
                  boxShadow: `0 0 6px ${color}`,
                  flexShrink: 0,
                }}
              />
              <span style={{ color: "#e2e8f0", fontSize: "12px", textTransform: "capitalize" }}>{level} Risk</span>
            </div>
          ))}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: "10px", paddingTop: "8px", color: "#64748b", fontSize: "11px" }}>
            {districts?.length ?? 0} districts monitored
          </div>
        </div>

        {/* District detail panel */}
        {selectedDistrict && (
          <DistrictSidePanel district={selectedDistrict} onClose={() => setSelectedDistrict(null)} />
        )}

        <MapContainer
          center={mapCenter}
          zoom={5}
          style={{ height: "100%", width: "100%", background: "#0f172a" }}
          zoomControl={true}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          {districts?.map((district) => {
            const risk = district.riskLevel as RiskLevel;
            const color = RISK_COLORS[risk] || RISK_COLORS.low;
            const isSelected = selectedDistrict?.id === district.id;
            return (
              <CircleMarker
                key={district.id}
                center={[district.latitude, district.longitude]}
                pathOptions={{
                  color: isSelected ? "#ffffff" : color,
                  fillColor: color,
                  fillOpacity: isSelected ? 0.85 : risk === "critical" ? 0.6 : 0.4,
                  weight: isSelected ? 3 : 2,
                }}
                radius={
                  isSelected
                    ? 16
                    : district.riskScore > 80
                    ? 13
                    : district.riskScore > 50
                    ? 9
                    : 6
                }
                eventHandlers={{
                  click: () => setSelectedDistrict(district as District),
                }}
              />
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}
