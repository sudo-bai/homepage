import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Search, Trash2, ChevronDown, Check, Settings, Globe, Image as ImageIcon, Upload, Monitor, RefreshCw } from 'lucide-react';

// 独立的图标组件 - 带本地缓存 + 国内线路优化版
const SmartIcon = ({ url, title }) => {
  const [src, setSrc] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isCached, setIsCached] = useState(false);

  // 提取域名的辅助函数
  const getHostname = (link) => {
    try {
      return new URL(link).hostname;
    } catch (e) {
      return '';
    }
  };

  const hostname = getHostname(url);
  // 使用特定的前缀作为缓存 Key，避免冲突
  const cacheKey = `fav_cache_v1_${hostname}`;

  useEffect(() => {
    if (!url || !hostname) return;
    
    // 1. 尝试从本地缓存读取
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        setSrc(cachedData);
        setIsCached(true);
        return;
      }
    } catch (e) {
      // 忽略存储读取错误
    }

    // 2. 如果没有缓存，开始获取流程
    // 策略 1: 使用 UOMG API (国内稳定)
    setSrc(`https://api.uomg.com/api/get.favicon?url=${encodeURIComponent(url)}`);
    setRetryCount(0);
    setIsCached(false);
    
  }, [url, hostname]);

  const handleError = () => {
    // 如果是缓存的图片加载失败（比如缓存的 URL 过期了），清除缓存并重新开始
    if (isCached) {
      localStorage.removeItem(cacheKey);
      setIsCached(false);
      setRetryCount(0);
      setSrc(`https://api.uomg.com/api/get.favicon?url=${encodeURIComponent(url)}`);
      return;
    }

    if (retryCount === 0) {
      // 策略 2: 失败后，尝试一为 API
      setSrc(`https://api.iowen.cn/favicon/${hostname}.png`);
      setRetryCount(1);
    } else if (retryCount === 1) {
      // 策略 3: 尝试直接访问网站根目录的 favicon.ico
      try {
        const urlObj = new URL(url);
        setSrc(`${urlObj.origin}/favicon.ico`);
      } catch (e) {
        setSrc('fallback');
      }
      setRetryCount(2);
    } else {
      // 所有策略都失败
      setSrc('fallback');
    }
  };

  const handleLoad = async (e) => {
    // 如果已经是缓存的数据，或者显示的是默认地球图标，则不进行处理
    if (isCached || src === 'fallback') return;

    const currentSrc = e.target.src;

    // 尝试将图片缓存到本地
    try {
      // 尝试 1: Fetch 图片并转为 Base64 (实现真正的离线缓存)
      // 注意：这需要对方服务器支持 CORS，大多数 API 支持
      const response = await fetch(currentSrc);
      const blob = await response.blob();
      
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64 = reader.result;
          // 只有当图片大小合理时才缓存 (例如小于 50KB)，避免撑爆 localStorage
          if (base64.length < 50 * 1024) { 
             localStorage.setItem(cacheKey, base64);
          } else {
             // 图片太大，只缓存 URL
             localStorage.setItem(cacheKey, currentSrc);
          }
        } catch (storageError) {
          // 如果 localStorage 满了 (QuotaExceededError)，退而求其次缓存 URL
          // 缓存 URL 也能避免下次重新走 retry 流程，速度依然很快
          console.warn('LocalStorage full, caching URL only');
          try {
             localStorage.setItem(cacheKey, currentSrc);
          } catch(e) {}
        }
      };
      reader.readAsDataURL(blob);

    } catch (corsError) {
      // 尝试 2: 如果发生 CORS 错误（无法读取图片数据），则直接缓存当前有效的 URL
      // 虽然不能离线，但下次加载时直接使用这个 URL，跳过了试错过程，速度也很快
      try {
        localStorage.setItem(cacheKey, currentSrc);
      } catch (e) {}
    }
  };

  if (src === 'fallback') {
    return (
      <div className="w-full h-full bg-white/20 flex items-center justify-center text-white/50 rounded-lg">
        <Globe size={16} />
      </div>
    );
  }

  return (
    <img 
      src={src} 
      alt={title} 
      className="w-6 h-6 object-contain rounded-sm" 
      onError={handleError}
      onLoad={handleLoad}
      loading="lazy"
    />
  );
};

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [links, setLinks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false); // 添加捷径弹窗
  const [isSettingsOpen, setIsSettingsOpen] = useState(false); // 全局设置弹窗
  
  const [newLink, setNewLink] = useState({ title: '', url: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [showDashboard, setShowDashboard] = useState(false); 
  
  // 搜索引擎状态
  const [searchEngine, setSearchEngine] = useState('baidu');
  const [isEngineMenuOpen, setIsEngineMenuOpen] = useState(false);
  const [customEngineUrl, setCustomEngineUrl] = useState('');
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);

  // 搜索预测状态
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchContainerRef = useRef(null);
  
  // 派生状态：是否正在显示预测
  const hasSuggestions = showSuggestions && suggestions.length > 0;

  // 背景配置状态
  const [bgConfig, setBgConfig] = useState({
    type: 'default', // default, bing, api, upload
    customApi: 'https://t.alcy.cc/ycy',
    uploadData: '' // Base64 string
  });

  // 搜索引擎配置
  const engines = {
    baidu: { name: '百度', url: 'https://www.baidu.com/s?wd=', placeholder: '百度一下' },
    google: { name: 'Google', url: 'https://www.google.com/search?q=', placeholder: 'Google 搜索' },
    bing: { name: 'Bing', url: 'https://www.bing.com/search?q=', placeholder: '微软 Bing' },
    custom: { name: '自定义', url: customEngineUrl, placeholder: '自定义搜索' },
  };

  const defaultLinks = [
    { id: 1, title: 'Bilibili', url: 'https://www.bilibili.com' },
    { id: 2, title: 'GitHub', url: 'https://github.com' },
  ];

  // 初始化设置
  useEffect(() => {
    // 1. 设置网站标题
    document.title = "Skadi's home page";
    
    // 2. 设置网站 Favicon
    const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'icon';
    link.href = 'https://blog.skadi.ltd/wp-content/uploads/2025/12/Gemini_Generated_Image_c428t9c428t9c428.png';
    document.getElementsByTagName('head')[0].appendChild(link);

    // 3. 禁止浏览器自动翻译
    document.documentElement.lang = "zh-CN"; 
    document.documentElement.setAttribute("translate", "no");
    
    const metaGoogle = document.createElement('meta');
    metaGoogle.name = "google";
    metaGoogle.content = "notranslate";
    document.head.appendChild(metaGoogle);

    // 加载链接
    const savedLinks = localStorage.getItem('my-nav-links');
    if (savedLinks) setLinks(JSON.parse(savedLinks));
    else setLinks(defaultLinks);

    // 加载搜索引擎偏好
    const savedEngine = localStorage.getItem('search-engine-pref');
    const savedCustomUrl = localStorage.getItem('custom-engine-url');
    if (savedCustomUrl) setCustomEngineUrl(savedCustomUrl);
    if (savedEngine) {
      if (savedEngine === 'custom' && !savedCustomUrl) setSearchEngine('baidu'); 
      else setSearchEngine(savedEngine);
    }

    // 加载背景配置
    const savedBgConfig = localStorage.getItem('bg-config');
    if (savedBgConfig) {
      setBgConfig(JSON.parse(savedBgConfig));
    }
    
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    // 点击外部关闭搜索建议
    const handleClickOutside = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      clearInterval(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 自动保存链接
  useEffect(() => {
    if (links.length > 0) localStorage.setItem('my-nav-links', JSON.stringify(links));
  }, [links]);

  // 自动保存背景配置
  useEffect(() => {
    try {
      localStorage.setItem('bg-config', JSON.stringify(bgConfig));
    } catch (e) {
      alert("图片太大了，无法保存到本地缓存！请尝试压缩图片或使用较小的图片。");
    }
  }, [bgConfig]);

  // 搜索预测逻辑 (JSONP)
  useEffect(() => {
    let script;
    const fetchSuggestions = () => {
      if (!searchQuery.trim()) {
        setSuggestions([]);
        return;
      }

      const callbackName = 'bing_suggestion_callback_' + Date.now();
      
      window[callbackName] = (data) => {
        const suggests = data?.AS?.Results?.[0]?.Suggests?.map(s => s.Txt) || [];
        setSuggestions(suggests);
        
        delete window[callbackName];
        const existingScript = document.getElementById(callbackName);
        if (existingScript) document.body.removeChild(existingScript);
      };

      script = document.createElement('script');
      script.id = callbackName;
      script.src = `https://api.bing.com/qsonhs.aspx?type=cb&q=${encodeURIComponent(searchQuery)}&cb=${callbackName}`;
      
      script.onerror = () => {
         delete window[callbackName];
         const existingScript = document.getElementById(callbackName);
         if (existingScript) document.body.removeChild(existingScript);
      };

      document.body.appendChild(script);
    };

    const timeoutId = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [searchQuery]);


  // 计算当前背景 URL
  const getBackgroundUrl = () => {
    switch (bgConfig.type) {
      case 'bing':
        return 'https://bing.biturl.top/?resolution=1920&format=image&index=0&mkt=zh-CN';
      case 'api':
        return bgConfig.customApi || 'https://t.alcy.cc/ycy';
      case 'upload':
        return bgConfig.uploadData;
      default:
        return 'https://t.alcy.cc/ycy';
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) { 
      alert("为了保证浏览器性能，请上传小于 4MB 的图片");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setBgConfig(prev => ({ ...prev, type: 'upload', uploadData: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleEngineChange = (engineKey) => {
    if (engineKey === 'custom') {
      if (!customEngineUrl) setIsCustomModalOpen(true);
      else {
        setSearchEngine('custom');
        localStorage.setItem('search-engine-pref', 'custom');
      }
    } else {
      setSearchEngine(engineKey);
      localStorage.setItem('search-engine-pref', engineKey);
    }
    setIsEngineMenuOpen(false);
  };

  const saveCustomEngine = (url) => {
    setCustomEngineUrl(url);
    localStorage.setItem('custom-engine-url', url);
    setSearchEngine('custom');
    localStorage.setItem('search-engine-pref', 'custom');
    setIsCustomModalOpen(false);
  };

  const handleAddLink = () => {
    if (!newLink.title || !newLink.url) return;
    let formattedUrl = newLink.url;
    if (!/^https?:\/\//i.test(formattedUrl)) formattedUrl = 'http://' + formattedUrl; 
    const newItem = { id: Date.now(), title: newLink.title, url: formattedUrl };
    setLinks([...links, newItem]);
    setNewLink({ title: '', url: '' });
    setIsModalOpen(false);
  };

  const handleDeleteLink = (id) => {
    const updatedLinks = links.filter(link => link.id !== id);
    setLinks(updatedLinks);
    if (updatedLinks.length === 0) localStorage.removeItem('my-nav-links'); 
  };

  const executeSearch = (query) => {
    if (!query.trim()) return;
    let engineUrl = engines[searchEngine].url;
    if (!engineUrl) engineUrl = engines['baidu'].url; 
    window.location.href = `${engineUrl}${encodeURIComponent(query)}`;
  }

  const handleSearch = (e) => {
    e.preventDefault();
    executeSearch(searchQuery);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    setShowSuggestions(false);
    executeSearch(suggestion);
  };

  const toggleDashboard = () => {
    setShowDashboard(!showDashboard);
    if (!showDashboard) setEditMode(false); 
  };

  const formatTime = (date) => date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const formatDate = (date) => date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center font-sans overflow-hidden text-white selection:bg-pink-500 selection:text-white notranslate">
      {/* 背景图片 */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700 ease-in-out"
        style={{ 
          backgroundImage: `url("${getBackgroundUrl()}")`,
          filter: showDashboard ? 'brightness(0.6) blur(10px)' : 'brightness(0.85) blur(0px)',
          transform: showDashboard ? 'scale(1.1)' : 'scale(1.05)'
        }}
      />
      
      {/* 点击遮罩 */}
      {showDashboard && (
        <div className="absolute inset-0 z-10" onClick={() => setShowDashboard(false)}></div>
      )}

      {/* 主内容区域 */}
      <div className={`z-20 w-full max-w-2xl px-4 flex flex-col items-center transition-all duration-500 ease-spring ${showDashboard ? 'mt-16' : 'mt-[20vh]'}`}>
        
        {/* 时间显示 */}
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

        {/* 搜索框区域 - 添加 ref 以处理点击外部关闭 */}
        <div ref={searchContainerRef} className="w-full max-w-md relative z-30 transition-all duration-500 group">
          <form onSubmit={handleSearch} className="relative w-full flex items-center z-50">
            
            <div className="absolute left-1.5 top-1.5 bottom-1.5 z-50 flex items-center rounded-full">
              <button
                type="button"
                onClick={() => setIsEngineMenuOpen(!isEngineMenuOpen)}
                className="h-full flex items-center gap-1.5 px-3.5 text-xs font-medium text-white/90 bg-white/10 hover:bg-white/20 hover:text-white rounded-full transition-all border border-white/10 shadow-sm active:scale-95 focus:outline-none focus:ring-0 relative z-50"
                style={{ outline: 'none' }}
              >
                <span className="truncate max-w-[4rem] text-center">{engines[searchEngine].name}</span>
                <ChevronDown size={12} className={`opacity-60 transition-transform duration-200 ${isEngineMenuOpen ? 'rotate-180' : ''}`}/>
              </button>

              {isEngineMenuOpen && (
                <div 
                  className="absolute top-full left-0 mt-2 w-32 p-1 bg-black/20 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl animate-fade-in-down origin-top-left flex flex-col z-40"
                >
                  {Object.entries(engines).map(([key, engine]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleEngineChange(key)}
                      className="w-full px-3 py-2 text-left text-xs text-white/80 hover:bg-white/15 hover:text-white flex items-center justify-between transition-colors focus:outline-none rounded-lg mb-0.5"
                      style={{ outline: 'none' }}
                    >
                      <span className="truncate">{engine.name}</span>
                      {searchEngine === key && <Check size={10} className="text-green-400 shrink-0" />}
                    </button>
                  ))}
                  
                  {searchEngine === 'custom' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCustomModalOpen(true);
                        setIsEngineMenuOpen(false);
                      }}
                      className="w-full px-3 py-2 mt-1 text-left text-[10px] text-white/40 hover:bg-white/10 hover:text-white/60 bg-white/5 rounded-lg flex items-center gap-1 focus:outline-none"
                      style={{ outline: 'none' }}
                    >
                      <Settings size={10} /> 配置地址
                    </button>
                  )}
                </div>
              )}
            </div>

            <input
              type="text"
              name="search"
              id="search-input"
              autoComplete="off"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                // 输入时如果有内容则显示建议
                if (e.target.value.trim()) setShowSuggestions(true);
              }}
              onFocus={() => {
                setShowDashboard(true);
                // 聚焦时如果已有建议则显示
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onClick={() => setShowDashboard(true)}
              placeholder={engines[searchEngine].placeholder}
              className={`w-full py-3.5 pl-32 pr-12 backdrop-blur-md text-white placeholder-white/30 shadow-lg focus:outline-none transition-all duration-300 text-sm 
                ${hasSuggestions 
                  ? 'bg-black/40 border border-white/20 border-b-0 rounded-t-3xl rounded-b-none focus:shadow-none' 
                  : 'bg-black/20 border border-white/10 rounded-full focus:bg-black/40 focus:border-white/30 focus:shadow-2xl'}`}
              style={{ textAlign: 'center', outline: 'none' }} 
            />
            
            <button 
              type="submit"
              className="absolute right-3.5 p-1.5 text-white/40 hover:text-white transition-colors bg-white/5 rounded-full hover:bg-white/10 focus:outline-none"
              style={{ outline: 'none' }}
            >
              <Search size={16} />
            </button>
          </form>

          {/* 搜索预测下拉列表 - 修改样式以匹配拉伸效果 */}
          {hasSuggestions && (
            <div 
              className="absolute top-full left-0 w-full bg-black/40 backdrop-blur-md border border-t-0 border-white/20 rounded-b-3xl shadow-xl overflow-hidden z-40 origin-top"
              style={{ clipPath: 'inset(0px -50px -50px -50px)' }} 
            >
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white cursor-pointer transition-colors flex items-center gap-3"
                >
                  <Search size={12} className="opacity-40" />
                  <span className="truncate">{suggestion}</span>
                </div>
              ))}
              <div className="h-2"></div> {/* 底部留白 */}
            </div>
          )}
        </div>

        {/* 仪表盘区域 (包含设置按钮和捷径) - 当有预测词时隐藏 */}
        <div className={`w-full max-w-2xl mt-8 transition-all duration-500 ease-spring transform origin-top relative 
          ${showDashboard && !hasSuggestions 
            ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' 
            : 'opacity-0 scale-90 -translate-y-8 pointer-events-none h-0'}`}>
          
          <div className="flex justify-between items-center mb-3 px-2">
            <h2 className="text-white/50 text-[10px] font-medium tracking-wider uppercase">快捷导航</h2>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                title="背景设置"
              >
                <Settings size={14} />
              </button>

              <button 
                onClick={() => setEditMode(!editMode)}
                className={`px-3 py-1 text-[10px] rounded-full transition-all duration-300 border border-transparent ${editMode ? 'bg-red-500/80 text-white' : 'hover:bg-white/10 text-white/40 hover:text-white hover:border-white/10'}`}
              >
                {editMode ? "完成" : "管理"}
              </button>
            </div>
          </div>

          {/* 捷径网格 */}
          <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 pb-10">
            {links.map((link, index) => (
              <div 
                key={link.id}
                style={{ animationDelay: `${index * 50}ms` }}
                className={`group relative flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 border border-white/5 backdrop-blur-md shadow-sm hover:bg-white/15 hover:scale-105 hover:shadow-lg transition-all duration-300 cursor-pointer h-24 ${showDashboard ? 'animate-bounce-enter' : ''}`}
                onClick={() => !editMode && window.location.assign(link.url)}
              >
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
            <button
              style={{ animationDelay: `${links.length * 50}ms` }}
              onClick={() => setIsModalOpen(true)}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border border-dashed border-white/10 hover:bg-white/5 hover:border-white/30 transition-all duration-300 h-24 group ${showDashboard ? 'animate-bounce-enter' : ''}`}
            >
              <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center mb-1 group-hover:scale-110 transition-transform">
                <Plus size={16} className="text-white/40" />
              </div>
              <span className="text-white/30 text-[10px] group-hover:text-white/60 transition-colors">添加</span>
            </button>
          </div>
        </div>
      </div>

      <div className={`absolute bottom-4 text-white/20 text-[10px] font-light tracking-widest transition-opacity duration-300 ${showDashboard ? 'opacity-100' : 'opacity-0'}`}>
        Skadi's home page
      </div>

      {/* 捷径添加弹窗 - 统一 UI */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-xs bg-black/40 backdrop-blur-2xl border border-white/20 rounded-2xl p-5 shadow-2xl animate-bounce-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-white">添加新捷径</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/50 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:bg-white/10 focus:border-white/30" placeholder="名称" value={newLink.title} onChange={(e) => setNewLink({ ...newLink, title: e.target.value })} autoFocus />
              <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:bg-white/10 focus:border-white/30" placeholder="网址" value={newLink.url} onChange={(e) => setNewLink({ ...newLink, url: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleAddLink()} />
              <button onClick={handleAddLink} className="w-full py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-200 mt-2 transition-colors">保存</button>
            </div>
          </div>
        </div>
      )}

      {/* 自定义搜索弹窗 - 统一 UI */}
      {isCustomModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsCustomModalOpen(false)}></div>
          <div className="relative w-full max-w-xs bg-black/40 backdrop-blur-2xl border border-white/20 rounded-2xl p-5 shadow-2xl animate-bounce-in">
             <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-white">自定义搜索引擎</h3>
              <button onClick={() => setIsCustomModalOpen(false)} className="text-white/50 hover:text-white"><X size={18} /></button>
            </div>
            <p className="text-xs text-white/50 mb-3">请输入搜索 URL，将关键词用空代替直接放在末尾。</p>
            <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:bg-white/10 focus:border-white/30" placeholder="https://..." value={customEngineUrl} onChange={(e) => setCustomEngineUrl(e.target.value)} />
            <button onClick={() => saveCustomEngine(customEngineUrl)} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 mt-3 transition-colors">保存并使用</button>
          </div>
        </div>
      )}

      {/* 背景设置弹窗 - 统一 UI */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsSettingsOpen(false)}></div>
          <div className="relative w-full max-w-sm bg-black/40 backdrop-blur-2xl border border-white/20 rounded-2xl p-6 shadow-2xl animate-bounce-in">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <ImageIcon size={18} /> 背景设置
              </h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-white/50 hover:text-white"><X size={20} /></button>
            </div>

            <div className="space-y-3">
              {/* 选项 1: 默认 */}
              <button 
                onClick={() => setBgConfig({ ...bgConfig, type: 'default' })}
                className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all ${bgConfig.type === 'default' ? 'bg-white/10 border-white/50' : 'bg-transparent border-white/10 hover:bg-white/5'}`}
              >
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400"><Monitor size={16}/></div>
                <div className="text-left flex-1">
                  <div className="text-sm font-medium text-white">默认背景</div>
                  <div className="text-xs text-white/50">二次元随机图片</div>
                </div>
                {bgConfig.type === 'default' && <Check size={16} className="text-green-400"/>}
              </button>

              {/* 选项 2: Bing */}
              <button 
                onClick={() => setBgConfig({ ...bgConfig, type: 'bing' })}
                className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all ${bgConfig.type === 'bing' ? 'bg-white/10 border-white/50' : 'bg-transparent border-white/10 hover:bg-white/5'}`}
              >
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400"><Globe size={16}/></div>
                <div className="text-left flex-1">
                  <div className="text-sm font-medium text-white">Bing 每日一图</div>
                  <div className="text-xs text-white/50">每天自动更新</div>
                </div>
                {bgConfig.type === 'bing' && <Check size={16} className="text-green-400"/>}
              </button>

              {/* 选项 3: 自定义 API */}
              <div className={`rounded-xl border transition-all overflow-hidden ${bgConfig.type === 'api' ? 'bg-white/10 border-white/50' : 'bg-transparent border-white/10'}`}>
                <button 
                  onClick={() => setBgConfig({ ...bgConfig, type: 'api' })}
                  className="w-full p-3 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400"><RefreshCw size={16}/></div>
                  <div className="text-left flex-1">
                    <div className="text-sm font-medium text-white">自定义图片 API</div>
                  </div>
                  {bgConfig.type === 'api' && <Check size={16} className="text-green-400"/>}
                </button>
                {bgConfig.type === 'api' && (
                  <div className="px-3 pb-3">
                    <input 
                      type="text" 
                      value={bgConfig.customApi}
                      onChange={(e) => setBgConfig({ ...bgConfig, customApi: e.target.value })}
                      placeholder="输入图片 API 地址..."
                      className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30"
                    />
                  </div>
                )}
              </div>

              {/* 选项 4: 上传图片 */}
              <div className={`rounded-xl border transition-all overflow-hidden ${bgConfig.type === 'upload' ? 'bg-white/10 border-white/50' : 'bg-transparent border-white/10'}`}>
                <button 
                  onClick={() => setBgConfig({ ...bgConfig, type: 'upload' })}
                  className="w-full p-3 flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400"><Upload size={16}/></div>
                  <div className="text-left flex-1">
                    <div className="text-sm font-medium text-white">本地上传</div>
                  </div>
                  {bgConfig.type === 'upload' && <Check size={16} className="text-green-400"/>}
                </button>
                {bgConfig.type === 'upload' && (
                  <div className="px-3 pb-3">
                    <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <p className="text-xs text-white/50">点击选择图片 (Max 4MB)</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .ease-spring { transition-timing-function: cubic-bezier(0.175, 0.885, 0.32, 1.1); }
        @keyframes bounce-enter {
          0% { opacity: 0; transform: scale(0.5) translateY(20px); }
          50% { opacity: 1; transform: scale(1.05) translateY(-5px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        .animate-bounce-enter { animation: bounce-enter 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) backwards; }
        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down { animation: fade-in-down 0.2s ease-out forwards; }
        @keyframes bounce-in {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in { animation: bounce-in 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
      `}</style>
    </div>
  );
}