import * as T from './vendor/three.module.js';
// Half-resolution threshold + separable blur; bypassed on lower quality tiers.
export class VisualRenderer {
 constructor(renderer){
  this.renderer=renderer;this.level=(navigator.hardwareConcurrency||4)<=4?1:2;this.enabled=this.level===2&&renderer.extensions.has('EXT_color_buffer_float');this.samples=[];this.elapsed=0;this.ratio=0;
  this.sceneTarget=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType});this.bright=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});this.blur=new T.WebGLRenderTarget(1,1,{type:T.HalfFloatType,depthBuffer:false});
  this.quadScene=new T.Scene();this.quadCamera=new T.OrthographicCamera(-1,1,1,-1,0,1);this.quad=new T.Mesh(new T.PlaneGeometry(2,2));this.quadScene.add(this.quad);
  const vertexShader='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
  this.filter=new T.ShaderMaterial({uniforms:{source:{value:null},direction:{value:new T.Vector2()},threshold:{value:0}},vertexShader,fragmentShader:`varying vec2 vUv;uniform sampler2D source;uniform vec2 direction;uniform float threshold;void main(){vec3 c=texture2D(source,vUv).rgb*.227027;c+=texture2D(source,vUv+direction*1.384615).rgb*.316216;c+=texture2D(source,vUv-direction*1.384615).rgb*.316216;c+=texture2D(source,vUv+direction*3.230769).rgb*.070270;c+=texture2D(source,vUv-direction*3.230769).rgb*.070270;float peak=max(c.r,max(c.g,c.b));c*=smoothstep(threshold,threshold+.25,peak);gl_FragColor=vec4(c,1.);}`,depthTest:false,depthWrite:false});
  this.composite=new T.ShaderMaterial({uniforms:{sceneTexture:{value:this.sceneTarget.texture},bloomTexture:{value:this.bright.texture}},vertexShader,fragmentShader:`varying vec2 vUv;uniform sampler2D sceneTexture;uniform sampler2D bloomTexture;void main(){vec3 c=texture2D(sceneTexture,vUv).rgb+texture2D(bloomTexture,vUv).rgb*.35;gl_FragColor=vec4(c,1.);#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`,depthTest:false,depthWrite:false});
  // Preprocessor directives must begin on a new line.
  this.composite.fragmentShader=this.composite.fragmentShader.replace(';#include',';\n#include');
 }
 resize(w,h){this.w=w;this.h=h;const ratio=Math.min(devicePixelRatio,[1,1.5,2][this.level]);if(ratio!==this.ratio){this.ratio=ratio;this.renderer.setPixelRatio(ratio);}this.renderer.setSize(w,h);this.sceneTarget.setSize(Math.ceil(w*ratio),Math.ceil(h*ratio));this.bright.setSize(Math.max(1,Math.ceil(w*ratio*.5)),Math.max(1,Math.ceil(h*ratio*.5)));this.blur.setSize(this.bright.width,this.bright.height);}
 update(dt,active,sun){if(!active)return;this.elapsed+=dt;this.samples.push(dt);if(this.samples.length<120)return;const avg=this.samples.reduce((a,b)=>a+b,0)/this.samples.length;this.samples=[];if(avg>1/40&&this.level>0){this.level--;this.enabled=false;this.resize(this.w,this.h);sun.shadow.mapSize.set(1024,1024);if(sun.shadow.map){sun.shadow.map.dispose();sun.shadow.map=null;}}}
 render(scene,camera){const r=this.renderer;if(!this.enabled){r.setRenderTarget(null);r.render(scene,camera);this.sceneCalls=r.info.render.calls;return;}
  r.setRenderTarget(this.sceneTarget);r.render(scene,camera);this.sceneCalls=r.info.render.calls;this.quad.material=this.filter;this.filter.uniforms.source.value=this.sceneTarget.texture;this.filter.uniforms.direction.value.set(0,0);this.filter.uniforms.threshold.value=.85;r.setRenderTarget(this.bright);r.render(this.quadScene,this.quadCamera);
  this.filter.uniforms.threshold.value=0;this.filter.uniforms.source.value=this.bright.texture;this.filter.uniforms.direction.value.set(1/this.bright.width,0);r.setRenderTarget(this.blur);r.render(this.quadScene,this.quadCamera);
  this.filter.uniforms.source.value=this.blur.texture;this.filter.uniforms.direction.value.set(0,1/this.bright.height);r.setRenderTarget(this.bright);r.render(this.quadScene,this.quadCamera);
  this.quad.material=this.composite;r.setRenderTarget(null);r.render(this.quadScene,this.quadCamera);
 }
}
