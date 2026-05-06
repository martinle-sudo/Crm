import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Download,
  Upload,
  X,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
  AlertTriangle,
  FileLock,
} from 'lucide-react';
import { useStore, selectAppState } from '@/store/useStore';
import { encryptJSON, decryptJSON } from '@/domain/cipher';
import { Button } from '@/ui/Button';
import { IconButton } from '@/ui/IconButton';
import { cn } from '@/ui/cn';
import type { AppState } from '@/domain/types';

interface BackupModalProps {
  open: boolean;
  onClose: () => void;
}

type Tab = 'export' | 'import';

export function BackupModal({ open, onClose }: BackupModalProps) {
  const state = useStore(selectAppState);
  const replaceState = useStore((s) => s.replaceState);

  const [tab, setTab] = useState<Tab>('export');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<
    { kind: 'success' | 'error'; text: string } | null
  >(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPassword('');
    setConfirmPassword('');
    setShowPwd(false);
    setMessage(null);
    setPendingFile(null);
    setBusy(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const handleExport = async () => {
    if (!password) {
      setMessage({ kind: 'error', text: 'Mot de passe requis' });
      return;
    }
    if (password.length < 8) {
      setMessage({
        kind: 'error',
        text: 'Choisis un mot de passe d\'au moins 8 caractères',
      });
      return;
    }
    if (password !== confirmPassword) {
      setMessage({ kind: 'error', text: 'Les mots de passe ne correspondent pas' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const json = await encryptJSON(state, password);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `cashflow-${stamp}.enc.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMessage({
        kind: 'success',
        text: 'Sauvegarde téléchargée. Conserve-la et ne perds pas ton mot de passe.',
      });
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Échec du chiffrement',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    if (!pendingFile) {
      setMessage({ kind: 'error', text: 'Sélectionne d\'abord un fichier' });
      return;
    }
    if (!password) {
      setMessage({ kind: 'error', text: 'Mot de passe requis' });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const text = await pendingFile.text();
      const decoded = (await decryptJSON(text, password)) as AppState;
      if (
        !decoded ||
        typeof decoded !== 'object' ||
        decoded.schemaVersion !== 1 ||
        !decoded.profile ||
        !decoded.preferences
      ) {
        throw new Error('Le fichier ne contient pas un état Cashflow valide');
      }
      replaceState(decoded);
      setMessage({ kind: 'success', text: 'Données restaurées.' });
      setPassword('');
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(close, 700);
    } catch (err) {
      setMessage({
        kind: 'error',
        text: err instanceof Error ? err.message : 'Échec du déchiffrement',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center px-4 py-10 bg-ink-950/70 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="bento-card w-full max-w-md"
          >
            <div className="relative z-[1] p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-neon-violet to-neon-cyan flex items-center justify-center">
                    <FileLock className="h-4 w-4 text-ink-950" strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="font-display font-semibold">
                      Sauvegarde chiffrée
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                      AES-256-GCM · PBKDF2
                    </div>
                  </div>
                </div>
                <IconButton onClick={close}>
                  <X className="h-4 w-4" />
                </IconButton>
              </div>

              <div className="flex bg-white/[0.04] rounded-xl p-1 mb-5">
                <TabButton
                  active={tab === 'export'}
                  onClick={() => {
                    setTab('export');
                    reset();
                  }}
                >
                  <Download className="h-3.5 w-3.5" />
                  Exporter
                </TabButton>
                <TabButton
                  active={tab === 'import'}
                  onClick={() => {
                    setTab('import');
                    reset();
                  }}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Importer
                </TabButton>
              </div>

              {tab === 'export' ? (
                <ExportPane
                  password={password}
                  setPassword={setPassword}
                  confirmPassword={confirmPassword}
                  setConfirmPassword={setConfirmPassword}
                  showPwd={showPwd}
                  setShowPwd={setShowPwd}
                  busy={busy}
                  onExport={handleExport}
                />
              ) : (
                <ImportPane
                  password={password}
                  setPassword={setPassword}
                  showPwd={showPwd}
                  setShowPwd={setShowPwd}
                  pendingFile={pendingFile}
                  setPendingFile={setPendingFile}
                  fileInputRef={fileInputRef}
                  busy={busy}
                  onImport={handleImport}
                />
              )}

              {message && (
                <div
                  className={cn(
                    'mt-4 rounded-xl px-3 py-2.5 text-xs flex items-start gap-2 ring-1 ring-inset',
                    message.kind === 'success'
                      ? 'bg-neon-mint/10 ring-neon-mint/30 text-neon-mint'
                      : 'bg-neon-coral/10 ring-neon-coral/30 text-neon-coral',
                  )}
                >
                  {message.kind === 'success' ? (
                    <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  )}
                  <span>{message.text}</span>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
        active
          ? 'bg-white/[0.08] text-zinc-100'
          : 'text-zinc-500 hover:text-zinc-300',
      )}
    >
      {children}
    </button>
  );
}

function PasswordField({
  value,
  onChange,
  placeholder,
  show,
  toggleShow,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  show: boolean;
  toggleShow: () => void;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full rounded-xl bg-white/5 pl-9 pr-10 py-2.5 text-sm placeholder:text-zinc-600 outline-none focus:ring-2 focus:ring-neon-violet/50"
      />
      <button
        type="button"
        onClick={toggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
      >
        {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

function ExportPane({
  password,
  setPassword,
  confirmPassword,
  setConfirmPassword,
  showPwd,
  setShowPwd,
  busy,
  onExport,
}: {
  password: string;
  setPassword: (v: string) => void;
  confirmPassword: string;
  setConfirmPassword: (v: string) => void;
  showPwd: boolean;
  setShowPwd: (v: boolean) => void;
  busy: boolean;
  onExport: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400 leading-relaxed">
        Tes données sont chiffrées localement avec AES-256-GCM. La clé est
        dérivée de ton mot de passe via PBKDF2 (250 000 itérations).{' '}
        <strong className="text-zinc-300">
          Sans le mot de passe, le fichier est irrécupérable.
        </strong>
      </p>
      <PasswordField
        value={password}
        onChange={setPassword}
        placeholder="Mot de passe (min. 8 caractères)"
        show={showPwd}
        toggleShow={() => setShowPwd(!showPwd)}
        autoFocus
      />
      <PasswordField
        value={confirmPassword}
        onChange={setConfirmPassword}
        placeholder="Confirme le mot de passe"
        show={showPwd}
        toggleShow={() => setShowPwd(!showPwd)}
      />
      <Button
        variant="primary"
        onClick={onExport}
        disabled={busy}
        className={cn('w-full', busy && 'opacity-60 pointer-events-none')}
      >
        <Download className="h-3.5 w-3.5" />
        {busy ? 'Chiffrement…' : 'Télécharger la sauvegarde'}
      </Button>
    </div>
  );
}

function ImportPane({
  password,
  setPassword,
  showPwd,
  setShowPwd,
  pendingFile,
  setPendingFile,
  fileInputRef,
  busy,
  onImport,
}: {
  password: string;
  setPassword: (v: string) => void;
  showPwd: boolean;
  setShowPwd: (v: boolean) => void;
  pendingFile: File | null;
  setPendingFile: (f: File | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  busy: boolean;
  onImport: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-400 leading-relaxed">
        Importer une sauvegarde <strong className="text-zinc-300">remplacera toutes les données actuelles</strong>{' '}
        (transactions, règles, scénarios, préférences).
      </p>

      <button
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          'w-full rounded-xl border border-dashed py-4 text-xs flex flex-col items-center justify-center gap-1 transition-all',
          pendingFile
            ? 'border-neon-mint/40 bg-neon-mint/5 text-neon-mint'
            : 'border-white/10 hover:border-white/20 hover:bg-white/[0.02] text-zinc-400 hover:text-zinc-200',
        )}
      >
        <Upload className="h-4 w-4" />
        <span className="font-medium">
          {pendingFile ? pendingFile.name : 'Choisir un fichier .enc.json'}
        </span>
        {pendingFile && (
          <span className="text-[10px] text-zinc-500">
            {(pendingFile.size / 1024).toFixed(1)} Ko
          </span>
        )}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0] ?? null;
          setPendingFile(f);
        }}
      />

      <PasswordField
        value={password}
        onChange={setPassword}
        placeholder="Mot de passe de la sauvegarde"
        show={showPwd}
        toggleShow={() => setShowPwd(!showPwd)}
      />

      <Button
        variant="primary"
        onClick={onImport}
        disabled={busy || !pendingFile}
        className={cn(
          'w-full',
          (busy || !pendingFile) && 'opacity-60 pointer-events-none',
        )}
      >
        <Upload className="h-3.5 w-3.5" />
        {busy ? 'Déchiffrement…' : 'Restaurer'}
      </Button>
    </div>
  );
}
