import * as THREE from './vendor/three.module.js';
import {groundHeight} from './physics.js?v=2.8.1';
// A bounded particle approximation of impinging jets spreading along the ground.
// Momentum, drag and turbulent mixing are modelled visually, not full fluid dynamics.
export class GroundWash {
 constructor(scene){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d');
  for(let i=0;i<24;i++){
   const x=16+Math.random()*32,y=16+Math.random()*32,r=8+Math.random()*16;
   const gradient=ctx.createRadialGradient(x,y,0,x,y,r);
   gradient.addColorStop(0,'rgba(222,242,244,.12)');gradient.addColorStop(1,'rgba(222,242,244,0)');
   ctx.fillStyle=gradient;ctx.fillRect(0,0,64,64);
  }
  // Feather the entire tile so overlapping wisps never reveal rectangular edges.
  ctx.globalCompositeOperation='destination-in';
  const edge=ctx.createRadialGradient(32,32,8,32,32,31);
  edge.addColorStop(0,'rgba(255,255,255,1)');edge.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=edge;ctx.fillRect(0,0,64,64);
  this.texture=new THREE.CanvasTexture(canvas);this.texture.colorSpace=THREE.SRGBColorSpace;
  this.cursor=0;this.budget=[0,0,0,0];
  this.parts=Array.from({length:288},()=>{
   const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:this.texture,transparent:true,depthWrite:false,opacity:0}));
   sprite.visible=false;sprite.renderOrder=5;scene.add(sprite);
   return {sprite,age:2,life:1,vx:0,vz:0,seed:0,strength:0};
  });
 }
 reset(){for(const p of this.parts){p.sprite.visible=false;p.age=p.life;}this.budget.fill(0);}
 emit(index,origin,direction,strength,dt,velocity){
  if(strength<=0||direction.y>=-.5){this.budget[index]=0;return;}
  const height=Math.max(0,origin.y-groundHeight(origin.x,origin.z));
  const distance=Math.min(8,height/-direction.y);
  const x=origin.x+direction.x*distance,z=origin.z+direction.z*distance;
  this.budget[index]+=dt*(35+65*strength);
  while(this.budget[index]>=1){
   this.budget[index]--;const p=this.parts[this.cursor++%this.parts.length];
   const angle=Math.random()*Math.PI*2,speed=(3+Math.random()*5)*(.5+strength);
   p.age=0;p.life=.7+Math.random()*.8;p.seed=Math.random()*20;p.strength=strength;
   p.vx=Math.cos(angle)*speed+direction.x*3+velocity.x*.16;
   p.vz=Math.sin(angle)*speed+direction.z*3+velocity.z*.16;
   p.sprite.position.set(x+Math.cos(angle)*.15,groundHeight(x,z)+.16,z+Math.sin(angle)*.15);
   p.sprite.material.rotation=Math.random()*Math.PI*2;p.sprite.material.opacity=0;p.sprite.visible=true;
   p.sprite.scale.set(.45,.2,1);
  }
 }
 update(dt){
  for(const p of this.parts){
   if(!p.sprite.visible)continue;p.age+=dt;
   if(p.age>=p.life){p.sprite.visible=false;continue;}
   const t=p.age/p.life,drag=Math.exp(-1.8*dt);
   p.vx=(p.vx+Math.sin(p.seed+p.age*12)*2.5*dt)*drag;
   p.vz=(p.vz+Math.cos(p.seed+p.age*10)*2.5*dt)*drag;
   p.sprite.position.x+=p.vx*dt;p.sprite.position.z+=p.vz*dt;
   
   const size=.45+p.age*(1.8+p.strength);
   p.sprite.scale.set(size,size*(.32+t*.12),1);
   p.sprite.position.y=groundHeight(p.sprite.position.x,p.sprite.position.z)+.08+size*.24+Math.sin(p.seed+p.age*8)*.04;
   p.sprite.material.rotation+=Math.sin(p.seed)*dt*.5;
   p.sprite.material.opacity=Math.min(1,p.age/.08)*Math.pow(1-t,1.4)*(.3+p.strength*.35);
  }
 }
}
