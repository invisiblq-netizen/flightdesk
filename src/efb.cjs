const {WebContentsView}=require('electron');
const configuredSessions=new WeakSet();

function detectProvider(title){
  if(/\bfenix|\bfnx[_ -]?/i.test(title))return 'fenix';
  if(/\bpmdg\b|\bpmdg_/i.test(title))return 'pmdg';
  if(/\binibuilds|\bini[_ -]?(?:a\d|builds)/i.test(title))return 'inibuilds';
  return '';
}
function localUrl(input){
  const url=new URL(input);
  const host=url.hostname;
  const parts=host.split('.').map(Number);
  const ipv4=/^\d+\.\d+\.\d+\.\d+$/.test(host)&&parts.every(n=>n>=0&&n<=255);
  const local=host==='localhost'||host==='[::1]'||ipv4&&(parts[0]===127||parts[0]===10||parts[0]===192&&parts[1]===168||parts[0]===172&&parts[1]>=16&&parts[1]<=31);
  if(!['http:','https:'].includes(url.protocol)||!local||url.username||url.password)throw Error('Use an http:// or https:// address on localhost or your private LAN.');
  return url.href;
}
class EfbView {
  constructor(win){
    this.win=win;this.view=null;this.key='';this.status='';this.visible=false;this.ready=false;
    win.on('closed',()=>this.close());
    win.webContents.on('did-start-navigation',(_event,_url,_inPlace,mainFrame)=>{if(mainFrame)this.close()});
  }
  close(){
    const view=this.view;this.view=null;this.key='';this.ready=false;
    if(view){if(!this.win.isDestroyed())this.win.contentView.removeChildView(view);if(!view.webContents.isDestroyed())view.webContents.close()}
  }
  update(input={},position={}){
    const fresh=position.connected&&Date.now()-position.updatedAt<5000;
    const aircraft=fresh?String(position.cockpit?.aircraft||''):'';
    const detected=detectProvider(aircraft);
    const provider=['fenix','pmdg','inibuilds'].includes(input.provider)?input.provider:detected;
    const result=()=>({provider,detected,aircraft,status:this.status});
    this.visible=input.visible===true;
    if(!provider){this.close();this.status=aircraft?'Aircraft provider not recognized. Choose an EFB manually.':'Waiting for simulator aircraft. You can also choose an EFB manually.';return result()}
    let url;
    try{url=localUrl(input.addresses?.[provider]||(provider==='fenix'?'http://localhost:8083/':''))}
    catch{this.close();this.status=provider==='fenix'?'Enter a valid local EFB address.':'No built-in web-EFB endpoint is configured for this provider. Enter a compatible local web-EFB address if you have one.';return result()}
    const key=provider+'|'+url;
    if(this.key!==key){this.close();this.status='Ready to connect';}
    if(!this.visible){this.view?.setVisible(false);return result()}
    if(!this.view){
      this.key=key;
      const view=this.view=new WebContentsView({webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,partition:'persist:efb-'+provider}});
      this.win.contentView.addChildView(view);
      view.setVisible(false);
      const wc=view.webContents;
      wc.session.setPermissionRequestHandler((_wc,_permission,callback)=>callback(false));
      wc.session.setPermissionCheckHandler(()=>false);
      if(!configuredSessions.has(wc.session)){wc.session.on('will-download',event=>event.preventDefault());configuredSessions.add(wc.session)}
      const allowed=target=>{try{return new URL(localUrl(target)).origin===new URL(url).origin}catch{return false}};
      wc.on('will-navigate',(event,target)=>{if(!allowed(target))event.preventDefault()});
      wc.on('will-redirect',(event,target)=>{if(!allowed(target))event.preventDefault()});
      wc.setWindowOpenHandler(({url:target})=>{if(allowed(target))wc.loadURL(target).catch(()=>{});return {action:'deny'}});
      let failed=false;
      // The browser loading spinner also runs for hash/history changes and
      // subframes. Those do not finish a new document load and must not hide
      // an already connected EFB or leave it stuck on "Connecting".
      wc.on('did-start-navigation',details=>{if(this.view===view&&details.isMainFrame&&!details.isSameDocument){failed=false;this.status='Connecting…'}});
      wc.on('did-finish-load',()=>{if(this.view===view&&!failed){this.ready=true;this.status='EFB connected'}});
      const keepConnected=()=>{if(this.view===view&&this.ready&&!failed)this.status='EFB connected'};
      wc.on('did-stop-loading',keepConnected);
      wc.on('did-navigate-in-page',keepConnected);
      wc.on('did-fail-load',(_event,code,_description,_url,mainFrame)=>{if(this.view===view&&mainFrame&&code!==-3){failed=true;this.ready=false;this.status='Could not connect. Start the aircraft EFB server, check the address, then select Reload.';view.setVisible(false)}});
      wc.on('render-process-gone',()=>{if(this.view===view){this.close();this.status='EFB stopped. Select Reload to reconnect.'}});
      wc.loadURL(url).catch(()=>{});
    }else if(input.reload){this.view.webContents.reload()}
    const bounds=input.bounds;
    if(bounds&&['x','y','width','height'].every(k=>Number.isFinite(bounds[k]))){
      const [width,height]=this.win.getContentSize();
      const x=Math.max(0,Math.min(width,Math.round(bounds.x))),y=Math.max(0,Math.min(height,Math.round(bounds.y)));
      const w=Math.max(0,Math.min(width-x,Math.round(bounds.width))),h=Math.max(0,Math.min(height-y,Math.round(bounds.height)));
      this.view.setBounds({x,y,width:w,height:h});
      this.view.setVisible(w>0&&h>0&&this.ready);
    }else this.view.setVisible(false);
    return result();
  }
}
module.exports={EfbView,detectProvider,localUrl};
