export type UserIdentity = 'student' | 'junior-engineer' | 'career-changer';

export type TargetRole =
  | 'product-design-engineer'
  | 'structural-design-engineer'
  | 'industrial-design-engineer'
  | 'mechanical-design-engineer'
  | 'smart-hardware-engineer'
  | 'design-engineering-intern';

export type Industry =
  | 'consumer-electronics'
  | 'smart-hardware'
  | 'home-appliances'
  | 'medical-devices'
  | 'robotics'
  | 'furniture'
  | 'automotive'
  | 'industrial-equipment';

export type SkillLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type CareerGoal =
  | 'internship'
  | 'fulltime'
  | 'job-change'
  | 'career-switch'
  | 'promotion'
  | 'portfolio'
  | 'interview';

export interface UserProfile {
  identity: UserIdentity;
  major: string;
  educationLevel: string;
  workYears: number;
  currentCity: string;
  targetCity: string;
  weeklyHours: number;
  careerGoal: CareerGoal;
  industryPreferences: Industry[];
  softwareSkills: {
    cad: SkillLevel;
    rendering: SkillLevel;
    simulation: SkillLevel;
    engineering_drawing: SkillLevel;
  };
  hasPrototypeExperience: boolean;
  hasManufacturingExperience: boolean;
  projectCount: number;
}

export interface TargetRoleInfo {
  id: TargetRole;
  name: string;
  description: string;
  typicalWork: string[];
  requiredSoftware: string[];
  coreSkills: string[];
  commonProjects: string[];
  portfolioRequirements: string[];
  resumeKeywords: string[];
  interviewQuestions: string[];
  suitableFor: string[];
  recommendedWeeks: number;
}

export interface SkillDimension {
  id: string;
  name: string;
  currentLevel: SkillLevel;
  targetLevel: SkillLevel;
  description: string;
}

export interface SkillAssessment {
  dimensions: SkillDimension[];
  strengths: string[];
  weaknesses: string[];
  priorityAreas: string[];
  gapSummary: string;
}

export interface WeeklyTask {
  week: number;
  title: string;
  objective: string;
  learningContent: string[];
  practicalTasks: string[];
  deliverables: string[];
  checkCriteria: string[];
  resources: string[];
  completed: boolean;
}

export interface LearningPhase {
  title: string;
  weeks: string;
  description: string;
  keyDeliverables: string[];
}

export interface ProjectTemplate {
  id: string;
  name: string;
  suitableFor: string[];
  background: string;
  targetUsers: string;
  designConstraints: string[];
  functionalRequirements: string[];
  structuralRequirements: string[];
  deliverables: string[];
  estimatedWeeks: number;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}

export interface LearningPath {
  totalWeeks: number;
  phases: LearningPhase[];
  weeklyTasks: WeeklyTask[];
  recommendedProject: ProjectTemplate;
  summary: string;
}

export interface ProjectMaterial {
  id: string;
  type: 'text' | 'image' | 'pdf';
  name: string;
  content: string;
  uploadedAt: string;
}

export interface ProjectArchive {
  projectName: string;
  background: string;
  userNeeds: string;
  designGoal: string;
  designConstraints: string[];
  processSummary: string;
  engineeringImplementation: string;
  results: string;
  personalContribution: string;
  improvementPoints: string[];
}

export interface Project {
  id: string;
  name: string;
  templateId?: string;
  background: string;
  designGoal: string;
  personalContribution: string;
  mainChallenge: string;
  solutionComparison: string;
  materialChoice: string;
  manufacturingConsideration: string;
  hasPrototypeTesting: boolean;
  improvementIdeas: string;
  materials: ProjectMaterial[];
  aiFeedback: string;
  missingElements: string[];
  completionRate: number;
  structuredArchive?: ProjectArchive;
  confirmedNodes?: string[];
  suggestedNodes?: string[];   // AI-determined next-step node keys
}

export interface PortfolioPage {
  pageNumber: number;
  title: string;
  contentSuggestion: string;
  requiredMaterials: string[];
  isComplete: boolean;
}

export interface Portfolio {
  projectId: string;
  targetRole: TargetRole;
  structure: PortfolioPage[];
  highlights: string[];
  missingMaterials: string[];
  overallSuggestion: string;
}

export interface ResumeItem {
  id: string;
  projectName: string;
  originalDescription: string;
  optimizedTitle: string;
  oneLiner: string;
  bulletPoints: string[];
  keywords: string[];
  quantifiableResults: string[];
  interviewExpandPoints: string[];
}

export interface InterviewFeedback {
  score: number;
  isClear: boolean;
  showsPersonalContribution: boolean;
  showsEngineeringLogic: boolean;
  hasDataSupport: boolean;
  isStructured: boolean;
  avoidedKeyIssues: boolean;
  suggestions: string[];
  improvedAnswer: string;
}

export interface InterviewQuestion {
  id: string;
  question: string;
  type: 'structural' | 'design-logic' | 'materials' | 'process' | 'personal';
  userAnswer: string;
  aiFeedback?: InterviewFeedback;
}

export interface InterviewReport {
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  portfolioGaps: string[];
  topicsToStudy: string[];
}

export interface InterviewSession {
  id: string;
  mode: 'portfolio' | 'technical' | 'deep-dive';
  targetRole: TargetRole;
  questions: InterviewQuestion[];
  currentQuestionIndex: number;
  isComplete: boolean;
  reportSummary?: InterviewReport;
}

export interface AppState {
  onboardingComplete: boolean;
  onboardingStep: number;
  userProfile: Partial<UserProfile>;
  targetRole: TargetRole | null;
  skillAssessment: SkillAssessment | null;
  learningPath: LearningPath | null;
  currentWeek: number;
  projects: Project[];
  activeProjectId: string | null;
  portfolios: Record<string, Portfolio>;
  resumeItems: ResumeItem[];
  interviewSessions: InterviewSession[];
  activeSessionId: string | null;
}
