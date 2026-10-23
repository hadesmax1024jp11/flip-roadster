from pathlib import Path
import sys, json, math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'dist/assets'
rng=np.random.default_rng(3000)
for p in ['env','vfx','car','ui']: (OUT/p).mkdir(exist_ok=True)
manifest={}
def save(img,path,**meta):
 p=OUT/path
 if p.suffix=='.jpg': img.convert('RGB').save(p,quality=82,optimize=True)
 elif p.suffix=='.webp': img.save(p,quality=85,method=6)
 else: img.quantize(colors=128,method=Image.Quantize.FASTOCTREE).save(p,optimize=True)
 manifest[path]={'size':list(img.size),**meta}
def noise(w,h,seed):
 r=np.random.default_rng(seed); out=np.zeros((h,w),np.float32)
 for n,weight in [(5,.5),(12,.27),(32,.16),(64,.07)]:
  a=Image.fromarray((r.random((n,n))*255).astype('uint8')).resize((w,h),Image.Resampling.BICUBIC)
  out+=np.asarray(a)/255*weight
 return out
# Environment: equirectangular sky + broad studio-like horizon reflections.
w,h=1024,512; y,x=np.mgrid[0:h,0:w]; t=y/h
base=np.zeros((h,w,3)); top=np.array([34,80,102]); horizon=np.array([185,210,192]); ground=np.array([54,72,65]);
for c in range(3): base[:,:,c]=np.where(t<.53,top[c]+(horizon[c]-top[c])*np.minimum(1,t/.53)**.65,horizon[c]+(ground[c]-horizon[c])*np.minimum(1,(t-.53)/.35))
sun=np.exp(-((x/w-.7)**2+(y/h-.3)**2)/.0015); cloud=noise(w,h,81); base+=np.maximum(0,cloud-.48)[:,:,None]*45*(1-t[:,:,None]); sky=Image.fromarray(np.uint8(np.clip(base,0,255))); save(sky.resize((2048,1024)),'env/sky_dome.jpg')
# Standard uncompressed Radiance RGBE, small enough to stream; broad sun has HDR values.
linear=(np.clip(base/255,0,1)**2.2)*1.1+sun[:,:,None]*np.array([7,5.9,4.1]); vmax=linear.max(axis=2); mant,exp=np.frexp(vmax); scale=np.where(vmax>1e-8,mant*256/np.maximum(vmax,1e-8),0); rgbe=np.zeros((h,w,4),dtype=np.uint8);rgbe[:,:,:3]=np.minimum(255,linear*scale[:,:,None]).astype('uint8');rgbe[:,:,3]=np.where(vmax>1e-8,exp+128,0).astype('uint8')
# RLE scanlines.
def encode_channel(row):
 out=bytearray();i=0
 while i<len(row):
  run=1
  while i+run<len(row) and row[i+run]==row[i] and run<127:run+=1
  if run>=4:out.extend([128+run,int(row[i])]);i+=run
  else:
   start=i;i+=run
   while i<len(row) and i-start<124:
    if i+3<len(row) and row[i]==row[i+1]==row[i+2]==row[i+3]:break
    i+=1
   out.append(i-start);out.extend(row[start:i].tobytes())
 return out
with open(OUT/'env/env_studio.hdr','wb') as f:
 f.write(b'#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y 512 +X 1024\n')
 for row in rgbe:
  f.write(bytes([2,2,4,0]))
  for c in range(4):f.write(encode_channel(row[:,c]))
manifest['env/env_studio.hdr']={'size':[1024,512],'colorSpace':'linear RGBE'}
# Tileable material noise, normals and roughness maps.
for name,color in [('ground_concrete',(139,157,145)),('runway_asphalt',(51,75,76))]:
 n=noise(1024,1024,19); n=(n+np.roll(n,512,0)+np.roll(n,512,1)+np.roll(n,(512,512),(0,1)))/4
 grain=rng.normal(0,1.3,(1024,1024)); rgb=np.clip(np.array(color)[None,None,:]+((n-.5)*35+grain)[:,:,None],0,255).astype('uint8');save(Image.fromarray(rgb),f'env/{name}_albedo.jpg')
 dx=np.roll(n,1,1)-np.roll(n,-1,1);dy=np.roll(n,1,0)-np.roll(n,-1,0);normal=np.stack([128+dx*150,128+dy*150,np.full_like(n,252)],-1).astype('uint8');save(Image.fromarray(normal),f'env/{name}_normal.png',colorSpace='linear')
 if name=='ground_concrete':save(Image.fromarray(np.stack([np.full_like(n,255),180+n*65,np.zeros_like(n)],-1).astype('uint8')),'env/ground_concrete_orm.jpg',colorSpace='linear')
ramp=Image.new('RGB',(512,1024),(155,177,160));d=ImageDraw.Draw(ramp)
for yy in range(0,1024,256):
 d.line((0,yy,512,yy),fill=(117,143,130),width=3)
 d.polygon([(165,yy+170),(256,yy+65),(347,yy+170),(319,yy+170),(256,yy+100),(193,yy+170)],fill=(210,239,142))
for xx in [12,34,478,500]:d.line((xx,0,xx,1024),fill=(53,85,78),width=4)
save(ramp,'env/ramp_surface_albedo.png');save(Image.new('RGB',(512,1024),(128,128,255)),'env/ramp_surface_normal.png',colorSpace='linear')
logo=Image.open(OUT/'party-logo.png').convert('RGBA').resize((2048,699),Image.Resampling.LANCZOS);save(logo,'env/party-logo.webp')
for layer in ['far','mid']:
 im=Image.new('RGBA',(2048,512));d=ImageDraw.Draw(im);rr=random.Random(88 if layer=='far' else 99)
 pts=[(0,512)]+[(i,rr.randint(210,390) if layer=='far' else rr.randint(350,440)) for i in range(0,2049,64)]+[(2048,512)]
 d.polygon(pts,fill=(111,146,142,170) if layer=='far' else (65,102,100,210))
 if layer=='mid':
  for i in range(90,2000,250):
   d.polygon([(i,440),(i,355),(i+65,330),(i+130,355),(i+130,440)],fill=(59,92,91,230));d.rectangle((i+180,280,i+194,440),fill=(59,92,91,230));d.rectangle((i+166,272,i+208,294),fill=(59,92,91,230))
 save(im,f'env/horizon_{layer}.webp')
# Evolving, multi-lobed volumetric-looking atlases. Fixed seed preserves temporal coherence.
def sheet(kind,grid,size):
 cw,ch=size[0]//grid,size[1]//grid; yy,xx=np.mgrid[-1:1:complex(ch),-1:1:complex(cw)]; r=np.random.default_rng(51);lobes=[(r.uniform(-.5,.5),r.uniform(-.5,.5),r.uniform(.18,.38)) for _ in range(14)]; cloud=noise(cw,ch,64)
 atlas=Image.new('RGBA' if kind in ['mist','smoke'] else 'RGB',size)
 for i in range(grid*grid):
  t=i/(grid*grid-1); density=np.zeros((ch,cw))
  if kind=='jet':
   width=.1+.28*(1-(yy+1)/2); center=.06*np.sin(yy*13+t*math.tau); density=np.exp(-((xx-center)/width)**2*2)*np.clip(1-(yy+1)/2,0,1)**.45;density*=.65+.35*np.sin(yy*28-t*math.tau)**2
  else:
   expansion=.5+t*.75
   for k,(lx,ly,rad) in enumerate(lobes):
    cx=lx*expansion+math.sin(t*4+k)*.035;cy=ly*expansion-math.sin(t*3+k)*.04
    density+=np.exp(-((xx-cx)**2+(yy-cy)**2)/(rad*expansion)**2*2)
   density=np.clip(density*.7,0,1)*(cloud*.65+.5)
   density*=np.clip((1-np.sqrt(xx*xx+yy*yy))/.2,0,1)
  if kind=='fire':
   heat=np.clip(density*(1.4-t*.9),0,1); rgb=np.stack([heat*255,np.maximum(0,heat-.18)*320,np.maximum(0,heat-.65)*700],-1);rgb*=max(0,1-t**4);im=Image.fromarray(np.uint8(np.clip(rgb,0,255)))
  elif kind=='jet':
   rgb=np.stack([density**3*230,density*210,density*255],-1);im=Image.fromarray(np.uint8(np.clip(rgb,0,255)))
  else:
   color=(195+cloud*50) if kind=='mist' else (32+cloud*45); alpha=np.clip(density*(.9 if kind=='smoke' else .7)*(1-t*.55)*255,0,255)
   im=Image.fromarray(np.uint8(np.stack([color,color*1.015,color*1.025,alpha],-1).clip(0,255)))
  atlas.paste(im,((i%grid)*cw,(i//grid)*ch))
 name={'jet':'jet_flame','fire':'explosion_fireball','mist':'ground_mist','smoke':'smoke_plume'}[kind]
 save(atlas,f'vfx/{name}_sheet.png',grid=grid,frames=grid*grid,fps=24 if kind!='mist' else 16,loop=kind in ['jet','smoke'],alpha='straight' if kind in ['mist','smoke'] else 'additive black')
for kind,grid,size in [('jet',4,(512,1024)),('mist',4,(1024,1024)),('fire',6,(1024,1024)),('smoke',4,(1024,1024))]:sheet(kind,grid,size)
def radial(name,size,mode):
 w,h=size;yy,xx=np.mgrid[-1:1:complex(h),-1:1:complex(w)];r=np.sqrt(xx*xx+yy*yy)
 if mode=='ring':a=np.exp(-((r-.72)/.07)**2)*np.clip((1-r)*6,0,1)
 elif mode=='shadow':a=np.exp(-(xx*xx+yy*yy)*5)*.7
 elif mode=='flare':a=np.exp(-r*r*14)+.12*np.exp(-xx*xx*800)*np.exp(-yy*yy*3)+.12*np.exp(-yy*yy*800)*np.exp(-xx*xx*3)
 elif mode=='scorch':a=np.exp(-r*r*5)*noise(w,h,92)*1.3
 else:a=np.exp(-xx*xx*35)*np.exp(-yy*yy*3)
 a=np.clip(a,0,1)*np.clip((1-r)*8,0,1)
 color=0 if mode in ['shadow','scorch'] else 255
 im=Image.fromarray(np.uint8(np.stack([np.full_like(a,color)]*3+[a*255],-1)))
 save(im,name)
for name,size,mode in [('env/contact_shadow.png',(256,256),'shadow'),('vfx/nozzle_flare.png',(256,256),'flare'),('vfx/jet_shock_ring.png',(512,512),'ring'),('vfx/shockwave_ring.png',(512,512),'ring'),('vfx/scorch_decal.png',(512,512),'scorch'),('vfx/spark_streak.png',(64,256),'streak'),('car/lamp_glow.png',(256,64),'flare')]:radial(name,size,mode)
font='C:/Windows/Fonts/msjhbd.ttc'
def lettering(text,size,color=(218,250,142),stroke=0):
 im=Image.new('RGBA',size);d=ImageDraw.Draw(im);f=ImageFont.truetype(font,int(size[1]*.42));bbox=d.textbbox((0,0),text,font=f);x=(size[0]-(bbox[2]-bbox[0]))/2;y=(size[1]-(bbox[3]-bbox[1]))/2-bbox[1]
 if stroke:
  d.text((x+5,y+12),text,font=f,fill=(8,30,37),stroke_width=stroke+4,stroke_fill=(8,30,37));d.text((x,y),text,font=f,fill=color,stroke_width=stroke,stroke_fill=(40,90,91))
 else:d.text((x,y),text,font=f,fill=color)
 return im
save(lettering('玩星重力飛車',(1200,420),stroke=6),'ui/title_logo.webp')
for name,text,color in [('perfect','完美著陸',(255,215,92)),('success','著陸成功',(218,250,142)),('crash','撞擊爆炸',(255,143,94))]:
 im=lettering(text,(600,240),color,3);d=ImageDraw.Draw(im);d.rounded_rectangle((14,24,586,216),radius=24,outline=(*color,230),width=7);save(im,f'ui/stamp_{name}.webp')
im=lettering('FLIP  /  01',(1024,512));save(im,'car/car_livery.png')
im=Image.new('RGBA',(512,512));d=ImageDraw.Draw(im);d.ellipse((8,8,504,504),fill=(18,24,27),outline=(72,82,84),width=12)
for i in range(5):
 a=i*math.tau/5;d.line((256,256,256+175*math.cos(a),256+175*math.sin(a)),fill=(172,191,195),width=33)
d.ellipse((215,215,297,297),fill=(75,93,98));save(im,'car/tyre_sidewall.png')
for name in ['debris','celebrate']:
 im=Image.new('RGBA',(512,512));d=ImageDraw.Draw(im)
 for i in range(16):
  x=i%4*128;y=i//4*128;col=([(172,194,200),(35,44,48),(100,174,191),(219,233,233)][i//4] if name=='debris' else [(218,250,142),(255,213,91),(246,255,251),(161,234,255)][i//4])
  d.polygon([(x+30,y+15),(x+105,y+38),(x+85,y+108),(x+45,y+82)],fill=col)
 save(im,f'vfx/{name}_atlas.png',grid=4,frames=16)
# Landing target and painted direction/starting line atlas.
for name in ['landing_pad','runway_marks_atlas']:
 im=Image.new('RGBA',(1024,1024));d=ImageDraw.Draw(im)
 for inset in [80,120,350]:d.ellipse((inset,inset,1024-inset,1024-inset),outline=(218,250,142,150),width=12)
 d.line((512,100,512,924),fill=(231,247,218,180),width=8);d.line((100,512,924,512),fill=(231,247,218,180),width=8)
 save(im,f'env/{name}.png')
# Four-frame magnetic arc.
im=Image.new('RGB',(512,512));d=ImageDraw.Draw(im)
for i in range(4):
 x=i%2*256;y=i//2*256
 for j in range(3):d.arc((x+25+j*6,y+25+j*6,x+231-j*6,y+231-j*6),i*35+j*110,i*35+j*110+85,fill=(100,225,255),width=3)
save(im,'vfx/magnet_arc_sheet.png',grid=2,frames=4,fps=16,loop=True)
# Guide pointer is a vector for crisp small screens.
(OUT/'ui/tutorial_hand.svg').write_text('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><path d="M23 34V9a6 6 0 0 1 12 0v20l5-5 15 7-3 22H29L12 38q-4-8 3-10Z" fill="#f2ffdd" stroke="#1e4344" stroke-width="3"/></svg>')
for name,path in [('air','M4 8h12q6 0 4-4M3 13h18M4 18h12q6 0 4 4'),('height','M12 2v20M7 7l5-5 5 5M7 17l5 5 5-5'),('roll','M19 7a8 8 0 1 0 1 9M19 2v6h-6'),('best','M7 3h10v8a5 5 0 0 1-10 0ZM12 16v5M7 21h10')]:
 (OUT/f'ui/icon_{name}.svg').write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="{path}" fill="none" stroke="#dafa8e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>')
for n in [32,180,512]:save(lettering('玩',(n,n),stroke=max(1,n//60)),f'ui/icon-{n}.png')
(OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf8')
print('Generated',len(manifest),'assets; bytes',sum(p.stat().st_size for folder in ['env','car','vfx','ui'] for p in (OUT/folder).glob('*')))

import runpy
runpy.run_path(str(Path(__file__).with_name("generate-marks.py")))
