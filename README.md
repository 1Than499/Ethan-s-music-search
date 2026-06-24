# 🎵 Music Search — 多平台音乐搜索器

聚合 **网易云音乐**、**酷我音乐**、**QQ音乐** 的音乐搜索与下载工具。

> ⚠️ **免责声明**：本项目仅用于个人学习和技术研究，请勿用于任何商业用途。音乐版权归各平台所有。

## 功能

- 🔍 **多平台聚合搜索** — 同时搜索网易云、酷我、QQ 三大平台，交错展示结果
- ▶️ **在线播放** — 点击即可试听，支持进度条拖拽、快进快退
- ⬇ **多音质下载** — 支持无损/高品/标准多档音质选择，从最优源获取
- 🎤 **歌词同步** — 实时滚动歌词，点击跳转对应时间
- 🌓 **明暗主题** — macOS 风格设计，支持深色/浅色模式切换
- 📱 **响应式布局** — 桌面端三栏布局，移动端自适应全屏
- ⌨️ **键盘快捷键** — 空格播放、方向键控制、数字键切换平台

## 快速开始

```bash
# 1. 安装依赖
npm install

# 2. 启动服务
npm start

# 3. 打开浏览器访问
# http://localhost:3456
```

默认端口 **3456**，可通过环境变量修改：

```bash
# Windows
set PORT=8080 && npm start

# macOS / Linux
PORT=8080 npm start
```

## 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | Express 5 |
| HTTP 客户端 | axios |
| 前端 | 原生 HTML / CSS / JavaScript |
| 音乐 API | vkeys / meting / kw-api / tang-api |
| 辅助 | NeteaseCloudMusicApi |

## 项目结构

```
music-demo/
├── server/                  # 后端模块
│   ├── index.js             # 入口：Express 配置、启动
│   ├── config.js            # API 端点、常量
│   ├── utils.js             # 工具函数
│   ├── routes/              # 路由层
│   │   ├── search.js        # 搜索接口
│   │   ├── song.js          # 播放链接 & 多音质
│   │   ├── lyric.js         # 歌词接口
│   │   └── download.js      # 代理下载
│   └── services/            # 服务层
│       ├── netease.js       # 网易云音乐
│       ├── kuwo.js          # 酷我音乐
│       └── qq.js            # QQ音乐
├── public/                  # 前端静态资源
│   ├── index.html           # 页面结构
│   ├── css/style.css        # 样式表
│   └── js/                  # 前端逻辑
│       ├── app.js           # 全局状态、初始化
│       ├── ui.js            # Toast、收藏、调整面板
│       ├── search.js        # 搜索逻辑
│       ├── player.js        # 播放控制
│       ├── lyrics.js        # 歌词解析同步
│       └── modal.js         # 音质选择弹窗
├── server.js                # [旧] 单体入口（重构后保留备用）
├── package.json
├── .gitignore
├── .env.example
└── README.md
```

## API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/search?keyword=X&source=netease,kuwo,qq` | 多平台搜索 |
| GET | `/api/song/url/:source/:id?name=X` | 获取播放链接 |
| GET | `/api/song/qualities/:source/:id?name=X` | 获取多音质下载链接 |
| GET | `/api/lyric/:source/:id?keyword=X` | 获取歌词 |
| GET | `/api/download/:source/:id?name=X` | 代理下载（流式传输） |

## 键盘快捷键

| 按键 | 功能 |
|------|------|
| `Space` | 播放 / 暂停 |
| `←` `→` | 后退 / 前进 5 秒 |
| `↑` `↓` | 音量增减 |
| `L` | 显示 / 隐藏歌词 |
| `M` | 静音切换 |
| `1` `2` `3` | 切换平台（网易云 / 酷我 / QQ） |

## License

ISC — 仅供学习研究使用
