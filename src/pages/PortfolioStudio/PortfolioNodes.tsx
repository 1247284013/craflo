import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Layers, FileText, Sparkles, Copy, ExternalLink, Star } from 'lucide-react';

const T = {
  nodeBg:       '#ffffff',
  nodeBorder:   'rgba(0,0,0,0.08)',
  headerBg:     '#f8f9fb',
  textPrimary:  '#111827',
  textSecond:   '#6b7280',
  textMuted:    '#9ca3af',
  accent:       '#6366f1',
  accentDim:    'rgba(99,102,241,0.08)',
  accentBorder: 'rgba(99,102,241,0.28)',
  divider:      'rgba(0,0,0,0.05)',
};

const handleStyle = {
  width: 8, height: 8,
  background: T.accent,
  border: `2px solid ${T.nodeBg}`,
};

const nodeBox = (selected: boolean) => ({
  background: T.nodeBg,
  border: `1px solid ${selected ? T.accentBorder : T.nodeBorder}`,
  borderRadius: 16,
  overflow: 'hidden' as const,
  boxShadow: selected
    ? `0 0 0 1px rgba(99,102,241,0.25), 0 4px 20px rgba(0,0,0,0.10)`
    : '0 1px 8px rgba(0,0,0,0.07)',
});

// ── Portfolio Header Node ─────────────────────────────────────────────────────
export type PortfolioHeaderNodeData = {
  projectName: string;
  highlights: string[];
  sectionCount: number;
};

export const PortfolioHeaderNode = memo(({ data, selected }: NodeProps) => {
  const d = data as PortfolioHeaderNodeData;
  return (
    <div style={{ width: 300, ...nodeBox(selected) }}>
      <Handle type="source" position={Position.Bottom} style={handleStyle} />

      <div style={{ background: T.headerBg, borderBottom: `1px solid ${T.divider}` }} className="px-4 py-3 flex items-center gap-2">
        <Layers size={13} style={{ color: T.accent }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: T.textMuted }}>Portfolio</span>
      </div>

      <div className="px-4 py-4">
        <div className="text-base font-semibold mb-3" style={{ color: T.textPrimary }}>
          {d.projectName}
        </div>
        <div className="flex items-center gap-2" style={{ color: T.textMuted }}>
          <div className="text-xs">{d.sectionCount} pages</div>
        </div>
        {d.highlights?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {d.highlights.slice(0, 3).map((h, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded-md"
                style={{ background: 'rgba(255,255,255,0.06)', color: T.textSecond }}>
                {h}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
PortfolioHeaderNode.displayName = 'PortfolioHeaderNode';

// ── Portfolio Section Node ────────────────────────────────────────────────────
export type PortfolioSectionNodeData = {
  title: string;
  description: string;
  type: string;
  status: 'complete' | 'partial' | 'empty';
  pageNum: number;
  onCopy?: () => void;
  copyLabel?: string;
};

const STATUS_LABEL: Record<string, string> = {
  complete: 'Complete',
  partial:  'Partial',
  empty:    'Empty',
};

export const PortfolioSectionNode = memo(({ data, selected }: NodeProps) => {
  const d = data as PortfolioSectionNodeData;
  const opacity = d.status === 'complete' ? 1 : d.status === 'partial' ? 0.6 : 0.3;

  return (
    <div style={{ width: 252, ...nodeBox(selected) }}>
      <Handle type="target" position={Position.Top} style={handleStyle} />
      <Handle type="source" position={Position.Bottom} style={handleStyle} />

      {/* Thin top accent line — width varies by status */}
      <div style={{ height: 2, background: T.divider }}>
        <div style={{
          height: '100%',
          width: d.status === 'complete' ? '100%' : d.status === 'partial' ? '55%' : '15%',
          background: T.accent,
          opacity,
          transition: 'width 0.4s',
        }} />
      </div>

      <div className="px-3 py-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="text-xs mb-0.5 tabular-nums" style={{ color: T.textMuted }}>
              P.{d.pageNum}
            </div>
            <div className="text-sm font-medium" style={{ color: T.textPrimary }}>
              {d.title}
            </div>
          </div>
          <span className="text-xs rounded-md px-1.5 py-0.5 shrink-0"
            style={{ background: 'rgba(255,255,255,0.06)', color: T.textMuted }}>
            {STATUS_LABEL[d.status]}
          </span>
        </div>

        <p className="text-xs leading-relaxed line-clamp-3 mb-3" style={{ color: T.textSecond }}>
          {d.description}
        </p>

        <button
          className="nodrag flex items-center gap-1 text-xs transition-opacity hover:opacity-70"
          style={{ color: T.textMuted }}
          onClick={e => { e.stopPropagation(); d.onCopy?.(); }}
        >
          <Copy size={10} />
          Copy
        </button>
      </div>
    </div>
  );
});
PortfolioSectionNode.displayName = 'PortfolioSectionNode';

// ── Generate Node ─────────────────────────────────────────────────────────────
export type GenerateNodeData = {
  onGenerate: () => void;
  isGenerating: boolean;
  projectName: string;
};

export const GenerateNode = memo(({ data, selected }: NodeProps) => {
  const d = data as GenerateNodeData;
  return (
    <div style={{ width: 272, ...nodeBox(selected) }}>
      <Handle type="target" position={Position.Top} style={handleStyle} />

      <div className="p-6 text-center">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: T.accentDim }}>
          {d.isGenerating
            ? <Sparkles size={20} style={{ color: T.accent }} className="animate-pulse" />
            : <Star size={20} style={{ color: T.accent }} />}
        </div>
        <div className="text-sm font-semibold mb-1" style={{ color: T.textPrimary }}>
          {d.isGenerating ? 'Generating…' : 'Generate Portfolio'}
        </div>
        <p className="text-xs leading-relaxed mb-4" style={{ color: T.textMuted }}>
          {d.isGenerating
            ? 'AI is structuring your project…'
            : `Transform "${d.projectName}" into a structured portfolio`}
        </p>
        {!d.isGenerating ? (
          <button
            className="nodrag flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-medium mx-auto transition-all hover:opacity-80"
            style={{ background: T.accentDim, color: T.accent, border: `1px solid ${T.accentBorder}` }}
            onClick={e => { e.stopPropagation(); d.onGenerate(); }}
          >
            <Sparkles size={12} />
            Generate now
          </button>
        ) : (
          <div className="w-full h-px" style={{ background: T.divider }}>
            <div className="h-px animate-pulse" style={{ width: '65%', background: T.accent }} />
          </div>
        )}
      </div>
    </div>
  );
});
GenerateNode.displayName = 'GenerateNode';

// ── Export Node ───────────────────────────────────────────────────────────────
export type ExportNodeData = {
  totalPages: number;
  onExport?: () => void;
  toResume?: () => void;
};

export const ExportNode = memo(({ data, selected }: NodeProps) => {
  const d = data as ExportNodeData;
  return (
    <div style={{ width: 252, ...nodeBox(selected) }}>
      <Handle type="target" position={Position.Top} style={handleStyle} />

      <div style={{ background: T.headerBg, borderBottom: `1px solid ${T.divider}` }} className="px-4 py-3 flex items-center gap-2">
        <FileText size={12} style={{ color: T.accent }} />
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: T.textMuted }}>Export</span>
      </div>

      <div className="px-4 py-4">
        <div className="text-sm font-medium mb-1" style={{ color: T.textPrimary }}>
          {d.totalPages} pages ready
        </div>
        <div className="text-xs mb-4" style={{ color: T.textMuted }}>
          Portfolio structure is complete
        </div>
        <div className="flex gap-2">
          <button
            className="nodrag flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
            style={{ background: 'rgba(255,255,255,0.06)', color: T.textSecond }}
            onClick={e => { e.stopPropagation(); d.onExport?.(); }}
          >
            <ExternalLink size={11} />
            Export
          </button>
          <button
            className="nodrag flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all hover:opacity-80"
            style={{ background: T.accentDim, color: T.accent, border: `1px solid ${T.accentBorder}` }}
            onClick={e => { e.stopPropagation(); d.toResume?.(); }}
          >
            Resume →
          </button>
        </div>
      </div>
    </div>
  );
});
ExportNode.displayName = 'ExportNode';
