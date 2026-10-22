import * as THREE from './vendor/three.module.js';
function plumeTexture(smoke=false){
 const c=document.createElement('canvas');c.width=c.height=128;const ctx=c.getContext('2d'),g=ctx.createRadialGradient(64,70,2,64,64,60);
 if(smoke){g.addColorStop(0,'rgba(45,43,42,.8)');g.addColorStop(.5,'rgba(65,60,56,.6)');g.addColorStop(1,'rgba(65,60,56,0)');}
 else{g.addColorStop(0,'#fffde1');g.addColorStop(.2,'#ffef68');g.addColorStop(.45,'#ff9c18');g.addColorStop(.7,'rgba(255,52,0,.8)');g.addColorStop(1,'rgba(190,20,0,0)');}
 ctx.fillStyle=g;ctx.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);
}
export class LandingEffects {
 constructor(scene){this.group=new THREE.Group();this.group.renderOrder=100;scene.add(this.group);this.age=99;this.parts=[];this.fireTexture=plumeTexture();this.smokeTexture=plumeTexture(true);}
 reset(){for(const p of this.parts){if(p.mesh.isMesh)p.mesh.geometry.dispose();p.mesh.material.dispose();}this.parts=[];this.group.clear();this.age=99;this.crash=false;}
 trigger(g,crash,perfect){this.reset();this.age=0;this.crash=crash;this.group.position.set(g.x,g.y,g.z);
  for(let i=0;i<(crash?85:24);i++){
   const mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(crash?.19:.08,0),new THREE.MeshBasicMaterial({color:crash?(i%3?0xff7b13:0xffef9c):perfect?0xffe86a:0xaaffcb,transparent:true,depthWrite:false}));
   const angle=Math.random()*Math.PI*2,speed=crash?4+Math.random()*10:2+Math.random()*3;
   this.group.add(mesh);this.parts.push({mesh,kind:'spark',v:new THREE.Vector3(Math.cos(angle)*speed,3+Math.random()*9,Math.sin(angle)*speed)});
  }
  if(crash){
   for(let i=0;i<40;i++){
    const smoke=i>=24,mesh=new THREE.Sprite(new THREE.SpriteMaterial({map:smoke?this.smokeTexture:this.fireTexture,transparent:true,depthWrite:false,blending:smoke?THREE.NormalBlending:THREE.AdditiveBlending}));
    this.group.add(mesh);this.parts.push({mesh,kind:smoke?'smoke':'flame',seed:Math.random(),x:(Math.random()-.5)*3,z:(Math.random()-.5)*2});
   }
   const ball=new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({color:0xffd351,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));this.group.add(ball);this.parts.push({mesh:ball,kind:'ball'});
   const ring=new THREE.Mesh(new THREE.RingGeometry(.8,1,48),new THREE.MeshBasicMaterial({color:0xffc05a,transparent:true,depthWrite:false,side:THREE.DoubleSide}));ring.rotation.x=-Math.PI/2;ring.position.y=-.55;this.group.add(ring);this.parts.push({mesh:ring,kind:'ring'});
  }
  // Draw the whole impact layer after runway decals; flames remain above smoke.
  const order={ring:100,smoke:101,flame:102,spark:103,ball:104};
  for(const p of this.parts){p.mesh.renderOrder=order[p.kind];p.mesh.material.depthTest=false;}
  this.light=new THREE.PointLight(crash?0xff681c:0xffee99,crash?110:12,30);this.group.add(this.light);
 }
 update(dt){this.age+=dt;const t=this.age;if(t>(this.crash?7:3)){if(this.parts.length)this.reset();return;}
  const burn=Math.max(0,Math.min(1,(6-t)/2));this.light.intensity=this.crash?(75*Math.max(0,1-t/.6)+burn*(24+8*Math.sin(t*27))):Math.max(0,12*(1-t/.5));
  for(const p of this.parts){const m=p.mesh;
   if(p.kind==='spark'){p.v.y-=9*dt;m.position.addScaledVector(p.v,dt);m.rotation.x+=dt*4;m.rotation.z+=dt*3;m.material.opacity=Math.max(0,1-t/2);}
   else if(p.kind==='ball'){m.scale.setScalar(.5+Math.min(t,.65)*7);m.material.opacity=Math.max(0,1-t/.65)*.85;}
   else if(p.kind==='ring'){m.scale.setScalar(1+t*15);m.material.opacity=Math.max(0,1-t/.8);}
   else{
    const smoke=p.kind==='smoke',phase=(t*(smoke?.28:1.1)+p.seed)%1;
    m.position.set(p.x+Math.sin(t*3+p.seed*20)*phase*.6,smoke?1+phase*8:phase*3.6-.3,p.z);
    const size=smoke?2+phase*4:(1.4+Math.sin(t*18+p.seed*30)*.25)*(1-phase*.55);
    m.scale.set(size,smoke?size:size*(1.8+phase),1);m.material.opacity=(smoke?.65:.85)*Math.sin(Math.PI*phase)*(smoke?Math.max(0,Math.min(1,7-t)):burn);
   }
  }
 }
}
