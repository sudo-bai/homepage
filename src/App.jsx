import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, X, Search, Trash2, ChevronDown, Check, Settings, Globe, 
  Image as ImageIcon, Upload, Monitor, RefreshCw, Edit, 
  ImagePlus, ArrowLeftRight, Grid 
} from 'lucide-react';

// 独立的图标组件 - 带本地缓存 + 自定义图标支持
const SmartIcon = ({ url, title, customIcon }) => {
  const [src, setSrc] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isCached, setIsCached] = useState(false);

  const getHostname = (link) => {
    try {
      return new URL(link).hostname;
    } catch (e) {
      return '';
    }
  };

  const hostname = getHostname(url);
  const cacheKey = `fav_cache_v1_${hostname}`;

  useEffect(() => {
    if (customIcon) {
      setSrc(customIcon);
      setIsCached(true);
      return;
    }

    if (!url || !hostname) return;
    
    try {
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        setSrc(cachedData);
        setIsCached(true);
        return;
      }
    } catch (e) {}

    setSrc(`https://api.uomg.com/api/get.favicon?url=${encodeURIComponent(url)}`);
    setRetryCount(0);
    setIsCached(false);
    
  }, [url, hostname, customIcon]);

  const handleError = () => {
    if (customIcon || isCached) {
      if (customIcon) {
         setSrc('fallback'); 
         return;
      }
      localStorage.removeItem(cacheKey);
      setIsCached(false);
      setRetryCount(0);
      setSrc(`https://api.uomg.com/api/get.favicon?url=${encodeURIComponent(url)}`);
      return;
    }

    if (retryCount === 0) {
      setSrc(`https://api.iowen.cn/favicon/${hostname}.png`);
      setRetryCount(1);
    } else if (retryCount === 1) {
      try {
        const urlObj = new URL(url);
        setSrc(`${urlObj.origin}/favicon.ico`);
      } catch (e) {
        setSrc('fallback');
      }
      setRetryCount(2);
    } else {
      setSrc('fallback');
    }
  };

  const handleLoad = async (e) => {
    if (customIcon) return;
    if (isCached || src === 'fallback') return;

    const currentSrc = e.target.src;

    try {
      const response = await fetch(currentSrc);
      const blob = await response.blob();
      const reader = new FileReader();
      reader.onloadend = () => {
        try {
          const base64 = reader.result;
          if (base64.length < 50 * 1024) { 
             localStorage.setItem(cacheKey, base64);
          } else {
             localStorage.setItem(cacheKey, currentSrc);
          }
        } catch (e) {
          try { localStorage.setItem(cacheKey, currentSrc); } catch(err) {}
        }
      };
      reader.readAsDataURL(blob);
    } catch (corsError) {
      try { localStorage.setItem(cacheKey, currentSrc); } catch(e) {}
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
      className="w-full h-full object-contain rounded-sm"
      onError={handleError}
      onLoad={handleLoad}
      loading="lazy"
      draggable="false" // 防止图片本身被浏览器默认拖拽
    />
  );
};

export default function App() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [links, setLinks] = useState([]);
  
  // 弹窗状态
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  
  // 编辑/新增/拖拽 状态
  const [newLink, setNewLink] = useState({ title: '', url: '', customIcon: null });
  const [editingId, setEditingId] = useState(null);
  
  // editMode 现在同时控制：显示删除按钮 + 抖动动画 + 启用拖拽
  const [editMode, setEditMode] = useState(false); 
  const dragItem = useRef(null); // 记录当前被拖拽的元素索引
  const dragOverItem = useRef(null); // 记录拖拽经过的元素索引

  // 搜索相关
  const [searchQuery, setSearchQuery] = useState('');
  const [showDashboard, setShowDashboard] = useState(false); 
  const [searchEngine, setSearchEngine] = useState('baidu');
  const [isEngineMenuOpen, setIsEngineMenuOpen] = useState(false);
  const [customEngineUrl, setCustomEngineUrl] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // 动画状态
  const [isAnimating, setIsAnimating] = useState(false);
  
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState({ visible: false, x: 0, y: 0, linkId: null });
  const contextMenuRef = useRef(null);
  const iconInputRef = useRef(null);

  const searchContainerRef = useRef(null);
  const hasSuggestions = showSuggestions && suggestions.length > 0;

  const [bgConfig, setBgConfig] = useState({
    type: 'default', 
    customApi: 'https://t.alcy.cc/ycy',
    uploadData: '' 
  });

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

  // 初始化
  useEffect(() => {
    document.title = "Skadi's home page";
    const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
    link.type = 'image/png';
    link.rel = 'icon';
    link.href = 'https://blog.skadi.ltd/wp-content/uploads/2025/12/Gemini_Generated_Image_c428t9c428t9c428.png';
    document.getElementsByTagName('head')[0].appendChild(link);
    document.documentElement.lang = "zh-CN"; 
    document.documentElement.setAttribute("translate", "no");
    
    const savedLinks = localStorage.getItem('my-nav-links');
    if (savedLinks) setLinks(JSON.parse(savedLinks));
    else setLinks(defaultLinks);

    const savedEngine = localStorage.getItem('search-engine-pref');
    const savedCustomUrl = localStorage.getItem('custom-engine-url');
    if (savedCustomUrl) setCustomEngineUrl(savedCustomUrl);
    if (savedEngine) {
      if (savedEngine === 'custom' && !savedCustomUrl) setSearchEngine('baidu'); 
      else setSearchEngine(savedEngine);
    }

    const savedBgConfig = localStorage.getItem('bg-config');
    if (savedBgConfig) setBgConfig(JSON.parse(savedBgConfig));
    
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);

    const handleGlobalClick = (event) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
      if (contextMenu.visible && contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setContextMenu({ ...contextMenu, visible: false });
      }
      // 在编辑模式下，点击非网格区域退出编辑模式
      // 这里简单处理：如果点击的是最外层容器(App的div)或者大的背景遮罩，就退出
      // 但由于React事件冒泡，我们在grid container上阻止冒泡即可，这里不强制全局处理，依赖用户的"完成"按钮习惯
      // 或者：如果点击的是背景（没有特定交互元素），退出编辑模式
      if (editMode && event.target.getAttribute('data-bg-layer') === 'true') {
        setEditMode(false);
      }
    };
    
    document.addEventListener('mousedown', handleGlobalClick);
    document.addEventListener('click', handleGlobalClick);

    return () => {
      clearInterval(timer);
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('click', handleGlobalClick);
    };
  }, [contextMenu, editMode]);

  useEffect(() => {
    if (links.length > 0) localStorage.setItem('my-nav-links', JSON.stringify(links));
  }, [links]);

  useEffect(() => {
    try {
      localStorage.setItem('bg-config', JSON.stringify(bgConfig));
    } catch (e) {
      alert("图片太大了，无法保存到本地缓存！");
    }
  }, [bgConfig]);

  // 搜索预测
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
    const timeoutId = setTimeout(() => fetchSuggestions(), 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  // 控制仪表盘动画
  useEffect(() => {
    if (showDashboard) {
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), 500);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(false);
      setEditMode(false); // 收起时自动退出编辑模式
    }
  }, [showDashboard]);

  const getBackgroundUrl = () => {
    switch (bgConfig.type) {
      case 'bing': return 'https://bing.biturl.top/?resolution=1920&format=image&index=0&mkt=zh-CN';
      case 'api': return bgConfig.customApi || 'https://t.alcy.cc/ycy';
      case 'upload': return bgConfig.uploadData;
      default: return 'https://t.alcy.cc/ycy';
    }
  };

  // --- 拖拽逻辑 ---

  const handleDragStart = (e, index) => {
    dragItem.current = index;
    // 设置拖拽时的效果
    // e.dataTransfer.effectAllowed = "move"; 
    // 可以设置一个透明图片作为ghost，这里使用默认的
  };

  const handleDragEnter = (e, index) => {
    // 当拖拽进入另一个格子的瞬间，交换数据（实现实时排序效果）
    // 为了避免过于频繁的交换，可以加个简单的判断
    if (dragItem.current === null || dragItem.current === index) return;
    
    const newLinks = [...links];
    const draggedLink = newLinks[dragItem.current];
    
    // 移除原位置的元素
    newLinks.splice(dragItem.current, 1);
    // 插入到新位置
    newLinks.splice(index, 0, draggedLink);
    
    dragItem.current = index; // 更新当前拖拽元素的索引为新位置
    setLinks(newLinks);
  };

  const handleDragEnd = () => {
    dragItem.current = null;
    dragOverItem.current = null;
    // 触发保存到 localStorage (通过 useEffect [links])
  };

  // --- 逻辑处理 ---

  const handleSaveLink = () => {
    if (!newLink.title || !newLink.url) return;
    let formattedUrl = newLink.url;
    if (!/^https?:\/\//i.test(formattedUrl)) formattedUrl = 'http://' + formattedUrl; 
    
    if (editingId) {
      setLinks(links.map(link => 
        link.id === editingId ? { ...link, title: newLink.title, url: formattedUrl, customIcon: newLink.customIcon } : link
      ));
    } else {
      const newItem = { id: Date.now(), title: newLink.title, url: formattedUrl, customIcon: null };
      setLinks([...links, newItem]);
    }
    
    setIsModalOpen(false);
    setNewLink({ title: '', url: '', customIcon: null });
    setEditingId(null);
  };

  const openAddModal = () => {
    setNewLink({ title: '', url: '', customIcon: null });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleContextMenu = (e, linkId) => {
    e.preventDefault(); 
    e.stopPropagation();
    
    // 如果已经在编辑模式，右键可能不需要触发菜单，或者触发简化版菜单
    // 简单起见：如果已在编辑模式，禁止呼出菜单，避免逻辑冲突
    if (editMode) return;

    let x = e.clientX;
    let y = e.clientY;
    const menuWidth = 160;
    const menuHeight = 200;

    if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
    if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;

    setContextMenu({
      visible: true,
      x,
      y,
      linkId
    });
  };

  const handleMenuEdit = () => {
    const linkToEdit = links.find(l => l.id === contextMenu.linkId);
    if (linkToEdit) {
      setNewLink({ title: linkToEdit.title, url: linkToEdit.url, customIcon: linkToEdit.customIcon });
      setEditingId(linkToEdit.id);
      setIsModalOpen(true);
    }
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleMenuCustomIcon = () => {
    if (iconInputRef.current) iconInputRef.current.click();
    setContextMenu({ ...contextMenu, visible: false });
  };

  // 新增：进入排列/抖动模式
  const handleMenuRearrange = () => {
    setEditMode(true);
    setContextMenu({ ...contextMenu, visible: false });
  };

  const handleCustomIconFileChange = (e) => {
    const file = e.target.files[0];
    if (!file || !contextMenu.linkId) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("图标图片请小于 2MB");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setLinks(links.map(link => 
        link.id === contextMenu.linkId ? { ...link, customIcon: base64 } : link
      ));
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleMenuDelete = () => {
    const updatedLinks = links.filter(link => link.id !== contextMenu.linkId);
    setLinks(updatedLinks);
    if (updatedLinks.length === 0) localStorage.removeItem('my-nav-links');
    setContextMenu({ ...contextMenu, visible: false });
  };


  const formatTime = (date) => date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false });
  const formatDate = (date) => date.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' });

  return (
    <div 
      className="min-h-screen w-full relative flex flex-col items-center font-sans overflow-hidden text-white selection:bg-pink-500 selection:text-white notranslate"
      onClick={() => setContextMenu({ ...contextMenu, visible: false })} 
      onContextMenu={(e) => { e.preventDefault(); setContextMenu({ ...contextMenu, visible: false }); }}
      data-bg-layer="true" // 用于识别点击背景
    >
      <input type="file" ref={iconInputRef} className="hidden" accept="image/*" onChange={handleCustomIconFileChange} />

      <div 
        className="absolute inset-0 z-0 bg-cover bg-center transition-all duration-700 ease-in-out"
        style={{ 
          backgroundImage: `url("${getBackgroundUrl()}")`,
          filter: showDashboard ? 'brightness(0.6) blur(10px)' : 'brightness(0.85) blur(0px)',
          transform: showDashboard ? 'scale(1.1)' : 'scale(1.05)'
        }}
        data-bg-layer="true"
      />
      
      {showDashboard && (
        <div className="absolute inset-0 z-10" onClick={() => setShowDashboard(false)} data-bg-layer="true"></div>
      )}

      {/* 右键菜单 */}
      {contextMenu.visible && (
        <div 
          ref={contextMenuRef}
          className="fixed z-[100] w-36 bg-black/60 backdrop-blur-xl border border-white/20 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 animate-fade-in-fast origin-top-left"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()} 
          onContextMenu={(e) => e.preventDefault()}
        >
          <button onClick={handleMenuEdit} className="flex items-center gap-2 px-3 py-2 text-xs text-white/90 hover:bg-white/20 rounded-lg transition-colors text-left w-full">
            <Edit size={12} /> 编辑
          </button>
          <button onClick={handleMenuCustomIcon} className="flex items-center gap-2 px-3 py-2 text-xs text-white/90 hover:bg-white/20 rounded-lg transition-colors text-left w-full">
            <ImagePlus size={12} /> 自定义图标
          </button>
          
          <div className="h-[1px] bg-white/10 my-0.5 mx-2"></div>
          
          {/* 排列图标 (进入抖动/拖拽模式) */}
          <button onClick={handleMenuRearrange} className="flex items-center gap-2 px-3 py-2 text-xs text-white/90 hover:bg-white/20 rounded-lg transition-colors text-left w-full">
            <Grid size={12} /> 排列图标
          </button>
          
          <div className="h-[1px] bg-white/10 my-0.5 mx-2"></div>
          <button onClick={handleMenuDelete} className="flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:bg-red-500/20 hover:text-red-300 rounded-lg transition-colors text-left w-full">
            <Trash2 size={12} /> 删除
          </button>
        </div>
      )}

      {/* 主内容区域 */}
      <div className={`z-20 w-full max-w-2xl px-4 flex flex-col items-center transition-all duration-500 ease-spring ${showDashboard ? 'mt-16' : 'mt-[20vh]'}`}>
        
        {/* 时间显示 */}
        <div 
          className="text-center drop-shadow-lg mb-8 cursor-pointer select-none group transition-transform active:scale-95"
          onClick={() => setShowDashboard(!showDashboard)}
          title={showDashboard ? "收起" : "展开导航"}
        >
          <h1 className="text-7xl md:text-8xl font-light tracking-tighter text-white/95 group-hover:text-white transition-colors" style={{ fontFamily: '"SF Pro Display", system-ui, sans-serif' }}>
            {formatTime(currentTime)}
          </h1>
          <p className={`text-sm md:text-base text-white/80 font-medium tracking-[0.2em] mt-1 uppercase transition-opacity duration-300 ${showDashboard ? 'opacity-80' : 'opacity-60 group-hover:opacity-100'}`}>
            {formatDate(currentTime)}
          </p>
        </div>

        {/* 搜索框 */}
        <div ref={searchContainerRef} className="w-full max-w-md relative z-30 transition-all duration-500 group">
          <form onSubmit={(e) => { e.preventDefault(); if(searchQuery.trim()) window.location.href = `${engines[searchEngine].url}${encodeURIComponent(searchQuery)}`; }} className="relative w-full flex items-center z-50">
            <div className="absolute left-1.5 top-1.5 bottom-1.5 z-50 flex items-center rounded-full">
              <button
                type="button"
                onClick={() => setIsEngineMenuOpen(!isEngineMenuOpen)}
                className="h-full flex items-center gap-1.5 px-3.5 text-xs font-medium text-white/90 bg-white/10 hover:bg-white/20 hover:text-white rounded-full transition-all border border-white/10 shadow-sm active:scale-95 focus:outline-none focus:ring-0 relative z-50"
              >
                <span className="truncate max-w-[4rem] text-center">{engines[searchEngine].name}</span>
                <ChevronDown size={12} className={`opacity-60 transition-transform duration-200 ${isEngineMenuOpen ? 'rotate-180' : ''}`}/>
              </button>
              {isEngineMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-32 p-1 bg-black/20 backdrop-blur-xl border border-white/10 rounded-xl shadow-2xl animate-fade-in-down origin-top-left flex flex-col z-40">
                  {Object.entries(engines).map(([key, engine]) => (
                    <button key={key} type="button" onClick={() => { setSearchEngine(key); localStorage.setItem('search-engine-pref', key); setIsEngineMenuOpen(false); }} className="w-full px-3 py-2 text-left text-xs text-white/80 hover:bg-white/15 hover:text-white flex items-center justify-between transition-colors focus:outline-none rounded-lg mb-0.5">
                      <span className="truncate">{engine.name}</span>
                      {searchEngine === key && <Check size={10} className="text-green-400 shrink-0" />}
                    </button>
                  ))}
                  {searchEngine === 'custom' && (
                    <button type="button" onClick={(e) => { e.stopPropagation(); setIsCustomModalOpen(true); setIsEngineMenuOpen(false); }} className="w-full px-3 py-2 mt-1 text-left text-[10px] text-white/40 hover:bg-white/10 hover:text-white/60 bg-white/5 rounded-lg flex items-center gap-1 focus:outline-none">
                      <Settings size={10} /> 配置地址
                    </button>
                  )}
                </div>
              )}
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); if (e.target.value.trim()) setShowSuggestions(true); }}
              onFocus={() => { setShowDashboard(true); if (suggestions.length > 0) setShowSuggestions(true); }}
              onClick={() => setShowDashboard(true)}
              placeholder={engines[searchEngine].placeholder}
              className={`w-full py-3.5 pl-32 pr-12 backdrop-blur-md text-white placeholder-white/30 shadow-lg focus:outline-none transition-all duration-300 text-sm ${hasSuggestions ? 'bg-black/40 border border-white/20 border-b-0 rounded-t-3xl rounded-b-none focus:shadow-none' : 'bg-black/20 border border-white/10 rounded-full focus:bg-black/40 focus:border-white/30 focus:shadow-2xl'}`}
              style={{ textAlign: 'center' }} 
            />
            <button type="submit" className="absolute right-3.5 p-1.5 text-white/40 hover:text-white transition-colors bg-white/5 rounded-full hover:bg-white/10 focus:outline-none"><Search size={16} /></button>
          </form>
          {hasSuggestions && (
            <div className="absolute top-full left-0 w-full bg-black/40 backdrop-blur-md border border-t-0 border-white/20 rounded-b-3xl shadow-xl overflow-hidden z-40 origin-top" style={{ clipPath: 'inset(0px -50px -50px -50px)' }}>
              {suggestions.map((suggestion, index) => (
                <div key={index} onClick={() => { setSearchQuery(suggestion); setShowSuggestions(false); window.location.href = `${engines[searchEngine].url}${encodeURIComponent(suggestion)}`; }} className="px-4 py-2.5 text-sm text-white/80 hover:bg-white/10 hover:text-white cursor-pointer transition-colors flex items-center gap-3">
                  <Search size={12} className="opacity-40" />
                  <span className="truncate">{suggestion}</span>
                </div>
              ))}
              <div className="h-2"></div>
            </div>
          )}
        </div>

        {/* 仪表盘 */}
        <div className={`w-full max-w-2xl mt-8 transition-all duration-500 ease-spring transform origin-top relative ${showDashboard && !hasSuggestions ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-90 -translate-y-8 pointer-events-none h-0'}`}>
          
          <div className="flex justify-between items-center mb-3 px-2">
            <h2 className="text-white/50 text-[10px] font-medium tracking-wider uppercase">快捷导航</h2>
            <div className="flex items-center gap-2">
              <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors" title="背景设置">
                <Settings size={14} />
              </button>
              <button 
                onClick={() => setEditMode(!editMode)}
                className={`px-3 py-1 text-[10px] rounded-full transition-all duration-300 border border-transparent ${editMode ? 'bg-white text-black font-bold' : 'hover:bg-white/10 text-white/40 hover:text-white hover:border-white/10'}`}
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
                draggable={editMode}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnter={(e) => handleDragEnter(e, index)}
                onDragOver={(e) => e.preventDefault()} // 允许 drop
                onDragEnd={handleDragEnd}
                className={`group relative flex flex-col items-center justify-center p-2 rounded-xl bg-white/5 border border-white/5 backdrop-blur-md shadow-sm transition-all duration-300 h-24 select-none
                  ${isAnimating ? 'animate-bounce-enter' : ''}
                  ${editMode ? 'animate-shake cursor-move hover:bg-white/20' : 'hover:bg-white/15 hover:scale-105 hover:shadow-lg cursor-pointer'}
                `}
                onClick={() => !editMode && window.location.assign(link.url)}
                onContextMenu={(e) => handleContextMenu(e, link.id)} 
              >
                <div className="w-9 h-9 mb-2 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center shadow-inner group-hover:bg-white/10 transition-colors pointer-events-none">
                  <SmartIcon url={link.url} title={link.title} customIcon={link.customIcon} />
                </div>
                <span className="text-white/80 group-hover:text-white font-medium text-[10px] truncate w-full text-center px-1 transition-colors pointer-events-none">
                  {link.title}
                </span>
                
                {/* 删除按钮 - 仅在编辑模式显示 */}
                {editMode && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setLinks(links.filter(l => l.id !== link.id));
                    }}
                    className="absolute -top-1.5 -left-1.5 bg-white/20 backdrop-blur-md border border-white/20 text-white p-1 rounded-full shadow hover:bg-red-500 hover:border-red-500 transition-colors z-20 animate-bounce-in"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            ))}
            
            <button
              style={{ animationDelay: `${links.length * 50}ms` }}
              onClick={openAddModal}
              className={`flex flex-col items-center justify-center p-2 rounded-xl border border-dashed border-white/10 hover:bg-white/5 hover:border-white/30 transition-all duration-300 h-24 group ${isAnimating ? 'animate-bounce-enter' : ''}`}
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

      {/* 弹窗组件 (保持不变) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-xs bg-black/40 backdrop-blur-2xl border border-white/20 rounded-2xl p-5 shadow-2xl animate-bounce-in">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-semibold text-white">{editingId ? '编辑捷径' : '添加新捷径'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-white/50 hover:text-white"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-white/40 ml-1">名称</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:bg-white/10 focus:border-white/30" placeholder="网站名称" value={newLink.title} onChange={(e) => setNewLink({ ...newLink, title: e.target.value })} autoFocus />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] text-white/40 ml-1">链接</label>
                <input type="text" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:bg-white/10 focus:border-white/30" placeholder="https://..." value={newLink.url} onChange={(e) => setNewLink({ ...newLink, url: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && handleSaveLink()} />
              </div>
              {newLink.customIcon && (
                <div className="flex items-center justify-between bg-white/5 p-2 rounded-lg border border-white/10">
                   <div className="flex items-center gap-2">
                     <img src={newLink.customIcon} className="w-6 h-6 rounded-sm object-contain bg-black/20" alt="icon" />
                     <span className="text-xs text-white/60">已使用自定义图标</span>
                   </div>
                   <button onClick={() => setNewLink({...newLink, customIcon: null})} className="text-xs text-red-400 hover:text-red-300">清除</button>
                </div>
              )}
              <button onClick={handleSaveLink} className="w-full py-2 bg-white text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-200 mt-2 transition-colors">{editingId ? '更新' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {/* 自定义搜索配置弹窗 */}
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
            <button onClick={() => { localStorage.setItem('custom-engine-url', customEngineUrl); setSearchEngine('custom'); localStorage.setItem('search-engine-pref', 'custom'); setIsCustomModalOpen(false); }} className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-500 mt-3 transition-colors">保存并使用</button>
          </div>
        </div>
      )}

      {/* 背景设置弹窗 */}
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
              <button onClick={() => setBgConfig({ ...bgConfig, type: 'default' })} className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all ${bgConfig.type === 'default' ? 'bg-white/10 border-white/50' : 'bg-transparent border-white/10 hover:bg-white/5'}`}>
                <div className="w-8 h-8 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400"><Monitor size={16}/></div>
                <div className="text-left flex-1"><div className="text-sm font-medium text-white">默认背景</div></div>
                {bgConfig.type === 'default' && <Check size={16} className="text-green-400"/>}
              </button>
              <button onClick={() => setBgConfig({ ...bgConfig, type: 'bing' })} className={`w-full p-3 rounded-xl border flex items-center gap-3 transition-all ${bgConfig.type === 'bing' ? 'bg-white/10 border-white/50' : 'bg-transparent border-white/10 hover:bg-white/5'}`}>
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400"><Globe size={16}/></div>
                <div className="text-left flex-1"><div className="text-sm font-medium text-white">Bing 每日一图</div></div>
                {bgConfig.type === 'bing' && <Check size={16} className="text-green-400"/>}
              </button>
              <div className={`rounded-xl border transition-all overflow-hidden ${bgConfig.type === 'api' ? 'bg-white/10 border-white/50' : 'bg-transparent border-white/10'}`}>
                <button onClick={() => setBgConfig({ ...bgConfig, type: 'api' })} className="w-full p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400"><RefreshCw size={16}/></div>
                  <div className="text-left flex-1"><div className="text-sm font-medium text-white">自定义图片 API</div></div>
                  {bgConfig.type === 'api' && <Check size={16} className="text-green-400"/>}
                </button>
                {bgConfig.type === 'api' && <div className="px-3 pb-3"><input type="text" value={bgConfig.customApi} onChange={(e) => setBgConfig({ ...bgConfig, customApi: e.target.value })} placeholder="输入图片 API 地址..." className="w-full bg-black/20 border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-white/30" /></div>}
              </div>
              <div className={`rounded-xl border transition-all overflow-hidden ${bgConfig.type === 'upload' ? 'bg-white/10 border-white/50' : 'bg-transparent border-white/10'}`}>
                <button onClick={() => setBgConfig({ ...bgConfig, type: 'upload' })} className="w-full p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400"><Upload size={16}/></div>
                  <div className="text-left flex-1"><div className="text-sm font-medium text-white">本地上传</div></div>
                  {bgConfig.type === 'upload' && <Check size={16} className="text-green-400"/>}
                </button>
                {bgConfig.type === 'upload' && (
                  <div className="px-3 pb-3">
                    <label className="flex flex-col items-center justify-center w-full h-24 border border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition-colors">
                      <div className="flex flex-col items-center justify-center pt-5 pb-6">
                        <p className="text-xs text-white/50">点击选择图片 (Max 4MB)</p>
                      </div>
                      <input type="file" accept="image/*" className="hidden" 
                        onChange={(e) => {
                           const file = e.target.files[0];
                           if (!file) return;
                           const reader = new FileReader();
                           reader.onloadend = () => setBgConfig(prev => ({ ...prev, type: 'upload', uploadData: reader.result }));
                           reader.readAsDataURL(file);
                        }} 
                      />
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
        
        /* 抖动动画 */
        @keyframes shake {
          0% { transform: rotate(0deg); }
          25% { transform: rotate(1.5deg); }
          50% { transform: rotate(0deg); }
          75% { transform: rotate(-1.5deg); }
          100% { transform: rotate(0deg); }
        }
        .animate-shake {
          animation: shake 0.25s infinite ease-in-out;
        }

        @keyframes fade-in-down {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-down { animation: fade-in-down 0.2s ease-out forwards; }
        @keyframes fade-in-fast {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fade-in-fast { animation: fade-in-fast 0.1s ease-out forwards; }
        @keyframes bounce-in {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-bounce-in { animation: bounce-in 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
      `}</style>
    </div>
  );
}