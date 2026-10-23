import * as T from './vendor/three.module.js';
import {AtlasPool} from './visual-core.js';
import {groundHeight} from './physics.js';
export class GroundWash {
 constructor(scene){this.pool=new AtlasPool(scene,'vfx/ground_mist_sheet.png',160,4);this.budget=[0,0,0,0];}
 reset(){this.pool.reset();this.budget.fill(0);}
 emit(index,origin,direction,strength,dt,velocity){
  if(strength<=0||direction.y>=-.5){this.budget[index]=0;return;}
  const distance=Math.min(8,Math.max(0,origin.y-groundHeight(origin.x,origin.z))/-direction.y);
  const x=origin.x+direction.x*distance,z=origin.z+direction.z*distance;
  this.budget[index]+=dt*(12+28*strength);
  while(this.budget[index]>=1){this.budget[index]--;const a=Math.random()*Math.PI*2,speed=(2+Math.random()*3)*(.5+strength);
   this.pool.spawn({x,y:groundHeight(x,z)+.25,z,vx:Math.cos(a)*speed+velocity.x*.12,vz:Math.sin(a)*speed+velocity.z*.12,life:1.2+Math.random()*.6,size:.4,seed:Math.random()*20,alpha:.4,strength,rotation:0,stretch:1});
  }
 }
 update(dt){for(const p of this.pool.parts){if(p.age>=p.life)continue;p.age+=dt;const t=p.age/p.life,drag=Math.exp(-1.6*dt);p.vx=(p.vx+Math.sin(p.seed+p.age*5)*dt)*drag;p.vz=(p.vz+Math.cos(p.seed+p.age*6)*dt)*drag;p.x+=p.vx*dt;p.z+=p.vz*dt;p.size=.7+t*2.2;p.y=groundHeight(p.x,p.z)+p.size*.3;p.alpha=Math.min(1,t*9)*(1-t)*(.45+p.strength*.35);}}
 render(camera){this.pool.draw(camera);}
}
