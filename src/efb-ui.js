(()=>{
  const nav=document.querySelector('.side-nav');
  if(!nav)return;
  nav.insertAdjacentHTML('beforeend','<button class="nav-item" data-page="efb" id="efbNav">EFB</button>');
  document.querySelector('#page-notes').insertAdjacentHTML('afterend',`<section class="app-page" id="page-efb">
    <article class="card efb-controls"><div class="efb-bar"><h2>EFB</h2><select id="efbProvider" aria-label="Aircraft provider"><option value="auto">Automatic</option><option value="fenix">Fenix</option><option value="pmdg">PMDG</option><option value="inibuilds">iniBuilds</option></select><div id="efbStatus" role="status" aria-live="polite">Ready</div><button id="efbExpand" type="button">Expand</button><button id="efbReload" type="button">Reload</button><button id="efbSettingsButton" type="button" aria-expanded="false" aria-controls="efbSettings">Settings</button></div>
    <details id="efbSettings"><summary class="hidden">Connection settings</summary><p class="muted small" id="efbAircraft">Waiting for simulator aircraft</p><form id="efbForm" class="efb-toolbar"><label class="efb-address">Local EFB address<input id="efbAddress" placeholder="http://localhost:8083" maxlength="2048" autocomplete="off"></label><button type="submit">Save & connect</button></form>
    <p class="muted small" id="efbHelp">Fenix connects on port 8083. PMDG and iniBuilds require a compatible web-EFB server; Flight Desk does not supply one.</p></details></article>
    <div id="efbSurface"><div id="efbTablet"><span class="muted">Your aircraft EFB appears here when connected.</span></div></div></section>`);
  const $=id=>document.getElementById(id),names={fenix:'Fenix',pmdg:'PMDG',inibuilds:'iniBuilds'};
  let settings={provider:'auto',addresses:{fenix:'http://localhost:8083/'}},effective='',busy=false,again=false,reload=false;
  try{const saved=JSON.parse(localStorage.getItem('flightdeskEfb')||'null');if(saved){if(['auto',...Object.keys(names)].includes(saved.provider))settings.provider=saved.provider;for(const key of Object.keys(names))if(typeof saved.addresses?.[key]==='string')settings.addresses[key]=saved.addresses[key].slice(0,2048)}}catch{}
  $('efbProvider').value=settings.provider;
  function save(){localStorage.setItem('flightdeskEfb',JSON.stringify(settings))}
  function address(){const provider=settings.provider==='auto'?effective:settings.provider;$('efbAddress').value=settings.addresses[provider]||'';$('efbAddress').disabled=!provider}
  async function sync(){
    if(!window.cockpitDesktop?.updateEfb){$('efbStatus').textContent='EFB requires the Flight Desk desktop app.';return}
    if(busy){again=true;return}busy=true;
    try{
      const surface=$('efbSurface'),r=surface.getBoundingClientRect(),shell=$('page-efb').classList.contains('efb-expanded')?{top:0,bottom:innerHeight}:document.querySelector('.page-shell').getBoundingClientRect();
      const visible=activePage==='efb'&&!document.querySelector('#desk').classList.contains('hidden');
      const top=Math.max(r.top,shell.top),bottom=Math.min(r.bottom,shell.bottom,innerHeight);
      const height=Math.max(0,bottom-top),width=r.width;
      $('efbTablet').style.width=width+'px';$('efbTablet').style.height=height+'px';
      const response=await window.cockpitDesktop.updateEfb({...settings,reload,visible,bounds:{x:r.left,y:top,width,height}});reload=false;
      if(response.provider!==effective){effective=response.provider;address()}
      $('efbAircraft').textContent=(settings.provider==='auto'?'Automatic':'Manual')+' · '+(names[response.provider]||'No provider detected')+(response.aircraft?' · '+response.aircraft:'');
      $('efbProvider').title=$('efbAircraft').textContent;
      $('efbStatus').textContent=response.status;
      $('efbStatus').title=response.status;
    }catch{$('efbStatus').textContent='EFB connection unavailable. Try Reload.'}finally{busy=false;if(again){again=false;sync()}}
  }
  $('efbProvider').onchange=()=>{settings.provider=$('efbProvider').value;address();save();sync()};
  $('efbForm').onsubmit=event=>{event.preventDefault();const provider=settings.provider==='auto'?effective:settings.provider;if(!provider)return;settings.addresses[provider]=$('efbAddress').value.trim();save();reload=true;sync()};
  $('efbReload').onclick=()=>{reload=true;sync()};
  $('efbSettingsButton').onclick=()=>{$('efbSettings').open=!$('efbSettings').open};
  $('efbSettings').addEventListener('toggle',()=>{$('efbSettingsButton').setAttribute('aria-expanded',String($('efbSettings').open));sync()});
  $('efbExpand').onclick=()=>{const expanded=$('page-efb').classList.toggle('efb-expanded');$('efbExpand').textContent=expanded?'Back to desk':'Expand';sync()};
  $('efbNav').onclick=()=>activatePage('efb');
  window.FlightDeskEfb={sync};
  new ResizeObserver(sync).observe($('efbSurface'));
  new MutationObserver(sync).observe(document.querySelector('#desk'),{attributes:true,attributeFilter:['class']});
  document.querySelector('.page-shell').addEventListener('scroll',sync,{passive:true});
  window.addEventListener('resize',sync);
  address();sync();setInterval(sync,1000);
})();
