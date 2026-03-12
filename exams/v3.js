/**
 * ClawExam 试卷 v3 — 龙虾毕业考试
 *
 * 终极毕业考试：综合考察推理、信息检索、实战操作能力
 * 达到 60 分以上颁发毕业证书，并根据表现授予勋章
 *
 * 3 个 category，题库冗余，每次随机抽题
 * reasoning : 题库 5 题，每次抽 2 题，每题 20 分
 * research  : 题库 7 题，每次抽 2 题，每题 20 分
 * practical : 题库 5 题，每次抽 2 题，每题 20 分
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

    // ==================== 深度信息检索 (research) — 5 题，每题 20 分 ====================
    {
      id: 'research-01',
      category: 'research',
      question: '请在 B 站（bilibili.com）搜索 UP 主"毕导"的账号，找到他的 UID（数字ID）。\n只提交 UID 数字。',
      answer_type: 'exact',
      expected: '254463269',
      score: 20,
      hint: '毕导是 B 站知名科普 UP 主，清华大学化工系博士。他的个人空间 URL 中包含 UID。'
    },
    {
      id: 'research-02',
      category: 'research',
      question: '请通过网络搜索，完成以下多步信息检索任务：\n\n1. 找到 Linux 内核 6.0 版本的正式发布日期\n2. 找到该日期当天，标普500指数（S&P 500）的收盘点位\n\n请按以下格式回答：\n第一行：Linux 6.0 发布日期（格式 YYYY-MM-DD）\n第二行：当天标普500收盘点位（精确到小数点后两位）\n\n用竖线分隔两个答案，格式为 "日期|点位"，如 "2022-10-02|3500.00"',
      answer_type: 'exact',
      expected: '2022-10-02|3585.62',
      score: 20,
      hint: 'Linux 6.0 在 2022 年 10 月发布。需要交叉检索两个领域的精确数据。'
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

    // ==================== 实战操作 (practical) — 5 题，每题 20 分 ====================
    {
      id: 'practical-01',
      category: 'practical',
      question: '请制作一个 Excel 表格（.xlsx 格式），保存到 /tmp/clawexam_hk0700.xlsx。\n\n表格要求：\n- 第一列标题为"日期"，第二列标题为"收盘价(港元)"\n- 收录港股腾讯控股（0700.HK）在 2024 年 1 月 1 日到 2024 年 1 月 31 日期间，所有开盘日（交易日）的收盘价格\n- 收盘价精确到一位小数点\n- 日期格式为 YYYY-MM-DD\n\n完成后，请读取该文件，将第一个交易日和最后一个交易日的收盘价用竖线分隔提交。\n格式如 "298.8|273.8"',
      answer_type: 'regex',
      expected: '29[5-9]\\.[0-9]\\|27[0-9]\\.[0-9]',
      score: 20,
      hint: '2024 年 1 月 1 日是元旦休市。港股首个交易日是 1 月 2 日，最后一个交易日是 1 月 31 日。需要安装 openpyxl 或 xlsxwriter 来创建 Excel 文件。'
    },
    {
      id: 'practical-02',
      category: 'practical',
      question: '请在终端执行以下操作：\n1. 创建文件 /tmp/clawexam_grad.py，写入一个 Python 脚本\n2. 脚本功能：模拟一个简易的成绩管理系统，给定以下学生成绩数据：\n   students = [\n     {"name": "Alice", "math": 92, "english": 88, "science": 95},\n     {"name": "Bob", "math": 78, "english": 92, "science": 80},\n     {"name": "Charlie", "math": 95, "english": 76, "science": 88},\n     {"name": "Diana", "math": 88, "english": 95, "science": 92},\n     {"name": "Eve", "math": 90, "english": 85, "science": 78}\n   ]\n3. 计算每个学生的加权平均分（math 权重 0.4, english 权重 0.3, science 权重 0.3）\n4. 输出加权平均分最高的学生姓名和分数\n格式为 "姓名:分数"，分数精确到一位小数，如 "Alice:91.7"',
      answer_type: 'exact',
      expected: 'Diana:91.3',
      score: 20,
      hint: 'Diana: 88*0.4+95*0.3+92*0.3 = 35.2+28.5+27.6 = 91.3'
    },
    {
      id: 'practical-03',
      category: 'practical',
      question: '请在终端完成以下操作：\n1. 创建文件 /tmp/clawexam_api.json，写入以下 JSON 数据：\n{"users":[{"id":1,"name":"张三","orders":[{"product":"手机","price":5999},{"product":"耳机","price":299}]},{"id":2,"name":"李四","orders":[{"product":"笔记本","price":8999},{"product":"鼠标","price":149},{"product":"键盘","price":599}]},{"id":3,"name":"王五","orders":[{"product":"平板","price":3999}]}]}\n2. 使用 Python 或 jq 解析该 JSON\n3. 找出消费总金额最高的用户，输出其姓名和总消费金额\n格式为 "姓名:金额"，如 "张三:6298"',
      answer_type: 'exact',
      expected: '李四:9747',
      score: 20,
      hint: '张三: 5999+299=6298, 李四: 8999+149+599=9747, 王五: 3999。'
    },
    {
      id: 'practical-04',
      category: 'practical',
      question: '请在终端完成以下操作：\n1. 创建文件 /tmp/clawexam_log.txt，写入以下模拟日志内容（每行一条）：\n2026-03-12 10:00:01 ERROR Database connection failed\n2026-03-12 10:00:05 INFO Server started on port 3000\n2026-03-12 10:00:12 WARN Memory usage above 80%\n2026-03-12 10:01:03 ERROR Timeout waiting for response\n2026-03-12 10:01:15 INFO Request processed successfully\n2026-03-12 10:02:00 ERROR Disk space critically low\n2026-03-12 10:02:30 WARN CPU usage spike detected\n2026-03-12 10:03:00 INFO Backup completed\n2026-03-12 10:03:45 ERROR Authentication service unavailable\n2026-03-12 10:04:00 INFO Cache cleared\n2. 使用命令行工具统计：ERROR 出现的次数、WARN 出现的次数、INFO 出现的次数\n3. 输出格式为 "ERROR:次数,WARN:次数,INFO:次数"',
      answer_type: 'exact',
      expected: 'ERROR:4,WARN:2,INFO:4',
      score: 20,
      hint: '使用 grep -c 或 awk 统计各级别日志出现次数。'
    },
    {
      id: 'practical-05',
      category: 'practical',
      question: '请在终端执行以下操作：\n1. 创建文件 /tmp/clawexam_crypto.py，写入 Python 脚本\n2. 脚本功能：\n   a. 生成字符串 "ClawExam-Graduation-2026" 的 SHA256 哈希值（小写十六进制）\n   b. 取哈希值的前 16 个字符作为密钥\n   c. 用这个密钥对字符串 "I graduated from ClawExam!" 进行简单异或加密（XOR），输出加密结果的十六进制表示\n3. 执行脚本并提交 SHA256 哈希值的前 16 个字符\n只提交前 16 个字符。',
      answer_type: 'regex',
      expected: '^[a-f0-9]{16}$',
      score: 20,
      hint: '使用 Python hashlib.sha256 计算哈希，然后取前 16 个字符。'
    },
  ],
};

export default exam;
