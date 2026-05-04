# Cashflow — Prévision de trésorerie locale

Application web qui projette ton solde au jour le jour à partir de tes paies,
tes factures récurrentes et tes dépenses ponctuelles. **100% locale** : aucune
connexion bancaire, toutes les données vivent dans ton navigateur (IndexedDB).

## Fonctionnalités

- **Curseur temporel** — slide vers n'importe quelle date dans le futur,
  ton solde projeté se recalcule en direct.
- **Mode "Et si ?"** — empile des scénarios fictifs (achat, bonus, imprévu)
  sans toucher à tes données réelles, et compare les courbes.
- **Calendrier manipulable** — drag & drop d'une facture vers une autre date
  pour simuler un report de paiement.
- **Heatmap de stress financier** — chaque jour est coloré selon ton solde
  projeté (critique / vigilance / stable / confort).
- **Abonnements sous contrôle** — total mensuel, équivalent annuel, alerte
  quand le cumul dépasse un seuil.

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · Zustand · IndexedDB
(`idb-keyval`) · `rrule.js` · `date-fns` · Recharts · `dnd-kit` · Framer Motion

## Architecture

```
src/
├── domain/        ← logique pure (types, RRULE expansion, projection, scoring)
├── store/         ← Zustand + persistence IndexedDB + données seed
├── ui/            ← primitives (BentoCard, Money, Pill, Button…)
├── features/      ← timeline, heatmap, calendar, scenarios, subscriptions, alerts, upcoming
└── app/           ← App shell + Dashboard Bento
```

L'algorithme de projection est une fonction pure : `(state, scenarios, range)
→ DayProjection[]`. Chaque jour porte ses événements, ses flux entrant/sortant
et son score de stress.

## Démarrage

```sh
npm install
npm run dev      # http://localhost:5173
npm run build
```

Au premier lancement, des données de démonstration sont chargées (paie
bi-hebdo, loyer, abonnements). Bouton ⟳ dans le header pour réinitialiser.
