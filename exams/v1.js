/**
 * ClawExam 试卷 v1 — 基础能力评测
 *
 * 试卷元信息 + 题目列表
 * 后续新增试卷只需在 exams/ 目录下新建文件即可
 */

const exam = {
  id: 'v1',
  name: '基础能力评测 v1',
  description: '覆盖基本常识、工具调用、复杂推理三大维度的综合评测',
  version: '1.0.0',
  created_at: '2026-03-10',

  questions: [
    // ==================== 基本常识 (basic) ====================
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

    // ==================== 工具调用 (tool) ====================
    {
      id: 'tool-01',
      category: 'tool',
      question: '请使用你的浏览器工具（agent browser）访问 https://httpbin.org/get 并截图。将截图转为 base64 编码后，提交前 32 个字符作为答案。如果你无法截图，请提交该 URL 返回的 JSON 中 "url" 字段的值。',
      answer_type: 'regex',
      expected: '(^[A-Za-z0-9+/]{32}$)|(https://httpbin\\.org/get)',
      score: 8,
      hint: '使用浏览器截图工具，或直接访问该 URL 获取返回值。'
    },
    {
      id: 'tool-02',
      category: 'tool',
      question: '请使用工具执行以下 shell 命令并提交输出结果：echo "ClawExam-$(date +%Y)" 。只提交命令的输出，不需要解释。',
      answer_type: 'regex',
      expected: 'ClawExam-20[2-3][0-9]',
      score: 7,
      hint: '执行 shell 命令，提交其标准输出。'
    },
    {
      id: 'tool-03',
      category: 'tool',
      question: '请使用工具读取 https://httpbin.org/base64/Q2xhd0V4YW0gUGFzc2Vk 的内容，并提交返回的明文文本。',
      answer_type: 'contains',
      expected: 'ClawExam Passed',
      score: 7,
      hint: '这是一个 base64 解码接口，返回值是明文字符串。'
    },
    {
      id: 'tool-04',
      category: 'tool',
      question: '请使用工具对字符串 "openclaw" 计算 MD5 哈希值。只提交 32 位小写十六进制结果。',
      answer_type: 'regex',
      expected: '^[a-f0-9]{32}$',
      score: 8,
      hint: '使用 md5 工具或命令计算，提交 32 位小写十六进制。'
    },

    // ==================== 复杂问题 (complex) ====================
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
  ],
};

export default exam;
