import React, { useState, useEffect, useRef } from 'react';
import { Plus, X, Search, Trash2, ChevronDown, Check, Settings, Globe, Image as ImageIcon, Upload, Monitor, RefreshCw } from 'lucide-react';

// 独立的图标组件
const SmartIcon = ({ url, title }) => {
  const [src, setSrc] = useState('');
  const [useLocal, setUseLocal] = useState(false);

  useEffect(() => {
    try {
      const domain = new URL(url).hostname;
      setSrc(`https://www.google.com/s2/favicons?sz=128&domain=${domain}`);
      setUseLocal(false);
    } catch (e) {
      setSrc('fallback');
    }
  }, [url]);

  const handleError = () => {
    if (!useLocal) {
      try {
        const urlObj = new URL(url);
        setSrc(`${urlObj.origin}/favicon.ico`);
        setUseLocal(true);
      } catch (e) {}
    } else {
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
    <img src={src} alt={title} className="w-6 h-6 object-contain" onError={handleError} />
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

  // 背景配置状态
  const [bgConfig, setBgConfig] = useState({
    type: 'default', // default, bing, api, upload
    customApi: 'https://t.alcy.cc/ycy',
    uploadData: '' // Base64 string
  });

  // 搜索引擎配置 - 彻底汉化 placeholder
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

    // 3. 禁止浏览器自动翻译 (增强版)
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
    return () => clearInterval(timer);
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

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    let engineUrl = engines[searchEngine].url;
    if (!engineUrl) engineUrl = engines['baidu'].url; 
    window.location.href = `${engineUrl}${encodeURIComponent(searchQuery)}`;
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

        {/* 搜索框区域 */}
         <form onSubmit={handleSearch} className="w-full max-w-md relative flex items-center z-30 transition-all duration-500 group">
          
          {/*给外层包裹容器加上 rounded-full，防止方形轮廓显形 */}
          <div className="absolute left-1.5 top-1.5 bottom-1.5 z-50 flex items-center rounded-full">
            <button
              type="button"
              onClick={() => setIsEngineMenuOpen(!isEngineMenuOpen)}
              //移除 backdrop-blur-md (减少渲染层叠伪影)，保留圆角和颜色
              //保留之前的 focus:outline-none 
              className="h-full flex items-center gap-1.5 px-3.5 text-xs font-medium text-white/90 bg-white/10 hover:bg-white/20 hover:text-white rounded-full transition-all border border-white/10 shadow-sm active:scale-95 focus:outline-none focus:ring-0"
            >
              <span className="truncate max-w-[4rem] text-center">{engines[searchEngine].name}</span>
              <ChevronDown size={12} className={`opacity-60 transition-transform duration-200 ${isEngineMenuOpen ? 'rotate-180' : ''}`}/>
            </button>

            {isEngineMenuOpen && (
              // 下拉菜单
              <div className="absolute top-full left-0 mt-3 w-32 py-1 bg-black/60 backdrop-blur-2xl border border-white/20 rounded-xl shadow-2xl overflow-hidden animate-fade-in-down origin-top-left flex flex-col z-50">
                {Object.entries(engines).map(([key, engine]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleEngineChange(key)}
                    className="w-full px-4 py-2.5 text-left text-xs text-white/80 hover:bg-white/15 hover:text-white flex items-center justify-between transition-colors focus:outline-none"
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
                    className="w-full px-4 py-2 text-left text-[10px] text-white/40 hover:bg-white/10 hover:text-white/60 border-t border-white/10 flex items-center gap-1 focus:outline-none"
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
            onFocus={() => setShowDashboard(true)}
            onClick={() => setShowDashboard(true)}
            placeholder={engines[searchEngine].placeholder}
            className="w-full py-3.5 pl-32 pr-12 bg-black/20 border border-white/10 backdrop-blur-md rounded-full text-white placeholder-white/30 shadow-lg focus:outline-none focus:bg-black/40 focus:border-white/30 focus:shadow-2xl transition-all duration-300 text-sm"
            style={{ textAlign: 'center' }} 
          />
          
          <button 
            type="submit"
            className="absolute right-3.5 p-1.5 text-white/40 hover:text-white transition-colors bg-white/5 rounded-full hover:bg-white/10 focus:outline-none"
          >
            <Search size={16} />
          </button>
        </form>

        {/* 仪表盘区域 (包含设置按钮和捷径) */}
        <div className={`w-full max-w-2xl mt-8 transition-all duration-500 ease-spring transform origin-top relative ${showDashboard ? 'opacity-100 scale-100 translate-y-0 pointer-events-auto' : 'opacity-0 scale-90 -translate-y-8 pointer-events-none h-0'}`}>
          
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