import {test} from 'node:test';import assert from 'node:assert/strict';import {fresh,step,grade,AIR_CAPACITY,groundEffect} from './dist/physics.js';
import {pose,END,hitsWall,worldHull,R,WALL,groundClearance,groundHeight} from './dist/physics.js';
test('drive alone peels and falls without a false wall crash or penetration',()=>{
 for(const dt of [1/60,1/120,1/240]){
  const g=fresh();while(g.phase!=='done'&&g.time<15){step(g,{drive:true},dt);assert.equal(hitsWall(g),false);}
  assert.equal(g.phase,'done');assert.match(g.reason,/吸附中斷/);assert.ok(Math.abs(groundClearance(g))<1e-8);assert.ok(g.time>6);
 }
});
test('releasing stick at different wall angles resolves support contact',()=>{
 for(const angle of [1.7,2,2.4,2.8,3.1]){
  const g=fresh();while(g.phase!=='done'&&g.time<15){step(g,{drive:true,stick:g.pitch<angle},1/120);assert.equal(hitsWall(g),false);}
  assert.equal(g.phase,'done');assert.doesNotMatch(g.reason,/撞/);
 }
});
test('all wheel and body samples stay inside the drivable curved surface',()=>{for(let s=44;s<=END;s+=.02){const g={...fresh(),...pose(s)};assert.equal(hitsWall(g),false,`intersection at ${s}`);for(const [x,y,z] of worldHull(g)){if(x>WALL&&y>0&&y<2*R)assert.ok(Math.hypot(x-WALL,y-R)<R,`surface clipping at ${s}`);}}});
test('full drive, launch, roll and brake sequence can land safely',()=>{const g=fresh();while(g.phase==='track')step(g,{drive:true,stick:true},1/120);const launch=g.time;while(g.phase!=='done'){const elapsed=g.time-launch;const braking=Math.cos(g.pitch)*Math.cos(g.roll)>.8&&g.vy< -2;step(g,{left:elapsed<.45||braking,right:elapsed>=.45&&braking},1/120);}assert.equal(g.result.ok,true);assert.ok(g.result.score>60);});
test('leaving the wall does not force a later safe landing to fail',()=>{const g={...fresh(),phase:'flight',x:-10,y:.73,vy:-1,reason:'吸附中斷'};step(g,{},.02);assert.equal(g.result.ok,true);});
test('wall collision respects finite road width',()=>{assert.equal(hitsWall({...fresh(),x:30,y:12,z:0}),true);assert.equal(hitsWall({...fresh(),x:30,y:12,z:8}),false);});
test('drive and stick launch inverted',()=>{const g=fresh();for(let i=0;i<1800&&g.phase==='track';i++)step(g,{drive:true,stick:true},1/120);assert.equal(g.phase,'flight');assert.ok(Math.abs(g.pitch-Math.PI)<.01);assert.ok(g.vx<0);assert.ok(g.air<AIR_CAPACITY);});
test('without stick overhang peels off',()=>{const g=fresh();for(let i=0;i<1800&&g.phase==='track';i++)step(g,{drive:true},1/120);assert.match(g.reason,/吸附/);});
test('inverted thrust pushes down, upright thrust brakes',()=>{for(const roll of [0,Math.PI]){const g={...fresh(),phase:'flight',x:-10,y:20,pitch:Math.PI,roll,vy:-2};step(g,{left:true,right:true},.01);assert.equal(g.vy> -2,roll===Math.PI);assert.equal(g.omega,0);}});
test('single thruster rolls and air never goes negative',()=>{const g={...fresh(),phase:'flight',x:-10,y:100,air:.01};step(g,{left:true},.01);assert.ok(g.omega>0);assert.equal(g.air,0);});
test('safe landing scores; inverted and hard impacts fail',()=>{const g={...fresh(),pitch:Math.PI,roll:Math.PI,vy:-2,travel:Math.PI};assert.equal(grade(g).ok,true);assert.ok(grade(g).score>80);assert.equal(grade({...g,roll:0}).ok,false);assert.equal(grade({...g,vy:-15}).ok,false);});

test('paired jets reverse descent and climb while preserving forward glide across frame rates',()=>{
 for(const dt of [1/60,1/120,1/240]){
  const g={...fresh(),phase:'flight',x:-10,y:25,pitch:Math.PI,roll:Math.PI,vx:-20,vy:-3};
  for(let t=0;t<3;t+=dt)step(g,{left:true,right:true},dt);
  assert.equal(g.phase,'flight');assert.ok(g.x< -69);assert.ok(g.vx< -21.5);
  assert.ok(g.vy>19&&g.vy<21);assert.ok(g.y>49&&g.y<52);assert.ok(g.air>50);
 }
});
test('upright glide falls gently and empty jets cannot hover',()=>{
 const g={...fresh(),phase:'flight',x:-10,y:100,pitch:Math.PI,roll:Math.PI,vx:-20,air:0};
 for(let i=0;i<120;i++)step(g,{left:true,right:true},1/120);
 assert.equal(g.vx,-20);assert.ok(g.vy< -7.7&&g.vy> -8);assert.ok(g.y<98);
 const stationary={...fresh(),phase:'flight',x:-10,y:100,air:0};
 for(let i=0;i<120;i++)step(stationary,{},1/120);
 assert.ok(stationary.vy< -12&&stationary.vy> -12.5);
});

test('halved air capacity provides 6.25 seconds of paired thrust',()=>{
 const g={...fresh(),phase:'flight',x:-10,y:30,pitch:Math.PI,roll:Math.PI,vx:-20};
 assert.equal(g.air,100);
 for(let i=0;i<480;i++)step(g,{left:true,right:true},1/120);
 assert.equal(g.phase,'flight');assert.ok(Math.abs(g.air-36)<.01);assert.ok(g.y>28);
});
test('lane assist recovers lateral drift and auto-levels an upright car',()=>{
 for(const dt of [1/60,1/120,1/240])for(const side of [-1,1]){
  const g={...fresh(),phase:'flight',x:-10,y:100,pitch:Math.PI,roll:Math.PI+.4*side,z:3*side,vz:5*side,vx:-20};
  for(let t=0;t<4;t+=dt)step(g,{left:true,right:true},dt);
  assert.ok(Math.abs(g.z)<.08);assert.ok(Math.abs(g.roll-Math.PI)<.01);assert.ok(g.vx< -22);
 }
});

test('paired thrust adds lift, tilt changes direction, release restores gravity',()=>{
 const make=()=>({...fresh(),phase:'flight',x:-20,y:100});
 const off=make(),single=make(),both=make();step(off,{},.001);step(single,{left:true},.001);step(both,{left:true,right:true},.001);
 assert.ok(both.vy>0);assert.ok(single.vy>off.vy);assert.ok(Math.abs((both.vy-off.vy)-2*(single.vy-off.vy))<.00001);assert.equal(both.omega,0);
 const tilt={...make(),pitch:Math.PI/4};step(tilt,{left:true,right:true},.01);assert.ok(tilt.vx<0);
 const before=both.vy;step(both,{},.01);assert.ok(both.vy<before);
});

test('perfect landing earns 50 bonus; tilted hard or spinning contacts do not',()=>{const base={...fresh(),vy:-2};const perfect=grade(base);assert.equal(perfect.bonus,50);assert.equal(perfect.perfect,true);for(const change of [{roll:.6},{vy:-4},{omega:1},{roll:Math.PI}]){const r=grade({...base,...change});assert.equal(r.bonus,0);assert.equal(r.perfect,false);}assert.equal(perfect.score,94);});

test('nose-down trim gives jet-powered forward thrust in both headings, without free propulsion',()=>{
 for(const dt of [1/60,1/120,1/240])for(const direction of [-1,1]){
  const base={...fresh(),phase:'flight',x:-30,y:100,pitch:direction<0?Math.PI:0,roll:direction<0?Math.PI:0,vx:20*direction};
  const powered={...base},coasting={...base};
  for(let i=0;i<Math.round(2/dt);i++){step(powered,{left:true,right:true},dt);step(coasting,{},dt);}
  assert.ok(Math.sin(powered.pitch)<-.09,'nose points gently down');
  assert.ok(direction*powered.vx>21);assert.equal(coasting.vx,20*direction);
  assert.ok(powered.vy>0);assert.ok(Math.abs(grade({...powered,vy:-1}).tilt-6)<.2);
 }
});

test('ground contact supports upright inverted sideways and nose-down cars at every timestep',()=>{
 for(const dt of [1/60,1/120,1/240])for(const [pitch,roll] of [[0,0],[Math.PI,0],[0,Math.PI/2],[Math.PI/2,0],[Math.PI+.105,Math.PI]]){
  const g={...fresh(),phase:'flight',x:-30,y:6,pitch,roll,vy:-30};
  while(g.phase!=='done')step(g,{},dt);
  assert.equal(g.impactKind,'ground');assert.ok(Math.abs(groundClearance(g))<1e-8);
  const y=g.y;step(g,{},dt);assert.equal(g.y,y);
 }
});
test('rendered car vertices remain above ground after contact',async()=>{
 const {createRoadster}=await import('./dist/roadster.js');const {car}=createRoadster();
 for(const [pitch,roll] of [[0,0],[Math.PI,0],[0,Math.PI/2],[Math.PI/2,0],[.2,.4],[Math.PI+.105,Math.PI]]){
  const g={...fresh(),phase:'flight',x:-30,y:5,pitch,roll,vy:-40};while(g.phase!=='done')step(g,{},1/120);
  car.rotation.set(0,0,g.pitch);car.rotateX(g.roll);car.position.set(g.x,g.y,g.z);car.updateMatrixWorld(true);
  car.traverse(m=>{if(!m.isMesh)return;const pos=m.geometry.attributes.position;for(let i=0;i<pos.count;i++){const v=car.position.clone().fromBufferAttribute(pos,i).applyMatrix4(m.matrixWorld);assert.ok(v.y>=groundHeight(v.x,v.z)-.001,'rendered car penetrated ground');}});
 }
});

test('flight distance adds two points per metre and crash retains only distance points',()=>{
 const short=grade({...fresh(),vy:-2,flightDistance:10}),far=grade({...fresh(),vy:-2,flightDistance:50});
 assert.equal(far.score-short.score,80);assert.equal(far.distancePoints,100);
 const crash=grade({...fresh(),roll:Math.PI,flightDistance:50});assert.equal(crash.score,100);assert.equal(crash.ok,false);
});
test('distance excludes runway driving vertical hovering and return travel',()=>{
 const track=fresh();for(let i=0;i<100;i++)step(track,{drive:true},1/120);assert.equal(track.flightDistance,0);
 const g={...fresh(),phase:'flight',x:-30,y:100,vx:10};for(let i=0;i<120;i++)step(g,{},1/120);
 assert.ok(Math.abs(g.flightDistance-10)<1e-6);g.vx=-10;for(let i=0;i<120;i++)step(g,{},1/120);assert.ok(Math.abs(g.flightDistance-10)<1e-6);
 const hover={...fresh(),phase:'flight',x:-30,y:100,vy:5};for(let i=0;i<120;i++)step(hover,{},1/120);assert.equal(hover.flightDistance,0);
 const crash={...fresh(),phase:'flight',x:-30,y:2,roll:Math.PI,vy:-20,vx:10};while(crash.phase!=='done')step(crash,{},1/120);assert.equal(crash.result.score,crash.result.distancePoints);assert.ok(crash.result.distance>0);
 assert.equal(fresh().flightDistance,0);
});

test('perfect landing accepts tilts below 30 degrees without the old 24 degree gate',()=>{
 const base={...fresh(),vy:-2};
 for(const degrees of [8,23,24,29,29.99])for(const axis of ['pitch','roll']){
  const result=grade({...base,[axis]:degrees*Math.PI/180});
  assert.equal(result.ok,true);assert.equal(result.perfect,true);assert.equal(result.bonus,50);
 }
 for(const change of [{roll:Math.PI/6},{roll:31*Math.PI/180},{roll:25*Math.PI/180,vy:-3},{roll:25*Math.PI/180,omega:.5}]){
  const result=grade({...base,...change});assert.equal(result.perfect,false);assert.equal(result.bonus,0);assert.equal(result.ok,false);
 }
});

test('V2.8.0 single-side roll speed is 50 percent faster in both directions',()=>{
 for(const side of ['left','right'])for(const dt of [1/60,1/120,1/240]){
  const g={...fresh(),phase:'flight',x:-30,y:100};let previousOmega=0;
  for(let i=0;i<Math.round(.3/dt);i++){
   previousOmega+=((side==='left'?1:-1)*2*4620*.95/450-previousOmega*1.8)*dt;
   step(g,{[side]:true},dt);
  }
  assert.ok(Math.abs(g.omega/previousOmega-1.5)<1e-10);
 }
});

test('ground cushion increases smoothly near ground and rejects inverted or sideways jets',()=>{
 const g={...fresh(),phase:'flight',x:-30};
 assert.equal(groundEffect({...g,y:6}),0);
 assert.ok(groundEffect({...g,y:1})>groundEffect({...g,y:3}));
 assert.equal(groundEffect({...g,y:1,roll:Math.PI}),0);
 assert.equal(groundEffect({...g,y:1,roll:Math.PI/2}),0);
});
test('paired jets rescue a low descending car but no jets or empty air still crash',()=>{
 for(const dt of [1/60,1/120,1/240]){
  const base={...fresh(),phase:'flight',x:-30,y:2,vy:-5};
  const saved={...base};for(let i=0;i<.6/dt&&saved.phase!=='done';i++)step(saved,{left:true,right:true},dt);
  assert.equal(saved.phase,'flight');assert.ok(saved.vy>0);assert.ok(saved.y>2);
  for(const empty of [false,true]){const crash={...base,air:empty?0:100};for(let i=0;i<.6/dt&&crash.phase!=='done';i++)step(crash,{left:empty,right:empty},dt);assert.equal(crash.phase,'done');}
 }
});
