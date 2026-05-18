import { useNavigate } from 'react-router-dom';
import {
  Target,
  Wrench,
  FolderOpen,
  MessageSquare,
  Clock,
  ArrowRight,
  Tag,
} from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { ROLES } from '../../utils/roleData';
import { Card, Badge, PageHeader, EmptyState } from '../../components/UI';
import { useT } from '../../hooks/useT';

export default function RolePage() {
  const navigate = useNavigate();
  const { targetRole } = useAppStore();
  const role = ROLES.find((r) => r.id === targetRole);
  const t = useT();
  const tr = t.rolePage;

  if (!role) {
    return (
      <div className="p-8">
        <PageHeader title={tr.title} subtitle={t.rolePage.subtitle} />
        <EmptyState
          icon={Target}
          title={tr.emptyTitle}
          description={tr.emptyDesc}
          action={{ label: tr.emptyAction, onClick: () => navigate('/') }}
        />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        title={tr.title}
        subtitle={tr.subtitle}
        actions={
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Clock size={14} />
            <span>{tr.suggestedWeeks.replace('{n}', String(role.recommendedWeeks))}</span>
          </div>
        }
      />

      {/* Role hero */}
      <Card className="p-6 mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 text-white border-0">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-semibold opacity-70 uppercase tracking-wider mb-2">{tr.targetRoleLabel}</div>
            <h2 className="text-2xl font-bold mb-2">{role.name}</h2>
            <p className="text-indigo-100 text-sm leading-relaxed max-w-xl">{role.description}</p>
          </div>
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <Target size={28} className="text-white" />
          </div>
        </div>
        <div className="flex items-center gap-3 mt-4">
          {role.suitableFor.slice(0, 2).map((s, i) => (
            <div key={i} className="px-3 py-1 bg-white/20 rounded-full text-xs text-white">
              {s}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Core skills */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Wrench size={16} className="text-indigo-600" />
            <div className="font-semibold text-gray-900 text-sm">{tr.coreSkills}</div>
          </div>
          <div className="space-y-2">
            {role.coreSkills.map((skill, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0" />
                <span className="text-sm text-gray-700">{skill}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Software & Work */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Wrench size={16} className="text-emerald-600" />
              <div className="font-semibold text-gray-900 text-sm">{tr.software}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {role.requiredSoftware.map((sw, i) => (
                <Badge key={i} color="emerald">{sw}</Badge>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Tag size={16} className="text-indigo-600" />
              <div className="font-semibold text-gray-900 text-sm">{tr.keywords}</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {role.resumeKeywords.map((kw, i) => (
                <Badge key={i} color="indigo" size="sm">{kw}</Badge>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Typical work */}
      <Card className="p-5 mb-5">
        <div className="font-semibold text-gray-900 text-sm mb-4">{tr.typicalWork}</div>
        <div className="grid grid-cols-2 gap-2">
          {role.typicalWork.map((work, i) => (
            <div key={i} className="flex items-start gap-2 p-2">
              <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0 mt-0.5">
                {i + 1}
              </div>
              <span className="text-sm text-gray-700">{work}</span>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-5 mb-5">
        {/* Portfolio requirements */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen size={16} className="text-amber-600" />
            <div className="font-semibold text-gray-900 text-sm">{tr.portfolioReq}</div>
          </div>
          <div className="space-y-1.5">
            {role.portfolioRequirements.map((req, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                {req}
              </div>
            ))}
          </div>
        </Card>

        {/* Common projects */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <FolderOpen size={16} className="text-purple-600" />
            <div className="font-semibold text-gray-900 text-sm">{tr.commonProjects}</div>
          </div>
          <div className="space-y-1.5">
            {role.commonProjects.map((proj, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-gray-600">
                <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                {proj}
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Interview questions */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageSquare size={16} className="text-indigo-600" />
            <div className="font-semibold text-gray-900 text-sm">{tr.interviewQuestions}</div>
          </div>
          <button
            onClick={() => navigate('/interview')}
            className="text-xs text-indigo-600 font-medium flex items-center gap-1 hover:gap-2 transition-all"
          >
            {tr.practiceBtn} <ArrowRight size={12} />
          </button>
        </div>
        <div className="space-y-2">
          {role.interviewQuestions.map((q, i) => (
            <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0 mt-0.5">
                Q
              </div>
              <span className="text-sm text-gray-700">{q}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
