import { 
  useGetDashboardSummary, 
  useGetDistricts, 
  useGetAlerts, 
  useGetStations, 
  useGetStationReadings, 
  useGetAuthorityResources, 
  useGetEvacuationOrders,
  GetAlertsSeverity
} from "@workspace/api-client-react";

// Command center polling frequency (30s)
const POLLING_INTERVAL = 30000;

const defaultQueryOpts = {
  refetchInterval: POLLING_INTERVAL,
  retry: 1, // Don't aggressively retry on missing endpoints in demo
};

export function useLiveDashboard() {
  return useGetDashboardSummary({ query: defaultQueryOpts });
}

export function useLiveDistricts() {
  return useGetDistricts({ query: defaultQueryOpts });
}

export function useLiveAlerts(severity?: GetAlertsSeverity, state?: string) {
  return useGetAlerts(
    { severity, state }, 
    { query: defaultQueryOpts }
  );
}

export function useLiveStations() {
  return useGetStations({ query: defaultQueryOpts });
}

export function useStationReadings(id: number, hours: number = 24) {
  return useGetStationReadings(
    id, 
    { hours }, 
    { 
      query: { 
        ...defaultQueryOpts,
        enabled: !!id 
      } 
    }
  );
}

export function useLiveResources() {
  return useGetAuthorityResources({ query: defaultQueryOpts });
}

export function useLiveEvacuations() {
  return useGetEvacuationOrders({ query: defaultQueryOpts });
}
