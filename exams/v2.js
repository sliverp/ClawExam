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
      question: '请使用终端完成以下多步文件操作：\n1. 创建目录 /tmp/clawexam_test\n2. 在该目录下创建 3 个文件：a.txt 内容为 "hello"，b.txt 内容为 "world"，c.txt 内容为 "claw"\n3. 使用 cat 命令将三个文件的内容合并，用空格分隔，输出到一行\n提交最终合并后的字符串。',
      answer_type: 'regex',
      expected: 'hello\\s+world\\s+claw',
      score: 10,
      hint: '创建文件后用 cat 或 paste 合并内容，结果应该包含三个单词。'
    },
    {
      id: 'computer-02',
      category: 'computer',
      question: '请使用终端执行以下操作：\n1. 使用 echo 生成以下 CSV 数据并写入 /tmp/clawexam_scores.csv：\nname,score\nAlpha,78\nBeta,92\nGamma,65\nDelta,88\nEpsilon,95\n2. 使用命令行工具（如 awk/sort/tail）找出得分最高的龙虾名称\n只提交名称（一个单词）。',
      answer_type: 'exact',
      expected: 'Epsilon',
      score: 10,
      hint: '对 CSV 按 score 列排序，取最大值对应的 name。'
    },
    {
      id: 'computer-03',
      category: 'computer',
      question: '请使用终端执行以下操作：\n1. 创建文件 /tmp/clawexam_calc.py，内容为一个 Python 脚本，该脚本计算 1 到 100 中所有能被 3 整除但不能被 5 整除的数的总和\n2. 运行该脚本\n提交脚本输出的数字。',
      answer_type: 'exact',
      expected: '1368',
      score: 10,
      hint: '能被3整除但不能被5整除：3,6,9,12... 排除15,30,45...等。求总和。'
    },
    {
      id: 'computer-04',
      category: 'computer',
      question: '请使用终端执行以下操作链：\n1. 执行 echo "Q2xhd0V4YW0gTGV2ZWwgMiBDbGVhcmVk" | base64 -d 解码\n2. 将解码结果中所有空格替换为下划线 _\n3. 将结果转为全小写\n只提交最终结果字符串。',
      answer_type: 'exact',
      expected: 'clawexam_level_2_cleared',
      score: 10,
      hint: '先 base64 解码，再做字符串替换和大小写转换。'
    },
    {
      id: 'computer-05',
      category: 'computer',
      question: '请使用终端完成以下任务：\n1. 使用 find 或 ls 命令统计 /usr/bin 目录下有多少个可执行文件（只统计文件，不统计子目录）\n2. 提交文件总数\n只回答一个数字。',
      answer_type: 'regex',
      expected: '^[0-9]+$',
      score: 10,
      hint: '使用 find /usr/bin -maxdepth 1 -type f | wc -l 或类似命令。'
    },
    {
      id: 'computer-06',
      category: 'computer',
      question: '请使用终端执行以下操作：\n1. 创建文件 /tmp/clawexam_json.sh，写入一个 bash 脚本，该脚本使用 jq 或 python3 解析以下 JSON 并输出 items 数组中 price 最大的 item 的 name：\n{"items":[{"name":"Claw-A","price":29.99},{"name":"Claw-B","price":49.50},{"name":"Claw-C","price":15.00},{"name":"Claw-D","price":49.50}]}\n2. 如果有多个最大值取第一个\n3. 执行脚本并提交输出\n只提交一个名称。',
      answer_type: 'exact',
      expected: 'Claw-B',
      score: 15,
      hint: 'price 最高的是 49.50，有两个并列，取第一个出现的。'
    },

    // ==================== Browser Use (browser) ====================
    {
      id: 'browser-01',
      category: 'browser',
      question: '请使用浏览器工具或 curl 访问 https://httpbin.org/headers ，从返回的 JSON 中提取 "Host" 字段的值。只提交 Host 的值。',
      answer_type: 'contains',
      expected: 'httpbin.org',
      score: 10,
      hint: '访问该 URL 会返回请求头信息，找到 Host 字段。'
    },
    {
      id: 'browser-02',
      category: 'browser',
      question: '请使用浏览器工具或 curl 完成以下操作链：\n1. 访问 https://httpbin.org/uuid 获取一个 UUID\n2. 将获得的 UUID 作为参数，访问 https://httpbin.org/anything/{你的UUID}\n3. 从返回的 JSON 中提取 "url" 字段的值\n提交完整的 url 值。',
      answer_type: 'regex',
      expected: 'https://httpbin\\.org/anything/[a-f0-9-]{36}',
      score: 15,
      hint: '先获取 UUID，再将其拼接到 URL 中访问，提交返回的 url 字段。'
    },
    {
      id: 'browser-03',
      category: 'browser',
      question: '请使用浏览器工具或 curl 向 https://httpbin.org/post 发送一个 POST 请求，请求体为 JSON：{"exam":"v2","action":"verify"}。从返回结果的 "json" 字段中提取 "action" 的值。只提交该值。',
      answer_type: 'exact',
      expected: 'verify',
      score: 10,
      hint: 'httpbin.org/post 会回显你发送的 JSON 数据。'
    },
    {
      id: 'browser-04',
      category: 'browser',
      question: '请使用浏览器工具或 curl 完成以下操作：\n1. 访问 https://httpbin.org/base64/eyJsZXZlbCI6MiwidGFzayI6ImZpbmRfdGhlX2tleSIsImtleSI6IkNMQVctVjItU0VDUkVUIn0= 获取解码后的内容\n2. 将返回的内容解析为 JSON\n3. 提取 "key" 字段的值\n只提交 key 的值。',
      answer_type: 'exact',
      expected: 'CLAW-V2-SECRET',
      score: 10,
      hint: '这是一个 base64 编码的 JSON，解码后提取 key 字段。'
    },
    {
      id: 'browser-05',
      category: 'browser',
      question: '请使用浏览器工具或 curl 完成以下多步骤任务：\n1. 访问 https://httpbin.org/cookies/set/clawexam_token/v2passed 设置一个 cookie\n2. 然后访问 https://httpbin.org/cookies 查看当前 cookies\n3. 从返回的 JSON 中提取 "clawexam_token" 的值\n只提交该 cookie 的值。',
      answer_type: 'exact',
      expected: 'v2passed',
      score: 15,
      hint: '先设置 cookie，再查看 cookies。注意需要保持同一个会话（使用 -c/-b 选项或同一浏览器上下文）。'
    },

    // ==================== 综合推理与编码 (complex) ====================
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
      question: '请用 JSON 格式回答以下问题：\n给定二叉树的前序遍历 [A,B,D,E,C,F] 和中序遍历 [D,B,E,A,F,C]，请推导出后序遍历结果。\n输出格式为 {"result": ["节点1", "节点2", ...]}',
      answer_type: 'json_match',
      expected: '{"result":["D","E","B","F","C","A"]}',
      score: 15,
      hint: '前序第一个是根，在中序中定位根，递归划分左右子树。'
    },
    {
      id: 'complex-03',
      category: 'complex',
      question: '请用 JSON 格式回答：给定字符串 "aabbccddaabbee"，统计每个字符出现的次数，并按出现次数从多到少排序。如果次数相同，按字母顺序排序。\n输出格式为 {"result": [["字符", 次数], ...]}',
      answer_type: 'json_match',
      expected: '{"result":[["a",4],["b",4],["c",2],["d",2],["e",2]]}',
      score: 10,
      hint: '统计频次：a=4, b=4, c=2, d=2, e=2。同频按字母排序。'
    },
    {
      id: 'complex-04',
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
