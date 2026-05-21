import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store/useAppStore';
import { AppLayout } from './components/Layout/AppLayout';
import { ThemeProvider } from './components/Layout/ThemeProvider';
import OnboardingPage from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import ProfileCenter from './pages/ProfileCenter';
import LearningPathPage from './pages/LearningPath';
import ProjectWorkshop from './pages/ProjectWorkshop';
import PortfolioStudio from './pages/PortfolioStudio';
import ResumeOptimizer from './pages/ResumeOptimizer';
import MockInterview from './pages/MockInterview';
import SettingsPage from './pages/Settings';
import CommunityPage from './pages/Community';
import KnowledgeBasePage from './pages/KnowledgeBase';
import AgentSystemPage from './pages/AgentSystem';

function RequireOnboarding({ children }: { children: React.ReactNode }) {
  const { onboardingComplete } = useAppStore();
  if (!onboardingComplete) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

export default function App() {
  const { onboardingComplete } = useAppStore();

  return (
    <ThemeProvider>
      <HashRouter>
        <Routes>
          {/* Onboarding */}
          <Route
            path="/"
            element={
              onboardingComplete ? <Navigate to="/dashboard" replace /> : <OnboardingPage />
            }
          />

          {/* Main app */}
          <Route
            element={
              <RequireOnboarding>
                <AppLayout />
              </RequireOnboarding>
            }
          >
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/profile" element={<ProfileCenter />} />
            <Route path="/role" element={<Navigate to="/profile" replace />} />
            <Route path="/skills" element={<Navigate to="/profile" replace />} />
            <Route path="/learning-path" element={<LearningPathPage />} />
            <Route path="/project" element={<ProjectWorkshop />} />
            <Route path="/portfolio" element={<PortfolioStudio />} />
            <Route path="/resume" element={<ResumeOptimizer />} />
            <Route path="/interview" element={<MockInterview />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/knowledge" element={<KnowledgeBasePage />} />
            <Route path="/agents" element={<AgentSystemPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ThemeProvider>
  );
}
