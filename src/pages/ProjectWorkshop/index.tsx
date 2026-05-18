import { useState, useCallback, useEffect, useMemo } from 'react';
import { suggestProjectNodes } from '../../lib/agentAPI';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  Panel,
  type Node,
  type Edge,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Plus, FolderOpen, ZoomIn, Grid3x3 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import type { Project } from '../../types';
import {
  ProjectHeaderNode,
  FieldNode,
  MaterialsNode,
  AIPanelNode,
  GhostFieldNode,
  type FieldNodeData,
} from './ProjectNodes';

// ── node type registry ────────────────────────────────────────────────────────
const nodeTypes: NodeTypes = {
  'project-header': ProjectHeaderNode,
  'field': FieldNode,
  'materials': MaterialsNode,
  'ai-panel': AIPanelNode,
  'ghost-field': GhostFieldNode,
};

// ── Comprehensive library of all possible node types ─────────────────────────
// AI picks relevant subset; maps to existing Project fields where possible.
export interface NodeLibEntry {
  label: string;
  icon: string;
  description: string;
  fieldKey?: keyof Project;    // maps to a Project string field
  special?: 'materials' | 'ai-panel';
}

export const NODE_LIBRARY: Record<string, NodeLibEntry> = {
  background:    { label: '项目背景',     icon: 'BookOpen',   description: '描述项目的起源、场景与意义',          fieldKey: 'background' },
  designGoal:    { label: '设计目标',     icon: 'Target',     description: '明确希望达到的效果与衡量标准',        fieldKey: 'designGoal' },
  contribution:  { label: '个人贡献',     icon: 'User',       description: '在团队中承担的角色与具体工作',        fieldKey: 'personalContribution' },
  challenge:     { label: '核心挑战',     icon: 'Zap',        description: '项目中遇到的主要困难与限制',          fieldKey: 'mainChallenge' },
  solution:      { label: '方案探索',     icon: 'GitCompare', description: '备选方案对比与最终选择理由',          fieldKey: 'solutionComparison' },
  materials:     { label: '参考素材',     icon: 'Layers',     description: '项目参考资料与素材库',               special: 'materials' },
  materialChoice:{ label: '材料选型',     icon: 'Package',    description: '材料对比、选型依据与物理特性分析',    fieldKey: 'materialChoice' },
  manufacturing: { label: '制造工艺',     icon: 'Settings2',  description: '加工方式、生产流程与制造注意事项',    fieldKey: 'manufacturingConsideration' },
  improvement:   { label: '改进方向',     icon: 'Lightbulb',  description: '迭代想法、未来优化的可能路径',        fieldKey: 'improvementIdeas' },
  analysis:      { label: 'AI 综合分析',  icon: 'Sparkles',   description: '基于所有已填内容生成项目完整度报告',  special: 'ai-panel' },
};

// ── Layout: assign grid positions dynamically ────────────────────────────────
const HEADER_POS = { x: 320, y: 0 };
const OVERVIEW_POS = { x: 320, y: 220 };

function layerPositions(keys: string[], layer: number): Record<string, { x: number; y: number }> {
  const gap = 340;
  const y = 220 + layer * 240;
  const total = keys.length;
  const startX = 320 - ((total - 1) * gap) / 2;
  const result: Record<string, { x: number; y: number }> = {};
  keys.forEach((k, i) => { result[k] = { x: startX + i * gap, y }; });
  return result;
}

// ── Build edges from confirmed + suggested keys ───────────────────────────────
function buildEdges(pid: string, confirmed: string[], suggested: string[]): Edge[] {
  const edges: Edge[] = [];
  const add = (source: string, target: string) => {
    const solid = confirmed.includes(source) && confirmed.includes(target);
    const visible = confirmed.includes(source) || confirmed.includes(target);
    if (!visible) return;
    edges.push({
      id: `${pid}-${source}-${target}`,
      source: `${pid}-${source}`,
      target: `${pid}-${target}`,
      type: 'smoothstep',
      style: {
        stroke: solid ? '#818cf8' : 'rgba(129,140,248,0.30)',
        strokeWidth: solid ? 1.5 : 1,
        strokeDasharray: solid ? undefined : '5 4',
        opacity: solid ? 0.65 : 0.35,
      },
    });
  };

  // header → overview
  add('header', 'background');
  // overview → each suggested
  const allNext = [...new Set([...suggested, ...confirmed.filter(k => k !== 'header' && k !== 'background')])];
  allNext.forEach(k => add('background', k));
  // analysis always links from last confirmed content nodes
  const contentConfirmed = confirmed.filter(k => !['header', 'background', 'materials', 'analysis'].includes(k));
  if (contentConfirmed.length > 0 || suggested.includes('analysis')) {
    contentConfirmed.forEach(k => add(k, 'analysis'));
  }

  return edges;
}

// ── Build nodes from confirmed + suggested, with positions ───────────────────
function buildNodes(
  project: Project,
  confirmed: string[],
  suggested: string[],
  onConfirm: (key: string) => void,
  aiLoading: boolean,
): Node[] {
  const pid = project.id;
  const id = (k: string) => `${pid}-${k}`;

  const positions: Record<string, { x: number; y: number }> = {
    header:  HEADER_POS,
    background: OVERVIEW_POS,
  };

  // Position layer 2: confirmed content + ghost suggestions
  const layer2Keys = [...new Set([
    ...confirmed.filter(k => k !== 'header' && k !== 'background' && k !== 'materials' && k !== 'analysis'),
    ...suggested.filter(k => k !== 'materials' && k !== 'analysis'),
  ])];
  Object.assign(positions, layerPositions(layer2Keys, 2));

  // Materials always far left of layer 2
  if (confirmed.includes('materials') || suggested.includes('materials')) {
    const l2y = 220 + 2 * 240;
    positions['materials'] = { x: positions[layer2Keys[0]]?.x - 380 ?? -60, y: l2y };
  }

  // Analysis always at right of layer 2
  if (confirmed.includes('analysis') || suggested.includes('analysis')) {
    const l2y = 220 + 2 * 240;
    const lastX = layer2Keys.length > 0 ? (positions[layer2Keys[layer2Keys.length - 1]]?.x ?? 320) : 320;
    positions['analysis'] = { x: lastX + 380, y: l2y };
  }

  const nodes: Node[] = [];

  // Header
  nodes.push({
    id: id('header'), type: 'project-header',
    position: HEADER_POS,
    data: { projectId: pid },
  });

  // Build all node keys
  const allKeys = ['background', ...layer2Keys, 'materials', 'analysis'];
  for (const key of allKeys) {
    const entry = NODE_LIBRARY[key];
    if (!entry) continue;
    const pos = positions[key] ?? { x: 320, y: 460 };
    const isConfirmed = confirmed.includes(key);
    const isSuggested = suggested.includes(key) && !isConfirmed;

    if (isConfirmed) {
      if (entry.special === 'materials') {
        nodes.push({ id: id('materials'), type: 'materials', position: pos, data: { projectId: pid } });
      } else if (entry.special === 'ai-panel') {
        nodes.push({ id: id('analysis'), type: 'ai-panel', position: pos, data: { projectId: pid } });
      } else if (entry.fieldKey) {
        nodes.push({
          id: id(key), type: 'field', position: pos,
          data: {
            projectId: pid,
            fieldKey: entry.fieldKey,
            label: entry.label,
            placeholder: entry.description,
            category: key,
            iconName: entry.icon,
          } satisfies FieldNodeData,
        });
      }
    } else if (isSuggested) {
      nodes.push({
        id: id(key), type: 'ghost-field', position: pos,
        data: {
          label: aiLoading && key === suggested[0] ? '正在分析项目…' : entry.label,
          iconName: aiLoading && key === suggested[0] ? 'Loader2' : entry.icon,
          description: aiLoading ? '' : entry.description,
          onConfirm: () => onConfirm(key),
        },
      });
    }
  }

  return nodes;
}

// ── Next-node suggestions: delegate to Agent backend ─────────────────────────
async function askNextNodes(projectName: string, overview: string): Promise<string[]> {
  try {
    const keys = await suggestProjectNodes(projectName, overview);
    const valid = keys.filter(k => NODE_LIBRARY[k]);
    if (valid.length >= 2) return valid.slice(0, 4);
  } catch {
    // backend not running → graceful fallback
  }
  return ['designGoal', 'challenge', 'contribution'];
}

// ── new project factory ───────────────────────────────────────────────────────
function createBlankProject(): Project {
  return {
    id: `project-${Date.now()}`,
    name: '',
    background: '', designGoal: '', personalContribution: '', mainChallenge: '',
    solutionComparison: '', materialChoice: '', manufacturingConsideration: '',
    hasPrototypeTesting: false, improvementIdeas: '',
    materials: [], aiFeedback: '', missingElements: [], completionRate: 0,
    confirmedNodes: ['header'],
    suggestedNodes: ['background'],
  };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ProjectWorkshop() {
  const { projects, addProject, updateProject } = useAppStore();

  const [selectedId, setSelectedId] = useState<string | null>(
    projects.length > 0 ? projects[0].id : null
  );
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const selectedProject = useMemo(() => projects.find(p => p.id === selectedId), [projects, selectedId]);
  const confirmed = useMemo(() => selectedProject?.confirmedNodes ?? ['header'], [selectedProject]);
  const suggested = useMemo(() => selectedProject?.suggestedNodes ?? ['background'], [selectedProject]);

  // Confirm a ghost node → add to confirmedNodes
  const confirmNode = useCallback((key: string) => {
    if (!selectedId) return;
    const project = projects.find(p => p.id === selectedId);
    if (!project) return;
    const nextConfirmed = [...new Set([...(project.confirmedNodes ?? ['header']), key])];
    const nextSuggested = (project.suggestedNodes ?? []).filter(k => k !== key);
    updateProject(selectedId, { confirmedNodes: nextConfirmed, suggestedNodes: nextSuggested } as Partial<Project>);
  }, [selectedId, projects, updateProject]);

  // After background is confirmed with content → ask AI for next nodes
  useEffect(() => {
    if (!selectedProject) return;
    if (!confirmed.includes('background')) return;
    if (!selectedProject.background?.trim()) return;
    if ((selectedProject.suggestedNodes ?? []).filter(k => k !== 'background').length > 0) return;
    // Trigger AI suggestion
    setAiLoading(true);
    askNextNodes(selectedProject.name, selectedProject.background).then(keys => {
      updateProject(selectedProject.id, { suggestedNodes: keys } as Partial<Project>);
      setAiLoading(false);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed.join(','), selectedProject?.background]);

  // Rebuild canvas
  useEffect(() => {
    if (!selectedId || !selectedProject) { setNodes([]); setEdges([]); return; }
    setNodes(buildNodes(selectedProject, confirmed, suggested, confirmNode, aiLoading));
    setEdges(buildEdges(selectedId, confirmed, suggested));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, confirmed.join(','), suggested.join(','), aiLoading]);

  // Create project directly — no modal
  const handleNewProject = useCallback(() => {
    const p = createBlankProject();
    addProject(p);
    setSelectedId(p.id);
  }, [addProject]);

  return (
    <div className="flex h-screen" style={{ height: 'calc(100vh - 0px)', background: '#f5f6fa' }}>
      {/* ── Left project panel ─────────────────────────────────────────── */}
      <div className="w-52 shrink-0 flex flex-col" style={{ background: '#ffffff', borderRight: '1px solid rgba(0,0,0,0.07)' }}>
        <div className="p-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(0,0,0,0.25)' }}>Projects</div>
          <button
            onClick={handleNewProject}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
            style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.35)' }}
          >
            <Plus size={13} />
            新建项目
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          <AnimatePresence>
            {projects.map(p => (
              <motion.button
                key={p.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                onClick={() => setSelectedId(p.id)}
                className="w-full text-left px-3 py-2.5 rounded-xl transition-all"
                style={{
                  background: selectedId === p.id ? 'rgba(99,102,241,0.10)' : 'transparent',
                  border: `1px solid ${selectedId === p.id ? 'rgba(99,102,241,0.25)' : 'transparent'}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <FolderOpen size={12} style={{ color: selectedId === p.id ? '#6366f1' : 'rgba(0,0,0,0.25)' }} />
                  <span className="text-xs font-medium truncate" style={{ color: selectedId === p.id ? '#4f46e5' : '#374151' }}>
                    {p.name || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>未命名项目</span>}
                  </span>
                </div>
                {p.completionRate > 0 && (
                  <div className="mt-1.5 h-px" style={{ background: 'rgba(0,0,0,0.06)' }}>
                    <div className="h-px transition-all" style={{ width: `${p.completionRate}%`, background: '#6366f1', opacity: 0.7 }} />
                  </div>
                )}
              </motion.button>
            ))}
          </AnimatePresence>

          {projects.length === 0 && (
            <div className="text-center py-8 text-xs" style={{ color: 'rgba(0,0,0,0.20)' }}>
              <Grid3x3 size={22} className="mx-auto mb-2 opacity-40" />
              暂无项目
            </div>
          )}
        </div>
      </div>

      {/* ── Canvas ────────────────────────────────────────────────────── */}
      <div className="flex-1 relative">
        {selectedProject ? (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.18 }}
            minZoom={0.2}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            style={{ background: '#f5f6fa' }}
          >
            <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="rgba(0,0,0,0.10)" />
            <Controls
              style={{
                background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 12, boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
              }}
            />
            <MiniMap
              style={{ background: '#ffffff', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 12 }}
              nodeColor="rgba(99,102,241,0.35)"
              maskColor="rgba(245,246,250,0.7)"
            />
            <Panel position="top-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.08)', backdropFilter: 'blur(12px)', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#6366f1' }} />
                <span className="text-sm font-medium" style={{ color: '#374151' }}>
                  {selectedProject.name || '未命名项目'}
                </span>
                {aiLoading && (
                  <>
                    <div className="w-px h-4 mx-1" style={{ background: 'rgba(0,0,0,0.08)' }} />
                    <span className="text-xs" style={{ color: '#6366f1' }}>AI 分析中…</span>
                  </>
                )}
                <div className="w-px h-4 mx-1" style={{ background: 'rgba(0,0,0,0.08)' }} />
                <div className="flex items-center gap-1 text-xs" style={{ color: '#9ca3af' }}>
                  <ZoomIn size={11} />
                  <span>scroll · drag</span>
                </div>
              </div>
            </Panel>
          </ReactFlow>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.20)' }}>
              <Grid3x3 size={28} style={{ color: 'rgba(99,102,241,0.6)' }} />
            </div>
            <h3 className="text-base font-semibold mb-2" style={{ color: '#374151' }}>还没有项目</h3>
            <p className="text-sm mb-6 max-w-xs" style={{ color: '#9ca3af' }}>
              点击左侧「新建项目」开始
            </p>
            <button
              onClick={handleNewProject}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
              style={{ background: 'rgba(99,102,241,0.12)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.30)' }}
            >
              <Plus size={13} />
              新建项目
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
