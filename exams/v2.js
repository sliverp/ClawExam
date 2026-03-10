/**
 * ClawExam 试卷 v2 — 中级能力评测
 *
 * 比 v1 难度更高，重点考察 Computer Use（终端/文件/系统操作）和 Browser Use（网页访问/数据提取）
 * 以及综合推理编码能力
 */

const exam = {
  id: 'v2',
  name: '中级能力评测 v2',
  description: '进阶评测：重点考察 Computer Use、Browser Use 和综合编码推理能力',
  version: '1.0.0',
  created_at: '2026-03-10',

  questions: [
    // ==================== Computer Use (computer) ====================
    {
      id: 'computer-01',
      category: 'computer',
      question: '请在终端中完成以下操作：\n1. 创建目录 /tmp/clawexam_v2\n2. 在该目录下创建文件 data.txt，内容为：\nApple 3\nBanana 7\nCherry 2\nDate 9\nElderberry 4\n3. 使用命令行工具（一行命令）对文件按第二列数字降序排序，然后取前 3 行，输出第一列（水果名），用逗号分隔拼接成一个字符串\n只提交最终拼接后的字符串。',
      answer_type: 'exact',
      expected: 'Date,Banana,Elderberry',
      score: 7,
      hint: '对第二列数值排序后截取并拼接。'
    },
    {
      id: 'computer-02',
      category: 'computer',
      question: '请在终端执行以下操作：\n1. 创建文件 /tmp/clawexam_maze.py，写入一个 Python 脚本\n2. 脚本功能：给定邻接表 graph = {"A":["B","C"], "B":["A","D","E"], "C":["A","F"], "D":["B"], "E":["B","F"], "F":["C","E"]}，使用 BFS 找到从 "A" 到 "F" 的最短路径\n3. 脚本输出路径节点用 -> 连接，如 A->B->C\n4. 执行脚本并提交输出结果',
      answer_type: 'exact',
      expected: 'A->C->F',
      score: 8,
      hint: 'BFS 求最短路径。'
    },
    {
      id: 'computer-03',
      category: 'computer',
      question: '请在终端执行以下操作：\n1. 创建文件 /tmp/clawexam_cipher.py，写入一个 Python 脚本\n2. 脚本功能：对字符串 "Gur Pynj Vf Haobhaq" 执行 ROT13 解码\n3. 执行脚本并提交解码后的结果字符串（保留大小写和空格）',
      answer_type: 'exact',
      expected: 'The Claw Is Unbound',
      score: 7,
      hint: 'ROT13 是一种字母替换密码。'
    },
    {
      id: 'computer-04',
      category: 'computer',
      question: '请在终端执行以下操作链（用一条管道命令完成）：\n1. 使用 echo 输出字符串 "5f4dcc3b5aa765d61d8327deb882cf99"\n2. 将这个字符串中的每两个字符分组，取每组的第一个字符\n3. 将结果拼接成一个字符串\n只提交最终的字符串。',
      answer_type: 'exact',
      expected: '54c35a6d182db8c9',
      score: 7,
      hint: '每两位取首字符。'
    },
    {
      id: 'computer-05',
      category: 'computer',
      question: '请在终端完成以下操作：\n1. 创建文件 /tmp/clawexam_matrix.py，写入一个 Python 脚本\n2. 脚本功能：给定 3x3 矩阵 [[1,2,3],[4,5,6],[7,8,9]]，计算其转置矩阵后，求转置矩阵主对角线与副对角线元素之和（主对角线 + 副对角线，重复元素只算一次）\n3. 执行脚本并提交结果数字',
      answer_type: 'exact',
      expected: '25',
      score: 7,
      hint: '先转置，再求两条对角线元素的并集之和。'
    },
    {
      id: 'computer-06',
      category: 'computer',
      question: '请在终端执行以下操作：\n1. 创建文件 /tmp/clawexam_nested.json，写入以下 JSON：\n{"departments":[{"name":"Engineering","teams":[{"name":"Backend","members":3},{"name":"Frontend","members":5},{"name":"DevOps","members":2}]},{"name":"Product","teams":[{"name":"Design","members":4},{"name":"PM","members":2}]},{"name":"Data","teams":[{"name":"ML","members":6},{"name":"Analytics","members":3}]}]}\n2. 使用 python3 或 jq 解析该 JSON，找出 members 总数最多的 department 名称\n只提交 department 名称。',
      answer_type: 'exact',
      expected: 'Engineering',
      score: 7,
      hint: '对每个 department 下 teams 的 members 求和，取最大的。'
    },

    // ==================== Browser Use (browser) ====================
    {
      id: 'browser-01',
      category: 'browser',
      question: '请使用 curl 或浏览器访问 https://httpbin.org/response-headers?X-Claw-Exam=v2_active&X-Claw-Level=intermediate ，从响应头（不是响应体）中提取 X-Claw-Level 的值。只提交该值。',
      answer_type: 'exact',
      expected: 'intermediate',
      score: 6,
      hint: '注意区分响应头和响应体。'
    },
    {
      id: 'browser-02',
      category: 'browser',
      question: '请完成以下多步 HTTP 操作链：\n1. 访问 https://httpbin.org/uuid 获取一个 UUID\n2. 对该 UUID 字符串计算 MD5 哈希（包含连字符，不含引号和换行）\n3. 将 MD5 哈希值作为参数，访问 https://httpbin.org/anything/{MD5值}\n4. 从返回 JSON 的 "url" 字段中提取完整 URL\n提交该完整 URL。',
      answer_type: 'regex',
      expected: 'https://httpbin\\.org/anything/[a-f0-9]{32}',
      score: 9,
      hint: '三步链式操作，注意 MD5 输入不含多余字符。'
    },
    {
      id: 'browser-03',
      category: 'browser',
      question: '请使用 curl 完成以下操作：\n1. 向 https://httpbin.org/post 发送 POST 请求，请求体为 JSON：{"matrix":[[1,2],[3,4]],"op":"det"}\n2. 从返回结果的 "data" 字段中解析出你发送的 JSON 字符串\n3. 计算该 matrix 的行列式值（det）\n只提交行列式的值（一个整数）。',
      answer_type: 'exact',
      expected: '-2',
      score: 7,
      hint: '2x2 矩阵行列式 = ad - bc。'
    },
    {
      id: 'browser-04',
      category: 'browser',
      question: '请完成以下操作：\n1. 访问 https://httpbin.org/base64/eyJjaGFpbiI6WyJodHRwczovL2h0dHBiaW4ub3JnL2dldD9zdGVwPTIiLCJodHRwczovL2h0dHBiaW4ub3JnL2dldD9zdGVwPTMiXSwic2VjcmV0IjoiQ0xBVy1DSEFJTi1DT01QTEVURSJ9 解码\n2. 解析返回的 JSON，依次访问 "chain" 数组中的每个 URL\n3. 最后提交 JSON 中 "secret" 字段的值',
      answer_type: 'exact',
      expected: 'CLAW-CHAIN-COMPLETE',
      score: 7,
      hint: '先解码获取任务描述，按指示操作。'
    },
    {
      id: 'browser-05',
      category: 'browser',
      question: '请使用 curl 完成以下操作（需要维护 cookie 会话）：\n1. 访问 https://httpbin.org/cookies/set/session_id/claw2026 设置 cookie\n2. 访问 https://httpbin.org/cookies/set/auth_level/admin 再设置一个 cookie\n3. 访问 https://httpbin.org/cookies 获取所有 cookies\n4. 将所有 cookie 的 value 按字母顺序排列，用 | 分隔\n只提交排列后的字符串。',
      answer_type: 'exact',
      expected: 'admin|claw2026',
      score: 9,
      hint: '需在同一会话中完成三次请求。'
    },

    // ==================== 综合推理与编码 (complex) ====================
    {
      id: 'complex-01',
      category: 'complex',
      question: '请用 JSON 格式回答：对数组 [12, 7, 25, 3, 18, 9, 31, 6, 14, 22] 执行以下处理链：\n1. 移除所有质数\n2. 将剩余数字各自的数位求和（如 25 → 2+5=7）\n3. 对结果去重并升序排列\n输出格式为 {"result": [处理后的数组]}',
      answer_type: 'json_match',
      expected: '{"result":[3,4,5,6,7,9]}',
      score: 7,
      hint: '先判断质数，再数位求和。'
    },
    {
      id: 'complex-02',
      category: 'complex',
      question: '请用 JSON 格式回答：\n给定有向图邻接表 {"A":["B","C"], "B":["D"], "C":["D","E"], "D":["F"], "E":["F"], "F":[]}，列出从 A 到 F 的所有可能路径（按字典序排列）。\n输出格式为 {"result": ["A->B->D->F", "A->...->F", ...]}',
      answer_type: 'json_match',
      expected: '{"result":["A->B->D->F","A->C->D->F","A->C->E->F"]}',
      score: 8,
      hint: 'DFS 枚举所有路径。'
    },
    {
      id: 'complex-03',
      category: 'complex',
      question: '请用 JSON 格式回答：实现一个简易版 RLE（Run-Length Encoding）压缩。\n对字符串 "aaabbbccdddddeef" 进行 RLE 编码，格式为 "字符次数字符次数..."（次数为1时省略次数）。\n输出格式为 {"result": "编码结果"}',
      answer_type: 'json_match',
      expected: '{"result":"3a3b2c5d2ef"}',
      score: 7,
      hint: '连续相同字符计数，单个字符省略计数。'
    },
    {
      id: 'complex-04',
      category: 'complex',
      question: '请计算以下嵌套表达式的值：\n\nfloor(sqrt(sum([i**2 for i in range(1, 11)]))) + ceil(log2(1024)) - len(set("mississippi"))\n\n其中 floor=向下取整, ceil=向上取整, sqrt=开平方, log2=以2为底的对数, set=去重集合, len=长度。只回答一个整数。',
      answer_type: 'exact',
      expected: '25',
      score: 7,
      hint: '分别计算每个子表达式再组合。'
    },
  ],
};

export default exam;
