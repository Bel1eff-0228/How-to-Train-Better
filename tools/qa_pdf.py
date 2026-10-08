"""Check every PDF page and prepare contact sheets for human visual inspection. MIT."""
from pathlib import Path
import json
import hashlib
import argparse
import pdfplumber
from PIL import Image, ImageDraw
from pypdf import PdfReader

ROOT=Path(__file__).resolve().parent.parent
parser=argparse.ArgumentParser()
parser.add_argument('--pages',required=True,help='Directory containing Poppler page-001.png etc.')
args=parser.parse_args()
pages_dir=Path(args.pages).resolve()
pdf=ROOT/'dist/HowToTrainBetter.pdf'
reader=PdfReader(pdf)
images=sorted(pages_dir.glob('page-*.png'))
assert len(images)==len(reader.pages),(len(images),len(reader.pages))
out=ROOT/'.cache/pdf-contact'
out.mkdir(parents=True,exist_ok=True)
results=[]
with pdfplumber.open(pdf) as document:
    for i,page in enumerate(document.pages,1):
        upright=[c for c in page.chars if c.get('upright',True)]
        outside=[c['text'] for c in upright if c['x0']<-1 or c['x1']>page.width+1 or c['top']<-1 or c['bottom']>page.height+1]
        assert not outside,(i,outside)
        # Advice backgrounds must not return: the former padding crossed the metadata row.
        solid=[r for r in page.rects if r.get('fill') and r['width']>100 and r['height']>8]
        assert not solid,('Unexpected filled body rectangle; inspect overlapping text',i)
        body=[c for c in upright if 44<=c['x0']<page.width-44 and 40<c['top']<page.height-38]
        assert all(c['bottom']<=page.height-46 for c in body),('Footer/body collision',i)
        fonts=reader.pages[i-1]['/Resources'].get_object()['/Font'].get_object()
        embedded=False
        for value in fonts.values():
            font=value.get_object()
            descriptor=font.get('/FontDescriptor')
            if descriptor and descriptor.get_object().get('/FontFile2'):embedded=True
        assert embedded,('No embedded TrueType',i)
        results.append({'page':i,'characters':len(page.chars),'embeddedChineseFont':True,'outOfPageText':False})
for start in range(0,len(images),6):
    sheet=Image.new('RGB',(1500,2160),'#d8dde3')
    draw=ImageDraw.Draw(sheet)
    for j,p in enumerate(images[start:start+6]):
        im=Image.open(p).convert('RGB');im.thumbnail((728,660))
        x=(j%2)*750+(750-im.width)//2;y=(j//2)*720+30
        sheet.paste(im,(x,y));draw.text((j%2*750+20,j//2*720+7),f'PAGE {start+j+1}',fill='black')
    sheet.save(out/f'sheet-{start//6+1:02}.jpg',quality=90)
report={'version':json.loads((ROOT/'package.json').read_text(encoding='utf8'))['version'],'sha256':hashlib.sha256(pdf.read_bytes()).hexdigest(),'pages':len(reader.pages),
        'renderedPages':len(images),'pageChecks':results,'visualReview':'pending contact-sheet and full-page inspection'}
(ROOT/'docs/qa/pdf-results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print(json.dumps({'pages':len(reader.pages),'contactSheets':(len(images)+5)//6,'fontAndBounds':'passed'}))
