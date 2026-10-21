export const R=12, START=-26, WALL=18, END=44+Math.PI*R;
// Front/rear tyres have finite extent: centre-only clearance clips a curved road.
export const CLEARANCE=.84;
export const AIR_CAPACITY=100;
export const MASS=1200, JET_THRUST=4200, ROLL_INERTIA=450;
export function pose(s){if(s<44)return{x:START+s,y:.72+.12*Math.max(0,Math.min(1,(s-40)/4)),pitch:0};const t=(s-44)/R;return{x:WALL+(R-CLEARANCE)*Math.sin(t),y:R-(R-CLEARANCE)*Math.cos(t),pitch:t};}
export const hull=[];
for(const x of [-1.85,1.85])for(const y of [-.16,.4])for(const z of [-.9,.9])hull.push([x,y,z]);
for(const x of [-1.075,.575])for(const y of [.35,.94])for(const z of [-.76,.76])hull.push([x,y,z]);
for(const x of [-1.12,1.12])for(const z of [-1.1,1.1])for(let i=0;i<32;i++){const a=i*Math.PI/16;hull.push([x+.4*Math.cos(a),-.3+.4*Math.sin(a),z]);}
export function worldHull(g){const c=Math.cos(g.pitch),s=Math.sin(g.pitch),cr=Math.cos(g.roll),sr=Math.sin(g.roll);return hull.map(([x,y,z])=>{const ry=y*cr-z*sr;return [g.x+x*c-ry*s,g.y+x*s+ry*c,g.z+y*sr+z*cr];});}
export function hitsWall(g){return worldHull(g).some(([x,y,z])=>Math.abs(z)<4.5&&x>WALL&&y>0&&y<2*R&&Math.hypot(x-WALL,y-R)>R+.015);}
// A car leaving its supporting surface is still in contact, not a new impact.
// Project the full hull back inside and cancel only velocity into the wall.
export function resolveDepartureContact(g){
 if(!g.departureContact)return;
 for(let iteration=0;iteration<16;iteration++){
  let contact=null,depth=0;
  for(const [x,y,z] of worldHull(g)){
   if(Math.abs(z)>=4.5||x<=WALL||y<=0||y>=2*R)continue;
   const radius=Math.hypot(x-WALL,y-R),penetration=radius-R+.01;
   if(penetration>depth){depth=penetration;contact=[(x-WALL)/radius,(y-R)/radius];}
  }
  if(!contact)break;
  const [nx,ny]=contact;g.x-=nx*depth;g.y-=ny*depth;
  const into=g.vx*nx+g.vy*ny;
  if(into>0){g.vx-=into*nx;g.vy-=into*ny;}
 }
 const near=worldHull(g).some(([x,y,z])=>Math.abs(z)<4.5&&x>WALL&&y>0&&y<2*R&&Math.hypot(x-WALL,y-R)>R-.35);
 if(!near)g.departureContact=false;
}
export function fresh(){return{s:0,x:START,y:.72,z:0,v:0,vx:0,vy:0,vz:0,pitch:0,roll:0,omega:0,air:AIR_CAPACITY,travel:0,phase:'track',reason:'',time:0};}
export function grade(g){const upright=Math.cos(g.pitch)*Math.cos(g.roll);const tilt=Math.acos(Math.max(-1,Math.min(1,upright)))*180/Math.PI;const impact=Math.max(0,-g.vy);const ok=tilt<24&&impact<8&&Math.abs(g.omega)<2.6;const rolls=g.travel/(Math.PI*2);const rotation=Math.min(50,rolls*100)+Math.max(0,Math.floor(rolls)-1)*25;const soft=Math.max(0,30-impact*3);const level=Math.max(0,20-tilt*.83);const perfect=ok&&tilt<8&&impact<3&&Math.abs(g.omega)<.5;const bonus=perfect?50:0;return{ok,perfect,bonus,tilt,impact,rolls,rotation:Math.round(rotation),soft:Math.round(soft),level:Math.round(level),score:ok?Math.round(rotation+soft+level)+bonus:0};}
export function step(g,input,dt){if(g.phase==='done')return;g.time+=dt;let l=!!input.left&&g.air>0,r=!!input.right&&g.air>0,stick=!!input.stick&&g.air>0;g.air=Math.max(0,g.air-dt*((l?8:0)+(r?8:0)+(stick&&g.phase==='track'?4:0)));if(g.phase==='track'){
g.v=Math.max(0,Math.min(20,g.v+((input.drive?10:0)-1.8-4*Math.sin(g.pitch))*dt));g.s+=g.v*dt;Object.assign(g,pose(Math.min(END,g.s)));if(g.s>=END||g.pitch>Math.PI*.54&&!stick||l||r){g.phase='flight';g.departureContact=g.s<END;g.vx=Math.cos(g.pitch)*g.v;g.vy=Math.sin(g.pitch)*g.v;g.reason=g.s<END&&g.pitch>Math.PI*.54&&!stick?'吸附中斷，車輛從反曲牆脫落。請在爬牆時同時按住 X 吸附與空白鍵前進。':'';if(l||r){g.vx-=Math.sin(g.pitch)*2;g.vy+=Math.cos(g.pitch)*2;}}}
if(g.phase==='flight'){

 // Assist the final half of a roll when the player releases the single jet.
 const leveling=l===r&&Math.cos(g.pitch)*Math.cos(g.roll)>0;
 const targetRoll=Math.cos(g.pitch)<0?Math.PI:0;
 const rollError=Math.atan2(Math.sin(targetRoll-g.roll),Math.cos(targetRoll-g.roll));
 g.omega+=((Number(l)-Number(r))*2*JET_THRUST*.95/ROLL_INERTIA+(leveling?8*rollError:0)-g.omega*(leveling?4.5:1.8))*dt;
 g.roll+=g.omega*dt;g.travel+=Math.abs(g.omega*dt);
 // Flight trim: smoothly lower the nose by six degrees once clear and upright.
 // This rotates the existing jet force forward, rather than adding free thrust.
 if(!g.departureContact&&Math.cos(g.pitch)*Math.cos(g.roll)>.85){
  const heading=Math.cos(g.pitch)<0?Math.PI:0;
  const targetPitch=heading+(heading?1:-1)*Math.PI/30;
  const pitchError=Math.atan2(Math.sin(targetPitch-g.pitch),Math.cos(targetPitch-g.pitch));
  g.pitch+=pitchError*(1-Math.exp(-2*dt));
 }
 const upright=Math.cos(g.pitch)*Math.cos(g.roll);
 // Conserve forward momentum; aerodynamic lift supports a moving upright car.
 const glide=Math.max(0,upright)*Math.min(1,Math.abs(g.vx)/10);
 const gravity=9.81-4.5*glide;
 // Each side fires two nozzles. F = m*a; equal sides cancel roll torque.
 const force=(Number(l)+Number(r))*2*JET_THRUST/MASS;
 // Rotate body-up into world space so tilted jets also accelerate horizontally.
 g.vx+=-Math.sin(g.pitch)*Math.cos(g.roll)*force*.5*dt;
 g.vy+=(upright*force-gravity)*dt;
 // Lane assistance remains an explicit stabilising force for easier control.
 g.vz+=(Math.sin(g.roll)*force-6*g.z-5*g.vz)*dt;
 g.x+=g.vx*dt;g.y+=g.vy*dt;g.z+=g.vz*dt;
resolveDepartureContact(g);
if(g.y<.72){g.result=grade(g);g.impactKind='ground';if(!g.result.ok)g.result.score=0;g.y=.72;g.phase='done';}else if(hitsWall(g)){g.impactKind='wall';g.reason='車輛離牆後再次撞上跑道。請在飛出頂端後控制翻轉方向。';g.result={...grade(g),ok:false,perfect:false,bonus:0,score:0};g.phase='done';}if(g.time>45){g.reason='飛行時間結束。';g.result={...grade(g),ok:false,score:0};g.phase='done';}}
}
