/**
 * ClawExam 试卷 v3 — 高级能力评测
 *
 * 2 个 category，每次考试全部出题（不抽题）
 * 重点考察：复杂推理 + 深度信息检索，减少简单 curl 类操作题
 *
 * reasoning : 5 题，每题 20 分  → 100 分
 * research  : 5 题，每题 20 分  → 100 分
 * 总计: 10 题，满分 200 分
 */

const exam = {
  id: 'v3',
  name: '高级能力评测 v3',
  description: '终极挑战：高难度复杂推理与深度信息检索，考验 AI Agent 的极限能力',
  version: '1.0.0',
  created_at: '2026-03-12',

  questions: [
    // ==================== 复杂推理 (reasoning) — 5 题，每题 20 分 ====================
    {
      id: 'reasoning-01',
      category: 'reasoning',
      question: '请用 JSON 格式回答以下多步推理题：\n\n有 5 栋不同颜色的房子排成一排（从左到右编号 1-5），每栋住着不同国籍的人，养不同的宠物，喝不同的饮料，抽不同的烟。\n已知条件：\n1. 英国人住红色房子\n2. 瑞典人养狗\n3. 丹麦人喝茶\n4. 绿色房子在白色房子的左边（紧邻）\n5. 绿色房子主人喝咖啡\n6. 抽 Pall Mall 的人养鸟\n7. 黄色房子主人抽 Dunhill\n8. 住中间房子（3号）的人喝牛奶\n9. 挪威人住第一栋房子\n10. 抽 Blends 的人住在养猫人的隔壁\n11. 养马的人住在抽 Dunhill 的人隔壁\n12. 抽 BlueMaster 的人喝啤酒\n13. 德国人抽 Prince\n14. 挪威人住在蓝色房子隔壁\n15. 抽 Blends 的人有一个邻居喝水\n\n问：谁养鱼？\n输出格式为 {"result": "国籍"}',
      answer_type: 'json_match',
      expected: '{"result":"德国人"}',
      score: 20,
      hint: '这是著名的爱因斯坦谜题，需要通过逻辑排除法逐步推导。'
    },
    {
      id: 'reasoning-02',
      category: 'reasoning',
      question: '请用 JSON 格式回答以下算法题：\n\n给定一个 4x4 数独的部分填充（0 表示空格）：\n[\n  [1, 0, 0, 4],\n  [0, 0, 1, 0],\n  [0, 1, 0, 0],\n  [4, 0, 0, 1]\n]\n规则：每行、每列、以及每个 2x2 宫格内，数字 1-4 各出现一次。\n请求解并输出完整的 4x4 矩阵。\n输出格式为 {"result": [[行1],[行2],[行3],[行4]]}',
      answer_type: 'json_match',
      expected: '{"result":[[1,2,3,4],[3,4,1,2],[2,1,4,3],[4,3,2,1]]}',
      score: 20,
      hint: '4x4 数独，需要满足行、列、2x2 宫格约束。'
    },
    {
      id: 'reasoning-03',
      category: 'reasoning',
      question: '请解决以下博弈论问题并用 JSON 格式回答：\n\n在一个"石头剪刀布"的变体游戏中，有 5 种手势：石头、剪刀、布、蜥蜴、斯波克。\n克制关系（A 克制 B 表示 A 赢 B）：\n- 剪刀 剪 布\n- 布 包 石头\n- 石头 碾 蜥蜴\n- 蜥蜴 毒 斯波克\n- 斯波克 砸 剪刀\n- 剪刀 斩 蜥蜴\n- 蜥蜴 吃 布\n- 布 否 斯波克\n- 斯波克 融 石头\n- 石头 碎 剪刀\n\n问：哪种手势能克制"斯波克"和"布"这两种手势？\n输出格式为 {"result": "手势名"}',
      answer_type: 'json_match',
      expected: '{"result":"蜥蜴"}',
      score: 20,
      hint: '找出同时克制斯波克和布的手势。'
    },
    {
      id: 'reasoning-04',
      category: 'reasoning',
      question: '请用 JSON 格式回答以下数学推理题：\n\n一个农夫要把狼、羊和白菜运到河对岸，船上每次只能载农夫加一样东西。\n约束：\n- 狼和羊不能单独在一起（狼吃羊）\n- 羊和白菜不能单独在一起（羊吃白菜）\n\n请给出最少步数的方案，每步描述农夫带什么过河或空船返回。\n格式要求：每步用 "带X过河" 或 "带X返回" 或 "空船返回" 表示。\n输出格式为 {"result": ["步骤1", "步骤2", ...], "total_steps": 数字}',
      answer_type: 'json_match',
      expected: '{"result":["带羊过河","空船返回","带白菜过河","带羊返回","带狼过河","空船返回","带羊过河"],"total_steps":7}',
      score: 20,
      hint: '经典渡河问题，关键是羊要来回运。最少需要 7 步。'
    },
    {
      id: 'reasoning-05',
      category: 'reasoning',
      question: '请用 JSON 格式回答以下逻辑推理题：\n\n有 A、B、C、D、E 五个人参加比赛，赛前五人分别做了预测：\n- A 说："B 是第一名，我是第三名"\n- B 说："我是第二名，E 是第四名"\n- C 说："我是第一名，D 是第二名"\n- D 说："C 是第五名，我是第三名"\n- E 说："我是第四名，A 是第一名"\n\n比赛结果：每个人都恰好猜对了一半（一句对一句错）。\n请给出最终排名（第1名到第5名）。\n输出格式为 {"result": {"1":"X","2":"X","3":"X","4":"X","5":"X"}}',
      answer_type: 'json_match',
      expected: '{"result":{"1":"A","2":"D","3":"B","4":"E","5":"C"}}',
      score: 20,
      hint: '逐一假设并验证，确保每人恰好猜对一半。'
    },

    // ==================== 深度信息检索 (research) — 5 题，每题 20 分 ====================
    {
      id: 'research-01',
      category: 'research',
      question: '请通过网络搜索，完成以下多步信息检索任务：\n\n1. 找到 Linux 内核 6.0 版本的正式发布日期\n2. 找到该日期当天，标普500指数（S&P 500）的收盘点位\n\n请按以下格式回答：\n第一行：Linux 6.0 发布日期（格式 YYYY-MM-DD）\n第二行：当天标普500收盘点位（精确到小数点后两位）\n\n用竖线分隔两个答案，格式为 "日期|点位"，如 "2022-10-02|3500.00"',
      answer_type: 'exact',
      expected: '2022-10-02|3585.62',
      score: 20,
      hint: 'Linux 6.0 在 2022 年 10 月发布。需要交叉检索两个领域的精确数据。'
    },
    {
      id: 'research-02',
      category: 'research',
      question: '请通过网络搜索，完成以下跨领域信息检索：\n\n2024 年图灵奖（ACM A.M. Turing Award）授予了哪位科学家？请回答：\n1. 获奖者英文全名\n2. 获奖者获得图灵奖时的所属机构（英文名称）\n\n用竖线分隔两个答案，格式为 "姓名|机构"',
      answer_type: 'regex',
      expected: 'Andrew\\s*(Chi-Chih)?\\s*Yao.*Tsinghua',
      score: 20,
      hint: '2024 年图灵奖（2025 年 3 月公布）与中国有密切关系。'
    },
    {
      id: 'research-03',
      category: 'research',
      question: '请通过网络搜索，回答以下精确数据检索题：\n\n根据 GitHub 官方公布的数据，截至 2024 年，GitHub 上使用最多的前三名编程语言分别是什么？\n\n请按排名顺序回答，用英文逗号分隔，如 "Language1,Language2,Language3"',
      answer_type: 'exact',
      expected: 'JavaScript,Python,TypeScript',
      score: 20,
      hint: '参考 GitHub Octoverse 2024 报告中的编程语言排名。'
    },
    {
      id: 'research-04',
      category: 'research',
      question: '请通过网络搜索，完成以下深度信息检索：\n\nOpenAI 的 GPT-4 论文（"GPT-4 Technical Report"）在 arXiv 上的编号是什么？\n请回答完整的 arXiv ID，格式如 "2303.XXXXX"',
      answer_type: 'exact',
      expected: '2303.08774',
      score: 20,
      hint: 'GPT-4 技术报告于 2023 年 3 月发布在 arXiv 上。'
    },
    {
      id: 'research-05',
      category: 'research',
      question: '请通过网络搜索，回答以下问题：\n\n在 2025 年 2 月，DeepSeek 发布了一篇关于其 DeepSeek-R1 推理模型的技术论文。\n\n请回答：\n1. 该论文的标题（英文）\n2. 论文中提到 DeepSeek-R1 在 AIME 2024（美国数学邀请赛）基准测试中的 pass@1 得分是多少百分比？\n\n用竖线分隔两个答案，格式为 "论文标题|得分"，得分格式如 "79.8%"',
      answer_type: 'regex',
      expected: 'DeepSeek-R1.*Incentiviz.*79\\.8%',
      score: 20,
      hint: 'DeepSeek-R1 是 2025 年初发布的推理模型，论文标题提到了 incentivizing reasoning。'
    },
  ],
};

export default exam;
