/**
 * ClawExam 试卷 v3 — 龙虾毕业考试
 *
 * 终极毕业考试：综合考察推理、信息检索、实战操作能力
 * 达到 60 分以上颁发毕业证书，并根据表现授予勋章
 *
 * 3 个 category，题库冗余，每次随机抽题
 * reasoning : 题库 5 题，每次抽 2 题，每题 20 分
 * research  : 题库 3 题，每次抽 2 题，每题 20 分
 * practical : 题库 2 题，每次抽 2 题，每题 20 分
 * 每次考试: 6 题，满分 120 分，72 分及格（60%）
 */

const exam = {
  id: 'v3',
  name: '龙虾毕业考试',
  description: '终极毕业挑战：通过推理、检索、实战三大维度的考验，获得龙虾毕业证书与专属勋章',
  version: '1.0.0',
  created_at: '2026-03-12',

  // 随机组题：每个 category 各抽 2 题，共 6 题
  pick_config: {
    reasoning: 2,
    research: 2,
    practical: 2,
  },

  // 毕业线：60%
  pass_percent: 60,

  // 勋章系统定义
  // 达成条件后授予对应勋章，素材路径后续填入
  badges: [
    {
      id: 'graduate',
      name: '毕业证书',
      description: '总分达到 60% 以上，正式毕业',
      condition: { type: 'total_percent', min: 60 },
      icon: '', // TODO: 素材待填入
    },
    {
      id: 'honor',
      name: '荣誉毕业',
      description: '总分达到 90% 以上，荣誉毕业',
      condition: { type: 'total_percent', min: 90 },
      icon: '', // TODO: 素材待填入
    },
    {
      id: 'perfect',
      name: '满分传说',
      description: '取得满分 120 分',
      condition: { type: 'total_percent', min: 100 },
      icon: '', // TODO: 素材待填入
    },
    {
      id: 'logic_master',
      name: '逻辑大师',
      description: 'reasoning 维度满分',
      condition: { type: 'category_percent', category: 'reasoning', min: 100 },
      icon: '', // TODO: 素材待填入
    },
    {
      id: 'research_king',
      name: '搜索之王',
      description: 'research 维度满分',
      condition: { type: 'category_percent', category: 'research', min: 100 },
      icon: '', // TODO: 素材待填入
    },
    {
      id: 'practical_ace',
      name: '实战高手',
      description: 'practical 维度满分',
      condition: { type: 'category_percent', category: 'practical', min: 100 },
      icon: '', // TODO: 素材待填入
    },
    {
      id: 'speed_demon',
      name: '闪电龙虾',
      description: '在 5 分钟内完成全部考试',
      condition: { type: 'duration_seconds', max: 300 },
      icon: '', // TODO: 素材待填入
    },
  ],

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
      question: '请用 JSON 格式回答以下逻辑推理题：\n\n有 A、B、C、D、E 五个人参加比赛，赛前五人分别做了预测：\n- A 说："B 是第一名，我是第三名"\n- B 说："我是第二名，E 是第四名"\n- C 说："我是第一名，D 是第二名"\n- D 说："C 是第五名，我是第三名"\n- E 说："我是第四名，A 是第一名"\n\n比赛结果：每个人都恰好猜对了一半（一句对一句错）。\n请给出最终排名（第1名到第5名）。\n输出格式为 {"result": {"1":"X","2":"X","3":"X","4":"X","5":"X"}}',
      answer_type: 'json_match',
      expected: '{"result":{"1":"A","2":"D","3":"B","4":"E","5":"C"}}',
      score: 20,
      hint: '逐一假设并验证，确保每人恰好猜对一半。'
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
      question: '请计算以下嵌套表达式的值：\n\nfloor(sqrt(sum([i**2 for i in range(1, 11)]))) + ceil(log2(1024)) - len(set("mississippi"))\n\n其中 floor=向下取整, ceil=向上取整, sqrt=开平方, log2=以2为底的对数, set=去重集合, len=长度。只回答一个整数。',
      answer_type: 'exact',
      expected: '25',
      score: 20,
      hint: 'sum([1,4,9,16,25,36,49,64,81,100])=385, sqrt(385)≈19.62→floor=19, log2(1024)=10→ceil=10, set("mississippi")={m,i,s,p}→len=4。19+10-4=25。'
    },

    // ==================== 深度信息检索 (research) — 3 题，每题 20 分 ====================
    {
      id: 'research-01',
      category: 'research',
      question: '请在 B 站（bilibili.com）搜索 UP 主"毕导"的账号，找到他的 UID（数字ID）。\n只提交 UID 数字。',
      answer_type: 'exact',
      expected: '254463269',
      score: 20,
      hint: '暂无提示'
    },
    {
      id: 'research-06',
      category: 'research',
      question: '请访问 OpenAI 官方网站（openai.com）的 Research 页面，在页面中搜索与 "clip" 相关的研究文章，找到其中最旧的那一篇。\n\n请返回该文章的完整标题（英文）。',
      answer_type: 'regex',
      expected: 'Block-sparse GPU [Kk]ernels|Block-Sparse GPU [Kk]ernels',
      score: 20,
      hint: '访问 openai.com 的 Research 页面，使用搜索功能筛选 "clip" 关键词，按时间排序找到最旧的文章。'
    },
    {
      id: 'research-07',
      category: 'research',
      question: '请访问微博（weibo.com），搜索"微软中国"官方账号，找到其在 2023 年 4 月 14 日发布的一条微博。\n\n该微博的评论区中有一条奇怪的评论，里面包含 12 位字符。\n\n请返回这 12 位字符。',
      answer_type: 'exact',
      expected: 'A1B2C3D4E5F6',
      score: 20,
      hint: '前往微博搜索微软中国官方账号，浏览其 2023 年 4 月 14 日的帖子，仔细查看评论区。'
    },

    // ==================== 实战操作 (practical) — 2 题，每题 20 分 ====================
    {
      id: 'practical-01',
      category: 'practical',
      question: '请在微博（weibo.com）上找到刘亦菲的官方账号，获取她的头像图片（172×172 大小）。\n\n将该头像图片转为 Base64 编码（含 Data URI 前缀），然后返回前 64 个字符。\n\n注意：前 64 个字符包含 "data:image/png;base64," 前缀部分。',
      answer_type: 'exact',
      expected: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAALMAAACzCAIAAA',
      score: 20,
      hint: '前往微博搜索刘亦菲官方账号，获取头像图片 URL（注意选择 179×179 尺寸），下载后用 base64 编码工具转换为 Data URI 格式，取前 64 个字符（含 data:image/png;base64, 前缀）。'
    },
    {
      id: 'practical-02',
      category: 'practical',
      question: '请前往 GitHub 仓库 https://github.com/sliverp/ClawExamAnswerSheet\n\n在该仓库下提交一个 Issue，要求：\n- Issue 的标题必须是你的准考证号（即 exam_token）\n- Issue 内容不限\n\n提交成功后，请返回该 Issue 的编号（纯数字，如 "1"、"2"、"3"）。\n\n系统会自动验证该 Issue 是否存在，以及标题是否为你的准考证号。',
      answer_type: 'custom',
      expected: null,
      score: 20,
      hint: '前往 GitHub 仓库页面，点击 Issues → New Issue，将你的准考证号作为标题提交，然后返回 Issue 编号。',
      validator: async (answer, context) => {
        const issueNumber = String(answer).trim();
        if (!/^\d+$/.test(issueNumber)) return false;
        const examToken = context.exam_token;
        if (!examToken) return false;
        try {
          const resp = await fetch(
            `https://api.github.com/repos/sliverp/ClawExamAnswerSheet/issues/${issueNumber}`,
            { headers: { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'ClawExam' } }
          );
          if (!resp.ok) return false;
          const data = await resp.json();
          return data.title && data.title.trim().toLowerCase() === examToken.toLowerCase();
        } catch {
          return false;
        }
      }
    },
  ],
};

export default exam;
