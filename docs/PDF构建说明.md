# 正式 PDF 的维护与重建

PDF 由 `book/` 解析结果生成；避坑清单复用正文中的建议，不维护第二份答案。署名为栗子豪，正文 CC BY-NC 4.0，代码 MIT，内嵌霞鹜文楷按 SIL OFL 1.1。

需要 Node.js 20+、Python 3.9+。安装 PDF 专用依赖并构建：

```text
python -m pip install -r tools/requirements-pdf.txt
node tools/build.mjs
python tools/build_pdf.py
```

输出 `dist/HowToTrainBetter.pdf` 与 `dist/pdf-manifest.json`。字体保存在 assets/fonts/，构建和阅读都不在线下载字体；字体来源、校验值与完整许可随源包提供。网页没有新增 Python 或字体联网依赖。

A4 单栏，中文字体嵌入，正文可提取、搜索和复制；目录、PDF 书签、章条交叉引用与来源链接可点击。每页都有淡水印与署名、版本、页码。水印只标示来源，不阻止许可允许的分享或改编。

排版检查需要 Poppler 与 Pillow（当前由报告库依赖安装）。把每页渲染到一个新的目录，避免旧页残留：

```text
pdftoppm -r 90 -png dist/HowToTrainBetter.pdf 临时页面目录/page
python tools/qa_pdf.py --pages 临时页面目录
```

自动检查所有页的字体嵌入与文字边界，并生成拼图供人工逐页查看。它不能替代目视检查。每次内容或字体变化后都应重新构建、渲染和查看；生成清单里的 layoutReview 默认为待检查，实际目视记录保存在内部 docs/qa/pdf-results.json，不由构建程序冒充人工通过。

打包会核对 PDF 哈希及正文指纹；修改正文后直接打包会拒绝过期 PDF。PDF 与 HTML 的字节不同，但都来自同一份正文。

## v0.9 遮挡修正与复核

直接建议使用独立标题与段落间距，不再绘制外扩背景。续页保留标题，长条目在方法和依据之间分页。自动检查增加实体背景矩形与页脚侵入检查；同时用 Poppler 全页图及 Edge 原生PDF阅读器核对重点页。不要把页面截图生成成功当作人工验收通过；最终文件哈希应与实际目视记录一致。
