import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn('[Supabase] Missing env vars — falling back to local data.');
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

// ── Database types ────────────────────────────────────────────────────────────
export interface DBKnowledgeNode {
  id: string;
  parent_id: string | null;
  title_zh: string;
  title_en: string | null;
  type: string;
  content_zh: string | null;
  content_en: string | null;
  images: { url: string; caption_zh: string; caption_en: string }[] | null;
  domains: string[];
  roles: string[];
  level: string;
  tags: string[];
  ai_scenarios: string[] | null;
  references: { label: string; url: string }[] | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
