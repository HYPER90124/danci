# 四级词汇

手机浏览器直接可用的 CET-4 背单词应用。React + Vite + TypeScript，静态部署到 GitHub Pages。

## 功能

- **随机词序**：新词从整个词库随机抽取，不按字母或词频顺序学习。
- **20 词一组**：先预习 20 词（单词 + 音标 + 释义），再答题这 20 词；答完一组才会进入下一组预习。
- **基础模式**：四选一（词性 + 中文释义）。答错的词会在中间隔 10 个单词后再次出现，同组错三次才跳过并加入错题本。
- **词性模式**：选项只显示英文单词，答完再显示词性和中文释义；四个选项词性互不相同，只靠语法就能选出答案，错三次跳过并加入错题本。
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

默认使用 `gh-pages` 分支部署，不需要额外权限：

```bash
npm run deploy        # 构建并把 dist 推到 gh-pages 分支
```

首次部署后，在仓库 Settings → Pages → Source 选择 `gh-pages` 分支，然后访问
`https://<用户名>.github.io/<仓库名>/`，手机浏览器「添加到主屏幕」即可。

如果希望改用 GitHub Actions 自动部署，把 `.github/deploy.yml.example` 复制为
`.github/workflows/deploy.yml` 并提交（需要 token 具备 `workflow` scope），
然后在 Settings → Pages 选择 **GitHub Actions**。

`vite.config.ts` 使用 `base: './'`，资源按相对路径加载，仓库名可以任意。
