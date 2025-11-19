# Resource Server

[English README](README.en.md)

一個基於 Express 的靜態資源服務器，用於提供圖片、音頻等資源文件的 HTTP 服務。

## 功能特性

- 🚀 快速啟動的 Express 服務器
- 📁 靜態資源文件服務
- 🔒 安全的 CORS 配置
- 🏥 健康檢查端點
- 📊 API 信息查詢
- 🛡️ 安全頭部保護
- ⚡ 優雅的服務器關閉處理
- ⚙️ `src/config.js` 集中配置（端口、CORS、分類等）
- ➕ 後台 API 及前端介面支援動態新增分類

## 項目結構

```
resource/
├── src/
│   └── index.js          # 主服務器文件
├── public/               # 靜態資源目錄
│   ├── image/           # 圖片資源
│   ├── audio/           # 音頻資源
│   └── index.html       # 首頁
├── package.json
├── .gitignore
└── README.md
```

## 安裝教程

### 前置要求

- Node.js >= 14.0.0
- npm >= 6.0.0

### 安裝步驟

1. 克隆或下載項目到本地
2. 安裝依賴：
```bash
npm install
```

3. 配置 `src/config.js`：
   - 所有原 `.env` 參數已整合到 `src/config.js`
   - 可直接修改其中的 `PORT`、`ALLOWED_ORIGINS`、`CATEGORIES` 等欄位
   - 伺服器重新啟動即可生效（使用 `/api/category` 介面新增時會自動重載）

`src/config.js` 片段：
```js
module.exports = {
  PORT: 8023,
  NODE_ENV: 'development',
  MAX_FILE_SIZE: 100 * 1024 * 1024,
  ALLOWED_ORIGINS: ['*'],
  CATEGORIES: [
    { key: 'image', name: '圖片', icon: '🖼️', hint: '支持 JPG, PNG, GIF, WebP, SVG 等圖片格式', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'] },
    { key: 'audio', name: '音頻', icon: '🎵', hint: '支持 MP3, WAV, OGG, AAC, FLAC 等音頻格式', extensions: ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a', 'wma'] },
    { key: 'video', name: '影片', icon: '🎬', hint: '支持 MP4, AVI, MOV, WebM, MKV 等影片格式', extensions: ['mp4', 'avi', 'mov', 'webm', 'mkv', 'flv', 'wmv', 'm4v', '3gp', 'mpeg', 'mpg'] },
    { key: 'other', name: '其他', icon: '📦', hint: '支持任何類型的文件', extensions: [] }
  ]
}
```

## 使用說明

### 開發模式

使用 nodemon 自動重啟服務器（需要先安裝 nodemon）：
```bash
npm run dev
```

### 生產模式

直接啟動服務器：
```bash
npm start
```

### 配置說明

- `PORT`: 服務器端口號（默認 8023）
- `NODE_ENV`: 環境模式（`development` | `production`）
- `ALLOWED_ORIGINS`: 允許的 CORS 來源陣列，生產建議填具體域名
- `MAX_FILE_SIZE`: 最大上傳大小（默認 100MB）
- `CATEGORIES`: 分類清單，可任意新增 / 編輯，欄位說明：
  - `key`: 唯一鍵（僅英數、`-`、`_`）
  - `name`: 顯示名稱
  - `icon`: emoji 或文字
  - `hint`: 上傳提示
  - `extensions`: 允許的副檔名，留空代表不限類型

也可以在 `upload.html` 介面點選「添加分類」按鈕，系統會呼叫 `/api/category` 寫入 `config.js` 並自動在 `public/` 下建立對應資料夾。

## API 端點

### 靜態資源

訪問 `public` 目錄下的靜態文件：
- 圖片：`http://localhost:8023/image/ji/banner1.jpg`
- 音頻：`http://localhost:8023/audio/ji/music.wav`

### 健康檢查

```
GET /health
```

返回服務器健康狀態：
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

返回服務器信息：
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

### 獲取分類配置

```
GET /api/categories
```

返回分類配置列表：
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

### 新增分類

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

- 後端會自動：
  - 驗證 `key` 唯一性與格式
  - 在 `public/<key>` 建立資料夾
  - 將分類寫入 `src/config.js` 並重新載入設定
- 如不提供 `extensions`，表示允許任何檔案類型（適合 `other` 類別）

前端 `upload.html` 也提供同樣的表單，方便直接管理分類。

## 安全特性

- **CORS 配置**: 可配置允許的跨域來源
- **安全頭部**: 自動添加 X-Content-Type-Options、X-Frame-Options、X-XSS-Protection
- **錯誤處理**: 統一的錯誤處理中間件
- **優雅關閉**: 支持 SIGTERM 和 SIGINT 信號的優雅關閉

## 開發建議

1. **生產環境部署**：
   - 設置 `NODE_ENV=production`
   - 配置具體的 `ALLOWED_ORIGINS` 域名列表
   - 使用 PM2 或類似工具管理進程

2. **資源管理**：
   - 將資源文件放置在 `public` 目錄下
   - 建議按類型（image、audio）和分類組織文件結構

3. **性能優化**：
   - 生產環境會自動啟用靜態資源緩存（1天）
   - 可考慮使用 CDN 加速靜態資源訪問

## 參與貢獻

1. Fork 本倉庫
2. 新建 Feat_xxx 分支
3. 提交代碼
4. 新建 Pull Request

## 許可證

ISC

