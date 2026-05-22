import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppState,
  UserProfile,
  TargetRole,
  SkillAssessment,
  LearningPath,
  Project,
  Portfolio,
  ResumeItem,
  InterviewSession,
  TargetJD,
  AppliedJD,
  CareerTargetState,
  CareerDirection,
  ApplicationRecord,
} from '../types';

interface AppStore extends AppState {
  setOnboardingStep: (step: number) => void;
  completeOnboarding: () => void;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  setTargetRole: (role: TargetRole) => void;
  setSkillAssessment: (assessment: SkillAssessment) => void;
  setLearningPath: (path: LearningPath) => void;
  updateWeeklyTasks: (tasks: LearningPath['weeklyTasks']) => void;
  completeWeekTask: (week: number) => void;
  setCurrentWeek: (week: number) => void;
  addProject: (project: Project) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  setActiveProject: (id: string | null) => void;
  addPortfolio: (portfolio: Portfolio) => void;
  addResumeItem: (item: ResumeItem) => void;
  updateResumeItem: (id: string, updates: Partial<ResumeItem>) => void;
  deleteResumeItem: (id: string) => void;
  addInterviewSession: (session: InterviewSession) => void;
  updateInterviewSession: (id: string, updates: Partial<InterviewSession>) => void;
  setActiveSession: (id: string | null) => void;
  setTargetJD: (jd: TargetJD | null) => void;
  setAppliedJD: (jd: AppliedJD | null) => void;
  setCareerTargets: (state: CareerTargetState | null) => void;
  addCareerDirection: (dir: CareerDirection) => void;
  updateCareerDirection: (id: string, updates: Partial<CareerDirection>) => void;
  deleteCareerDirection: (id: string) => void;
  reorderCareerDirections: (ids: string[]) => void;
  setActiveCareerDirection: (id: string) => void;
  addApplication: (record: ApplicationRecord) => void;
  updateApplication: (id: string, updates: Partial<ApplicationRecord>) => void;
  deleteApplication: (id: string) => void;
  reset: () => void;
}

const initialState: AppState = {
  onboardingComplete: false,
  onboardingStep: 0,
  userProfile: {},
  targetRole: null,
  skillAssessment: null,
  learningPath: null,
  currentWeek: 1,
  projects: [],
  activeProjectId: null,
  portfolios: {},
  resumeItems: [],
  interviewSessions: [],
  activeSessionId: null,
  targetJD: null,
  appliedJD: null,
  careerTargets: null,
  applications: [],
};

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      ...initialState,

      setOnboardingStep: (step) => set({ onboardingStep: step }),

      completeOnboarding: () => set({ onboardingComplete: true }),

      updateUserProfile: (profile) =>
        set((state) => ({
          userProfile: { ...state.userProfile, ...profile },
        })),

      setTargetRole: (role) => set({ targetRole: role }),

      setSkillAssessment: (assessment) => set({ skillAssessment: assessment }),

      setLearningPath: (path) => set({ learningPath: path }),

      updateWeeklyTasks: (tasks) =>
        set((state) => {
          if (!state.learningPath) return state;
          return { learningPath: { ...state.learningPath, weeklyTasks: tasks } };
        }),

      completeWeekTask: (week) =>
        set((state) => {
          if (!state.learningPath) return state;
          const updatedTasks = state.learningPath.weeklyTasks.map((t) =>
            t.week === week ? { ...t, completed: true } : t
          );
          return {
            learningPath: { ...state.learningPath, weeklyTasks: updatedTasks },
          };
        }),

      setCurrentWeek: (week) => set({ currentWeek: week }),

      addProject: (project) =>
        set((state) => ({
          projects: [...state.projects, project],
          activeProjectId: project.id,
        })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),

      setActiveProject: (id) => set({ activeProjectId: id }),

      addPortfolio: (portfolio) =>
        set((state) => ({
          portfolios: { ...state.portfolios, [portfolio.projectId]: portfolio },
        })),

      addResumeItem: (item) =>
        set((state) => ({
          resumeItems: [...state.resumeItems, item],
        })),

      updateResumeItem: (id, updates) =>
        set((state) => ({
          resumeItems: state.resumeItems.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),

      deleteResumeItem: (id) =>
        set((state) => ({
          resumeItems: state.resumeItems.filter((r) => r.id !== id),
        })),

      addInterviewSession: (session) =>
        set((state) => ({
          interviewSessions: [...state.interviewSessions, session],
          activeSessionId: session.id,
        })),

      updateInterviewSession: (id, updates) =>
        set((state) => ({
          interviewSessions: state.interviewSessions.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        })),

      setActiveSession: (id) => set({ activeSessionId: id }),

      setTargetJD: (jd) => set({ targetJD: jd }),

      setAppliedJD: (jd) => set({ appliedJD: jd }),

      setCareerTargets: (state) => set({ careerTargets: state }),

      addCareerDirection: (dir) =>
        set((s) => ({
          careerTargets: s.careerTargets
            ? { ...s.careerTargets, directions: [...(s.careerTargets.directions ?? []), dir] }
            : { mode: dir.mode, direction: dir.label, directions: [dir], targets: [], tiers: { reach: [], target: [], safety: [] }, resumeTips: '', portfolioTips: '', generatedAt: new Date().toISOString() },
        })),

      updateCareerDirection: (id, updates) =>
        set((s) => ({
          careerTargets: s.careerTargets ? {
            ...s.careerTargets,
            directions: (s.careerTargets.directions ?? []).map(d => d.id === id ? { ...d, ...updates } : d),
          } : s.careerTargets,
        })),

      deleteCareerDirection: (id) =>
        set((s) => ({
          careerTargets: s.careerTargets ? {
            ...s.careerTargets,
            directions: (s.careerTargets.directions ?? []).filter(d => d.id !== id),
          } : s.careerTargets,
        })),

      reorderCareerDirections: (ids) =>
        set((s) => {
          if (!s.careerTargets) return s;
          const map = new Map((s.careerTargets.directions ?? []).map(d => [d.id, d]));
          const reordered = ids.map((id, i) => ({ ...map.get(id)!, order: i })).filter(Boolean);
          return { careerTargets: { ...s.careerTargets, directions: reordered } };
        }),

      setActiveCareerDirection: (id) =>
        set((s) => ({
          careerTargets: s.careerTargets ? {
            ...s.careerTargets,
            directions: (s.careerTargets.directions ?? []).map(d => ({ ...d, isActive: d.id === id })),
          } : s.careerTargets,
        })),

      addApplication: (record) =>
        set((s) => ({ applications: [...s.applications, record] })),

      updateApplication: (id, updates) =>
        set((s) => ({
          applications: s.applications.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),

      deleteApplication: (id) =>
        set((s) => ({
          applications: s.applications.filter((a) => a.id !== id),
        })),

      reset: () => set(initialState),
    }),
    {
      name: 'designpath-ai-storage',
    }
  )
);
