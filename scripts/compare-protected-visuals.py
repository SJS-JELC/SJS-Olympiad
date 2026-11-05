"""Compare externally captured baseline/final screenshots; never alter source images."""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageStat
import argparse, hashlib, json
parser=argparse.ArgumentParser()
parser.add_argument('baseline',type=Path)
parser.add_argument('current',type=Path)
parser.add_argument('output',type=Path)
parser.add_argument('manifest',type=Path)
parser.add_argument('--phase',default='j08-final')
args=parser.parse_args()
args.output.mkdir(parents=True,exist_ok=True)
comparisons=[]
sheets=[]
for width in [1200,1920,2560]:
    captures=sorted(p for p in args.current.rglob(args.phase+'-*.png') if str(width) in p.parent.name)
    tiles=[]
    for current in captures:
        content_id=current.stem.removeprefix(args.phase+'-')
        candidates=[p for p in args.baseline.rglob('baseline-'+content_id+'.png') if str(width) in p.parent.name]
        assert len(candidates)==1,(content_id,width,candidates)
        baseline=candidates[0]
        left=Image.open(baseline).convert('RGB')
        right=Image.open(current).convert('RGB')
        assert left.size==right.size
        difference=ImageChops.difference(left,right)
        red,green,blue=difference.split()
        maximum=ImageChops.lighter(ImageChops.lighter(red,green),blue)
        changed=sum(maximum.histogram()[13:])
        comparisons.append({'id':content_id,'viewport':left.size,'baseline':str(baseline),'current':str(current),'baselineSha256':hashlib.sha256(baseline.read_bytes()).hexdigest(),'currentSha256':hashlib.sha256(current.read_bytes()).hexdigest(),'meanAbsoluteRGB':sum(ImageStat.Stat(difference).mean)/3,'changedPixelsThreshold12':changed})
        left.thumbnail((480,320));right.thumbnail((480,320))
        tile=Image.new('RGB',(980,350),'white')
        ImageDraw.Draw(tile).text((5,3),f'{content_id} {width}: baseline / final',fill='black')
        tile.paste(left,(0,25));tile.paste(right,(490,25));tiles.append(tile)
    assert len(tiles)==38,(width,len(tiles))
    for start in range(0,len(tiles),8):
        sheet=Image.new('RGB',(1960,1400),'#dddddd')
        for index,tile in enumerate(tiles[start:start+8]):sheet.paste(tile,((index%2)*980,(index//2)*350))
        output=args.output/f'compare-{width}-{start//8+1}.jpg'
        sheet.save(output,quality=90);sheets.append(str(output))
assert len(comparisons)==114
args.manifest.write_text(json.dumps({'sourceBaseline':'3e8d8488fb15a64332405aa30ea5dc7361d1e2b4','comparisons':comparisons,'contactSheets':sheets,'note':'Pixel variation includes animated public artwork/background and antialiasing; exact scientific DOM/aria/bounds and source-value/asset invariants are verified separately.'},indent=2),encoding='utf-8')
print(f'{len(comparisons)} visual pairs in {len(sheets)} contact sheets.')
