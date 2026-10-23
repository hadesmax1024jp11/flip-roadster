from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json
p=Path('dist/assets');im=Image.new('RGBA',(1024,1024));d=ImageDraw.Draw(im);font=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',100)
for i in range(16):
 x=i%4*256;y=i//4*256
 if i==0:d.rectangle((x+16,y+110,x+240,y+146),fill=(235,248,228,230))
 elif i==1:d.polygon([(x+128,y+20),(x+232,y+120),(x+159,y+120),(x+159,y+236),(x+97,y+236),(x+97,y+120),(x+24,y+120)],fill=(218,250,142,230))
 elif i==2:
  for a in range(6):
   for b in range(6):d.rectangle((x+8+a*40,y+8+b*40,x+48+a*40,y+48+b*40),fill=(225,240,226,230) if (a+b)%2 else (20,41,44,230))
 else:d.text((x+65,y+70),str(i-3).zfill(2),font=font,fill=(235,248,228,220))
im.quantize(colors=64,method=Image.Quantize.FASTOCTREE).save(p/'env/runway_marks_atlas.png',optimize=True)
m=json.loads((p/'manifest.json').read_text(encoding='utf8'));m['env/runway_marks_atlas.png'].update({'grid':4,'frames':16,'cells':['dash','forward arrow','start checker']+[f'number {i:02}' for i in range(13)],'paddingPixels':8});(p/'manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf8')
