import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Search, Plus, ArrowLeft, Heart, MessageCircle,
  Eye, Bookmark, Share2, Flag, BadgeCheck, Pin, Bot,
  Send, X, Tag, Hash, TrendingUp,
} from 'lucide-react';
import { useT } from '../../hooks/useT';
import {
  BOARDS, HOT_TAGS, MOCK_POSTS,
  type Post, type Comment, type BoardId,
} from './mockData';

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
  solved:       '#10b981',
  solvedDim:    'rgba(16,185,129,0.10)',
  official:     '#f59e0b',
  officialDim:  'rgba(245,158,11,0.10)',
};

// ?? Helpers ????????????????????????????????????????????????????????????????????
function Avatar({ initial, size = 32 }: { initial: string; size?: number }) {
  return (
    <div
      style={{
        width: size, height: size,
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${T.accent} 0%, #8b5cf6 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.4, fontWeight: 700, color: '#fff',
        flexShrink: 0,
      }}
    >
      {initial}
    </div>
  );
}

function Badge({ children, color = T.accent, bg = T.accentDim }: {
  children: React.ReactNode; color?: string; bg?: string;
}) {
  return (
    <span style={{
      fontSize: 11, fontWeight: 600,
      padding: '2px 8px', borderRadius: 99,
      color, background: bg,
      border: `1px solid ${color}30`,
      whiteSpace: 'nowrap',
    }}>
      {children}
    </span>
  );
}

// ?? Post Card ??????????????????????????????????????????????????????????????????
function PostCard({
  post, boardLabel, onClick, onLike, onBookmark,
}: {
  post: Post;
  boardLabel: string;
  onClick: () => void;
  onLike: () => void;
  onBookmark: () => void;
}) {
  const tc = useT().community;
  const [hovered, setHovered] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? T.surfaceHover : T.surface,
        border: `1px solid ${hovered ? T.borderHover : T.border}`,
        borderRadius: 16,
        padding: '18px 20px',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Pinned accent line */}
      {post.isPinned && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 2, background: T.accent, borderRadius: '16px 16px 0 0',
        }} />
      )}

      {/* Top row: board + badges + time */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 12, color: T.accent, fontWeight: 600 }}>{boardLabel}</span>
        {post.isPinned && (
          <Badge><Pin size={10} style={{ display: 'inline', marginRight: 2 }} />{tc.pinned}</Badge>
        )}
        {post.isOfficial && (
          <Badge color={T.official} bg={T.officialDim}>
            <BadgeCheck size={10} style={{ display: 'inline', marginRight: 2 }} />{tc.official}
          </Badge>
        )}
        {post.isSolved && (
          <Badge color={T.solved} bg={T.solvedDim}>{tc.solved}</Badge>
        )}
        {post.hasAISummary && (
          <Badge>
            <Bot size={10} style={{ display: 'inline', marginRight: 2 }} />AI
          </Badge>
        )}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: T.textMuted }}>{post.createdAt}</span>
      </div>

      {/* Title */}
      <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 8, lineHeight: 1.4 }}>
        {post.title}
      </div>

      {/* Content preview */}
      <div style={{
        fontSize: 13, color: T.textSec, lineHeight: 1.6,
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        overflow: 'hidden', marginBottom: 12,
      }}>
        {post.content}
      </div>

      {/* Tags */}
      {post.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {post.tags.slice(0, 4).map(tag => (
            <span
              key={tag}
              onClick={e => e.stopPropagation()}
              style={{
                fontSize: 11, color: T.textSec,
                background: 'rgba(0,0,0,0.05)',
                border: `1px solid ${T.border}`,
                borderRadius: 6, padding: '2px 8px',
              }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}

      {/* Bottom row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Avatar initial={post.avatarInitial} size={22} />
          <span style={{ fontSize: 12, color: T.textSec }}>
            {post.isAnonymous ? '????' : post.author}
          </span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 14 }}>
          <StatItem
            icon={<Heart size={13} fill={post.isLiked ? T.accent : 'none'} />}
            count={post.likes}
            active={post.isLiked}
            onClick={e => { e.stopPropagation(); onLike(); }}
          />
          <StatItem icon={<MessageCircle size={13} />} count={post.comments} />
          <StatItem icon={<Eye size={13} />} count={post.views} />
          <button
            onClick={e => { e.stopPropagation(); onBookmark(); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: post.isBookmarked ? T.accent : T.textMuted }}
          >
            <Bookmark size={13} fill={post.isBookmarked ? T.accent : 'none'} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function StatItem({ icon, count, active, onClick }: {
  icon: React.ReactNode; count: number; active?: boolean; onClick?: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 4,
        fontSize: 12, color: active ? T.accent : T.textMuted,
        background: 'none', border: 'none', cursor: onClick ? 'pointer' : 'default', padding: 0,
      }}
    >
      {icon}
      <span>{count}</span>
    </button>
  );
}

// ?? Post Detail ????????????????????????????????????????????????????????????????
function PostDetail({
  post, boardLabel, onBack, onLike, onBookmark,
}: {
  post: Post; boardLabel: string;
  onBack: () => void; onLike: () => void; onBookmark: () => void;
}) {
  const tc = useT().community;
  const [replyText, setReplyText] = useState('');
  const [likedComments, setLikedComments] = useState<Set<string>>(new Set());

  const toggleCommentLike = (cid: string) => {
    setLikedComments(prev => {
      const next = new Set(prev);
      next.has(cid) ? next.delete(cid) : next.add(cid);
      return next;
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
      style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
    >
      {/* Back button */}
      <button
        onClick={onBack}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          color: T.textSec, background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 13, padding: '6px 0', width: 'fit-content',
        }}
      >
        <ArrowLeft size={15} /> {tc.backToList}
      </button>

      {/* Post body */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: '24px 28px',
      }}>
        {/* Board + badges */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
          <span style={{ fontSize: 12, color: T.accent, fontWeight: 600 }}>{boardLabel}</span>
          {post.isSolved && <Badge color={T.solved} bg={T.solvedDim}>{tc.solved}</Badge>}
          {post.isOfficial && <Badge color={T.official} bg={T.officialDim}>{tc.official}</Badge>}
          <span style={{ marginLeft: 'auto', fontSize: 12, color: T.textMuted }}>{post.createdAt}</span>
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, marginBottom: 16, lineHeight: 1.4 }}>
          {post.title}
        </h1>

        {/* Author */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Avatar initial={post.avatarInitial} size={32} />
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>
              {post.isAnonymous ? '????' : post.author}
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{
          fontSize: 14, color: T.textSec, lineHeight: 1.8, whiteSpace: 'pre-wrap',
          borderBottom: `1px solid ${T.border}`, paddingBottom: 20, marginBottom: 20,
        }}>
          {post.content}
        </div>

        {/* Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
          {post.tags.map(tag => (
            <span
              key={tag}
              style={{
                fontSize: 11, color: T.textSec,
                background: 'rgba(0,0,0,0.05)',
                border: `1px solid ${T.border}`,
                borderRadius: 6, padding: '3px 10px',
              }}
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Action bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <ActionBtn
            icon={<Heart size={15} fill={post.isLiked ? T.accent : 'none'} />}
            label={`${tc.like} ${post.likes}`}
            active={post.isLiked}
            onClick={onLike}
          />
          <ActionBtn icon={<MessageCircle size={15} />} label={`${tc.comment} ${post.comments}`} />
          <ActionBtn icon={<Eye size={15} />} label={`${tc.views} ${post.views}`} />
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            <ActionBtn
              icon={<Bookmark size={15} fill={post.isBookmarked ? T.accent : 'none'} />}
              label={tc.bookmark}
              active={post.isBookmarked}
              onClick={onBookmark}
            />
            <ActionBtn icon={<Share2 size={15} />} label={tc.share} />
            <ActionBtn icon={<Flag size={15} />} label={tc.report} />
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {post.hasAISummary && post.aiSummary && (
        <div style={{
          background: T.accentDim, border: `1px solid ${T.accentBorder}`,
          borderRadius: 16, padding: '16px 20px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Bot size={15} color={T.accent} />
            <span style={{ fontSize: 13, fontWeight: 600, color: T.accent }}>{tc.aiSummary}</span>
          </div>
          <p style={{ fontSize: 13, color: T.textSec, lineHeight: 1.7, margin: 0 }}>
            {post.aiSummary}
          </p>
        </div>
      )}

      {/* Comments */}
      <div style={{
        background: T.surface, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: '20px 24px',
      }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 16 }}>
          {tc.comment}?{post.commentList?.length ?? 0}?
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {(post.commentList ?? []).map((comment, idx) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              tc={tc}
              isLiked={likedComments.has(comment.id)}
              onLike={() => toggleCommentLike(comment.id)}
              isLast={idx === (post.commentList?.length ?? 0) - 1}
            />
          ))}
        </div>

        {/* Reply input */}
        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <Avatar initial="?" size={32} />
          <div style={{
            flex: 1, display: 'flex', alignItems: 'flex-end', gap: 10,
            background: 'rgba(0,0,0,0.04)', border: `1px solid ${T.border}`,
            borderRadius: 12, padding: '10px 14px',
          }}>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder={tc.replyPlaceholder}
              rows={2}
              style={{
                flex: 1, background: 'none', border: 'none', outline: 'none',
                color: T.text, fontSize: 13, resize: 'none', lineHeight: 1.6,
              }}
            />
            <button
              disabled={!replyText.trim()}
              style={{
                background: replyText.trim() ? T.accent : 'rgba(0,0,0,0.07)',
                color: replyText.trim() ? '#fff' : T.textMuted,
                border: 'none', borderRadius: 8, padding: '6px 14px',
                fontSize: 12, fontWeight: 600, cursor: replyText.trim() ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
                transition: 'all 0.15s',
              }}
            >
              <Send size={12} /> {tc.submitReply}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function ActionBtn({ icon, label, active, onClick }: {
  icon: React.ReactNode; label: string; active?: boolean; onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 5,
        fontSize: 12, color: active ? T.accent : T.textSec,
        background: 'none', border: 'none', cursor: onClick ? 'pointer' : 'default',
        padding: '5px 10px', borderRadius: 8,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => onClick && (e.currentTarget.style.background = 'rgba(0,0,0,0.05)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {icon} {label}
    </button>
  );
}

function CommentItem({ comment, tc, isLiked, onLike, isLast }: {
  comment: Comment; tc: ReturnType<typeof useT>['community'];
  isLiked: boolean; onLike: () => void; isLast: boolean;
}) {
  return (
    <div style={{
      paddingTop: 16, paddingBottom: 16,
      borderBottom: isLast ? 'none' : `1px solid ${T.border}`,
      position: 'relative',
    }}>
      {comment.isBestAnswer && (
        <div style={{
          position: 'absolute', top: 10, right: 0,
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 11, fontWeight: 700,
          color: T.solved, background: T.solvedDim,
          border: `1px solid ${T.solved}30`,
          borderRadius: 8, padding: '3px 10px',
        }}>
          <BadgeCheck size={11} /> {tc.bestAnswer}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <Avatar initial={comment.avatarInitial} size={30} />
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{comment.author}</span>
            <span style={{ fontSize: 12, color: T.textMuted }}>{comment.createdAt}</span>
          </div>
          <div style={{ fontSize: 13, color: T.textSec, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {comment.content}
          </div>
          <button
            onClick={onLike}
            style={{
              marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 4,
              fontSize: 12, color: isLiked ? T.accent : T.textMuted,
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0',
            }}
          >
            <Heart size={12} fill={isLiked ? T.accent : 'none'} />
            {comment.likes + (isLiked ? 1 : 0)}
          </button>
        </div>
      </div>
    </div>
  );
}

// ?? Create Post Modal ??????????????????????????????????????????????????????????
function CreatePostModal({ onClose, tc }: {
  onClose: () => void;
  tc: ReturnType<typeof useT>['community'];
}) {
  const [board, setBoard] = useState<BoardId>('project-help');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [anonymous, setAnonymous] = useState(false);
  const [allowAI, setAllowAI] = useState(true);

  const addTag = () => {
    const t = tagInput.trim().replace(/^#/, '');
    if (t && !tags.includes(t) && tags.length < 5) {
      setTags([...tags, t]);
      setTagInput('');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 200, padding: 24,
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        style={{
          background: T.surface, border: `1px solid ${T.border}`,
          borderRadius: 20, padding: '28px 32px',
          width: '100%', maxWidth: 640,
          maxHeight: '88vh', overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{tc.postForm.title}</div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted, padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Board selection */}
        <FormSection label={tc.postForm.boardLabel}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {BOARDS.map(b => (
              <button
                key={b.id}
                onClick={() => setBoard(b.id)}
                style={{
                  padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                  border: `1px solid ${board === b.id ? T.accent : T.border}`,
                  background: board === b.id ? T.accentDim : 'transparent',
                  color: board === b.id ? T.accent : T.textSec,
                  cursor: 'pointer', transition: 'all 0.15s',
                }}
              >
                {b.emoji} {tc.boards[b.id]}
              </button>
            ))}
          </div>
        </FormSection>

        {/* Title */}
        <FormSection label={tc.postForm.titleLabel}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={tc.postForm.titlePlaceholder}
            maxLength={100}
            style={inputStyle}
          />
        </FormSection>

        {/* Content */}
        <FormSection label={tc.postForm.contentLabel}>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={tc.postForm.contentPlaceholder}
            rows={7}
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.7 }}
          />
        </FormSection>

        {/* Tags */}
        <FormSection label={tc.postForm.tagsLabel}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {tags.map(tag => (
              <span
                key={tag}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  fontSize: 12, color: T.accent, background: T.accentDim,
                  border: `1px solid ${T.accentBorder}`, borderRadius: 8, padding: '3px 10px',
                }}
              >
                #{tag}
                <X size={10} style={{ cursor: 'pointer' }} onClick={() => setTags(tags.filter(t => t !== tag))} />
              </span>
            ))}
          </div>
          {tags.length < 5 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder={tc.postForm.tagsPlaceholder}
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={addTag}
                style={{
                  background: T.accentDim, border: `1px solid ${T.accentBorder}`,
                  color: T.accent, borderRadius: 10, padding: '0 14px', cursor: 'pointer', fontSize: 13,
                }}
              >
                <Tag size={13} />
              </button>
            </div>
          )}
        </FormSection>

        {/* Privacy */}
        <FormSection label={tc.postForm.privacyLabel}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <ToggleRow
              label={tc.postForm.anonymousLabel}
              value={anonymous}
              onChange={setAnonymous}
            />
            <ToggleRow
              label={tc.postForm.allowAILabel}
              value={allowAI}
              onChange={setAllowAI}
            />
          </div>
        </FormSection>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={onClose} style={btnSecondaryStyle}>{tc.postForm.cancel}</button>
          <button
            disabled={!title.trim() || !content.trim()}
            style={{
              ...btnPrimaryStyle,
              opacity: (!title.trim() || !content.trim()) ? 0.5 : 1,
              cursor: (!title.trim() || !content.trim()) ? 'not-allowed' : 'pointer',
            }}
          >
            {tc.postForm.submit}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function FormSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: T.textSec, marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function ToggleRow({ label, value, onChange }: {
  label: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div
      onClick={() => onChange(!value)}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
    >
      <span style={{ fontSize: 13, color: T.textSec }}>{label}</span>
      <div style={{
        width: 36, height: 20, borderRadius: 10,
        background: value ? T.accent : 'rgba(0,0,0,0.09)',
        position: 'relative', transition: 'background 0.2s',
      }}>
        <div style={{
          width: 14, height: 14, borderRadius: '50%', background: '#fff',
          position: 'absolute', top: 3,
          left: value ? 18 : 3,
          transition: 'left 0.2s',
        }} />
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'rgba(0,0,0,0.04)',
  border: `1px solid ${T.border}`, borderRadius: 10,
  padding: '10px 14px', color: T.text, fontSize: 13,
  outline: 'none', boxSizing: 'border-box',
  fontFamily: 'inherit',
};

const btnPrimaryStyle: React.CSSProperties = {
  background: T.accent, color: '#fff', border: 'none',
  borderRadius: 10, padding: '10px 22px', fontSize: 13,
  fontWeight: 600, cursor: 'pointer',
};

const btnSecondaryStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.06)', color: T.textSec,
  border: `1px solid ${T.border}`, borderRadius: 10,
  padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
};

// ?? Main Community Page ????????????????????????????????????????????????????????
export default function CommunityPage() {
  const tc = useT().community;

  const [selectedBoard, setSelectedBoard] = useState<BoardId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [posts, setPosts] = useState<Post[]>(MOCK_POSTS);

  const getBoardLabel = (bid: BoardId) => tc.boards[bid] ?? bid;

  const filteredPosts = useMemo(() => {
    let result = posts;
    if (selectedBoard !== 'all') {
      result = result.filter(p => p.board === selectedBoard);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        p => p.title.toLowerCase().includes(q) ||
             p.content.toLowerCase().includes(q) ||
             p.tags.some(t => t.toLowerCase().includes(q))
      );
    }
    // Pinned posts first
    return [...result.filter(p => p.isPinned), ...result.filter(p => !p.isPinned)];
  }, [posts, selectedBoard, searchQuery]);

  const toggleLike = (postId: string) => {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, isLiked: !p.isLiked, likes: p.likes + (p.isLiked ? -1 : 1) } : p
    ));
    if (selectedPost?.id === postId) {
      setSelectedPost(prev => prev ? { ...prev, isLiked: !prev.isLiked, likes: prev.likes + (prev.isLiked ? -1 : 1) } : prev);
    }
  };

  const toggleBookmark = (postId: string) => {
    setPosts(prev => prev.map(p =>
      p.id === postId ? { ...p, isBookmarked: !p.isBookmarked } : p
    ));
    if (selectedPost?.id === postId) {
      setSelectedPost(prev => prev ? { ...prev, isBookmarked: !prev.isBookmarked } : prev);
    }
  };

  const totalPosts = posts.length;
  const boardCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    posts.forEach(p => { counts[p.board] = (counts[p.board] ?? 0) + 1; });
    return counts;
  }, [posts]);

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: T.bg, color: T.text,
    }}>
      {/* Page header */}
      <div style={{
        padding: '24px 32px 0',
        borderBottom: `1px solid ${T.border}`,
        background: T.bg,
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Users size={20} color={T.accent} />
              <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text, margin: 0 }}>{tc.title}</h1>
            </div>
            <p style={{ fontSize: 13, color: T.textSec, margin: '4px 0 0' }}>{tc.subtitle}</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: T.accent, color: '#fff', border: 'none',
              borderRadius: 10, padding: '9px 18px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <Plus size={15} /> {tc.createPost}
          </button>
        </div>

        {/* Search bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(0,0,0,0.04)', border: `1px solid ${T.border}`,
          borderRadius: 10, padding: '9px 14px', marginBottom: 20,
        }}>
          <Search size={15} color={T.textMuted} />
          <input
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setSelectedPost(null); }}
            placeholder={tc.searchPlaceholder}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: T.text, fontSize: 13,
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textMuted }}>
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Body: 3 columns */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        {/* Left: Board navigation */}
        <div style={{
          width: 220, flexShrink: 0,
          borderRight: `1px solid ${T.border}`,
          padding: '16px 12px',
          overflowY: 'auto',
        }}>
          {/* All boards */}
          <BoardNavItem
            label={tc.boards.all}
            count={totalPosts}
            active={selectedBoard === 'all'}
            onClick={() => { setSelectedBoard('all'); setSelectedPost(null); }}
          />
          <div style={{ height: 8 }} />
          {BOARDS.map(b => (
            <BoardNavItem
              key={b.id}
              label={`${b.emoji} ${tc.boards[b.id]}`}
              count={boardCounts[b.id] ?? 0}
              active={selectedBoard === b.id}
              onClick={() => { setSelectedBoard(b.id); setSelectedPost(null); }}
            />
          ))}
        </div>

        {/* Main content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <AnimatePresence mode="wait">
            {selectedPost ? (
              <PostDetail
                key={selectedPost.id}
                post={selectedPost}
                boardLabel={getBoardLabel(selectedPost.board)}
                onBack={() => setSelectedPost(null)}
                onLike={() => toggleLike(selectedPost.id)}
                onBookmark={() => toggleBookmark(selectedPost.id)}
              />
            ) : (
              <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {filteredPosts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>??</div>
                    <div style={{ fontSize: 15, color: T.textSec }}>{tc.noPost}</div>
                    <div style={{ fontSize: 13, color: T.textMuted, marginTop: 6 }}>{tc.noPostHint}</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {filteredPosts.map(post => (
                      <PostCard
                        key={post.id}
                        post={post}
                        boardLabel={getBoardLabel(post.board)}
                        onClick={() => setSelectedPost(post)}
                        onLike={() => toggleLike(post.id)}
                        onBookmark={() => toggleBookmark(post.id)}
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right: Hot tags & trending */}
        <div style={{
          width: 220, flexShrink: 0,
          borderLeft: `1px solid ${T.border}`,
          padding: '16px 16px',
          overflowY: 'auto',
        }}>
          {/* Hot tags */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <Hash size={13} color={T.accent} />
              <span style={{ fontSize: 12, fontWeight: 600, color: T.textSec }}>{tc.hotTags}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {HOT_TAGS.map(tag => (
                <button
                  key={tag}
                  onClick={() => { setSearchQuery(tag.replace('#', '')); setSelectedPost(null); }}
                  style={{
                    fontSize: 11, color: T.textSec,
                    background: 'rgba(0,0,0,0.04)',
                    border: `1px solid ${T.border}`,
                    borderRadius: 8, padding: '3px 10px',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.color = T.accent;
                    (e.currentTarget as HTMLElement).style.borderColor = T.accentBorder;
                    (e.currentTarget as HTMLElement).style.background = T.accentDim;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.color = T.textSec;
                    (e.currentTarget as HTMLElement).style.borderColor = T.border;
                    (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.04)';
                  }}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Trending posts */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
              <TrendingUp size={13} color={T.accent} />
              <span style={{ fontSize: 12, fontWeight: 600, color: T.textSec }}>{tc.trending}</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {posts
                .slice()
                .sort((a, b) => b.views - a.views)
                .slice(0, 5)
                .map((post, idx) => (
                  <button
                    key={post.id}
                    onClick={() => setSelectedPost(post)}
                    style={{
                      display: 'flex', alignItems: 'flex-start', gap: 10,
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '8px 6px', borderRadius: 8, textAlign: 'left',
                      transition: 'background 0.15s', width: '100%',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <span style={{
                      fontSize: 11, fontWeight: 700,
                      color: idx < 3 ? T.accent : T.textMuted,
                      width: 16, flexShrink: 0, paddingTop: 1,
                    }}>
                      {idx + 1}
                    </span>
                    <span style={{
                      fontSize: 12, color: T.textSec, lineHeight: 1.5,
                      display: '-webkit-box', WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {post.title}
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Create post modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreatePostModal
            tc={tc}
            onClose={() => setShowCreateModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function BoardNavItem({ label, count, active, onClick }: {
  label: string; count: number; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 10px', borderRadius: 10, border: 'none', cursor: 'pointer',
        background: active ? T.accentDim : 'transparent',
        color: active ? T.accent : T.textSec,
        fontSize: 13, fontWeight: active ? 600 : 400,
        marginBottom: 2, transition: 'all 0.15s',
        textAlign: 'left',
      }}
      onMouseEnter={e => !active && (e.currentTarget.style.background = 'rgba(0,0,0,0.04)')}
      onMouseLeave={e => !active && (e.currentTarget.style.background = 'transparent')}
    >
      <span style={{ flex: 1 }}>{label}</span>
      <span style={{
        fontSize: 11, color: active ? T.accent : T.textMuted,
        background: active ? 'rgba(99,102,241,0.15)' : 'rgba(0,0,0,0.06)',
        borderRadius: 20, padding: '1px 7px', marginLeft: 6,
      }}>
        {count}
      </span>
    </button>
  );
}
