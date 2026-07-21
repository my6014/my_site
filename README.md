# 🖥️ 马勇的个人主页

> Win98 风格模拟桌面 | 纯 HTML/CSS/JS

一个怀旧 Windows 98/Me 风格的交互式个人主页，模拟经典 CRT 显示器桌面体验。

## ✨ 特性

- 🖥️ **CRT 显示器外观** — 经典球面屏幕 + LED 指示灯
- 🪟 **Win98 窗口系统** — 可拖拽、最小化、关闭的模拟窗口
- 🎨 **像素风图标** — SVG 内联图标，还原经典桌面风格
- 📝 **内置应用：**
  - 我的电脑 — 个人简介
  - Google Chrome — 浏览器入口
  - 记事本 — 随笔/笔记
  - 作品集 — 项目展示
  - 关于我 — 个人信息
  - 技能 — 技能展示

## 🚀 本地运行

```bash
cd simulated-os

# 方式一：使用 npm
npm start        # npx serve . -p 3000

# 方式二：任意静态服务器
npx serve . -p 3000

# 方式三：直接用浏览器打开
open index.html
```

浏览器访问 `http://localhost:3000`。

## 📁 项目结构

```
my_site/
└── simulated-os/
    ├── index.html          # 主页面
    ├── app.js              # 窗口系统 + 交互逻辑
    ├── style.css           # Win98 经典样式
    ├── package.json
    └── fonts/
        ├── perfect-dos.woff
        └── perfect-dos.woff2
```

## 🛠️ 技术栈

- **HTML5** — 语义化结构
- **CSS3** — CRT 特效、Win98 经典控件样式
- **Vanilla JavaScript** — 窗口管理器、拖拽系统、应用逻辑

## 📄 License

MIT © 马勇
