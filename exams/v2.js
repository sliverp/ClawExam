/**
 * ClawExam 试卷 v2 — 中级能力评测
 *
 * 比 v1 难度更高，覆盖进阶常识、多步骤工具调用、复杂推理与编码三大维度
 */

const exam = {
  id: 'v2',
  name: '中级能力评测 v2',
  description: '进阶评测：更复杂的常识推理、多步骤工具调用链、编码与算法综合能力',
  version: '1.0.0',
  created_at: '2026-03-10',

  questions: [
    // ==================== 进阶常识 (basic) ====================
    {
      id: 'basic-01',
      category: 'basic',
      question: '请回答：在 HTTP/1.1 协议中，哪个请求头字段用于实现长连接（持久连接）？请回答该请求头的名称和值，格式为 "Header: Value"。',
      answer_type: 'regex',
      expected: 'Connection\\s*:\\s*keep-alive',
      score: 5,
      hint: '答案格式: Header: Value，注意大小写。'
    },
    {
      id: 'basic-02',
      category: 'basic',
      question: '请回答：在 OAuth 2.0 协议中，四种授权模式分别是：授权码模式、隐式模式、密码模式，和？请用中文回答第四种模式的名称（四个字）。',
      answer_type: 'contains',
      expected: '客户端凭证',
      score: 5,
      hint: '也叫 Client Credentials Grant，中文四个字。'
    },
    {
      id: 'basic-03',
      category: 'basic',
      question: '请回答：RSA 加密算法的安全性基于哪个数学难题？请用中文回答（四到六个字）。',
      answer_type: 'regex',
      expected: '(大整数分解|整数分解|因数分解|质因数分解)',
      score: 5,
      hint: '答案与大数的因子有关。'
    },
    {
      id: 'basic-04',
      category: 'basic',
      question: '请回答：DNS 解析中，A 记录将域名映射为 IPv4 地址。那么将域名映射为 IPv6 地址的记录类型是什么？请回答记录类型名称（四个字符）。',
      answer_type: 'exact',
      expected: 'AAAA',
      score: 5,
      hint: '答案是四个相同的字母。'
    },
    {
      id: 'basic-05',
      category: 'basic',
      question: '请回答：在计算机网络 OSI 七层模型中，从下到上第四层是什么层？请用中文回答（三个字）。',
      answer_type: 'contains',
      expected: '传输层',
      score: 5,
      hint: 'TCP 和 UDP 协议工作在这一层。'
    },

    // ==================== 工具调用 (tool) ====================
    {
      id: 'tool-01',
      category: 'tool',
      question: '请用工具执行以下多步操作：\n1. 执行命令 echo "claw-exam-v2" | sha256sum\n2. 提取输出的 SHA256 哈希值（64位十六进制字符串）\n只提交那个 64 位的哈希值，不包含文件名和空格。',
      answer_type: 'regex',
      expected: '^[a-f0-9]{64}$',
      score: 10,
      hint: '执行命令后，输出格式为 "<hash>  -"，只取 hash 部分。'
    },
    {
      id: 'tool-02',
      category: 'tool',
      question: '请使用工具完成以下任务链：\n1. 访问 https://httpbin.org/uuid 获取一个 UUID\n2. 将获取到的 UUID 字符串中的所有横杠(-) 去掉\n3. 将去掉横杠后的字符串转为全大写\n提交最终结果（32位大写十六进制字符串）。',
      answer_type: 'regex',
      expected: '^[A-F0-9]{32}$',
      score: 15,
      hint: '先访问 URL 获取 UUID，再做字符串处理。结果应该是 32 个大写十六进制字符。'
    },
    {
      id: 'tool-03',
      category: 'tool',
      question: '请使用工具执行以下操作：\n1. 创建一个临时文件，写入以下 3 行内容（每行一个数字）：42、17、85\n2. 使用 sort -n 命令对文件进行数字排序\n3. 使用 head -1 取排序后的第一行\n提交最终结果（一个数字）。',
      answer_type: 'exact',
      expected: '17',
      score: 10,
      hint: '把三个数字写入文件，数字排序后取最小值。'
    },
    {
      id: 'tool-04',
      category: 'tool',
      question: '请使用工具执行以下命令并提交输出：\npython3 -c "import json; data={\'claws\':[{\'name\':\'Alpha\',\'score\':88},{\'name\':\'Beta\',\'score\':95},{\'name\':\'Gamma\',\'score\':72}]}; best=max(data[\'claws\'],key=lambda x:x[\'score\']); print(best[\'name\'])"',
      answer_type: 'exact',
      expected: 'Beta',
      score: 10,
      hint: '执行 Python 命令，输出得分最高的龙虾名称。'
    },
    {
      id: 'tool-05',
      category: 'tool',
      question: '请使用工具完成以下多步任务：\n1. 执行命令 curl -s https://httpbin.org/base64/eyJhbnN3ZXIiOiAiQ2xhd0V4YW1WMlBybyJ9 获取返回内容\n2. 将返回的 JSON 字符串解析，提取 "answer" 字段的值\n只提交 answer 字段的值。',
      answer_type: 'exact',
      expected: 'ClawExamV2Pro',
      score: 15,
      hint: '返回值是一个 JSON 字符串，从中提取 answer 字段。'
    },

    // ==================== 复杂推理与编码 (complex) ====================
    {
      id: 'complex-01',
      category: 'complex',
      question: '请用 JSON 格式回答：给定数组 [5,3,8,1,9,2,7,4,6]，请实现以下处理链：\n1. 过滤出所有奇数\n2. 将每个奇数乘以 3\n3. 按从大到小排序\n输出格式为 {"result": [处理后的数组]}',
      answer_type: 'json_match',
      expected: '{"result":[27,21,15,9,3]}',
      score: 10,
      hint: '奇数为 5,3,1,9,7 → 乘3 → 15,9,3,27,21 → 降序排列。'
    },
    {
      id: 'complex-02',
      category: 'complex',
      question: '请计算以下递归函数的返回值：\n```\nfunction g(n) {\n  if (n === 0) return 1;\n  if (n === 1) return 1;\n  return g(n-1) * n + g(n-2);\n}\n```\n求 g(5) 的值。只回答数字。',
      answer_type: 'exact',
      expected: '225',
      score: 10,
      hint: '手动展开递归：g(0)=1, g(1)=1, g(2)=2*1+1=3, g(3)=3*3+1=10, g(4)=4*10+3=43, g(5)=5*43+10=?'
    },
    {
      id: 'complex-03',
      category: 'complex',
      question: '给定一个有向图的邻接表：\nA → B, C\nB → D\nC → D, E\nD → F\nE → F\n\n请问从 A 到 F 共有多少条不同的路径？只回答数字。',
      answer_type: 'exact',
      expected: '3',
      score: 10,
      hint: '枚举所有从 A 到 F 的路径：A→B→D→F, A→C→D→F, A→C→E→F。'
    },
    {
      id: 'complex-04',
      category: 'complex',
      question: '请用 JSON 格式回答：给定字符串 "aabbccddaabbee"，统计每个字符出现的次数，并按出现次数从多到少排序。如果次数相同，按字母顺序排序。\n输出格式为 {"result": [["字符", 次数], ...]}',
      answer_type: 'json_match',
      expected: '{"result":[["a",4],["b",4],["c",2],["d",2],["e",2]]}',
      score: 10,
      hint: '统计频次：a=4, b=4, c=2, d=2, e=2。同频按字母排序。'
    },
    {
      id: 'complex-05',
      category: 'complex',
      question: '请计算：一个 8 位无符号整数，用二进制表示为 10110011。将其进行按位取反（NOT）操作后，得到的十进制值是多少？只回答数字。',
      answer_type: 'exact',
      expected: '76',
      score: 10,
      hint: '10110011 取反 → 01001100，转十进制。'
    },
    {
      id: 'complex-06',
      category: 'complex',
      question: '请用 JSON 格式回答以下问题：\n给定二叉树的前序遍历 [A,B,D,E,C,F] 和中序遍历 [D,B,E,A,F,C]，请推导出后序遍历结果。\n输出格式为 {"result": ["节点1", "节点2", ...]}',
      answer_type: 'json_match',
      expected: '{"result":["D","E","B","F","C","A"]}',
      score: 15,
      hint: '前序第一个是根，在中序中定位根，递归划分左右子树。'
    },
    {
      id: 'complex-07',
      category: 'complex',
      question: '请计算以下表达式的值（遵循标准运算优先级）：\n\n2 + 3 * 4 ** 2 - 10 / 2 + 7 % 3\n\n其中 ** 表示幂运算，% 表示取模。只回答数字。',
      answer_type: 'exact',
      expected: '46',
      score: 10,
      hint: '运算优先级：** > * / % > + -。先算 4**2=16，再算 3*16=48，10/2=5，7%3=1，最后 2+48-5+1=46。'
    },
  ],
};

export default exam;
