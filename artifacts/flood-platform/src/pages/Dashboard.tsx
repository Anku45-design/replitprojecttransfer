import { useState, useEffect } from "react";
import {
  useLiveDashboard,
  useLiveDistricts,
  useLiveAlerts,
} from "@/hooks/use-flood-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatNumber, cn } from "@/lib/utils";
import {
  Activity,
  AlertTriangle,
  Users,
  MapPin,
  Waves,
  CloudRain,
  ShieldAlert,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const FALLBACK_TREND = [
  { time: "00:00", level: 4.2, rain: 12 },
  { time: "04:00", level: 4.5, rain: 28 },
  { time: "08:00", level: 5.1, rain: 45 },
  { time: "12:00", level: 6.8, rain: 60 },
  { time: "16:00", level: 7.4, rain: 30 },
  { time: "20:00", level: 8.1, rain: 15 },
  { time: "24:00", level: 8.5, rain: 5 },
];

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useLiveDashboard();
  const { data: districts } = useLiveDistricts();
  const { data: alerts } = useLiveAlerts();

  const [trendData, setTrendData] = useState(FALLBACK_TREND);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(
          "https://api.open-meteo.com/v1/forecast?latitude=25.594&longitude=85.137&hourly=precipitation,river_discharge&past_days=1",
        );
        const result = await response.json();
        const formatted = result.hourly.time
          .slice(-7)
          .map((time: string, index: number) => ({
            time: new Date(time).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            level: result.hourly.river_discharge
              ? result.hourly.river_discharge[index]
              : 4 + Math.random(),
            rain: result.hourly.precipitation[index],
          }));
        if (!cancelled) setTrendData(formatted);
      } catch {
        // keep fallback data on error
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loadingSummary) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground animate-pulse font-mono">
        INITIALIZING DATALINK...
      </div>
    );
  }

  const topDistricts =
    districts?.sort((a, b) => b.riskScore - a.riskScore).slice(0, 5) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">
            National Overview
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Real-time flood risk analytics and active monitoring.
          </p>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Monitored Districts"
          value={summary?.totalDistricts || 0}
          icon={MapPin}
          trend="+2 online"
        />
        <StatCard
          title="Critical Zones"
          value={summary?.criticalDistricts || 0}
          icon={AlertTriangle}
          valueClass="text-critical"
          trend="Action Required"
        />
        <StatCard
          title="Active Alerts"
          value={summary?.activeAlerts || 0}
          icon={Activity}
          valueClass="text-warning"
          trend="Past 24h"
        />
        <StatCard
          title="Population at Risk"
          value={formatNumber(summary?.totalPopulationAtRisk || 0)}
          icon={Users}
          trend="Estimated"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 flex flex-col">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="flex items-center">
              <Waves className="w-5 h-5 mr-2 text-primary" />
              Aggregate River Level Trend (Brahmaputra Basin)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 p-6">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1e293b"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#3b82f6"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#0ea5e9"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "#1e293b",
                      borderRadius: "8px",
                    }}
                    itemStyle={{ color: "#e2e8f0" }}
                  />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="level"
                    name="Level (m)"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="rain"
                    name="Rain (mm)"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Alerts Sidebar */}
        <Card className="flex flex-col">
          <CardHeader className="border-b border-border/50 pb-4">
            <CardTitle className="flex items-center text-critical">
              <ShieldAlert className="w-5 h-5 mr-2" />
              Priority Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto max-h-[350px]">
            {alerts?.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className="p-4 border-b border-border/50 hover:bg-muted/30 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="font-semibold text-sm">
                    {alert.districtName}, {alert.state}
                  </span>
                  <Badge variant={alert.severity}>{alert.severity}</Badge>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {alert.message}
                </p>
                <div className="mt-2 flex items-center text-[10px] font-mono text-muted-foreground">
                  <span className="text-critical">{alert.riverLevel}m</span>
                  <span className="mx-1">/</span>
                  <span>{alert.dangerLevel}m danger limit</span>
                </div>
              </div>
            ))}
            {!alerts?.length && (
              <div className="p-8 text-center text-muted-foreground text-sm font-mono">
                No active alerts. System nominal.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* District Table */}
      <Card>
        <CardHeader className="border-b border-border/50">
          <CardTitle>Highest Risk Districts</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border font-mono">
                <tr>
                  <th className="px-6 py-4">District</th>
                  <th className="px-6 py-4">Risk Level</th>
                  <th className="px-6 py-4 text-right">Risk Score</th>
                  <th className="px-6 py-4 text-right">24h Rain</th>
                  <th className="px-6 py-4 text-right">River Level</th>
                  <th className="px-6 py-4 text-right">Affected</th>
                </tr>
              </thead>
              <tbody>
                {topDistricts.map((d) => (
                  <tr
                    key={d.id}
                    className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium">
                      {d.name},{" "}
                      <span className="text-muted-foreground font-normal">
                        {d.state}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Badge variant={d.riskLevel}>{d.riskLevel}</Badge>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-foreground">
                      {d.riskScore}/100
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      <div className="flex items-center justify-end text-sky-400">
                        <CloudRain className="w-3 h-3 mr-1" />
                        {d.rainfall24h}mm
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      <div
                        className={
                          d.riverLevel > d.dangerLevel
                            ? "text-critical"
                            : "text-foreground"
                        }
                      >
                        {d.riverLevel}m{" "}
                        <span className="text-muted-foreground text-xs ml-1">
                          (Danger: {d.dangerLevel}m)
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono">
                      {formatNumber(d.populationAffected)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  valueClass = "text-foreground",
  trend,
}: {
  title: string;
  value: string | number;
  icon: any;
  valueClass?: string;
  trend?: string;
}) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className={cn("text-3xl font-display font-bold", valueClass)}>
              {value}
            </p>
          </div>
          <div className="p-3 bg-muted rounded-lg">
            <Icon className="w-5 h-5 text-primary" />
          </div>
        </div>
        {trend && (
          <div className="mt-4 flex items-center text-xs font-mono text-muted-foreground">
            {trend}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
