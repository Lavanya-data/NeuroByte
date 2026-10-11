# Generates SYNTHETIC test documents (no real patient data) plus ground_truth.json
import json, textwrap
from PIL import Image, ImageDraw, ImageFont, ImageFilter
F='/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
def font(sz):
    try: return ImageFont.truetype(F,sz)
    except Exception: return ImageFont.load_default()
LAB=lambda *a:[dict(n=x[0],v=x[1],u=x[2],lo=x[3],hi=x[4]) for x in a]
MED=lambda *a:[dict(n=x[0],dose=x[1],freq=x[2],days=x[3]) for x in a]
D=[
 dict(id='D01',kind='printed lab report',date='2026-03-12',dx='',labs=LAB(('Hemoglobin',11.2,'g/dL',12.0,15.5),('HbA1c',6.1,'%',4.0,5.6),('LDL Cholesterol',128,'mg/dL',0,100),('Vitamin D',34,'ng/mL',30,100),('TSH',2.4,'mIU/L',0.4,4.0)),meds=[]),
 dict(id='D02',kind='printed lab report (diabetes panel)',date='2026-05-02',dx='',labs=LAB(('Fasting Glucose',108,'mg/dL',70,99),('HbA1c',6.5,'%',4.0,5.6),('Creatinine',0.9,'mg/dL',0.6,1.3),('Triglycerides',165,'mg/dL',0,150)),meds=[]),
 dict(id='D03',kind='printed prescription',date='2026-03-15',dx='Prediabetes, mild anemia',labs=[],meds=MED(('Metformin','500mg','1-0-1','30'),('Ferrous','100mg','0-1-0','60'),('Atorvastatin','10mg','0-0-1','30'))),
 dict(id='D04',kind='printed prescription (5 medicines)',date='2026-06-20',dx='Hypertension',labs=[],meds=MED(('Amlodipine','5mg','1-0-0','90'),('Telmisartan','40mg','1-0-0','90'),('Aspirin','75mg','0-0-1','90'),('Pantoprazole','40mg','1-0-0','30'),('Paracetamol','650mg','1-1-1','5'))),
 dict(id='D05',kind='missing units',date='2026-07-01',dx='',labs=LAB(('Hemoglobin',11.2,'',12.0,15.5),('Platelets',250,'',150,410)),meds=[]),
 dict(id='D06',kind='missing reference ranges',date='2026-07-09',dx='',labs=LAB(('Hemoglobin',11.2,'g/dL',None,None),('Sodium',138,'mmol/L',None,None)),meds=[]),
 dict(id='D07',kind='blurry photo of D01',date='2026-03-12',dx='',labs=None,meds=[],blur_of='D01'),
 dict(id='D08',kind='multi-page PDF (lab + prescription)',date='2026-03-12',dx='Prediabetes, mild anemia',labs=None,meds=None,pdf_of=['D01','D03']),
 dict(id='D09',kind='bilingual (Telugu/Hindi headings)',date='2026-08-14',dx='',labs=LAB(('Hemoglobin',10.4,'g/dL',12.0,15.5),('Vitamin D',18,'ng/mL',30,100)),meds=[],head='ప్రయోగశాల నివేదిక / प्रयोगशाला रिपोर्ट'),
 dict(id='D10',kind='decimal-heavy lab report',date='2026-09-03',dx='',labs=LAB(('TSH',0.45,'mIU/L',0.4,4.0),('Creatinine',1.05,'mg/dL',0.6,1.3),('Potassium',4.85,'mmol/L',3.5,5.1),('Total Cholesterol',199.5,'mg/dL',0,200)),meds=[]),
]
byid={d['id']:d for d in D}
def txt(d):
    y,m,dd=d['date'].split('-');L=['City Diagnostics Lab' if not d.get('head') else d['head'],f'Date: {dd}/{m}/{y}','Patient: Test Patient (synthetic)']
    if d['dx']:L.append('Diagnosis: '+d['dx'])
    for l in d['labs']:
        L.append(f"{l['n']} {l['v']} {l['u']}".rstrip()+(f" ({l['lo']}-{l['hi']})" if l['lo'] is not None else ''))
    for m_ in d['meds']:L.append(f"Tab {m_['n']} {m_['dose']} {m_['freq']} x {m_['days']} days")
    return '\n'.join(L)
def png(t,path,blur=False):
    ls=t.split('\n');im=Image.new('RGB',(900,60+34*len(ls)),'white');dr=ImageDraw.Draw(im)
    for i,l in enumerate(ls):dr.text((30,30+34*i),l,fill='black',font=font(24))
    if blur:im=im.filter(ImageFilter.GaussianBlur(3.2))
    im.save(path);return im
gt=[]
for d in D:
    if d.get('blur_of'):
        s=byid[d['blur_of']];d['labs'],d['meds']=s['labs'],s['meds'];d['text']=None;png(txt(s),f"docs/{d['id']}.png",True);d['file']=f"docs/{d['id']}.png"
    elif d.get('pdf_of'):
        s=[byid[i] for i in d['pdf_of']];d['labs']=[l for x in s for l in x['labs']];d['meds']=[m for x in s for m in x['meds']];d['text']='\n'.join(txt(x) for x in s)
        ims=[png(txt(x),f"/tmp/p{i}.png") for i,x in enumerate(s)];ims[0].save(f"docs/{d['id']}.pdf",save_all=True,append_images=ims[1:]);d['file']=f"docs/{d['id']}.pdf"
    else:
        d['text']=txt(d)
        if d.get('head'):d['file']=None  # no Telugu/Devanagari font here: an image would show empty boxes, so use a real document instead
        else:png(d['text'],f"docs/{d['id']}.png");d['file']=f"docs/{d['id']}.png"
    if d.get('text'):open(f"docs/{d['id']}.txt",'w',encoding='utf8').write(d['text'])
    gt.append(dict(id=d['id'],kind=d['kind'],file=d['file'],text=d.get('text'),expect=dict(date=d['date'],dx=d['dx'],labs=d['labs'],meds=d['meds']),
        expectFlag=d['id'] in ('D05','D06','D07')))
json.dump(gt,open('ground_truth.json','w'),indent=1,ensure_ascii=False)
print(len(gt),'documents written; fields:',sum(1+(1 if g['expect']['dx'] else 0)+5*len(g['expect']['labs'])+4*len(g['expect']['meds']) for g in gt))
