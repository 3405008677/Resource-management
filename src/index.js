// 导入配置
let config = require('./config')

// 导入依赖
const express = require('express')
const cors = require('cors')
const path = require('path')
const fs = require('fs').promises
const fsSync = require('fs')
const multer = require('multer')

// ==================== 常量定义 ====================
const CONFIG = {
  PORT: config.PORT,
  NODE_ENV: config.NODE_ENV,
  MAX_FILE_SIZE: config.MAX_FILE_SIZE,
  ALLOWED_ORIGINS: config.ALLOWED_ORIGINS
}

// 从配置文件读取分类配置
let CATEGORIES = config.CATEGORIES

// 从分类配置生成文件扩展名映射
let FILE_EXTENSIONS = {}
function updateFileExtensions() {
  FILE_EXTENSIONS = {}
  CATEGORIES.forEach(category => {
    FILE_EXTENSIONS[category.key] = category.extensions || []
  })
}
updateFileExtensions()

// 从分类配置生成允许的分类列表
let ALLOWED_CATEGORIES = CATEGORIES.map(cat => cat.key)

// 从分类配置生成分类映射（用于快速查找）
let CATEGORY_MAP = {}
function updateCategoryMap() {
  CATEGORY_MAP = {}
  CATEGORIES.forEach(category => {
    CATEGORY_MAP[category.key] = category
  })
}
updateCategoryMap()

// 重新加载配置
function reloadConfig() {
  // 清除 require 缓存
  delete require.cache[require.resolve('./config')]
  config = require('./config')
  CATEGORIES = config.CATEGORIES
  ALLOWED_CATEGORIES = CATEGORIES.map(cat => cat.key)
  updateFileExtensions()
  updateCategoryMap()
}

const ERROR_MESSAGES = {
  NO_FILE: '没有上传文件',
  INVALID_IMAGE: '不支持的图片格式，请上传图片文件（JPG, PNG, GIF, WebP, SVG 等）',
  INVALID_AUDIO: '不支持的音频格式，请上传音频文件（MP3, WAV, OGG, AAC 等）',
  INVALID_VIDEO: '不支持的视频格式，请上传视频文件（MP4, AVI, MOV, WebM 等）',
  INVALID_FORMAT: '不支持的文件格式',
  INVALID_CATEGORY: '分類必須是 audio、image、video 或 other',
  MISSING_PARAMS: '缺少必要參數',
  FOLDER_EXISTS: '文件夾已存在',
  ACCESS_DENIED: '訪問被拒絕',
  NOT_FOUND: '文件或文件夹不存在',
  NOT_FILE: '不是文件',
  NOT_FOLDER: '不是文件夹',
  UPLOAD_FAILED: '文件上传失败',
  DOWNLOAD_FAILED: '文件下載失敗',
  DELETE_FAILED: '删除失败',
  SERVER_ERROR: '伺服器錯誤'
}

// ==================== 工具函数 ====================
/**
 * 获取文件扩展名
 */
function getFileExtension(filename) {
  return filename.split('.').pop().toLowerCase()
}

/**
 * 检查文件类型
 */
function checkFileType(filename) {
  const ext = getFileExtension(filename)
  const result = {}
  
  // 检查每个分类
  CATEGORIES.forEach(category => {
    if (category.extensions && category.extensions.length > 0) {
      result[`is${category.key.charAt(0).toUpperCase() + category.key.slice(1)}`] = 
        FILE_EXTENSIONS[category.key].includes(ext)
    }
  })
  
  return result
}

/**
 * 根据分类获取文件类型检查结果
 */
function getFileTypeForCategory(filename, categoryKey) {
  const ext = getFileExtension(filename)
  const category = CATEGORY_MAP[categoryKey]
  
  if (!category || !category.extensions || category.extensions.length === 0) {
    // other 分类或没有扩展名限制的分类，允许任何文件
    return true
  }
  
  return category.extensions.includes(ext)
}

/**
 * 路径安全检查 - 确保路径在 public 目录内
 */
function isPathSafe(filePath) {
  const publicPath = path.join(__dirname, '../public')
  const resolvedPath = path.resolve(filePath)
  const resolvedPublic = path.resolve(publicPath)
  return resolvedPath.startsWith(resolvedPublic)
}

/**
 * 统一错误响应格式
 */
function errorResponse(res, statusCode, message) {
  return res.status(statusCode).json({ error: { message } })
}

/**
 * 统一成功响应格式
 */
function successResponse(res, data, message = '操作成功') {
  return res.json({ success: true, message, ...data })
}

/**
 * 安全删除文件（忽略错误）
 */
async function safeUnlink(filePath) {
  try {
    await fs.unlink(filePath)
  } catch (error) {
    // 忽略删除错误
  }
}

/**
 * 移动文件（如果 rename 失败则使用 copy + delete）
 */
async function moveFile(source, destination) {
  try {
    await fs.rename(source, destination)
  } catch (error) {
    // 如果移动失败，尝试复制然后删除
    await fs.copyFile(source, destination)
    await fs.unlink(source)
  }
}

// ==================== Express 应用配置 ====================
const app = express()

// 安全头部中间件
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  next()
})

// CORS 配置
app.use(
  cors({
    origin: (origin, callback) => {
      if (CONFIG.NODE_ENV === 'development' || 
          CONFIG.ALLOWED_ORIGINS.includes('*') || 
          !origin) {
        callback(null, true)
      } else if (CONFIG.ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true)
      } else {
        callback(new Error('不被允許的來源'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
)

// 解析 body
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// 静态文件处理
app.use(express.static(path.join(__dirname, '../public'), { 
  index: 'index.html',
  maxAge: CONFIG.NODE_ENV === 'production' ? '1d' : '0'
}))

// ==================== 路由处理 ====================

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  })
})

// API 信息端点
app.get('/api/info', (req, res) => {
  res.json({
    name: 'Resource Server',
    version: '1.0.0',
    environment: CONFIG.NODE_ENV,
    endpoints: {
      static: '/',
      health: '/health',
      info: '/api/info',
      categories: '/api/categories'
    }
  })
})

// 获取分类配置端点
app.get('/api/categories', (req, res) => {
  res.json({
    success: true,
    categories: CATEGORIES
  })
})

// 添加新分类端点
app.post('/api/category', async (req, res) => {
  try {
    const { key, name, icon, hint, extensions } = req.body
    
    // 验证必填字段
    if (!key || !name) {
      return errorResponse(res, 400, '分类键和名称是必填项')
    }
    
    // 验证分类键格式（只允许字母、数字、下划线、连字符）
    if (!/^[a-z0-9_-]+$/i.test(key)) {
      return errorResponse(res, 400, '分类键只能包含字母、数字、下划线和连字符')
    }
    
    const categoryKey = key.toLowerCase()
    
    // 检查分类是否已存在
    if (ALLOWED_CATEGORIES.includes(categoryKey)) {
      return errorResponse(res, 400, '该分类已存在')
    }
    
    // 创建新分类对象
    const newCategory = {
      key: categoryKey,
      name: name,
      icon: icon || '📁',
      hint: hint || (extensions && extensions.length > 0 
        ? `支持 ${extensions.map(ext => ext.toUpperCase()).join(', ')} 等文件格式`
        : '支持任何类型的文件'),
      extensions: Array.isArray(extensions) ? extensions : (extensions ? [extensions] : [])
    }
    
    // 在 public 目录下创建对应的文件夹
    const categoryDir = path.join(__dirname, '../public', categoryKey)
    try {
      await fs.mkdir(categoryDir, { recursive: true })
    } catch (error) {
      console.error('创建分类文件夹失败:', error)
      return errorResponse(res, 500, '创建分类文件夹失败')
    }
    
    // 读取并更新 config.js 文件
    const configPath = path.join(__dirname, 'config.js')
    try {
      // 读取当前配置
      const currentConfig = require('./config')
      
      // 添加新分类到配置
      const updatedCategories = [...currentConfig.CATEGORIES, newCategory]
      
      // 构建新的配置文件内容
      const indent = '  ' // 2个空格
      const categoryIndent = '    ' // 4个空格
      
      let categoriesStr = '  CATEGORIES: [\n'
      updatedCategories.forEach((cat, index) => {
        categoriesStr += `${categoryIndent}{ \n`
        categoriesStr += `${categoryIndent}  key: '${cat.key}', \n`
        categoriesStr += `${categoryIndent}  name: '${cat.name}', \n`
        categoriesStr += `${categoryIndent}  icon: '${cat.icon}', \n`
        categoriesStr += `${categoryIndent}  hint: '${cat.hint}', \n`
        categoriesStr += `${categoryIndent}  extensions: ${JSON.stringify(cat.extensions)}\n`
        categoriesStr += `${categoryIndent}}`
        if (index < updatedCategories.length - 1) {
          categoriesStr += ','
        }
        categoriesStr += '\n'
      })
      categoriesStr += '  ]\n'
      
      // 构建完整的配置文件
      const newConfigContent = `// ==================== 配置文件 ====================
// 此文件替代了原来的 .env 环境变量文件

module.exports = {
  // 服务器端口
  PORT: ${currentConfig.PORT},
  
  // 运行环境: 'development' | 'production'
  NODE_ENV: '${currentConfig.NODE_ENV}',
  
  // 最大文件上传大小（字节），默认 100MB
  MAX_FILE_SIZE: ${currentConfig.MAX_FILE_SIZE}, // ${Math.round(currentConfig.MAX_FILE_SIZE / 1024 / 1024)}MB
  
  // 允许的 CORS 来源，使用数组格式
  // 例如: ['http://localhost:3000', 'https://example.com']
  // 使用 ['*'] 表示允许所有来源
  ALLOWED_ORIGINS: ${JSON.stringify(currentConfig.ALLOWED_ORIGINS)},
  
  // 文件分类配置
  // 每个分类包含: key(分类键), name(显示名称), icon(图标), hint(提示), extensions(允许的扩展名数组)
${categoriesStr}}
`
      
      // 写入更新后的配置
      fsSync.writeFileSync(configPath, newConfigContent, 'utf8')
      
      // 重新加载配置
      reloadConfig()
      
      return successResponse(res, {
        category: newCategory
      }, '分类添加成功')
    } catch (error) {
      console.error('更新配置文件失败:', error)
      // 如果更新配置失败，删除已创建的文件夹
      try {
        await fs.rmdir(categoryDir)
      } catch (rmError) {
        // 忽略删除错误
      }
      return errorResponse(res, 500, '更新配置文件失败: ' + error.message)
    }
  } catch (error) {
    console.error('添加分类错误:', error)
    return errorResponse(res, 500, error.message || '添加分类失败')
  }
})

// Multer 配置 - 使用临时目录
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const tempPath = path.join(__dirname, '../temp')
    try {
      await fs.mkdir(tempPath, { recursive: true })
      cb(null, tempPath)
    } catch (error) {
      cb(error)
    }
  },
  filename: (req, file, cb) => {
    // 保留原始文件名，避免中文乱码
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8')
    cb(null, originalName)
  }
})

const upload = multer({
  storage,
  limits: { fileSize: CONFIG.MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    // fileFilter 在 body 解析之前执行，这里只做基本检查
    // 具体验证在上传路由中处理
    const ext = getFileExtension(file.originalname)
    
    // 收集所有允许的扩展名
    const allExts = []
    CATEGORIES.forEach(category => {
      if (category.extensions && category.extensions.length > 0) {
        allExts.push(...category.extensions)
      }
    })
    
    // 允许所有支持的文件类型和 other 分类的任何文件
    if (allExts.includes(ext) || !ext) {
      return cb(null, true)
    }
    return cb(null, true)
  }
})

// 文件上传端点
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 400, ERROR_MESSAGES.NO_FILE)
    }
    
    // 如果没有指定分类，使用第一个分类作为默认值
    const category = req.body.category || (CATEGORIES.length > 0 ? CATEGORIES[0].key : 'image')
    const folder = req.body.folder || ''
    
    // 验证分类
    if (!ALLOWED_CATEGORIES.includes(category)) {
      await safeUnlink(req.file.path)
      return errorResponse(res, 400, ERROR_MESSAGES.INVALID_CATEGORY)
    }
    
    // 检查文件类型与分类是否匹配
    const categoryConfig = CATEGORY_MAP[category]
    if (!categoryConfig) {
      await safeUnlink(req.file.path)
      return errorResponse(res, 400, ERROR_MESSAGES.INVALID_CATEGORY)
    }
    
    // 如果分类有扩展名限制，检查文件类型
    if (categoryConfig.extensions && categoryConfig.extensions.length > 0) {
      const ext = getFileExtension(req.file.originalname)
      if (!categoryConfig.extensions.includes(ext)) {
        await safeUnlink(req.file.path)
        const errorMsg = categoryConfig.hint || `不支持的文件格式，请上传 ${categoryConfig.name} 文件`
        return errorResponse(res, 400, errorMsg)
      }
    }
    // 如果分类没有扩展名限制（如 other），允许任何文件类型
    
    // 文件验证通过，移动到正确的目录
    const targetDir = path.join(__dirname, '../public', category, folder)
    await fs.mkdir(targetDir, { recursive: true })
    
    const targetPath = path.join(targetDir, req.file.filename)
    await moveFile(req.file.path, targetPath)
    
    const filePath = folder 
      ? `${category}/${folder}/${req.file.filename}` 
      : `${category}/${req.file.filename}`
    
    return successResponse(res, {
      file: {
        name: req.file.filename,
        path: filePath,
        size: req.file.size,
        mimetype: req.file.mimetype
      }
    }, '文件上传成功')
  } catch (error) {
    console.error('上传错误:', error)
    await safeUnlink(req.file?.path)
    return errorResponse(res, 500, ERROR_MESSAGES.UPLOAD_FAILED)
  }
})

// 获取文件列表
app.get('/api/files', async (req, res) => {
  try {
    // 如果没有指定分类，使用第一个分类作为默认值
    const category = req.query.category || (CATEGORIES.length > 0 ? CATEGORIES[0].key : 'image')
    const folder = req.query.folder || ''
    const basePath = path.join(__dirname, '../public', category, folder)
    
    // 检查目录是否存在
    try {
      await fs.access(basePath)
    } catch {
      return res.json({ files: [], folders: [] })
    }
    
    const items = await fs.readdir(basePath, { withFileTypes: true })
    const files = []
    const folders = []
    
    for (const item of items) {
      const itemPath = path.join(basePath, item.name)
      const relativePath = folder ? `${folder}/${item.name}` : item.name
      
      if (item.isDirectory()) {
        folders.push({
          name: item.name,
          path: relativePath,
          type: 'folder'
        })
      } else {
        const stats = await fs.stat(itemPath)
        files.push({
          name: item.name,
          path: folder ? `${category}/${relativePath}` : `${category}/${item.name}`,
          size: stats.size,
          modified: stats.mtime,
          type: 'file'
        })
      }
    }
    
    res.json({ files, folders })
  } catch (error) {
    console.error('獲取文件列表錯誤:', error)
    return errorResponse(res, 500, error.message || '獲取文件列表失敗')
  }
})

// 创建文件夹
app.post('/api/folder', async (req, res) => {
  try {
    const { category, folder, name } = req.body
    
    if (!category || !name) {
      return errorResponse(res, 400, ERROR_MESSAGES.MISSING_PARAMS)
    }
    
    if (!ALLOWED_CATEGORIES.includes(category)) {
      return errorResponse(res, 400, ERROR_MESSAGES.INVALID_CATEGORY)
    }
    
    const folderPath = folder 
      ? path.join(__dirname, '../public', category, folder, name)
      : path.join(__dirname, '../public', category, name)
    
    // 检查文件夹是否已存在
    try {
      await fs.access(folderPath)
      return errorResponse(res, 400, ERROR_MESSAGES.FOLDER_EXISTS)
    } catch {
      // 文件夹不存在，可以创建
    }
    
    await fs.mkdir(folderPath, { recursive: true })
    
    return successResponse(res, {
      folder: {
        name,
        path: folder ? `${category}/${folder}/${name}` : `${category}/${name}`
      }
    }, '文件夾創建成功')
  } catch (error) {
    console.error('創建文件夾錯誤:', error)
    return errorResponse(res, 500, error.message || '創建文件夾失敗')
  }
})

// 文件下载端点
app.get('/api/download/*', async (req, res) => {
  try {
    const filePath = req.params[0]
    const fullPath = path.join(__dirname, '../public', filePath)
    
    // 安全检查
    if (!isPathSafe(fullPath)) {
      return errorResponse(res, 403, ERROR_MESSAGES.ACCESS_DENIED)
    }
    
    // 检查文件是否存在
    try {
      const stats = await fs.stat(fullPath)
      if (!stats.isFile()) {
        return errorResponse(res, 400, ERROR_MESSAGES.NOT_FILE)
      }
    } catch {
      return errorResponse(res, 404, ERROR_MESSAGES.NOT_FOUND)
    }
    
    res.download(fullPath)
  } catch (error) {
    console.error('下載錯誤:', error)
    return errorResponse(res, 500, ERROR_MESSAGES.DOWNLOAD_FAILED)
  }
})

// 检查文件夹内容
app.get('/api/folder/check/*', async (req, res) => {
  try {
    const folderPath = req.params[0]
    const fullPath = path.join(__dirname, '../public', folderPath)
    
    // 安全检查
    if (!isPathSafe(fullPath)) {
      return errorResponse(res, 403, ERROR_MESSAGES.ACCESS_DENIED)
    }
    
    try {
      const stats = await fs.stat(fullPath)
      if (!stats.isDirectory()) {
        return errorResponse(res, 400, ERROR_MESSAGES.NOT_FOLDER)
      }
      
      const items = await fs.readdir(fullPath)
      return res.json({
        success: true,
        hasContent: items.length > 0,
        itemCount: items.length
      })
    } catch {
      return errorResponse(res, 404, ERROR_MESSAGES.NOT_FOUND)
    }
  } catch (error) {
    console.error('检查文件夹错误:', error)
    return errorResponse(res, 500, error.message || '检查失败')
  }
})

// 删除文件或文件夹
app.delete('/api/file/*', async (req, res) => {
  try {
    const filePath = req.params[0]
    const fullPath = path.join(__dirname, '../public', filePath)
    
    // 安全检查
    if (!isPathSafe(fullPath)) {
      return errorResponse(res, 403, ERROR_MESSAGES.ACCESS_DENIED)
    }
    
    // 检查是否存在并删除
    try {
      const stats = await fs.stat(fullPath)
      if (stats.isDirectory()) {
        await fs.rmdir(fullPath, { recursive: true })
      } else {
        await fs.unlink(fullPath)
      }
      
      return successResponse(res, null, '删除成功')
    } catch {
      return errorResponse(res, 404, ERROR_MESSAGES.NOT_FOUND)
    }
  } catch (error) {
    console.error('删除错误:', error)
    return errorResponse(res, 500, ERROR_MESSAGES.DELETE_FAILED)
  }
})

// ==================== 错误处理 ====================

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('錯誤:', err.message)
  const message = CONFIG.NODE_ENV === 'production' 
    ? ERROR_MESSAGES.SERVER_ERROR 
    : err.message
  return errorResponse(res, err.status || 500, message)
})

// 404 处理
app.use((req, res) => {
  return errorResponse(res, 404, '找不到請求的資源')
})

// ==================== 服务器启动 ====================

const server = app.listen(CONFIG.PORT, () => {
  console.log(`🚀 伺服器運行在 http://localhost:${CONFIG.PORT}`)
  console.log(`📁 靜態資源目錄: ${path.join(__dirname, '../public')}`)
  console.log(`🌍 環境: ${CONFIG.NODE_ENV}`)
})

// ==================== 优雅关闭 ====================

function gracefulShutdown(signal) {
  console.log(`收到 ${signal} 信號，正在關閉伺服器...`)
  server.close(() => {
    console.log('伺服器已關閉')
    process.exit(0)
  })
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))

// 未捕获的异常处理
process.on('uncaughtException', (err) => {
  console.error('未捕獲的異常:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('未處理的 Promise 拒絕:', reason)
  process.exit(1)
})
