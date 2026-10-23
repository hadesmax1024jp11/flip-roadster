import * as T from './vendor/three.module.js';
const loader=new T.TextureLoader();const cache=new Map();
export function texture(path,color=true){if(!cache.has(path)){const t=loader.load('assets/'+path);t.colorSpace=color?T.SRGBColorSpace:T.NoColorSpace;cache.set(path,t);}return cache.get(path);}
export class AtlasPool {
 constructor(scene,path,count,grid=1,additive=false,order=5){
  this.count=count;this.cursor=0;this.grid=grid;this.parts=Array.from({length:count},()=>({age:99,life:1,x:0,y:0,z:0,vx:0,vy:0,vz:0,size:1,seed:0,alpha:1,rotation:0,color:new T.Color(1,1,1)}));
  const geo=new T.PlaneGeometry(1,1);this.frames=new Float32Array(count);this.alphas=new Float32Array(count);
  geo.setAttribute('tile',new T.InstancedBufferAttribute(this.frames,1));geo.setAttribute('fade',new T.InstancedBufferAttribute(this.alphas,1));
  const material=new T.MeshBasicMaterial({map:texture(path),transparent:true,depthWrite:false,side:T.DoubleSide,blending:additive?T.AdditiveBlending:T.NormalBlending,toneMapped:!additive});
  material.onBeforeCompile=shader=>{
   shader.vertexShader='attribute float tile; attribute float fade; varying float vFade;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <uv_vertex>',`#include <uv_vertex>\nvFade=fade;vMapUv=(vMapUv*0.98+0.01+vec2(mod(tile,${grid}.0),${grid-1}.0-floor(tile/${grid}.0)))/${grid}.0;`);
   shader.fragmentShader='varying float vFade;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=vFade;');
  };
  material.customProgramCacheKey=()=>`atlas-${grid}-${additive}`;
  this.mesh=new T.InstancedMesh(geo,material,count);this.mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);this.mesh.frustumCulled=false;this.mesh.renderOrder=order;scene.add(this.mesh);this.dummy=new T.Object3D();
  for(let i=0;i<count;i++){this.dummy.scale.setScalar(0);this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);this.mesh.setColorAt(i,new T.Color(1,1,1));}
 }
 spawn(values){const p=this.parts[this.cursor++%this.count];Object.assign(p,values,{age:0});return p;}
 reset(){for(const p of this.parts)p.age=p.life;}
 draw(camera,frameFunction){
  const alive=this.parts.some(p=>p.age<p.life);this.mesh.visible=alive;if(!alive)return;
  const d=this.dummy;
  for(let i=0;i<this.count;i++){
   const p=this.parts[i],alive=p.age<p.life;this.alphas[i]=alive?p.alpha:0;
   d.position.set(p.x,p.y,p.z);d.quaternion.copy(camera.quaternion);d.rotateZ(p.rotation||0);d.scale.set(alive?p.size:0,alive?p.size*(p.stretch||1):0,1);d.updateMatrix();this.mesh.setMatrixAt(i,d.matrix);this.mesh.setColorAt(i,p.color);
   this.frames[i]=alive?Math.min(this.grid*this.grid-1,Math.max(0,frameFunction?frameFunction(p):Math.floor(p.age/p.life*this.grid*this.grid))):0;
  }
  this.mesh.instanceMatrix.needsUpdate=true;this.mesh.instanceColor.needsUpdate=true;this.mesh.geometry.attributes.tile.needsUpdate=true;this.mesh.geometry.attributes.fade.needsUpdate=true;
 }
}
// Merge static meshes by material after baking their local transforms.
export function batchStatic(root,filter=()=>true){
 const groups=new Map();root.updateMatrixWorld(true);
 for(const m of [...root.children])if(m.isMesh&&!m.isInstancedMesh&&!Array.isArray(m.material)&&filter(m)){
  const key=m.material.uuid;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(m);
 }
 for(const list of groups.values()){
  if(list.length<2)continue;const positions=[],normals=[],uvs=[];
  for(const m of list){const g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrix);const pos=g.attributes.position,normal=g.attributes.normal,uv=g.attributes.uv;
   positions.push(...pos.array);normals.push(...normal.array);uvs.push(...(uv?uv.array:new Float32Array(pos.count*2)));g.dispose();root.remove(m);
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('normal',new T.Float32BufferAttribute(normals,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.computeBoundingSphere();
  const merged=new T.Mesh(geo,list[0].material);merged.castShadow=list.some(m=>m.castShadow);merged.receiveShadow=true;root.add(merged);
 }
}
