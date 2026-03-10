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

  registry.set(exam.id, {
    ...exam,
    total_questions: exam.questions.length,
    total_score: totalScore,
    categories,
  });

  console.log(`  📝 加载试卷: ${exam.id} — ${exam.name} (${exam.questions.length} 题, ${totalScore} 分)`);
}

function categoryLabel(cat) {
  const map = { basic: '基本常识', tool: '工具调用', complex: '复杂推理', computer: 'Computer Use', browser: 'Browser Use', search: '信息检索' };
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

/** 获取指定试卷的某题 */
export function getQuestion(examId, questionId) {
  const exam = registry.get(examId);
  if (!exam) return null;
  return exam.questions.find(q => q.id === questionId) || null;
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
