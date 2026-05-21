import { useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type NodeTypes,
  type Node,
  type Edge,
  Position,
  Handle,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Cpu, Search, BookOpen, Layers, Network } from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import { fetchAgents, type AgentMeta } from '../../lib/agentAPI';

// ── Color palette per agent group ────────────────────────────────────────────
const COLORS = {
  planner:   { accent: '#6366f1', light: 'rgba(99,102,241,0.08)',   border: 'rgba(99,102,241,0.35)',  label: '学习路径规划'  },
  project:   { accent: '#f59e0b', light: 'rgba(245,158,11,0.08)',   border: 'rgba(245,158,11,0.35)',  label: '项目 Agent'   },
  portfolio: { accent: '#10b981', light: 'rgba(16,185,129,0.08)',   border: 'rgba(16,185,129,0.35)',  label: '作品集 Agent' },
  career:    { accent: '#ec4899', light: 'rgba(236,72,153,0.08)',   border: 'rgba(236,72,153,0.35)',  label: '求职面试 Agent'},
  rag:       { accent: '#94a3b8', light: 'rgba(148,163,184,0.06)',  border: 'rgba(148,163,184,0.25)', label: 'RAG 知识库'   },
  user:      { accent: '#64748b', light: 'rgba(100,116,139,0.06)',  border: 'rgba(100,116,139,0.25)', label: '用户触发'     },
  // keep legacy keys for backward compat
  learning:  { accent: '#8b5cf6', light: 'rgba(139,92,246,0.07)',  border: 'rgba(139,92,246,0.3)',   label: 'Learning'     },
  tool:      { accent: '#64748b', light: 'rgba(100,116,139,0.06)', border: 'rgba(100,116,139,0.25)', label: 'Tool'         },
};

type Group = keyof typeof COLORS;

// ── Agent definition type ──────────────────────────────────────────────────
interface AgentDef {
  id: string;
  name: string;
  description: string;
  inputs: string[];
  outputs: string[];
  group: Group;
  icon: React.ReactNode;
  model?: string;
  tools?: string[];
}

const AGENTS: AgentDef[] = [

  // ══════════════════════════════════════════════════════
  // CORE: 4 Business Agents
  // ══════════════════════════════════════════════════════

  {
    id: 'learning_path_planner',
    name: 'LearningPathPlannerAgent',
    description: '学习路径规划。在用户入驻时和修改学习路径时触发。根据用户身份、现有技能、目标岗位，以及来自求职Agent的JD反馈，制定分阶段学习计划，并将任务路由给项目、作品集、求职三个Agent。',
    inputs: ['user.background', 'user.currentSkills', 'user.targetRole', 'user.weeklyHours', 'jdFeedback (from JobAgent)', 'userModRequest'],
    outputs: ['plan.phases[]', 'plan.routedTasks.toProject', 'plan.routedTasks.toPortfolio', 'plan.routedTasks.toCareer'],
    group: 'planner',
    icon: <BookOpen size={14} />,
    model: 'Gemini 2.5 Flash (temp 0.3)',
  },
  {
    id: 'project_agent',
    name: 'ProjectAgent',
    description: '项目内容生产。帮助用户记录和完善项目的全部内容——背景调研、设计目标、挑战、方案探索、材料工艺等。接收来自求职Agent的JD反馈，强化与目标岗位相关的记录内容。将结构化的项目交接上下文（叙事弧+核心亮点）传递给作品集Agent。',
    inputs: ['task (from planner)', 'projectName', 'existingFields', 'fieldToComplete', 'jdFeedback (from JobAgent)'],
    outputs: ['project.* (all fields)', 'handoffContext → portfolioAgent'],
    group: 'project',
    icon: <Layers size={14} />,
    model: 'Gemini 2.5 Flash (temp 0.5)',
  },
  {
    id: 'portfolio_agent',
    name: 'PortfolioAgent',
    description: '作品集可视化与排版。在项目Agent内容的基础上，决定如何展示——叙事结构、页面顺序、每页选用哪种可视化工具（雷达图/形态学矩阵/用户旅程图等）。接收JD反馈调整侧重点，将汇总信息传给求职Agent。',
    inputs: ['handoffContext (from ProjectAgent)', 'project', 'targetRole', 'jdFeedback (from JobAgent)'],
    outputs: ['portfolio.structure[]', 'portfolio.structure[].visualizationTools', 'portfolioHandoff → JobAgent'],
    group: 'portfolio',
    icon: <Network size={14} />,
    model: 'Gemini 2.5 Flash (temp 0.4)',
  },
  {
    id: 'jd_input',
    name: 'JD 输入',
    description: '用户在简历优化页面上传 JD——支持图片截图（招聘网站截图）或直接粘贴文字。触发 JobApplicationAgent 的 Step 1 JD 解析。',
    inputs: ['图片截图 (base64)', '粘贴文字'],
    outputs: ['jdInput.type', 'jdInput.imageBase64 / jdInput.text'],
    group: 'user',
    icon: <Search size={14} />,
  },
  {
    id: 'job_application_agent',
    name: 'JobApplicationAgent',
    description: '求职面试（两步执行）。Step 1：用 Vision 模型解析 JD 图片或文字，提取岗位名称、必要技能、核心职责、胜任力要求等结构化信息。Step 2：基于结构化 JD + 项目内容 + 作品集，生成定制简历与面试话术，同时将差距分析反馈给学习路径/项目/作品集 Agent 形成闭环。',
    inputs: ['jdInput (from JD输入)', 'projectHandoff (from ProjectAgent)', 'portfolioHandoff (from PortfolioAgent)'],
    outputs: ['parsedJD · 结构化JD', 'resume.*', 'interviewPrepPoints[]', 'jdGapAnalysis', 'feedback.toLearningPath ↩', 'feedback.toProject ↩', 'feedback.toPortfolio ↩'],
    group: 'career',
    icon: <Cpu size={14} />,
    model: 'Step1: Gemini Vision · Step2: Gemini 2.5 Flash',
  },

  // ══════════════════════════════════════════════════════
  // 知识库 Agent（内部用 RAG 管线实现，对外是一个整体）
  // ══════════════════════════════════════════════════════

  {
    id: 'knowledge_base_agent',
    name: 'KnowledgeBaseAgent',
    description: '知识库问答。接收用户自然语言问题，内部经过意图识别→Query改写→混合检索（向量+关键词）→重排→生成，返回综合回答、相关知识节点、社区帖子和推荐追问。所有 4 个核心 Agent 均可调用它来查询设计工程知识库。',
    inputs: ['query: string · 用户问题', 'lang: string · zh | en'],
    outputs: ['answer: string · Markdown 回答', 'relatedNodes[] · 相关知识节点', 'relatedPosts[] · 相关社区帖子', 'recommendations[] · 推荐追问'],
    group: 'rag',
    icon: <Search size={14} />,
    model: 'Gemini 2.5 Flash',
    tools: ['vectorSearchKnowledge', 'vectorSearchCommunity', 'keywordSearchKnowledge', 'keywordSearchCommunity'],
  },
];

// ── AgentCard node component ──────────────────────────────────────────────────
function AgentCardNode({ data: rawData }: { data: Record<string, unknown> }) {
  const data = rawData as unknown as AgentDef;
  const col = COLORS[data.group];
  return (
    <div style={{
      background: '#fff',
      border: `1.5px solid ${col.border}`,
      borderRadius: 14,
      padding: '12px 16px',
      minWidth: 260,
      maxWidth: 300,
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      position: 'relative',
    }}>
      <Handle type="target" position={Position.Left}  style={{ background: col.accent, width: 8, height: 8, border: 'none' }} />
      <Handle type="source" position={Position.Right} style={{ background: col.accent, width: 8, height: 8, border: 'none' }} />
      {data.id === 'doc_grader' && (
        <>
          <Handle type="source" id="generate" position={Position.Bottom} style={{ left: '35%', background: '#10b981', width: 8, height: 8, border: 'none' }} />
          <Handle type="source" id="fallback" position={Position.Bottom} style={{ left: '65%', background: '#f59e0b', width: 8, height: 8, border: 'none' }} />
        </>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
        <div style={{
          width: 26, height: 26, borderRadius: 8, flexShrink: 0,
          background: col.light, border: `1px solid ${col.border}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: col.accent,
        }}>{data.icon}</div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: col.accent, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {COLORS[data.group].label}
          </div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{data.name}</div>
        </div>
      </div>

      {/* Description */}
      <p style={{ fontSize: 11, color: '#6b7280', lineHeight: 1.6, margin: '0 0 10px' }}>
        {data.description}
      </p>

      {/* Model */}
      {data.model && (
        <div style={{ fontSize: 10, color: col.accent, background: col.light, border: `1px solid ${col.border}`, borderRadius: 6, padding: '2px 7px', display: 'inline-block', marginBottom: 8 }}>
          {data.model}
        </div>
      )}

      {/* Tools */}
      {data.tools && data.tools.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Tools</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {data.tools.map(t => (
              <span key={t} style={{ fontSize: 10, background: 'rgba(100,116,139,0.08)', border: '1px solid rgba(100,116,139,0.2)', borderRadius: 5, padding: '1px 6px', color: '#475569' }}>{t}</span>
            ))}
          </div>
        </div>
      )}

      {/* I/O */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Input</div>
          {data.inputs.map((i, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 3 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#d1d5db', flexShrink: 0, marginTop: 4 }} />
              <span style={{ fontSize: 10, color: '#6b7280', lineHeight: 1.5 }}>{i}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Output</div>
          {data.outputs.map((o, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 3 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: col.accent, flexShrink: 0, marginTop: 4 }} />
              <span style={{ fontSize: 10, color: '#374151', lineHeight: 1.5 }}>{o}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const nodeTypes: NodeTypes = { agentCard: AgentCardNode };

// ── Node positions ────────────────────────────────────────────────────────────
const X0 = 60, DX = 360, DY = 340;

const NODE_POS: Record<string, { x: number; y: number }> = {
  // ── Row 0: JD input trigger (above job_application_agent)
  jd_input:              { x: X0 + DX*3,   y: -140 },

  // ── Row 1: Core business agents (forward pass, left to right)
  learning_path_planner: { x: X0,        y: 80 },
  project_agent:         { x: X0 + DX,   y: 80 },
  portfolio_agent:       { x: X0 + DX*2, y: 80 },
  job_application_agent: { x: X0 + DX*3, y: 80 },

  // ── Row 2: Knowledge Base Agent (centred under the business row)
  knowledge_base_agent:  { x: X0 + DX*1.5, y: DY + 80 },
};

function buildNodes(agents: AgentDef[]): Node<Record<string, unknown>>[] {
  return agents.map(a => ({
    id: a.id,
    type: 'agentCard',
    position: NODE_POS[a.id] ?? { x: 0, y: 0 },
    data: a as unknown as Record<string, unknown>,
    draggable: true,
  }));
}

function buildEdges(): Edge[] {
  const e = (source: string, target: string, label?: string, animated = true, color?: string): Edge => ({
    id: `${source}->${target}`,
    source,
    target,
    label,
    animated,
    style: { stroke: color ?? '#94a3b8', strokeWidth: 1.5 },
    labelStyle: { fontSize: 10, fill: '#6b7280' },
    labelBgStyle: { fill: '#f8fafc', fillOpacity: 0.9 },
    markerEnd: { type: 'arrowclosed' as const, color: color ?? '#94a3b8' },
  });

  const plannerC  = '#6366f1';
  const projectC  = '#f59e0b';
  const portfolioC= '#10b981';
  const ragC      = '#94a3b8';
  const feedbackC = '#e879f9';

  return [
    // ── JD 输入触发 ─────────────────────────────────────────────────────
    e('jd_input', 'job_application_agent', 'JD 图片 / 文字 →', true, '#ec4899'),

    // ── Forward pass ────────────────────────────────────────────────────
    e('learning_path_planner', 'project_agent',         '路由任务 →',       true, plannerC),
    e('learning_path_planner', 'portfolio_agent',       '路由任务 →',       true, plannerC),
    e('learning_path_planner', 'job_application_agent', '路由任务 →',       true, plannerC),
    e('project_agent',         'portfolio_agent',       'handoffContext →', true, projectC),
    e('portfolio_agent',       'job_application_agent', 'portfolioHandoff →', true, portfolioC),

    // ── Feedback loop ────────────────────────────────────────────────────
    {
      ...e('job_application_agent', 'learning_path_planner', '↩ JD 反馈', false, feedbackC),
      style: { stroke: feedbackC, strokeWidth: 1.5, strokeDasharray: '5,4' },
    },
    {
      ...e('job_application_agent', 'project_agent', '↩ 补强内容', false, feedbackC),
      style: { stroke: feedbackC, strokeWidth: 1.5, strokeDasharray: '5,4' },
    },
    {
      ...e('job_application_agent', 'portfolio_agent', '↩ 调整叙事', false, feedbackC),
      style: { stroke: feedbackC, strokeWidth: 1.5, strokeDasharray: '5,4' },
    },

    // ── Knowledge Base Agent：所有业务 Agent 均可调用 ────────────────────
    e('learning_path_planner', 'knowledge_base_agent', '查询知识库', true, ragC),
    e('project_agent',         'knowledge_base_agent', '查询知识库', true, ragC),
    e('portfolio_agent',       'knowledge_base_agent', '查询知识库', true, ragC),
    e('job_application_agent', 'knowledge_base_agent', '查询知识库', true, ragC),
  ];
}

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend() {
  return (
    <div style={{
      position: 'absolute', bottom: 16, left: 16, zIndex: 10,
      background: '#fff', border: '1px solid rgba(0,0,0,0.08)',
      borderRadius: 12, padding: '10px 16px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      display: 'flex', flexWrap: 'wrap', gap: '8px 20px',
    }}>
      {(['planner', 'project', 'portfolio', 'career', 'rag'] as Group[]).map((key) => {
        const col = COLORS[key];
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: col.accent }} />
            <span style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>{col.label}</span>
          </div>
        );
      })}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 22, height: 2, background: '#e879f9', borderRadius: 1, borderTop: '2px dashed #e879f9' }} />
        <span style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>JD 反馈回路</span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AgentSystemPage() {
  const { language } = useSettingsStore();
  const isEn = language === 'en-US';

  // Try to load live agent metadata from backend; fall back to static AGENTS
  const [liveAgents, setLiveAgents] = useState<AgentMeta[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents()
      .then((data) => setLiveAgents(data.agents))
      .catch(() => setLiveAgents(null))
      .finally(() => setLoading(false));
  }, []);

  // Merge: live data overrides description/inputSchema/outputSchema for matching ids
  const displayAgents = useMemo<AgentDef[]>(() => {
    if (!liveAgents) return AGENTS;
    return AGENTS.map((a) => {
      const live = liveAgents.find((l) => l.id === a.id);
      if (!live) return a;
      return {
        ...a,
        description: live.description || a.description,
        inputs:  Object.entries(live.inputSchema ?? {}).map(([k, v]) => `${k}: ${v}`),
        outputs: Object.entries(live.outputSchema ?? {}).map(([k, v]) => `${k}: ${v}`),
        tools:   live.tools ?? a.tools,
      };
    });
  }, [liveAgents]);

  const initialNodes = useMemo(() => buildNodes(displayAgents), [displayAgents]);
  const initialEdges = useMemo(() => buildEdges(), []);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const totalCount = liveAgents?.length ?? AGENTS.length;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#f5f6fa' }}>
      {/* Header */}
      <div style={{
        padding: '16px 28px', borderBottom: '1px solid rgba(0,0,0,0.07)',
        background: '#fff', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 32, height: 32, borderRadius: 10,
          background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Network size={16} color="#6366f1" />
        </div>
        <div>
          <h1 style={{ fontSize: 17, fontWeight: 700, color: '#111827', margin: 0 }}>
            {isEn ? 'Agent Architecture' : 'Agent 协作系统'}
          </h1>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: 0 }}>
            {isEn
              ? `${totalCount} agents · RAG Pipeline · A2A Portfolio Graph · Project & Learning`
              : `${totalCount} 个 Agent · RAG 检索管线 · A2A 作品集协作图 · 项目与学习链`}
            {loading && <span style={{ marginLeft: 8, color: '#d1d5db' }}>· 同步中…</span>}
            {!loading && liveAgents && <span style={{ marginLeft: 8, color: '#10b981' }}>· 已从后端同步</span>}
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <div style={{ fontSize: 11, color: '#6366f1', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, padding: '3px 10px' }}>
            LangGraph StateGraph
          </div>
          <div style={{ fontSize: 11, color: '#10b981', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 20, padding: '3px 10px' }}>
            LangSmith Tracing
          </div>
        </div>
      </div>

      {/* Canvas */}
      <div style={{ flex: 1, position: 'relative' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.15}
          maxZoom={1.8}
          defaultEdgeOptions={{ animated: true }}
        >
          <Background color="#e2e8f0" gap={20} size={1} />
          <Controls style={{ bottom: 16, right: 16, top: 'auto' }} />
          <MiniMap
            nodeColor={n => COLORS[(n.data as unknown as AgentDef).group]?.accent ?? '#94a3b8'}
            style={{ bottom: 16, right: 120 }}
            maskColor="rgba(241,245,249,0.7)"
          />
        </ReactFlow>
        <Legend />
      </div>
    </div>
  );
}
