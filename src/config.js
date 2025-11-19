// ==================== 配置文件 ====================
// 此文件替代了原来的 .env 环境变量文件

module.exports = {
  // 服务器端口
  PORT: 8023,
  
  // 运行环境: 'development' | 'production'
  NODE_ENV: 'development',
  
  // 最大文件上传大小（字节），默认 100MB
  MAX_FILE_SIZE: 104857600, // 100MB
  
  // 允许的 CORS 来源，使用数组格式
  // 例如: ['http://localhost:3000', 'https://example.com']
  // 使用 ['*'] 表示允许所有来源
  ALLOWED_ORIGINS: ["*"],
  
  // 文件分类配置
  // 每个分类包含: key(分类键), name(显示名称), icon(图标), hint(提示), extensions(允许的扩展名数组)
  CATEGORIES: [
    { 
      key: 'image', 
      name: '图片', 
      icon: '🖼️', 
      hint: '支持 JPG, PNG, GIF, WebP, SVG 等图片格式', 
      extensions: ["jpg","jpeg","png","gif","webp","svg","bmp","ico"]
    },
    { 
      key: 'audio', 
      name: '音频', 
      icon: '🎵', 
      hint: '支持 MP3, WAV, OGG, AAC, FLAC 等音频格式', 
      extensions: ["mp3","wav","ogg","aac","flac","m4a","wma"]
    },
    { 
      key: 'video', 
      name: '视频', 
      icon: '🎬', 
      hint: '支持 MP4, AVI, MOV, WebM, MKV 等视频格式', 
      extensions: ["mp4","avi","mov","webm","mkv","flv","wmv","m4v","3gp","mpeg","mpg"]
    },
    { 
      key: 'other', 
      name: '其他', 
      icon: '📦', 
      hint: '支持任何类型的文件', 
      extensions: []
    },
  ]
}
