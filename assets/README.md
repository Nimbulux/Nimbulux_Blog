> 这个目录放**站点内部**才用的资源：图标、正文插图、头像、封面……
> 需要给外层基本页面公用的（favicon、站点 logo）放仓库根的 `assets/`。
> 路径在 `app/js/config.js` 的 `assets.root` 配置，默认 `assets`（相对 `app/` 根，脚本里用 `C.assets.root`）。

| 目录 / 文件 | 用途 |
| --- | --- |
| `icons/*.svg` | 图标源文件，每个图标一个 .svg，构建时内联进各页面的 `<svg class="icon-sprite">` |
| 其他图片 | 正文插图、头像、封面等，按需新建 |

## 加一个图标

1. 往 `icons/` 里放一个 24×24 视图框的 `.svg`（描边用 `currentColor`，能跟着文字颜色走）
2. 把 `<symbol id="i-<名字>" viewBox="0 0 24 24">…</symbol>` 复制进每个页面内联的符号表里
   （`app/index.html`、`app/pages/post/index.html`、`friends`、`about` 各一份，从已有页面复制即可）
3. 代码里用名字调用：`Dom.icon('<名字>')` 或 `Icons.svg('<名字>')`

图标是内联的，运行时零请求，`file://` 直接打开也能显示。

## 换成自己的图

- 站点 logo 和 favicon 不在这里，见仓库根 `assets/README.md`
- 正文里插图直接写相对路径，或写成 `assets.root + '/xxx.svg'`
