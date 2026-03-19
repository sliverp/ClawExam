#!/usr/bin/env python3
"""
ClawExam AI 提示词安全扫描脚本

调用腾讯安全 Skill 分析 API (xti.qq.com) 对项目中所有
面向 AI Agent 的提示词/指令文件进行安全检测。

扫描范围：
  - exams/v1.js, v2.js, v3.js  — 考试试卷（含题目指令、答案校验）
  - src/exam-md.js              — 考试引导 Markdown 模板

用法：
  python3 scripts/skill_scan/scan.py --appkey YOUR_APPKEY
  python3 scripts/skill_scan/scan.py --appkey YOUR_APPKEY --poll   # 上传后自动轮询结果
  python3 scripts/skill_scan/scan.py --appkey YOUR_APPKEY --query MD5  # 仅查询已有结果
"""

import argparse
import hashlib
import json
import os
import sys
import tempfile
import time
import zipfile

import requests

API_URL = "https://xti.qq.com/api/v3/ti"

# 项目根目录（脚本位于 scripts/skill_scan/）
PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))

# 要扫描的文件（相对项目根目录）
SCAN_FILES = [
    "exams/v1.js",
    "exams/v2.js",
    "exams/v3.js",
    "src/exam-md.js",
]

# 威胁等级映射
THREAT_LEVELS = {0: "无风险", 2: "低危", 3: "中危", 4: "高危"}

# 置信度映射
CONFIDENCE_MAP = {0: "未知", 30: "低", 60: "中", 90: "高"}

# 威胁类型中文映射
THREAT_TYPE_CN = {
    "data_exfiltration": "数据外泄",
    "reverse_shell": "反弹Shell",
    "malicious_remote_exec": "恶意远程执行",
    "social_engineering_exec": "社会工程攻击",
    "prompt_injection": "提示词注入",
    "credential_theft": "凭证窃取",
    "malicious_file_ops": "恶意文件操作",
    "supply_chain_attack": "供应链攻击",
    "hardcoded_secrets": "硬编码密钥",
    "dangerous_command_exec": "危险命令执行",
    "dynamic_code_exec": "动态代码执行",
    "code_obfuscation": "代码混淆",
    "hidden_command": "隐藏命令调用",
    "prompt_data_leak": "提示词数据泄露",
    "suspicious_network": "可疑网络连接",
    "sensitive_file_access": "敏感文件访问",
    "process_creation": "进程创建",
    "global_package_install": "全局包安装",
    "insecure_network": "不安全网络传输",
}

# 结果颜色
COLORS = {
    "red": "\033[91m",
    "green": "\033[92m",
    "yellow": "\033[93m",
    "cyan": "\033[96m",
    "bold": "\033[1m",
    "reset": "\033[0m",
}


def color(text, c):
    return f"{COLORS.get(c, '')}{text}{COLORS['reset']}"


def pack_files_to_zip():
    """将扫描文件打包成 zip，返回临时文件路径"""
    missing = []
    for f in SCAN_FILES:
        full = os.path.join(PROJECT_ROOT, f)
        if not os.path.isfile(full):
            missing.append(f)

    if missing:
        print(color(f"[ERROR] 以下文件不存在: {', '.join(missing)}", "red"))
        sys.exit(1)

    tmp = tempfile.NamedTemporaryFile(
        suffix=".zip", prefix="clawexam_prompts_", delete=False
    )
    tmp.close()

    with zipfile.ZipFile(tmp.name, "w", zipfile.ZIP_DEFLATED) as zf:
        for f in SCAN_FILES:
            full = os.path.join(PROJECT_ROOT, f)
            zf.write(full, f)

    # 计算 MD5
    md5 = hashlib.md5()
    with open(tmp.name, "rb") as fh:
        for chunk in iter(lambda: fh.read(8192), b""):
            md5.update(chunk)

    size_kb = os.path.getsize(tmp.name) / 1024
    print(f"[INFO] 已打包 {len(SCAN_FILES)} 个文件 → {tmp.name} ({size_kb:.1f} KB)")
    print(f"[INFO] ZIP MD5: {md5.hexdigest()}")
    return tmp.name, md5.hexdigest()


def upload(appkey, zip_path):
    """上传文件到 Skill 分析 API，返回文件 MD5"""
    print(f"\n{color('═' * 50, 'cyan')}")
    print(color("  上传文件进行安全扫描", "bold"))
    print(f"{color('═' * 50, 'cyan')}\n")

    fields = {
        "c_version": (None, "3.0"),
        "c_action": (None, "SkillAnalysisUpload"),
        "c_appkey": (None, appkey),
        "file": (os.path.basename(zip_path), open(zip_path, "rb")),
    }

    try:
        resp = requests.post(API_URL, files=fields, timeout=60)
        result = resp.json()
    except Exception as e:
        print(color(f"[ERROR] 上传失败: {e}", "red"))
        sys.exit(1)

    print(f"[INFO] 响应码: {result.get('return_code')}")
    print(f"[INFO] 消息: {result.get('return_msg')}")

    if result.get("return_code") not in (0, 1000):
        print(color(f"[ERROR] 上传异常: {json.dumps(result, ensure_ascii=False)}", "red"))
        sys.exit(1)

    file_md5 = result.get("data", {}).get("md5", "")
    if file_md5:
        print(color(f"[OK] 上传成功，文件 MD5: {file_md5}", "green"))
    else:
        print(color("[WARN] 上传成功但未返回 MD5，使用本地计算的 MD5", "yellow"))

    return file_md5


def query(appkey, md5):
    """查询扫描结果"""
    params = {
        "c_version": "3.0",
        "c_action": "SkillAnalysisInfo",
        "c_appkey": appkey,
        "key": md5,
        "type": "md5",
        "option": 1,
    }

    try:
        resp = requests.post(API_URL, data=json.dumps(params), timeout=30)
        return resp.json()
    except Exception as e:
        print(color(f"[ERROR] 查询失败: {e}", "red"))
        return None


def is_analysis_done(result):
    """检查分析是否完成"""
    if not result or result.get("return_code") == 1:
        return False  # 无数据，可能还在分析
    if result.get("return_code") == 1110:
        return False  # 明确返回分析中

    data = result.get("data", {})
    md5s = data.get("md5s", {})
    for _, info in md5s.items():
        static = info.get("static_analysis_status", "")
        dynamic = info.get("dynamic_analysis_status", "")
        if static != "done" or dynamic != "done":
            return False
    return bool(md5s)


def print_result(result):
    """格式化打印扫描结果"""
    print(f"\n{color('═' * 60, 'cyan')}")
    print(color("  Skill 安全扫描结果", "bold"))
    print(f"{color('═' * 60, 'cyan')}\n")

    if not result or result.get("return_code") == 1:
        print(color("[INFO] 暂无扫描结果，文件可能仍在分析中", "yellow"))
        return

    if result.get("return_code") != 0:
        print(color(f"[ERROR] 查询异常: {json.dumps(result, ensure_ascii=False, indent=2)}", "red"))
        return

    data = result.get("data", {})
    md5s = data.get("md5s", {})

    for file_md5, info in md5s.items():
        meta = info.get("metadata", {})
        summary = info.get("summary", {})

        print(f"{'─' * 50}")
        print(f"  文件: {color(meta.get('file_name', 'N/A'), 'bold')}")
        print(f"  MD5:  {file_md5}")
        print(f"  SHA256: {meta.get('sha256', 'N/A')}")
        print(f"  大小: {meta.get('file_size', 'N/A')} bytes")
        print(f"  类型: {meta.get('file_type', 'N/A')}")
        print(f"  是否为 Skill: {info.get('is_skill', 'N/A')}")
        print(f"  静态分析: {info.get('static_analysis_status', 'N/A')}")
        print(f"  动态分析: {info.get('dynamic_analysis_status', 'N/A')}")
        print(f"  上传时间: {info.get('submit_time', 'N/A')}")
        print(f"  最后检测: {info.get('last_scan_time', 'N/A')}")

        # 判定结果
        verdict = info.get("result", "")
        if verdict == "black":
            verdict_display = color("■ 黑 (恶意)", "red")
        elif verdict == "white":
            verdict_display = color("■ 白 (安全)", "green")
        elif verdict == "suspicious":
            verdict_display = color("■ 可疑", "yellow")
        else:
            verdict_display = color("■ 未知", "yellow")
        print(f"  判定结果: {verdict_display}")

        if summary:
            threat_level = summary.get("threat_level", 0)
            threat_display = THREAT_LEVELS.get(threat_level, f"未知({threat_level})")
            if threat_level >= 4:
                threat_display = color(threat_display, "red")
            elif threat_level >= 3:
                threat_display = color(threat_display, "yellow")
            else:
                threat_display = color(threat_display, "green")
            print(f"  威胁等级: {threat_display}")

            confidence = summary.get("confidence", 0)
            conf_display = CONFIDENCE_MAP.get(confidence, f"未知({confidence})")
            print(f"  置信度: {conf_display}")

            # 威胁类型
            threat_types = summary.get("threat_type", [])
            if threat_types:
                types_str = ", ".join(
                    THREAT_TYPE_CN.get(t, t) for t in threat_types
                )
                print(f"  威胁类型: {color(types_str, 'red')}")

            # 标签
            tags = summary.get("tags", [])
            if tags:
                tags_str = ", ".join(t.get("desc", t.get("tag", "")) for t in tags)
                print(f"  标签: {tags_str}")

            # 报毒名称
            virus_names = summary.get("virus_name", [])
            if virus_names:
                print(f"  报毒名称: {color(', '.join(virus_names), 'red')}")

            # 恶意软件分类
            malware_type = summary.get("malware_type", "")
            if malware_type:
                print(f"  恶意软件分类: {color(malware_type, 'red')}")

            # 描述
            desc = summary.get("description", "")
            if desc:
                print(f"\n  {color('总结:', 'bold')}")
                for line in desc.split("\n"):
                    print(f"    {line}")

            # 证据链
            evidence = summary.get("evidence", "")
            if evidence:
                print(f"\n  {color('证据:', 'bold')}")
                for line in evidence.split("\n"):
                    print(f"    {line}")

            # 子文件详情
            subfiles = summary.get("subfiles", [])
            if subfiles:
                print(f"\n  {color('子文件详情:', 'bold')}")
                for i, sub in enumerate(subfiles, 1):
                    sub_verdict = sub.get("verdict", "")
                    if sub_verdict == "black":
                        v_str = color("黑", "red")
                    elif sub_verdict == "white":
                        v_str = color("白", "green")
                    elif sub_verdict == "suspicious":
                        v_str = color("可疑", "yellow")
                    else:
                        v_str = "未知"

                    sub_threat = THREAT_LEVELS.get(sub.get("threat_level", 0), "未知")
                    print(f"\n    [{i}] {sub.get('file_path', 'N/A')}")
                    print(f"        判定: {v_str}  |  威胁等级: {sub_threat}  |  MD5: {sub.get('md5', 'N/A')}")

                    sub_virus = sub.get("virus_name", [])
                    if sub_virus:
                        print(f"        报毒: {', '.join(sub_virus)}")

                    sub_malware = sub.get("malware_type", "")
                    if sub_malware:
                        print(f"        分类: {sub_malware}")

                    sub_desc = sub.get("description", "")
                    if sub_desc:
                        print(f"        描述: {sub_desc}")

                    sub_evidence = sub.get("evidence", "")
                    if sub_evidence:
                        print(f"        证据: {sub_evidence[:200]}{'...' if len(sub_evidence) > 200 else ''}")

        print(f"{'─' * 50}")

    # 总结
    print(f"\n{color('═' * 60, 'cyan')}")
    total = len(md5s)
    black_count = sum(1 for v in md5s.values() if v.get("result") == "black")
    suspicious_count = sum(1 for v in md5s.values() if v.get("result") == "suspicious")
    white_count = sum(1 for v in md5s.values() if v.get("result") == "white")

    print(f"  扫描文件数: {total}")
    print(f"  安全: {color(str(white_count), 'green')}  |  可疑: {color(str(suspicious_count), 'yellow')}  |  恶意: {color(str(black_count), 'red')}")

    if black_count > 0:
        print(color("\n  ⚠ 发现恶意内容，请立即排查！", "red"))
    elif suspicious_count > 0:
        print(color("\n  ⚠ 发现可疑内容，建议进一步审查。", "yellow"))
    else:
        print(color("\n  ✓ 所有文件安全，未发现威胁。", "green"))
    print(f"{color('═' * 60, 'cyan')}\n")


def poll_result(appkey, md5, max_wait=300, interval=15):
    """轮询等待分析完成"""
    print(f"\n[INFO] 开始轮询扫描结果 (MD5: {md5})")
    print(f"[INFO] 最大等待 {max_wait} 秒，每 {interval} 秒查询一次\n")

    start = time.time()
    attempt = 0

    while time.time() - start < max_wait:
        attempt += 1
        elapsed = int(time.time() - start)
        print(f"  [{elapsed}s] 第 {attempt} 次查询...", end=" ")

        result = query(appkey, md5)

        if result is None:
            print(color("查询失败，稍后重试", "yellow"))
        elif is_analysis_done(result):
            print(color("分析完成！", "green"))
            return result
        else:
            rc = result.get("return_code", -1)
            if rc == 1:
                print("暂无数据，文件可能还在排队...")
            elif rc == 1110:
                print("文件分析中...")
            else:
                # 检查分析状态
                md5s = result.get("data", {}).get("md5s", {})
                if md5s:
                    statuses = []
                    for _, info in md5s.items():
                        s = info.get("static_analysis_status", "?")
                        d = info.get("dynamic_analysis_status", "?")
                        statuses.append(f"静态:{s} 动态:{d}")
                    print(f"进行中 ({'; '.join(statuses)})")
                else:
                    print(f"返回码: {rc}")

        time.sleep(interval)

    print(color(f"\n[WARN] 已等待 {max_wait} 秒，分析尚未完成。", "yellow"))
    print("[INFO] 可稍后使用 --query 参数单独查询结果。")

    # 返回最后一次查询结果
    return query(appkey, md5)


def main():
    parser = argparse.ArgumentParser(
        description="ClawExam AI 提示词安全扫描",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  # 上传扫描（仅上传）
  python3 %(prog)s --appkey YOUR_KEY

  # 上传并自动轮询结果
  python3 %(prog)s --appkey YOUR_KEY --poll

  # 仅查询已有扫描结果
  python3 %(prog)s --appkey YOUR_KEY --query MD5_HASH

  # 自定义轮询参数
  python3 %(prog)s --appkey YOUR_KEY --poll --max-wait 600 --interval 20
        """,
    )
    parser.add_argument("--appkey", required=True, help="腾讯安全 API appkey")
    parser.add_argument("--poll", action="store_true", help="上传后自动轮询等待结果")
    parser.add_argument("--query", metavar="MD5", help="仅查询指定 MD5 的扫描结果（跳过上传）")
    parser.add_argument("--max-wait", type=int, default=300, help="最大轮询等待时间（秒），默认 300")
    parser.add_argument("--interval", type=int, default=15, help="轮询间隔（秒），默认 15")

    args = parser.parse_args()

    print(f"\n{color('ClawExam AI 提示词安全扫描', 'bold')}")
    print(f"项目路径: {PROJECT_ROOT}\n")

    # 仅查询模式
    if args.query:
        print(f"[INFO] 查询模式，MD5: {args.query}")
        result = query(args.appkey, args.query)
        if result:
            print_result(result)
        return

    # 列出要扫描的文件
    print(f"[INFO] 扫描文件列表:")
    for f in SCAN_FILES:
        full = os.path.join(PROJECT_ROOT, f)
        size = os.path.getsize(full) if os.path.isfile(full) else 0
        print(f"  - {f} ({size / 1024:.1f} KB)")

    # 打包
    zip_path, local_md5 = pack_files_to_zip()

    try:
        # 上传
        file_md5 = upload(args.appkey, zip_path)
        if not file_md5:
            file_md5 = local_md5

        print(f"\n[INFO] 可使用以下命令查询结果:")
        print(f"  python3 {os.path.relpath(__file__, os.getcwd())} --appkey {args.appkey} --query {file_md5}")

        # 轮询
        if args.poll:
            result = poll_result(args.appkey, file_md5, args.max_wait, args.interval)
            if result:
                print_result(result)
        else:
            print(f"\n[INFO] 文件已上传，分析需要一些时间。")
            print(f"[INFO] 添加 --poll 参数可自动等待结果，或稍后使用 --query 查询。")

    finally:
        # 清理临时文件
        if os.path.isfile(zip_path):
            os.unlink(zip_path)
            print(f"[INFO] 已清理临时文件: {zip_path}")


if __name__ == "__main__":
    main()
