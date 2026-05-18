import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Send, ChevronRight, ChevronDown,
  X, ExternalLink, Bot, ImageIcon, Layers,
  Loader2, Sparkles, ArrowRight, FileText,
} from 'lucide-react';
import { useSettingsStore } from '../../store/useSettingsStore';
import {
  fetchAllNodes, getChildren, getNode, getBreadcrumb, generateAnswer,
  type KnowledgeNode, type AIAnswer, type CommunityPost,
} from '../../data/knowledge';

// ?? Design tokens ??????????????????????????????????????????????????????????????
const T = {
  bg:           '#f5f6fa',
  surface:      '#ffffff',
  surfaceHover: '#f3f4f6',
  border:       'rgba(0,0,0,0.07)',
  borderHover:  'rgba(0,0,0,0.13)',
  text:         '#111827',
  textSec:      '#6b7280',
  textMuted:    '#9ca3af',
  accent:       '#6366f1',
  accentDim:    'rgba(99,102,241,0.08)',
  accentBorder: 'rgba(99,102,241,0.25)',
  divider:      'rgba(0,0,0,0.05)',
  userBubble:   'rgba(99,102,241,0.08)',
};

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  answer?: AIAnswer;
  loading?: boolean;
}

// ?? Tree Node ??????????????????????????????????????????????????????????????????
function TreeItem({
  node, depth, nodes, selectedId, onSelect,
}: {
  node: KnowledgeNode; depth: number; nodes: KnowledgeNode[];
  selectedId: string | null; onSelect: (id: string) => void;
}) {
  const children = getChildren(nodes, node.id);
  const isBranch = node.type === 'branch';
  const [open, setOpen] = useState(depth < 2);
  const isSelected = selectedId === node.id;

  return (
    <div>
      <button
        onClick={() => { if (isBranch) setOpen(o => !o); else onSelect(node.id); }}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: 6,
          paddingLeft: 8 + depth * 16, paddingRight: 8,
          paddingTop: 7, paddingBottom: 7,
          borderRadius: 8, border: 'none', cursor: 'pointer',
          background: isSelected ? T.accentDim : 'transparent',
          color: isSelected ? T.accent : isBranch ? T.textSec : T.text,
          fontSize: isBranch ? 11 : 13,
          fontWeight: isBranch ? 700 : isSelected ? 600 : 400,
          textAlign: 'left', transition: 'all 0.15s',
          textTransform: isBranch ? 'uppercase' : 'none',
          letterSpacing: isBranch ? '0.06em' : 'normal',
        }}
        onMouseEnter={e => !isSelected && ((e.currentTarget as HTMLElement).style.background = T.surfaceHover)}
        onMouseLeave={e => !isSelected && ((e.currentTarget as HTMLElement).style.background = 'transparent')}
      >
        {isBranch
          ? (open ? <ChevronDown size={13} style={{ flexShrink: 0 }} /> : <ChevronRight size={13} style={{ flexShrink: 0 }} />)
          : <span style={{ width: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: isSelected ? T.accent : T.textMuted, display: 'block' }} />
            </span>
        }
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {node.title_zh}
        </span>
      </button>
      {isBranch && open && children.length > 0 && (
        <div>
          {children.map(child => (
            <TreeItem key={child.id} node={child} depth={depth + 1} nodes={nodes} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

// ?? Knowledge node card (inside chat) ?????????????????????????????????????????
function NodeCard({ node, onClick, isEn }: { node: KnowledgeNode; onClick: () => void; isEn: boolean }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        background: hovered ? T.surfaceHover : T.surface,
        border: `1px solid ${hovered ? T.accentBorder : T.border}`,
        borderRadius: 10, padding: '10px 14px',
        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
        minWidth: 180,
      }}
    >
      <FileText size={14} color={T.accent} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, fontSize: 13, fontWeight: 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {isEn && node.title_en ? node.title_en : node.title_zh}
      </span>
      <ArrowRight size={12} color={T.textMuted} style={{ flexShrink: 0 }} />
    </button>
  );
}

// ?? Star rating ???????????????????????????????????????????????????????????????
function StarRating({ score, max = 5, color = T.accent }: { score: number; max?: number; color?: string }) {
  const filled = Math.round(score);
  return (
    <span style={{ display: 'inline-flex', gap: 2 }}>
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} style={{ fontSize: 10, color: i < filled ? color : T.textMuted, lineHeight: 1 }}>?</span>
      ))}
    </span>
  );
}

function calcHeat(post: CommunityPost): number {
  const score = post.like_count + post.comment_count * 2 + post.view_count / 80;
  if (score > 200) return 5;
  if (score > 120) return 4;
  if (score > 60)  return 3;
  if (score > 25)  return 2;
  return 1;
}

function calcReco(post: CommunityPost): number {
  let score = 2;
  if (post.is_official)    score += 2;
  if (post.is_solved)      score += 1;
  if (post.has_ai_summary) score += 1;
  if (post.like_count > 80) score += 1;
  return Math.min(score, 5);
}

const BOARD_LABEL: Record<string, string> = {
  'learning-path':    '????',
  'project-help':     '????',
  'portfolio-review': '?????',
  'engineering-exp':  '????',
  'jobs':             '????',
  'tools-resources':  '????',
  'ai-workflow':      'AI ???',
  'announcements':    '??',
};

// ?? Post card?in chat results?????????????????????????????????????????????????
function PostCard({ post, onClick }: { post: CommunityPost; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  const heat = calcHeat(post);
  const reco = calcReco(post);

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', flexDirection: 'column', gap: 8,
        background: hovered ? T.surfaceHover : T.surface,
        border: `1px solid ${hovered ? T.borderHover : T.border}`,
        borderRadius: 12, padding: '12px 16px',
        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
        width: '100%',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: T.accent, background: T.accentDim, border: `1px solid ${T.accentBorder}`, borderRadius: 6, padding: '2px 8px' }}>
          {BOARD_LABEL[post.board_id] ?? post.board_id}
        </span>
        {post.is_official && <span style={{ fontSize: 10, color: '#f59e0b', background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>??</span>}
        {post.is_solved   && <span style={{ fontSize: 10, color: '#10b981', background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 6, padding: '2px 8px', fontWeight: 700 }}>???</span>}
      </div>

      {/* Title */}
      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, lineHeight: 1.4 }}>
        {post.title}
      </div>

      {/* AI summary if available */}
      {post.ai_summary && (
        <div style={{ fontSize: 12, color: T.textMuted, lineHeight: 1.5, borderLeft: `2px solid ${T.accentBorder}`, paddingLeft: 8 }}>
          {post.ai_summary.slice(0, 80)}??        </div>
      )}

      {/* Bottom: stats + stars */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: T.textMuted }}>
          ?? {post.like_count} ? ?? {post.comment_count} ? ?? {post.view_count}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: T.textMuted }}>
            ?? <StarRating score={heat} color="#f97316" />
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: T.textMuted }}>
            ?? <StarRating score={reco} color={T.accent} />
          </span>
        </div>
      </div>
    </button>
  );
}

// ?? Simple markdown renderer ???????????????????????????????????????????????????
function MarkdownText({ text }: { text: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {text.split('\n').map((line, i) => {
        if (line.startsWith('## ')) return (
          <h3 key={i} style={{ fontSize: 15, fontWeight: 700, color: T.text, margin: '14px 0 6px', paddingBottom: 6, borderBottom: `1px solid ${T.divider}` }}>{line.slice(3)}</h3>
        );
        if (line.startsWith('### ')) return (
          <h4 key={i} style={{ fontSize: 13, fontWeight: 700, color: T.accent, margin: '10px 0 4px' }}>{line.slice(4)}</h4>
        );
        if (line.startsWith('- ') || line.startsWith('? ')) return (
          <div key={i} style={{ display: 'flex', gap: 8, margin: '2px 0' }}>
            <span style={{ color: T.accent, flexShrink: 0, marginTop: 2 }}>?</span>
            <span style={{ fontSize: 14, color: T.textSec, lineHeight: 1.7 }}>{renderInline(line.slice(2))}</span>
          </div>
        );
        if (line === '---') return <hr key={i} style={{ border: 'none', borderTop: `1px solid ${T.divider}`, margin: '10px 0' }} />;
        if (line === '') return <div key={i} style={{ height: 6 }} />;
        return <p key={i} style={{ margin: 0, fontSize: 14, color: T.textSec, lineHeight: 1.8 }}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return parts.map((p, i) =>
    p.startsWith('**') && p.endsWith('**')
      ? <strong key={i} style={{ color: T.text, fontWeight: 600 }}>{p.slice(2, -2)}</strong>
      : p
  );
}

// ?? Chat Message ???????????????????????????????????????????????????????????????
function ChatMsg({ msg, isEn, onNodeClick, onSend, onPostClick }: {
  msg: ChatMessage; isEn: boolean; onNodeClick: (id: string) => void;
  onSend: (q: string) => void; onPostClick: (postId: string) => void;
}) {
  const isUser = msg.role === 'user';

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
        <div style={{
          maxWidth: '70%', background: T.userBubble,
          border: `1px solid ${T.accentBorder}`,
          borderRadius: '16px 16px 4px 16px',
          padding: '12px 16px', fontSize: 14, color: T.text, lineHeight: 1.6,
        }}>
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 28, alignItems: 'flex-start' }}>
      {/* AI Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: 10, flexShrink: 0,
        background: T.accentDim, border: `1px solid ${T.accentBorder}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginTop: 2,
      }}>
        {msg.loading
          ? <Loader2 size={14} color={T.accent} style={{ animation: 'spin 1s linear infinite' }} />
          : <Sparkles size={14} color={T.accent} />
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Loading state */}
        {msg.loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: T.textMuted, fontSize: 13 }}>
            <span>{isEn ? 'Reading knowledge base and thinking...' : '?????????????'}</span>
          </div>
        )}

        {/* AI answer text */}
        {!msg.loading && msg.content && (
          <div style={{
            background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: '4px 16px 16px 16px',
            padding: '14px 18px', marginBottom: 12,
          }}>
            <MarkdownText text={msg.content} />
          </div>
        )}

        {/* Related knowledge nodes */}
        {!msg.loading && msg.answer && msg.answer.relatedNodes.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
              {isEn ? 'Related Knowledge' : '????'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {msg.answer.relatedNodes.map(n => (
                <NodeCard key={n.id} node={n} isEn={isEn} onClick={() => onNodeClick(n.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Related community posts */}
        {!msg.loading && msg.answer && msg.answer.relatedPosts && msg.answer.relatedPosts.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
              {isEn ? 'Community Discussions' : '??????'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {msg.answer.relatedPosts.map(p => (
                <PostCard key={p.id} post={p} onClick={() => onPostClick(p.id)} />
              ))}
            </div>
          </div>
        )}

        {/* Recommendations */}
        {!msg.loading && msg.answer && msg.answer.recommendations.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>
              {isEn ? 'You might also ask' : '??????'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {msg.answer.recommendations.map((q, i) => (
                <RecoChip key={i} text={q} onClick={() => onSend(q)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RecoChip({ text, onClick }: { text: string; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: hovered ? T.surfaceHover : 'transparent',
        border: `1px solid ${hovered ? T.accentBorder : T.border}`,
        borderRadius: 8, padding: '7px 12px',
        cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
        fontSize: 13, color: hovered ? T.text : T.textSec,
      }}
    >
      <ArrowRight size={11} color={T.accent} style={{ flexShrink: 0 }} />
      {text}
    </button>
  );
}

// ?? Node viewer drawer (right side) ???????????????????????????????????????????
function NodeDrawer({ node, nodes, isEn, onClose }: {
  node: KnowledgeNode; nodes: KnowledgeNode[]; isEn: boolean; onClose: () => void;
}) {
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const breadcrumb = getBreadcrumb(nodes, node.id);
  const title   = isEn && node.title_en   ? node.title_en   : node.title_zh;
  const content = isEn && node.content_en ? node.content_en : node.content_zh;

  const LEVEL_COLOR: Record<string, string> = { beginner: '#10b981', intermediate: '#f59e0b', advanced: '#ef4444' };
  const LEVEL_LABEL: Record<string, [string, string]> = { beginner: ['??', 'Beginner'], intermediate: ['??', 'Intermediate'], advanced: ['??', 'Advanced'] };
  const levelColor = LEVEL_COLOR[node.level] ?? '#10b981';
  const levelLabel = (isEn ? LEVEL_LABEL[node.level]?.[1] : LEVEL_LABEL[node.level]?.[0]) ?? node.level;

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      style={{
        position: 'absolute', top: 0, right: 0, bottom: 0,
        width: 480, background: T.surface,
        borderLeft: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column',
        zIndex: 20, overflowY: 'auto',
      }}
    >
      {/* Drawer header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.textMuted, flexWrap: 'wrap' }}>
            {breadcrumb.slice(0, -1).map((n, i) => (
              <span key={n.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {i > 0 && <ChevronRight size={11} />}
                {n.title_zh}
              </span>
            ))}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4 }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, color: levelColor, background: `${levelColor}18`, border: `1px solid ${levelColor}30` }}>
            {levelLabel}
          </span>
          {node.domains.map(d => (
            <span key={d} style={{ fontSize: 11, color: T.accent, background: T.accentDim, border: `1px solid ${T.accentBorder}`, borderRadius: 99, padding: '3px 9px' }}>{d}</span>
          ))}
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: '0 0 8px', lineHeight: 1.3 }}>{title}</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {node.tags.map(tag => (
            <span key={tag} style={{ fontSize: 11, color: T.textSec, background: T.surfaceHover, border: `1px solid ${T.border}`, borderRadius: 6, padding: '2px 8px' }}>#{tag}</span>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
        {content && <MarkdownText text={content} />}

        {/* Images */}
        {node.images && node.images.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <ImageIcon size={13} color={T.accent} />
              <span style={{ fontSize: 12, fontWeight: 600, color: T.textSec }}>{isEn ? 'Reference Images' : '????'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: node.images.length === 1 ? '1fr' : 'repeat(2, 1fr)', gap: 10 }}>
              {node.images.map((img, i) => (
                <div key={i} onClick={() => setLightboxImg(img.url)} style={{ cursor: 'pointer', borderRadius: 8, overflow: 'hidden', border: `1px solid ${T.border}` }}>
                  <img src={img.url} alt={isEn ? img.caption_en : img.caption_zh} style={{ width: '100%', display: 'block', objectFit: 'cover' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                  <div style={{ padding: '6px 10px', fontSize: 11, color: T.textMuted, background: T.surface }}>{isEn ? img.caption_en : img.caption_zh}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI scenarios */}
        {node.ai_scenarios && node.ai_scenarios.length > 0 && (
          <div style={{ marginTop: 20, background: T.accentDim, border: `1px solid ${T.accentBorder}`, borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Bot size={13} color={T.accent} />
              <span style={{ fontSize: 12, fontWeight: 600, color: T.accent }}>{isEn ? 'AI Use Cases' : 'AI ?????'}</span>
            </div>
            {node.ai_scenarios.map((s, i) => (
              <div key={i} style={{ fontSize: 13, color: T.textSec, lineHeight: 1.6, paddingLeft: 10, borderLeft: `2px solid ${T.accentBorder}`, marginBottom: 6 }}>{s}</div>
            ))}
          </div>
        )}

        {/* References */}
        {node.references && node.references.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <ExternalLink size={13} color={T.textSec} />
              <span style={{ fontSize: 12, fontWeight: 600, color: T.textSec }}>{isEn ? 'References' : '????'}</span>
            </div>
            {node.references.map((ref, i) => (
              <a key={i} href={ref.url} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: T.accent, textDecoration: 'none', marginBottom: 4 }}
                onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
              >
                <ExternalLink size={11} /> {ref.label}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxImg && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setLightboxImg(null)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.9)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 24 }}
          >
            <button onClick={() => setLightboxImg(null)} style={{ position: 'absolute', top: 20, right: 20, background: 'rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.10)', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', color: T.textSec, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={18} />
            </button>
            <img src={lightboxImg} style={{ maxWidth: '90vw', maxHeight: '85vh', borderRadius: 12, objectFit: 'contain' }} onClick={e => e.stopPropagation()} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ?? Welcome / Empty state ??????????????????????????????????????????????????????
function WelcomeState({ isEn, onSuggest }: { isEn: boolean; onSuggest: (q: string) => void }) {
  const suggestions = isEn
    ? ['How to visualize skill levels?', 'How to use morphological matrix in concept design?', 'What tools can help with competitor analysis?']
    : ['????????????', '????????????????', '?????????????'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '40px 32px' }}>
      <div style={{ width: 60, height: 60, borderRadius: 18, background: T.accentDim, border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
        <Layers size={26} color={T.accent} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 8 }}>
        {isEn ? 'Design Engineering Knowledge Assistant' : '????????'}
      </div>
      <div style={{ fontSize: 14, color: T.textSec, textAlign: 'center', maxWidth: 400, lineHeight: 1.7, marginBottom: 32 }}>
        {isEn
          ? 'Ask anything about design methods, tools, portfolio, or projects. I\'ll answer based on your knowledge base.'
          : '????????????????????????????????????'}
      </div>
      <div style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.textMuted, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10 }}>
          {isEn ? 'Try asking' : '????'}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {suggestions.map((q, i) => (
            <button key={i} onClick={() => onSuggest(q)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: T.surface, border: `1px solid ${T.border}`,
                borderRadius: 10, padding: '12px 16px',
                cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s',
                fontSize: 14, color: T.textSec,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = T.accentBorder; (e.currentTarget as HTMLElement).style.color = T.text; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = T.border; (e.currentTarget as HTMLElement).style.color = T.textSec; }}
            >
              <ArrowRight size={13} color={T.accent} style={{ flexShrink: 0 }} />
              {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ?? Main Page ??????????????????????????????????????????????????????????????????
export default function KnowledgeBasePage() {
  const { language } = useSettingsStore();
  const isEn = language === 'en-US';
  const navigate = useNavigate();

  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [drawerNodeId, setDrawerNodeId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchAllNodes().then(data => { setNodes(data); setLoading(false); });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const rootChildren = getChildren(nodes, 'root');
  const drawerNode = drawerNodeId ? getNode(nodes, drawerNodeId) : null;

  const sendMessage = async (query: string) => {
    const q = query.trim();
    if (!q || isGenerating) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', content: q };
    const aiMsgId = (Date.now() + 1).toString();
    const aiPlaceholder: ChatMessage = { id: aiMsgId, role: 'assistant', content: '', loading: true };

    setMessages(prev => [...prev, userMsg, aiPlaceholder]);
    setInputValue('');
    setIsGenerating(true);

    try {
      const answer = await generateAnswer(q, isEn ? 'en' : 'zh');
      setMessages(prev => prev.map(m =>
        m.id === aiMsgId
          ? { ...m, content: answer.text, answer, loading: false }
          : m
      ));
    } catch (e) {
      setMessages(prev => prev.map(m =>
        m.id === aiMsgId
          ? { ...m, content: isEn ? 'Failed to generate answer. Please try again.' : '???????????', loading: false, answer: { text: '', relatedNodes: [], relatedPosts: [], recommendations: [] } }
          : m
      ));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(inputValue);
    }
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, color: T.text }}>

      {/* Header */}
      <div style={{ padding: '18px 28px', borderBottom: `1px solid ${T.border}`, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
        <BookOpen size={18} color={T.accent} />
        <h1 style={{ fontSize: 18, fontWeight: 700, color: T.text, margin: 0 }}>
          {isEn ? 'Knowledge Base' : '???'}
        </h1>
        <span style={{ fontSize: 11, color: T.textMuted, background: T.surfaceHover, border: `1px solid ${T.border}`, borderRadius: 99, padding: '2px 9px' }}>
          {isEn ? `${nodes.filter(n => n.type !== 'branch').length} entries` : `${nodes.filter(n => n.type !== 'branch').length} ???`}
        </span>
        {loading && <Loader2 size={14} color={T.accent} style={{ animation: 'spin 1s linear infinite', marginLeft: 'auto' }} />}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', position: 'relative' }}>

        {/* Left: Knowledge Tree */}
        <div style={{ width: 220, flexShrink: 0, borderRight: `1px solid ${T.border}`, padding: '12px 8px', overflowY: 'auto' }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.textMuted, letterSpacing: '0.08em', padding: '4px 8px 10px', textTransform: 'uppercase' }}>
            {isEn ? 'Browse' : '?????'}
          </div>
          {rootChildren.map(node => (
            <TreeItem key={node.id} node={node} depth={0} nodes={nodes} selectedId={drawerNodeId} onSelect={id => setDrawerNodeId(id)} />
          ))}
        </div>

        {/* Center: Chat */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
            {messages.length === 0
              ? <WelcomeState isEn={isEn} onSuggest={q => { setInputValue(q); setTimeout(() => sendMessage(q), 50); }} />
              : messages.map(msg => (
                  <ChatMsg
                    key={msg.id} msg={msg} isEn={isEn}
                    onNodeClick={id => setDrawerNodeId(id)}
                    onSend={sendMessage}
                    onPostClick={postId => navigate('/community', { state: { openPostId: postId } })}
                  />
                ))
            }
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '16px 28px 20px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
            <div style={{
              display: 'flex', alignItems: 'flex-end', gap: 10,
              background: T.surfaceHover,
              border: `1px solid ${isGenerating ? T.accentBorder : T.border}`,
              borderRadius: 14, padding: '10px 14px',
              transition: 'border-color 0.2s',
            }}>
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={isEn ? 'Ask anything about design knowledge... (Enter to send)' : '?????AI ????????????Enter ???'}
                rows={1}
                style={{
                  flex: 1, background: 'none', border: 'none', outline: 'none',
                  color: T.text, fontSize: 14, resize: 'none',
                  lineHeight: 1.6, maxHeight: 120, overflowY: 'auto',
                  fontFamily: 'inherit',
                }}
                onInput={e => {
                  const el = e.currentTarget;
                  el.style.height = 'auto';
                  el.style.height = `${el.scrollHeight}px`;
                }}
              />
              <button
                onClick={() => sendMessage(inputValue)}
                disabled={!inputValue.trim() || isGenerating}
                style={{
                  width: 34, height: 34, borderRadius: 10, border: 'none', flexShrink: 0,
                  background: inputValue.trim() && !isGenerating ? T.accent : T.border,
                  cursor: inputValue.trim() && !isGenerating ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                {isGenerating
                  ? <Loader2 size={15} color="white" style={{ animation: 'spin 1s linear infinite' }} />
                  : <Send size={15} color={inputValue.trim() ? 'white' : T.textMuted} />
                }
              </button>
            </div>
            <div style={{ fontSize: 11, color: T.textMuted, marginTop: 8, textAlign: 'center' }}>
              {isEn ? 'AI answers are generated based on the Craflo knowledge base' : 'AI ???? Craflo ???????'}
            </div>
          </div>
        </div>

        {/* Right: Node Drawer */}
        <AnimatePresence>
          {drawerNode && drawerNode.type !== 'branch' && (
            <NodeDrawer node={drawerNode} nodes={nodes} isEn={isEn} onClose={() => setDrawerNodeId(null)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
