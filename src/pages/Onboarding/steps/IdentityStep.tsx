import { useState } from 'react';
import { GraduationCap, Briefcase, RefreshCw } from 'lucide-react';
import { useAppStore } from '../../../store/useAppStore';
import type { UserIdentity, CareerGoal, Industry } from '../../../types';
import { Button } from '../../../components/UI';
import { useT } from '../../../hooks/useT';

interface Props {
  onNext: () => void;
}

export function IdentityStep({ onNext }: Props) {
  const { userProfile, updateUserProfile } = useAppStore();
  const t = useT();
  const ti = t.onboarding.identity;

  const IDENTITY_OPTIONS: { value: UserIdentity; label: string; desc: string; icon: typeof GraduationCap }[] = [
    { value: 'student', label: ti.student, desc: ti.studentDesc, icon: GraduationCap },
    { value: 'junior-engineer', label: ti.junior, desc: ti.juniorDesc, icon: Briefcase },
    { value: 'career-changer', label: ti.changer, desc: ti.changerDesc, icon: RefreshCw },
  ];

  const CAREER_GOALS = Object.entries(ti.goals).map(([value, label]) => ({ value: value as CareerGoal, label }));

  const INDUSTRIES = Object.entries(ti.industryList).map(([value, label]) => ({ value: value as Industry, label }));

  const [identity, setIdentity] = useState<UserIdentity | null>(
    (userProfile.identity as UserIdentity) || null
  );
  const [major, setMajor] = useState(userProfile.major || '');
  const [careerGoal, setCareerGoal] = useState<CareerGoal | null>(
    (userProfile.careerGoal as CareerGoal) || null
  );
  const [industries, setIndustries] = useState<Industry[]>(
    (userProfile.industryPreferences as Industry[]) || []
  );
  const [weeklyHours, setWeeklyHours] = useState(userProfile.weeklyHours || 8);

  const toggleIndustry = (ind: Industry) => {
    setIndustries((prev) =>
      prev.includes(ind) ? prev.filter((i) => i !== ind) : [...prev, ind]
    );
  };

  const canProceed = identity && major && careerGoal && industries.length > 0;

  const handleNext = () => {
    if (!canProceed) return;
    updateUserProfile({
      identity,
      major,
      careerGoal,
      industryPreferences: industries,
      weeklyHours,
    });
    onNext();
  };

  return (
    <div className="space-y-6">
      {/* Identity */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">{ti.title}</label>
        <div className="grid grid-cols-3 gap-3">
          {IDENTITY_OPTIONS.map(({ value, label, desc, icon: Icon }) => (
            <button
              key={value}
              type="button"
              onClick={() => setIdentity(value)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                identity === value
                  ? 'border-indigo-500 bg-indigo-50'
                  : 'border-gray-200 hover:border-indigo-200'
              }`}
            >
              <Icon size={20} className={identity === value ? 'text-indigo-600' : 'text-gray-400'} />
              <div className={`text-sm font-semibold mt-1.5 ${identity === value ? 'text-indigo-700' : 'text-gray-700'}`}>
                {label}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">{desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Major */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">{ti.major}</label>
        <input
          type="text"
          value={major}
          onChange={(e) => setMajor(e.target.value)}
          placeholder={ti.majorPlaceholder}
          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400"
        />
      </div>

      {/* Career Goal */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">{ti.careerGoal}</label>
        <div className="flex flex-wrap gap-2">
          {CAREER_GOALS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setCareerGoal(value)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                careerGoal === value
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-gray-200 text-gray-600 hover:border-indigo-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Industries */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">{ti.industries}</label>
        <div className="flex flex-wrap gap-2">
          {INDUSTRIES.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => toggleIndustry(value)}
              className={`px-3 py-1.5 rounded-lg text-sm border transition-all ${
                industries.includes(value)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'border-gray-200 text-gray-600 hover:border-indigo-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Weekly hours */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          {ti.weeklyHours}：<span className="text-indigo-600">{weeklyHours} {ti.hoursUnit}</span>
        </label>
        <input
          type="range"
          min={2}
          max={30}
          value={weeklyHours}
          onChange={(e) => setWeeklyHours(Number(e.target.value))}
          className="w-full accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-gray-400 mt-1">
          <span>2 {ti.hoursUnit}</span>
          <span>30 {ti.hoursUnit}</span>
        </div>
      </div>

      <Button onClick={handleNext} disabled={!canProceed} size="lg" className="w-full">
        {ti.nextBtn}
      </Button>
    </div>
  );
}
