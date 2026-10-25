# 四级词汇

手机浏览器直接可用的 CET-4 背单词应用。React + Vite + TypeScript，静态部署到 GitHub Pages。

## 功能

- **基础模式**：打乱出词，四选一（词性 + 中文释义）。答错会在本次练习中稍后再出现，同组错两次自动进错题本。
- **批次滑块**：一次 10–80 词，优先安排 SRS 到期复习，再补新词。
- **词性模式**：看带空格的句子，四个选项词性互不相同，只靠语法就能选出答案。
- **错题本**：按错误次数排序，一键复习。
- **统计面板**：今日/累计数据、近 14 天柱状 + 正确率折线、词性正确率、错题 Top 10。
- **简化 SRS**：间隔 1/3/7/15/30/60 天，答错回退一档。
- **本地存储**：localStorage，支持导出/导入 JSON 备份与迁移。

## 开发

```bash
npm install
npm run data        # 生成 public/data/words.json
npm run sentences   # 生成 public/data/sentences.json
npm run dev         # 手机同 WiFi 访问终端里的 Network 地址
npm run build
npm run preview
```

`npm run data` 会自动下载 [ECDICT](https://github.com/skywind3000/ECDICT)（约 66 MB，缓存在 `scripts/.cache/`，已 gitignore）并按 `data/cet_4_words.txt` 抽词。

## 词库维护

- `data/cet_4_words.txt`：权威词表，一行一个词，`/` 表示可选拼写。
- `data/overrides.json`：释义人工覆盖，优先级最高。格式：

```json
{
  "abandon": [{ "pos": "v.", "cn": "放弃；抛弃" }]
}
```

- `data/missing.json`：构建时未能取到释义的词，可补到 overrides 或 supplement。

## 部署到 GitHub Pages

1. 新建公开仓库（默认名 `danci`），推送到 `main`。
2. 仓库 Settings → Pages → Source 选 **GitHub Actions**。
3. Actions 运行完成后访问 `https://<用户名>.github.io/<仓库名>/`。
4. 手机浏览器打开后「添加到主屏幕」。

`vite.config.ts` 使用 `base: './'`，资源按相对路径加载，仓库名可以任意。
