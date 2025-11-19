# Resource Server

[中文文檔](README.md)

## Overview

Resource Server is an Express-based static asset service that delivers images, audio, video, and any custom category you define. The project includes a modern upload interface (`public/upload.html`) and a backend API layer that supports on-the-fly category management.

## Features

- 🚀 Fast Express server with graceful shutdown handling
- 📁 Static asset hosting from the `public/` directory
- 🔐 Configurable CORS and security headers
- 🩺 `/health` endpoint for liveness checks
- 📊 `/api/info` endpoint for metadata
- ⚙️ Centralized configuration via `src/config.js`
- ➕ REST + UI workflow to add new categories dynamically (auto-creates folders)

## Project Structure

```
resource/
├── src/
│   └── index.js          # Server entry point
├── src/config.js         # Runtime configuration (port, CORS, categories...)
├── public/               # Static assets + upload UI
│   ├── image/
│   ├── audio/
│   ├── video/
│   └── upload.html
├── package.json
└── README*.md
```

## Getting Started

### Requirements

- Node.js ≥ 14
- npm ≥ 6

### Installation

1. Clone or download this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Edit `src/config.js` to match your environment (port, allowed origins, default categories, etc.). The server reload is enough for manual edits. When you use the UI/API to add categories, the backend rewrites this file automatically.

Example snippet:
```js
module.exports = {
  PORT: 8023,
  NODE_ENV: 'development',
  MAX_FILE_SIZE: 100 * 1024 * 1024,
  ALLOWED_ORIGINS: ['*'],
  CATEGORIES: [
    { key: 'image', name: 'Images', icon: '🖼️', hint: 'JPG / PNG / GIF / WebP / SVG', extensions: ['jpg','jpeg','png','gif','webp','svg','bmp','ico'] },
    { key: 'audio', name: 'Audio', icon: '🎵', hint: 'MP3 / WAV / OGG / AAC / FLAC', extensions: ['mp3','wav','ogg','aac','flac','m4a','wma'] },
    { key: 'video', name: 'Video', icon: '🎬', hint: 'MP4 / AVI / MOV / WebM / MKV', extensions: ['mp4','avi','mov','webm','mkv','flv','wmv','m4v','3gp','mpeg','mpg'] },
    { key: 'other', name: 'Others', icon: '📦', hint: 'Accept any file type', extensions: [] }
  ]
}
```

## Usage

### Development Mode

```bash
npm run dev
```

Runs the server with nodemon for automatic restarts.

### Production Mode

```bash
npm start
```

Starts the plain Node.js process. Pair it with PM2 or a similar process manager in production.

### Configuration Reference

- `PORT`: HTTP port (default `8023`)
- `NODE_ENV`: `development` or `production`
- `ALLOWED_ORIGINS`: Array of allowed CORS origins (use explicit domains in production)
- `MAX_FILE_SIZE`: Upload limit in bytes (default 100 MB)
- `CATEGORIES`: Category descriptors; each object includes:
  - `key`: Unique identifier (letters / numbers / `_` / `-`)
  - `name`: Display name
  - `icon`: Emoji or text icon
  - `hint`: Message displayed in the upload panel
  - `extensions`: Allowed file extensions (empty array = unrestricted)

You can also open `public/upload.html` and click “添加分类 / Add Category” to submit the same data through the UI. The backend will validate the payload, create `public/<key>` if needed, update `src/config.js`, and hot-reload the configuration.

## API Endpoints

### Static Assets

Files under `public/` are available directly, e.g.:

- `http://localhost:8023/image/example.jpg`
- `http://localhost:8023/audio/sample.wav`

### Health Check

```
GET /health
```

Returns uptime and timestamp for monitoring.

### Server Info

```
GET /api/info
```

Basic metadata including environment and handy endpoint list.

### Category List

```
GET /api/categories
```

Returns the current category array consumed by the upload UI.

### Create Category

```
POST /api/category
Content-Type: application/json

{
  "key": "document",
  "name": "Documents",
  "icon": "📄",
  "hint": "PDF / DOC / DOCX",
  "extensions": ["pdf", "doc", "docx"]
}
```

Backend behavior:

1. Validate payload (required fields, unique key, extension list, etc.)
2. Create `public/document/` if missing
3. Append the category definition into `src/config.js`
4. Reload the in-memory configuration so new uploads work immediately

If `extensions` is omitted or empty, the category accepts any extension (useful for `other` buckets).

## Security Highlights

- Configurable CORS allowlist
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`)
- Unified error handling middleware
- Graceful shutdown on `SIGTERM` / `SIGINT`

## Best Practices

1. **Production deployment**
   - Set `NODE_ENV=production`
   - Lock down `ALLOWED_ORIGINS`
   - Use PM2/systemd for supervision
2. **Asset organization**
   - Group assets under `public/<category>/<folder>/...`
   - Allow the upload UI to create folders when needed
3. **Performance**
   - Static files are cached for 1 day in production mode
   - Consider fronting the service with a CDN

## Contribution

1. Fork the repo
2. Create a feature branch (e.g., `feat/new-category`)
3. Commit your changes
4. Open a Pull Request

## License

ISC
