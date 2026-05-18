import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../../store/useAppStore';
import { generateSkillAssessment, generateLearningPath } from '../../utils/mockAI';
import { IdentityStep } from './steps/IdentityStep';
import { RoleStep } from './steps/RoleStep';
import { SkillsStep } from './steps/SkillsStep';
import { AssessmentStep } from './steps/AssessmentStep';
import { Sparkles, CheckCircle } from 'lucide-react';
import { useT } from '../../hooks/useT';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const {
    onboardingStep,
    setOnboardingStep,
    userProfile,
    targetRole,
    completeOnboarding,
    setSkillAssessment,
    setLearningPath,
  } = useAppStore();
  const t = useT();
  const to = t.onboarding;

  const handleNext = () => {
    if (onboardingStep < to.steps.length - 1) {
      setOnboardingStep(onboardingStep + 1);
    }
  };

  const handleBack = () => {
    if (onboardingStep > 0) {
      setOnboardingStep(onboardingStep - 1);
    }
  };

  const handleComplete = () => {
    if (!targetRole) return;
    const assessment = generateSkillAssessment(userProfile, targetRole);
    setSkillAssessment(assessment);
    const path = generateLearningPath(userProfile, targetRole, assessment);
    setLearningPath(path);
    completeOnboarding();
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Sparkles size={22} className="text-white" />
            </div>
            <span className="text-white text-xl font-bold">Craflo</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">{to.title}</h1>
          <p className="text-indigo-200 text-sm">{to.subtitle}</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-8 gap-0">
          {to.steps.map((label, i) => (
            <div key={i} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                    i < onboardingStep
                      ? 'bg-emerald-400 text-white'
                      : i === onboardingStep
                      ? 'bg-white text-indigo-700'
                      : 'bg-white/20 text-white/50'
                  }`}
                >
                  {i < onboardingStep ? <CheckCircle size={18} /> : i + 1}
                </div>
                <div className={`text-xs mt-1.5 font-medium ${i === onboardingStep ? 'text-white' : 'text-indigo-300'}`}>
                  {label}
                </div>
              </div>
              {i < to.steps.length - 1 && (
                <div
                  className={`w-16 h-0.5 mx-2 mb-4 transition-all ${
                    i < onboardingStep ? 'bg-emerald-400' : 'bg-white/20'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-indigo-50 px-8 py-5 border-b border-indigo-100">
            <div className="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-0.5">
              {t.common.step} {onboardingStep + 1} {t.common.of} {to.steps.length}
            </div>
            <div className="text-xl font-bold text-gray-900">{to.steps[onboardingStep]}</div>
            <div className="text-sm text-gray-500">{to.stepDescs[onboardingStep]}</div>
          </div>

          <div className="px-8 py-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={onboardingStep}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {onboardingStep === 0 && <IdentityStep onNext={handleNext} />}
                {onboardingStep === 1 && <RoleStep onNext={handleNext} onBack={handleBack} />}
                {onboardingStep === 2 && <SkillsStep onNext={handleNext} onBack={handleBack} />}
                {onboardingStep === 3 && (
                  <AssessmentStep onComplete={handleComplete} onBack={handleBack} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
