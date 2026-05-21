/**
 * JDUploadDrawer — shared drawer for pasting or uploading a Job Description.
 * Used by:
 *  - LearningPath page  (target JD — career direction, persistent)
 *  - ResumeOptimizer    (applied JD — per-application, session-level)
 */
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, FileText, Upload, Sparkles, Loader2, Check,
  AlertCircle, ChevronRight,
} from 'lucide-react';
import { parseJD } from '../lib/agentAPI';
import type { ParsedJDResponse } from '../lib/agentAPI';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Called when JD is parsed successfully */
  onParsed: (raw: string, parsed: ParsedJDResponse, source: 'text' | 'image') => void;
  title?: string;
  subtitle?: string;
}

type Status = 'idle' | 'parsing' | 'done' | 'error';

export function JDUploadDrawer({ open, onClose, onParsed, title = '设置目标 JD', subtitle = '上传或粘贴职位描述，AI 将自动解析关键要求' }: Props) {
  const [tab, setTab] = useState<'text' | 'image'>('text');
  const [text, setText] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [parsed, setParsed] = useState<ParsedJDResponse | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setText('');
    setStatus('idle');
    setParsed(null);
    setError('');
  };

  const handleClose = () => { reset(); onClose(); };

  const handleParse = async (jdText: string, source: 'text' | 'image') => {
    if (!jdText.trim()) return;
    setStatus('parsing');
    setError('');
    try {
      const result = await parseJD(jdText);
      setParsed(result);
      setStatus('done');
    } catch (e) {
      setError((e as Error).message ?? '解析失败，请检查后端服务');
      setStatus('error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // For images: we do a simple OCR via sending base64 — but for now use text fallback
    // In production this would send to a vision model endpoint
    const reader = new FileReader();
    reader.onload = () => {
      // Temporary: treat as text via OCR placeholder
      // Real implementation: send base64 to /api/career/ocr-jd
      setText(`[图片文件：${file.name}]\n请在后端接入视觉模型进行OCR处理。\n当前演示模式：请切换到文字粘贴模式。`);
      setTab('text');
    };
    reader.readAsDataURL(file);
  };

  const handleConfirm = () => {
    if (!parsed) return;
    onParsed(text, parsed, tab);
    handleClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={handleClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 100 }}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{
              position: 'fixed', top: 0, right: 0, bottom: 0, width: 500,
              background: '#fff', borderLeft: '1px solid rgba(0,0,0,0.08)',
              zIndex: 101, display: 'flex', flexDirection: 'column',
              boxShadow: '-12px 0 48px rgba(0,0,0,0.12)',
            }}
          >
            {/* Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.07)', flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 12, background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={17} color="#6366f1" />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>{title}</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>{subtitle}</div>
                  </div>
                </div>
                <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4 }}>
                  <X size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 4, marginTop: 16, background: 'rgba(0,0,0,0.04)', borderRadius: 10, padding: 4 }}>
                {(['text', 'image'] as const).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    style={{
                      flex: 1, padding: '7px 0', borderRadius: 8, border: 'none', cursor: 'pointer',
                      fontSize: 13, fontWeight: 600,
                      background: tab === t ? '#fff' : 'transparent',
                      color: tab === t ? '#111827' : '#9ca3af',
                      boxShadow: tab === t ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                      transition: 'all 0.15s',
                    }}
                  >
                    {t === 'text' ? '粘贴文字' : '上传截图'}
                  </button>
                ))}
              </div>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {status === 'idle' || status === 'error' ? (
                tab === 'text' ? (
                  <div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 10, lineHeight: 1.6 }}>
                      将岗位描述（JD）全文粘贴进来，AI 会自动识别岗位要求、技能关键词和职责。
                    </div>
                    <textarea
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder="粘贴职位描述原文……&#10;&#10;例如：&#10;岗位：用户体验设计师&#10;工作职责：负责产品的全链路UX设计…&#10;任职要求：3年以上工作经验，熟悉Figma…"
                      rows={14}
                      style={{
                        width: '100%', boxSizing: 'border-box',
                        padding: '14px', border: '1.5px solid rgba(0,0,0,0.1)',
                        borderRadius: 12, fontSize: 13, color: '#374151',
                        resize: 'vertical', outline: 'none', lineHeight: 1.7,
                        fontFamily: 'inherit', background: '#fafafa',
                        transition: 'border-color 0.15s',
                      }}
                      onFocus={e => (e.target.style.borderColor = 'rgba(99,102,241,0.5)')}
                      onBlur={e => (e.target.style.borderColor = 'rgba(0,0,0,0.1)')}
                    />
                    {status === 'error' && (
                      <div style={{ marginTop: 10, display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, fontSize: 13, color: '#ef4444' }}>
                        <AlertCircle size={14} /> {error}
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14, lineHeight: 1.6 }}>
                      上传 JD 截图，AI 将识别图中的文字内容。支持 PNG、JPG 格式。
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                    <button
                      onClick={() => fileRef.current?.click()}
                      style={{
                        width: '100%', padding: '40px 20px',
                        border: '2px dashed rgba(99,102,241,0.3)',
                        borderRadius: 16, background: 'rgba(99,102,241,0.03)',
                        cursor: 'pointer', display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 12, transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.6)'; (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.06)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(99,102,241,0.3)'; (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.03)'; }}
                    >
                      <Upload size={28} color="#6366f1" />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>点击上传 JD 截图</div>
                        <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>PNG / JPG，最大 5MB</div>
                      </div>
                    </button>
                    <div style={{ marginTop: 14, padding: '10px 14px', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 10, fontSize: 12, color: '#92400e' }}>
                      💡 图片上传目前使用文字识别（OCR）处理。建议直接粘贴 JD 文字以获得最佳效果。
                    </div>
                  </div>
                )
              ) : status === 'parsing' ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 240, gap: 16 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Loader2 size={22} color="#6366f1" style={{ animation: 'spin 1s linear infinite' }} />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>AI 正在解析 JD…</div>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 4 }}>识别岗位要求、技能关键词和职责</div>
                  </div>
                </div>
              ) : parsed ? (
                <div>
                  {/* Success header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, padding: '12px 16px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12 }}>
                    <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(16,185,129,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Check size={15} color="#10b981" />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#065f46' }}>解析成功</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>已识别以下关键信息，确认后保存</div>
                    </div>
                  </div>

                  {/* Parsed result */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <ParsedField label="岗位名称" value={parsed.title} accent="#6366f1" />
                    {parsed.company && <ParsedField label="公司" value={parsed.company} accent="#6366f1" />}
                    {parsed.summary && <ParsedField label="概括" value={parsed.summary} accent="#8b5cf6" />}
                    <ParsedListField label="必备技能" items={parsed.requiredSkills} color="#ef4444" bg="rgba(239,68,68,0.06)" border="rgba(239,68,68,0.15)" />
                    {parsed.preferredSkills.length > 0 && (
                      <ParsedListField label="加分技能" items={parsed.preferredSkills} color="#f59e0b" bg="rgba(245,158,11,0.06)" border="rgba(245,158,11,0.15)" />
                    )}
                    <ParsedListField label="核心职责" items={parsed.keyResponsibilities} color="#6366f1" bg="rgba(99,102,241,0.06)" border="rgba(99,102,241,0.15)" />
                    <ParsedListField label="关键词" items={parsed.keywords} color="#10b981" bg="rgba(16,185,129,0.06)" border="rgba(16,185,129,0.15)" tags />
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(0,0,0,0.07)', flexShrink: 0 }}>
              {status === 'done' ? (
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={reset}
                    style={{ flex: 1, padding: '11px 0', border: '1px solid rgba(0,0,0,0.1)', borderRadius: 12, background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    重新解析
                  </button>
                  <button
                    onClick={handleConfirm}
                    style={{ flex: 2, padding: '11px 0', border: 'none', borderRadius: 12, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, boxShadow: '0 4px 14px rgba(99,102,241,0.35)' }}
                  >
                    <Check size={14} /> 保存此 JD
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleParse(text, tab)}
                  disabled={!text.trim() || status === 'parsing'}
                  style={{
                    width: '100%', padding: '12px 0', border: 'none', borderRadius: 12,
                    background: text.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(0,0,0,0.06)',
                    color: text.trim() ? '#fff' : '#9ca3af',
                    fontSize: 14, fontWeight: 700, cursor: text.trim() ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: text.trim() ? '0 4px 14px rgba(99,102,241,0.35)' : 'none',
                    transition: 'all 0.15s',
                  }}
                >
                  <Sparkles size={15} />
                  AI 解析 JD
                  <ChevronRight size={14} />
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ── Small sub-components ─────────────────────────────────────────────────────

function ParsedField({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', padding: '8px 12px', background: `${accent}08`, border: `1px solid ${accent}18`, borderRadius: 10 }}>
        {value}
      </div>
    </div>
  );
}

function ParsedListField({ label, items, color, bg, border, tags }: {
  label: string; items: string[]; color: string; bg: string; border: string; tags?: boolean;
}) {
  if (!items.length) return null;
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
      {tags ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {items.map((item, i) => (
            <span key={i} style={{ fontSize: 12, fontWeight: 600, color, background: bg, border: `1px solid ${border}`, borderRadius: 20, padding: '3px 10px' }}>
              {item}
            </span>
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '7px 12px', background: bg, border: `1px solid ${border}`, borderRadius: 10 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0, marginTop: 5 }} />
              <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
