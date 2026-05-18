import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ backgroundColor: 'var(--bg-page)', transition: 'background-color 0.25s ease' }}
    >
      <Sidebar />
      <main
        className="flex-1 overflow-y-auto"
        style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-primary)' }}
      >
        <Outlet />
      </main>
    </div>
  );
}
