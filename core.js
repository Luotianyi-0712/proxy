(function(){
      try{
        var saved=localStorage.getItem('theme')||'system';
        var systemDark=window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches;
        var dark=saved==='dark'||(saved==='system'&&systemDark);
        if(dark)document.documentElement.classList.add('dark');
      }catch(e){}
      
  const getConfig = () => {
    try {
      return {
        host: document.querySelector('meta[name="proxy-host"]')?.content || window.location.host,
        origin: document.querySelector('meta[name="proxy-origin"]')?.content || window.location.origin,
        now: new Date().toISOString()
      };
    } catch(e) {
      return {host: 'proxy.qxq.news', origin: 'https://proxy.qxq.news', now: new Date().toISOString()};
    }
  };
  
  const config = getConfig();

  function Section({ title, children }) {
    return React.createElement('section', { 
      className: 'rounded-xl border border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-800/50 p-5 shadow-sm' 
    },
      React.createElement('h2', { className: 'text-lg font-semibold mb-3 text-sky-600 dark:text-sky-400' }, title),
      children
    );
  }

  function ThemeToggle(){
    const [mode, setMode] = React.useState(localStorage.getItem('theme') || 'system');
    
    React.useEffect(() => {
      const mql = window.matchMedia('(prefers-color-scheme: dark)');
      const apply = () => {
        const root = document.documentElement;
        const dark = mode === 'dark' || (mode === 'system' && mql.matches);
        root.classList.toggle('dark', dark);
      };
      apply();
      const listener = () => { if(localStorage.getItem('theme')==='system') apply(); };
      mql.addEventListener('change', listener);
      return () => mql.removeEventListener('change', listener);
    }, [mode]);
    
    const setTheme = (m) => { 
      try { localStorage.setItem('theme', m); } catch(e) {}
      setMode(m); 
    };
    
    const btn = (m, label) => React.createElement('button', {
      onClick: () => setTheme(m),
      className: 'px-3 py-1.5 text-xs rounded border transition ' +
                 (mode === m ? 'bg-sky-500 text-white border-sky-500' : 'bg-slate-100 border-slate-300 hover:bg-slate-200 dark:bg-slate-700 dark:border-slate-600')
    }, label);
    
    return React.createElement('div', {className: 'flex gap-2'},
      btn('system', '系统'), btn('light', '浅色'), btn('dark', '深色')
    );
  }

  function showToast(msg, ok) {
    let root = document.getElementById('toast-root');
    if (!root) { 
      root = document.createElement('div'); 
      root.id = 'toast-root'; 
      root.className = 'fixed bottom-4 right-4 z-50 flex flex-col gap-2'; 
      document.body.appendChild(root); 
    }
    const item = document.createElement('div');
    item.className = (ok ? 'bg-emerald-500' : 'bg-rose-500') + ' text-white text-sm px-4 py-2 rounded-lg shadow-lg';
    item.textContent = msg;
    root.appendChild(item);
    setTimeout(() => { item.style.opacity = '0'; item.style.transition = 'opacity 0.3s'; }, 1800);
    setTimeout(() => item.remove(), 2100);
  }

  function copyToClipboard(text, msg) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast(msg||'复制成功', true)).catch(() => showToast('复制失败', false));
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showToast(msg||'复制成功', true);
      } catch (e) {
        showToast('复制失败', false);
      }
      document.body.removeChild(textarea);
    }
  }

  function GenRow({ label, value }) {
    return React.createElement('div', { className: 'flex items-center gap-2 py-2 border-b border-slate-100 dark:border-slate-700 last:border-0' },
      React.createElement('div', { className: 'min-w-24 text-sm text-slate-600 dark:text-slate-400' }, label),
      React.createElement('code', { className: 'flex-1 font-mono text-xs text-sky-600 dark:text-sky-400 break-all' }, value),
      React.createElement('div', { className: 'flex gap-1' },
        React.createElement('button', { className: 'px-2 py-1 text-xs rounded border bg-slate-100 border-slate-300 hover:bg-slate-200 dark:bg-slate-700 dark:border-slate-600', onClick: () => copyToClipboard(value) }, '复制'),
        React.createElement('button', { className: 'px-2 py-1 text-xs rounded border bg-slate-100 border-slate-300 hover:bg-slate-200 dark:bg-slate-700 dark:border-slate-600', onClick: () => copyToClipboard(`curl -v "${value}"`, '已复制 curl') }, 'curl')
      )
    );
  }

  function b64url(s) {
    try {
      return btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    } catch (e) { return ''; }
  }

  function isIpv4(str) {
    const parts = (str || '').split('.');
    if (parts.length !== 4) return false;
    return parts.every(p => {
      const n = parseInt(p, 10);
      return n >= 0 && n <= 255 && p === n.toString();
    });
  }

  function genProxyUrls(src, originBase) {
    const out = [];
    if (!src) return out;
    let u;
    try { u = new URL(src); } catch (e) {
      try { u = new URL('http://' + src); } catch (e2) { return out; }
    }
    const proto = u.protocol.replace(':', '').toLowerCase();
    const host = u.hostname;
    const port = u.port ? parseInt(u.port, 10) : 0;
    const path = u.pathname + u.search;
    const hostB64 = b64url(host);
    const isIp = isIpv4(host);
    const join = (p) => originBase + p;

    if (proto === 'http') {
      if (port && port !== 80) {
        out.push(['HTTP 免冒号', join(`/httpproxyport/${host}/${port}${path}`)]);
        out.push(['HTTP b64', join(`/httpproxyb64/${hostB64}/${port}${path}`)]);
      } else {
        out.push(['HTTP 普通', join(`/httpproxy/${host}${path}`)]);
        if (isIp) out.push(['HTTP b64', join(`/httpproxyb64/${hostB64}/80${path}`)]);
      }
    } else if (proto === 'https') {
      if (port && port !== 443) {
        out.push(['HTTPS 免冒号', join(`/proxyport/${host}/${port}${path}`)]);
        out.push(['HTTPS b64', join(`/proxyb64/${hostB64}/${port}${path}`)]);
      } else {
        out.push(['HTTPS 普通', join(`/proxy/${host}${path}`)]);
      }
    } else if (proto === 'ws') {
      const wsOrigin = originBase.replace(/^https?:/, 'ws:');
      if (port && port !== 80) {
        out.push(['WS 免冒号', wsOrigin + `/wsport/${host}/${port}${path}`]);
        out.push(['WS b64', wsOrigin + `/wsb64/${hostB64}/${port}${path}`]);
      } else {
        out.push(['WS 普通', wsOrigin + `/ws/${host}${path}`]);
      }
    } else if (proto === 'wss') {
      const wssOrigin = originBase.replace(/^https?:/, 'wss:');
      if (port && port !== 443) {
        out.push(['WSS 免冒号', wssOrigin + `/wssport/${host}/${port}${path}`]);
        out.push(['WSS b64', wssOrigin + `/wssb64/${hostB64}/${port}${path}`]);
      } else {
        out.push(['WSS 普通', wssOrigin + `/wss/${host}${path}`]);
      }
    }
    return out;
  }

  function Code({ lines }) {
    return React.createElement('pre', { className: 'overflow-auto rounded-lg bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-700 p-4 text-xs' },
      React.createElement('code', null, (lines || []).join('\n'))
    );
  }

  function App() {
    const [src, setSrc] = React.useState('http://api.lty.bio/v1');
    const outputs = genProxyUrls(src, config.origin);

    const examples = [
      ['HTTPS 代理', `${config.origin}/proxy/example.com/`],
      ['HTTP 代理', `${config.origin}/httpproxy/httpbin.org/get`],
      ['通用协议', `${config.origin}/https/httpbin.org/get`],
      ['WebSocket', `wss://${config.host}/wss/echo.websocket.events`],
      ['HTTP 端口(IP)', `${config.origin}/httpproxyport/1.1.1.1/114514/`],
      ['HTTP B64', `${config.origin}/httpproxyb64/MS4xLjEuMQ==/114514/`]
    ];

    return React.createElement('div', { className: 'max-w-7xl mx-auto p-6' },
      React.createElement('div', { className: 'flex flex-col gap-3' },
        React.createElement('div', { className: 'flex items-center gap-3' },
          React.createElement('div', { className: 'icon-cloud' }),
          React.createElement('h1', { className: 'text-3xl font-bold bg-gradient-to-r from-sky-600 to-cyan-500 bg-clip-text text-transparent' }, 'Cloudflare Workers Proxy')
        ),
        React.createElement('div', { className: 'flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400' },
          React.createElement('span', null, '当前域名：'),
          React.createElement('b', { className: 'text-slate-900 dark:text-white' }, config.host),
          React.createElement('div', { className: 'ml-auto flex items-center gap-2' },
            React.createElement('span', null, '主题：'),
            React.createElement(ThemeToggle)
          )
        )
      ),

      React.createElement('div', { className: 'grid md:grid-cols-2 gap-4 mt-6' },
        React.createElement(Section, { title: 'URL 生成器' },
          React.createElement('div', { className: 'space-y-3' },
            React.createElement('input', {
              className: 'w-full px-3 py-2 rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 outline-none focus:border-sky-400',
              placeholder: '输入 http/https/ws/wss 地址',
              value: src,
              onChange: (e) => setSrc(e.target.value)
            }),
            React.createElement('div', { className: 'space-y-1' },
              outputs.length ? outputs.map(([k, v], i) => React.createElement(GenRow, { key: i, label: k, value: v })) 
                : React.createElement('div', { className: 'text-slate-400 text-sm' }, '请输入有效的 URL')
            )
          )
        ),
        
        React.createElement(Section, { title: '快速示例' },
          React.createElement('ul', { className: 'space-y-2' },
            examples.map(([k, v], i) => 
              React.createElement('li', { key: i, className: 'flex gap-2 text-sm' },
                React.createElement('span', { className: 'text-slate-600 dark:text-slate-400 min-w-24' }, k),
                React.createElement('code', { className: 'flex-1 font-mono text-xs text-sky-600 dark:text-sky-400 break-all' }, v)
              )
            )
          )
        ),

        React.createElement(Section, { title: 'API 示例' },
          React.createElement('div', { className: 'space-y-3' },
            React.createElement('div', null,
              React.createElement('div', { className: 'mb-2 text-sm text-slate-600 dark:text-slate-400' }, 'OpenAI'),
              React.createElement(Code, { lines: [
                'curl -H "Authorization: Bearer <TOKEN>"',
                `${config.origin}/openai/v1/models`
              ]})
            ),
            React.createElement('div', null,
              React.createElement('div', { className: 'mb-2 text-sm text-slate-600 dark:text-slate-400' }, 'Gemini'),
              React.createElement(Code, { lines: [
                `curl "${config.origin}/gemini/v1/models?key=<API_KEY>"`
              ]})
            )
          )
        ),

        React.createElement(Section, { title: 'Rewrite 规则' },
          React.createElement(Code, { lines: [
            '/proxy/:host/:url* → https://:host/:url*',
            '/proxyport/:host/:port/:url* → https://:host::port/:url*',
            '/proxyb64/:base64_host/:port/:url* → https://[decoded]::port/:url*',
            '/httpproxy/:host/:url* → http://:host/:url*',
            '/httpproxyport/:host/:port/:url* → http://:host::port/:url*',
            '/httpproxyb64/:base64_host/:port/:url* → http://[decoded]::port/:url*',
            '/wss/:host/:url* → wss://:host/:url*',
            '/ws/:host/:url* → ws://:host/:url*',
            '/wsport/:host/:port/:url* → ws://:host::port/:url*',
            '/wssport/:host/:port/:url* → wss://:host::port/:url*',
            '/github/* → https://github.com/*',
            '/openai/* → https://api.openai.com/*',
            '/gemini/v1/* → https://generativelanguage.googleapis.com/v1/*',
            '/:protocol/:host/:url* → :protocol://:host/:url*'
          ]})
        ),

        React.createElement(Section, { title: '特性' },
          React.createElement('ul', { className: 'space-y-2 text-sm' },
            ['WebSocket 全双工转发', 'HTML 链接改写', 'CORS 支持', '3xx 重定向改写', 'KV 缓存支持', '自定义域名'].map((item, i) =>
              React.createElement('li', { key: i, className: 'flex items-center gap-2' },
                React.createElement('span', { className: 'text-emerald-500' }, '✓'),
                React.createElement('span', null, item)
              )
            )
          )
        ),

        React.createElement(Section, { title: '调试端点' },
          React.createElement(Code, { lines: [
            `curl "${config.origin}/debug"`,
            `curl "${config.origin}/debug?path=/httpproxyport/1.1.1.1/114514/v1"`,
            `curl "${config.origin}/_worker/info"`,
            `curl "${config.origin}/health"`
          ]})
        )
      ),

      React.createElement('footer', { className: 'mt-8 text-xs text-center text-slate-400' },
        `部署于 Cloudflare Workers · React 18 + Tailwind CSS · ${config.now}`
      )
    );
  }

  const el = document.getElementById('app');
  if (window.React && window.ReactDOM) {
    if (ReactDOM.createRoot) {
      ReactDOM.createRoot(el).render(React.createElement(App));
    } else {
      ReactDOM.render(React.createElement(App), el);
    }
  } else {
    el.innerHTML = '<div style="color:red;padding:2rem;text-align:center">React 加载失败</div>';
  }
})();
