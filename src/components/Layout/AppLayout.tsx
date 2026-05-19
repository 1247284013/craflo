import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { useSettingsStore, ACCENT_COLORS } from '../../store/useSettingsStore';

export function AppLayout() {
  const { isMobile, isTablet } = useBreakpoint();
  const { accentColor } = useSettingsStore();
  const colors = ACCENT_COLORS[accentColor];

  // Mobile: sidebar is overlay-controlled
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: 'var(--bg-page)', transition: 'background-color 0.25s ease' }}
    >
      {/* ── Mobile overlay backdrop ── */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.35)',
            backdropFilter: 'blur(2px)',
          }}
        />
      )}

      {/* ── Sidebar ── */}
      <div
        style={{
          // Mobile: slide-in overlay
          ...(isMobile ? {
            position: 'fixed', top: 0, left: 0, bottom: 0, zIndex: 50,
            transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform 0.25s ease',
          } : {}),
        }}
      >
        <Sidebar
          forceCollapsed={isTablet}
          onNavClick={isMobile ? () => setMobileOpen(false) : undefined}
        />
      </div>

      {/* ── Main content ── */}
      <main
        className="flex-1 overflow-y-auto"
        style={{
          backgroundColor: 'var(--bg-page)',
          color: 'var(--text-primary)',
          // On mobile, sidebar doesn't take space (it's fixed overlay)
          marginLeft: isMobile ? 0 : undefined,
        }}
      >
        {/* Mobile top-bar with hamburger */}
        {isMobile && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 30,
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 16px',
            background: 'var(--bg-page)',
            borderBottom: `1px solid ${colors.sidebarBorder}`,
          }}>
            <button
              onClick={() => setMobileOpen(true)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 4,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-primary)', borderRadius: 8,
              }}
            >
              <Menu size={22} />
            </button>
            <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)' }}>Craflo</span>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
}
