import { useState } from 'react';
import { useAppStore } from '../../../store/useAppStore';
import type { SkillLevel } from '../../../types';
import { Button } from '../../../components/UI';
import { useT } from '../../../hooks/useT';

interface Props {
  onNext: () => void;
  onBack: () => void;
}

const LEVEL_COLORS = ['bg-gray-200', 'bg-red-300', 'bg-orange-300', 'bg-yellow-400', 'bg-emerald-400', 'bg-emerald-600'];

function LevelSelector({
  value,
  onChange,
  label,
  levelLabels,
}: {
  value: SkillLevel;
  onChange: (v: SkillLevel) => void;
  label: string;
  levelLabels: readonly string[];
}) {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full text-white ${LEVEL_COLORS[value]}`}>
          {levelLabels[value]}
        </span>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4, 5].map((level) => (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level as SkillLevel)}
            className={`flex-1 h-7 rounded-lg text-xs font-bold transition-all border ${
              value >= level
                ? `${LEVEL_COLORS[level]} text-white border-transparent`
                : 'bg-gray-100 text-gray-400 border-gray-200 hover:bg-gray-200'
            }`}
          >
            {level}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SkillsStep({ onNext, onBack }: Props) {
  const { userProfile, updateUserProfile } = useAppStore();
  const t = useT();
  const ts = t.onboarding.skills;

  const [cad, setCad] = useState<SkillLevel>((userProfile.softwareSkills?.cad as SkillLevel) || 0);
  const [rendering, setRendering] = useState<SkillLevel>((userProfile.softwareSkills?.rendering as SkillLevel) || 0);
  const [simulation, setSimulation] = useState<SkillLevel>((userProfile.softwareSkills?.simulation as SkillLevel) || 0);
  const [drawing, setDrawing] = useState<SkillLevel>((userProfile.softwareSkills?.engineering_drawing as SkillLevel) || 0);
  const [projectCount, setProjectCount] = useState(userProfile.projectCount || 0);
  const [hasPrototype, setHasPrototype] = useState(userProfile.hasPrototypeExperience || false);
  const [hasManufacturing, setHasManufacturing] = useState(userProfile.hasManufacturingExperience || false);
  const [workYears, setWorkYears] = useState(userProfile.workYears || 0);

  const handleNext = () => {
    updateUserProfile({
      softwareSkills: { cad, rendering, simulation, engineering_drawing: drawing },
      projectCount,
      hasPrototypeExperience: hasPrototype,
      hasManufacturingExperience: hasManufacturing,
      workYears,
    });
    onNext();
  };

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500">{ts.hint}</p>

      <div className="bg-gray-50 rounded-xl p-4">
        <div className="text-sm font-semibold text-gray-700 mb-3">{ts.softwareTitle}</div>
        <LevelSelector label={ts.cad} value={cad} onChange={setCad} levelLabels={ts.levels} />
        <LevelSelector label={ts.rendering} value={rendering} onChange={setRendering} levelLabels={ts.levels} />
        <LevelSelector label={ts.simulation} value={simulation} onChange={setSimulation} levelLabels={ts.levels} />
        <LevelSelector label={ts.drawing} value={drawing} onChange={setDrawing} levelLabels={ts.levels} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">{ts.workYears}</label>
          <select
            value={workYears}
            onChange={(e) => setWorkYears(Number(e.target.value))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {ts.workYearOptions.map((opt, i) => (
              <option key={i} value={i}>{opt}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">{ts.projectCount}</label>
          <select
            value={projectCount}
            onChange={(e) => setProjectCount(Number(e.target.value))}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          >
            {ts.projectCountOptions.map((opt, i) => (
              <option key={i} value={i}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-indigo-50 transition-colors">
          <input
            type="checkbox"
            checked={hasPrototype}
            onChange={(e) => setHasPrototype(e.target.checked)}
            className="w-4 h-4 accent-indigo-600 rounded"
          />
          <div>
            <div className="text-sm font-medium text-gray-700">{ts.hasPrototype}</div>
            <div className="text-xs text-gray-400">{ts.hasPrototypeDesc}</div>
          </div>
        </label>

        <label className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer hover:bg-indigo-50 transition-colors">
          <input
            type="checkbox"
            checked={hasManufacturing}
            onChange={(e) => setHasManufacturing(e.target.checked)}
            className="w-4 h-4 accent-indigo-600 rounded"
          />
          <div>
            <div className="text-sm font-medium text-gray-700">{ts.hasManufacturing}</div>
            <div className="text-xs text-gray-400">{ts.hasManufacturingDesc}</div>
          </div>
        </label>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} size="lg" className="flex-1">{t.common.back}</Button>
        <Button onClick={handleNext} size="lg" className="flex-1">{ts.nextBtn}</Button>
      </div>
    </div>
  );
}
