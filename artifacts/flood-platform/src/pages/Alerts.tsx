import { useState } from "react";
import { useLiveAlerts } from "@/hooks/use-flood-data";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GetAlertsSeverity } from "@workspace/api-client-react";
import { AlertTriangle, MapPin, Clock, Filter } from "lucide-react";

export default function Alerts() {
  const [filter, setFilter] = useState<GetAlertsSeverity | 'all'>('all');
  const { data: alerts } = useLiveAlerts(filter === 'all' ? undefined : filter as GetAlertsSeverity);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Alert History</h1>
          <p className="text-muted-foreground mt-1 text-sm">Comprehensive log of automated system warnings.</p>
        </div>
        
        <div className="flex items-center space-x-2 bg-card border border-border rounded-lg p-1">
          <Filter className="w-4 h-4 text-muted-foreground ml-2" />
          {(['all', 'critical', 'high', 'moderate', 'low'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md capitalize transition-colors ${
                filter === f 
                  ? 'bg-primary text-primary-foreground shadow-sm' 
                  : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {alerts?.map(alert => (
          <Card key={alert.id} className={alert.severity === 'critical' ? 'border-critical/50 bg-critical/5' : ''}>
            <CardContent className="p-6 flex flex-col md:flex-row gap-6 items-start">
              
              <div className="flex-shrink-0 mt-1">
                {alert.severity === 'critical' ? (
                  <div className="w-12 h-12 rounded-full bg-critical/20 flex items-center justify-center text-critical animate-pulse">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                ) : alert.severity === 'high' ? (
                  <div className="w-12 h-12 rounded-full bg-danger/20 flex items-center justify-center text-danger">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center text-warning">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant={alert.severity}>{alert.severity} Alert</Badge>
                  <span className="text-xs text-muted-foreground font-mono flex items-center">
                    <Clock className="w-3 h-3 mr-1" />
                    {new Date(alert.triggeredAt).toLocaleString()}
                  </span>
                </div>
                
                <h3 className="text-xl font-semibold text-foreground">{alert.message}</h3>
                
                <div className="flex flex-wrap gap-4 pt-2">
                  <div className="flex items-center text-sm text-muted-foreground bg-muted/50 px-3 py-1 rounded-md border border-border">
                    <MapPin className="w-4 h-4 mr-2 text-primary" />
                    {alert.districtName}, {alert.state}
                  </div>
                  
                  <div className="flex items-center text-sm font-mono bg-background px-3 py-1 rounded-md border border-border">
                    <span className="text-muted-foreground mr-2">River:</span> 
                    <span className={alert.riverLevel > alert.dangerLevel ? 'text-critical' : 'text-foreground'}>
                      {alert.riverLevel}m
                    </span>
                    <span className="mx-2 text-muted-foreground">/</span>
                    <span className="text-muted-foreground">Limit: {alert.dangerLevel}m</span>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        ))}

        {alerts?.length === 0 && (
          <div className="py-20 text-center border-2 border-dashed border-border rounded-xl">
            <ShieldAlert className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-50" />
            <h3 className="text-lg font-medium text-foreground">No matching alerts found</h3>
            <p className="text-muted-foreground text-sm mt-1">System conditions are normal for this filter.</p>
          </div>
        )}
      </div>
    </div>
  );
}
