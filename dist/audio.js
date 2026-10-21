// Procedural Web Audio: no downloads, reusable loops, soft gain envelopes.
export class VehicleAudio {
 constructor(){this.enabled=false;this.jetsOn=[false,false];}
 enable(value){this.enabled=value;if(value)this.unlock();if(this.ctx)this.master.gain.setTargetAtTime(value?.5:0,this.ctx.currentTime,.015);}
 unlock(){
  if(!this.enabled)return;
  if(!this.ctx){
   const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;if(!Audio)return;
   this.ctx=new Audio();const c=this.ctx;
   this.master=c.createGain();this.master.gain.value=.5;this.master.connect(c.destination);
   this.motor=c.createGain();this.motor.gain.value=0;this.motor.connect(this.master);
   this.oscillators=[90,180].map((f,i)=>{const o=c.createOscillator();o.type=i?'sine':'triangle';o.frequency.value=f;o.connect(this.motor);o.start();return o;});
   this.noise=c.createBuffer(1,c.sampleRate*2,c.sampleRate);const data=this.noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
   this.jets=[-.65,.65].map(pan=>{const n=c.createBufferSource();n.buffer=this.noise;n.loop=true;const filter=c.createBiquadFilter();filter.type='bandpass';filter.frequency.value=1600;filter.Q.value=.55;const gain=c.createGain();gain.gain.value=0;const stereo=c.createStereoPanner();stereo.pan.value=pan;n.connect(filter);filter.connect(gain);gain.connect(stereo);stereo.connect(this.master);n.start();return {gain,filter};});
  }
  if(this.ctx.state==='suspended')this.ctx.resume().catch(()=>{});
 }
 cue(freq,duration=.12){
  if(!this.enabled)return;this.unlock();if(!this.ctx)return;const c=this.ctx,t=c.currentTime,o=c.createOscillator(),v=c.createGain();o.frequency.setValueAtTime(freq,t);v.gain.setValueAtTime(.001,t);v.gain.linearRampToValueAtTime(.12,t+.015);v.gain.exponentialRampToValueAtTime(.001,t+duration);o.connect(v);v.connect(this.master);o.start();o.stop(t+duration+.02);o.onended=()=>{o.disconnect();v.disconnect();};
 }
 startup(){
  if(!this.enabled)return;this.unlock();if(!this.ctx)return;const c=this.ctx,t=c.currentTime,o=c.createOscillator(),v=c.createGain();o.type='triangle';o.frequency.setValueAtTime(65,t);o.frequency.exponentialRampToValueAtTime(420,t+.55);o.frequency.exponentialRampToValueAtTime(150,t+.9);v.gain.setValueAtTime(.001,t);v.gain.linearRampToValueAtTime(.2,t+.1);v.gain.exponentialRampToValueAtTime(.001,t+.95);o.connect(v);v.connect(this.master);o.start();o.stop(t+1);o.onended=()=>{o.disconnect();v.disconnect();};
 }
 update(g,input,active,paused){
  if(!this.ctx)return;const t=this.ctx.currentTime;
  this.master.gain.setTargetAtTime(this.enabled&&!paused?.5:0,t,.015);
  const driving=active&&g.phase==='track',speed=Math.min(1,g.v/20);
  this.motor.gain.setTargetAtTime(driving?(input.drive?.075+.065*speed:.035*speed):0,t,.08);
  this.oscillators.forEach((o,i)=>o.frequency.setTargetAtTime((75+speed*230+(input.drive?35:0))*(i+1),t,.08));
  this.jets.forEach((jet,i)=>{
   const on=active&&g.air>0&&!!input[i?'right':'left'];
   if(on&&!this.jetsOn[i]){jet.gain.gain.cancelScheduledValues(t);jet.gain.gain.setValueAtTime(.5,t);}
   jet.gain.gain.setTargetAtTime(on?.28:0,t,on?.065:.025);
   jet.filter.frequency.setTargetAtTime(on?1800:900,t,.08);this.jetsOn[i]=on;
  });
 }
}
