# **React Personal Start Page (个人起始页)**

这是一个基于 React、Vite 和 Tailwind CSS 构建的现代化浏览器起始页。它设计简洁、美观，支持高度自定义，旨在提供高效的上网体验。

## **✨ 主要功能**

* **多搜索引擎支持**：内置百度、Google、Bing，支持自定义搜索 URL。  
* **智能搜索建议**：输入时自动提供搜索联想（基于 Bing API）。  
* **快捷方式管理**：  
  * 支持添加、编辑、删除快捷方式。  
  * **拖拽排序**：长按或点击“管理”进入编辑模式，随意拖拽排列图标。  
  * **图标获取**：自动获取网站 Favicon，支持上传本地图片作为自定义图标。  
  * **右键菜单**：在图标上右键即可快速编辑或删除。  
* **个性化壁纸**：  
  * 默认极简背景。  
  * **Bing 每日一图**：每天自动更新。  
  * **自定义 API**：支持第三方随机图片 API。  
  * **本地上传**：支持上传本地图片作为背景（使用浏览器缓存存储）。  
* **精美 UI/UX**：  
  * 响应式设计，适配桌面和移动端。  
  * 流畅的动画效果（弹窗、菜单、加载）。  
  * 优雅的时间与日期显示。  
  * 毛jf玻璃（Backdrop Blur）视觉风格。

## **🛠️ 技术栈**

* [React 19](https://react.dev/) \-用于构建用户界面的 JavaScript 库  
* [Vite](https://vitejs.dev/) \- 下一代前端构建工具  
* [Tailwind CSS](https://tailwindcss.com/) \- 实用优先的 CSS 框架  
* [Lucide React](https://lucide.dev/) \- 精美的图标库

## **🚀 本地开发**

确保你的环境已安装 [Node.js](https://nodejs.org/) (推荐 v18+)。

1. **克隆项目**  
   git clone \<your-repo-url\>  
   cd \<project-folder\>

2. **安装依赖**  
   npm install

3. **启动开发服务器**  
   npm run dev

   打开浏览器访问控制台显示的地址（通常是 http://localhost:5173）。  
4. **构建生产版本**  
   npm run build

   构建产物将输出到 dist 目录。

## **☁️ 部署到 Cloudflare Pages**

本项目是纯静态 React 应用，非常适合部署在 Cloudflare Pages 上，且完全免费。

### **方法一：通过 Git 自动部署（推荐）**

这是最方便的方法，当你推送代码到 GitHub/GitLab 时，Cloudflare 会自动重新构建和部署。

1. **准备代码**：将你的代码推送到 GitHub 或 GitLab 仓库。  
2. **登录 Cloudflare**：访问 [Cloudflare Dashboard](https://dash.cloudflare.com/) 并登录。  
3. **创建应用**：  
   * 在左侧菜单点击 **Workers & Pages**。  
   * 点击 **Create application** (创建应用)。  
   * 切换到 **Pages** 标签页，点击 **Connect to Git** (连接到 Git)。  
4. **选择仓库**：授权 Cloudflare 访问你的账号，并选择该项目的仓库。  
5. **配置构建设置 (Build settings)**：  
   * **Project name**: 自定义你的项目名称（将成为子域名的一部分）。  
   * **Framework preset (框架预设)**: 选择 **Vite**。  
   * **Build command (构建命令)**: 默认为 npm run build (无需修改)。  
   * **Build output directory (构建输出目录)**: 默认为 dist (无需修改)。  
   * *环境变量 (Environment variables)*: 本项目暂不需要配置。  
6. **部署**：点击 **Save and Deploy**。等待几分钟，部署完成后即可获得访问链接（例如 https://your-project.pages.dev）。

### **方法二：直接上传构建产物**

如果你不想连接 Git，也可以手动上传构建好的文件。

1. 在本地运行 npm run build，确保生成了 dist 文件夹。  
2. 登录 Cloudflare Dashboard \-\> **Workers & Pages** \-\> **Create application** \-\> **Pages**。  
3. 选择 **Upload assets** (上传资产)。  
4. 输入项目名称，点击 **Create project**。  
5. 将本地的 dist 文件夹拖拽到上传区域，或点击上传。  
6. 点击 **Deploy site** 完成部署。

## **📄 License**

### **GNU General Public License v2.0**
