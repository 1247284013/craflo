import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useSettingsStore } from '../../store/useSettingsStore';

export function AppLayout() {
  const { appearance } = useSettingsStore();
  const isDark = appearance === 'dark';

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: isDark ? '#0f172a' : '#f5f6fa' }}
    >
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto"
        style={{ backgroundColor: isDark ? '#0f172a' : '#f5f6fa' }}
      >
        <Outlet />
      </main>
    </div>
  );
}
