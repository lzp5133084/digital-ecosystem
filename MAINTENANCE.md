# 数字生态图鉴 · 月度巡检 SOP

> 适用范围：GitHub Pages + tools.ecojia.cn 双端
> 建议频率：每月 1 次（30 分钟内完成）
> 维护人：军哥懂保

---

## 一、5 分钟快检（每周）

| # | 检查项 | 通过标准 | 异常处置 |
|---|---|---|---|
| 1 | https://tools.ecojia.cn/digital-ecosystem/ 打开 | 200，标题正确 | 看 `/var/log/caddy/error.log` |
| 2 | https://lzp5133084.github.io/digital-ecosystem/ 打开 | 200 | 查 GitHub Status |
| 3 | 搜索"AI" → 看结果数 | ≥ 5 条 | 看控制台报错 |
| 4 | 点任一卡片打开详情 | 弹窗显示 + 有版本 tab | 看 console 报错 |
| 5 | 页脚显示最新更新时间 | 与最近 push 一致 | 看 Actions 是否成功 |

---

## 二、15 分钟月度巡检

### 1. 双端同步状态
```bash
# 服务器上跑：
sudo /opt/ecojia/scripts/digital-ecosystem-sync-check.sh
tail -5 /var/log/ecojia-sync-check.log
```
- ✅ 显示"同步正常" → 通过
- ❌ 显示"偏移" → 检查 [Actions 页面](https://github.com/lzp5133084/digital-ecosystem/actions)

### 2. 性能基线
打开 PageSpeed Insights：
- https://pagespeed.web.dev/analysis?url=https%3A%2F%2Ftools.ecojia.cn%2Fdigital-ecosystem%2F

| 指标 | 目标 | 当前基线 |
|---|---|---|
| FCP | <1.5s | ~1.0s |
| LCP | <2.5s | ~1.5s |
| CLS | <0.1 | <0.05 |
| Performance 分 | >85 | 待测 |

### 3. 安全扫描
- https://securityheaders.com/?q=tools.ecojia.cn
- 目标：A 级以上

### 4. 服务器资源
```bash
ssh ubuntu@118.24.173.246
df -h         # 磁盘 < 85%
free -h       # 内存余量 > 200MB
uptime        # load < 2.0
```

### 5. 证书有效期
```bash
echo | openssl s_client -connect tools.ecojia.cn:443 2>/dev/null | openssl x509 -noout -dates
```
剩余 < 30 天 → 检查 Caddy 自动续期。

---

## 三、用户行为数据（可选）

打开浏览器控制台（F12）：

```javascript
// 查看本地统计
ecosystemApp.getStats()

// 导出 JSON（自动下载）
ecosystemApp.exportStats()
```

字段说明：
- `searches` 搜索次数
- `detailOpens` 详情打开总数
- `detailByApp` 各应用打开次数（识别热门应用）
- `favorites` 收藏操作次数
- `shares` 分享次数
- `errors` 客户端异常（最近 50 条）

---

## 四、异常处置速查

| 现象 | 排查路径 |
|---|---|
| GitHub Pages 200 但 ecojia 异常 | SSH 看 `sudo tail -50 /var/log/caddy/error.log` |
| 双端都 404 | 看 Actions 是否失败 |
| 详情打不开 | 控制台 `window.ECO_DATA` 是否存在 |
| 图片全 404 | `ls /opt/ecojia/tools/digital-ecosystem/assets/` |
| 同步偏移 | 重跑 Actions → deploy.yml |

---

## 五、应急联系

- 服务器：腾讯云 118.24.173.246（ubuntu / 密码 / ED25519 密钥）
- 仓库：https://github.com/lzp5133084/digital-ecosystem
- 部署密钥备份：`work/sites/digital-ecosystem/.deploy/id_ed25519`
- 域名 DNS：ecojia.cn 解析到 118.24.173.246

---

## 六、版本发布 Checklist（每次 push 前）

- [ ] 本地起 `python -m http.server 8123` 跑一遍点击流
- [ ] 控制台无红色报错
- [ ] 页脚时间已更新
- [ ] `git push` 后等 1 分钟看 Actions 是否绿
- [ ] 访问 tools.ecojia.cn/digital-ecosystem/ 抽查一个详情页

---

最近更新：2026-10-25 · 军哥懂保
