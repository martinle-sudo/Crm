import { useRef, useState } from 'react';
import { Building2, Percent, Database, Upload, Save, Check } from 'lucide-react';
import { useStore } from '@/store/useStore';
import type { AppState, Company } from '@/domain/types';
import { BentoCard } from '@/ui/Card';
import { Button } from '@/ui/Button';
import { Field, Input } from '@/ui/Field';

export function Settings() {
  const company = useStore((s) => s.company);
  const updateCompany = useStore((s) => s.updateCompany);
  const replaceState = useStore((s) => s.replaceState);
  const reset = useStore((s) => s.reset);
  const [form, setForm] = useState<Company>(company);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const set = <K extends keyof Company>(k: K, v: Company[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = () => {
    updateCompany(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  const importJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as AppState;
        if (parsed.schemaVersion !== 1) throw new Error('Version incompatible');
        replaceState(parsed);
        alert('Données importées avec succès.');
      } catch (e) {
        alert('Fichier invalide : ' + (e as Error).message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <BentoCard title={<span className="flex items-center gap-2"><Building2 className="h-3.5 w-3.5" /> Entreprise</span>} size="lg">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nom" className="sm:col-span-2"><Input value={form.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="Raison sociale" className="sm:col-span-2"><Input value={form.legalName ?? ''} onChange={(e) => set('legalName', e.target.value)} /></Field>
          <Field label="Courriel"><Input value={form.email ?? ''} onChange={(e) => set('email', e.target.value)} /></Field>
          <Field label="Téléphone"><Input value={form.phone ?? ''} onChange={(e) => set('phone', e.target.value)} /></Field>
          <Field label="Adresse" className="sm:col-span-2"><Input value={form.address ?? ''} onChange={(e) => set('address', e.target.value)} /></Field>
          <Field label="Ville"><Input value={form.city ?? ''} onChange={(e) => set('city', e.target.value)} /></Field>
          <Field label="Code postal"><Input value={form.postalCode ?? ''} onChange={(e) => set('postalCode', e.target.value)} /></Field>
        </div>
      </BentoCard>

      <div className="space-y-4">
        <BentoCard title={<span className="flex items-center gap-2"><Percent className="h-3.5 w-3.5" /> Taxes (Québec)</span>} size="md">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="N° TPS"><Input value={form.gstNumber ?? ''} onChange={(e) => set('gstNumber', e.target.value)} /></Field>
            <Field label="N° TVQ"><Input value={form.qstNumber ?? ''} onChange={(e) => set('qstNumber', e.target.value)} /></Field>
            <Field label="Taux TPS (%)" hint="Par défaut : 5 %">
              <Input type="number" step="0.001" value={form.defaultGstRate * 100}
                onChange={(e) => set('defaultGstRate', Number(e.target.value) / 100)} />
            </Field>
            <Field label="Taux TVQ (%)" hint="Par défaut : 9,975 %">
              <Input type="number" step="0.001" value={form.defaultQstRate * 100}
                onChange={(e) => set('defaultQstRate', Number(e.target.value) / 100)} />
            </Field>
          </div>
        </BentoCard>

        <BentoCard title={<span className="flex items-center gap-2"><Database className="h-3.5 w-3.5" /> Données</span>} size="md">
          <p className="text-xs text-zinc-500">
            Toutes les données sont stockées localement dans votre navigateur (IndexedDB).
            Utilisez l’export dans l’en-tête pour sauvegarder, ou importez un fichier ici.
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); }}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="soft" onClick={() => fileRef.current?.click()}>
              <Upload className="h-4 w-4" /> Importer (JSON)
            </Button>
            <Button
              variant="ghost"
              onClick={() => { if (confirm('Réinitialiser avec les données de démonstration ?')) void reset(); }}
            >
              Réinitialiser (démo)
            </Button>
          </div>
        </BentoCard>
      </div>

      <div className="lg:col-span-2 flex justify-end">
        <Button variant="primary" onClick={save}>
          {saved ? <><Check className="h-4 w-4" /> Enregistré</> : <><Save className="h-4 w-4" /> Enregistrer les paramètres</>}
        </Button>
      </div>
    </div>
  );
}
