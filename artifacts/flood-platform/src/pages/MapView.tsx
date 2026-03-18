import { useEffect } from "react";
import { useLiveDistricts } from "@/hooks/use-flood-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber } from "@/lib/utils";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

const RISK_COLORS = {
  low: "#10b981",       // emerald-500
  moderate: "#eab308",  // yellow-500
  high: "#f97316",      // orange-500
  critical: "#ef4444"   // red-500
};

export default function MapView() {
  const { data: districts } = useLiveDistricts();

  // For testing when API is unavailable, inject some safe fallbacks
  const mapCenter: [number, number] = [26.0, 85.0];

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)] flex flex-col">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Spatial Risk Map</h1>
        <p className="text-muted-foreground mt-1 text-sm">Geospatial analysis of district vulnerabilities.</p>
      </div>

      <Card className="flex-1 relative overflow-hidden">
        <div className="absolute top-4 right-4 z-[400] bg-card/90 backdrop-blur-md border border-border p-4 rounded-xl shadow-xl w-64 pointer-events-auto">
          <h4 className="font-semibold text-sm mb-3">Risk Legend</h4>
          <div className="space-y-2 text-xs font-mono">
            {Object.entries(RISK_COLORS).map(([level, color]) => (
              <div key={level} className="flex items-center">
                <span className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }}></span>
                <span className="capitalize">{level} Risk</span>
              </div>
            ))}
          </div>
        </div>

        <MapContainer 
          center={mapCenter} 
          zoom={5} 
          style={{ height: "100%", width: "100%", background: "#0f172a" }}
          zoomControl={false}
        >
          {/* Using CartoDB Dark Matter tiles for professional dark mode look */}
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          
          {districts?.map(district => {
            const color = RISK_COLORS[district.riskLevel as keyof typeof RISK_COLORS] || RISK_COLORS.low;
            return (
              <CircleMarker
                key={district.id}
                center={[district.latitude, district.longitude]}
                pathOptions={{ 
                  color: color, 
                  fillColor: color, 
                  fillOpacity: district.riskLevel === 'critical' ? 0.6 : 0.4,
                  weight: 2
                }}
                radius={district.riskScore > 80 ? 12 : district.riskScore > 50 ? 8 : 6}
              >
                <Popup>
                  <div className="p-1 min-w-[200px]">
                    <div className="flex justify-between items-start mb-3">
                      <strong className="text-base">{district.name}</strong>
                      <Badge variant={district.riskLevel}>{district.riskLevel}</Badge>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Risk Score</span>
                        <span className="font-mono">{district.riskScore}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">River Level</span>
                        <span className="font-mono">{district.riverLevel}m</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Danger Level</span>
                        <span className="font-mono text-critical">{district.dangerLevel}m</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-border mt-2">
                        <span className="text-muted-foreground">Pop. at Risk</span>
                        <span className="font-mono">{formatNumber(district.populationAffected)}</span>
                      </div>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            )
          })}
        </MapContainer>
      </Card>
    </div>
  );
}
