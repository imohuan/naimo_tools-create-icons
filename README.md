# 🎨 图标制作工具

> 智能裁剪图片并生成多种尺寸的图标 - Naimo Tools 插件

## ✨ 功能特性

- ✅ **可交互裁剪** - 使用 Cropper.js 实现可拖拽、缩放的裁剪功能
- ✅ **自由调整** - 拖拽移动图片、滚轮缩放图片，裁剪框固定在中心
- ✅ **圆角调节** - 0-50% 圆角半径自由调节，实时预览
- ✅ **多种尺寸** - 支持生成 16x16 到 1024x1024 共 10 种尺寸
- ✅ **批量导出** - 一键下载所有选中尺寸的图标
- ✅ **高质量输出** - PNG 格式，支持透明背景
- ✅ **界面美观** - 现代化的 UI 设计，操作简单直观

## 📖 使用方法

### 方式一：通过 Naimo Tools 使用

1. 在 Naimo Tools 中安装本插件
2. 在搜索框中输入 `图标制作` 或 `icon`
3. 选择图片或拖拽图片到上传区域
4. 调整圆角半径（可选）
5. 选择需要的尺寸
6. 点击"下载全部"或单独下载

### 方式二：直接接收图片

1. 复制图片到剪贴板
2. 在 Naimo Tools 搜索框中粘贴图片
3. 选择"制作图标"功能
4. 自动打开工具并加载图片

## 🎯 支持的尺寸

- 16x16 - 小图标
- 24x24 - 小图标
- 32x32 - 中图标
- 48x48 - 中图标
- 64x64 - 大图标
- 96x96 - 大图标
- 128x128 - 超大图标
- 256x256 - 超大图标
- 512x512 - 特大图标
- 1024x1024 - 超高清图标

## 🛠️ 开发

### 安装依赖

```bash
pnpm install
pnpm run add-electron-types  # 安装 Electron 类型定义（推荐）
```

### 开发模式

```bash
pnpm run dev
```

### 构建插件

```bash
pnpm run build
```

构建产物将输出到 `dist/` 目录。

### 类型检查

```bash
pnpm run type-check
```

## 📁 项目结构

```
create-icons/
├── src/
│   ├── main.ts          # 主逻辑：图标生成、裁剪、下载
│   ├── preload.ts       # Preload 脚本：接收图片数据
│   └── style.css        # 样式文件：Tailwind + 自定义动画
├── dist/                # 构建输出目录
├── scripts/             # 构建脚本
├── typings/             # TypeScript 类型定义
│   └── naimo.d.ts      # Naimo API 类型声明
├── index.html           # HTML 入口：上传页面 + 工作页面
├── manifest.json        # 插件配置文件
├── schema.json         # manifest.json JSON Schema
├── package.json        # 包管理配置
├── tsconfig.json       # TypeScript 配置
├── vite.config.ts      # Vite 配置
└── README.md           # 说明文档
```

## 🔧 技术栈

- **TypeScript** - 类型安全的 JavaScript
- **Vite** - 快速的开发服务器和构建工具
- **Tailwind CSS** - 实用优先的 CSS 框架
- **Canvas API** - 图片处理和裁剪
- **Naimo Tools Plugin API** - 插件系统接口

## 💡 实现原理

1. **图片接收**：通过 Naimo 的 `img` 类型功能接收图片数据（base64）
2. **智能裁剪**：使用 Canvas API 将图片居中裁剪为正方形
3. **圆角处理**：通过 Canvas 路径裁剪实现圆角效果
4. **多尺寸生成**：将裁剪后的图片缩放到不同尺寸
5. **批量下载**：生成 PNG 格式图片并触发浏览器下载

## 🎨 界面设计

- **上传页面**：美观的拖拽上传区域，支持点击选择文件
- **工作页面**：左右分栏布局
  - 左侧：原图预览、圆角调节、实时预览
  - 右侧：尺寸选择、图标预览、下载按钮

## 🔄 热重载

开发模式下支持热重载：

- 修改 `src/main.ts` 或 `src/style.css` 会自动刷新页面
- 修改 `src/preload.ts` 会自动重新构建并重载插件

## 🚀 部署

### 本地测试

1. 运行 `pnpm run build` 构建插件
2. 将整个项目文件夹复制到 Naimo Tools 的 `plugins/` 目录
3. 重启 Naimo Tools
4. 在搜索框中输入 `图标制作` 测试功能

### 打包发布

使用部署脚本自动打包：

```bash
pnpm run deploy
```

或手动打包以下文件：

```
create-icons.zip
├── dist/
├── manifest.json
├── schema.json
└── README.md
```

## ❓ 常见问题

### Q: 为什么图片会被裁剪？

A: 为了生成正方形图标，工具会自动将图片居中裁剪为正方形。建议上传正方形或接近正方形的图片以获得最佳效果。

### Q: 支持哪些图片格式？

A: 支持所有浏览器支持的图片格式，包括 PNG、JPG、JPEG、WEBP、GIF 等。推荐使用 PNG 格式以保留透明背景。

### Q: 生成的图标质量如何？

A: 使用 Canvas API 进行高质量缩放，小尺寸图标会使用像素化渲染以保持清晰度。

### Q: 如何批量处理多张图片？

A: 当前版本每次处理一张图片。如需批量处理，可以多次使用工具，或等待后续版本更新。

## 📝 开发说明

### 核心函数

- `cropToSquare()` - 裁剪图片为正方形
- `generateIcon()` - 生成指定尺寸的图标
- `applyRoundedCorners()` - 应用圆角效果
- `updatePreview()` - 更新预览画布
- `downloadIcon()` - 下载单个图标
- `downloadAllIcons()` - 批量下载图标

### 关键配置

- `availableSizes` - 可用的图标尺寸列表
- `selectedSizes` - 当前选中的尺寸
- `borderRadius` - 圆角半径（0-50）

## 📄 许可证

MIT License

## 🙏 致谢

- 图标制作功能参考了 [图标制作.html](./图标制作.html)
- 使用 [Naimo Tools](https://naimo.tools) 插件系统
- UI 设计使用 [Tailwind CSS](https://tailwindcss.com)
