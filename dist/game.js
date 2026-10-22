import {GroundWash} from './ground-wash.js?v=2.8.2';
import {VehicleAudio} from './audio.js?v=14';
import {LandingEffects} from './landing-effects.js?v=23';
import * as THREE from './vendor/three.module.js';
import {createRoadster} from './roadster.js?v=5';
import {fresh,step,R,WALL,pose,END,AIR_CAPACITY,REST_HEIGHT,groundEffect,groundHeight} from './physics.js?v=2.8.3';
const $=id=>document.getElementById(id),host=$('scene');let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true});}catch(e){$('hint').textContent='此裝置無法啟動 WebGL，請使用支援 WebGL 的瀏覽器。';$('start').disabled=true;throw e;}
renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color('#b9cbc6');scene.fog=new THREE.Fog('#b9cbc6',95,230);const camera=new THREE.PerspectiveCamera(40,1,.1,400);const target=new THREE.Vector3();scene.add(new THREE.HemisphereLight(0xeaf9ef,0x465b57,2.8));const sun=new THREE.DirectionalLight(0xfff3dc,3.3);sun.position.set(-25,60,35);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-70,right:70,top:60,bottom:-60,far:180});sun.shadow.bias=-.0004;scene.add(sun);
const mat=(color,opts={})=>new THREE.MeshStandardMaterial({color,roughness:.72,...opts});const asphalt=mat('#334b4c'),concrete=mat('#dce5d6'),lime=mat('#dbfb91'),dark=mat('#122b31'),white=mat('#e3ede7'),steel=mat('#607c76',{metalness:.6});
function box(w,h,d,m,x=0,y=0,z=0,parent=scene){const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
box(600,.4,260,mat('#9db6aa'),-180,-.4,0);box(440,.15,17,asphalt,-170,-.05,0);const grid=new THREE.GridHelper(240,60,0x7d9c8c,0x9bb3a6);grid.position.y=-.18;scene.add(grid);
for(let x=-380;x<18;x+=5){box(2,.035,.12,concrete,x,.06,-5.7);box(2,.035,.12,concrete,x,.06,5.7);}
// Continuous semicircular road, its inner face is the drivable surface.
const verts=[],norm=[],indices=[];for(let i=0;i<=96;i++){const t=i/96*Math.PI;for(const z of [-4.5,4.5]){verts.push(WALL+R*Math.sin(t),R*(1-Math.cos(t)),z);norm.push(-Math.sin(t),Math.cos(t),0);}if(i<96){let a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(norm,3));geometry.setIndex(indices);const ramp=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:'#e0e6d5',roughness:.85,side:THREE.DoubleSide}));ramp.receiveShadow=true;ramp.castShadow=true;scene.add(ramp);
for(let i=0;i<96;i++){const t=(i+.5)/96*Math.PI;for(const z of [-4.55,4.55]){const rail=box(.41,.19,.23,i%8<4?lime:dark,WALL+R*Math.sin(t),R*(1-Math.cos(t)),z);rail.rotation.z=t;}}
for(let i=1;i<=7;i++){const t=i/8*Math.PI,x=WALL+(R+.2)*Math.sin(t),y=R*(1-Math.cos(t));for(const z of [-5.1,5.1]){box(.19,y,.19,steel,x,y/2,z);box(.35,.3,1.4,steel,x,y,z*.9);}}
for(let x=-380;x<18;x+=12){box(.12,.035,9,white,x,.045,0);}for(let x=-380;x<60;x+=18){box(.18,6,.18,steel,x,3,-15);box(2,.15,.6,white,x,6,-15);}
// Landing zone, independently modelled without source artwork.
box(34,.025,14,mat('#7d9886'),-28,.05,0);for(let x=-44;x<-10;x+=3){for(let z of [-6.8,6.8])box(1.4,.045,.23,lime,x,.075,z);}for(let x=-45;x<-42;x+=.7)for(let z=-6;z<6;z+=.7)box(.7,.04,.7,(Math.round((x+45)/.7)+Math.round((z+6)/.7))%2?dark:white,x,.08,z);

// Original supplied logo, painted directly onto the acceleration lane.
const logoTexture=new THREE.TextureLoader().load('./assets/party-logo.png');
logoTexture.colorSpace=THREE.SRGBColorSpace;
logoTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();
const logoMaterial=new THREE.MeshBasicMaterial({map:logoTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
// One large horizontal logo, centred on the acceleration runway.
const logoWidth=34,logoHeight=logoWidth*1041/3049;
const decal=new THREE.Mesh(new THREE.PlaneGeometry(logoWidth,logoHeight),logoMaterial);
decal.rotation.x=-Math.PI/2;decal.position.set(-5,.115,0);decal.renderOrder=2;scene.add(decal);

function sign(text,x,y,z,size=1){const c=document.createElement('canvas');c.width=1024;c.height=256;const ctx=c.getContext('2d');ctx.fillStyle='#173037';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#dafa8e';ctx.font='bold 95px sans-serif';ctx.textAlign='center';ctx.fillText(text,512,163);const m=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c)});const s=new THREE.Mesh(new THREE.PlaneGeometry(12*size,3*size),m);s.position.set(x,y,z);scene.add(s);return s;}
sign('FLIP / 001',29,12,-5.5,1.4);sign('LANDING ZONE',-28,1,-9,.9);
for(let i=0;i<15;i++){const x=-85+i*11,z=-30-(i%3)*10;box(5+(i%2)*2,3+i%4,4,mat(i%2?'#87a397':'#759487'),x,(3+i%4)/2-.2,z);}
const {car,wheels}=createRoadster();scene.add(car);
const flames=[];
// Four wheel-aligned nozzles; each side controls its front and rear pair.
for(const z of [-.95,.95])for(const x of [-1.12,1.12]){
 box(.32,.22,.28,steel,x,-.4,z,car);
 const jet=new THREE.Group();jet.position.set(x,-.51,z);jet.userData.side=z<0?'left':'right';
 const flame=new THREE.Mesh(new THREE.ConeGeometry(.34,2.8,16),new THREE.MeshBasicMaterial({color:'#26caff',transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending}));
 flame.rotation.z=Math.PI;flame.position.y=-1.4;jet.add(flame);
 const core=new THREE.Mesh(new THREE.ConeGeometry(.18,2.1,12),new THREE.MeshBasicMaterial({color:'#e7ffff',transparent:true,opacity:.95,depthWrite:false}));
 core.rotation.z=Math.PI;core.position.y=-1.05;jet.add(core);
 const halo=new THREE.Mesh(new THREE.ConeGeometry(.5,3.2,16),new THREE.MeshBasicMaterial({color:'#19aaff',transparent:true,opacity:.22,depthWrite:false,blending:THREE.AdditiveBlending}));halo.rotation.z=Math.PI;halo.position.y=-1.6;jet.add(halo);
 for(let i=0;i<3;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.18-i*.035,.035,6,16),new THREE.MeshBasicMaterial({color:'#bdffff',transparent:true,opacity:.8,depthWrite:false}));ring.rotation.x=Math.PI/2;ring.position.y=-.65-i*.65;jet.add(ring);}car.add(jet);flames.push(jet);
}
const groundWash=new GroundWash(scene);
const nozzlePosition=new THREE.Vector3(),jetDirection=new THREE.Vector3();
const landingFX=new LandingEffects(scene);let reportDelay=-1;
let g=fresh(),running=false,paused=false,shown=false,sound=true;const sfx=new VehicleAudio();sfx.enabled=true;const input={};let best=0;try{best=Number(localStorage.getItem('flip-best')||0)}catch{}$('best').textContent=best;
function tone(freq,dur=.09){sfx.cue(freq,dur);}
function clear(){Object.keys(input).forEach(k=>input[k]=false);document.querySelectorAll('[data-key]').forEach(b=>b.classList.remove('active'));}
function start(){groundWash.reset();landingFX.reset();reportDelay=-1;car.visible=true;g=fresh();running=true;paused=false;shown=false;clear();$('pause').querySelector('img').src='assets/buttons/pause.svg';$('pause').setAttribute('aria-label','暫停遊戲');$('intro').classList.add('hidden');$('result').classList.add('hidden');$('paused').classList.add('hidden');sfx.startup();}
function togglePause(){if(!running||g.phase==='done')return;paused=!paused;clear();$('paused').classList.toggle('hidden',!paused);$('pause').querySelector('img').src='assets/buttons/'+(paused?'resume':'pause')+'.svg';$('pause').setAttribute('aria-label',paused?'繼續遊戲':'暫停遊戲');}
$('start').onclick=start;$('again').onclick=start;$('restart').onclick=start;$('pause').onclick=togglePause;$('paused').onclick=togglePause;$('help').onclick=()=>{clear();reportDelay=-1;landingFX.reset();groundWash.reset();running=false;$('intro').classList.remove('hidden');$('result').classList.add('hidden');};$('sound').onclick=()=>{sound=!sound;sfx.enable(sound);$('sound').querySelector('img').src='assets/buttons/sound-'+(sound?'on':'off')+'.svg';$('sound').setAttribute('aria-label',sound?'關閉音效':'開啟音效');tone(600);};
const keys={Space:'drive',KeyX:'stick',ArrowLeft:'left',ArrowRight:'right'};
function set(k,v){if(v)sfx.unlock();input[k]=v;document.querySelector(`[data-key="${k}"]`).classList.toggle('active',v);}
addEventListener('keydown',e=>{if(keys[e.code]){e.preventDefault();if(e.code==='Space'&&!e.repeat&&(!running||g.phase==='done'))start();set(keys[e.code],true);}if(e.code==='KeyR'&&!e.repeat)start();if(e.code==='KeyP'&&!e.repeat)togglePause();});addEventListener('keyup',e=>{if(keys[e.code]){e.preventDefault();set(keys[e.code],false);}});addEventListener('blur',()=>{clear();if(running&&!paused)togglePause();});document.addEventListener('visibilitychange',()=>{if(document.hidden){clear();if(running&&!paused)togglePause();}});
for(const button of document.querySelectorAll('button')){for(const event of ['contextmenu','dragstart','selectstart'])button.addEventListener(event,e=>e.preventDefault());}
for(const b of document.querySelectorAll('[data-key]')){b.onpointerdown=e=>{e.preventDefault();b.setPointerCapture(e.pointerId);set(b.dataset.key,true);};for(const event of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(event,()=>set(b.dataset.key,false));b.oncontextmenu=e=>e.preventDefault();}
function finish(){
 shown=true;clear();const r=g.result,newRecord=r.score>best;
 $('result').dataset.outcome=r.ok?'success':'crash';
 $('resultLabel').textContent=r.ok?(r.perfect?'完美著陸':'成功著陸'):'挑戰結束';
 $('resultTitle').textContent=r.ok?(r.perfect?'完美著陸！':'著陸成功！'):(g.impactKind?'撞擊爆炸！':'再挑戰一次。');
 $('reason').textContent=r.ok?(r.perfect?'姿態與速度控制出色，獲得完美獎勵。':'保持水平、減緩下降，挑戰完美著陸。'):(g.reason.startsWith('吸附中斷')?'爬牆時按住 X 吸附，直到飛出頂端。':g.reason||'下次先翻正、減速再落地。距離分已保留。');
 $('score').textContent=r.score.toLocaleString('zh-TW');
 // Truncate the displayed range to avoid rounding 37.99 m to 38.0 with 75 points.
 $('resultDistance').replaceChildren(document.createTextNode((Math.floor(r.distance*10)/10).toFixed(1)+' '));const unit=document.createElement('small');unit.textContent='m';$('resultDistance').append(unit);
 $('resultRolls').replaceChildren(document.createTextNode(r.rolls.toFixed(2)+' '));const turns=document.createElement('small');turns.textContent='圈';$('resultRolls').append(turns);
 const bonus=r.ok?(r.bonus||0):0,rotation=r.ok?r.rotation:0,landing=r.score-r.distancePoints-bonus-rotation;
 for(const [id,value] of [['distancePoints',r.distancePoints],['rotationPoints',rotation],['landingPoints',landing],['perfectPoints',bonus]]){const el=$(id);el.textContent='+'+value.toLocaleString('zh-TW');el.classList.toggle('zero',value===0);}
 $('perfectNote').textContent=r.perfect?'達成 +50 獎勵':'未達成';
 if(newRecord){best=r.score;$('best').textContent=best;try{localStorage.setItem('flip-best',best)}catch{}}
 $('record').textContent=(newRecord?'新紀錄 · ':'最佳紀錄 ')+best.toLocaleString('zh-TW')+' 分';$('record').classList.toggle('is-new',newRecord);
 $('result').classList.remove('hidden');fitResult();
}

// Fit the complete report, including both actions, without a scroll container.
function fitResult(){
 const overlay=$('result'),card=overlay.querySelector('article');
 if(overlay.classList.contains('hidden'))return;
 const style=getComputedStyle(overlay);
 const available=overlay.clientHeight-parseFloat(style.paddingTop)-parseFloat(style.paddingBottom);
 const scale=Math.min(1,available/Math.max(card.offsetHeight,card.scrollHeight));
 card.style.setProperty('--report-scale',Math.max(.01,scale));
}
const reportObserver=new ResizeObserver(fitResult);
reportObserver.observe($('result'));reportObserver.observe($('result').querySelector('article'));
document.fonts.ready.then(fitResult);

const qPitch=new THREE.Quaternion(),qRoll=new THREE.Quaternion(),axisZ=new THREE.Vector3(0,0,1),axisX=new THREE.Vector3(1,0,0);let last=performance.now(),acc=0;
function frame(now){requestAnimationFrame(frame);const dt=Math.min((now-last)/1000,.05);last=now;if(running&&!paused){acc+=dt;while(acc>=1/120){step(g,input,1/120);acc-=1/120;}if(g.phase==='done'&&!shown){shown=true;const crash=!g.result.ok&&!!g.impactKind;if(g.impactKind){landingFX.trigger(g,crash,g.result.perfect);sfx.landing(crash,g.result.perfect);}else tone(130,.4);reportDelay=crash?2.8:.65;}}if(!paused){landingFX.update(dt);if(reportDelay>=0){reportDelay-=dt;if(reportDelay<0)finish();}}car.visible=!(g.phase==='done'&&!g.result.ok&&g.impactKind&&landingFX.age>.12);sfx.update(g,input,running&&!paused&&g.phase!=='done',paused||!running);car.position.set(g.x,g.y,g.z);qPitch.setFromAxisAngle(axisZ,g.pitch);qRoll.setFromAxisAngle(axisX,g.roll);car.quaternion.copy(qPitch).multiply(qRoll);const cushion=groundEffect(g);flames.forEach((f,i)=>{
 f.visible=running&&!paused&&g.phase!=='done'&&g.air>0&&input[f.userData.side];
 const pulse=.95+Math.sin(now*.045+i*1.7)*.16;
 f.scale.set(1+cushion*.85,pulse,1+cushion*.85);
 f.getWorldPosition(nozzlePosition);
 const floor=groundHeight(nozzlePosition.x,nozzlePosition.z),upright=Math.cos(g.pitch)*Math.cos(g.roll);
 if(cushion>0)f.scale.y=Math.min(pulse,Math.max(.06,(nozzlePosition.y-floor)/(3.2*Math.max(.5,upright))));
 jetDirection.set(0,-1,0).applyQuaternion(car.quaternion);
 if(!paused)groundWash.emit(i,nozzlePosition,jetDirection,f.visible?cushion:0,dt,{x:g.vx,z:g.vz});
});
if(!paused)groundWash.update(dt);
const overview=!running;target.set(overview?12:g.x+4,overview?10:Math.max(7,g.y*.75),g.z*.7);const desired=target.clone().add(new THREE.Vector3(-22,17,39));camera.position.lerp(desired,1-Math.exp(-dt*3));camera.lookAt(target);if(landingFX.crash&&landingFX.age<.65){const shake=(1-landingFX.age/.65)*.35;camera.position.x+=Math.sin(now*.12)*shake;camera.position.y+=Math.cos(now*.15)*shake;}renderer.render(scene,camera);
$('speed').textContent=Math.round((g.phase==='track'?g.v:Math.hypot(g.vx,g.vy))*3.6);const airPercent=g.air/AIR_CAPACITY*100;$('air').textContent=Math.ceil(airPercent)+'%';$('airbar').style.width=airPercent+'%';$('airbar').style.background=airPercent<20?'#ff9c72':'#ddff89';$('height').textContent=Math.max(0,g.y-REST_HEIGHT).toFixed(1);$('rolls').textContent=(g.travel/(2*Math.PI)).toFixed(1);
const flight=g.phase==='flight';$('stage').textContent=paused?'PAUSED':flight?'03 — CONTROL YOUR LANDING':g.pitch>.1?'02 — CLIMB & STICK':'01 — ACCELERATE';$('hint').textContent=g.phase==='done'?(g.result.ok?(g.result.perfect?'完美著陸！額外 +50 分。':'安全著陸！'):(g.impactKind?'車輛撞擊！下次先翻正、減速再落地。':g.reason)):g.air<=0?'壓縮空氣耗盡！':flight?(g.reason.startsWith('吸附中斷')?'吸附已中斷！下次爬牆請同時按住 X 與空白鍵。':Math.cos(g.pitch)*Math.cos(g.roll)>.85?'微前傾滑翔！雙噴射向前推升，短按控制高度。':'短按單側噴射，翻正車身。'):g.pitch>.1?'按住 X 吸附，繼續前進至頂端。':'按住空白鍵前進，準備爬上反曲牆。';}
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=58;camera.updateProjectionMatrix();}new ResizeObserver(resize).observe(host);camera.position.set(-29,32,49);resize();requestAnimationFrame(frame);



