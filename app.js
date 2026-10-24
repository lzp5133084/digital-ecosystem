/* Digital ecosystem: a private, browser-local application atlas. */
(() => {
  'use strict';
  const D=window.ECO_DATA;
  if(!D)return;
  const $=id=>document.getElementById(id);
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const paths={
    shield:'<path d="M12 3 4.5 6v5.5c0 4 3.1 7.3 7.5 9.5 4.4-2.2 7.5-5.5 7.5-9.5V6L12 3Z"/><path d="m8.5 12 2.4 2.4 4.8-5"/>',
    spark:'<path d="m12 2 2.6 7.4L22 12l-7.4 2.6L12 22l-2.6-7.4L2 12l7.4-2.6L12 2Z"/>',
    folder:'<path d="M3 6a2 2 0 0 1 2-2h5l2 3h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z"/><path d="M3 10h18"/>',
    clock:'<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
    lock:'<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
    cursor:'<path d="m4 3 16 10-7 1-3 7L4 3Z"/>',
    play:'<rect x="2" y="4" width="20" height="16" rx="4"/><path d="m10 8 6 4-6 4V8Z"/>',
    image:'<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="2"/><path d="m3 17 5-5 4 4 3-3 6 6"/>',
    globe:'<circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18M5 7h14M5 17h14"/>',
    book:'<path d="M3 4h6a3 3 0 0 1 3 3v14a4 4 0 0 0-4-3H3V4ZM21 4h-6a3 3 0 0 0-3 3v14a4 4 0 0 1 4-3h5V4Z"/>',
    settings:'<path d="m12 2 2 3 3-.3.3 3 3 2-2 2 .3 3-3 .3-2 3-2-2-3 .3-.3-3-3-2 2-2L7 6.3l3-.3 2-4Z"/><circle cx="12" cy="11" r="3"/>',
    heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
    search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
    'arrow-right':'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    'arrow-up-right':'<path d="M6 18 18 6M6 6h12v12"/>',
    'arrow-up':'<path d="M12 20V4m-6 6 6-6 6 6"/>',
    close:'<path d="m6 6 12 12M18 6 6 18"/>',
    plus:'<path d="M12 4v16M4 12h16"/>',
    grid:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
    monitor:'<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>',
    phone:'<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/>',
    code:'<path d="m8 6-6 6 6 6m8-12 6 6-6 6m-3-16-2 20"/>',
    expand:'<path d="M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5"/>',
    copy:'<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V3H3v13h5"/>',
    share:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.6 6.8-4M8.6 13.4l6.8 4"/>'
  };
  const icon=(name,extra='')=>`<svg class="icon ${extra}" viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.grid}</svg>`;
  function hydrateIcons(root=document){root.querySelectorAll('[data-icon]').forEach(el=>{el.innerHTML=icon(el.dataset.icon);});}
  const categories=Object.fromEntries(D.categories.map(c=>[c.id,c]));
  const groups=Object.fromEntries(D.groups.map(g=>[g.id,g]));
  const priority=['claim','knowledge','aiwork','ren','neon','credit','lead','vault','avatar','qr','community','liveboard','notes','router','autoclick','family','imagegen','copy'];
  let saved=[];
  try{const parsed=JSON.parse(localStorage.getItem('junge-ecosystem-favorites')||'[]');if(Array.isArray(parsed))saved=parsed.filter(id=>groups[id]);}catch{}
  let savedView={};
  try{savedView=JSON.parse(localStorage.getItem('junge-ecosystem-view')||'{}')||{};}catch{}
  const state={category:categories[savedView.category]?savedView.category:'all',query:'',favorites:false,scene:null,sort:['curated','updated','name'].includes(savedView.sort)?savedView.sort:'curated',limit:18,saved:new Set(saved),detail:null,detailTab:'overview'};
  let toastTimer;
  function toast(message){$('toast').textContent=message;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2400);}
  const platformIcon=p=>p==='安卓'?'phone':p==='网页'?'globe':p==='Windows成品'?'monitor':'code';
  const shortPlatform=p=>p==='源码/桌面脚本'?'源码':p==='Windows成品'?'电脑':p;
  function saveFavorites(){try{localStorage.setItem('junge-ecosystem-favorites',JSON.stringify([...state.saved]));}catch{toast('当前浏览器未允许保存，收藏仅在本次页面中保留。');}}
  function saveView(){try{localStorage.setItem('junge-ecosystem-view',JSON.stringify({category:state.category,sort:state.sort}));}catch{}}
  function updateFavoriteCount(){$('favoriteCount').textContent=state.saved.size;}
  function favoriteButton(g){const yes=state.saved.has(g.id);return `<button class="favorite-button ${yes?'saved':''}" data-save="${g.id}" aria-label="${yes?'取消收藏':'收藏'}${esc(g.name)}" aria-pressed="${yes}">${icon('heart')}</button>`;}
  function toggleFavorite(id){if(!groups[id])return;const yes=state.saved.has(id);if(yes)state.saved.delete(id);else state.saved.add(id);saveFavorites();updateFavoriteCount();renderLibrary();if(state.detail===id)renderDetail();toast(yes?'已从收藏中移除':'已加入我的收藏');}
  function renderCategories(){
    $('categoryNav').innerHTML=`<button class="category-item ${state.category==='all'?'active':''}" data-category="all" aria-pressed="${state.category==='all'}">${icon('grid')}<span>全部应用</span><span>92</span></button>`+D.categories.map(c=>`<button class="category-item ${state.category===c.id?'active':''}" data-category="${c.id}" aria-pressed="${state.category===c.id}">${icon(c.icon)}<span>${esc(c.short)}</span><span>${c.count}</span></button>`).join('');
  }
  function card(g){const c=categories[g.category];const ps=g.platforms.slice(0,2);const version=g.version||('更新 '+(g.updated||'').slice(5).replace('-','.'));return `<article class="app-card" data-app="${g.id}"><button class="card-image-button" data-detail="${g.id}" aria-label="查看${esc(g.name)}详情"><img src="${esc(g.cover)}" loading="lazy" width="900" height="560" alt="${esc(g.name)}${g.coverKind==='界面预览'?'界面预览':'概念封面'}"><span class="cover-caption">${esc(g.coverKind)}</span><span class="image-overlay">${icon('expand')}查看应用</span></button>${favoriteButton(g)}<div class="card-body"><div class="card-meta"><span class="category-label">${esc(c.short)}</span><span class="version-pill">${esc(version)}</span></div><button class="card-title" data-detail="${g.id}">${esc(g.name)}</button><p class="card-description">${esc(g.description)}</p><div class="card-bottom"><span class="platform-list">${ps.map(p=>icon(platformIcon(p))).join('')}<span>${ps.map(shortPlatform).join(' / ')}</span></span><button data-detail="${g.id}">${g.count} 个入口${icon('arrow-up-right')}</button></div></div></article>`;}
  function filterGroups(){
    let list=D.groups.filter(g=>(state.category==='all'||g.category===state.category)&&(!state.favorites||state.saved.has(g.id))&&(!state.scene||state.scene.includes(g.id)));
    const q=state.query.trim().toLocaleLowerCase();
    if(q)list=list.filter(g=>[g.name,g.description,categories[g.category].name,g.version,...g.platforms,...g.versions.map(v=>v.name+' '+v.version+' '+v.filename_version)].join(' ').toLocaleLowerCase().includes(q));
    list.sort((a,b)=>state.sort==='updated'?b.updated.localeCompare(a.updated)||a.name.localeCompare(b.name,'zh'):state.sort==='name'?a.name.localeCompare(b.name,'zh'):((priority.indexOf(a.id)<0?999:priority.indexOf(a.id))-(priority.indexOf(b.id)<0?999:priority.indexOf(b.id)))||D.groups.indexOf(a)-D.groups.indexOf(b));
    return list;
  }
  function renderLibrary(){
    const list=filterGroups();$('appGrid').innerHTML=list.slice(0,state.limit).map(card).join('');
    const label=state.favorites?'我的收藏':state.scene?'场景组合':state.category==='all'?'全部应用':categories[state.category].name;
    $('resultLabel').innerHTML=`${esc(label)} <span> / </span> <b>${list.length}</b> 个功能组${state.query?' · 搜索“'+esc(state.query)+'”':''}`;
    $('loadedCount').textContent=list.length?`已展示 ${Math.min(state.limit,list.length)} / ${list.length} 个功能组`:'';
    $('loadMore').hidden=state.limit>=list.length;$('emptyState').hidden=list.length>0;
    $('clearFilters').hidden=!(state.category!=='all'||state.query||state.favorites||state.scene);
    $('favoritesFilter').setAttribute('aria-pressed',String(state.favorites));
    renderCategories();updateFavoriteCount();
  }
  function resetFilters(scroll=false){state.category='all';state.query='';state.favorites=false;state.scene=null;state.limit=18;$('searchInput').value='';saveView();renderLibrary();if(scroll)$('library').scrollIntoView({behavior:'smooth'});}
  function chooseCategory(id){if(id!=='all'&&!categories[id])return;state.category=id;state.scene=null;state.limit=18;saveView();renderLibrary();$('library').scrollIntoView({behavior:'smooth'});}
  function renderFeatured(){
    const keys=['claim','aiwork','ren','neon'];
    $('featuredGrid').innerHTML=keys.map(id=>{const g=groups[id],c=categories[g.category];return `<button class="feature-card" data-detail="${g.id}"><div class="feature-image"><img src="${esc(g.cover)}" alt="${esc(g.name)}${esc(g.coverKind)}" loading="lazy" width="900" height="560"><span class="cover-caption">${esc(g.coverKind)}</span></div><div class="feature-info"><small>${esc(c.short)}</small><h3>${esc(g.name)}</h3><p>${esc(g.description)}</p></div></button>`;}).join('');
  }
  function renderMap(){
    const nodes=D.categories.map((c,i)=>{const a=(-90+i*360/D.categories.length)*Math.PI/180;return {...c,x:600+440*Math.cos(a),y:225+157*Math.sin(a)};});
    const lines=nodes.map(n=>`<path d="M600 225 Q${(600+n.x)/2} ${225+(n.y-225)*.18} ${n.x} ${n.y}" fill="none" stroke="#cddcbd" stroke-width="1" stroke-dasharray="4 7"/>`).join('');
    const labels=nodes.map(n=>`<g class="map-node" transform="translate(${n.x.toFixed(2)} ${n.y.toFixed(2)})" data-map-category="${n.id}" tabindex="0" role="link" aria-label="浏览${esc(n.name)}的${n.count}个功能组"><rect x="-84" y="-31" width="168" height="62" rx="12" fill="#fcfdf9" stroke="#dce5d2"/><rect x="-69" y="-14" width="29" height="29" rx="8" fill="${n.bg}"/><g transform="translate(-64 -9) scale(.8)" fill="none" stroke="${n.color}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">${paths[n.icon]}</g><text x="-28" y="-1" fill="#668157" font-size="12" font-family="Microsoft YaHei,sans-serif">${esc(n.short)}</text><text x="-28" y="17" fill="#a3b393" font-size="9" font-family="Microsoft YaHei,sans-serif">${n.count} 个功能组</text></g>`).join('');
    $('ecosystemMap').innerHTML=`<svg viewBox="0 0 1200 450" role="img" aria-labelledby="mapTitle"><title id="mapTitle">数字生态用途关系图。11个领域节点均可点击查看对应应用。</title><ellipse cx="600" cy="225" rx="440" ry="157" fill="none" stroke="#e0e8d6"/><ellipse cx="600" cy="225" rx="295" ry="112" fill="none" stroke="#e6eddd" stroke-dasharray="3 8"/>${lines}<circle cx="600" cy="225" r="69" fill="#e1ebd4"/><circle cx="600" cy="225" r="57" fill="#315738"/><path d="M600 215v-22m0 12c-18 0-18-18-18-18s19-2 18 18m0-10c0-17 18-15 18-15s2 16-18 15" fill="none" stroke="#ccdfa9" stroke-width="2" stroke-linecap="round"/><text x="600" y="238" text-anchor="middle" font-size="16" font-family="Microsoft YaHei,sans-serif" fill="#e1edcd">数字生态</text><text x="600" y="257" text-anchor="middle" font-size="8" font-family="Arial,sans-serif" fill="#a8c28d" letter-spacing="2">92 CONNECTED GROUPS</text>${labels}</svg>`;
  }
  function renderScenes(){
    $('scenesGrid').innerHTML=D.scenes.map((s,i)=>`<button class="scene-card" data-scene="${s.id}"><div class="scene-top"><span>${esc(s.tag)}</span><span>0${i+1}</span></div><h3>${esc(s.name)}</h3><p>${esc(s.text)}</p><div class="scene-flow">${s.groups.map((id,j)=>`<span title="${esc(groups[id].name)}">${icon(categories[groups[id].category].icon)}</span>${j<s.groups.length-1?icon('arrow-right'):''}`).join('')}</div><div class="scene-link">查看这组工具${icon('arrow-up-right')}</div></button>`).join('');
  }
  const dialog=$('detailDialog');
  function appLink(id){const u=new URL(location.href);u.searchParams.set('app',id);u.hash='';return u.toString();}
  function syncUrl(id){try{const u=new URL(location.href);if(id)u.searchParams.set('app',id);else u.searchParams.delete('app');history.replaceState(null,'',u);}catch{}}
  function openDetail(id){if(!groups[id])return;state.detail=id;state.detailTab='overview';syncUrl(id);renderDetail();if(!dialog.open)dialog.showModal();document.body.style.overflow='hidden';}
  function closeDetail(){dialog.close();document.body.style.overflow='';state.detail=null;syncUrl(null);}
  function pathRow(path){return `<div class="path-wrap"><span class="local-path">${esc(path)}</span><button class="copy-path" data-copy="${esc(path)}">复制本机路径</button></div>`;}
  function branchMarkup(b){return `<section class="branch-card"><div class="branch-card-top"><span class="platform-pill">${icon(platformIcon(b.platform))}${esc(b.platform)}</span><time>${esc((b.modified||'时间待核实').replace('T',' ').slice(0,16))}</time></div><h3>${esc(b.name)}</h3><div class="status-note">同类同形态时间最新候选</div>${b.version?`<p class="branch-version">最高可辨标注：${esc(b.version)}${b.version_name!==b.name?' · '+esc(b.version_name):''}<br><small>${esc(b.version_note)}</small></p>`:''}${b.conflict?`<p class="conflict-note">${esc(b.conflict)}</p>`:''}<p class="status-note">${esc(b.status)}</p>${b.note?`<p class="status-note">${esc(b.note)}</p>`:''}${pathRow(b.path)}${b.highest_path&&b.highest_path!==b.path?`<details class="status-note"><summary>最高版本对应路径</summary>${pathRow(b.highest_path)}</details>`:''}</section>`;}
  function versionsMarkup(g){return `<div class="detail-note">保留 ${g.count} 条应用入口。相同功能的工具可能来自不同项目；相同内容副本会在说明中列出。</div><div class="version-list">${g.versions.map(v=>`<article class="version-row"><div class="tags"><span>${esc(v.platform)}</span>${v.latest?'<span>时间最新候选</span>':''}${v.version_label?'<span>'+esc(v.version_label)+'</span>':''}</div><h4>${esc(v.name)}</h4><p>${v.filename_version?'文件标注 '+esc(v.filename_version)+'　':''}${v.version?'版本 '+esc(v.version)+'　':''}${esc((v.modified||'').slice(0,10))}</p><p>${esc(v.status)}</p>${v.notes?'<p>'+esc(v.notes)+'</p>':''}${pathRow(v.path)}${v.duplicate_paths.length?`<details class="status-note"><summary>另有 ${v.duplicate_paths.length} 个相同文本副本</summary>${v.duplicate_paths.map(pathRow).join('')}</details>`:''}</article>`).join('')}</div>`;}
  function renderDetail(){
    const g=groups[state.detail];if(!g)return;const c=categories[g.category];
    $('detailContent').innerHTML=`<div class="detail-header"><div class="detail-visual"><img src="${esc(g.cover)}" alt="${esc(g.name)}${esc(g.coverKind)}"><button class="enlarge-button" data-enlarge="${g.id}">${icon('expand')}查看大图</button></div><div class="detail-intro"><p class="eyebrow">${esc(c.name)} / ${esc(g.coverKind)}</p><h2 id="detailTitle">${esc(g.name)}</h2><p>${esc(g.description)}</p><div class="detail-actions"><button class="detail-favorite" data-save="${g.id}" aria-pressed="${state.saved.has(g.id)}">${icon('heart')}${state.saved.has(g.id)?'已收藏 · 点击移除':'加入我的收藏'}</button><button class="detail-share" data-share-app="${g.id}">${icon('share')}分享</button></div></div></div><div class="detail-tabs"><button data-detail-tab="overview" class="${state.detailTab==='overview'?'active':''}">应用与最新版本</button><button data-detail-tab="versions" class="${state.detailTab==='versions'?'active':''}">全部版本记录 (${g.count})</button></div><div class="detail-body">${state.detailTab==='overview'?`<div class="detail-note">这里展示应用档案与原界面图片。使用本机程序时，请复制原路径，在保存程序的电脑上打开。</div>${g.branches.map(branchMarkup).join('')}${!g.branches.length?'<p class="detail-note">主入口及版本仍待核实，可查看全部记录。</p>':''}`:versionsMarkup(g)}</div>`;
  }
  async function copyText(text){try{await navigator.clipboard.writeText(text);return true;}catch{const t=document.createElement('textarea');t.value=text;t.style.position='fixed';t.style.opacity='0';const parent=dialog.open?dialog:document.body;parent.append(t);t.focus();t.select();let ok=false;try{ok=document.execCommand('copy');}catch{}t.remove();return ok;}}
  async function copyPath(text){const ok=await copyText(text);toast(ok?'已复制本机路径':'复制未成功，请选中路径后手动复制。');}
  function siteLink(){const u=new URL(location.href);u.search='';u.hash='';return u.toString();}
  const canSystemShare=()=>typeof navigator.share==='function'&&matchMedia('(pointer:coarse)').matches;
  async function shareApp(id){const g=groups[id];if(!g)return;const url=appLink(id);if(canSystemShare()){try{await navigator.share({title:g.name+' · 数字生态',text:g.description,url});return;}catch(e){if(e.name==='AbortError')return;}}const ok=await copyText(url);toast(ok?'应用链接已复制，可直接分享':'复制失败，请手动复制地址栏链接。');}
  async function shareSite(){const url=siteLink();if(canSystemShare()){try{await navigator.share({title:'数字生态 · 军哥懂保',text:'11 大类、92 个功能组的个人应用图鉴',url});return;}catch(e){if(e.name==='AbortError')return;}}const ok=await copyText(url);toast(ok?'本站链接已复制，可以分享给朋友':'复制失败，请手动复制地址栏链接。');}
  function openImage(id){const g=groups[id];if(!g)return;$('largePreview').src=g.cover;$('largePreview').alt=g.name+g.coverKind;$('largeCaption').textContent=g.name+' · '+g.coverKind;$('imageDialog').showModal();}
  document.addEventListener('click',event=>{
    const el=event.target.closest('button,a,[data-map-category]');if(!el)return;
    if(el.dataset.detail){openDetail(el.dataset.detail);return;}
    if(el.dataset.save){toggleFavorite(el.dataset.save);return;}
    if(el.dataset.category){chooseCategory(el.dataset.category);return;}
    if(el.dataset.quickCategory){resetFilters();chooseCategory(el.dataset.quickCategory);return;}
    if(el.dataset.mapCategory){resetFilters();chooseCategory(el.dataset.mapCategory);return;}
    if(el.dataset.scene){const scene=D.scenes.find(s=>s.id===el.dataset.scene);if(scene){resetFilters();state.scene=scene.groups;renderLibrary();$('library').scrollIntoView({behavior:'smooth'});}return;}
    if(el.dataset.detailTab){state.detailTab=el.dataset.detailTab;renderDetail();return;}
    if(el.dataset.shareApp){shareApp(el.dataset.shareApp);return;}
    if(el.dataset.copy){copyPath(el.dataset.copy);return;}
    if(el.dataset.enlarge){openImage(el.dataset.enlarge);return;}
    if(el.classList.contains('nav-link')){document.querySelectorAll('.nav-link').forEach(a=>a.classList.toggle('active',a===el));document.querySelector('nav').classList.remove('open');$('mobileMenu').setAttribute('aria-expanded','false');}
  });
  let searchTimer;
  $('searchInput').addEventListener('input',e=>{state.query=e.target.value;clearTimeout(searchTimer);searchTimer=setTimeout(()=>{state.limit=18;renderLibrary();},140);});
  $('sortSelect').addEventListener('change',e=>{state.sort=e.target.value;state.limit=18;saveView();renderLibrary();});
  $('favoritesFilter').addEventListener('click',()=>{state.favorites=!state.favorites;state.limit=18;renderLibrary();});
  $('favoritesNav').addEventListener('click',()=>{resetFilters();state.favorites=true;renderLibrary();$('library').scrollIntoView({behavior:'smooth'});});
  $('loadMore').addEventListener('click',()=>{state.limit+=18;renderLibrary();});
  $('clearFilters').addEventListener('click',()=>resetFilters());$('emptyReset').addEventListener('click',()=>resetFilters());
  $('mapAll').addEventListener('click',()=>resetFilters(true));
  $('closeDialog').addEventListener('click',closeDetail);
  $('shareButton').addEventListener('click',shareSite);
  dialog.addEventListener('close',()=>{document.body.style.overflow='';state.detail=null;syncUrl(null);});
  for(const dlg of [dialog,$('imageDialog')])dlg.addEventListener('click',e=>{if(e.target===dlg){const r=dlg.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dlg===dialog?closeDetail():dlg.close();}});
  $('closeImage').addEventListener('click',()=>$('imageDialog').close());
  $('mobileMenu').addEventListener('click',()=>{const nav=document.querySelector('nav');nav.classList.toggle('open');$('mobileMenu').setAttribute('aria-expanded',String(nav.classList.contains('open')));});
  document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('library').scrollIntoView();$('searchInput').focus();}const node=e.target.closest?.('[data-map-category]');if(node&&(e.key==='Enter'||e.key===' ')){e.preventDefault();resetFilters();chooseCategory(node.dataset.mapCategory);}});
  $('aboutButton').addEventListener('click',()=>{state.detail=null;$('detailContent').innerHTML=`<div class="about-body"><p class="eyebrow">ABOUT THIS ATLAS</p><h2 id="detailTitle">关于这份数字生态图鉴</h2><p>这里把2026年10月15日的本机应用盘点，整理为11大类、92个功能组。原盘点包含218个项目目录、1307条程序与脚本入口。</p><ul><li>图鉴保留559条应用入口候选；启动脚本、辅助文件与第三方组件保留在原清单中。</li><li>“界面预览”图片来自原应用页面；“概念封面”用于表示用途与分类。</li><li>时间最新、最高标注版本与运行状态分别记录。APK内部版本已核对，命名差异写在应用详情中。</li><li>收藏保存在当前浏览器中，场景组合用于呈现搭配思路。</li></ul><p>从一个需求出发，找到适合自己的下一件工具。</p></div>`;dialog.showModal();document.body.style.overflow='hidden';});
  function toggleTop(){$('toTop').hidden=window.scrollY<720;}
  $('toTop').addEventListener('click',()=>window.scrollTo({top:0,behavior:'smooth'}));
  const sectionIds=['home','library','ecosystem','scenes'];
  let scrollTick=false;
  function syncNav(){
    const probe=window.scrollY+150;let active='home';
    for(const id of sectionIds){const el=$(id);if(el&&el.getBoundingClientRect().top+window.scrollY<=probe)active=id;}
    document.querySelectorAll('.nav-link').forEach(a=>a.classList.toggle('active',a.getAttribute('href')==='#'+active));
  }
  const header=document.querySelector('.site-header');
  window.addEventListener('scroll',()=>{if(scrollTick)return;scrollTick=true;requestAnimationFrame(()=>{toggleTop();syncNav();header.classList.toggle('scrolled',window.scrollY>8);scrollTick=false;});},{passive:true});
  document.addEventListener('error',event=>{const img=event.target;if(!(img instanceof HTMLImageElement)||img.dataset.fallback)return;img.dataset.fallback='1';img.src='assets/cover-eco.svg';},true);
  $('sortSelect').value=state.sort;
  renderFeatured();renderLibrary();renderMap();renderScenes();hydrateIcons();
  toggleTop();syncNav();
  (function initFromUrl(){
    const params=new URLSearchParams(location.search);
    const query=params.get('q');
    if(query){state.query=query;$('searchInput').value=query;renderLibrary();}
    const deep=params.get('app')||(location.hash.startsWith('#app=')?location.hash.slice(5):'');
    if(deep&&groups[deep])openDetail(deep);
  })();
  window.ecosystemApp={getState:()=>({...state,saved:[...state.saved]}),groupCount:D.groups.length,categoryCount:D.categories.length,version:'1.1.0',openDetail,closeDetail,shareApp,pickCategory:chooseCategory,search(query=''){state.query=String(query);$('searchInput').value=state.query;state.limit=18;renderLibrary();}};
})();
