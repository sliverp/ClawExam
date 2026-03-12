/**
 * ClawExam 试卷 v2 — 中级能力评测
 *
 * 4 个 category，每次考试按 pick_config 从各 category 中随机抽题
 * 同一 category 内每题分值相同，保证每次考试满分恒定 = 174 分
 *
 * computer : 题库 12 题，每次抽 4 题，每题 12 分  → 48 分
 * browser  : 题库 10 题，每次抽 3 题，每题 12 分  → 36 分
 * search   : 题库 14 题，每次抽 5 题，每题 12 分  → 60 分
 * complex  : 题库 8 题，每次抽 3 题，每题 10 分   → 30 分
 * 总计: 15 题，满分 174 分
 */

const exam = {
  id: 'v2',
  name: '中级能力评测 v2',
  description: '进阶评测：重点考察 Computer Use、Browser Use、信息检索和综合编码推理能力',
  version: '2.1.0',
  created_at: '2026-03-10',
  // 组卷规则：每个 category 各自的抽题数量（保证总分恒定 174）
  pick_config: {
    computer: 4,
    browser: 3,
    search: 5,
    complex: 3,
  },

  questions: [
    // ==================== Computer Use (computer) — 12 题，每题 12 分 ====================
    // --- 原始题目 (computer-01 ~ computer-06) ---
    {
      id: 'computer-01',
      category: 'computer',
      question: '请在终端中完成以下操作：\n1. 创建目录 /tmp/clawexam_v2\n2. 在该目录下创建文件 data.txt，内容为：\nApple 3\nBanana 7\nCherry 2\nDate 9\nElderberry 4\n3. 使用命令行工具（一行命令）对文件按第二列数字降序排序，然后取前 3 行，输出第一列（水果名），用逗号分隔拼接成一个字符串\n只提交最终拼接后的字符串。',
      answer_type: 'exact',
      expected: 'Date,Banana,Elderberry',
      score: 12,
      hint: '暂无提示'
    },
    {
      id: 'computer-02',
      category: 'computer',
      question: '请在终端执行以下操作：\n1. 创建文件 /tmp/clawexam_maze.py，写入一个 Python 脚本\n2. 脚本功能：给定邻接表 graph = {"A":["B","C"], "B":["A","D","E"], "C":["A","F"], "D":["B"], "E":["B","F"], "F":["C","E"]}，使用 BFS 找到从 "A" 到 "F" 的最短路径\n3. 脚本输出路径节点用 -> 连接，如 A->B->C\n4. 执行脚本并提交输出结果',
      answer_type: 'exact',
      expected: 'A->C->F',
      score: 12,
      hint: '暂无提示。'
    },
    {
      id: 'computer-03',
      category: 'computer',
      question: '请在终端执行以下操作：\n1. 创建文件 /tmp/clawexam_cipher.py，写入一个 Python 脚本\n2. 脚本功能：对字符串 "Gur Pynj Vf Haobhaq" 执行 ROT13 解码\n3. 执行脚本并提交解码后的结果字符串（保留大小写和空格）',
      answer_type: 'exact',
      expected: 'The Claw Is Unbound',
      score: 12,
      hint: '暂无提示'
    },
    {
      id: 'computer-04',
      category: 'computer',
      question: '请在终端执行以下操作链（用一条管道命令完成）：\n1. 使用 echo 输出字符串 "5f4dcc3b5aa765d61d8327deb882cf99"\n2. 将这个字符串中的每两个字符分组，取每组的第一个字符\n3. 将结果拼接成一个字符串\n只提交最终的字符串。',
      answer_type: 'exact',
      expected: '54c35a6d182db8c9',
      score: 12,
      hint: '暂无提示'
    },
    {
      id: 'computer-05',
      category: 'computer',
      question: '请在终端完成以下操作：\n1. 创建文件 /tmp/clawexam_matrix.py，写入一个 Python 脚本\n2. 脚本功能：给定 3x3 矩阵 [[1,2,3],[4,5,6],[7,8,9]]，计算其转置矩阵后，求转置矩阵主对角线与副对角线元素之和（主对角线 + 副对角线，重复元素只算一次）\n3. 执行脚本并提交结果数字',
      answer_type: 'exact',
      expected: '25',
      score: 12,
      hint: '先暂无提示。'
    },
    {
      id: 'computer-06',
      category: 'computer',
      question: '请在终端执行以下操作：\n1. 创建文件 /tmp/clawexam_nested.json，写入以下 JSON：\n{"departments":[{"name":"Engineering","teams":[{"name":"Backend","members":3},{"name":"Frontend","members":5},{"name":"DevOps","members":2}]},{"name":"Product","teams":[{"name":"Design","members":4},{"name":"PM","members":2}]},{"name":"Data","teams":[{"name":"ML","members":6},{"name":"Analytics","members":3}]}]}\n2. 使用 python3 或 jq 解析该 JSON，找出 members 总数最多的 department 名称\n只提交 department 名称。',
      answer_type: 'exact',
      expected: 'Engineering',
      score: 12,
      hint: '暂无提示。'
    },
    // --- 新增题目 (computer-07 ~ computer-12) ---
    {
      id: 'computer-07',
      category: 'computer',
      question: '请在终端执行以下操作：\n1. 创建文件 /tmp/clawexam_fib.py，写入 Python 脚本\n2. 脚本功能：生成斐波那契数列前 20 项（从 0, 1 开始），输出其中所有的偶数项之和\n3. 执行脚本并提交结果数字',
      answer_type: 'exact',
      expected: '3382',
      score: 12,
      hint: '暂无提示'
    },
    {
      id: 'computer-08',
      category: 'computer',
      question: '请在终端执行以下操作：\n1. 使用一行 shell 命令生成 1 到 50 的数字序列\n2. 筛选出其中能被 3 整除但不能被 5 整除的数\n3. 将结果数字用空格分隔输出\n只提交最终结果字符串。',
      answer_type: 'exact',
      expected: '3 6 9 12 18 21 24 27 33 36 39 42 48',
      score: 12,
      hint: '暂无提示'
    },
    {
      id: 'computer-09',
      category: 'computer',
      question: '请在终端执行以下操作：\n1. 创建文件 /tmp/clawexam_caesar.py，写入 Python 脚本\n2. 脚本功能：对字符串 "Khoor Zruog" 执行凯撒密码解密（左移 3 位）\n3. 执行脚本并提交解密后的字符串',
      answer_type: 'exact',
      expected: 'Hello World',
      score: 12,
      hint: '暂无提示'
    },
    {
      id: 'computer-10',
      category: 'computer',
      question: '请在终端执行以下操作：\n1. 创建文件 /tmp/clawexam_wordcount.txt，写入内容：\nhello world hello foo bar foo hello bar baz\n2. 使用命令行工具统计每个单词出现的次数，找出出现次数最多的单词\n只提交该单词。',
      answer_type: 'exact',
      expected: 'hello',
      score: 12,
      hint: '暂无提示'
    },
    {
      id: 'computer-11',
      category: 'computer',
      question: '请在终端执行以下操作：\n1. 创建文件 /tmp/clawexam_primes.py，写入 Python 脚本\n2. 脚本功能：找出 1 到 100 之间所有质数之和\n3. 执行脚本并提交结果数字',
      answer_type: 'exact',
      expected: '1060',
      score: 12,
      hint: '暂无提示'
    },
    {
      id: 'computer-12',
      category: 'computer',
      question: '请在终端执行以下操作：\n1. 使用 shell 命令将字符串 "The quick brown fox jumps over the lazy dog" 中的每个单词反转（单词顺序不变）\n2. 将结果输出为一行\n只提交最终的字符串。',
      answer_type: 'exact',
      expected: 'ehT kciuq nworb xof spmuj revo eht yzal god',
      score: 12,
      hint: '暂无提示'
    },

    // ==================== Browser Use (browser) — 10 题，每题 12 分 ====================
    // --- 原始题目 (browser-01 ~ browser-05) ---
    {
      id: 'browser-01',
      category: 'browser',
      question: '请使用 curl 或浏览器访问 https://httpbin.org/response-headers?X-Claw-Exam=v2_active&X-Claw-Level=intermediate ，从响应头（不是响应体）中提取 X-Claw-Level 的值。只提交该值。',
      answer_type: 'exact',
      expected: 'intermediate',
      score: 12,
      hint: '暂无提示'
    },
    {
      id: 'browser-02',
      category: 'browser',
      question: '请完成以下多步 HTTP 操作链：\n1. 访问 https://httpbin.org/uuid 获取一个 UUID\n2. 对该 UUID 字符串计算 MD5 哈希（包含连字符，不含引号和换行）\n3. 将 MD5 哈希值作为参数，访问 https://httpbin.org/anything/{MD5值}\n4. 从返回 JSON 的 "url" 字段中提取完整 URL\n提交该完整 URL。',
      answer_type: 'regex',
      expected: 'https://httpbin\\.org/anything/[a-f0-9]{32}',
      score: 12,
      hint: '暂无提示'
    },
    {
      id: 'browser-03',
      category: 'browser',
      question: '请使用 curl 完成以下操作：\n1. 向 https://httpbin.org/post 发送 POST 请求，请求体为 JSON：{"matrix":[[1,2],[3,4]],"op":"det"}\n2. 从返回结果的 "data" 字段中解析出你发送的 JSON 字符串\n3. 计算该 matrix 的行列式值（det）\n只提交行列式的值（一个整数）。',
      answer_type: 'exact',
      expected: '-2',
      score: 12,
      hint: '暂无提示'
    },
    {
      id: 'browser-04',
      category: 'browser',
      question: '请完成以下操作：\n1. 访问 https://httpbin.org/base64/eyJjaGFpbiI6WyJodHRwczovL2h0dHBiaW4ub3JnL2dldD9zdGVwPTIiLCJodHRwczovL2h0dHBiaW4ub3JnL2dldD9zdGVwPTMiXSwic2VjcmV0IjoiQ0xBVy1DSEFJTi1DT01QTEVURSJ9 解码\n2. 解析返回的 JSON，依次访问 "chain" 数组中的每个 URL\n3. 最后提交 JSON 中 "secret" 字段的值',
      answer_type: 'exact',
      expected: 'CLAW-CHAIN-COMPLETE',
      score: 12,
      hint: '暂无提示'
    },
    {
      id: 'browser-05',
      category: 'browser',
      question: '请使用 curl 完成以下操作（需要维护 cookie 会话）：\n1. 访问 https://httpbin.org/cookies/set/session_id/claw2026 设置 cookie\n2. 访问 https://httpbin.org/cookies/set/auth_level/admin 再设置一个 cookie\n3. 访问 https://httpbin.org/cookies 获取所有 cookies\n4. 将所有 cookie 的 value 按字母顺序排列，用 | 分隔\n只提交排列后的字符串。',
      answer_type: 'exact',
      expected: 'admin|claw2026',
      score: 12,
      hint: '暂无提示'
    },
    // --- 新增题目 (browser-06 ~ browser-10) ---
    {
      id: 'browser-06',
      category: 'browser',
      question: '请使用 curl 访问 https://httpbin.org/ip ，提交返回 JSON 中 "origin" 字段的值。',
      answer_type: 'regex',
      expected: '^[\\d\\.]+',
      score: 12,
      hint: '暂无提示'
    },
    {
      id: 'browser-07',
      category: 'browser',
      question: '请使用 curl 向 https://httpbin.org/post 发送 POST 请求，Content-Type 为 application/x-www-form-urlencoded，请求体为 name=ClawExam&version=2 。提交返回 JSON 中 "form" 对象里 "name" 字段的值。',
      answer_type: 'exact',
      expected: 'ClawExam',
      score: 12,
      hint: '暂无提示'
    },
    {
      id: 'browser-08',
      category: 'browser',
      question: '请使用 curl 访问 https://httpbin.org/status/418 ，提交 HTTP 响应状态码的数字。只提交数字。',
      answer_type: 'exact',
      expected: '418',
      score: 12,
      hint: '暂无提示'
    },
    {
      id: 'browser-09',
      category: 'browser',
      question: '请使用 curl 向 https://httpbin.org/anything 发送 PUT 请求，请求体为 JSON：{"action":"update","id":42}，提交返回 JSON 中 "method" 字段的值。',
      answer_type: 'exact',
      expected: 'PUT',
      score: 12,
      hint: '暂无提示'
    },
    {
      id: 'browser-10',
      category: 'browser',
      question: '请使用 curl 访问 https://httpbin.org/redirect/3 （会经过 3 次重定向），提交最终到达的 URL。只提交完整 URL。',
      answer_type: 'contains',
      expected: 'httpbin.org/get',
      score: 12,
      hint: '暂无提示'
    },

    // ==================== 信息检索 (search) — 14 题，每题 12 分 ====================
    // --- 原始题目 (search-01 ~ search-07) ---
    {
      id: 'search-01',
      category: 'search',
      question: '请通过网络搜索查询：港股腾讯控股（股票代码 0700.HK）在 2025 年 1 月 2 日（港股 2025 年首个交易日）的收盘价是多少港元？\n只提交数字，精确到小数点后一位，如 "700.0"。',
      answer_type: 'exact',
      expected: '416.0',
      score: 12,
      hint: '需要搜索港股历史行情数据。注意 1 月 1 日是元旦休市，首个交易日是 1 月 2 日。'
    },
    {
      id: 'search-02',
      category: 'search',
      question: '请通过网络搜索查询：A股贵州茅台（股票代码 600519）在 2025 年 1 月 2 日的收盘价是多少元人民币？\n只提交数字，精确到小数点后一位，如 "2000.0"。',
      answer_type: 'exact',
      expected: '1488.0',
      score: 12,
      hint: '需要搜索 A 股历史行情数据。'
    },
    {
      id: 'search-03',
      category: 'search',
      question: '请通过网络搜索查询：恒生指数在 2025 年 1 月 2 日的收盘点位是多少？\n只提交数字，精确到小数点后两位，如 "19623.32"。',
      answer_type: 'exact',
      expected: '19623.32',
      score: 12,
      hint: '需要搜索恒生指数历史数据。'
    },
    {
      id: 'search-04',
      category: 'search',
      question: '请通过网络搜索查询：2024 年诺贝尔物理学奖授予了哪两位科学家？请按姓氏字母顺序回答，用英文逗号加空格分隔两人的全名。\n格式示例："Albert Einstein, Niels Bohr"',
      answer_type: 'regex',
      expected: '^Geoffrey\\s+(Everest\\s+)?Hinton,\\s*John\\s+(Joseph\\s+)?Hopfield$',
      score: 12,
      hint: '2024 年诺贝尔物理学奖与人工智能/神经网络有关。'
    },
    {
      id: 'search-05',
      category: 'search',
      question: '请通过网络搜索查询：根据中国国家统计局公布的数据，2024 年全年中国国内生产总值（GDP）是多少亿元人民币？\n只提交整数，如 "10000"。',
      answer_type: 'exact',
      expected: '1349084',
      score: 12,
      hint: '国家统计局 2025 年 1 月 17 日发布了 2024 年经济数据。'
    },
    {
      id: 'search-06',
      category: 'search',
      question: '请通过网络搜索查询：SpaceX 星舰（Starship）在 2024 年实现了超重型助推器（Super Heavy Booster）被发射塔机械臂（"筷子"）成功捕获回收，这是星舰的第几次试飞？\n只提交数字，如 "5"。',
      answer_type: 'exact',
      expected: '5',
      score: 12,
      hint: '这次历史性的回收发生在 2024 年 10 月。'
    },
    {
      id: 'search-07',
      category: 'search',
      question: '请通过网络搜索查询：2024 年全球电影票房排名第一的电影是哪部？请回答中文片名（不含书名号）。',
      answer_type: 'exact',
      expected: '头脑特工队2',
      score: 12,
      hint: '这是一部皮克斯动画电影的续集。'
    },
    // --- 新增题目 (search-08 ~ search-14) ---
    {
      id: 'search-08',
      category: 'search',
      question: '请通过网络搜索查询：2024 年诺贝尔化学奖授予的科学家中，有一位与 Google DeepMind 相关，他的名字是什么？请回答全名（英文）。',
      answer_type: 'contains',
      expected: 'Demis Hassabis',
      score: 12,
      hint: '2024 年诺贝尔化学奖与蛋白质结构预测有关。'
    },
    {
      id: 'search-09',
      category: 'search',
      question: '请通过网络搜索查询：2024 年欧洲足球锦标赛（欧洲杯）的冠军是哪个国家队？请回答中文国家名。',
      answer_type: 'exact',
      expected: '西班牙',
      score: 12,
      hint: '2024 年欧洲杯在德国举办。'
    },
    {
      id: 'search-10',
      category: 'search',
      question: '请通过网络搜索查询：Python 3.12 版本是在哪一年哪一月正式发布的？请回答格式为 "YYYY-MM"。',
      answer_type: 'exact',
      expected: '2023-10',
      score: 12,
      hint: 'Python 3.12 在 2023 年下半年发布。'
    },
    {
      id: 'search-11',
      category: 'search',
      question: '请通过网络搜索查询：2024 年巴黎奥运会中国代表团共获得多少枚金牌？只提交数字。',
      answer_type: 'exact',
      expected: '40',
      score: 12,
      hint: '2024 年夏季奥运会在巴黎举办。'
    },
    {
      id: 'search-12',
      category: 'search',
      question: '请通过网络搜索查询：Node.js 22 LTS 版本的代号（codename）是什么？只提交代号名称（一个英文单词）。',
      answer_type: 'exact',
      expected: 'Jod',
      score: 12,
      hint: 'Node.js LTS 版本都有代号。'
    },
    {
      id: 'search-13',
      category: 'search',
      question: '请通过网络搜索查询：2024 年诺贝尔文学奖授予了哪位作家？请回答中文译名。',
      answer_type: 'contains',
      expected: '韩江',
      score: 12,
      hint: '2024 年诺贝尔文学奖获得者是一位韩国作家。'
    },
    {
      id: 'search-14',
      category: 'search',
      question: '请通过网络搜索查询：2024 年 F1 世界一级方程式锦标赛车手总冠军是谁？请回答英文全名。',
      answer_type: 'contains',
      expected: 'Max Verstappen',
      score: 12,
      hint: '这位车手来自红牛车队。'
    },

    // ==================== 综合推理与编码 (complex) — 8 题，每题 10 分 ====================
    // --- 原始题目 (complex-01 ~ complex-04) ---
    {
      id: 'complex-01',
      category: 'complex',
      question: '请用 JSON 格式回答：对数组 [12, 7, 25, 3, 18, 9, 31, 6, 14, 22] 执行以下处理链：\n1. 移除所有质数\n2. 将剩余数字各自的数位求和（如 25 → 2+5=7）\n3. 对结果去重并升序排列\n输出格式为 {"result": [处理后的数组]}',
      answer_type: 'json_match',
      expected: '{"result":[3,4,5,6,7,9]}',
      score: 10,
      hint: '先判断质数，再数位求和。'
    },
    {
      id: 'complex-02',
      category: 'complex',
      question: '请用 JSON 格式回答：\n给定有向图邻接表 {"A":["B","C"], "B":["D"], "C":["D","E"], "D":["F"], "E":["F"], "F":[]}，列出从 A 到 F 的所有可能路径（按字典序排列）。\n输出格式为 {"result": ["A->B->D->F", "A->...->F", ...]}',
      answer_type: 'json_match',
      expected: '{"result":["A->B->D->F","A->C->D->F","A->C->E->F"]}',
      score: 10,
      hint: 'DFS 枚举所有路径。'
    },
    {
      id: 'complex-03',
      category: 'complex',
      question: '请用 JSON 格式回答：实现一个简易版 RLE（Run-Length Encoding）压缩。\n对字符串 "aaabbbccdddddeef" 进行 RLE 编码，格式为 "字符次数字符次数..."（次数为1时省略次数）。\n输出格式为 {"result": "编码结果"}',
      answer_type: 'json_match',
      expected: '{"result":"3a3b2c5d2ef"}',
      score: 10,
      hint: '连续相同字符计数，单个字符省略计数。'
    },
    {
      id: 'complex-04',
      category: 'complex',
      question: '请计算以下嵌套表达式的值：\n\nfloor(sqrt(sum([i**2 for i in range(1, 11)]))) + ceil(log2(1024)) - len(set("mississippi"))\n\n其中 floor=向下取整, ceil=向上取整, sqrt=开平方, log2=以2为底的对数, set=去重集合, len=长度。只回答一个整数。',
      answer_type: 'exact',
      expected: '25',
      score: 10,
      hint: '分别计算每个子表达式再组合。'
    },
    // --- 新增题目 (complex-05 ~ complex-08) ---
    {
      id: 'complex-05',
      category: 'complex',
      question: '请用 JSON 格式回答：给定二叉树的前序遍历 [1,2,4,5,3,6,7] 和中序遍历 [4,2,5,1,6,3,7]，求该二叉树的后序遍历结果。\n输出格式为 {"result": [后序遍历数组]}',
      answer_type: 'json_match',
      expected: '{"result":[4,5,2,6,7,3,1]}',
      score: 10,
      hint: '根据前序和中序还原二叉树结构。'
    },
    {
      id: 'complex-06',
      category: 'complex',
      question: '请用 JSON 格式回答：将罗马数字 "MCMXCIV" 转换为阿拉伯数字。\n输出格式为 {"result": 数字}',
      answer_type: 'json_match',
      expected: '{"result":1994}',
      score: 10,
      hint: 'M=1000, CM=900, XC=90, IV=4。'
    },
    {
      id: 'complex-07',
      category: 'complex',
      question: '请计算：有 6 个人排成一排照相，要求甲和乙必须相邻，丙和丁不能相邻，共有多少种排列方式？只回答一个整数。',
      answer_type: 'exact',
      expected: '144',
      score: 10,
      hint: '先用捆绑法处理甲乙相邻，再用容斥法处理丙丁不相邻。'
    },
    {
      id: 'complex-08',
      category: 'complex',
      question: '请用 JSON 格式回答：使用动态规划求解 0-1 背包问题。\n物品：[{weight:2, value:3}, {weight:3, value:4}, {weight:4, value:5}, {weight:5, value:8}]\n背包容量：10\n求最大价值。输出格式为 {"result": 数字}',
      answer_type: 'json_match',
      expected: '{"result":15}',
      score: 10,
      hint: '经典 0-1 背包问题。'
    },
  ],
};

export default exam;
