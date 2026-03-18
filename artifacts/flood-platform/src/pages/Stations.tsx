import { useState } from "react";
import { useLiveStations, useStationReadings } from "@/hooks/use-flood-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Activity, Droplets, MapPin, Gauge } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

export default function Stations() {
  const { data: stations } = useLiveStations();
  const [selectedStation, setSelectedStation] = useState<number | null>(null);

  const { data: readings } = useStationReadings(selectedStation!, 24);

  const activeStation = stations?.find(s => s.id === selectedStation);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Monitoring Stations</h1>
        <p className="text-muted-foreground mt-1 text-sm">Live telemetry from remote sensors across basins.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stations List */}
        <div className="lg:col-span-1 space-y-4">
          {stations?.map(station => {
            const percentToDanger = Math.min(100, (station.currentLevel / station.dangerLevel) * 100);
            let indicator = "bg-primary";
            if (percentToDanger >= 100) indicator = "bg-critical";
            else if (percentToDanger >= 80) indicator = "bg-warning";

            return (
              <Card 
                key={station.id} 
                className={`cursor-pointer transition-all duration-200 hover:border-primary/50 ${selectedStation === station.id ? 'border-primary shadow-[0_0_15px_rgba(59,130,246,0.2)]' : ''}`}
                onClick={() => setSelectedStation(station.id)}
              >
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold">{station.name}</h3>
                      <p className="text-xs text-muted-foreground flex items-center mt-1">
                        <MapPin className="w-3 h-3 mr-1" />
                        {station.river}, {station.district}
                      </p>
                    </div>
                    <Badge variant={station.status === 'danger' || station.status === 'critical' ? 'critical' : station.status === 'warning' ? 'moderate' : 'low'}>
                      {station.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2 mt-4">
                    <div className="flex justify-between text-xs font-mono">
                      <span>{station.currentLevel}m</span>
                      <span className="text-critical">{station.dangerLevel}m (Danger)</span>
                    </div>
                    <Progress value={percentToDanger} indicatorColor={indicator} />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Station Detail & Chart */}
        <div className="lg:col-span-2">
          {selectedStation ? (
            <Card className="h-full flex flex-col">
              <CardHeader className="border-b border-border bg-muted/20">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-2xl flex items-center">
                      <Activity className="w-6 h-6 mr-2 text-primary" />
                      {activeStation?.name} Sensor Telemetry
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">Lat: {activeStation?.latitude} / Lng: {activeStation?.longitude}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-mono font-bold text-foreground">{activeStation?.currentLevel}m</div>
                    <div className="text-xs text-muted-foreground">Current Level</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 p-6 flex flex-col">
                
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-muted rounded-lg p-4 border border-border">
                    <div className="text-xs text-muted-foreground mb-1 flex items-center"><Droplets className="w-4 h-4 mr-1"/> 1h Rainfall</div>
                    <div className="text-xl font-mono">{activeStation?.rainfall1h} mm</div>
                  </div>
                  <div className="bg-warning/10 rounded-lg p-4 border border-warning/20">
                    <div className="text-xs text-warning mb-1 flex items-center"><Gauge className="w-4 h-4 mr-1"/> Warning Level</div>
                    <div className="text-xl font-mono text-warning">{activeStation?.warningLevel} m</div>
                  </div>
                  <div className="bg-critical/10 rounded-lg p-4 border border-critical/20">
                    <div className="text-xs text-critical mb-1 flex items-center"><Activity className="w-4 h-4 mr-1"/> Danger Level</div>
                    <div className="text-xl font-mono text-critical">{activeStation?.dangerLevel} m</div>
                  </div>
                </div>

                <div className="flex-1 min-h-[300px] w-full mt-4">
                  <h4 className="text-sm font-semibold mb-4 text-muted-foreground uppercase tracking-wider">24-Hour Level History</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={readings || []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis 
                        dataKey="timestamp" 
                        stroke="#64748b" 
                        fontSize={12} 
                        tickFormatter={(val) => new Date(val).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} 
                      />
                      <YAxis stroke="#64748b" fontSize={12} domain={['auto', 'auto']} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }}
                        labelFormatter={(val) => new Date(val).toLocaleString()}
                      />
                      {activeStation && (
                        <ReferenceLine y={activeStation.dangerLevel} label="DANGER" stroke="#ef4444" strokeDasharray="3 3" />
                      )}
                      {activeStation && (
                        <ReferenceLine y={activeStation.warningLevel} label="WARNING" stroke="#eab308" strokeDasharray="3 3" />
                      )}
                      <Line type="monotone" dataKey="riverLevel" stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{r: 6}} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-border rounded-xl bg-card/50">
              <div className="text-center">
                <Gauge className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium text-muted-foreground">Select a station to view telemetry</h3>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
