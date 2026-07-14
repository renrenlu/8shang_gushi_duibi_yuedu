# 古诗词比较阅读互动学习

面向中学生的古诗词比较阅读自学网页，完整整理《基础知识之古诗词比较阅读》中的 50 组练习。

## 功能

- 50 组古诗词对读与四选一练习
- 即时判题、答案解析、错题重做和收藏复习
- 按主题筛选、按诗题或作者搜索
- 本机保存学习进度与正确率
- 每组配有“晓晓”校音版普通话朗读，可调节语速
- 清新水彩插画与手机、平板、电脑响应式布局

在线版本：

- [GitHub Pages 公开版](https://renrenlu.github.io/8shang_gushi_duibi_yuedu/)
- [ChatGPT Sites 版](https://classical-poetry-compare-50.renren49.chatgpt.site)

## 本地运行

需要 Node.js `>=22.13.0`。

```bash
npm install
npm run dev
```

质量检查：

```bash
npm test
npm run lint
```

推送到 `main` 分支后，GitHub Actions 会自动构建并更新 GitHub Pages。

## 重新生成朗读音频

朗读音频由免费的 `edge-tts` 和 `zh-CN-XiaoxiaoNeural` 预先生成。多音字、古音、人名和地名校正记录在 `scripts/poetry_pronunciations.json`；网页展示的诗文原文不会被替换。

```bash
python3 -m pip install -r scripts/requirements-audio.txt
npm run audio:generate
```

生成结果位于 `public/audio/`，共 50 个 MP3 文件。
