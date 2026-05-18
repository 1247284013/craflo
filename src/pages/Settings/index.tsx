import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Palette,
  Globe,
  Bell,
  Database,
  LayoutGrid,
  Sun,
  Moon,
  Laptop,
  Type,
  PanelLeft,
  List,
  LayoutDashboard,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
  Download,
  Trash2,
} from 'lucide-react';
import {
  useSettingsStore,
  ACCENT_COLORS,
  type AccentColor,
  type AppearanceMode,
  type FontSize,
  type SidebarMode,
  type LayoutMode,
  type Language,
} from '../../store/useSettingsStore';
import { useAppStore } from '../../store/useAppStore';
import { useT } from '../../hooks/useT';
import { Card } from '../../components/UI/Card';
import { Button } from '../../components/UI/Button';

/* ─── Section wrapper ─────────────────────────────────────────── */
function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start gap-4 mb-5">
        <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
          <Icon size={20} className="text-indigo-600" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
        </div>
      </div>
      {children}
    </Card>
  );
}

/* ─── Toggle switch ───────────────────────────────────────────── */
function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div>
        <div className="text-sm font-medium text-gray-800">{label}</div>
        {description && <div className="text-xs text-gray-400 mt-0.5">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
          checked ? 'bg-indigo-600' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

/* ─── Radio group ─────────────────────────────────────────────── */
function RadioGroup<T extends string>({
  value,
  onChange,
  options,
  columns = 3,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; icon?: React.ElementType; description?: string }[];
  columns?: number;
}) {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border-2 text-sm font-medium transition-all ${
              selected
                ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                : 'border-gray-200 text-gray-600 hover:border-indigo-200 hover:bg-gray-50'
            }`}
          >
            {opt.icon && <opt.icon size={20} className={selected ? 'text-indigo-600' : 'text-gray-400'} />}
            <span>{opt.label}</span>
            {opt.description && <span className="text-xs font-normal opacity-70">{opt.description}</span>}
            {selected && (
              <div className="absolute top-2 right-2">
                <CheckCircle size={14} className="text-indigo-600" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* ─── Main Settings Page ──────────────────────────────────────── */
export default function SettingsPage() {
  const settings = useSettingsStore();
  const appStore = useAppStore();
  const t = useT();
  const ts = t.settings;
  const [resetConfirm, setResetConfirm] = useState(false);
  const [saved, setSaved] = useState(false);

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    if (resetConfirm) {
      appStore.reset();
      settings.resetSettings();
      setResetConfirm(false);
      window.location.href = '/';
    } else {
      setResetConfirm(true);
      setTimeout(() => setResetConfirm(false), 4000);
    }
  };

  const handleExport = () => {
    const data = {
      settings: {
        accentColor: settings.accentColor,
        appearance: settings.appearance,
        fontSize: settings.fontSize,
        sidebarMode: settings.sidebarMode,
        layoutMode: settings.layoutMode,
        language: settings.language,
      },
      userProfile: appStore.userProfile,
      targetRole: appStore.targetRole,
      projects: appStore.projects,
      resumeItems: appStore.resumeItems,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `designpath-data-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.06 } },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{ts.title}</h1>
          <p className="text-gray-500 text-sm mt-1">{ts.subtitle}</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium"
            >
              <CheckCircle size={16} />
              {ts.autoSaved}
            </motion.div>
          )}
          <Button size="sm" variant="outline" onClick={() => { settings.resetSettings(); showSaved(); }}>
            <RotateCcw size={14} />
            {ts.restoreDefault}
          </Button>
        </div>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-5">

        {/* ─── Appearance ─── */}
        <motion.div variants={itemVariants}>
          <Section icon={Palette} title={ts.sections.appearance.title} description={ts.sections.appearance.desc}>
            {/* Accent color */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">{ts.appearance.accentColor}</label>
              <div className="flex gap-3 flex-wrap">
                {(Object.keys(ACCENT_COLORS) as AccentColor[]).map((key) => {
                  const config = ACCENT_COLORS[key];
                  const selected = settings.accentColor === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => { settings.setAccentColor(key); showSaved(); }}
                      title={config.label}
                      className={`flex flex-col items-center gap-2 p-2.5 rounded-xl border-2 transition-all ${
                        selected ? 'border-gray-400 shadow-md scale-105' : 'border-transparent hover:border-gray-200'
                      }`}
                    >
                      <div className="flex gap-1.5">
                        <div className="w-7 h-7 rounded-lg shadow-sm" style={{ backgroundColor: config.sidebarBg }} />
                        <div className="w-7 h-7 rounded-lg shadow-sm" style={{ backgroundColor: config.activeBtn }} />
                      </div>
                      <span className="text-xs text-gray-600 whitespace-nowrap">{config.label.split('（')[0].split(' (')[0]}</span>
                      {selected && <CheckCircle size={12} className="text-indigo-600" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Appearance mode */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">{ts.appearance.mode}</label>
              <RadioGroup<AppearanceMode>
                value={settings.appearance}
                onChange={(v) => { settings.setAppearance(v); showSaved(); }}
                columns={3}
                options={[
                  { value: 'light', label: ts.appearance.modes.light, icon: Sun, description: ts.appearance.modeDescs.light },
                  { value: 'dark', label: ts.appearance.modes.dark, icon: Moon, description: ts.appearance.modeDescs.dark },
                  { value: 'system', label: ts.appearance.modes.system, icon: Laptop, description: ts.appearance.modeDescs.system },
                ]}
              />
            </div>

            {/* Font size */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">{ts.appearance.fontSize}</label>
              <RadioGroup<FontSize>
                value={settings.fontSize}
                onChange={(v) => { settings.setFontSize(v); showSaved(); }}
                columns={3}
                options={[
                  { value: 'sm', label: ts.appearance.fontSizes.sm, icon: Type, description: ts.appearance.fontSizeDescs.sm },
                  { value: 'md', label: ts.appearance.fontSizes.md, icon: Type, description: ts.appearance.fontSizeDescs.md },
                  { value: 'lg', label: ts.appearance.fontSizes.lg, icon: Type, description: ts.appearance.fontSizeDescs.lg },
                ]}
              />
            </div>
          </Section>
        </motion.div>

        {/* ─── Workspace ─── */}
        <motion.div variants={itemVariants}>
          <Section icon={LayoutGrid} title={ts.sections.workspace.title} description={ts.sections.workspace.desc}>
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">{ts.workspace.sidebarMode}</label>
              <RadioGroup<SidebarMode>
                value={settings.sidebarMode}
                onChange={(v) => { settings.setSidebarMode(v); showSaved(); }}
                columns={2}
                options={[
                  { value: 'expanded', label: ts.workspace.sidebarModes.expanded, icon: PanelLeft, description: ts.workspace.sidebarDescs.expanded },
                  { value: 'collapsed', label: ts.workspace.sidebarModes.collapsed, icon: LayoutDashboard, description: ts.workspace.sidebarDescs.collapsed },
                ]}
              />
            </div>

            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-3">{ts.workspace.layoutMode}</label>
              <RadioGroup<LayoutMode>
                value={settings.layoutMode}
                onChange={(v) => { settings.setLayoutMode(v); showSaved(); }}
                columns={2}
                options={[
                  { value: 'cards', label: ts.workspace.layoutModes.cards, icon: LayoutGrid, description: ts.workspace.layoutDescs.cards },
                  { value: 'list', label: ts.workspace.layoutModes.list, icon: List, description: ts.workspace.layoutDescs.list },
                ]}
              />
            </div>

            <div>
              <Toggle checked={settings.compactCards} onChange={(v) => { settings.setCompactCards(v); showSaved(); }} label={ts.workspace.compactCards} description={ts.workspace.compactCardsDesc} />
              <Toggle checked={settings.showProgressBar} onChange={(v) => { settings.setShowProgressBar(v); showSaved(); }} label={ts.workspace.showProgressBar} description={ts.workspace.showProgressBarDesc} />
              <Toggle checked={settings.autoSave} onChange={(v) => { settings.setAutoSave(v); showSaved(); }} label={ts.workspace.autoSave} description={ts.workspace.autoSaveDesc} />
            </div>
          </Section>
        </motion.div>

        {/* ─── Language ─── */}
        <motion.div variants={itemVariants}>
          <Section icon={Globe} title={ts.sections.language.title} description={ts.sections.language.desc}>
            <label className="block text-sm font-semibold text-gray-700 mb-3">{ts.language.label}</label>
            <RadioGroup<Language>
              value={settings.language}
              onChange={(v) => { settings.setLanguage(v); showSaved(); }}
              columns={2}
              options={[
                { value: 'zh-CN', label: ts.language.zhCN, description: ts.language.zhCNDesc },
                { value: 'en-US', label: ts.language.enUS, description: ts.language.enUSDesc },
              ]}
            />
            {settings.language === 'en-US' && (
              <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <AlertTriangle size={13} />
                {ts.language.partialHint}
              </div>
            )}
          </Section>
        </motion.div>

        {/* ─── Notifications ─── */}
        <motion.div variants={itemVariants}>
          <Section icon={Bell} title={ts.sections.notifications.title} description={ts.sections.notifications.desc}>
            <Toggle checked={settings.notifyDailyTask} onChange={(v) => { settings.setNotifyDailyTask(v); showSaved(); }} label={ts.notifications.daily} description={ts.notifications.dailyDesc} />
            <Toggle checked={settings.notifyWeeklyReview} onChange={(v) => { settings.setNotifyWeeklyReview(v); showSaved(); }} label={ts.notifications.weekly} description={ts.notifications.weeklyDesc} />
          </Section>
        </motion.div>

        {/* ─── Data ─── */}
        <motion.div variants={itemVariants}>
          <Section icon={Database} title={ts.sections.data.title} description={ts.sections.data.desc}>
            <div className="mb-5 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700">{ts.data.storageLabel}</span>
                <span className="text-xs text-gray-400">{ts.data.storageDesc}</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: ts.data.profile, icon: '👤' },
                  { label: ts.data.path, icon: '📚' },
                  { label: ts.data.projects, icon: '📁' },
                ].map(({ label, icon }) => (
                  <div key={label} className="text-center p-2 bg-white rounded-lg border border-gray-100">
                    <div className="text-lg mb-1">{icon}</div>
                    <div className="text-xs text-gray-500">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={handleExport} className="flex-1">
                <Download size={15} />
                {ts.data.exportBtn}
              </Button>
              <Button variant={resetConfirm ? 'danger' : 'ghost'} onClick={handleReset} className="flex-1">
                <Trash2 size={15} />
                {resetConfirm ? ts.data.resetConfirmBtn : ts.data.resetBtn}
              </Button>
            </div>

            {resetConfirm && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
              >
                <AlertTriangle size={13} />
                {ts.data.resetWarning}
              </motion.div>
            )}
          </Section>
        </motion.div>

        {/* ─── About ─── */}
        <motion.div variants={itemVariants}>
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-gray-900">Craflo</div>
                <div className="text-xs text-gray-400 mt-0.5">{ts.about.version}</div>
              </div>
              <div className="text-xs text-gray-300">{ts.about.stack}</div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400 leading-relaxed">
              {ts.about.desc}
            </div>
          </Card>
        </motion.div>

      </motion.div>
    </div>
  );
}
