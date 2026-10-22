// Original 8-bar electronic driving loop, generated locally with no external audio.
export function createDrivingMusic(context){
 const beat=60/112,duration=beat*32,rate=context.sampleRate;
 const buffer=context.createBuffer(1,Math.ceil(duration*rate),rate),data=buffer.getChannelData(0);
 function note(start,length,freq,volume,type){
  const offset=Math.round(start*rate),count=Math.floor(length*rate);
  for(let i=0;i<count&&offset+i<data.length;i++){
   const t=i/rate,envelope=Math.min(1,t/.012)*Math.pow(Math.max(0,1-t/length),2);
   let sample;
   if(type==='kick')sample=Math.sin(2*Math.PI*(42*t+7*(1-Math.exp(-t*25))));
   else if(type==='hat')sample=(Math.random()*2-1)*Math.exp(-t*70);
   else sample=Math.sin(2*Math.PI*freq*t)+.22*Math.sin(4*Math.PI*freq*t);
   data[offset+i]+=sample*volume*envelope;
  }
 }
 const roots=[45,41,48,43],arp=[0,7,12,7,3,7,15,12];
 const hz=m=>440*Math.pow(2,(m-69)/12);
 for(let b=0;b<32;b++){
  const root=roots[Math.floor(b/8)];
  note(b*beat,.24,0,.25,'kick');
  note(b*beat,beat*.8,hz(root),.22,'bass');
  if(b%2)note(b*beat,.12,0,.13,'hat');
  for(let half=0;half<2;half++){
   note((b+half*.5)*beat,.065,0,.055,'hat');
   note((b+half*.5)*beat,beat*.75,hz(root+12+arp[(b*2+half)%8]),.085,'lead');
  }
 }
 // Silence both ends to keep the looping buffer click-free.
 for(let i=0;i<Math.min(128,data.length/2);i++){data[i]*=i/128;data[data.length-1-i]*=i/128;}
 data[0]=0;data[data.length-1]=0;
 return buffer;
}
