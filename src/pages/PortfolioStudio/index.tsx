import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import type { Portfolio } from '../../types';
import '@xyflow/react/dist/style.css';
import { FolderOpen, Grid3x3, Layers, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { generatePortfolio } from '../../utils/mockAI';
import type { TargetRole } from '../../types';
import {
  PortfolioHeaderNode,
  PortfolioSectionNode,
  GenerateNode,
  ExportNode,
  type PortfolioSectionNodeData,
} from './PortfolioNodes';

const nodeTypes: NodeTypes = {
  'portfolio-header': PortfolioHeaderNode,
  'portfolio-section': PortfolioSectionNode,
  'generate-cta': GenerateNode,
  'export': ExportNode,
};

const EDGE_STYLE = {
  stroke: '#a78bfa',
  strokeWidth: 1.5,
  opacity: 0.5,
};

function buildPortfolioNodes(
  project: { id: string; name: string },
  portfolio: Portfolio,
  onCopy: (text: string) => void,
  navigate: (path: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  const pid = project.id;
  const pages = portfolio.structure;

  const COLS = 3;
  const COL_WIDTH = 290;
  const ROW_HEIGHT = 240;

  const nodes: Node[] = [
    {
      id: `${pid}-header`,
      type: 'portfolio-header',
      position: { x: (COLS - 1) * COL_WIDTH / 2 - 40, y: 0 },
      data: {
        projectName: project.name,
        highlights: portfolio.highlights ?? [],
        sectionCount: pages.length,
      },
    },
  ];

  const edges: Edge[] = [];

  pages.forEach((page, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const nodeId = `${pid}-section-${i}`;

    const sectionData: PortfolioSectionNodeData = {
      title: page.title,
      description: page.contentSuggestion ?? '',
      type: 'overview',
      status: page.isComplete ? 'complete' : page.requiredMaterials?.length > 0 ? 'partial' : 'empty',
      pageNum: page.pageNumber,
      onCopy: () => onCopy(page.contentSuggestion ?? ''),
      copyLabel: 'Copy',
    };

    nodes.push({
      id: nodeId,
      type: 'portfolio-section',
      position: { x: col * COL_WIDTH, y: 180 + row * ROW_HEIGHT },
      data: sectionData,
    });

    if (row === 0) {
      edges.push({ id: `${pid}-h-${i}`, source: `${pid}-header`, target: nodeId, type: 'smoothstep', style: EDGE_STYLE });
    }
    if (row > 0) {
      edges.push({ id: `${pid}-flow-${i}`, source: `${pid}-section-${i - COLS}`, target: nodeId, type: 'smoothstep', style: EDGE_STYLE });
    }
  });

  const lastRow = Math.floor((pages.length - 1) / COLS);
  nodes.push({
    id: `${pid}-export`,
    type: 'export',
    position: { x: (COLS - 1) * COL_WIDTH / 2 - 20, y: 180 + (lastRow + 1) * ROW_HEIGHT + 20 },
    data: { totalPages: pages.length, toResume: () => navigate('/resume') },
  });

  for (let col = 0; col < COLS; col++) {
    const lastIdx = lastRow * COLS + col;
    if (lastIdx < pages.length) {
      edges.push({ id: `${pid}-to-export-${col}`, source: `${pid}-section-${lastIdx}`, target: `${pid}-export`, type: 'smoothstep', style: EDGE_STYLE });
    }
  }

  return { nodes, edges };
}

function buildGenerateNodes(
  project: { id: string; name: string },
  onGenerate: () => void,
  isGenerating: boolean,
): { nodes: Node[]; edges: Edge[] } {
  const pid = project.id;
  return {
    nodes: [
      {
        id: `${pid}-header`,
        type: 'portfolio-header',
        position: { x: 80, y: 0 },
        data: { projectName: project.name, highlights: [], sectionCount: 0 },
      },
      {
        id: `${pid}-generate`,
        type: 'generate-cta',
        position: { x: 80, y: 180 },
        data: { onGenerate, isGenerating, projectName: project.name },
      },
    ],
    edges: [
      {
        id: `${pid}-h-gen`,
        source: `${pid}-header`,
        target: `${pid}-generate`,
        type: 'smoothstep',
        style: EDGE_STYLE,
      },
    ],
  };
}

function createBlankProject(name: string) {
  return {
    id: `project-${Date.now()}`,
    name,
    background: '', designGoal: '', personalContribution: '', mainChallenge: '',
    solutionComparison: '', materialChoice: '', manufacturingConsideration: '',
    hasPrototypeTesting: false, improvementIdeas: '',
    materials: [], aiFeedback: '', missingElements: [], completionRate: 10,
  };
}

export default function PortfolioStudio() {
  const navigate = useNavigate();
  const { projects, portfolios, targetRole, addPortfolio, addProject } = useAppStore();

  const [selectedId, setSelectedId] = useState<string | null>(
    projects.length > 0 ? projects[0].id : null
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  const handleNewProject = useCallback(() => {
    setCreating(true); setNewName('');
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }, []);

  const handleConfirmCreate = useCallback(() => {
    if (!newName.trim()) return;
    const p = createBlankProject(newName.trim());
    addProject(p);
    setSelectedId(p.id);
    setCreating(false); setNewName('');
  }, [newName, addProject]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
  }, []);

  const handleGenerate = useCallback(() => {
    if (!selectedId || !targetRole) return;
    const project = projects.find(p => p.id === selectedId);
    if (!project) return;
    setIsGenerating(true);
    setTimeout(() => {
      const portfolio = generatePortfolio(project, targetRole as TargetRole);
      addPortfolio(portfolio);
      setIsGenerating(false);
    }, 2500);
  }, [selectedId, targetRole, projects, addPortfolio]);

  const selectedProject = useMemo(() => projects.find(p => p.id === selectedId), [projects, selectedId]);
  const activePortfolio = selectedId ? portfolios[selectedId] : null;

  useEffect(() => {
    if (!selectedProject) { setNodes([]); setEdges([]); return; }
    if (activePortfolio) {
      const { nodes: n, edges: e } = buildPortfolioNodes(
        selectedProject, activePortfolio, handleCopy, navigate,
      );
      setNodes(n);
      setEdges(e);
    } else {
      const { nodes: n, edges: e } = buildGenerateNodes(
        selectedProject, handleGenerate, isGenerating,
      );
      setNodes(n);
      setEdges(e);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, activePortfolio, isGenerating]);

  return (
    <div className="flex h-screen" style={{ height: 'calc(100vh - 0px)', background: '#f5f6fa' }}>
      {/* ── Left panel ──────────────────────────────────────────────── */}
      <div className="w-52 shrink-0 flex flex-col" style={{ background: '#ffffff', borderRight: '1px solid rgba(0,0,0,0.07)' }}>
        <div className="p-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'rgba(0,0,0,0.25)' }}>Portfolio</div>
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
            {projects.map(p => {
              const hasPortfolio = !!portfolios[p.id];
              return (
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
                    <Layers size={12} style={{ color: selectedId === p.id ? '#6366f1' : 'rgba(0,0,0,0.25)' }} />
                    <span className="text-xs font-medium truncate" style={{ color: selectedId === p.id ? '#4f46e5' : '#374151' }}>
                      {p.name}
                    </span>
                  </div>
                  {hasPortfolio && (
                    <div className="mt-1 text-xs flex items-center gap-1" style={{ color: 'rgba(99,102,241,0.55)' }}>
                      <span>{portfolios[p.id]?.structure?.length ?? 0} pages</span>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </AnimatePresence>

          {projects.length === 0 && (
            <div className="text-center py-8 text-xs" style={{ color: 'rgba(0,0,0,0.20)' }}>
              <FolderOpen size={22} className="mx-auto mb-2 opacity-40" />
              No projects yet
            </div>
          )}
        </div>
      </div>

      {/* ── Create project modal ──────────────────────────────────────── */}
      <AnimatePresence>
        {creating && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setCreating(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -12 }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
              style={{
                position: 'fixed', top: '50%', left: '50%',
                transform: 'translate(-50%, -50%)',
                width: 440, zIndex: 101,
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 20, padding: 32,
                boxShadow: '0 8px 40px rgba(0,0,0,0.12)',
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 6 }}>新建项目</div>
              <div style={{ fontSize: 13, color: '#9ca3af', marginBottom: 24 }}>给项目起个名字，之后可以随时修改</div>
              <input
                ref={nameInputRef}
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleConfirmCreate(); if (e.key === 'Escape') setCreating(false); }}
                placeholder="例如：便携充电宝结构设计"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#f8f9fb',
                  border: '1px solid rgba(99,102,241,0.35)',
                  borderRadius: 12, padding: '12px 16px',
                  fontSize: 15, color: '#111827',
                  outline: 'none', marginBottom: 20,
                  fontFamily: 'inherit',
                }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setCreating(false)}
                  style={{ flex: 1, padding: '11px 0', border: '1px solid rgba(0,0,0,0.10)', borderRadius: 12, background: 'transparent', color: '#9ca3af', fontSize: 14, cursor: 'pointer' }}
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmCreate}
                  disabled={!newName.trim()}
                  style={{
                    flex: 2, padding: '11px 0', border: 'none', borderRadius: 12,
                    background: newName.trim() ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(99,102,241,0.15)',
                    color: newName.trim() ? '#fff' : '#9ca3af',
                    fontSize: 14, fontWeight: 600, cursor: newName.trim() ? 'pointer' : 'not-allowed',
                  }}
                >
                  创建项目
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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
            fitViewOptions={{ padding: 0.15 }}
            minZoom={0.15}
            maxZoom={1.5}
            proOptions={{ hideAttribution: true }}
            style={{ background: '#f5f6fa' }}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={28}
              size={1}
              color="rgba(0,0,0,0.10)"
            />
            <Controls
              style={{
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 12,
                boxShadow: '0 1px 8px rgba(0,0,0,0.06)',
              }}
            />
            <MiniMap
              style={{
                background: '#ffffff',
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 12,
              }}
              nodeColor="rgba(99,102,241,0.35)"
              maskColor="rgba(245,246,250,0.7)"
            />
            <Panel position="top-center">
              <div className="flex items-center gap-2 px-4 py-2 rounded-2xl"
                style={{ background: 'rgba(255,255,255,0.92)', border: '1px solid rgba(0,0,0,0.08)', backdropFilter: 'blur(12px)', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: '#6366f1' }} />
                <span className="text-sm font-medium" style={{ color: '#374151' }}>{selectedProject.name}</span>
                {activePortfolio && (
                  <>
                    <div className="w-px h-4 mx-1" style={{ background: 'rgba(0,0,0,0.08)' }} />
                    <span className="text-xs" style={{ color: '#9ca3af' }}>{activePortfolio.structure?.length} pages</span>
                  </>
                )}
              </div>
            </Panel>
          </ReactFlow>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.18)' }}>
              <Grid3x3 size={28} style={{ color: 'rgba(99,102,241,0.6)' }} />
            </div>
            <h3 className="text-base font-semibold mb-2" style={{ color: '#374151' }}>No project selected</h3>
            <p className="text-sm max-w-xs mb-5" style={{ color: '#9ca3af' }}>
              在左侧新建项目，或选择已有项目生成作品集画布
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
