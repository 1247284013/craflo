import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useT } from '../../hooks/useT';
import {
  Target,
  BookOpen,
  FolderOpen,
  FileText,
  MessageSquare,
  ArrowRight,
  CheckCircle,
  Clock,
  Zap,
  TrendingUp,
  Sparkles,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { ROLES } from '../../utils/roleData';
import { Card, Progress, Badge } from '../../components/UI';


export default function Dashboard() {
  const navigate = useNavigate();
  const {
    userProfile,
    targetRole,
    learningPath,
    currentWeek,
    projects,
    resumeItems,
    interviewSessions,
    portfolios,
    skillAssessment,
    completeWeekTask,
  } = useAppStore();

  const tl = useT();
  const td = tl.dashboard;
  const { language } = useSettingsStore();
  const role = ROLES.find((r) => r.id === targetRole);
  const completedWeeks = learningPath?.weeklyTasks.filter((t) => t.completed).length ?? 0;
  const totalWeeks = learningPath?.totalWeeks ?? 0;
  const learningProgress = totalWeeks > 0 ? Math.round((completedWeeks / totalWeeks) * 100) : 0;

  const currentWeekTask = learningPath?.weeklyTasks.find((t) => t.week === currentWeek);

  const portfolioCount = Object.keys(portfolios).length;
  const overallScore = skillAssessment
    ? Math.round(
        (skillAssessment.dimensions.reduce((s, d) => s + d.currentLevel, 0) /
          skillAssessment.dimensions.reduce((s, d) => s + d.targetLevel, 0)) *
          100
      )
    : 0;

  const quickActions = [
    { label: td.continueLearn, icon: BookOpen, to: '/learning-path', color: 'bg-indigo-500' },
    { label: td.uploadProject, icon: FolderOpen, to: '/project', color: 'bg-emerald-500' },
    { label: td.optimizeResume, icon: FileText, to: '/resume', color: 'bg-amber-500' },
    { label: td.mockInterviewBtn, icon: MessageSquare, to: '/interview', color: 'bg-purple-500' },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    show: { opacity: 1, y: 0 },
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <motion.div variants={containerVariants} initial="hidden" animate="show">
        {/* Header */}
        <motion.div variants={itemVariants} className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {td.greeting.replace('{name}', userProfile.major || 'Designer')}
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                {new Date().toLocaleDateString(language === 'en-US' ? 'en-US' : 'zh-CN', { month: 'long', day: 'numeric', weekday: 'long' })}
                {' · '}
                {userProfile.careerGoal ? `${td.goalLabel}${tl.onboarding.identity.goals[userProfile.careerGoal as keyof typeof tl.onboarding.identity.goals] ?? userProfile.careerGoal}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge color="indigo">{tl.roles[targetRole as keyof typeof tl.roles] ?? td.notSetTarget}</Badge>
            </div>
          </div>
        </motion.div>

        {/* Stats Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-4 gap-4 mb-6">
          {[
            {
              label: td.learningProgress,
              value: `${learningProgress}%`,
              sub: `${completedWeeks}/${totalWeeks} ${tl.common.weeks}`,
              icon: TrendingUp,
              color: 'text-indigo-600 bg-indigo-50',
            },
            {
              label: td.abilityMatch,
              value: `${overallScore}%`,
              sub: skillAssessment ? `${skillAssessment.strengths.length}${td.advantages}` : td.pendingAssessment,
              icon: Zap,
              color: 'text-emerald-600 bg-emerald-50',
            },
            {
              label: td.projectCount,
              value: `${projects.length}`,
              sub: `${portfolioCount}${td.portfolioGenerated}`,
              icon: FolderOpen,
              color: 'text-amber-600 bg-amber-50',
            },
            {
              label: td.resumeOptimized,
              value: `${resumeItems.length}`,
              sub: `${interviewSessions.length}${td.mockInterview}`,
              icon: FileText,
              color: 'text-purple-600 bg-purple-50',
            },
          ].map(({ label, value, sub, icon: Icon, color }) => (
            <Card key={label} className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-sm text-gray-500 mb-1">{label}</div>
                  <div className="text-2xl font-bold text-gray-900">{value}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{sub}</div>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                  <Icon size={20} />
                </div>
              </div>
            </Card>
          ))}
        </motion.div>

        <div className="grid grid-cols-3 gap-6">
          {/* Main content - left 2/3 */}
          <div className="col-span-2 space-y-5">
            {/* Today's task */}
            <motion.div variants={itemVariants}>
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                      <BookOpen size={16} className="text-indigo-600" />
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm">{td.weeklyTask}</div>
                      <div className="text-xs text-gray-400">{td.weekOf.replace('{current}', String(currentWeek)).replace('{total}', String(totalWeeks))}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate('/learning-path')}
                    className="text-xs text-indigo-600 font-medium flex items-center gap-1 hover:gap-2 transition-all"
                  >
                    {td.viewAll} <ArrowRight size={12} />
                  </button>
                </div>

                {currentWeekTask ? (
                  <div>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-gray-800">{currentWeekTask.title}</div>
                        <div className="text-sm text-gray-500 mt-0.5">{currentWeekTask.objective}</div>
                      </div>
                      {currentWeekTask.completed && (
                        <Badge color="emerald">{td.completed}</Badge>
                      )}
                    </div>

                    <div className="space-y-1.5 mb-4">
                      {currentWeekTask.practicalTasks.slice(0, 3).map((task, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          {currentWeekTask.completed ? (
                            <CheckCircle size={14} className="text-emerald-500 shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 border-2 border-gray-300 rounded-full shrink-0" />
                          )}
                          {task}
                        </div>
                      ))}
                    </div>

                    <Progress value={learningProgress} showPercent color="indigo" size="sm" />

                    {!currentWeekTask.completed && (
                      <button
                        onClick={() => {
                          completeWeekTask(currentWeek);
                        }}
                        className="mt-3 w-full py-2 bg-indigo-50 text-indigo-600 text-sm font-medium rounded-xl hover:bg-indigo-100 transition-colors"
                      >
                        {td.markComplete}
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-400 text-sm">
                    {td.noTaskHint}
                  </div>
                )}
              </Card>
            </motion.div>

            {/* AI Suggestion */}
            <motion.div variants={itemVariants}>
              <Card className="p-5">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-xl flex items-center justify-center shrink-0">
                    <Sparkles size={16} className="text-purple-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm mb-1">{td.aiSuggestion}</div>
                    {skillAssessment ? (
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {skillAssessment.gapSummary}
                        {projects.length === 0 && ` ${td.aiTipNoProject}`}
                        {projects.length > 0 && portfolioCount === 0 && ` ${td.aiTipNoPortfolio}`}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">{td.aiTipNoAssessment}</p>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Quick Actions */}
            <motion.div variants={itemVariants}>
              <div className="text-sm font-semibold text-gray-700 mb-3">{td.quickActions}</div>
              <div className="grid grid-cols-4 gap-3">
                {quickActions.map(({ label, icon: Icon, to, color }) => (
                  <Card
                    key={to}
                    hover
                    onClick={() => navigate(to)}
                    className="p-4 text-center"
                  >
                    <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <div className="text-xs font-medium text-gray-700">{label}</div>
                  </Card>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Sidebar right 1/3 */}
          <div className="space-y-5">
            {/* Target role */}
            <motion.div variants={itemVariants}>
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={16} className="text-indigo-600" />
                  <div className="font-semibold text-gray-900 text-sm">{td.targetRole}</div>
                </div>
                {role ? (
                  <>
                    <div className="text-base font-bold text-indigo-700 mb-2">{role.name}</div>
                    <div className="text-xs text-gray-500 mb-3 leading-relaxed line-clamp-2">
                      {role.description}
                    </div>
                    <div className="space-y-1">
                      {role.coreSkills.slice(0, 4).map((s, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs text-gray-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                          {s}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => navigate('/role')}
                      className="mt-3 w-full text-xs text-indigo-600 font-medium py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      {td.fullRoleRequirements}
                    </button>
                  </>
                ) : (
                  <div className="text-sm text-gray-400 text-center py-4">
                    {td.notSetTarget}
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Learning Path Summary */}
            <motion.div variants={itemVariants}>
              <Card className="p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Clock size={16} className="text-emerald-600" />
                  <div className="font-semibold text-gray-900 text-sm">{td.learningPathTitle}</div>
                </div>
                {learningPath ? (
                  <>
                    <div className="text-xs text-gray-500 mb-3 leading-relaxed">
                      {learningPath.summary.slice(0, 80)}...
                    </div>
                    {learningPath.phases.slice(0, 3).map((phase, i) => (
                      <div key={i} className="flex items-start gap-2 mb-2">
                        <div className={`w-1 h-full rounded-full mt-1 shrink-0 ${
                          i < Math.floor(completedWeeks / (totalWeeks / 4)) ? 'bg-emerald-400' : 'bg-gray-200'
                        }`} style={{ width: 3, minHeight: 32 }} />
                        <div>
                          <div className="text-xs font-medium text-gray-700">{phase.title}</div>
                          <div className="text-xs text-gray-400">{phase.weeks}</div>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => navigate('/learning-path')}
                      className="mt-2 w-full text-xs text-indigo-600 font-medium py-1.5 rounded-lg hover:bg-indigo-50 transition-colors"
                    >
                      {td.fullPath}
                    </button>
                  </>
                ) : (
                  <div className="text-sm text-gray-400 text-center py-4">
                    {td.noLearningPath}
                  </div>
                )}
              </Card>
            </motion.div>

            {/* Recent projects */}
            {projects.length > 0 && (
              <motion.div variants={itemVariants}>
                <Card className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FolderOpen size={16} className="text-amber-600" />
                      <div className="font-semibold text-gray-900 text-sm">{td.recentProjects}</div>
                    </div>
                    <button
                      onClick={() => navigate('/project')}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      {td.viewAll}
                    </button>
                  </div>
                  {projects.slice(-2).map((p) => (
                    <div key={p.id} className="mb-2">
                      <div className="text-sm font-medium text-gray-700 truncate">{p.name}</div>
                      <Progress value={p.completionRate} size="sm" color="amber" />
                      <div className="text-xs text-gray-400 mt-0.5">{p.completionRate}{td.projectCompletion}</div>
                    </div>
                  ))}
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
