/**
 * 试卷注册中心
 *
 * 自动扫描 exams/ 目录下的所有 .js 文件，加载为可用试卷。
 * 后续新增试卷只需在 exams/ 目录下新建文件并 export default { id, name, questions, ... }
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXAMS_DIR = path.join(__dirname, '..', 'exams');

/** @type {Map<string, object>} examId -> examData */
const registry = new Map();

// 启动时同步加载所有试卷
const files = fs.readdirSync(EXAMS_DIR).filter(f => f.endsWith('.js')).sort();

for (const file of files) {
  const fullPath = path.join(EXAMS_DIR, file);
  // 动态 import 需要 file URL
  const mod = await import(pathToFileURL(fullPath).href);
  const exam = mod.default;

  if (!exam || !exam.id || !exam.questions) {
    console.warn(`  ⚠ 跳过无效试卷文件: ${file}`);
    continue;
  }

  // 计算汇总信息
  const totalScore = exam.questions.reduce((s, q) => s + q.score, 0);
  const categories = {};
  for (const q of exam.questions) {
    if (!categories[q.category]) {
      categories[q.category] = { count: 0, label: categoryLabel(q.category) };
    }
    categories[q.category].count++;
  }

  // 组卷配置优先级：pick_config > pick_per_category > pick_count > 全出
  // pick_config: { category_name: count } — 各 category 各自指定抽题数量
  // pick_per_category: number — 各 category 统一抽题数量
  const pickConfig = exam.pick_config || null;
  const pickPerCategory = exam.pick_per_category || null;

  let pickCount;
  let actualTotalScore;

  if (pickConfig) {
    // 模式 A：每个 category 独立指定抽题数量（支持不同 category 不同数量）
    pickCount = 0;
    actualTotalScore = 0;
    for (const cat of Object.keys(categories)) {
      const n = pickConfig[cat] || categories[cat].count; // 未指定的 category 全出
      const catQuestions = exam.questions.filter(q => q.category === cat);
      pickCount += n;
      actualTotalScore += catQuestions[0].score * n;
    }
  } else if (pickPerCategory) {
    // 模式 B：各 category 统一抽取数量
    pickCount = pickPerCategory * Object.keys(categories).length;
    actualTotalScore = 0;
    for (const cat of Object.keys(categories)) {
      const catQuestions = exam.questions.filter(q => q.category === cat);
      actualTotalScore += catQuestions[0].score * pickPerCategory;
    }
  } else {
    // 模式 C：pick_count 或全出
    pickCount = exam.pick_count || exam.questions.length;
    actualTotalScore = totalScore;
  }

  registry.set(exam.id, {
    ...exam,
    pick_config: pickConfig,
    pick_per_category: pickPerCategory,
    pick_count: pickCount,
    total_questions: pickCount,    // 实际考题数
    total_score: actualTotalScore, // 实际满分（非题库总分）
    pool_size: exam.questions.length,
    categories,
  });

  console.log(`  📝 加载题库: ${exam.id} — ${exam.name} (题库 ${exam.questions.length} 题, 每次抽 ${pickCount} 题, 满分 ${actualTotalScore})`);
}

function categoryLabel(cat) {
  const map = { basic: '基本常识', tool: '工具调用', complex: '复杂推理', computer: 'Computer Use', browser: 'Browser Use', search: '信息检索', reasoning: '复杂推理', research: '深度检索' };
  return map[cat] || cat;
}

// ============================================================
// 公开 API
// ============================================================

/** 获取所有可用试卷列表 */
export function listExams() {
  return Array.from(registry.values()).map(e => ({
    id: e.id,
    name: e.name,
    description: e.description,
    version: e.version,
    total_questions: e.total_questions,
    total_score: e.total_score,
    pool_size: e.questions.length,
    pick_count: e.pick_count,
    pick_config: e.pick_config || null,
    pick_per_category: e.pick_per_category || null,
    categories: e.categories,
    created_at: e.created_at,
  }));
}

/** 根据 ID 获取试卷（含题目） */
export function getExam(examId) {
  return registry.get(examId) || null;
}

/** 获取试卷的公开题目信息（不含答案） */
export function getPublicQuestions(examId) {
  const exam = registry.get(examId);
  if (!exam) return null;
  return exam.questions.map(q => ({
    id: q.id,
    category: q.category,
    question: q.question,
    score: q.score,
    hint: q.hint,
  }));
}

/** 获取指定试卷的某题（内部使用，含答案） */
export function getQuestion(examId, questionId) {
  const exam = registry.get(examId);
  if (!exam) return null;
  return exam.questions.find(q => q.id === questionId) || null;
}

/** 获取某题的公开信息（不含答案），附带序号 */
export function getPublicQuestion(examId, questionId) {
  const q = getQuestion(examId, questionId);
  if (!q) return null;
  return {
    id: q.id,
    category: q.category,
    question: q.question,
    score: q.score,
    hint: q.hint,
  };
}

/**
 * 从题库中随机抽取题目（Fisher-Yates 洗牌）
 *
 * 组卷策略：
 * 1. 若试卷定义了 pick_per_category，严格从每个 category 中各抽取相同数量的题目
 *    → 保证每次考试各维度题数一致、总分一致
 * 2. 否则退回到 pick_count 模式（按比例分配）
 */
export function pickRandomQuestions(examId) {
  const exam = registry.get(examId);
  if (!exam) return null;

  const allQuestions = [...exam.questions];

  // 按分类分组
  const byCategory = {};
  for (const q of allQuestions) {
    if (!byCategory[q.category]) byCategory[q.category] = [];
    byCategory[q.category].push(q);
  }

  // 每个分类内部洗牌
  for (const cat of Object.values(byCategory)) {
    for (let i = cat.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cat[i], cat[j]] = [cat[j], cat[i]];
    }
  }

  const picked = [];

  if (exam.pick_config || exam.pick_per_category) {
    // 模式 1：按每个 category 指定的数量抽取
    for (const [cat, pool] of Object.entries(byCategory)) {
      const n = exam.pick_config
        ? (exam.pick_config[cat] || pool.length)   // pick_config 各 category 独立指定
        : exam.pick_per_category;                   // pick_per_category 统一数量
      if (pool.length < n) {
        console.warn(`  ⚠ 题库 ${examId} 分类 ${cat} 只有 ${pool.length} 题，不足 ${n} 题，全部选取`);
      }
      picked.push(...pool.slice(0, Math.min(n, pool.length)));
    }
  } else {
    // 模式 2：按 pick_count 总数，各分类按比例分配
    const pickCount = exam.pick_count || allQuestions.length;

    if (pickCount >= allQuestions.length) {
      // 全部抽取，但打乱顺序
      picked.push(...allQuestions);
    } else {
      const categories = Object.keys(byCategory);
      const perCat = Math.floor(pickCount / categories.length);
      let remaining = pickCount - perCat * categories.length;

      for (const cat of categories) {
        const pool = byCategory[cat];
        const take = Math.min(pool.length, perCat + (remaining > 0 ? 1 : 0));
        if (take > perCat) remaining--;
        picked.push(...pool.slice(0, take));
      }

      // 如果还不够（某些分类题不够），从剩余题中补
      if (picked.length < pickCount) {
        const pickedIds = new Set(picked.map(q => q.id));
        const rest = allQuestions.filter(q => !pickedIds.has(q.id));
        for (let i = rest.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [rest[i], rest[j]] = [rest[j], rest[i]];
        }
        picked.push(...rest.slice(0, pickCount - picked.length));
      }
    }
  }

  // 最终再打乱一次顺序
  for (let i = picked.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [picked[i], picked[j]] = [picked[j], picked[i]];
  }

  return picked.map(q => q.id);
}

/** 自动判分 */
export function gradeAnswer(examId, questionId, userAnswer) {
  const q = getQuestion(examId, questionId);
  if (!q) return { score: 0, max_score: 0, error: 'question_not_found' };

  const answer = String(userAnswer).trim();
  let correct = false;

  switch (q.answer_type) {
    case 'exact':
      correct = answer === q.expected;
      break;
    case 'contains':
      correct = answer.toLowerCase().includes(q.expected.toLowerCase());
      break;
    case 'regex':
      try {
        correct = new RegExp(q.expected, 'i').test(answer);
      } catch {
        correct = false;
      }
      break;
    case 'json_match':
      try {
        const userObj = JSON.parse(answer);
        const expectedObj = JSON.parse(q.expected);
        correct = JSON.stringify(userObj) === JSON.stringify(expectedObj);
      } catch {
        correct = false;
      }
      break;
    default:
      correct = false;
  }

  return {
    score: correct ? q.score : 0,
    max_score: q.score,
    correct,
  };
}

/** 检查 examId 是否存在 */
export function examExists(examId) {
  return registry.has(examId);
}
