import * as THREE from './vendor/three.module.js';

// Reference-inspired silver wedge coupe; +X is the nose, +Y is the roof.
export function createRoadster(){
 const car=new THREE.Group();
 const silver=new THREE.MeshStandardMaterial({color:'#d5d9de',metalness:.52,roughness:.28});
 const glass=new THREE.MeshStandardMaterial({color:'#172127',metalness:.35,roughness:.16});
 const black=new THREE.MeshStandardMaterial({color:'#101619',roughness:.7});
 const rim=new THREE.MeshStandardMaterial({color:'#8b959d',metalness:.7,roughness:.27});
 const lamp=new THREE.MeshBasicMaterial({color:'#e9fbff'});
 const red=new THREE.MeshBasicMaterial({color:'#ff493c'});
 function add(geo,mat,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;car.add(m);return m;}
 function box(w,h,d,mat,x,y,z){return add(new THREE.BoxGeometry(w,h,d),mat,x,y,z);}
 // Cross-sections form a tapered nose, shoulder crease and low rear deck.
 function loft(sections,material){
  const vertices=[],indices=[];
  for(const [x,bottom,shoulder,top,width,topWidth] of sections){
   for(const [y,z] of [[bottom,-width*.94],[shoulder,-width],[top,-topWidth],[top,topWidth],[shoulder,width],[bottom,width*.94]])vertices.push(x,y,z);
  }
  for(let i=0;i<sections.length-1;i++)for(let j=0;j<6;j++){const a=i*6+j,b=i*6+(j+1)%6,c=a+6,d=b+6;indices.push(a,b,c,b,d,c);}
  for(let j=1;j<5;j++){indices.push(0,j+1,j);const o=(sections.length-1)*6;indices.push(o,o+j,o+j+1);}
  const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
  // The mesh is closed; double-sided material also supports inverted close views.
  material.side=THREE.DoubleSide;return add(geo,material);
 }
 loft([[-1.82,-.16,.24,.36,.82,.75],[-1.45,-.16,.34,.42,.9,.78],[-.7,-.16,.34,.4,.9,.74],[.45,-.16,.32,.38,.9,.74],[1.15,-.16,.28,.34,.88,.76],[1.82,-.12,.08,.17,.76,.7]],silver);
 // Continuous dark windshield / glass roof / rear glass silhouette.
 loft([[-1.3,.35,.38,.4,.73,.66],[-.72,.39,.75,.86,.73,.62],[-.13,.39,.82,.91,.73,.61],[.35,.38,.73,.82,.72,.6],[1.05,.33,.34,.37,.72,.68]],glass);
 function trim(a,b,r=.023,material=silver){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const m=add(new THREE.CylinderGeometry(r,r,delta.length(),6),material);m.position.copy(start.add(end).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
 for(const side of [-1,1]){
  const z=side*.74;
  trim([-1.3,.4,z],[-.72,.84,side*.64]);trim([-.72,.84,side*.64],[-.13,.91,side*.63]);trim([-.13,.91,side*.63],[.35,.82,side*.62]);trim([.35,.82,side*.62],[1.05,.37,z]);
  trim([-.43,.39,z],[-.43,.87,side*.64],.012,black);
  trim([-.62,-.12,side*.907],[-.62,.34,side*.907],.007,black);
  box(.21,.025,.018,black,-.4,.28,side*.906);
  box(2.55,.075,.07,black,0,-.14,side*.89);
  box(.16,.065,.15,silver,.58,.4,side*.94);
  box(.12,.024,.018,new THREE.MeshBasicMaterial({color:'#ffaf46'}),.7,.22,side*.91);
 }
 // Full-width light signature and dark lower splitter.
 box(.035,.034,1.48,lamp,1.84,.095,0);
 box(.035,.15,1.46,black,1.837,-.005,0);
 box(.13,.045,1.62,black,1.78,-.12,0);
 box(.035,.035,1.46,red,-1.84,.25,0);
 box(.05,.13,1.5,black,-1.83,-.04,0);
 const wheels=[];
 for(const x of [-1.12,1.12])for(const side of [-1,1]){
  const z=side*.95;
  const tyre=add(new THREE.CylinderGeometry(.4,.4,.3,32),black,x,-.3,z);tyre.rotation.x=Math.PI/2;wheels.push(tyre);
  const disk=add(new THREE.CylinderGeometry(.315,.315,.012,32),black,x,-.3,side*1.106);disk.rotation.x=Math.PI/2;
  for(let i=0;i<5;i++){
   const a=i*Math.PI*2/5;
   const spoke=box(.075,.5,.015,rim,x,-.3,side*1.116);spoke.rotation.z=a;
  }
  const hub=add(new THREE.CylinderGeometry(.085,.085,.02,12),rim,x,-.3,side*1.13);hub.rotation.x=Math.PI/2;
 }
 return {car,wheels};
}
