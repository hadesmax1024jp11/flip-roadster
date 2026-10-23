import sys,re,html,json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'.tooling'))
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
root=Path(__file__).resolve().parents[1];font=TTFont('C:/Windows/Fonts/msjhbd.ttc',fontNumber=0);glyphs=font.getGlyphSet();cmap=font.getBestCmap();units=font['head'].unitsPerEm

def outline(match):
 attrs=match[1];text=html.unescape(match[2]);get=lambda name,default:float(re.search(name+r'="([\d.]+)"',attrs)[1]) if re.search(name+r'="([\d.]+)"',attrs) else default
 x,y,size=get('x',0),get('y',0),get('font-size',16);scale=size/units;names=[cmap.get(ord(c),'.notdef') for c in text];width=sum(glyphs[n].width for n in names)*scale;cursor=x-width/2;paths=[]
 fill=re.search(r'fill="([^"]+)"',attrs);color=f' fill="{fill[1]}"' if fill else ''
 for name in names:
  pen=SVGPathPen(glyphs);glyphs[name].draw(TransformPen(pen,(scale,0,0,-scale,cursor,y)));d=pen.getCommands();d=re.sub(r'-?\d+\.\d+',lambda m:f'{float(m[0]):.2f}'.rstrip('0').rstrip('.'),d)
  if d:paths.append(f'<path d="{d}" stroke="none"{color}/>')
  cursor+=glyphs[name].width*scale
 return ''.join(paths)
for p in (root/'dist/assets/buttons').glob('*.svg'):
 if '_' in p.stem:continue
 svg=re.sub(r'<text([^>]*)>(.*?)</text>',outline,p.read_text(encoding='utf8'));p.write_text(svg,encoding='utf8')
 if p.stem in ['stick','left','right','drive']:
  for state in ['normal','pressed','disabled']:
   variant=svg
   if state=='pressed':variant=variant.replace('#173037','#426e66').replace('#dbfa8f','#a9e85f').replace('#75948a','#ddff89')
   if state=='disabled':variant=variant.replace('#e6efea','#6b8481').replace('#173037','#1c2b30').replace('#75948a','#3d5353')
   (p.parent/(p.stem+'_'+state+'.svg')).write_text(variant,encoding='utf8')
print('Outlined SVG buttons and 12 control states')
