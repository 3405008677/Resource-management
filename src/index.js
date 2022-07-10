// 加载环境变量
const dotenv = require('dotenv')
dotenv.config()
const { port = 8023 } = process.env
// 导入 express 包
const express = require('express')
// 实例化 express 对象 application 应用
const app = express()
// 静态文件处理
app.use(express.static('public'))
app.use(express.static(__dirname+"/public",{index:"index.html"}));
// 解析 body
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
// 加入对 CORS （跨域资源共享）的支持
const cors = require('cors')
app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, origin)
    },
    credentials: true
  })
)
app.get('/1', function (req, res) {
  console.log(1);
  res.send('和')
})
// 监听 port 端口，开始 HTTP 服务。
app.listen(port, () => {
  console.log(`http://localhost:${port}`)
})
