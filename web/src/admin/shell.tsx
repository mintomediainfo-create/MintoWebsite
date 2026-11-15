// Who is logged in + the dashboard counts (for the sidebar badge and the overview).
import { createContext, useContext } from 'react';

export interface Me { id: number; email: string; name: string }
export interface Summary {
  counts: Record<'new_apps' | 'apps' | 'open_jobs' | 'news' | 'work' | 'clients' | 'testimonials' | 'subscribers' | 'new_inquiries' | 'inquiries', string | number>;
  recent: { id: number; full_name: string; job_title: string; status: string; created_at: string }[];
}
export interface ShellT {
  me: Me;
  setMe: (m: Me) => void;
  summary?: Summary;
  refreshSummary: () => void;
}
export const ShellCtx = createContext<ShellT>(null as any);
export const useShell = () => useContext(ShellCtx);
