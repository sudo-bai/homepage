import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Search, Trash2, ChevronDown, Check, Settings, Globe } from 'lucide-react';

// 独立的图标组件，用于处理复杂的加载逻辑
const SmartIcon = ({ url, title }) => {
  const [src, setSrc] = useState('');
  const [useLocal, setUseLocal] = useState(false);

  useEffect(() => {
    // 优先使用 Google API
    const domain = new URL(url).hostname;
    setSrc(`https://www.google.com/s2/favicons?sz=128&domain=${domain}`);
    setUseLocal(false);
  }, [url]);

  const handleError = () => {
    if (!useLocal) {
      // API 失败，尝试直接获取网站根目录 favicon (适用于局域网)
      try {
        const urlObj = new URL(url);
        setSrc(`${urlObj.origin}/favicon.ico`);
        setUseLocal(true);
      } catch (e) {
        // URL 格式错误，放弃
      }
    } else {
      // 都失败了，显示默认占位图（透明像素或特定图，这里用 onError 最终回退）
      setSrc('fallback'); 
    }
  };

  if (src === 'fallback') {
    return (
      <div className="w-full h-full bg-white/20 flex items-center justify-center text-white/50">
        <Globe size={16} />
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={title}
      className="w-6 h-6 object-contain"
      onError={handleError}
    />
  );
};

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [links, setLinks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false); // 控制展开/收起
  const [bgLoaded, setBgLoaded] = useState(false);
  
  // 搜索引擎状态
  const [searchEngine, setSearchEngine] = useState('baidu');
  const [isEngineMenuOpen, setIsEngineMenuOpen] = useState(false);
  const [customEngineUrl, setCustomEngineUrl] = useState('');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // 搜索引擎配置
  const engines = {
    baidu: { name: '百度', url: 'https://www.baidu.com/s?wd=', placeholder: '百度一下' },
    google: { name: 'Google', url: 'https://www.google.com/search?q=', placeholder: 'Search Google' },
    bing: { name: 'Bing', url: 'https://www.bing.com/search?q=', placeholder: '微软 Bing' },
    custom: { name: '自定义', url: customEngineUrl, placeholder: '自定义搜索' },
  };

  // 默认导航数据
  const defaultLinks = [
    { id: 1, title: 'Bilibili', url: 'https://www.bilibili.com' },
    { id: 2, title: 'GitHub', url: 'https://github.com' },
    { id: 3, title: '路由器', url: 'http://192.168.1.1' }, // 测试局域网
  ];

  // 初始化加载数据
  useEffect(() => {
    const savedLinks = localStorage.getItem('my-nav-links');
    if (savedLinks) {
      setLinks(JSON.parse(savedLinks));
    } else {
      setLinks(defaultLinks);
    }

    // 加载搜索引擎偏好
    const savedEngine = localStorage.getItem('search-engine-pref');
    const savedCustomUrl = localStorage.getItem('custom-engine-url');
    
    if (savedCustomUrl) setCustomEngineUrl(savedCustomUrl);
    if (savedEngine) {
      if (savedEngine === 'custom' && !savedCustomUrl) {
         setSearchEngine('baidu'); // 如果选了自定义但没存 URL，回退
      } else {
         setSearchEngine(savedEngine);
      }
    }
    
    // 时间更新
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 监听 links 变化并保存
  useEffect(() => {
    if (links.length > 0) {
      localStorage.setItem('my-nav-links', JSON.stringify(links));
    }
  }, [links]);

  // 切换搜索引擎
  const handleEngineChange = (engineKey) => {
    if (engineKey === 'custom') {
      if (!customEngineUrl) {
        setIsCustomModalOpen(true);
      } else {
        setSearchEngine('custom');
        localStorage.setItem('search-engine-pref', 'custom');
      }
    } else {
      setSearchEngine(engineKey);
      localStorage.setItem('search-engine-pref', engineKey);
    }
    setIsEngineMenuOpen(false);
  };

  // 保存自定义引擎
  const saveCustomEngine = (url) => {
    setCustomEngineUrl(url);
    localStorage.setItem('custom-engine-url', url);
    setSearchEngine('custom');
    localStorage.setItem('search-engine-pref', 'custom');
    setIsCustomModalOpen(false);
  };

  // 处理添加新链接
  const handleAddLink = () => {
    if (!newLink.title || !newLink.url) return;

    let formattedUrl = newLink.url;
    // 简单的协议补全，如果是IP地址可能不需要 https
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = 'http://' + formattedUrl; // 默认为 http 以兼容局域网，现代浏览器会自动升级 https
    }

    const newItem = {
      id: Date.now(),
      title: newLink.title,
      url: formattedUrl,
    };

    setLinks([...links, newItem]);
    setNewLink({ title: '', url: '' });
    setIsModalOpen(false);
  };

  // 处理删除链接
  const handleDeleteLink = (id) => {
    const updatedLinks = links.filter(link => link.id !== id);
    setLinks(updatedLinks);
    if (updatedLinks.length === 0) {
      localStorage.removeItem('my-nav-links'); 
    }
  };

  // 处理搜索
  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    let engineUrl = engines[searchEngine].url;
    if (!engineUrl) engineUrl = engines['baidu'].url; // Fallback
    
    window.location.href = `${engineUrl}${encodeURIComponent(searchQuery)}`;
  };

  const toggleDashboard = () => {
    setShowDashboard(!showDashboard);
    if (!showDashboard) {
      setEditMode(false); // 展开时重置编辑模式
    }
  };

  // 格式化时间
  const formatTime = (date) => {
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  };
  
  const formatDate = (date) => {
    return date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });
  };

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center font-sans overflow-hidden text-white selection:bg-pink-500 selection:text-white">
      {/* 背景图片 */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700 ease-in-out"
        style={{ 
          backgroundImage: 'url("https://t.alcy.cc/ycy")',
          filter: showDashboard ? 'brightness(0.6) blur(10px)' : 'brightness(0.85) blur(0px)',
          transform: showDashboard ? 'scale(1.1)' : 'scale(1.05)'
        }}
      />
      
      {/* 点击遮罩 - 当面板打开时，点击背景关闭面板 */}
      {showDashboard && (
        <div 
          className="absolute inset-0 z-10"
          onClick={() => setShowDashboard(false)}
        ></div>
      )}

      {/* 主内容区域 - 调整位置居中偏上 */}
      <div className={`z-20 w-full max-w-2xl px-4 flex flex-col items-center transition-all duration-500 ease-spring ${showDashboard ? 'mt-16' : 'mt-[20vh]'}`}>
        
        {/* 时间显示 - 可点击 */}
        <div 
          className="text-center drop-shadow-lg mb-8 cursor-pointer select-none group transition-transform active:scale-95"
          onClick={toggleDashboard}
          title={showDashboard ? "收起" : "展开导航"}
        >
          <h1 className="text-7xl md:text-8xl font-light tracking-tighter text-white/95 group-hover:text-white transition-colors" style={{ fontFamily: '"SF Pro Display", system-ui, sans-serif' }}>
            {formatTime(currentTime)}
          </h1>
          <p className={`text-sm md:text-base text-white/80 font-medium tracking-[0.2em] mt-1 uppercase transition-opacity duration-300 ${showDashboard ? 'opacity-80' : 'opacity-60 group-hover:opacity-100'}`}>
            {formatDate(currentTime)}
          </p>
        </div>

        {/* 搜索框区域 - 始终显示 */}
        <form onSubmit={handleSearch} className="w-full max-w-md relative flex items-center z-30 transition-all duration-500">
          
          {/* 搜索引擎选择器 - 修复 z-index 问题，加上 z-50 */}
          <div className="absolute left-1 flex items-center z-50">
            <button
              type="button"
              onClick={() => setIsEngineMenuOpen(!isEngineMenuOpen)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white/80 bg-white/10 hover:bg-white/20 hover:text-white rounded-full transition-colors backdrop-blur-md border border-white/10"
            >
              {engines[searchEngine].name}
              <ChevronDown size={12} className={`transition-transform duration-200 ${isEngineMenuOpen ? 'rotate-180' : ''}`}/>
            </button>

            {/* 下拉菜单 */}
            {isEngineMenuOpen && (
              <div className="absolute top-full left-0 mt-2 w-32 py-1 bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in-down origin-top-left flex flex-col">
                {Object.entries(engines).map(([key, engine]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleEngineChange(key)}
                    className="w-full px-4 py-2 text-left text-xs text-white/80 hover:bg-white/10 hover:text-white flex items-center justify-between transition-colors"
                  >
                    <span className="truncate">{engine.name}</span>
                    {searchEngine === key && <Check size={10} className="text-green-400 shrink-0" />}
                  </button>
                ))}
                
                {/* 快速编辑自定义引擎入口 */}
                {searchEngine === 'custom' && (
                   <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsCustomModalOpen(true);
                      setIsEngineMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-[10px] text-white/40 hover:bg-white/5 hover:text-white/60 border-t border-white/5 flex items-center gap-1"
                  >
                    <Settings size={10} /> 配置地址
                  </button>
                )}
              </div>
            )}
          </div>

          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={engines[searchEngine].placeholder}
            className="w-full py-3 pl-24 pr-10 bg-black/20 border border-white/10 backdrop-blur-md rounded-full text-white placeholder-white/30 shadow-lg focus:outline-none focus:bg-black/40 focus:border-white/30 focus:shadow-2xl transition-all duration-300 text-sm text-center"
          />
          
          <button 
            type="submit"
            className="absolute right-3 p-1 text-white/40 hover:text-white transition-colors"
          >
            <Search size={16} />
          </button>
        </form>

        {/* 链接网格区域 - Q弹显示 */}
        <div className={`w-full max-w-2xl mt-8 transition-all duration-500 ease-spring transform origin-top ${showDashboard ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-90 -translate-y-8 pointer-events-none h-0'}`}>
          <div className="flex justify-between items-center mb-3 px-2">
            <h2 className="text-white/50 text-[10px] font-medium tracking-wider uppercase">Quick Links</h2>
            <button 
              onClick={() => setEditMode(!editMode)}
              className={`px-3 py-1 text-[10px] rounded-full transition-all duration-300 border border-transparent ${editMode ? 'bg-red-500/80 text-white' : 'hover:bg-white/10 text-white/40 hover:text-white hover:border-white/10'}`}
            >
              {editMode ? "完成" : "管理"}
            </button>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 pb-10">
            {links.map((link, index) => (
              <div 
                key={link.id}
                style={{ animationDelay: `${index * 50}ms` }}
                className={`group relative flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 border border-white/5 backdrop-blur-md shadow-sm hover:bg-white/15 hover:scale-105 hover:shadow-lg transition-all duration-300 cursor-pointer h-24 ${showDashboard ? 'animate-bounce-enter' : ''}`}
                onClick={() => !editMode && window.location.assign(link.url)}
              >
                {/* 网站图标组件 */}
                <div className="w-9 h-9 mb-2 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center shadow-inner group-hover:bg-white/10 transition-colors">
                  <SmartIcon url={link.url} title={link.title} />
                </div>
                
                <span className="text-white/80 group-hover:text-white font-medium text-[10px] truncate w-full text-center px-1 transition-colors">
                  {link.title}
                </span>

                {editMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteLink(link.id);
                    }}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-1 rounded-full shadow hover:bg-red-600 transition-colors animate-bounce-in z-20"
                  >
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            ))}

            {/* 添加按钮 */}
            <button
              style={{ animationDelay: `${links.length * 50}ms` }}
              onClick={() => setIsModalOpen(true)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border border-dashed border-white/10 hover:bg-white/5 hover:border-white/30 transition-all duration-300 h-24 group ${showDashboard ? 'animate-bounce-enter' : ''}`}
            >
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <Plus size={16} className="text-white/40" />
              </div>
              <span className="text-white/30 text-[10px] group-hover:text-white/60 transition-colors">Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* 底部版权 - 仅在展开时显示 */}
      <div className={`absolute bottom-4 text-white/20 text-[10px] font-light tracking-widest transition-opacity duration-300 ${showDashboard ? 'opacity-100' : 'opacity-0'}`}>
        Simple Start Page
      </div>

      {/* 添加链接的弹窗 */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsModalOpen(false)}
          ></div>
          
          <div className="relative w-full max-w-xs bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl animate-bounce-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-white">添加新捷径</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/50 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <input
                type="text"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:bg-white/10 focus:border-white/30"
                placeholder="名称 (如: 路由器)"
                value={newLink.title}
                onChange={(e) => setNewLink({ ...newLink, title: e.target.value })}
                autoFocus
              />
              <input
                type="text"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:bg-white/10 focus:border-white/30"
                placeholder="网址 (如: 192.168.1.1)"
                value={newLink.url}
                onChange={(e) => setNewLink({ ...newLink, url: e.target.value })}
                onKeyDown={(e) => e.key === 'Enter' && handleAddLink()}
              />
              <button
                onClick={handleAddLink}
                className="w-full py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-200 mt-2 transition-colors"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 自定义搜索引擎弹窗 */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsCustomModalOpen(false)}
          ></div>
          <div className="relative w-full max-w-xs bg-gray-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl animate-bounce-in">
             <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-white">自定义搜索引擎</h3>
              <button onClick={() => setIsCustomModalOpen(false)} className="text-white/50 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <p className="text-xs text-white/50 mb-3">请输入搜索 URL，将关键词用空代替直接放在末尾。<br/>例如: <code>https://d.serctl.com/?q=</code></p>
            <input
              type="text"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:bg-white/10 focus:border-white/30"
              placeholder="https://example.com/search?q="
              value={customEngineUrl}
              onChange={(e) => setCustomEngineUrl(e.target.value)}
            />
            <button
              onClick={() => saveCustomEngine(customEngineUrl)}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 mt-3 transition-colors"
            >
              保存并使用
            </button>
          </div>
        </div>
      )}
      
      <style>{`
        .ease-spring {
          transition-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1.1);
        }
        @keyframes bounce-enter {
          0% { opacity: 0; transform: scale(0.5) translateY(20px); }
          50% { opacity: 1; transform: scale(1.05) translateY(-5px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-bounce-enter {
          animation: bounce-enter 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards;
        }
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down {
          animation: fade-in-down 0.2s ease-out forwards;
        }
        @keyframes bounce-in {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
      `}</style>
    </div>
  );
}