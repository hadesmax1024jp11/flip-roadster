import * as THREE from './vendor/three.module.js';
export class LandingEffects {
 constructor(scene){this.scene=scene;this.group=new THREE.Group();scene.add(this.group);this.age=99;this.parts=[];}
 reset(){for(const p of this.parts){p.mesh.geometry.dispose();p.mesh.material.dispose();}this.parts=[];this.group.clear();this.age=99;this.crash=false;}
 trigger(g,crash,perfect){this.reset();this.age=0;this.crash=crash;this.group.position.set(g.x,g.y,g.z);
  const count=crash?65:24;
  for(let i=0;i<count;i++){
   const smoke=crash&&i>40;
   const material=new THREE.MeshBasicMaterial({color:crash?(smoke?0x50565a:i%3?0xff8a24:0xffef9c):perfect?0xffe86a:0xaaffcb,transparent:true,opacity:1,depthWrite:false});
   const mesh=new THREE.Mesh(smoke?new THREE.SphereGeometry(.45,6,4):new THREE.IcosahedronGeometry(crash?.16:.08,0),material);
   const angle=Math.random()*Math.PI*2,speed=crash?3+Math.random()*7:2+Math.random()*3;
   const v=new THREE.Vector3(Math.cos(angle)*speed,2+Math.random()*(crash?7:3),Math.sin(angle)*speed);
   this.group.add(mesh);this.parts.push({mesh,v,smoke});
  }
  this.light=new THREE.PointLight(crash?0xff8822:0xffee99,crash?45:12,25);this.group.add(this.light);
 }
 update(dt){this.age+=dt;if(this.age>3){if(this.parts.length)this.reset();return;}
  this.light.intensity=Math.max(0,(this.crash?45:12)*(1-this.age/.5));
  for(const p of this.parts){p.v.y+=(p.smoke?.6:-7)*dt;p.mesh.position.addScaledVector(p.v,dt);p.mesh.rotation.x+=dt*3;p.mesh.rotation.z+=dt*2;if(p.smoke)p.mesh.scale.setScalar(1+this.age*2.5);p.mesh.material.opacity=Math.max(0,1-this.age/(p.smoke?3:1.7));}
 }
}
