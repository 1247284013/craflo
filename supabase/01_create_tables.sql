-- ═══════════════════════════════════════════════════════════════════
-- Craflo Knowledge Base — Step 1: Create Tables
-- 在 Supabase Dashboard → SQL Editor 中粘贴并运行此文件
-- ═══════════════════════════════════════════════════════════════════

-- 启用 pgvector 扩展（未来用于 AI 语义搜索）
CREATE EXTENSION IF NOT EXISTS vector;

-- ── 知识节点表 ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS knowledge_nodes (
  id           TEXT PRIMARY KEY,
  parent_id    TEXT REFERENCES knowledge_nodes(id) ON DELETE SET NULL,
  title_zh     TEXT NOT NULL,
  title_en     TEXT,
  type         TEXT NOT NULL DEFAULT 'concept'
                 CHECK (type IN ('branch','concept','tutorial','standard','tip','task')),
  content_zh   TEXT,
  content_en   TEXT,
  images       JSONB    NOT NULL DEFAULT '[]',
  domains      TEXT[]   NOT NULL DEFAULT '{}',
  roles        TEXT[]   NOT NULL DEFAULT '{}',
  level        TEXT     NOT NULL DEFAULT 'beginner'
                 CHECK (level IN ('beginner','intermediate','advanced')),
  tags         TEXT[]   NOT NULL DEFAULT '{}',
  ai_scenarios TEXT[]   NOT NULL DEFAULT '{}',
  "references" JSONB    NOT NULL DEFAULT '[]',
  sort_order   INTEGER  NOT NULL DEFAULT 0,
  -- 预留 embedding 字段，接入 OpenAI 后取消注释
  -- embedding    vector(1536),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 自动更新 updated_at ──────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_nodes_updated_at
  BEFORE UPDATE ON knowledge_nodes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── 行级安全（RLS）──────────────────────────────────────────────────
ALTER TABLE knowledge_nodes ENABLE ROW LEVEL SECURITY;

-- 所有人可读（公开知识库）
CREATE POLICY "public_read" ON knowledge_nodes
  FOR SELECT USING (true);

-- 只有 service_role（后端）可写
CREATE POLICY "service_write" ON knowledge_nodes
  FOR ALL USING (auth.role() = 'service_role');

-- ── 全文搜索索引 ────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS knowledge_nodes_tags_gin
  ON knowledge_nodes USING GIN (tags);

CREATE INDEX IF NOT EXISTS knowledge_nodes_domains_gin
  ON knowledge_nodes USING GIN (domains);

CREATE INDEX IF NOT EXISTS knowledge_nodes_fts
  ON knowledge_nodes USING GIN (
    to_tsvector('simple', COALESCE(title_zh,'') || ' ' || COALESCE(content_zh,''))
  );

SELECT 'Tables created successfully ✓' AS status;
