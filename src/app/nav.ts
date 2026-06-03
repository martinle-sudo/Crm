import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Users,
  FileText,
  Sparkles,
  CalendarDays,
  UserCog,
  ClipboardCheck,
  Receipt,
  FileSignature,
  Filter,
  BarChart3,
  Settings,
  ShieldCheck,
} from 'lucide-react';

export type View =
  | 'dashboard'
  | 'clients'
  | 'contracts'
  | 'services'
  | 'planning'
  | 'employees'
  | 'interventions'
  | 'invoices'
  | 'quotes'
  | 'leads'
  | 'reports'
  | 'settings'
  | 'admin';

export interface NavItem {
  view: View;
  label: string;
  icon: LucideIcon;
  group: 'Pilotage' | 'Opérations' | 'Ventes' | 'Configuration' | 'Administration';
  adminOnly?: boolean;
}

export const NAV: NavItem[] = [
  { view: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard, group: 'Pilotage' },
  { view: 'reports', label: 'Rapports', icon: BarChart3, group: 'Pilotage' },

  { view: 'clients', label: 'Clients', icon: Users, group: 'Opérations' },
  { view: 'contracts', label: 'Contrats', icon: FileText, group: 'Opérations' },
  { view: 'planning', label: 'Planification', icon: CalendarDays, group: 'Opérations' },
  { view: 'interventions', label: 'Interventions', icon: ClipboardCheck, group: 'Opérations' },
  { view: 'employees', label: 'Employés', icon: UserCog, group: 'Opérations' },
  { view: 'services', label: 'Services', icon: Sparkles, group: 'Opérations' },

  { view: 'leads', label: 'Prospects', icon: Filter, group: 'Ventes' },
  { view: 'quotes', label: 'Soumissions', icon: FileSignature, group: 'Ventes' },
  { view: 'invoices', label: 'Facturation', icon: Receipt, group: 'Ventes' },

  { view: 'settings', label: 'Paramètres', icon: Settings, group: 'Configuration' },

  { view: 'admin', label: 'Utilisateurs', icon: ShieldCheck, group: 'Administration', adminOnly: true },
];

export const VIEW_TITLES: Record<View, string> = Object.fromEntries(
  NAV.map((n) => [n.view, n.label]),
) as Record<View, string>;
