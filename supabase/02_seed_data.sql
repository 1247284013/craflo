-- ═══════════════════════════════════════════════════════════════════
-- Craflo Knowledge Base — Step 2: Seed Data
-- 建表完成后，继续在 SQL Editor 运行此文件
-- ═══════════════════════════════════════════════════════════════════

-- 先插入根节点和分类节点
INSERT INTO knowledge_nodes
  (id, parent_id, title_zh, title_en, type, domains, roles, level, tags, sort_order)
VALUES
  ('root', NULL, '知识库', 'Knowledge Base',
   'branch', ARRAY['general'], ARRAY['all'], 'beginner', ARRAY[]::TEXT[], 0),

  ('viz-tools', 'root', '可视化工具', 'Visualization Tools',
   'branch', ARRAY['portfolio','project'], ARRAY['all'], 'beginner',
   ARRAY['可视化','工具','设计方法'], 1)

ON CONFLICT (id) DO UPDATE SET
  title_zh   = EXCLUDED.title_zh,
  title_en   = EXCLUDED.title_en,
  updated_at = NOW();

-- ── 雷达图 Radar Chart ──────────────────────────────────────────────
INSERT INTO knowledge_nodes (
  id, parent_id, title_zh, title_en, type,
  content_zh, content_en,
  images, domains, roles, level, tags, ai_scenarios, "references", sort_order
) VALUES (
  'radar-chart',
  'viz-tools',
  '雷达图 Radar Chart',
  'Radar Chart (Spider Plot)',
  'tutorial',

  -- content_zh
  E'## 什么是雷达图？\n\n雷达图（Radar Chart），又称蜘蛛网图（Spider Plot），是一种表现**多维数据强弱**的图表。\n\n它将多个维度的数据量映射到坐标轴上，这些坐标轴起始于同一个圆心点，通常结束于圆周边缘，将同一组的点使用线连接起来就形成了雷达图。\n\n**核心价值**：透过多维度量化评估多个设计方案或市场竞品，通过图形重叠面积的对比，直观论证设计的优越性与可行性。\n\n---\n\n## 什么时候可以用雷达图？\n\n### #01 竞品分析（Competitor Analysis）\n比较自己的设计与多个竞品在关键维度（如性能、可持续性）的优劣势。\n\n### #02 用户调研（User Research）\n分析特定用户画像在不同需求维度上的特征。\n\n当然还有更多地方可以运用这一可视化工具，希望大家能进行灵活运用。\n\n---\n\n## 雷达图设计步骤\n\n**Step 1–3**：确定维度 → 收集数据 → 建立坐标轴\n\n**Step 4–5**：绘制数据点 → 连线填色，形成雷达图区域\n\n> 具体步骤图见下方图片。',

  -- content_en
  E'## What is a Radar Chart?\n\nA Radar Chart (also called a Spider Plot) is a diagram that shows **multi-dimensional data** on axes starting from the same center point.\n\n**Core value**: Quantitatively evaluate multiple design concepts or market competitors across dimensions, and visually demonstrate design superiority through overlapping area comparison.\n\n---\n\n## When to use a Radar Chart?\n\n### #01 Competitor Analysis\nCompare your design against multiple competitors across key dimensions (e.g. performance, sustainability).\n\n### #02 User Research\nAnalyze specific user personas across different need dimensions.\n\n---\n\n## Design Steps\n\n**Step 1–3**: Define dimensions → Collect data → Set up axes\n\n**Step 4–5**: Plot data points → Connect and fill to form radar areas',

  -- images
  '[
    {"url":"/knowledge-images/radar-chart_image1.jpeg","caption_zh":"雷达图设计步骤 Step 1–3","caption_en":"Radar Chart Design Steps 1–3"},
    {"url":"/knowledge-images/radar-chart_image2.jpeg","caption_zh":"雷达图设计步骤 Step 4–5","caption_en":"Radar Chart Design Steps 4–5"}
  ]'::JSONB,

  ARRAY['portfolio','project','learning-path'],  -- domains
  ARRAY['all'],                                  -- roles
  'beginner',                                    -- level
  ARRAY['雷达图','蜘蛛网图','竞品分析','用户调研','可视化','多维数据'],  -- tags
  ARRAY[
    '用户问「怎么展示我的技能水平」→ 推荐雷达图',
    '用户问「竞品分析中怎么用可视化工具」→ 推荐雷达图',
    '作品集缺少能力可视化时 → 建议添加雷达图',
    '用户做多方案对比时 → 推荐用雷达图呈现维度差异'
  ],  -- ai_scenarios
  '[
    {"label":"Pinterest 参考案例 1","url":"https://www.pinterest.com/pin/512566001350790524/"},
    {"label":"Pinterest 参考案例 2","url":"https://www.pinterest.com/pin/78179743527397172/"},
    {"label":"Pinterest 参考案例 3","url":"https://www.pinterest.com/pin/267682771598393947/"}
  ]'::JSONB,  -- references
  1           -- sort_order
)
ON CONFLICT (id) DO UPDATE SET
  content_zh   = EXCLUDED.content_zh,
  content_en   = EXCLUDED.content_en,
  images       = EXCLUDED.images,
  tags         = EXCLUDED.tags,
  ai_scenarios = EXCLUDED.ai_scenarios,
  "references" = EXCLUDED."references",
  updated_at   = NOW();


-- ── 形态学矩阵 Morphological Chart ─────────────────────────────────
INSERT INTO knowledge_nodes (
  id, parent_id, title_zh, title_en, type,
  content_zh, content_en,
  images, domains, roles, level, tags, ai_scenarios, "references", sort_order
) VALUES (
  'morphological-chart',
  'viz-tools',
  '形态学矩阵 Morphological Chart',
  'Morphological Chart',
  'tutorial',

  -- content_zh
  E'## 什么是形态学矩阵？\n\n设计过程卡壳，往往不是由于灵感枯竭，而是**缺少科学的发散工具**。\n\n通过形态学矩阵（Morphological Chart）进行严谨的排列组合，不仅能高效推导出多个创新方案，更能深度展现你的**系统性逻辑思维**，证明你具备结构化拆解复杂问题的核心能力。\n\n**核心原理**：将复杂问题拆解为多个独立的功能或形态特征变量（如结构、材质、交互方式），对每一变量穷举可能的解决方案，最后跨越维度进行交叉组合，清晰呈现设计方案的推导逻辑与发散深度。\n\n---\n\n## 什么时候可以用形态学矩阵？\n\n### 概念设计阶段（Ideation）\n将矩阵中每个子功能对应的不同解决方案进行组合，可以发散出不同的设计方案，进行快速迭代和验证想法。\n\n---\n\n## 如何使用形态学矩阵\n\n**第一步**：拆解问题为关键功能/特征维度（通常 4–8 个）\n\n**第二步**：对每个维度穷举可能的解决方案（每个维度 3–5 个选项）\n\n**第三步**：跨维度进行组合，选出最有潜力的组合方案\n\n**第四步**：将选出的组合可视化，形成完整的设计方案推导图\n\n> 具体参考图见下方图片。',

  -- content_en
  E'## What is a Morphological Chart?\n\nWhen design processes get stuck, it''s often not from lack of inspiration — it''s from lacking a **systematic divergence tool**.\n\nThe Morphological Chart enables rigorous combinatorial exploration, helping you generate multiple innovative concepts while demonstrating **systematic logical thinking**.\n\n**Core principle**: Decompose a complex problem into independent function/feature variables (e.g. structure, material, interaction), enumerate possible solutions for each variable, then cross-combine across dimensions to reveal the design solution space.\n\n---\n\n## When to use a Morphological Chart?\n\n### Ideation Phase\nCombine different sub-solutions across dimensions to generate diverse design concepts for rapid iteration and validation.\n\n---\n\n## How to use it\n\n**Step 1**: Break the problem into key functional/feature dimensions (typically 4–8)\n\n**Step 2**: List possible solutions for each dimension (3–5 options each)\n\n**Step 3**: Cross-combine across dimensions to select promising combinations\n\n**Step 4**: Visualize selected combinations as complete design derivation',

  -- images
  '[
    {"url":"/knowledge-images/morphological-chart_image1.jpeg","caption_zh":"形态学矩阵示例 1","caption_en":"Morphological Chart Example 1"},
    {"url":"/knowledge-images/morphological-chart_image2.jpeg","caption_zh":"形态学矩阵示例 2","caption_en":"Morphological Chart Example 2"},
    {"url":"/knowledge-images/morphological-chart_image3.jpeg","caption_zh":"形态学矩阵示例 3","caption_en":"Morphological Chart Example 3"},
    {"url":"/knowledge-images/morphological-chart_image4.jpeg","caption_zh":"形态学矩阵示例 4","caption_en":"Morphological Chart Example 4"}
  ]'::JSONB,

  ARRAY['portfolio','project'],  -- domains
  ARRAY['all'],                  -- roles
  'beginner',                    -- level
  ARRAY['形态学矩阵','概念设计','发散思维','方案推导','系统设计'],  -- tags
  ARRAY[
    '用户在概念设计阶段卡住 → 推荐使用形态学矩阵发散方案',
    '用户问「怎么展示我的设计推导过程」→ 推荐形态学矩阵',
    '作品集缺少方案推导逻辑 → 建议补充形态学矩阵',
    '用户需要证明系统性思维 → 推荐在作品集中加入形态学矩阵'
  ],  -- ai_scenarios
  '[
    {"label":"Morphological Chart Deep Dive (Cornell)","url":"https://arl.human.cornell.edu/PAGES_Delft/Morpholigical_Chart-deeper.pdf"},
    {"label":"SlideServe 参考案例","url":"https://www.slideserve.com/asis/p14415-system-design-review"},
    {"label":"Stanford ME317 参考","url":"https://me317.stanford.edu/twiki/pub/Main/ME317CourseContent/Slide27.jpg"}
  ]'::JSONB,  -- references
  2           -- sort_order
)
ON CONFLICT (id) DO UPDATE SET
  content_zh   = EXCLUDED.content_zh,
  content_en   = EXCLUDED.content_en,
  images       = EXCLUDED.images,
  tags         = EXCLUDED.tags,
  ai_scenarios = EXCLUDED.ai_scenarios,
  "references" = EXCLUDED."references",
  updated_at   = NOW();

SELECT id, title_zh, type, level FROM knowledge_nodes ORDER BY sort_order;
