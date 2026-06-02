# Solutions Plan B — CRM Entretien ménager

CRM web conçu pour une entreprise d'entretien ménager (**Solutions Plan B**).
Il couvre tout le cycle commercial et opérationnel : prospection, soumissions,
contrats récurrents, planification des interventions, feuilles de temps,
facturation avec taxes du Québec (TPS/TVQ) et tableaux de bord.

**100 % local** : aucune base de données serveur, toutes les données vivent dans
le navigateur (IndexedDB). Export / import JSON pour la sauvegarde.

## Fonctionnalités

- **Tableau de bord** — KPIs (clients actifs, contrats, revenus du mois, à
  encaisser), tendance des revenus, alertes (factures en retard, relances),
  interventions du jour et à venir.
- **Clients** — fiches résidentiel / commercial, statuts (prospect, actif,
  inactif, perdu), historique des contrats, interventions et facturation.
- **Contrats** — récurrence (ponctuel, hebdo, aux 2 semaines, mensuel), services
  inclus, employés assignés, renouvellement automatique, génération des
  interventions à venir.
- **Services** — catalogue (ménage régulier, grand ménage, entrée/sortie, vitres,
  commercial, extras) avec tarification forfaitaire ou horaire et durée estimée.
- **Planification** — calendrier mensuel visuel des interventions, filtrable par
  employé, avec détail journalier.
- **Interventions** — feuilles de temps, checklist de tâches, statuts, photos
  avant/après, notes, et facturation en un clic.
- **Employés** — fiches, rôles, taux horaire, disponibilités hebdomadaires,
  suivi des heures travaillées.
- **Prospects** — pipeline de vente kanban (nouveau → contacté → soumission →
  gagné / perdu), valeur du pipeline, taux de conversion, relances.
- **Soumissions / Devis** — lignes, taxes, statuts, conversion en contrat.
- **Facturation** — factures avec TPS/TVQ, statuts (brouillon, envoyée, payée,
  en retard), suivi des paiements, vue imprimable.
- **Rapports** — revenus par mois, revenus par service, heures par employé,
  croissance et rétention des clients.
- **Paramètres** — informations de l'entreprise, numéros et taux de taxes,
  import/export des données.

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · Zustand · IndexedDB
(`idb-keyval`) · `date-fns` · Recharts · Framer Motion · Lucide.

## Architecture

```
src/
├── domain/      ← types, dates, taxes (TPS/TVQ), planification, libellés
├── store/       ← Zustand + persistence IndexedDB + données de démo
├── ui/          ← primitives (BentoCard, Modal, Field, Pill, Money…)
├── features/    ← dashboard, clients, contracts, services, planning,
│                  interventions, employees, leads, quotes, invoices,
│                  reports, settings, billing (partagé)
└── app/         ← shell, sidebar, navigation, sélecteurs
```

## Démarrage

```sh
npm install
npm run dev      # http://localhost:5173
npm run build    # build de production
```

Au premier lancement, un jeu de données de démonstration réaliste est chargé
(clients, contrats, interventions, factures, soumissions, prospects). Le bouton
⟳ dans l'en-tête réinitialise les données.
