/**
 * Craflo Knowledge Base — Embedding Generator
 * 用 Google text-embedding-004 为知识节点生成向量，并写入 Supabase
 *
 * 运行方式：node scripts/generate-embeddings.mjs
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// 读取 .env 文件
function loadEnv() {
  const envPath = resolve(__dirname, '../.env');
  const env = {};
  readFileSync(envPath, 'utf-8').split('\n').forEach(line => {
    const [key, ...rest] = line.split('=');
    if (key && rest.length) env[key.trim()] = rest.join('=').trim();
  });
  return env;
}

const env = loadEnv();
const SUPABASE_URL    = env.VITE_SUPABASE_URL?.replace('/rest/v1/', '') || '';
const SERVICE_KEY     = env.SUPABASE_SERVICE_KEY || '';
const GOOGLE_API_KEY  = env.VITE_GOOGLE_API_KEY || '';

if (!SERVICE_KEY) {
  console.error('❌ 缺少 SUPABASE_SERVICE_KEY，请在 .env 中添加');
  process.exit(1);
}
if (!GOOGLE_API_KEY) {
  console.error('❌ 缺少 VITE_GOOGLE_API_KEY，请在 .env 中添加');
  process.exit(1);
}

// 把文本内容拼接成适合 embedding 的字符串
function buildTextForEmbedding(node) {
  const parts = [
    node.title_zh || '',
    node.title_en || '',
    node.content_zh || '',
    node.content_en || '',
    (node.tags || []).join(' '),
    (node.domains || []).join(' '),
  ];
  return parts.filter(Boolean).join('\n').slice(0, 3000); // Google 限制 ~2048 token
}

// 调用 Google text-embedding-004 API
async function getEmbedding(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GOOGLE_API_KEY}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'models/gemini-embedding-001',
      content: { parts: [{ text }] },
      outputDimensionality: 768,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google API 错误: ${err}`);
  }
  const data = await res.json();
  return data.embedding.values; // number[]，长度 768
}

// 从 Supabase 读取所有节点
async function fetchNodes() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/knowledge_nodes?select=*`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
    },
  });
  if (!res.ok) throw new Error(`读取节点失败: ${await res.text()}`);
  return res.json();
}

// 把向量写回 Supabase
async function updateEmbedding(id, embedding) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/knowledge_nodes?id=eq.${encodeURIComponent(id)}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ embedding: `[${embedding.join(',')}]` }),
    }
  );
  if (!res.ok) throw new Error(`更新节点 ${id} 失败: ${await res.text()}`);
}

// 主流程
async function main() {
  console.log('📦 正在读取知识节点...');
  const nodes = await fetchNodes();
  console.log(`   共 ${nodes.length} 个节点`);

  for (const node of nodes) {
    const text = buildTextForEmbedding(node);
    if (!text.trim()) {
      console.log(`⚠️  跳过空内容节点: ${node.id}`);
      continue;
    }

    process.stdout.write(`🔄 生成向量: ${node.title_zh || node.id} ... `);
    try {
      const embedding = await getEmbedding(text);
      await updateEmbedding(node.id, embedding);
      console.log(`✅ 完成 (${embedding.length}维)`);
    } catch (e) {
      console.log(`❌ 失败: ${e.message}`);
    }

    // 避免触发 API 速率限制
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n🎉 所有向量生成完成！');
}

main().catch(e => { console.error(e); process.exit(1); });
