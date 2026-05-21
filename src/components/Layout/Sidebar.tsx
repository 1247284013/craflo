import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  UserCircle,
  BookOpen,
  FolderOpen,
  Image,
  FileText,
  MessageSquare,
  Sparkles,
  Settings,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  Users,
  Library,
  Network,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useSettingsStore, ACCENT_COLORS } from '../../store/useSettingsStore';
import { useT } from '../../hooks/useT';

const NAV_ICONS = [
  { to: '/dashboard',    icon: LayoutDashboard, key: 'dashboard' },
  { to: '/profile',      icon: UserCircle,       key: 'profile'   },
  { to: '/learning-path',icon: BookOpen,          key: 'learningPath' },
  { to: '/project',      icon: FolderOpen,        key: 'project'   },
  { to: '/portfolio',    icon: Image,             key: 'portfolio' },
  { to: '/resume',       icon: FileText,          key: 'resume'    },
  { to: '/interview',    icon: MessageSquare,     key: 'interview' },
  { to: '/community',    icon: Users,             key: 'community' },
  { to: '/knowledge',    icon: Library,           key: 'knowledge' },
  { to: '/agents',       icon: Network,           key: 'agents'    },
] as const;

interface SidebarProps {
  forceCollapsed?: boolean;
  onNavClick?: () => void;
}

export function Sidebar({ forceCollapsed, onNavClick }: SidebarProps) {
  const { onboardingComplete, targetRole, userProfile } = useAppStore();
  const { accentColor, sidebarMode, setSidebarMode } = useSettingsStore();
  const t = useT();
  const colors = ACCENT_COLORS[accentColor];
  // forceCollapsed = true on tablets (auto-icon mode)
  const collapsed = forceCollapsed ?? sidebarMode === 'collapsed';

  return (
        <aside
      className="min-h-screen flex flex-col transition-all duration-300 shrink-0"
      style={{
        backgroundColor: colors.sidebarBg,
        borderRight: `1px solid ${colors.sidebarBorder}`,
        width: collapsed ? 64 : 240,
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5 border-b"
        style={{ borderColor: colors.sidebarBorder }}
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: colors.activeBtn }}
        >
          <Sparkles size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <div className="font-bold text-sm leading-tight whitespace-nowrap" style={{ color: colors.sidebarText }}>Craflo</div>
            <div className="text-xs whitespace-nowrap" style={{ color: colors.sidebarText, opacity: 0.7 }}>
              {t.nav.agentSlogan}
            </div>
          </div>
        )}
      </div>

      {/* User info */}
      {onboardingComplete && !collapsed && (
        <div className="px-3 py-2.5 border-b" style={{ borderColor: colors.sidebarBorder }}>
          <div
            className="rounded-lg px-3 py-2"
            style={{ backgroundColor: `${colors.sidebarBorder}80` }}
          >
            <div className="text-xs font-medium truncate" style={{ color: colors.sidebarText }}>
              {userProfile.major || 'Design Engineering'}
            </div>
            <div className="text-xs truncate mt-0.5" style={{ color: colors.sidebarMuted }}>
              {t.nav.targetLabel}{targetRole ? t.roles[targetRole as keyof typeof t.roles] : t.nav.notSet}
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-0.5">
        {NAV_ICONS.map(({ to, icon: Icon, key }) => {
          const label = t.nav[key as keyof typeof t.nav] as string;
          return (
          <NavLink
            key={to}
            to={to}
            title={collapsed ? label : undefined}
            onClick={onNavClick}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg text-sm font-medium transition-all group relative ${
                collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5'
              } ${isActive ? 'text-white shadow-md' : ''}`
            }
            style={({ isActive }) => ({
              backgroundColor: isActive ? colors.activeBtn : 'transparent',
              color: isActive ? '#fff' : colors.sidebarText,
            })}
            onMouseEnter={(e) => {
              if (e.currentTarget.getAttribute('aria-current') !== 'page') {
                e.currentTarget.style.backgroundColor = colors.sidebarHover;
              }
            }}
            onMouseLeave={(e) => {
              if (e.currentTarget.getAttribute('aria-current') !== 'page') {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && (
              <>
                <span className="flex-1">{label}</span>
                <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" />
              </>
            )}
          </NavLink>
          );
        })}
      </nav>

      {/* Bottom: Settings + Collapse toggle */}
      <div className="p-2 border-t space-y-0.5" style={{ borderColor: colors.sidebarBorder }}>
        {/* Settings link */}
        <NavLink
          to="/settings"
          title={collapsed ? t.nav.settings : undefined}
          onClick={onNavClick}
          className={() =>
            `flex items-center gap-3 rounded-lg text-sm font-medium transition-all ${
              collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5'
            }`
          }
          style={({ isActive }) => ({
            backgroundColor: isActive ? colors.activeBtn : 'transparent',
            color: isActive ? '#fff' : colors.sidebarText,
          })}
          onMouseEnter={(e) => {
            if ((e.currentTarget as HTMLElement).getAttribute('aria-current') !== 'page') {
              (e.currentTarget as HTMLElement).style.backgroundColor = colors.sidebarHover;
            }
          }}
          onMouseLeave={(e) => {
            if ((e.currentTarget as HTMLElement).getAttribute('aria-current') !== 'page') {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }
          }}
        >
          <Settings size={18} className="shrink-0" />
          {!collapsed && <span className="flex-1">{t.nav.settings}</span>}
        </NavLink>

        {/* Collapse toggle — hidden when forceCollapsed (tablet auto-mode) */}
        {!forceCollapsed && (
          <button
            onClick={() => setSidebarMode(collapsed ? 'expanded' : 'collapsed')}
            title={collapsed ? t.nav.expand : t.nav.collapse}
            className={`w-full flex items-center gap-3 rounded-lg text-sm font-medium transition-all ${
              collapsed ? 'px-0 py-2.5 justify-center' : 'px-3 py-2.5'
            }`}
            style={{ color: colors.sidebarMuted }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = colors.sidebarHover;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : (
              <>
                <PanelLeftClose size={17} />
                <span className="flex-1 text-left">{t.nav.collapse}</span>
              </>
            )}
          </button>
        )}

        {!collapsed && (
          <div className="text-center pt-1 pb-0.5" style={{ color: colors.sidebarMuted, fontSize: '11px', opacity: 0.6 }}>
            MVP v1.0
          </div>
        )}
      </div>
    </aside>
  );
}

