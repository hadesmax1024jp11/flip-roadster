import * as T from './vendor/three.module.js';
import {HDRLoader} from './vendor/HDRLoader.js';
import {texture} from './visual-core.js';
import {groundHeight} from './physics.js';
export function setupEnvironment(scene,renderer,sun){
 renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
 const sky=texture('env/sky_dome.jpg');sky.mapping=T.EquirectangularReflectionMapping;scene.background=sky;scene.backgroundIntensity=.85;
 const pmrem=new T.PMREMGenerator(renderer);pmrem.compileEquirectangularShader();
 new HDRLoader().load('assets/env/env_studio.hdr',hdr=>{scene.environment=pmrem.fromEquirectangular(hdr).texture;scene.environmentIntensity=.9;hdr.dispose();pmrem.dispose();},undefined,()=>{scene.environment=pmrem.fromEquirectangular(sky).texture;pmrem.dispose();});
 for(const [i,layer] of ['far','mid'].entries()){
  const plane=new T.Mesh(new T.PlaneGeometry(500,45),new T.MeshBasicMaterial({map:texture(`env/horizon_${layer}.webp`),transparent:true,depthWrite:false,fog:true}));plane.position.set(-120,10,-150+i*35);scene.add(plane);
 }
 const contact=new T.Mesh(new T.PlaneGeometry(5,3.3),new T.MeshBasicMaterial({map:texture('env/contact_shadow.png'),transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));contact.rotation.x=-Math.PI/2;contact.renderOrder=3;scene.add(contact);
 const marks=texture('env/runway_marks_atlas.png').clone();marks.needsUpdate=true;marks.repeat.set(.234375,.234375);marks.offset.set(.5078125,.7578125);
 const startLine=new T.Mesh(new T.PlaneGeometry(1.4,11),new T.MeshBasicMaterial({map:marks,transparent:true,depthWrite:false}));startLine.rotation.x=-Math.PI/2;startLine.position.set(-26,.13,0);startLine.renderOrder=2;scene.add(startLine);
 const landing=new T.Mesh(new T.PlaneGeometry(14,14),new T.MeshBasicMaterial({map:texture('env/landing_pad.png'),transparent:true,opacity:.55,depthWrite:false}));landing.rotation.x=-Math.PI/2;landing.position.set(-48,.13,0);landing.renderOrder=2;scene.add(landing);
 Object.assign(sun.shadow.camera,{left:-18,right:18,top:23,bottom:-13,near:1,far:130});sun.shadow.normalBias=.025;scene.add(sun.target);
 return {update(g){const floor=groundHeight(g.x,g.z),height=Math.max(0,g.y-floor-.7);contact.position.set(g.x,floor+.018,g.z);contact.material.opacity=Math.max(0,.6-height*.022);contact.scale.setScalar(1+height*.025);sun.position.set(g.x-22,g.y+45,g.z+28);sun.target.position.set(g.x,g.y,g.z);sun.target.updateMatrixWorld();sun.shadow.camera.updateProjectionMatrix();}};
}
export function surface(path,rx,ry){const t=texture(path,!/normal|orm/.test(path));t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rx,ry);t.anisotropy=4;return t;}
export function createJet(){
 const group=new T.Group(),map=texture('vfx/jet_flame_sheet.png').clone();map.needsUpdate=true;map.repeat.set(.25,.25);
 const material=new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,color:new T.Color(2,2,2),toneMapped:false});
 for(const a of [0,Math.PI/2]){const m=new T.Mesh(new T.PlaneGeometry(1.1,3.2),material);m.position.y=-1.6;m.rotation.y=a;group.add(m);}
 const glow=new T.Sprite(new T.SpriteMaterial({map:texture('vfx/nozzle_flare.png'),color:0x75e6ff,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));glow.scale.setScalar(.9);group.add(glow);group.userData.update=(time,air)=>{const frame=Math.floor(time*24)%16;map.offset.set(frame%4/4,(3-Math.floor(frame/4))/4);material.opacity=air<20?.5+.5*Math.sin(time*55)**2:1;glow.material.opacity=material.opacity;};return group;
}
export function dressCar(car){
 const glowTexture=texture('car/lamp_glow.png');
 for(const x of [-1.85,1.85]){const glow=new T.Sprite(new T.SpriteMaterial({map:glowTexture,color:x>0?0xd4faff:0xff4335,transparent:true,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));glow.position.set(x,.17,0);glow.scale.set(1.7,.22,1);car.add(glow);}
 const livery=new T.MeshBasicMaterial({map:texture('car/car_livery.png'),transparent:true,depthWrite:false,side:T.DoubleSide});
 const tyreMat=new T.MeshBasicMaterial({map:texture('car/tyre_sidewall.png'),transparent:true,depthWrite:false,side:T.DoubleSide});
 for(const x of [-1.12,1.12])for(const side of [-1,1]){const tyre=new T.Mesh(new T.CircleGeometry(.395,32),tyreMat);tyre.position.set(x,-.3,side*1.135);car.add(tyre);}
 for(const side of [-1,1]){const m=new T.Mesh(new T.PlaneGeometry(1.5,.65),livery);m.position.set(-.15,.15,side*.914);m.rotation.y=side<0?Math.PI:0;car.add(m);}
 const map=texture('vfx/magnet_arc_sheet.png').clone();map.needsUpdate=true;map.repeat.set(.5,.5);
 const magnet=new T.Mesh(new T.PlaneGeometry(3.8,2.6),new T.MeshBasicMaterial({map,transparent:true,depthWrite:false,blending:T.AdditiveBlending,side:T.DoubleSide,color:new T.Color(1.2,2,2),toneMapped:false}));magnet.rotation.x=-Math.PI/2;magnet.position.y=-.53;car.add(magnet);
 return {update(time,active){magnet.visible=active;const frame=Math.floor(time*16)%4;map.offset.set(frame%2*.5,(1-Math.floor(frame/2))*.5);magnet.material.opacity=.5+.3*Math.sin(time*20)**2;}};
}
