// Domaine CRM — Solutions Plan B (entretien ménager).
// Modèle local-first : tout vit dans IndexedDB, aucune dépendance serveur.

export type ISODate = string; // 'YYYY-MM-DD'
export type ISODateTime = string; // ISO complet
export type Currency = 'CAD' | 'USD' | 'EUR';

export type ClientId = string;
export type ServiceId = string;
export type ContractId = string;
export type EmployeeId = string;
export type InterventionId = string;
export type InvoiceId = string;
export type QuoteId = string;
export type LeadId = string;

// ─────────────────────────────────────────── Clients
export type ClientType = 'residential' | 'commercial';
export type ClientStatus = 'prospect' | 'active' | 'inactive' | 'lost';

export interface Client {
  id: ClientId;
  name: string; // nom de la personne ou de l'entreprise
  type: ClientType;
  status: ClientStatus;
  contactName?: string; // personne-ressource (clients commerciaux)
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  tags: string[];
  notes?: string;
  createdAt: ISODate;
}

// ─────────────────────────────────────────── Services
export type ServiceCategory =
  | 'regular' // ménage régulier
  | 'deep' // grand ménage
  | 'movein' // entrée / sortie
  | 'windows' // lavage de vitres
  | 'commercial' // entretien commercial
  | 'extra'; // service additionnel

export type PricingMode = 'flat' | 'hourly';

export interface Service {
  id: ServiceId;
  name: string;
  description?: string;
  category: ServiceCategory;
  pricingMode: PricingMode;
  unitPrice: number; // forfait ($) ou taux horaire ($/h)
  durationMin: number; // durée estimée en minutes
  active: boolean;
}

// ─────────────────────────────────────────── Contrats
export type Frequency = 'oneoff' | 'weekly' | 'biweekly' | 'monthly';

export type ContractStatus = 'active' | 'suspended' | 'cancelled' | 'expired';

export interface Contract {
  id: ContractId;
  clientId: ClientId;
  title: string;
  frequency: Frequency;
  weekday: number; // 0 (dimanche) – 6 (samedi), ancrage de la récurrence
  startTime: string; // 'HH:mm'
  startDate: ISODate;
  endDate?: ISODate;
  status: ContractStatus;
  autoRenew: boolean;
  serviceIds: ServiceId[];
  assignedEmployeeIds: EmployeeId[];
  amountOverride?: number; // remplace la somme des services par visite si défini
  notes?: string;
  createdAt: ISODate;
}

// ─────────────────────────────────────────── Employés
export type EmployeeRole = 'cleaner' | 'supervisor' | 'manager' | 'admin';

export interface Employee {
  id: EmployeeId;
  firstName: string;
  lastName: string;
  role: EmployeeRole;
  email?: string;
  phone?: string;
  hourlyRate: number;
  active: boolean;
  availability: boolean[]; // 7 booléens, dimanche → samedi
  hireDate: ISODate;
  notes?: string;
}

// ─────────────────────────────────────────── Interventions / feuilles de temps
export type InterventionStatus =
  | 'planned'
  | 'inprogress'
  | 'completed'
  | 'cancelled';

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface Intervention {
  id: InterventionId;
  clientId: ClientId;
  contractId?: ContractId;
  date: ISODate;
  startTime: string; // 'HH:mm'
  durationMin: number;
  status: InterventionStatus;
  serviceIds: ServiceId[];
  assignedEmployeeIds: EmployeeId[];
  checklist: ChecklistItem[];
  actualHours?: number; // heures réelles enregistrées
  amount: number; // montant facturable de l'intervention
  notesBefore?: string;
  notesAfter?: string;
  photos: string[]; // libellés / URLs de photos avant-après
  invoiceId?: InvoiceId;
  createdAt: ISODate;
}

// ─────────────────────────────────────────── Facturation
export type InvoiceStatus =
  | 'draft'
  | 'sent'
  | 'paid'
  | 'overdue'
  | 'cancelled';

export type PaymentMethod = 'transfer' | 'card' | 'cheque' | 'cash';

export interface LineItem {
  id: string;
  label: string;
  qty: number;
  unitPrice: number;
}

export interface Invoice {
  id: InvoiceId;
  number: string; // ex. 'F-2026-0001'
  clientId: ClientId;
  contractId?: ContractId;
  issueDate: ISODate;
  dueDate: ISODate;
  lines: LineItem[];
  gstRate: number; // TPS
  qstRate: number; // TVQ
  status: InvoiceStatus;
  paidDate?: ISODate;
  paymentMethod?: PaymentMethod;
  notes?: string;
  createdAt: ISODate;
}

// ─────────────────────────────────────────── Devis / soumissions
export type QuoteStatus =
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'declined'
  | 'expired';

export interface Quote {
  id: QuoteId;
  number: string; // ex. 'S-2026-0001'
  clientId?: ClientId;
  leadId?: LeadId;
  prospectName?: string;
  issueDate: ISODate;
  validUntil: ISODate;
  lines: LineItem[];
  gstRate: number;
  qstRate: number;
  status: QuoteStatus;
  notes?: string;
  convertedContractId?: ContractId;
  createdAt: ISODate;
}

// ─────────────────────────────────────────── Prospects (pipeline)
export type LeadStage = 'new' | 'contacted' | 'quoted' | 'won' | 'lost';
export type LeadSource = 'referral' | 'web' | 'ads' | 'social' | 'other';

export interface Lead {
  id: LeadId;
  name: string;
  type: ClientType;
  contactName?: string;
  email?: string;
  phone?: string;
  source: LeadSource;
  stage: LeadStage;
  estimatedValue?: number; // valeur annuelle estimée
  nextFollowUp?: ISODate;
  notes?: string;
  createdAt: ISODate;
}

// ─────────────────────────────────────────── Entreprise & préférences
export interface Company {
  name: string;
  legalName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  gstNumber?: string; // numéro TPS
  qstNumber?: string; // numéro TVQ
  defaultGstRate: number;
  defaultQstRate: number;
}

export interface Preferences {
  privacy: { blurAmounts: boolean };
}

export interface Profile {
  currency: Currency;
  locale: string;
}

export interface Counters {
  invoice: number;
  quote: number;
}

export interface AppState {
  schemaVersion: 1;
  profile: Profile;
  company: Company;
  preferences: Preferences;
  counters: Counters;
  clients: Record<ClientId, Client>;
  services: Record<ServiceId, Service>;
  contracts: Record<ContractId, Contract>;
  employees: Record<EmployeeId, Employee>;
  interventions: Record<InterventionId, Intervention>;
  invoices: Record<InvoiceId, Invoice>;
  quotes: Record<QuoteId, Quote>;
  leads: Record<LeadId, Lead>;
}
