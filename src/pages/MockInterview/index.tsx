import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Star,
  CheckCircle,
  XCircle,
  RefreshCw,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { generateInterviewSession, generateInterviewFeedback } from '../../utils/mockAI';
import type { TargetRole, InterviewSession } from '../../types';
import { Card, Badge, PageHeader, EmptyState } from '../../components/UI';
import { Button } from '../../components/UI';
import { useT } from '../../hooks/useT';

const MODE_COLORS = {
  portfolio: 'bg-indigo-100 text-indigo-700',
  technical: 'bg-emerald-100 text-emerald-700',
  'deep-dive': 'bg-purple-100 text-purple-700',
};

function SessionReport({ session }: { session: InterviewSession }) {
  const tl = useT();
  const ti = tl.interview;
  const { language } = useSettingsStore();
  const isEn = language === 'en-US';
  const answeredQuestions = session.questions.filter((q) => q.aiFeedback);
  const avgScore = answeredQuestions.length > 0
    ? Math.round(answeredQuestions.reduce((s, q) => s + (q.aiFeedback?.score ?? 0), 0) / answeredQuestions.length)
    : 0;

  const strengths: string[] = [];
  const weaknesses: string[] = [];

  answeredQuestions.forEach((q) => {
    if (q.aiFeedback) {
      if (q.aiFeedback.showsEngineeringLogic) strengths.push(isEn ? 'Engineering logic shown' : '体现工程逻辑');
      if (q.aiFeedback.showsPersonalContribution) strengths.push(isEn ? 'Clear contribution' : '个人贡献清晰');
      if (q.aiFeedback.isStructured) strengths.push(isEn ? 'Well structured' : '表达有结构');
      if (!q.aiFeedback.showsEngineeringLogic) weaknesses.push(isEn ? 'Lacks engineering terms' : '缺少工程术语');
      if (!q.aiFeedback.hasDataSupport) weaknesses.push(isEn ? 'Lacks quantitative data' : '缺少量化数据');
      if (!q.aiFeedback.isStructured) weaknesses.push(isEn ? 'Structure needs work' : '表达结构待改善');
    }
  });

  const uniqueStrengths = [...new Set(strengths)].slice(0, 3);
  const uniqueWeaknesses = [...new Set(weaknesses)].slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Score */}
      <Card className="p-6 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3"
          style={{ background: `conic-gradient(${avgScore >= 7 ? '#10B981' : avgScore >= 5 ? '#F59E0B' : '#EF4444'} ${avgScore * 10}%, #F1F5F9 0)` }}>
          <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center">
            <div className="text-2xl font-bold text-gray-900">{avgScore}</div>
          </div>
        </div>
        <div className="text-lg font-bold text-gray-900 mb-1">{ti.score}</div>
        <div className="text-sm text-gray-500">
          {avgScore >= 8 ? ti.scoreHint.high : avgScore >= 6 ? ti.scoreHint.mid : ti.scoreHint.low}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle size={16} className="text-emerald-600" />
            <div className="font-semibold text-gray-900 text-sm">{ti.strengthsTitle}</div>
          </div>
          {uniqueStrengths.length > 0 ? (
            uniqueStrengths.map((s, i) => (
              <div key={i} className="text-sm text-emerald-600 py-0.5">· {s}</div>
            ))
          ) : (
            <div className="text-sm text-gray-400">—</div>
          )}
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <XCircle size={16} className="text-red-500" />
            <div className="font-semibold text-gray-900 text-sm">{ti.weakTitle}</div>
          </div>
          {uniqueWeaknesses.length > 0 ? (
            uniqueWeaknesses.map((w, i) => (
              <div key={i} className="text-sm text-red-500 py-0.5">· {w}</div>
            ))
          ) : (
            <div className="text-sm text-gray-400">—</div>
          )}
        </Card>
      </div>

      {/* Question review */}
      <Card className="p-5">
        <div className="font-semibold text-gray-900 text-sm mb-4">{ti.reviewTitle}</div>
        <div className="space-y-4">
          {session.questions.map((q, i) => (
            <div key={q.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
              <div className="flex items-start gap-2 mb-2">
                <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                  {i + 1}
                </div>
                <div className="text-sm font-medium text-gray-800">{q.question}</div>
              </div>
              {q.userAnswer && (
                <div className="pl-7">
                  <div className="text-xs text-gray-400 mb-1">{ti.yourAnswer}</div>
                  <p className="text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2 mb-2">{q.userAnswer}</p>
                  {q.aiFeedback && (
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={12}
                            className={star <= Math.ceil(q.aiFeedback!.score / 2) ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-gray-500">{q.aiFeedback.score}/10</span>
                      {q.aiFeedback.suggestions.length > 0 && (
                        <span className="text-xs text-indigo-600">· {q.aiFeedback.suggestions[0]}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function InterviewChat({ session, onFinish }: { session: InterviewSession; onFinish: () => void }) {
  const { updateInterviewSession } = useAppStore();
  const [answer, setAnswer] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [_showFeedback, setShowFeedback] = useState(false);
  const [expandedFeedback, setExpandedFeedback] = useState<string | null>(null);
  const tl = useT();
  const ti = tl.interview;

  const currentIndex = session.currentQuestionIndex;
  const currentQuestion = session.questions[currentIndex];
  const isLastQuestion = currentIndex === session.questions.length - 1;
  const isComplete = session.isComplete;

  const handleSubmit = () => {
    if (!answer.trim() || !currentQuestion) return;
    setIsEvaluating(true);

    setTimeout(() => {
      const feedback = generateInterviewFeedback(currentQuestion, answer);
      const updatedQuestions = session.questions.map((q, i) =>
        i === currentIndex ? { ...q, userAnswer: answer, aiFeedback: feedback } : q
      );

      updateInterviewSession(session.id, {
        questions: updatedQuestions,
        currentQuestionIndex: isLastQuestion ? currentIndex : currentIndex + 1,
        isComplete: isLastQuestion,
      });

      setAnswer('');
      setIsEvaluating(false);
      setShowFeedback(true);

      if (isLastQuestion) {
        onFinish();
      }
    }, 1800);
  };

  const answeredCount = session.questions.filter((q) => q.aiFeedback).length;

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {Math.min(answeredCount + 1, session.questions.length)} / {session.questions.length}
        </div>
        <div className="flex gap-1">
          {session.questions.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full ${
                i < answeredCount ? 'bg-emerald-500' : i === answeredCount ? 'bg-indigo-500' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Previous Q&A */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
            {session.questions.map((q) => {
                if (!q.userAnswer) return null;
          const isExpanded = expandedFeedback === q.id;

          return (
            <div key={q.id} className="space-y-2">
              <div className="flex items-start gap-2 bg-gray-50 rounded-xl px-4 py-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                  AI
                </div>
                <div className="text-sm text-gray-700">{q.question}</div>
              </div>
              <div className="flex items-start gap-2 justify-end">
                <div className="bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm max-w-sm">
                  {q.userAnswer}
                </div>
                <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-xs font-bold text-emerald-600 shrink-0 mt-1">
                  我
                </div>
              </div>

              {q.aiFeedback && (
                <div className="ml-8">
                  <button
                    type="button"
                    onClick={() => setExpandedFeedback(isExpanded ? null : q.id)}
                    className="flex items-center gap-1 text-xs text-indigo-600 font-medium"
                  >
                    <Star size={11} className="fill-amber-400 text-amber-400" />
                    得分 {q.aiFeedback.score}/10
                    {isExpanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  </button>

                  {isExpanded && (
                    <div className="mt-2 bg-amber-50 border border-amber-100 rounded-xl p-3">
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {q.aiFeedback.showsEngineeringLogic && <Badge color="emerald" size="sm">工程逻辑✓</Badge>}
                        {q.aiFeedback.showsPersonalContribution && <Badge color="emerald" size="sm">个人贡献✓</Badge>}
                        {q.aiFeedback.isStructured && <Badge color="emerald" size="sm">表达结构✓</Badge>}
                        {q.aiFeedback.hasDataSupport && <Badge color="emerald" size="sm">数据支撑✓</Badge>}
                      </div>
                      {q.aiFeedback.suggestions.map((s, i) => (
                        <div key={i} className="text-xs text-amber-700">· {s}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Current question */}
      {!isComplete && currentQuestion && (
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-start gap-2 bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3">
              <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold text-white shrink-0">
                AI
              </div>
              <div className="text-sm text-gray-800 font-medium">{currentQuestion.question}</div>
            </div>

            <div className="relative">
              <textarea
                rows={4}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder={ti.answerPlaceholder}
                className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit();
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={!answer.trim() || isEvaluating}
                className="absolute right-3 bottom-3 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {isEvaluating ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send size={14} />
                )}
              </button>
            </div>
            <div className="text-xs text-gray-400">{ti.submitTip}</div>
          </motion.div>
        </AnimatePresence>
      )}

      {isComplete && (
        <div className="text-center py-4">
          <div className="text-base font-semibold text-gray-800 mb-1">{ti.allDone}</div>
          <div className="text-sm text-gray-500 mb-4">{ti.allDoneDesc}</div>
        </div>
      )}
    </div>
  );
}

export default function MockInterview() {
  const navigate = useNavigate();
  const { targetRole, interviewSessions, addInterviewSession, activeSessionId, setActiveSession } = useAppStore();
  const [showReport, setShowReport] = useState(false);
  const tl = useT();
  const ti = tl.interview;

  const activeSession = interviewSessions.find((s) => s.id === activeSessionId);

  const MODE_INFO = {
    portfolio: { label: ti.modes.portfolio.label, desc: ti.modes.portfolio.desc, color: MODE_COLORS.portfolio, questions: 4 },
    technical: { label: ti.modes.technical.label, desc: ti.modes.technical.desc, color: MODE_COLORS.technical, questions: 5 },
    'deep-dive': { label: ti.modes['deep-dive'].label, desc: ti.modes['deep-dive'].desc, color: MODE_COLORS['deep-dive'], questions: 5 },
  };

  const handleStart = (mode: 'portfolio' | 'technical' | 'deep-dive') => {
    if (!targetRole) return;
    const session = generateInterviewSession(targetRole as TargetRole, mode);
    addInterviewSession(session);
    setShowReport(false);
  };

  if (!targetRole) {
    return (
      <div className="p-8">
        <PageHeader title={ti.title} subtitle={ti.subtitle} />
        <EmptyState
          icon={MessageSquare}
          title={ti.emptyTitle}
          description={ti.emptyDesc}
          action={{ label: ti.emptyAction, onClick: () => navigate('/') }}
        />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        title={ti.title}
        subtitle={ti.subtitle}
        badge={ti.badge.replace('{n}', String(interviewSessions.filter((s) => s.isComplete).length))}
      />

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Mode selection & history */}
        <div className="space-y-4">
          <Card className="p-4">
            <div className="text-sm font-semibold text-gray-700 mb-3">{ti.selectMode}</div>
            {(Object.entries(MODE_INFO) as [keyof typeof MODE_INFO, typeof MODE_INFO[keyof typeof MODE_INFO]][]).map(([mode, info]) => (
              <button
                key={mode}
                type="button"
                onClick={() => handleStart(mode)}
                className="w-full text-left p-3 rounded-xl border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/30 transition-all mb-2 group"
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${info.color}`}>
                    {info.label}
                  </span>
                  <span className="text-xs text-gray-400">{info.questions}{ti.questions}</span>
                </div>
                <p className="text-xs text-gray-500">{info.desc}</p>
              </button>
            ))}
          </Card>

          {/* History */}
          {interviewSessions.length > 0 && (
            <Card className="p-4">
              <div className="text-sm font-semibold text-gray-700 mb-3">{ti.history}</div>
              {interviewSessions.slice(-3).reverse().map((s) => {
                const answeredQ = s.questions.filter((q) => q.aiFeedback);
                const avgScore = answeredQ.length > 0
                  ? Math.round(answeredQ.reduce((sum, q) => sum + (q.aiFeedback?.score ?? 0), 0) / answeredQ.length)
                  : 0;

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setActiveSession(s.id);
                      setShowReport(s.isComplete);
                    }}
                    className={`w-full text-left p-2.5 rounded-lg border mb-1.5 transition-all ${
                      activeSessionId === s.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-100 hover:border-indigo-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-gray-700">
                        {MODE_INFO[s.mode as keyof typeof MODE_INFO]?.label || s.mode}
                      </div>
                      <div className="flex items-center gap-1">
                        {s.isComplete && (
                          <>
                            <Star size={11} className="text-amber-400 fill-amber-400" />
                            <span className="text-xs text-gray-600">{avgScore}</span>
                          </>
                        )}
                        {!s.isComplete && <Badge color="amber" size="sm">{ti.inProgress}</Badge>}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {answeredQ.length}/{s.questions.length}{ti.answered}
                    </div>
                  </button>
                );
              })}
            </Card>
          )}
        </div>

        {/* Right: Interview area */}
        <div className="col-span-2">
          {!activeSession ? (
            <Card className="p-12 text-center">
              <MessageSquare size={40} className="mx-auto text-gray-200 mb-3" />
              <div className="text-base font-semibold text-gray-600 mb-2">{ti.selectModeHint}</div>
              <div className="text-sm text-gray-400 max-w-xs mx-auto">
                {ti.selectModeDesc}
              </div>
            </Card>
          ) : showReport && activeSession.isComplete ? (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold text-gray-700">{ti.report}</div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowReport(false)}>
                    {ti.viewDetail}
                  </Button>
                  <Button size="sm" onClick={() => handleStart(activeSession.mode)}>
                    <RefreshCw size={12} />
                    {ti.practiceAgain}
                  </Button>
                </div>
              </div>
              <SessionReport session={activeSession} />
            </div>
          ) : (
            <Card className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-100 rounded-xl flex items-center justify-center">
                    <MessageSquare size={16} className="text-indigo-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">
                      {MODE_INFO[activeSession.mode as keyof typeof MODE_INFO]?.label}
                    </div>
                    <div className="text-xs text-gray-400">{ti.title}</div>
                  </div>
                </div>
                {activeSession.isComplete && (
                  <Button size="sm" variant="secondary" onClick={() => setShowReport(true)}>
                    <Award size={12} />
                    {ti.viewReport}
                  </Button>
                )}
              </div>

              <InterviewChat
                session={activeSession}
                onFinish={() => setShowReport(true)}
              />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
