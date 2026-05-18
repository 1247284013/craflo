/**
 * Craflo — Community Posts Seeder
 * 把 mock 帖子写入 Supabase，同时生成 embedding 向量
 *
 * 运行方式：node scripts/seed-posts.mjs
 */
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const env = {};
  readFileSync(resolve(__dirname, '../.env'), 'utf-8').split('\n').forEach(line => {
    const [k, ...rest] = line.split('=');
    if (k && rest.length) env[k.trim()] = rest.join('=').trim();
  });
  return env;
}

const env = loadEnv();
const SUPABASE_URL   = env.VITE_SUPABASE_URL?.replace('/rest/v1/', '') || '';
const SERVICE_KEY    = env.SUPABASE_SERVICE_KEY || '';
const GOOGLE_API_KEY = env.VITE_GOOGLE_API_KEY || '';

if (!SERVICE_KEY || !GOOGLE_API_KEY) {
  console.error('❌ 缺少环境变量'); process.exit(1);
}

// ── Mock 帖子数据（与 Community/mockData.ts 同步）──────────────────────────
const POSTS = [
  {
    id: 'p1', title: '结构设计实习作品集，请大家帮忙看看还缺什么？',
    content: `我是工业设计背景，准备转结构设计方向，做了一个消费电子外壳的作品集项目。里面包含：产品外观草图×10、SolidWorks结构建模（外壳+内件）、爆炸图展示、材料工艺说明（ABS注塑+油漆工艺）。但是感觉DFM分析这块做得很浅，工程性不足。请问有经验的朋友，结构设计实习岗位的作品集，还需要补充哪些内容才更有说服力？`,
    board_id: 'portfolio-review', author_name: '张明宇', author_initial: 'Z',
    tags: ['作品集', '结构设计', 'DFM', '实习'],
    like_count: 47, comment_count: 12, view_count: 389,
    is_solved: true, is_official: false, is_pinned: false, has_ai_summary: true,
    ai_summary: '该帖主要讨论结构设计实习作品集的完善方向。核心建议：补充完整DFM分析、添加装配逻辑拆解图、标注关键公差。',
  },
  {
    id: 'p2', title: '便携式产品内部结构散热怎么做？新手求助',
    content: `在做一个便携式充电宝的结构项目，产品尺寸比较紧凑（150×80×20mm），内部有升压模块和电芯，发热比较严重。请问结构设计上有哪些常用的散热方式？是用导热硅脂+铝板导热，还是有其他方案？需要考虑防水等级的话又有什么注意事项？SolidWorks建模还行，但工程散热这块完全不懂，请大佬指路！`,
    board_id: 'project-help', author_name: '周小航', author_initial: 'Z',
    tags: ['散热', '便携产品', '结构设计', '新手'],
    like_count: 31, comment_count: 8, view_count: 256,
    is_solved: false, is_official: false, is_pinned: false, has_ai_summary: true,
    ai_summary: '便携产品散热的主流方案：导热硅脂+铝制导热片导热至外壳，外壳采用铝合金强化散热效率。',
  },
  {
    id: 'p3', title: '【公告】Craflo 社区正式上线！欢迎大家交流分享',
    content: `Craflo社区今日正式上线！这里是专为设计工程人群打造的交流平台，你可以在这里：分享学习路径经验、求助项目技术问题、点评作品集互相成长、分享求职实习经验、交流工程工具与AI工作流。欢迎大家积极分享，共同沉淀设计工程领域的实战知识！`,
    board_id: 'announcements', author_name: 'Craflo 官方', author_initial: 'C',
    tags: ['公告', '社区'],
    like_count: 156, comment_count: 34, view_count: 1204,
    is_solved: false, is_official: true, is_pinned: true, has_ai_summary: false,
    ai_summary: null,
  },
  {
    id: 'p4', title: '工业设计转结构设计 3 个月复盘：什么最重要？',
    content: `我是工业设计本科，去年开始备战结构设计方向，经历了3个月的系统学习，现在已经拿到了一家消费电子公司的结构工程师实习offer，做个经验复盘。最重要的三件事：1.DFM思维的建立——不再只想"好不好看"，而是想"这个结构能不能量产、怎么开模"。2.SolidWorks建模能力——核心功能要熟练：零件建模、装配、工程图出图、公差标注。3.作品集的"工程性"——纯外观渲染没用，面试官想看到你理解结构。每个项目要有：结构拆解、材料选型理由、DFM分析、装配顺序。`,
    board_id: 'engineering-exp', author_name: '孙悦迪', author_initial: 'S',
    tags: ['转岗经验', '结构设计', 'DFM', '工业设计', '学习路径'],
    like_count: 203, comment_count: 28, view_count: 1567,
    is_solved: false, is_official: false, is_pinned: false, has_ai_summary: true,
    ai_summary: '工设转结构设计的核心路径：建立DFM思维、掌握SolidWorks工作流、作品集强调工程性。作者3个月备战后成功拿到实习offer。',
  },
  {
    id: 'p5', title: '【实习】某消费电子公司结构设计实习生招募（深圳）',
    content: `岗位：结构设计实习生，公司：消费电子领域，地点：深圳南山，薪资：200元/天，周期：3个月起。要求：熟练使用SolidWorks/Creo，了解塑料件DFM基础，有作品集者优先。加分项：有拆机分析经历，了解注塑工艺，工业设计/机械/产品设计相关专业。`,
    board_id: 'jobs', author_name: '匿名用户', author_initial: '?',
    tags: ['实习', '结构设计', '深圳', '消费电子'],
    like_count: 18, comment_count: 7, view_count: 412,
    is_solved: false, is_official: false, is_pinned: false, has_ai_summary: false,
    ai_summary: null,
  },
  {
    id: 'p6', title: '分享我常用的 AI 工具组合：Claude + Midjourney + Craflo',
    content: `整理了一下我在结构设计学习过程中常用的AI工具组合：Claude用来解答DFM、材料选型、工艺问题，分析竞品结构、生成项目分析框架；Midjourney快速生成产品外观概念图；Craflo生成系统化的学习路径、项目工作台做结构项目的节点整理、面试题练习。注意事项：AI生成的工程内容需要人工核验，特别是涉及公差、强度、安全规范的内容。`,
    board_id: 'tools-resources', author_name: '陈一帆', author_initial: 'C',
    tags: ['AI工具', 'Claude', '工具推荐', '学习方法'],
    like_count: 89, comment_count: 15, view_count: 734,
    is_solved: false, is_official: false, is_pinned: false, has_ai_summary: false,
    ai_summary: null,
  },
  {
    id: 'p7', title: '零基础到结构设计实习，需要多久？路径怎么规划？',
    content: `我是产品设计本科大三，完全没有结构设计基础，想在毕业前做好转型准备。想请问：1.从零基础到能投结构设计实习简历，大概需要多长时间？2.学习路径怎么规划比较合理？3.SolidWorks和Creo选哪个？我现在会Rhino、Keyshot，有一些工业设计作品，但完全没有做过工程图和结构项目。已解决：基于工设基础，3-4个月认真学可以达到投实习的水平。推荐路径：SW基础(2周)→结构知识(4周)→完整项目(6周)→作品集整理(2周)。`,
    board_id: 'learning-path', author_name: '王佳怡', author_initial: 'W',
    tags: ['学习路径', '结构设计', '转岗', '零基础'],
    like_count: 67, comment_count: 19, view_count: 890,
    is_solved: true, is_official: false, is_pinned: false, has_ai_summary: false,
    ai_summary: null,
  },
  {
    id: 'p8', title: '用 AI 生成结构设计项目大纲，效率翻倍！分享提示词',
    content: `分享一个优化过的提示词，用于让AI生成结构设计项目的完整大纲：你是一位资深结构设计工程师，请为产品生成完整的结构设计大纲，包含：结构方案分析（2-3个方案对比）、关键结构件清单、材料选型建议（含理由）、DFM注意事项、装配顺序、作品集展示建议。用Claude 3.5 Sonnet效果最好，生成的内容质量很高，可以直接用来作为项目框架。当然专业内容还是要自己核验。`,
    board_id: 'ai-workflow', author_name: '林峰', author_initial: 'L',
    tags: ['AI工作流', '提示词', 'Claude', '结构设计'],
    like_count: 134, comment_count: 22, view_count: 1123,
    is_solved: false, is_official: false, is_pinned: false, has_ai_summary: false,
    ai_summary: null,
  },
];

// ── 生成 Embedding ─────────────────────────────────────────────────────────────
async function getEmbedding(text) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GOOGLE_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/gemini-embedding-001',
        content: { parts: [{ text }] },
        outputDimensionality: 768,
      }),
    }
  );
  if (!res.ok) throw new Error(`Embedding API error: ${await res.text()}`);
  const data = await res.json();
  return data.embedding.values;
}

// ── Upsert 帖子到 Supabase ─────────────────────────────────────────────────────
async function upsertPost(post) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/community_posts`,
    {
      method: 'POST',
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(post),
    }
  );
  if (!res.ok) throw new Error(`Upsert error: ${await res.text()}`);
}

// ── 更新 embedding ─────────────────────────────────────────────────────────────
async function updateEmbedding(id, embedding) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/community_posts?id=eq.${id}`,
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
  if (!res.ok) throw new Error(`Update error: ${await res.text()}`);
}

// ── 主流程 ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('📝 开始写入帖子...');

  for (const post of POSTS) {
    process.stdout.write(`  写入: ${post.title.slice(0, 30)}... `);
    try {
      await upsertPost(post);
      console.log('✅');
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('\n🔄 生成 Embedding 向量...');
  for (const post of POSTS) {
    const text = `${post.title}\n${post.content}\n${post.tags.join(' ')}`.slice(0, 3000);
    process.stdout.write(`  向量: ${post.title.slice(0, 30)}... `);
    try {
      const embedding = await getEmbedding(text);
      await updateEmbedding(post.id, embedding);
      console.log(`✅ (${embedding.length}维)`);
    } catch (e) {
      console.log(`❌ ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 500));
  }

  console.log('\n🎉 社区帖子入库完成！');
}

main().catch(e => { console.error(e); process.exit(1); });
