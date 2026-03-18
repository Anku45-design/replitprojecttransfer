import { useLiveResources, useLiveEvacuations } from "@/hooks/use-flood-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatNumber } from "@/lib/utils";
import { Plane, Users, Anchor, CheckCircle2, RotateCcw } from "lucide-react";

export default function Authorities() {
  const { data: resources } = useLiveResources();
  const { data: evacuations } = useLiveEvacuations();

  const getResourceIcon = (type: string) => {
    switch(type) {
      case 'helicopter': return <Plane className="w-4 h-4" />;
      case 'rescue_boat': return <Anchor className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-display font-bold text-foreground">Authorities Coordination</h1>
        <p className="text-muted-foreground mt-1 text-sm">Deployment logs and evacuation protocols.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        
        {/* Resources Panel */}
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>Emergency Resources</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-muted/50 text-muted-foreground border-b border-border font-mono">
                <tr>
                  <th className="px-6 py-4">Asset Type</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 w-1/3">Deployment</th>
                </tr>
              </thead>
              <tbody>
                {resources?.map(res => (
                  <tr key={res.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-6 py-4 font-medium capitalize flex items-center">
                      <span className="mr-2 text-primary">{getResourceIcon(res.type)}</span>
                      {res.type.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4">{res.district}</td>
                    <td className="px-6 py-4">
                      {res.status === 'standby' ? <Badge variant="low">Standby</Badge> : 
                       res.status === 'deployed' ? <Badge variant="high">Deployed</Badge> : 
                       <Badge variant="outline">Returning <RotateCcw className="w-3 h-3 ml-1 inline" /></Badge>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-between text-xs font-mono mb-1">
                        <span>{res.deployed} Active</span>
                        <span className="text-muted-foreground">{res.count} Total</span>
                      </div>
                      <Progress value={(res.deployed / res.count) * 100} indicatorColor="bg-primary" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* Evacuations Panel */}
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>Active Evacuations</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 bg-muted/10">
            {evacuations?.map(evac => {
              const progress = (evac.evacuated / evac.estimatedPeople) * 100;
              return (
                <Card key={evac.id} className="bg-card">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-lg">{evac.districtName}, {evac.state}</h4>
                        <p className="text-xs text-muted-foreground mt-1">Villages: {evac.villages.join(', ')}</p>
                      </div>
                      <Badge variant={evac.status === 'completed' ? 'low' : evac.status === 'ordered' ? 'high' : 'moderate'}>
                        {evac.status.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="bg-background rounded-lg p-4 border border-border">
                      <div className="flex justify-between text-sm font-mono mb-2">
                        <span className="text-success">{formatNumber(evac.evacuated)} Evacuated</span>
                        <span className="text-muted-foreground">Target: {formatNumber(evac.estimatedPeople)}</span>
                      </div>
                      <Progress value={progress} indicatorColor={progress === 100 ? "bg-success" : "bg-warning"} />
                    </div>

                    <div className="mt-4 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Issued: {new Date(evac.issuedAt).toLocaleString()}</span>
                      {evac.status === 'completed' && (
                        <span className="text-success flex items-center text-xs font-medium uppercase tracking-wider">
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Secured
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
