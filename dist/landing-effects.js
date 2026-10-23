import * as T from './vendor/three.module.js';
import {AtlasPool,texture} from './visual-core.js';
import {groundHeight} from './physics.js';
export class LandingEffects {
 constructor(scene){
  this.age=99;this.crash=false;this.center=new T.Vector3();
  this.fire=new AtlasPool(scene,'vfx/explosion_fireball_sheet.png',16,6,true,104);
  this.smoke=new AtlasPool(scene,'vfx/smoke_plume_sheet.png',20,4,false,101);
  this.sparks=new AtlasPool(scene,'vfx/spark_streak.png',40,1,true,103);
  this.debris=new AtlasPool(scene,'vfx/debris_atlas.png',20,4,false,102);
  this.confetti=new AtlasPool(scene,'vfx/celebrate_atlas.png',28,4,true,103);
  this.pools=[this.fire,this.smoke,this.sparks,this.debris,this.confetti];
  this.light=new T.PointLight(0xff8138,0,30);scene.add(this.light);
  const decal=(path,order)=>{const m=new T.Mesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:texture(path),transparent:true,depthWrite:false,opacity:0,polygonOffset:true,polygonOffsetFactor:-3}));m.rotation.x=-Math.PI/2;m.renderOrder=order;scene.add(m);return m;};
  this.scorch=decal('vfx/scorch_decal.png',3);this.ring=decal('vfx/shockwave_ring.png',6);
 }
 reset(){for(const pool of this.pools)pool.reset();this.age=99;this.crash=false;this.light.intensity=0;this.scorch.material.opacity=0;this.ring.material.opacity=0;}
 trigger(g,crash,perfect){
  this.reset();this.age=0;this.crash=crash;this.center.set(g.x,g.y,g.z);this.light.position.copy(this.center);this.light.color.set(crash?0xff8138:0xe5ff9e);
  const floor=groundHeight(g.x,g.z);this.scorch.position.set(g.x,floor+.025,g.z);this.scorch.scale.setScalar(6);this.scorch.material.opacity=crash?.75:0;
  this.ring.position.set(g.x,floor+.04,g.z);this.ring.material.color.set(crash?0xffa854:0xdafa8e);
  const burst=(pool,count,life,speed)=>{for(let i=0;i<count;i++){const a=Math.random()*Math.PI*2,v=speed*(.4+Math.random()*.6);const p=pool.spawn({x:g.x+(Math.random()-.5),y:g.y+.2,z:g.z+(Math.random()-.5),vx:Math.cos(a)*v,vy:2+Math.random()*speed,vz:Math.sin(a)*v,life:life*(.7+Math.random()*.3),seed:Math.random(),tile:i%16,size:.2,alpha:1,rotation:Math.random()*6,stretch:1});p.color.set(crash?0xffffff:perfect?0xffea9a:0xdafa8e);}};
  if(crash){burst(this.fire,16,1.5,1.4);burst(this.smoke,20,6,1.5);burst(this.sparks,40,1.6,10);burst(this.debris,20,3.5,5);}
  else burst(this.confetti,perfect?28:12,2.2,4);
 }
 update(dt){this.age+=dt;const t=this.age;if(t>8)return;
  this.light.intensity=this.crash?100*Math.exp(-t*5)+18*Math.max(0,1-t/5)*(1+.2*Math.sin(t*25)):20*Math.exp(-t*5);
  this.ring.scale.setScalar(1+t*16);this.ring.material.opacity=Math.max(0,1-t/.7)*.8;
  for(const pool of this.pools)for(const p of pool.parts){
   if(p.age>=p.life)continue;p.age+=dt;const k=p.age/p.life;
   if(pool===this.fire){p.x+=p.vx*dt*.2;p.z+=p.vz*dt*.2;p.y+=dt*.8;p.size=2.5+k*5;p.alpha=(1-k)*1.6;p.rotation=0;}
   else if(pool===this.smoke){p.x+=p.vx*dt*.4;p.z+=p.vz*dt*.4;p.y+=dt*(1.2+k);p.size=2+k*5;p.alpha=Math.sin(Math.PI*k)*.65;p.rotation=0;}
   else {p.vy-=dt*(pool===this.confetti?4:9.8);p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;const floor=groundHeight(p.x,p.z)+.12;if(p.y<floor){p.y=floor;p.vy=Math.abs(p.vy)*.22;p.vx*=.7;p.vz*=.7;}p.rotation+=dt*3;p.alpha=1-k;
    if(pool===this.sparks){p.size=.08;p.stretch=5+Math.hypot(p.vx,p.vy,p.vz)*.5;}
    else p.size=pool===this.debris?.35:.2;
   }
  }
  // Persistent tongues of fire continue after the initial fireball animation.
  if(this.crash&&t<4)for(const p of this.fire.parts)if(p.age>=p.life){p.age=0;p.life=.7+Math.random()*.4;p.x=this.center.x+(Math.random()-.5)*2;p.z=this.center.z+(Math.random()-.5);p.y=groundHeight(p.x,p.z)+.4;}
 }
 render(camera){for(const p of this.pools)p.draw(camera,p===this.debris||p===this.confetti?q=>q.tile:undefined);}
}
