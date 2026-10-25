#!/usr/bin/env python3
"""
数字生态图鉴 · 告警通知守护进程
每 2 分钟检查 status.json，状态变化时推送通知。

通知通道（按优先级，可多开）：
  1. Server酱微信推送  - 需 sendkey
  2. 飞书自定义机器人  - 需 webhook
  3. 邮件 SMTP         - 需 smtp 配置
  4. 本地日志          - 始终启用

部署：/opt/ecojia/scripts/ecosystem_alert.py
配置：/opt/ecojia/scripts/alert_config.json
服务：systemctl status ecosystem-alert
"""

import json
import os
import sys
import time
import smtplib
import urllib.request
import urllib.parse
from email.mime.text import MIMEText
from datetime import datetime, timezone
from pathlib import Path

CONFIG_PATH = os.environ.get("ALERT_CONFIG", "/opt/ecojia/scripts/alert_config.json")
STATUS_PATH = "/opt/ecojia/tools/digital-ecosystem/status.json"
STATE_PATH = "/tmp/ecosystem_alert_state.json"
LOG_PATH = "/var/log/ecosystem-alert.log"
SITE_NAME = "数字生态图鉴"
DASHBOARD_URL = "https://tools.ecojia.cn/digital-ecosystem/dashboard.html"

# 告警阈值
THRESHOLDS = {
    "ssl_days_warn": 14,       # SSL 剩余 < 14 天
    "ssl_days_crit": 7,        # SSL 剩余 < 7 天
    "disk_pct_warn": 80,
    "disk_pct_crit": 90,
    "mem_pct_warn": 85,
    "mem_pct_crit": 95,
    "load_warn": 2.0,
    "load_crit": 4.0,
    "resp_ms_warn": 3000,      # 响应时间 > 3s
}


def load_config():
    try:
        with open(CONFIG_PATH, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError as e:
        log(f"配置文件解析失败: {e}")
        return {}


def log(msg):
    line = f"[{datetime.now().strftime('%F %T')}] {msg}"
    print(line, flush=True)
    try:
        with open(LOG_PATH, "a", encoding="utf-8") as f:
            f.write(line + "\n")
    except Exception:
        pass


def load_state():
    try:
        with open(STATE_PATH, encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def save_state(state):
    try:
        with open(STATE_PATH, "w", encoding="utf-8") as f:
            json.dump(state, f, ensure_ascii=False)
    except Exception as e:
        log(f"状态写入失败: {e}")


def fetch_status():
    try:
        with open(STATUS_PATH, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return None
    except json.JSONDecodeError as e:
        log(f"status.json 解析失败: {e}")
        return None


def evaluate(status):
    """返回告警列表 [{level, code, title, detail}]"""
    alerts = []
    if not status:
        alerts.append({"level": "crit", "code": "STATUS_MISSING",
                       "title": "监控数据缺失", "detail": "status.json 不存在或无法解析"})
        return alerts

    sites = status.get("sites", {})
    for name, info in [("GitHub Pages", sites.get("github", {})),
                       ("tools.ecojia.cn", sites.get("ecojia", {}))]:
        if not info.get("ok"):
            alerts.append({"level": "crit", "code": f"SITE_DOWN_{name.upper().replace('.','_').replace(' ','_')}",
                           "title": f"{name} 不可达",
                           "detail": f"HTTP {info.get('status', 0)} ({info.get('ms', 0)}ms) · {info.get('err', '')}"})
        elif info.get("ms", 0) > THRESHOLDS["resp_ms_warn"]:
            alerts.append({"level": "warn", "code": f"SITE_SLOW_{name.upper().replace('.','_').replace(' ','_')}",
                           "title": f"{name} 响应变慢",
                           "detail": f"响应时间 {info['ms']}ms（阈值 {THRESHOLDS['resp_ms_warn']}ms）"})

    sync = status.get("sync", {})
    if sync and not sync.get("match", True):
        alerts.append({"level": "warn", "code": "SYNC_MISMATCH",
                       "title": "双端同步偏移",
                       "detail": f"GitHub: {sync.get('github_sha','?')} | 服务器: {sync.get('server_hash','?')}"})

    ssl = status.get("ssl_days_left")
    if ssl is not None:
        if ssl < THRESHOLDS["ssl_days_crit"]:
            alerts.append({"level": "crit", "code": "SSL_EXPIRING",
                           "title": f"SSL 证书即将过期（{ssl} 天）",
                           "detail": f"tools.ecojia.cn 剩余 {ssl} 天"})
        elif ssl < THRESHOLDS["ssl_days_warn"]:
            alerts.append({"level": "warn", "code": "SSL_WARN",
                           "title": f"SSL 证书剩余不足（{ssl} 天）",
                           "detail": f"tools.ecojia.cn 剩余 {ssl} 天"})

    res = status.get("resources", {})
    disk = res.get("disk", {})
    if disk and disk.get("pct", 0) >= THRESHOLDS["disk_pct_crit"]:
        alerts.append({"level": "crit", "code": "DISK_FULL",
                       "title": f"磁盘空间不足（{disk['pct']}%）",
                       "detail": f"已用 {disk.get('used_mb',0)}MB / {disk.get('total_mb',0)}MB"})
    elif disk and disk.get("pct", 0) >= THRESHOLDS["disk_pct_warn"]:
        alerts.append({"level": "warn", "code": "DISK_HIGH",
                       "title": f"磁盘使用率偏高（{disk['pct']}%）",
                       "detail": f"已用 {disk.get('used_mb',0)}MB / {disk.get('total_mb',0)}MB"})

    mem = res.get("memory", {})
    if mem and mem.get("pct", 0) >= THRESHOLDS["mem_pct_crit"]:
        alerts.append({"level": "crit", "code": "MEM_HIGH",
                       "title": f"内存占用过高（{mem['pct']}%）",
                       "detail": f"已用 {mem.get('used_mb',0)}MB / {mem.get('total_mb',0)}MB"})
    elif mem and mem.get("pct", 0) >= THRESHOLDS["mem_pct_warn"]:
        alerts.append({"level": "warn", "code": "MEM_WARN",
                       "title": f"内存占用偏高（{mem['pct']}%）",
                       "detail": f"已用 {mem.get('used_mb',0)}MB / {mem.get('total_mb',0)}MB"})

    load = res.get("load") or [0, 0, 0]
    if load and load[0] >= THRESHOLDS["load_crit"]:
        alerts.append({"level": "crit", "code": "LOAD_HIGH",
                       "title": f"系统负载过高（{load[0]:.2f}）",
                       "detail": f"1/5/15 分钟: {load[0]:.2f} / {load[1]:.2f} / {load[2]:.2f}"})
    elif load and load[0] >= THRESHOLDS["load_warn"]:
        alerts.append({"level": "warn", "code": "LOAD_WARN",
                       "title": f"系统负载偏高（{load[0]:.2f}）",
                       "detail": f"1/5/15 分钟: {load[0]:.2f} / {load[1]:.2f} / {load[2]:.2f}"})

    return alerts


def format_message(alerts, is_recovery=False):
    if is_recovery:
        title = f"✅ {SITE_NAME} 告警已恢复"
        body = "所有指标已恢复正常。\n\n"
    else:
        has_crit = any(a["level"] == "crit" for a in alerts)
        title = f"{'🔴' if has_crit else '🟡'} {SITE_NAME} 告警（{len(alerts)} 条）"
        body = ""

    for a in alerts:
        icon = {"crit": "🔴", "warn": "🟡"}.get(a["level"], "⚪")
        body += f"{icon} [{a['code']}] {a['title']}\n   {a['detail']}\n\n"

    body += f"📊 监控大屏：{DASHBOARD_URL}\n"
    body += f"⏰ {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
    return title, body


def notify_serverchan(sendkey, title, body):
    if not sendkey:
        return False
    try:
        url = f"https://sctapi.ftqq.com/{sendkey}.send"
        data = urllib.parse.urlencode({"title": title, "desp": body}).encode()
        req = urllib.request.Request(url, data=data)
        with urllib.request.urlopen(req, timeout=10) as r:
            resp = json.load(r)
            if resp.get("code") == 0:
                return True
            log(f"Server酱返回异常: {resp}")
            return False
    except Exception as e:
        log(f"Server酱推送失败: {e}")
        return False


def notify_feishu(webhook, title, body):
    if not webhook:
        return False
    try:
        payload = json.dumps({"msg_type": "text", "content": {"text": f"{title}\n\n{body}"}}).encode()
        req = urllib.request.Request(webhook, data=payload, headers={"Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=10) as r:
            resp = json.load(r)
            if resp.get("code") == 0 or resp.get("StatusCode") == 0:
                return True
            log(f"飞书返回异常: {resp}")
            return False
    except Exception as e:
        log(f"飞书推送失败: {e}")
        return False


def notify_email(cfg, title, body):
    if not cfg or not cfg.get("enabled"):
        return False
    try:
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = title
        msg["From"] = cfg["from"]
        msg["To"] = cfg["to"]
        with smtplib.SMTP_SSL(cfg["host"], cfg.get("port", 465)) as smtp:
            smtp.login(cfg["user"], cfg["password"])
            smtp.sendmail(cfg["from"], cfg["to"].split(","), msg.as_string())
        return True
    except Exception as e:
        log(f"邮件推送失败: {e}")
        return False


def send_notification(alerts, is_recovery=False):
    title, body = format_message(alerts, is_recovery)
    log(f"{'恢复通知' if is_recovery else '告警'}: {title}")

    cfg = load_config()
    channels = cfg.get("channels", {})

    sent = False
    if notify_serverchan(channels.get("serverchan", {}).get("sendkey"), title, body):
        sent = True
    if notify_feishu(channels.get("feishu", {}).get("webhook"), title, body):
        sent = True
    if notify_email(channels.get("email"), title, body):
        sent = True

    if not sent:
        log(f"（未配置推送通道，仅记录日志）\n{title}\n{body}")
    return sent


def main():
    log(f"{'='*60}")
    log(f"{SITE_NAME} 告警守护进程启动")
    log(f"配置: {CONFIG_PATH}")
    log(f"状态: {STATE_PATH}")
    log(f"日志: {LOG_PATH}")

    cfg = load_config()
    interval = cfg.get("interval_seconds", 120)

    # 启动通知
    start_msg = (f"🚀 {SITE_NAME} 告警监控已启动\n\n"
                 f"检查间隔：{interval} 秒\n"
                 f"阈值：SSL<{THRESHOLDS['ssl_days_warn']}天 / 磁盘>{THRESHOLDS['disk_pct_warn']}% / 内存>{THRESHOLDS['mem_pct_warn']}% / 负载>{THRESHOLDS['load_warn']}\n"
                 f"大屏：{DASHBOARD_URL}")
    send_notification([{"level": "info", "code": "MONITOR_START",
                        "title": "告警监控已启动",
                        "detail": f"检查间隔 {interval} 秒"}])

    state = load_state()
    last_codes = set(state.get("active_codes", []))

    while True:
        try:
            status = fetch_status()
            alerts = evaluate(status)
            current_codes = {a["code"] for a in alerts}

            # 新出现的告警
            new_codes = current_codes - last_codes
            # 已恢复的告警
            recovered_codes = last_codes - current_codes

            if new_codes:
                new_alerts = [a for a in alerts if a["code"] in new_codes]
                send_notification(new_alerts)

            if recovered_codes and not current_codes:
                # 全部恢复
                send_notification([], is_recovery=True)
            elif recovered_codes:
                # 部分恢复，发恢复通知
                recovered = [{"level": "info", "code": c,
                              "title": f"{c} 已恢复", "detail": "指标已回到正常范围"}
                             for c in recovered_codes]
                send_notification(recovered, is_recovery=True)

            last_codes = current_codes
            save_state({"active_codes": list(current_codes),
                        "updated": datetime.now(timezone.utc).isoformat()})

        except Exception as e:
            log(f"检查循环异常: {e}")

        time.sleep(interval)


if __name__ == "__main__":
    main()
