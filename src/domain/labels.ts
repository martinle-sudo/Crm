// Libellés français + tons (couleurs Pill) pour tous les statuts et énumérations.
import type {
  ClientType,
  ClientStatus,
  ServiceCategory,
  Frequency,
  ContractStatus,
  EmployeeRole,
  InterventionStatus,
  InvoiceStatus,
  PaymentMethod,
  QuoteStatus,
  LeadStage,
  LeadSource,
} from './types';

type Tone = 'neutral' | 'violet' | 'cyan' | 'mint' | 'coral' | 'amber';

interface Meta {
  label: string;
  tone: Tone;
}

export const clientType: Record<ClientType, Meta> = {
  residential: { label: 'Résidentiel', tone: 'cyan' },
  commercial: { label: 'Commercial', tone: 'violet' },
};

export const clientStatus: Record<ClientStatus, Meta> = {
  prospect: { label: 'Prospect', tone: 'amber' },
  active: { label: 'Actif', tone: 'mint' },
  inactive: { label: 'Inactif', tone: 'neutral' },
  lost: { label: 'Perdu', tone: 'coral' },
};

export const serviceCategory: Record<ServiceCategory, Meta> = {
  regular: { label: 'Ménage régulier', tone: 'cyan' },
  deep: { label: 'Grand ménage', tone: 'violet' },
  movein: { label: 'Entrée / sortie', tone: 'amber' },
  windows: { label: 'Vitres', tone: 'mint' },
  commercial: { label: 'Commercial', tone: 'violet' },
  extra: { label: 'Extra', tone: 'neutral' },
};

export const frequency: Record<Frequency, Meta> = {
  oneoff: { label: 'Ponctuel', tone: 'neutral' },
  weekly: { label: 'Hebdomadaire', tone: 'mint' },
  biweekly: { label: 'Aux 2 semaines', tone: 'cyan' },
  monthly: { label: 'Mensuel', tone: 'violet' },
};

export const contractStatus: Record<ContractStatus, Meta> = {
  active: { label: 'Actif', tone: 'mint' },
  suspended: { label: 'Suspendu', tone: 'amber' },
  cancelled: { label: 'Annulé', tone: 'coral' },
  expired: { label: 'Expiré', tone: 'neutral' },
};

export const employeeRole: Record<EmployeeRole, Meta> = {
  cleaner: { label: 'Préposé(e)', tone: 'cyan' },
  supervisor: { label: 'Superviseur', tone: 'violet' },
  manager: { label: 'Gestionnaire', tone: 'amber' },
  admin: { label: 'Administrateur', tone: 'mint' },
};

export const interventionStatus: Record<InterventionStatus, Meta> = {
  planned: { label: 'Planifiée', tone: 'cyan' },
  inprogress: { label: 'En cours', tone: 'amber' },
  completed: { label: 'Complétée', tone: 'mint' },
  cancelled: { label: 'Annulée', tone: 'coral' },
};

export const invoiceStatus: Record<InvoiceStatus, Meta> = {
  draft: { label: 'Brouillon', tone: 'neutral' },
  sent: { label: 'Envoyée', tone: 'cyan' },
  paid: { label: 'Payée', tone: 'mint' },
  overdue: { label: 'En retard', tone: 'coral' },
  cancelled: { label: 'Annulée', tone: 'neutral' },
};

export const paymentMethod: Record<PaymentMethod, Meta> = {
  transfer: { label: 'Virement', tone: 'cyan' },
  card: { label: 'Carte', tone: 'violet' },
  cheque: { label: 'Chèque', tone: 'amber' },
  cash: { label: 'Comptant', tone: 'mint' },
};

export const quoteStatus: Record<QuoteStatus, Meta> = {
  draft: { label: 'Brouillon', tone: 'neutral' },
  sent: { label: 'Envoyée', tone: 'cyan' },
  accepted: { label: 'Acceptée', tone: 'mint' },
  declined: { label: 'Refusée', tone: 'coral' },
  expired: { label: 'Expirée', tone: 'neutral' },
};

export const leadStage: Record<LeadStage, Meta> = {
  new: { label: 'Nouveau', tone: 'cyan' },
  contacted: { label: 'Contacté', tone: 'violet' },
  quoted: { label: 'Soumission', tone: 'amber' },
  won: { label: 'Gagné', tone: 'mint' },
  lost: { label: 'Perdu', tone: 'coral' },
};

export const leadSource: Record<LeadSource, Meta> = {
  referral: { label: 'Référence', tone: 'mint' },
  web: { label: 'Site web', tone: 'cyan' },
  ads: { label: 'Publicité', tone: 'amber' },
  social: { label: 'Réseaux sociaux', tone: 'violet' },
  other: { label: 'Autre', tone: 'neutral' },
};

export const weekdays = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
export const weekdaysLong = [
  'Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi',
];
