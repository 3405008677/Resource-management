# Resource Server

[English README](README.en.md)

一个基于 Express 的静态资源服务器，用于提供图片、音频等资源文件的 HTTP 服务。

## 功能特性

- 🚀 快速启动的 Express 服务器
- 📁 静态资源文件服务
- 🔒 安全的 CORS 配置
- 🏥 健康检查端点
- 📊 API 信息查询
- 🛡️ 安全头部保护
- ⚡ 优雅的服务器关闭处理
- ⚙️ `src/config.js` 集中配置（端口、CORS、分类等）
- ➕ 后台 API 及前端界面支持动态新增分类

## 项目结构

```
resource/
├── src/
│   └── index.js          # 主服务器文件
├── public/               # 静态资源目录
│   ├── image/           # 图片资源
│   ├── audio/           # 音频资源
│   └── index.html       # 首页
├── package.json
├── .gitignore
└── README.md
```

## 安装教程

### 前置要求

- Node.js >= 14.0.0
- npm >= 6.0.0

### 安装步骤

1. 克隆或下载项目到本地
2. 安装依赖：

```bash
npm install
```

3. 配置 `src/config.js`：
   - 所有原 `.env` 参数已整合到 `src/config.js`
   - 可直接修改其中的 `PORT`、`ALLOWED_ORIGINS`、`CATEGORIES` 等字段
   - 服务器重新启动即可生效（使用 `/api/category` 接口新增时会自动重载）

`src/config.js` 片段：

```js
module.exports = {
  PORT: 8023,
  NODE_ENV: "development",
  MAX_FILE_SIZE: 100 * 1024 * 1024,
  ALLOWED_ORIGINS: ["*"],
  CATEGORIES: [
    {
      key: "image",
      name: "图片",
      icon: "🖼️",
      hint: "支持 JPG, PNG, GIF, WebP, SVG 等图片格式",
      extensions: ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"],
    },
    {
      key: "audio",
      name: "音频",
      icon: "🎵",
      hint: "支持 MP3, WAV, OGG, AAC, FLAC 等音频格式",
      extensions: ["mp3", "wav", "ogg", "aac", "flac", "m4a", "wma"],
    },
    {
      key: "video",
      name: "视频",
      icon: "🎬",
      hint: "支持 MP4, AVI, MOV, WebM, MKV 等视频格式",
      extensions: [
        "mp4",
        "avi",
        "mov",
        "webm",
        "mkv",
        "flv",
        "wmv",
        "m4v",
        "3gp",
        "mpeg",
        "mpg",
      ],
    },
    {
      key: "other",
      name: "其他",
      icon: "📦",
      hint: "支持任何类型的文件",
      extensions: [],
    },
  ],
};
```

## 使用说明

### 开发模式

使用 nodemon 自动重启服务器（需要先安装 nodemon）：

```bash
npm run dev
```

### 生产模式

直接启动服务器：

```bash
npm start
```

### 配置说明

- `PORT`: 服务器端口号（默认 8023）
- `NODE_ENV`: 环境模式（`development` | `production`）
- `ALLOWED_ORIGINS`: 允许的 CORS 来源数组，生产建议填具体域名
- `MAX_FILE_SIZE`: 最大上传大小（默认 100MB）
- `CATEGORIES`: 分类清单，可任意新增 / 编辑，字段说明：
  - `key`: 唯一键（仅英数、`-`、`_`）
  - `name`: 显示名称
  - `icon`: emoji 或文字
  - `hint`: 上传提示
  - `extensions`: 允许的扩展名，留空代表不限类型

也可以在 `upload.html` 界面点击“添加分类”按钮，系统会调用 `/api/category` 写入 `config.js` 并自动在 `public/` 下建立对应文件夹。

## API 端点

### 静态资源

访问 `public` 目录下的静态文件：

- 图片：`http://localhost:8023/image/ji/banner1.jpg`
- 音频：`http://localhost:8023/audio/ji/music.wav`

### 健康检查

```
GET /health
```

返回服务器健康状态：

```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456
}
```

### API 信息

```
GET /api/info
```

返回服务器信息：

```json
{
  "name": "Resource Server",
  "version": "1.0.0",
  "environment": "development",
  "endpoints": {
    "static": "/",
    "health": "/health",
    "info": "/api/info",
    "categories": "/api/categories"
  }
}
```

### 获取分类配置

```
GET /api/categories
```

返回分类配置列表：

```json
{
  "success": true,
  "categories": [
    {
      "key": "image",
      "name": "图片",
      "icon": "🖼️",
      "hint": "支持 JPG, PNG, GIF, WebP, SVG 等图片格式",
      "extensions": ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"]
    },
    ...
  ]
}
```

### 新增分类

```
POST /api/category
Content-Type: application/json

{
  "key": "document",
  "name": "文件",
  "icon": "📄",
  "hint": "支持 PDF, DOC, DOCX 等格式",
  "extensions": ["pdf", "doc", "docx"]
}
```

- 后端会自动：
  - 验证 `key` 唯一性与格式
  - 在 `public/<key>` 建立文件夹
  - 将分类写入 `src/config.js` 并重新加载设置
- 如不提供 `extensions`，表示允许任何文件类型（适合 `other` 类别）

前端 `upload.html` 也提供同样的表单，方便直接管理分类。

## 安全特性

- **CORS 配置**：可配置允许的跨域来源
- **安全头部**：自动添加 X-Content-Type-Options、X-Frame-Options、X-XSS-Protection
- **错误处理**：统一的错误处理中间件
- **优雅关闭**：支持 SIGTERM 和 SIGINT 信号的优雅关闭

## 开发建议

1. **生产环境部署**：

   - 设置 `NODE_ENV=production`
   - 配置具体的 `ALLOWED_ORIGINS` 域名列表
   - 使用 PM2 或类似工具管理进程

2. **资源管理**：

   - 将资源文件放置在 `public` 目录下
   - 建议按类型（image、audio）和分类组织文件结构

3. **性能优化**：
   - 生产环境会自动启用静态资源缓存（1 天）
   - 可考虑使用 CDN 加速静态资源访问

## 参与贡献

1. Fork 本仓库
2. 新建 Feat_xxx 分支
3. 提交代码
4. 新建 Pull Request

## 许可证

ISC
