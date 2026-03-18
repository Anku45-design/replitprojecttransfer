import { useLiveResources, useLiveEvacuations, useLiveAlerts, useLiveDashboard } from "@/hooks/use-flood-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatNumber } from "@/lib/utils";
import { Plane, Users, Anchor, CheckCircle2, RotateCcw, FileDown, Loader2 } from "lucide-react";
import { useState } from "react";

async function generateSituationReport(data: {
  summary: ReturnType<typeof useLiveDashboard>["data"];
  alerts: ReturnType<typeof useLiveAlerts>["data"];
  resources: ReturnType<typeof useLiveResources>["data"];
  evacuations: ReturnType<typeof useLiveEvacuations>["data"];
}) {
  // Dynamic import to keep initial bundle small
  const jsPDF = (await import("jspdf")).default;
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date();

  // ─── Header bar ────────────────────────────────────────────────────────────
  doc.setFillColor(15, 23, 42); // dark navy
  doc.rect(0, 0, pageW, 30, "F");

  doc.setTextColor(239, 68, 68);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("FloodWatch India", 14, 12);

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("National Disaster Management Authority — Situation Report", 14, 20);
  doc.text(`Generated: ${now.toLocaleString("en-IN")}`, 14, 26);

  doc.setTextColor(100, 116, 139);
  doc.text("CONFIDENTIAL — For Official Use Only", pageW - 14, 20, { align: "right" });

  let y = 38;

  // ─── Summary stats ─────────────────────────────────────────────────────────
  if (data.summary) {
    doc.setTextColor(239, 68, 68);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Current Situation Overview", 14, y);
    y += 6;

    doc.setDrawColor(239, 68, 68);
    doc.setLineWidth(0.5);
    doc.line(14, y, pageW - 14, y);
    y += 6;

    const stats = [
      ["Total Districts Monitored", String(data.summary.totalDistricts)],
      ["Critical Risk Districts", String(data.summary.criticalDistricts)],
      ["High Risk Districts", String(data.summary.highRiskDistricts)],
      ["Active Alerts", String(data.summary.activeAlerts)],
      ["Estimated Population at Risk", formatNumber(data.summary.totalPopulationAtRisk)],
      ["States Affected", String(data.summary.statesAffected)],
      ["Avg. 24h Rainfall", `${data.summary.avgRainfall24h} mm`],
    ];

    autoTable(doc, {
      startY: y,
      head: [["Parameter", "Value"]],
      body: stats,
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59], textColor: [148, 163, 184], fontSize: 9 },
      bodyStyles: { fontSize: 10 },
      columnStyles: { 0: { cellWidth: 100, fontStyle: "bold" }, 1: { cellWidth: 60, halign: "right" } },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ─── Active alerts ──────────────────────────────────────────────────────────
  if (data.alerts && data.alerts.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }

    doc.setTextColor(239, 68, 68);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Active Flood Alerts", 14, y);
    y += 6;

    doc.setDrawColor(239, 68, 68);
    doc.line(14, y, pageW - 14, y);
    y += 4;

    const alertRows = data.alerts.map((a) => [
      a.districtName,
      a.state,
      a.severity.toUpperCase(),
      `${a.riverLevel.toFixed(1)}m`,
      `${a.dangerLevel.toFixed(1)}m`,
      new Date(a.triggeredAt).toLocaleString("en-IN"),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["District", "State", "Severity", "River Level", "Danger Mark", "Triggered At"]],
      body: alertRows,
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59], textColor: [148, 163, 184], fontSize: 8 },
      bodyStyles: { fontSize: 9 },
      didParseCell: (hookData: any) => {
        if (hookData.column.index === 2) {
          const sev = hookData.cell.raw as string;
          if (sev === "CRITICAL") hookData.cell.styles.textColor = [239, 68, 68];
          else if (sev === "HIGH") hookData.cell.styles.textColor = [249, 115, 22];
          else if (sev === "MODERATE") hookData.cell.styles.textColor = [234, 179, 8];
        }
      },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ─── Emergency resources ────────────────────────────────────────────────────
  if (data.resources && data.resources.length > 0) {
    if (y > 200) { doc.addPage(); y = 20; }

    doc.setTextColor(56, 189, 248);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Emergency Resources Deployment", 14, y);
    y += 6;

    doc.setDrawColor(56, 189, 248);
    doc.line(14, y, pageW - 14, y);
    y += 4;

    const resourceRows = data.resources.map((r) => [
      r.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      r.district,
      r.state,
      r.status.toUpperCase(),
      `${r.deployed}/${r.count}`,
      `${Math.round((r.deployed / r.count) * 100)}%`,
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Asset Type", "District", "State", "Status", "Deployed/Total", "Utilisation"]],
      body: resourceRows,
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59], textColor: [148, 163, 184], fontSize: 8 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ─── Evacuation orders ──────────────────────────────────────────────────────
  if (data.evacuations && data.evacuations.length > 0) {
    if (y > 200) { doc.addPage(); y = 20; }

    doc.setTextColor(168, 85, 247);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Evacuation Orders", 14, y);
    y += 6;

    doc.setDrawColor(168, 85, 247);
    doc.line(14, y, pageW - 14, y);
    y += 4;

    const evacRows = data.evacuations.map((e) => [
      e.districtName,
      e.state,
      e.status.replace(/_/g, " ").toUpperCase(),
      `${formatNumber(e.evacuated)} / ${formatNumber(e.estimatedPeople)}`,
      `${Math.round((e.evacuated / e.estimatedPeople) * 100)}%`,
      new Date(e.issuedAt).toLocaleDateString("en-IN"),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["District", "State", "Status", "Evacuated / Target", "Progress", "Issued"]],
      body: evacRows,
      theme: "striped",
      headStyles: { fillColor: [30, 41, 59], textColor: [148, 163, 184], fontSize: 8 },
      bodyStyles: { fontSize: 9 },
      margin: { left: 14, right: 14 },
    });
  }

  // ─── Footer on each page ────────────────────────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(15, 23, 42);
    doc.rect(0, doc.internal.pageSize.getHeight() - 10, pageW, 10, "F");
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text(
      `FloodWatch India — Situation Report — ${now.toLocaleDateString("en-IN")}`,
      14,
      doc.internal.pageSize.getHeight() - 4
    );
    doc.text(`Page ${i} of ${totalPages}`, pageW - 14, doc.internal.pageSize.getHeight() - 4, { align: "right" });
  }

  const filename = `FloodWatch_SituationReport_${now.toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}

export default function Authorities() {
  const { data: resources } = useLiveResources();
  const { data: evacuations } = useLiveEvacuations();
  const { data: alerts } = useLiveAlerts();
  const { data: summary } = useLiveDashboard();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await generateSituationReport({ summary, alerts, resources, evacuations });
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  const getResourceIcon = (type: string) => {
    switch (type) {
      case "helicopter": return <Plane className="w-4 h-4" />;
      case "rescue_boat": return <Anchor className="w-4 h-4" />;
      default: return <Users className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-foreground">Authorities Coordination</h1>
          <p className="text-muted-foreground mt-1 text-sm">Deployment logs and evacuation protocols.</p>
        </div>

        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all"
          style={{
            background: exporting ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.18)",
            border: "1px solid rgba(239,68,68,0.35)",
            color: exporting ? "#94a3b8" : "#ef4444",
            cursor: exporting ? "not-allowed" : "pointer",
          }}
          onMouseEnter={(e) => {
            if (!exporting) {
              (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.28)";
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.18)";
          }}
        >
          {exporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4" />
          )}
          {exporting ? "Generating PDF…" : "Export Situation Report"}
        </button>
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
                {resources?.map((res) => (
                  <tr key={res.id} className="border-b border-border/50 hover:bg-muted/20">
                    <td className="px-6 py-4 font-medium capitalize flex items-center">
                      <span className="mr-2 text-primary">{getResourceIcon(res.type)}</span>
                      {res.type.replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-4">{res.district}</td>
                    <td className="px-6 py-4">
                      {res.status === "standby" ? (
                        <Badge variant="low">Standby</Badge>
                      ) : res.status === "deployed" ? (
                        <Badge variant="high">Deployed</Badge>
                      ) : (
                        <Badge variant="outline">Returning <RotateCcw className="w-3 h-3 ml-1 inline" /></Badge>
                      )}
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
            {evacuations?.map((evac) => {
              const progress = (evac.evacuated / evac.estimatedPeople) * 100;
              return (
                <Card key={evac.id} className="bg-card">
                  <CardContent className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-semibold text-lg">{evac.districtName}, {evac.state}</h4>
                        <p className="text-xs text-muted-foreground mt-1">Villages: {evac.villages.join(", ")}</p>
                      </div>
                      <Badge variant={evac.status === "completed" ? "low" : evac.status === "ordered" ? "high" : "moderate"}>
                        {evac.status.replace(/_/g, " ")}
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
                      <span className="text-xs text-muted-foreground">
                        Issued: {new Date(evac.issuedAt).toLocaleString()}
                      </span>
                      {evac.status === "completed" && (
                        <span className="text-success flex items-center text-xs font-medium uppercase tracking-wider">
                          <CheckCircle2 className="w-4 h-4 mr-1" /> Secured
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
