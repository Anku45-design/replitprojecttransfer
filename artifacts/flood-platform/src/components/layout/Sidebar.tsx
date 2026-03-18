import { Link, useRoute } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Map as MapIcon, 
  Activity, 
  ShieldAlert, 
  BellRing
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/map", label: "Map View", icon: MapIcon },
  { href: "/stations", label: "Stations", icon: Activity },
  { href: "/authorities", label: "Authorities", icon: ShieldAlert },
  { href: "/alerts", label: "Active Alerts", icon: BellRing },
];

export function Sidebar() {
  return (
    <aside className="w-64 bg-card border-r border-border h-screen flex flex-col fixed left-0 top-0 z-40">
      <div className="h-16 flex items-center px-6 border-b border-border">
        <img 
          src={`${import.meta.env.BASE_URL}images/logo.png`} 
          alt="Logo" 
          className="w-8 h-8 mr-3"
        />
        <span className="font-display font-bold text-xl tracking-wide text-foreground">
          FloodWatch<span className="text-primary">IN</span>
        </span>
      </div>
      
      <nav className="flex-1 py-6 px-3 space-y-1">
        <div className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Command Center
        </div>
        {NAV_ITEMS.map((item) => {
          const [isActive] = useRoute(item.href);
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href} className={cn(
              "flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
              isActive 
                ? "bg-primary/10 text-primary" 
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}>
              <Icon className={cn(
                "w-5 h-5 mr-3 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              {item.label}
              {item.href === "/alerts" && (
                <span className="ml-auto bg-critical text-critical-foreground text-[10px] px-2 py-0.5 rounded-full animate-pulse">
                  3
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center">
            <span className="text-xs font-mono font-bold text-muted-foreground">NDRF</span>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">HQ Operator</p>
            <p className="text-xs text-success flex items-center">
              <span className="w-1.5 h-1.5 rounded-full bg-success mr-1.5"></span>
              Secure Link Active
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}
