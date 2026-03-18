#!/bin/bash
# ============================================================
# ClawExam 安全漏洞修复验证脚本
# 使用: bash scripts/test-security.sh [BASE_URL]
# 默认: http://localhost:3210
# ============================================================

BASE_URL="${1:-https://test.clawhome.cc/}"
PASS=0
FAIL=0
TOTAL=0

green() { printf "\033[32m✅ PASS: %s\033[0m\n" "$1"; }
red()   { printf "\033[31m❌ FAIL: %s\033[0m\n" "$1"; }
yellow(){ printf "\033[33m⚠️  INFO: %s\033[0m\n" "$1"; }

check() {
  TOTAL=$((TOTAL+1))
  if [ "$1" = "true" ]; then
    PASS=$((PASS+1))
    green "$2"
  else
    FAIL=$((FAIL+1))
    red "$2"
  fi
}

echo ""
echo "============================================================"
echo "  ClawExam 安全漏洞修复验证"
echo "  目标: $BASE_URL"
echo "============================================================"
echo ""

# ============================================================
# 测试 1: 排行榜不返回 session_id
# ============================================================
echo "--- 测试 1: 排行榜不泄露 session_id ---"

LB_RESP=$(curl -s "${BASE_URL}/api/leaderboard?exam_id=v1")
HAS_SESSION_ID=$(echo "$LB_RESP" | grep -o '"session_id"' | head -1)

if [ -z "$HAS_SESSION_ID" ]; then
  check "true" "排行榜响应中不包含 session_id"
else
  check "false" "排行榜响应中仍包含 session_id！"
fi

# 确认 _session_id 也不返回给前端
HAS_INTERNAL=$(echo "$LB_RESP" | grep -o '"_session_id"' | head -1)
if [ -z "$HAS_INTERNAL" ]; then
  check "true" "排行榜响应中不包含 _session_id（内部字段未泄露）"
else
  check "false" "排行榜响应中包含 _session_id，内部字段泄露！"
fi

echo ""

# ============================================================
# 测试 2: 头像上传 XSS 防护 — 拒绝非图片内容
# ============================================================
echo "--- 测试 2: 头像上传 XSS 防护 ---"

# 2a: 上传恶意 HTML 内容（无 auth 应返回 401）
XSS_RESP=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/upload/avatar" \
  -H "Content-Type: text/html" \
  -d '<script>alert("xss")</script>')

if [ "$XSS_RESP" = "401" ]; then
  check "true" "无 token 上传头像被拒绝（401）"
else
  yellow "返回状态码: $XSS_RESP（预期 401）"
  check "false" "无 token 上传头像未返回 401"
fi

# 2b: 使用伪造 token 上传恶意内容
XSS_RESP2=$(curl -s -X POST "${BASE_URL}/api/upload/avatar" \
  -H "X-App-Token: fake-token-12345" \
  -H "Content-Type: text/html" \
  -d '<script>alert("xss")</script>')
XSS_OK=$(echo "$XSS_RESP2" | grep -o '"ok":true')

if [ -z "$XSS_OK" ]; then
  check "true" "伪造 token 上传恶意 HTML 被拒绝"
else
  check "false" "伪造 token 上传恶意 HTML 竟然成功了！"
fi

# 2c: 检查 X-Content-Type-Options: nosniff 头
NOSNIFF=$(curl -s -I "${BASE_URL}/" | grep -i "x-content-type-options" | grep -i "nosniff")
if [ -n "$NOSNIFF" ]; then
  check "true" "响应包含 X-Content-Type-Options: nosniff"
else
  check "false" "响应缺少 X-Content-Type-Options: nosniff"
fi

echo ""

# ============================================================
# 测试 3: 速率限制
# ============================================================
echo "--- 测试 3: 速率限制 ---"

# 3a: 检查 RateLimit 响应头
RL_HEADERS=$(curl -s -I "${BASE_URL}/api/leaderboard?exam_id=v1" | grep -i "ratelimit")
if [ -n "$RL_HEADERS" ]; then
  check "true" "API 响应包含 RateLimit 头"
else
  check "false" "API 响应缺少 RateLimit 头"
fi

# 3b: /api/register 严格限流测试（发 6 次，第 6 次应被拒绝）
echo "  测试 /api/register 速率限制（连续请求 6 次）..."
REGISTER_BLOCKED="false"
for i in $(seq 1 6); do
  REG_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "${BASE_URL}/api/register" \
    -H "Content-Type: application/json" \
    -d '{"exam_id":"v1","claw_name":"test","claw_version":"1.0","model_name":"test"}')
  if [ "$REG_CODE" = "429" ]; then
    REGISTER_BLOCKED="true"
    yellow "第 ${i} 次请求被限流（429）"
    break
  fi
done

if [ "$REGISTER_BLOCKED" = "true" ]; then
  check "true" "/api/register 速率限制生效（每分钟 5 次）"
else
  check "false" "/api/register 速率限制未生效，6 次请求全部通过"
fi

echo ""

# ============================================================
# 测试 4: register 字段长度校验
# ============================================================
echo "--- 测试 4: register 字段长度校验 ---"

# 等一下让速率限制窗口恢复（如果刚触发了限流）
sleep 2

# 生成 100 字符的超长名称
LONG_NAME=$(python3 -c "print('A' * 100)")

FIELD_RESP=$(curl -s -X POST "${BASE_URL}/api/register" \
  -H "Content-Type: application/json" \
  -d "{\"exam_id\":\"v1\",\"claw_name\":\"${LONG_NAME}\",\"claw_version\":\"1.0\",\"model_name\":\"test\"}")
FIELD_ERR=$(echo "$FIELD_RESP" | grep -o '过长')

# 可能被速率限制拦截
FIELD_429=$(echo "$FIELD_RESP" | grep -o '频繁')

if [ -n "$FIELD_ERR" ]; then
  check "true" "超长 claw_name（100字符）被拒绝"
elif [ -n "$FIELD_429" ]; then
  yellow "被速率限制拦截，等待 60 秒后重试..."
  sleep 61
  FIELD_RESP2=$(curl -s -X POST "${BASE_URL}/api/register" \
    -H "Content-Type: application/json" \
    -d "{\"exam_id\":\"v1\",\"claw_name\":\"${LONG_NAME}\",\"claw_version\":\"1.0\",\"model_name\":\"test\"}")
  FIELD_ERR2=$(echo "$FIELD_RESP2" | grep -o '过长')
  if [ -n "$FIELD_ERR2" ]; then
    check "true" "超长 claw_name（100字符）被拒绝"
  else
    check "false" "超长 claw_name 未被拒绝，返回: $(echo "$FIELD_RESP2" | head -c 200)"
  fi
else
  check "false" "超长 claw_name 未被拒绝，返回: $(echo "$FIELD_RESP" | head -c 200)"
fi

echo ""

# ============================================================
# 测试 5: app_token 过期机制
# ============================================================
echo "--- 测试 5: app_token 过期机制 ---"

# 5a: 使用过期/无效 token 应返回 401
EXPIRED_RESP=$(curl -s -X POST "${BASE_URL}/api/upload/avatar" \
  -H "X-App-Token: expired-fake-token-00000" \
  -H "Content-Type: application/octet-stream" \
  -d "test")
EXPIRED_ERR=$(echo "$EXPIRED_RESP" | grep -o '过期\|未登录')

if [ -n "$EXPIRED_ERR" ]; then
  check "true" "无效/过期 token 被拒绝"
else
  check "false" "无效 token 未被正确拒绝，返回: $(echo "$EXPIRED_RESP" | head -c 200)"
fi

# 5b: 检查数据库迁移文件是否存在 token_expires_at
if [ -f "/Users/yuehuali/ClawExam/migrate-mysql/004_token_expiry.sql" ]; then
  HAS_EXPIRY=$(grep -i "token_expires_at" /Users/yuehuali/ClawExam/migrate-mysql/004_token_expiry.sql)
  if [ -n "$HAS_EXPIRY" ]; then
    check "true" "数据库迁移包含 token_expires_at 字段"
  else
    check "false" "迁移文件缺少 token_expires_at"
  fi
else
  check "false" "迁移文件 004_token_expiry.sql 不存在"
fi

# 5c: 检查代码中 token TTL 设置
TTL_CHECK=$(grep -r "TOKEN_TTL_DAYS\|token_expires_at\|DATE_ADD" /Users/yuehuali/ClawExam/src/auth.js 2>/dev/null)
if [ -n "$TTL_CHECK" ]; then
  check "true" "auth.js 中包含 token 过期逻辑"
else
  check "false" "auth.js 中缺少 token 过期逻辑"
fi

# 5d: 检查中间件中的过期校验
MW_CHECK=$(grep -r "token_expires_at" /Users/yuehuali/ClawExam/src/auth-middleware.js 2>/dev/null)
if [ -n "$MW_CHECK" ]; then
  check "true" "auth-middleware.js 中包含过期时间校验"
else
  check "false" "auth-middleware.js 中缺少过期时间校验"
fi

echo ""

# ============================================================
# 测试 6: Web 排行榜无证书链接（静态检查）
# ============================================================
echo "--- 测试 6: Web 排行榜无证书查看链接 ---"

WEB_PAGE=$(curl -s "${BASE_URL}/")
HAS_CERT_COL=$(echo "$WEB_PAGE" | grep -o 'lb-cert')
HAS_CERT_TH=$(echo "$WEB_PAGE" | grep '<th>证书</th>')

if [ -z "$HAS_CERT_COL" ] && [ -z "$HAS_CERT_TH" ]; then
  check "true" "Web 排行榜页面无证书列和证书链接"
else
  check "false" "Web 排行榜页面仍包含证书相关元素"
fi

echo ""

# ============================================================
# 汇总
# ============================================================
echo "============================================================"
echo "  测试结果: ${PASS} 通过 / ${FAIL} 失败 / ${TOTAL} 总计"
if [ "$FAIL" -eq 0 ]; then
  printf "  \033[32m全部通过！所有安全漏洞已修复。\033[0m\n"
else
  printf "  \033[31m存在 ${FAIL} 项未通过，请检查修复。\033[0m\n"
fi
echo "============================================================"
echo ""
