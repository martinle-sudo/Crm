import { nanoid } from 'nanoid';
import type {
  AppState,
  Client,
  Service,
  Contract,
  Employee,
  Intervention,
  Invoice,
  Quote,
  Lead,
} from '@/domain/types';
import { todayISO, addDaysISO, weekdayOf } from '@/domain/dates';
import { DEFAULT_GST, DEFAULT_QST } from '@/domain/quebec';
import { occurrenceDates, contractVisitAmount, contractVisitDuration } from '@/domain/scheduling';

const id = () => nanoid(10);

export function buildSeedState(): AppState {
  const today = todayISO();

  // ── Services ──────────────────────────────────────────────
  const svcRegular: Service = {
    id: id(), name: 'Ménage régulier', category: 'regular',
    description: 'Entretien récurrent : planchers, salles de bain, cuisine, poussière.',
    pricingMode: 'flat', unitPrice: 120, durationMin: 120, active: true,
  };
  const svcDeep: Service = {
    id: id(), name: 'Grand ménage', category: 'deep',
    description: 'Ménage en profondeur, plinthes, électroménagers, murs.',
    pricingMode: 'flat', unitPrice: 320, durationMin: 300, active: true,
  };
  const svcMovein: Service = {
    id: id(), name: 'Entrée / sortie de logement', category: 'movein',
    description: 'Ménage complet de fin de bail ou avant emménagement.',
    pricingMode: 'flat', unitPrice: 280, durationMin: 270, active: true,
  };
  const svcWindows: Service = {
    id: id(), name: 'Lavage de vitres', category: 'windows',
    description: 'Intérieur et extérieur, cadres compris.',
    pricingMode: 'hourly', unitPrice: 55, durationMin: 90, active: true,
  };
  const svcCommercial: Service = {
    id: id(), name: 'Entretien commercial (bureaux)', category: 'commercial',
    description: 'Entretien de bureaux, aires communes, salles de bain.',
    pricingMode: 'flat', unitPrice: 180, durationMin: 150, active: true,
  };
  const svcExtra: Service = {
    id: id(), name: 'Réfrigérateur / four (extra)', category: 'extra',
    description: 'Nettoyage en profondeur des électroménagers.',
    pricingMode: 'flat', unitPrice: 45, durationMin: 45, active: true,
  };
  const services = [svcRegular, svcDeep, svcMovein, svcWindows, svcCommercial, svcExtra];

  // ── Employés ──────────────────────────────────────────────
  const emp = (firstName: string, lastName: string, role: Employee['role'], rate: number): Employee => ({
    id: id(), firstName, lastName, role, hourlyRate: rate, active: true,
    email: `${firstName.toLowerCase()}@solutionsplanb.ca`,
    phone: '514-555-0' + Math.floor(100 + Math.random() * 800),
    availability: [false, true, true, true, true, true, false],
    hireDate: addDaysISO(today, -200 - Math.floor(Math.random() * 400)),
  });
  const empJulie = emp('Julie', 'Bergeron', 'supervisor', 28);
  const empMarc = emp('Marc', 'Tremblay', 'cleaner', 22);
  const empSofia = emp('Sofia', 'Mendes', 'cleaner', 23);
  const empDavid = emp('David', 'Roy', 'cleaner', 21);
  const employees = [empJulie, empMarc, empSofia, empDavid];

  // ── Clients ───────────────────────────────────────────────
  const clt = (
    name: string, type: Client['type'], status: Client['status'],
    city: string, extra: Partial<Client> = {},
  ): Client => ({
    id: id(), name, type, status, city, tags: [],
    createdAt: addDaysISO(today, -Math.floor(Math.random() * 300)),
    ...extra,
  });
  const cFamille = clt('Famille Gagnon', 'residential', 'active', 'Montréal', {
    contactName: 'Isabelle Gagnon', email: 'isabelle.gagnon@gmail.com', phone: '514-555-2211',
    address: '4520 rue Saint-Denis', postalCode: 'H2J 2L3', tags: ['fidèle'],
  });
  const cTpme = clt('Boutique Lumi inc.', 'commercial', 'active', 'Montréal', {
    contactName: 'Karine Dubé', email: 'karine@boutiquelumi.ca', phone: '514-555-7788',
    address: '1200 av. du Mont-Royal E', postalCode: 'H2J 1Y5', tags: ['commercial'],
  });
  const cCondo = clt('Léa Fontaine', 'residential', 'active', 'Laval', {
    email: 'lea.fontaine@outlook.com', phone: '450-555-3344',
    address: '88 rue des Érables', postalCode: 'H7N 1A2',
  });
  const cBureau = clt('Cabinet Lavoie & Associés', 'commercial', 'active', 'Longueuil', {
    contactName: 'Pierre Lavoie', email: 'info@lavoieassocies.ca', phone: '450-555-9090',
    address: '300 boul. Roland-Therrien', postalCode: 'J4H 4G7', tags: ['commercial', 'mensuel'],
  });
  const cInactif = clt('Marie-Claude Bélanger', 'residential', 'inactive', 'Montréal', {
    email: 'mc.belanger@gmail.com', phone: '514-555-1122',
  });
  const cProspect = clt('Resto Le Bon Coin', 'commercial', 'prospect', 'Montréal', {
    contactName: 'Antoine Picard', phone: '514-555-4455',
  });
  const clients = [cFamille, cTpme, cCondo, cBureau, cInactif, cProspect];

  const servicesMap = Object.fromEntries(services.map((s) => [s.id, s]));

  // ── Contrats ──────────────────────────────────────────────
  const mk = (
    clientId: string, title: string, frequency: Contract['frequency'],
    weekday: number, startTime: string, serviceIds: string[],
    employeeIds: string[], startOffset: number,
  ): Contract => ({
    id: id(), clientId, title, frequency, weekday, startTime,
    startDate: addDaysISO(today, startOffset),
    status: 'active', autoRenew: true, serviceIds,
    assignedEmployeeIds: employeeIds, createdAt: addDaysISO(today, startOffset - 5),
  });
  const ctFamille = mk(cFamille.id, 'Ménage bi-hebdo résidentiel', 'biweekly', 2, '09:00',
    [svcRegular.id], [empMarc.id, empSofia.id], -90);
  const ctLumi = mk(cTpme.id, 'Entretien boutique hebdo', 'weekly', 1, '18:30',
    [svcCommercial.id, svcWindows.id], [empJulie.id, empDavid.id], -60);
  const ctCondo = mk(cCondo.id, 'Ménage mensuel condo', 'monthly', 4, '13:00',
    [svcRegular.id], [empSofia.id], -120);
  const ctBureau = mk(cBureau.id, 'Entretien bureaux hebdo', 'weekly', 3, '19:00',
    [svcCommercial.id], [empDavid.id, empMarc.id], -45);
  const contracts = [ctFamille, ctLumi, ctCondo, ctBureau];

  // ── Interventions (passées + à venir) ─────────────────────
  const interventions: Intervention[] = [];
  for (const contract of contracts) {
    const dates = occurrenceDates(contract, addDaysISO(today, -35), addDaysISO(today, 21));
    const amount = contractVisitAmount(contract, servicesMap);
    const duration = contractVisitDuration(contract, servicesMap);
    for (const date of dates) {
      const past = date < today;
      interventions.push({
        id: id(), clientId: contract.clientId, contractId: contract.id, date,
        startTime: contract.startTime, durationMin: duration,
        status: past ? 'completed' : 'planned',
        serviceIds: contract.serviceIds, assignedEmployeeIds: contract.assignedEmployeeIds,
        checklist: defaultChecklist(),
        actualHours: past ? Math.round((duration / 60) * 10) / 10 : undefined,
        amount, photos: [], createdAt: addDaysISO(date, -7),
      });
    }
  }
  // une intervention ponctuelle (grand ménage) la semaine prochaine
  const oneoffDate = addDaysISO(today, 4);
  interventions.push({
    id: id(), clientId: cCondo.id, date: oneoffDate, startTime: '10:00',
    durationMin: svcDeep.durationMin, status: 'planned',
    serviceIds: [svcDeep.id, svcExtra.id], assignedEmployeeIds: [empJulie.id, empSofia.id],
    checklist: defaultChecklist(), amount: svcDeep.unitPrice + svcExtra.unitPrice,
    photos: [], createdAt: today, notesBefore: 'Cliente déménage — accès par la porte arrière.',
  });

  // ── Factures ──────────────────────────────────────────────
  const invoices: Invoice[] = [];
  let invCounter = 0;
  const completed = interventions.filter((i) => i.status === 'completed').slice(0, 8);
  for (const iv of completed) {
    invCounter++;
    const num = `F-2026-${String(invCounter).padStart(4, '0')}`;
    const issue = iv.date;
    const due = addDaysISO(issue, 30);
    const overdue = due < today;
    const paid = invCounter % 3 !== 0; // ~2/3 payées
    const inv: Invoice = {
      id: id(), number: num, clientId: iv.clientId, contractId: iv.contractId,
      issueDate: issue, dueDate: due,
      lines: iv.serviceIds.map((sid) => {
        const s = servicesMap[sid];
        return { id: id(), label: s?.name ?? 'Service', qty: 1, unitPrice: s?.unitPrice ?? 0 };
      }),
      gstRate: DEFAULT_GST, qstRate: DEFAULT_QST,
      status: paid ? 'paid' : overdue ? 'overdue' : 'sent',
      paidDate: paid ? addDaysISO(issue, 7) : undefined,
      paymentMethod: paid ? 'transfer' : undefined,
      createdAt: issue,
    };
    iv.invoiceId = inv.id;
    invoices.push(inv);
  }

  // ── Devis / soumissions ───────────────────────────────────
  const quotes: Quote[] = [
    {
      id: id(), number: 'S-2026-0001', clientId: cProspect.id,
      prospectName: 'Resto Le Bon Coin', issueDate: addDaysISO(today, -8),
      validUntil: addDaysISO(today, 22),
      lines: [
        { id: id(), label: 'Entretien commercial (soir) — 3x/sem', qty: 12, unitPrice: 180 },
      ],
      gstRate: DEFAULT_GST, qstRate: DEFAULT_QST, status: 'sent',
      notes: 'Service nocturne après fermeture.', createdAt: addDaysISO(today, -8),
    },
    {
      id: id(), number: 'S-2026-0002', prospectName: 'Garderie Les Petits Pas',
      issueDate: addDaysISO(today, -3), validUntil: addDaysISO(today, 27),
      lines: [{ id: id(), label: 'Grand ménage initial', qty: 1, unitPrice: 420 }],
      gstRate: DEFAULT_GST, qstRate: DEFAULT_QST, status: 'draft',
      createdAt: addDaysISO(today, -3),
    },
  ];

  // ── Prospects (pipeline) ──────────────────────────────────
  const leads: Lead[] = [
    {
      id: id(), name: 'Resto Le Bon Coin', type: 'commercial', contactName: 'Antoine Picard',
      phone: '514-555-4455', source: 'referral', stage: 'quoted', estimatedValue: 26000,
      nextFollowUp: addDaysISO(today, 3), createdAt: addDaysISO(today, -10),
      notes: 'A reçu la soumission S-2026-0001.',
    },
    {
      id: id(), name: 'Garderie Les Petits Pas', type: 'commercial', source: 'web',
      stage: 'contacted', estimatedValue: 18000, nextFollowUp: addDaysISO(today, 1),
      createdAt: addDaysISO(today, -6),
    },
    {
      id: id(), name: 'Condo Le Belvédère (syndic)', type: 'commercial', source: 'ads',
      stage: 'new', estimatedValue: 42000, createdAt: addDaysISO(today, -2),
    },
    {
      id: id(), name: 'Famille Nguyen', type: 'residential', source: 'social',
      stage: 'new', estimatedValue: 3100, createdAt: addDaysISO(today, -1),
    },
    {
      id: id(), name: 'Clinique Dentaire Sourire', type: 'commercial', source: 'referral',
      stage: 'won', estimatedValue: 22000, createdAt: addDaysISO(today, -40),
    },
    {
      id: id(), name: 'Bureau comptable XYZ', type: 'commercial', source: 'web',
      stage: 'lost', estimatedValue: 15000, createdAt: addDaysISO(today, -50),
      notes: 'A choisi un concurrent moins cher.',
    },
  ];

  void weekdayOf; // (utilitaire conservé pour usage futur)

  return {
    schemaVersion: 1,
    profile: { currency: 'CAD', locale: 'fr-CA' },
    company: {
      name: 'Solutions Plan B',
      legalName: 'Solutions Plan B inc.',
      email: 'info@solutionsplanb.ca',
      phone: '514-555-0100',
      address: '275 rue Sherbrooke E',
      city: 'Montréal',
      postalCode: 'H2X 1E5',
      gstNumber: '123456789 RT0001',
      qstNumber: '1234567890 TQ0001',
      defaultGstRate: DEFAULT_GST,
      defaultQstRate: DEFAULT_QST,
    },
    preferences: { privacy: { blurAmounts: false } },
    counters: { invoice: invCounter, quote: 2 },
    clients: toRecord(clients),
    services: toRecord(services),
    contracts: toRecord(contracts),
    employees: toRecord(employees),
    interventions: toRecord(interventions),
    invoices: toRecord(invoices),
    quotes: toRecord(quotes),
    leads: toRecord(leads),
  };
}

function defaultChecklist() {
  return [
    { id: nanoid(6), label: 'Planchers (balayage + lavage)', done: false },
    { id: nanoid(6), label: 'Salles de bain', done: false },
    { id: nanoid(6), label: 'Cuisine + comptoirs', done: false },
    { id: nanoid(6), label: 'Époussetage des surfaces', done: false },
    { id: nanoid(6), label: 'Poubelles + recyclage', done: false },
  ];
}

function toRecord<T extends { id: string }>(items: T[]): Record<string, T> {
  return Object.fromEntries(items.map((i) => [i.id, i]));
}
