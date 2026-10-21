import {test} from 'node:test';import assert from 'node:assert/strict';import {fresh,step,grade,AIR_CAPACITY} from './dist/physics.js';
import {pose,END,hitsWall,worldHull,R,WALL} from './dist/physics.js';
test('drive alone peels and falls without a false wall crash or penetration',()=>{
 for(const dt of [1/60,1/120,1/240]){
  const g=fresh();while(g.phase!=='done'&&g.time<15){step(g,{drive:true},dt);assert.equal(hitsWall(g),false);}
  assert.equal(g.phase,'done');assert.match(g.reason,/吸附中斷/);assert.equal(g.y,.72);assert.ok(g.time>6);
 }
});
test('releasing stick at different wall angles resolves support contact',()=>{
 for(const angle of [1.7,2,2.4,2.8,3.1]){
  const g=fresh();while(g.phase!=='done'&&g.time<15){step(g,{drive:true,stick:g.pitch<angle},1/120);assert.equal(hitsWall(g),false);}
  assert.equal(g.phase,'done');assert.doesNotMatch(g.reason,/撞/);
 }
});
test('all wheel and body samples stay inside the drivable curved surface',()=>{for(let s=44;s<=END;s+=.02){const g={...fresh(),...pose(s)};assert.equal(hitsWall(g),false,`intersection at ${s}`);for(const [x,y,z] of worldHull(g)){if(x>WALL&&y>0&&y<2*R)assert.ok(Math.hypot(x-WALL,y-R)<R,`surface clipping at ${s}`);}}});
test('full drive, launch, roll and brake sequence can land safely',()=>{const g=fresh();while(g.phase==='track')step(g,{drive:true,stick:true},1/120);const launch=g.time;while(g.phase!=='done'){const elapsed=g.time-launch;const braking=Math.cos(g.pitch)*Math.cos(g.roll)>.8&&g.vy< -2;step(g,{left:elapsed<.7||braking,right:elapsed>=.7&&braking},1/120);}assert.equal(g.result.ok,true);assert.ok(g.result.score>60);});
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
  assert.equal(g.phase,'flight');assert.ok(g.x< -69);assert.equal(g.vx,-20);
  assert.ok(g.vy>22&&g.vy<24);assert.ok(g.y>54&&g.y<57);assert.ok(g.air>50);
 }
});
test('upright glide falls gently and empty jets cannot hover',()=>{
 const g={...fresh(),phase:'flight',x:-10,y:100,pitch:Math.PI,roll:Math.PI,vx:-20,air:0};
 for(let i=0;i<120;i++)step(g,{left:true,right:true},1/120);
 assert.equal(g.vx,-20);assert.ok(g.vy< -5&&g.vy> -6);assert.ok(g.y<98);
 const stationary={...fresh(),phase:'flight',x:-10,y:100,air:0};
 for(let i=0;i<120;i++)step(stationary,{},1/120);
 assert.ok(stationary.vy< -9);
});

test('double air capacity supports more than the former 6.25 seconds of paired thrust',()=>{
 const g={...fresh(),phase:'flight',x:-10,y:30,pitch:Math.PI,roll:Math.PI,vx:-20};
 assert.equal(g.air,200);
 for(let i=0;i<960;i++)step(g,{left:true,right:true},1/120);
 assert.equal(g.phase,'flight');assert.ok(Math.abs(g.air-72)<.01);assert.ok(g.y>28);
});
test('lane assist recovers lateral drift and auto-levels an upright car',()=>{
 for(const dt of [1/60,1/120,1/240])for(const side of [-1,1]){
  const g={...fresh(),phase:'flight',x:-10,y:100,pitch:Math.PI,roll:Math.PI+.4*side,z:3*side,vz:5*side,vx:-20};
  for(let t=0;t<4;t+=dt)step(g,{left:true,right:true},dt);
  assert.ok(Math.abs(g.z)<.08);assert.ok(Math.abs(g.roll-Math.PI)<.01);assert.ok(Math.abs(g.vx+20)<.001);
 }
});

test('paired thrust adds lift, tilt changes direction, release restores gravity',()=>{
 const make=()=>({...fresh(),phase:'flight',x:-20,y:100});
 const off=make(),single=make(),both=make();step(off,{},.001);step(single,{left:true},.001);step(both,{left:true,right:true},.001);
 assert.ok(both.vy>0);assert.ok(single.vy>off.vy);assert.ok(Math.abs((both.vy-off.vy)-2*(single.vy-off.vy))<.00001);assert.equal(both.omega,0);
 const tilt={...make(),pitch:Math.PI/4};step(tilt,{left:true,right:true},.01);assert.ok(tilt.vx<0);
 const before=both.vy;step(both,{},.01);assert.ok(both.vy<before);
});

test('perfect landing earns 50 bonus; tilted hard or spinning contacts do not',()=>{const base={...fresh(),vy:-2};const perfect=grade(base);assert.equal(perfect.bonus,50);assert.equal(perfect.perfect,true);for(const change of [{roll:.2},{vy:-4},{omega:1},{roll:Math.PI}]){const r=grade({...base,...change});assert.equal(r.bonus,0);assert.equal(r.perfect,false);}assert.equal(perfect.score,94);});
