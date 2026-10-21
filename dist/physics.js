export const R=12, START=-26, WALL=18, END=44+Math.PI*R;
// Front/rear tyres have finite extent: centre-only clearance clips a curved road.
export const CLEARANCE=.84;
export function pose(s){if(s<44)return{x:START+s,y:.72+.12*Math.max(0,Math.min(1,(s-40)/4)),pitch:0};const t=(s-44)/R;return{x:WALL+(R-CLEARANCE)*Math.sin(t),y:R-(R-CLEARANCE)*Math.cos(t),pitch:t};}
export const hull=[];
for(const x of [-1.85,1.85])for(const y of [-.16,.4])for(const z of [-.9,.9])hull.push([x,y,z]);
for(const x of [-1.075,.575])for(const y of [.35,.94])for(const z of [-.76,.76])hull.push([x,y,z]);
for(const x of [-1.12,1.12])for(const z of [-1.1,1.1])for(let i=0;i<32;i++){const a=i*Math.PI/16;hull.push([x+.4*Math.cos(a),-.3+.4*Math.sin(a),z]);}
export function worldHull(g){const c=Math.cos(g.pitch),s=Math.sin(g.pitch),cr=Math.cos(g.roll),sr=Math.sin(g.roll);return hull.map(([x,y,z])=>{const ry=y*cr-z*sr;return [g.x+x*c-ry*s,g.y+x*s+ry*c,g.z+y*sr+z*cr];});}
export function hitsWall(g){return worldHull(g).some(([x,y,z])=>Math.abs(z)<4.5&&x>WALL&&y>0&&y<2*R&&Math.hypot(x-WALL,y-R)>R+.015);}
export function fresh(){return{s:0,x:START,y:.72,z:0,v:0,vx:0,vy:0,vz:0,pitch:0,roll:0,omega:0,air:100,travel:0,phase:'track',reason:'',time:0};}
export function grade(g){const upright=Math.cos(g.pitch)*Math.cos(g.roll);const tilt=Math.acos(Math.max(-1,Math.min(1,upright)))*180/Math.PI;const impact=Math.max(0,-g.vy);const ok=tilt<24&&impact<8&&Math.abs(g.omega)<2.6;const rolls=g.travel/(Math.PI*2);const rotation=Math.min(50,rolls*100)+Math.max(0,Math.floor(rolls)-1)*25;const soft=Math.max(0,30-impact*3);const level=Math.max(0,20-tilt*.83);return{ok,tilt,impact,rolls,rotation:Math.round(rotation),soft:Math.round(soft),level:Math.round(level),score:ok?Math.round(rotation+soft+level):0};}
export function step(g,input,dt){if(g.phase==='done')return;g.time+=dt;let l=!!input.left&&g.air>0,r=!!input.right&&g.air>0,stick=!!input.stick&&g.air>0;g.air=Math.max(0,g.air-dt*((l?8:0)+(r?8:0)+(stick&&g.phase==='track'?4:0)));if(g.phase==='track'){
g.v=Math.max(0,Math.min(20,g.v+((input.drive?10:0)-1.8-4*Math.sin(g.pitch))*dt));g.s+=g.v*dt;Object.assign(g,pose(Math.min(END,g.s)));if(g.s>=END||g.pitch>Math.PI*.54&&!stick||l||r){g.phase='flight';g.vx=Math.cos(g.pitch)*g.v;g.vy=Math.sin(g.pitch)*g.v;g.reason=g.s<END&&g.pitch>Math.PI*.54&&!stick?'吸附中斷，車輛從反曲牆脫落。':'';if(l||r){g.vx-=Math.sin(g.pitch)*2;g.vy+=Math.cos(g.pitch)*2;}}}
if(g.phase==='flight'){const force=(Number(l)+Number(r))*11.5;g.omega+=((Number(l)-Number(r))*9-g.omega*1.8)*dt;g.roll+=g.omega*dt;g.travel+=Math.abs(g.omega*dt);g.vx+=-Math.sin(g.pitch)*Math.cos(g.roll)*force*dt;g.vy+=(Math.cos(g.pitch)*Math.cos(g.roll)*force-9.81)*dt;g.vz+=Math.sin(g.roll)*force*dt;g.x+=g.vx*dt;g.y+=g.vy*dt;g.z+=g.vz*dt;
if(g.y<.72){g.result=grade(g);if(!g.result.ok)g.result.score=0;g.y=.72;g.phase='done';}else if(hitsWall(g)){g.reason='撞上反曲牆，試著等到頂端再啟動噴射。';g.result={...grade(g),ok:false,score:0};g.phase='done';}if(g.time>45){g.reason='飛行時間結束。';g.result={...grade(g),ok:false,score:0};g.phase='done';}}
}
