"""Build a searchable, linked A4 reader from book/, with embedded OFL font. MIT."""
from pathlib import Path
from xml.sax.saxutils import escape
import hashlib
import json
import re
import subprocess
from reportlab import rl_config
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import BaseDocTemplate, PageTemplate, Frame, Paragraph, Spacer, PageBreak, KeepTogether
from reportlab.platypus.tableofcontents import TableOfContents
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'dist/HowToTrainBetter.pdf'
rl_config.invariant = 1
FONT = ROOT / 'assets/fonts/LXGWWenKai-Regular.ttf'
pdfmetrics.registerFont(TTFont('Guide', str(FONT)))
pdfmetrics.registerFontFamily('Guide', normal='Guide', bold='Guide', italic='Guide', boldItalic='Guide')
book = json.loads(subprocess.check_output(['node', 'tools/export_book.mjs'], cwd=ROOT).decode('utf-8'))
VERSION = 'v' + book['version']
INK = colors.HexColor('#243342')
BLUE = colors.HexColor('#3451b2')
W, H = A4
styles = {
    'body': ParagraphStyle('body', fontName='Guide', fontSize=10.5, leading=16, textColor=INK, spaceAfter=4, wordWrap='CJK', splitLongWords=True),
    'small': ParagraphStyle('small', fontName='Guide', fontSize=8.5, leading=13, textColor=INK, spaceAfter=4, wordWrap='CJK', splitLongWords=True),
    'title': ParagraphStyle('title', fontName='Guide', fontSize=29, leading=40, textColor=INK, spaceAfter=20, wordWrap='CJK'),
    'chapter': ParagraphStyle('chapter', fontName='Guide', fontSize=18, leading=25, textColor=BLUE, spaceAfter=13, keepWithNext=True, wordWrap='CJK'),
    'entry': ParagraphStyle('entry', fontName='Guide', fontSize=16, leading=24, textColor=INK, spaceAfter=10, keepWithNext=True, wordWrap='CJK'),
    'label': ParagraphStyle('label', fontName='Guide', fontSize=10.5, leading=16, textColor=BLUE, spaceBefore=4, spaceAfter=2, keepWithNext=True),
    'human': ParagraphStyle('human', fontName='Guide', fontSize=11.5, leading=18, textColor=INK, spaceAfter=10, wordWrap='CJK'),
}

def linked(text):
    """Escape all content, then add only verified source and internal links."""
    chunks, last = [], 0
    for m in re.finditer(r'https?://[^\s；]+|第\s*(\d+)\s*章第\s*(\d+)\s*条', text):
        chunks.append(escape(text[last:m.start()]))
        raw = m.group(0)
        if m.group(1):
            href = '#TB-' + m.group(1).zfill(2) + '-' + m.group(2).zfill(2)
            chunks.append('<link href="' + href + '" color="#3451b2">' + escape(raw) + '</link>')
        else:
            url = raw.rstrip('。，,;')
            chunks.append('<link href="' + escape(url, {'"':'&quot;'}) + '" color="#3451b2">' + escape(url) + '</link>' + escape(raw[len(url):]))
        last = m.end()
    chunks.append(escape(text[last:]))
    return ''.join(chunks)

class GuideDoc(BaseDocTemplate):
    def afterFlowable(self, flowable):
        if isinstance(flowable, Paragraph) and hasattr(flowable, 'guide_key'):
            key, level = flowable.guide_key, flowable.guide_level
            self.current_entry = (flowable.getPlainText(), self.page) if level == 1 else None
            self.canv.bookmarkPage(key)
            self.canv.addOutlineEntry(flowable.getPlainText(), key, level=level, closed=False)
            self.notify('TOCEntry', (level, flowable.getPlainText(), self.page, key))

def page_frame(canvas, doc):
    canvas.saveState()
    canvas.setTitle('高性价比健身指南 · ' + VERSION)
    canvas.setAuthor('栗子豪')
    canvas.setSubject(f"{len(book['sections'])}章{sum(len(s['entries']) for s in book['sections'])}条；原创正文 CC BY-NC 4.0；通用知识与示例")
    canvas.setFont('Guide', 8)
    canvas.setFillColor(colors.HexColor('#667788'))
    canvas.drawString(44, H-27, 'HOW TO TRAIN BETTER  /  看得懂，用得上')
    canvas.setStrokeColor(colors.HexColor('#dce2e8'))
    canvas.line(44, 36, W-44, 36)
    canvas.drawString(44, 22, '栗子豪 · 高性价比健身指南 · ' + VERSION)
    canvas.drawRightString(W-44, 22, str(doc.page))
    canvas.translate(W/2, H/2)
    canvas.rotate(32)
    canvas.setFillColor(colors.Color(.38,.46,.54,alpha=.075))
    canvas.setFont('Guide', 27)
    canvas.drawCentredString(0, 0, '栗子豪 · 高性价比健身指南')
    canvas.restoreState()

def page_end(canvas, doc):
    current = getattr(doc, 'current_entry', None)
    if current and doc.page > current[1]:
        canvas.saveState()
        canvas.setFont('Guide', 8)
        canvas.setFillColor(INK)
        title = current[0]
        while pdfmetrics.stringWidth(title + '（续）', 'Guide', 8) > W-88:
            title = title[:-1]
        canvas.drawString(44, H-40, title+'（续）')
        canvas.restoreState()

def heading(text, key, level):
    p = Paragraph(escape(text), styles['chapter' if level==0 else 'entry'])
    p.guide_key, p.guide_level = key, level
    return p

def field(story, label, value):
    if not value:
        return
    story.append(Paragraph(escape(label), styles['label']))
    # Step markers in long templates become individual paragraphs, preserving source text.
    parts = re.split(r'(?=[①②③④])', value) if len(value)>260 else [value]
    for part in filter(None, parts):
        story.append(Paragraph(linked(part), styles['small' if label=='来源' else 'body']))

def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = GuideDoc(str(OUT), pagesize=A4, leftMargin=44, rightMargin=44, topMargin=48, bottomMargin=48,
                   allowSplitting=True, pageCompression=1)
    doc.addPageTemplates(PageTemplate(id='reader', frames=[Frame(44,48,W-88,H-102,id='main',leftPadding=0,rightPadding=0,topPadding=0,bottomPadding=0)], onPage=page_frame, onPageEnd=page_end))
    story = [Spacer(1,95), Paragraph('高性价比<br/>健身指南',styles['title']),
             Paragraph('How to Train Better',styles['chapter']),
             Paragraph('栗子豪 · '+VERSION, styles['body']), Spacer(1,30),
             Paragraph('从一个问题开始。<br/>先看怎么做，再理解为什么。',styles['chapter']),
             Paragraph(f"{len(book['sections'])}章 · {sum(len(s['entries']) for s in book['sections'])}条 · {len(book['pitfalls'])}项避坑清单<br/>力量 / 有氧 / 饮食 / 恢复 / 消费 / 补剂 / 进阶 / 身体不适",styles['body']),
             Spacer(1,25), Paragraph('通用知识与训练示例；不代替诊断或个性化康复。<br/>原创正文 CC BY-NC 4.0 · 水印用于标示来源。',styles['small']),PageBreak()]
    story.append(heading('阅读与分享', 'license',0))
    for label,text in [
        ('怎样使用','先选眼前问题，读直接建议、方法与例子，再看调整和求助条件。示例范围是可调整的起点；没有标为研究结果的具体排程，不是来源已证明的人人最优处方。目录、书签和来源链接可点击，PDF文字可搜索复制；外部来源需联网。'),
        ('适用范围','面向普通成年健身者。疾病、孕产期、未成年人及伤病复训需要个别判断。胸痛伴气促、运动中晕厥或意识异常等情况优先联系当地急救；中国大陆为120。'),
        ('证据与判断','证据A：质量较好、直接支持核心结论且总体一致；B：存在重要限制；C：实践建议或推断。补剂推荐A/B/C是购买优先级，和证据等级不同；A不代表必买。性价比按各条目标比较，不混成总排名。来源核验日期不代表穷尽检索或专业医学审查。'),
        ('署名与许可','署名：栗子豪；作品名：高性价比健身指南（How to Train Better）。原创正文与技能按CC BY-NC 4.0允许署名的非商业分享和改编；保留署名、许可链接和来源，修改请标明，商业使用另获相应许可。https://creativecommons.org/licenses/by-nc/4.0/ 完整文本：https://creativecommons.org/licenses/by-nc/4.0/legalcode.zh-hans'),
        ('材料边界','项目代码维持MIT；上游eternity4719的HowToLiveBetter版权及其MIT权利保留，论文与机构来源按各自权利处理，不将整包统一改为NC。结构与界面改编不代表上游作者为健身结论背书。历史授权与快照不改写。'),
        ('创作与水印','用户确定选题、结构、授权、署名和修订方向，制作助手协助初稿、研究核验、编辑与构建；不宣称全部文字由用户亲笔撰写。水印用于展示来源，不是防盗保证或权属登记，不限制许可允许的复制与分享。'),
        ('字体','嵌入霞鹜文楷 LXGW WenKai；字体版权归LXGW与The Klee Project Authors，按SIL Open Font License 1.1。项目源码附原字体与完整OFL；PDF内容许可不改变字体许可。https://github.com/lxgw/LxgwWenKai'),
    ]: field(story,label,text)
    story.append(PageBreak())
    story.append(heading('关于栗子豪与教学方法', 'author', 0))
    profile = book['profile']
    for label, text in [('我的关注',profile['experience']),('为什么做这份指南',profile['purpose'])]:
        field(story, label, text)
    for label, text in profile['methods']:
        field(story, label, text)
    field(story,'服务边界',profile['boundary'])
    contact = profile.get('contact')
    if contact:
        field(story,'业务联系',contact['label']+' '+contact['url'])
    field(story,'刚开始训练','从第 1 章第 11 条的每周两次全身示例开始理解动作、组数与记录，再按相关条目调整。')
    field(story,'已有基础，想继续进步','从第 7 章第 13 条的上下肢示例开始比较训练分配，再查RIR、训练量与渐进超负荷。示例不是实际学员案例。')
    story.append(PageBreak())
    story.append(Paragraph('目录 · 点击条目跳转',styles['chapter']))
    toc=TableOfContents()
    toc.levelStyles=[ParagraphStyle('toc0',fontName='Guide',fontSize=11,leading=16,textColor=BLUE,spaceBefore=7,wordWrap='CJK'),ParagraphStyle('toc1',fontName='Guide',fontSize=9.5,leading=13,leftIndent=12,firstLineIndent=0,spaceBefore=1,wordWrap='CJK')]
    story.extend([toc,PageBreak()])
    story.append(heading('避坑清单 · 别这样做，可以这样做','pitfalls',0))
    for e in book['pitfalls']:
        story.append(KeepTogether([
            Paragraph(escape('别这样做：'+e['pitfall']),styles['label']),
            Paragraph(linked('可以这样做：'+e['human']),styles['body']),
            Paragraph(linked('方法与例子见第 '+e['section']+' 章第 '+e['n']+' 条')+' · '+e['id'],styles['small'])]))
    story.append(PageBreak())
    for section in book['sections']:
        for i,e in enumerate(section['entries']):
            if i==0:
                story.append(heading(section['n']+'. '+section['title'],'chapter-'+section['n'],0))
            story.append(heading(e['n']+'. '+e['title'],e['id'],1))
            story.append(Paragraph(escape(e['id']+' · '+e['lens']+' · 证据 '+e['grade']+' · 性价比 '+e['ratio']),styles['small']))
            story.append(Paragraph('直接建议',styles['label']))
            story.append(Paragraph(linked(e['human']),styles['human']))
            for label,key in [('条目类型','kind'),('适用人群','population'),('何时求助','help'),('怎么做','how'),('举个例子','example'),('何时调整','adjust'),('暂时不要','avoid'),('可能诱因','triggers'),('原理','why'),('补剂推荐','recommendation'),('成本','cost'),('收益','gain'),('证据等级','evidence'),('性价比','value'),('备注','note')]:
                if e['id'] in {'TB-01-11','TB-06-19','TB-06-21','TB-07-13'} and key=='why':
                    story.extend([PageBreak(),Paragraph('原理与依据 · '+e['id'],styles['entry'])])
                field(story,label,e.get(key,''))
            tail=[]
            field(tail,'来源',e['src'])
            tail.append(Paragraph('来源核验：'+e['verified'],styles['small']))
            story.append(KeepTogether(tail))
            story.append(PageBreak())
    story.pop()
    # Fail early if any content character is not supported, instead of shipping boxes.
    corpus=json.dumps(book,ensure_ascii=False)+'栗子豪高性价比健身指南'
    missing=sorted({c for c in corpus if ord(c)>31 and ord(c) not in pdfmetrics.getFont('Guide').face.charToGlyph})
    if missing:raise ValueError('Missing font glyphs: '+''.join(missing))
    doc.multiBuild(story)
    reader=PdfReader(OUT)
    alltext='\n'.join(page.extract_text() for page in reader.pages)
    for s in book['sections']:
        for e in s['entries']:
            if e['id'] not in alltext:raise ValueError('Entry missing from PDF: '+e['id'])
    for i,page in enumerate(reader.pages,1):
        t=page.extract_text()
        if '栗子豪' not in t or VERSION not in t:raise ValueError('Page provenance missing: '+str(i))
    result={'version':book['version'],'pages':len(reader.pages),'entries':sum(len(s['entries']) for s in book['sections']),
            'sha256':hashlib.sha256(OUT.read_bytes()).hexdigest(),'bytes':OUT.stat().st_size,
            'fontSha256':hashlib.sha256(FONT.read_bytes()).hexdigest(),'searchable':True,
            'contentSha256':hashlib.sha256(json.dumps(book,ensure_ascii=False,sort_keys=True).encode()).hexdigest(),
            'layoutReview':'pending: render and inspect separately'}
    (ROOT/'dist/pdf-manifest.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
    print(json.dumps(result,ensure_ascii=False))

if __name__=='__main__':build()
