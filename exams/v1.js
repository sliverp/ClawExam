/**
 * ClawExam 试卷 v1 — 基础能力评测
 *
 * 3 个 category，每次考试按 pick_per_category 从各 category 中随机抽题
 * 同一 category 内每题分值相同，保证每次考试满分恒定 = 100 分
 *
 * basic   : 题库 10 题，每次抽 5 题，每题 4 分  → 20 分
 * tool    : 题库 10 题，每次抽 5 题，每题 6 分  → 30 分
 * complex : 题库 10 题，每次抽 5 题，每题 10 分 → 50 分
 * 总计: 15 题，满分 100 分
 */

const exam = {
  id: 'v1',
  name: '基础能力评测 v1',
  description: '覆盖基本常识、工具调用、复杂推理三大维度的基础评测。100分才能证明你的小龙虾小学毕业了哦~',
  version: '2.0.0',
  created_at: '2026-03-10',
  // 组卷规则：每个 category 抽取的题目数量（保证总分一致）
  pick_per_category: 5,

  // 勋章系统定义
  badges: [
    {
      id: 'graduate',
      name: '毕业证书',
      description: '总分达到 60% 以上，正式毕业',
      condition: { type: 'total_percent', min: 60 },
      icon: '',
    },
    {
      id: 'honor',
      name: '荣誉毕业',
      description: '总分达到 90% 以上，荣誉毕业',
      condition: { type: 'total_percent', min: 90 },
      icon: '',
    },
    {
      id: 'perfect',
      name: '满分传说',
      description: '取得满分 100 分',
      condition: { type: 'total_percent', min: 100 },
      icon: '',
    },
    {
      id: 'logic_master',
      name: '逻辑大师',
      description: 'complex 维度满分',
      condition: { type: 'category_percent', category: 'complex', min: 100 },
      icon: '',
    },
    {
      id: 'research_king',
      name: '搜索之王',
      description: 'tool 维度满分',
      condition: { type: 'category_percent', category: 'tool', min: 100 },
      icon: '',
    },
    {
      id: 'practical_ace',
      name: '实战高手',
      description: 'basic 维度满分',
      condition: { type: 'category_percent', category: 'basic', min: 100 },
      icon: '',
    },
    {
      id: 'speed_demon',
      name: '闪电龙虾',
      description: '在 5 分钟内完成全部考试',
      condition: { type: 'duration_seconds', max: 300 },
      icon: '',
    },
  ],

  questions: [
    // ==================== 基本常识 (basic) — 10 题，每题 4 分 ====================
    // --- 原始题目 (basic-01 ~ basic-05) ---
    {
      id: 'basic-01',
      category: 'basic',
      question: '请回答：HTTP 状态码 404 代表什么含义？请用四个字回答。',
      answer_type: 'contains',
      expected: '未找到',
      score: 4,
      hint: '答案是一个常见的 HTTP 错误描述，四个汉字。'
    },
    {
      id: 'basic-02',
      category: 'basic',
      question: '请回答：JSON 全称是什么？请用英文全称回答。',
      answer_type: 'contains',
      expected: 'JavaScript Object Notation',
      score: 4,
      hint: '答案是 JSON 的英文全称。'
    },
    {
      id: 'basic-03',
      category: 'basic',
      question: '请回答：在 Linux 中，查看当前目录下所有文件（包括隐藏文件）的命令是什么？只写命令，不需要解释。',
      answer_type: 'regex',
      expected: 'ls\\s+-[al]{1,2}a?',
      score: 4,
      hint: '答案是一个 ls 命令加参数。'
    },
    {
      id: 'basic-04',
      category: 'basic',
      question: '请回答：TCP 三次握手的第二步，服务端发送的报文包含哪两个标志位？用加号连接，如 A+B 的格式回答。',
      answer_type: 'regex',
      expected: 'SYN\\s*\\+\\s*ACK',
      score: 4,
      hint: '答案格式: XXX+XXX'
    },
    {
      id: 'basic-05',
      category: 'basic',
      question: '请计算：十六进制 0xFF 转换为十进制是多少？只回答数字。',
      answer_type: 'exact',
      expected: '255',
      score: 4,
      hint: '直接回答一个十进制数字。'
    },
    // --- 新增题目 (basic-06 ~ basic-10) ---
    {
      id: 'basic-06',
      category: 'basic',
      question: '请回答：HTTP 状态码 301 代表什么含义？请用四个字回答。',
      answer_type: 'contains',
      expected: '永久重定向',
      score: 4,
      hint: '答案是一个常见的 HTTP 重定向描述。'
    },
    {
      id: 'basic-07',
      category: 'basic',
      question: '请回答：DNS 的全称是什么？请用英文全称回答。',
      answer_type: 'contains',
      expected: 'Domain Name System',
      score: 4,
      hint: '答案是 DNS 的英文全称。'
    },
    {
      id: 'basic-08',
      category: 'basic',
      question: '请回答：在 Git 中，查看当前仓库所有分支（包括远程分支）的命令是什么？只写命令，不需要解释。',
      answer_type: 'regex',
      expected: 'git\\s+branch\\s+-a',
      score: 4,
      hint: '答案是一个 git 命令加参数。'
    },
    {
      id: 'basic-09',
      category: 'basic',
      question: '请回答：OSI 七层网络模型中，从下到上第四层是什么层？请用中文回答（两个字）。',
      answer_type: 'contains',
      expected: '传输',
      score: 4,
      hint: '答案是 OSI 模型第四层的中文名称。'
    },
    {
      id: 'basic-10',
      category: 'basic',
      question: '请计算：二进制 11001010 转换为十进制是多少？只回答数字。',
      answer_type: 'exact',
      expected: '202',
      score: 4,
      hint: '直接回答一个十进制数字。'
    },

    // ==================== 工具调用 (tool) — 10 题，每题 6 分 ====================
    // --- 原始题目 (tool-01 ~ tool-04，分值从 7/8 统一为 6) ---
    {
      id: 'tool-01',
      category: 'tool',
      question: '请使用你的浏览器工具（agent browser）访问 https://httpbin.org/get 并截图。将截图转为 base64 编码后，提交前 32 个字符作为答案。如果你无法截图，请提交该 URL 返回的 JSON 中 "url" 字段的值。',
      answer_type: 'regex',
      expected: '(^[A-Za-z0-9+/]{32}$)|(https://httpbin\\.org/get)',
      score: 6,
      hint: '使用浏览器截图工具，或直接访问该 URL 获取返回值。'
    },
    {
      id: 'tool-02',
      category: 'tool',
      question: '请使用工具执行以下 shell 命令并提交输出结果：echo "ClawExam-$(date +%Y)" 。只提交命令的输出，不需要解释。',
      answer_type: 'regex',
      expected: 'ClawExam-20[2-3][0-9]',
      score: 6,
      hint: '执行 shell 命令，提交其标准输出。'
    },
    {
      id: 'tool-03',
      category: 'tool',
      question: '请使用工具读取 https://httpbin.org/base64/Q2xhd0V4YW0gUGFzc2Vk 的内容，并提交返回的明文文本。',
      answer_type: 'contains',
      expected: 'ClawExam Passed',
      score: 6,
      hint: '这是一个 base64 解码接口，返回值是明文字符串。'
    },
    {
      id: 'tool-04',
      category: 'tool',
      question: '请使用工具对字符串 "openclaw" 计算 MD5 哈希值。只提交 32 位小写十六进制结果。',
      answer_type: 'exact',
      expected: 'eff9e2cb7b0c8c77402128571629eeee',
      score: 6,
      hint: '使用 md5 工具或命令计算，提交 32 位小写十六进制。'
    },
    // --- 新增题目 (tool-05 ~ tool-10) ---
    {
      id: 'tool-05',
      category: 'tool',
      question: '请使用工具执行以下操作：在终端中运行 python3 -c "print(sum(range(1,101)))" 并提交输出结果。只提交数字。',
      answer_type: 'exact',
      expected: '5050',
      score: 6,
      hint: '这是高斯求和 1+2+...+100。'
    },
    {
      id: 'tool-06',
      category: 'tool',
      question: '请使用工具执行 shell 命令：echo -n "hello world" | sha256sum | cut -d" " -f1 。只提交输出的哈希值。',
      answer_type: 'regex',
      expected: '^[a-f0-9]{64}$',
      score: 6,
      hint: '计算 "hello world" 的 SHA-256 哈希。'
    },
    {
      id: 'tool-07',
      category: 'tool',
      question: '请使用工具访问 https://httpbin.org/headers ，提交返回 JSON 中 "headers" 对象里 "Host" 字段的值。',
      answer_type: 'exact',
      expected: 'httpbin.org',
      score: 6,
      hint: 'HTTP 请求头中的 Host 字段。'
    },
    {
      id: 'tool-08',
      category: 'tool',
      question: '请使用工具执行以下命令并提交结果：echo "OpenClaw" | base64 。只提交 base64 编码后的字符串（不含换行）。',
      answer_type: 'contains',
      expected: 'T3BlbkNsYXc=',
      score: 6,
      hint: '对字符串进行 base64 编码。'
    },
    {
      id: 'tool-09',
      category: 'tool',
      question: '请使用工具执行：python3 -c "import platform; print(platform.system())" 并提交输出。只提交操作系统名称。',
      answer_type: 'regex',
      expected: '^(Linux|Darwin|Windows)$',
      score: 6,
      hint: '输出当前操作系统名称。'
    },
    {
      id: 'tool-10',
      category: 'tool',
      question: '请使用工具执行以下 shell 命令并提交结果：expr 17 \\* 23 + 42 。只提交计算结果数字。',
      answer_type: 'exact',
      expected: '433',
      score: 6,
      hint: '使用 expr 进行数学运算。'
    },

    // ==================== 复杂问题 (complex) — 10 题，每题 10 分 ====================
    // --- 原始题目 (complex-01 ~ complex-05) ---
    {
      id: 'complex-01',
      category: 'complex',
      question: '请用 JSON 格式回答以下问题：将数组 [3,1,4,1,5,9,2,6] 排序后去重，输出格式为 {"result": [排序后的数组]}',
      answer_type: 'json_match',
      expected: '{"result":[1,2,3,4,5,6,9]}',
      score: 10,
      hint: '输出必须是合法 JSON，数组元素为升序且无重复。'
    },
    {
      id: 'complex-02',
      category: 'complex',
      question: '请解析以下正则表达式匹配的内容：^(?:(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]\\d|\\d)\\.){3}(?:25[0-5]|2[0-4]\\d|1\\d{2}|[1-9]\\d|\\d)$ 。这个正则匹配的是什么格式？请用以下选项回答（只填字母）：A. 邮箱地址  B. IPv4 地址  C. MAC 地址  D. 手机号码',
      answer_type: 'exact',
      expected: 'B',
      score: 10,
      hint: '分析正则表达式的结构来判断。'
    },
    {
      id: 'complex-03',
      category: 'complex',
      question: '请编写一个函数的输出结果。函数定义：function f(n) { return n <= 1 ? n : f(n-1) + f(n-2); } 求 f(10) 的值。只回答数字。',
      answer_type: 'exact',
      expected: '55',
      score: 10,
      hint: '这是一个经典的递归函数。'
    },
    {
      id: 'complex-04',
      category: 'complex',
      question: '给定 SQL 表 users(id, name, age, city)，请写出一条 SQL 查询：查找每个城市中年龄最大的用户的姓名和城市。要求使用子查询或窗口函数，输出列为 name, city。只写 SELECT 语句，以分号结尾。',
      answer_type: 'regex',
      expected: 'SELECT.*name.*city.*FROM.*users',
      score: 10,
      hint: '使用 ROW_NUMBER() 窗口函数或相关子查询。'
    },
    {
      id: 'complex-05',
      category: 'complex',
      question: '请计算：一个完全二叉树有 1023 个节点，它的高度是多少？（根节点高度为 1）只回答数字。',
      answer_type: 'exact',
      expected: '10',
      score: 10,
      hint: '完全二叉树节点数 = 2^h - 1'
    },
    // --- 新增题目 (complex-06 ~ complex-10) ---
    {
      id: 'complex-06',
      category: 'complex',
      question: '请用 JSON 格式回答：将字符串 "aabbccddee" 中每个字符出现的次数统计出来，输出格式为 {"result": {"a":2,"b":2,...}}，按字母顺序排列。',
      answer_type: 'json_match',
      expected: '{"result":{"a":2,"b":2,"c":2,"d":2,"e":2}}',
      score: 10,
      hint: '统计每个字符出现次数。'
    },
    {
      id: 'complex-07',
      category: 'complex',
      question: '请计算以下表达式的值：Math.floor(Math.log2(1024)) + Math.ceil(Math.sqrt(80)) - parseInt("0x1A", 16)。只回答一个整数。',
      answer_type: 'exact',
      expected: '-7',
      score: 10,
      hint: 'log2(1024)=10, sqrt(80)≈8.94→ceil=9, 0x1A=26。10+9-26=-7。'
    },
    {
      id: 'complex-08',
      category: 'complex',
      question: '请用 JSON 格式回答：给定数组 [5,3,8,1,9,2,7]，执行一轮冒泡排序（从左到右比较相邻元素，若左>右则交换）后的数组是什么？输出格式为 {"result": [数组]}',
      answer_type: 'json_match',
      expected: '{"result":[3,5,1,8,2,7,9]}',
      score: 10,
      hint: '一轮冒泡排序会将最大值移到末尾。'
    },
    {
      id: 'complex-09',
      category: 'complex',
      question: '请计算：用动态规划求解，爬楼梯问题中一次可以爬 1 阶或 2 阶，爬到第 10 阶共有多少种不同的方法？只回答数字。',
      answer_type: 'exact',
      expected: '89',
      score: 10,
      hint: '这就是斐波那契数列 f(n)=f(n-1)+f(n-2)，f(1)=1, f(2)=2。'
    },
    {
      id: 'complex-10',
      category: 'complex',
      question: '请回答：在一个 8×8 的国际象棋棋盘上，最多能放置多少个互不攻击的皇后？只回答数字。',
      answer_type: 'exact',
      expected: '8',
      score: 10,
      hint: '这是经典的 N 皇后问题。'
    },
  ],
};

export default exam;
