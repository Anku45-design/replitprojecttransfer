import React from "react";
import { Sidebar } from "./Sidebar";
import { Bell, Search, Menu } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <header className="h-16 bg-background/80 backdrop-blur-md border-b border-border flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center text-muted-foreground">
            <Search className="w-4 h-4 mr-2" />
            <input 
              type="text" 
              placeholder="Search districts, stations, resources..." 
              className="bg-transparent border-none focus:outline-none text-sm w-64 text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div className="flex items-center space-x-4">
            <button className="text-muted-foreground hover:text-foreground transition-colors relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-critical rounded-full"></span>
            </button>
            <div className="text-xs font-mono text-muted-foreground bg-muted px-3 py-1 rounded-md border border-border">
              {new Date().toISOString().replace('T', ' ').substring(0, 19)} UTC
            </div>
          </div>
        </header>
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
