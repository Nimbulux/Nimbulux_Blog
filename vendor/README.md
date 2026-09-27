# vendor/ —— 第三方库

路径在 `app/js/config.js` 的 `vendor` 段里配，**缺哪个都能跑**，只是对应功能降级。

| 文件 | 必需性 | 用途 / 缺了会怎样 |
| --- | --- | --- |
| `marked/marked.min.js` | 需要 | Markdown 渲染。缺了正文会显示一行提示 |
| `highlight/highlight.min.js` | 可选 | 代码高亮。缺了代码块就是纯文本，配色仍由 `post.css` 兜底 |
| `highlight/github.min.css`<br>`highlight/github-dark.min.css` | 可选 | 高亮主题，亮暗各一份，跟随主题切换 |
| `dompurify/purify.min.js` | 可选 | 渲染结果清洗。缺了直接输出 marked 的结果 |

## 下载地址

- marked（v12+，用 `marked.use({renderer})` 的 token 接口）
  https://cdn.jsdelivr.net/npm/marked@12.0.2/marked.min.js
- highlight.js（要 full / common 构建，自带语言定义）
  https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.9.0/build/highlight.min.js
  - 主题：同目录 `build/styles/github.min.css` 与 `github-dark.min.css`
- DOMPurify
  https://cdn.jsdelivr.net/npm/dompurify@3.1.6/dist/purify.min.js

## 加载方式

这些文件都**不在页面里直接引用**，用到时才由 `Dom.need()` 插 `<script>`：

- 打开主页 / 好友页：只加载 marked（渲染那几段 md）
- 打开文章页：加载 marked + highlight（代码高亮）+ DOMPurify
- 打开加密文章：再加载文章页目录里的 `crypto.js`

所以只逛主页时，highlight 与 DOMPurify 一个字节都不会下载。
