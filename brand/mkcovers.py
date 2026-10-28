# Banner: logo + text on the left over dark ink, real class photos on the right
# that fade (gradient mask) into the dark side. Everything important sits in the
# platform's safe area.
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import sys
REPO='/home/user/Zerofear-v7'; F='/tmp/claude-0/-home-user-Zerofear-v7/dd3f792c-8bc1-59d3-afe1-22127f4c16fb/scratchpad/logo/anton.ttf'
INK=(12,15,22); YEL=(255,214,10); WHITE=(255,255,255)

def load(name, w, h, fy=0.5, fx=0.5):
    im=Image.open(f'{REPO}/public/images/{name}.webp').convert('RGB')
    s=max(w/im.width,h/im.height); im=im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
    x=int((im.width-w)*fx); y=int((im.height-h)*fy); return im.crop((x,y,x+w,y+h))

def hmask(w,h,fade_left,fade_right=0,top=0,bottom=0):
    m=Image.new('L',(w,h),255); d=ImageDraw.Draw(m)
    for x in range(w):
        a=1.0
        if fade_left and x<fade_left: a=min(a,(x/fade_left)**1.4)
        if fade_right and x>w-fade_right: a=min(a,((w-x)/fade_right)**1.4)
        d.line([(x,0),(x,h)],fill=int(255*a))
    if top or bottom:
        v=Image.new('L',(w,h),255); dv=ImageDraw.Draw(v)
        for y in range(h):
            a=1.0
            if top and y<top: a=min(a,y/top)
            if bottom and y>h-bottom: a=min(a,(h-y)/bottom)
            dv.line([(0,y),(w,y)],fill=int(255*a))
        from PIL import ImageChops; m=ImageChops.multiply(m,v)
    return m

def logo(d,cx,cy,size):
    f=ImageFont.truetype(F,size); pad=size*0.11
    z=d.textbbox((0,0),'ZERO',font=f); fr=d.textbbox((0,0),'FEAR',font=f)
    ch=z[3]-z[1]; gap=size*0.10; bh=ch+pad*2; bw=(fr[2]-fr[0])+pad*3
    top=cy-(ch+gap+bh)/2
    d.text((cx-(z[2]-z[0])/2-z[0],top-z[1]),'ZERO',font=f,fill=WHITE)
    by=top+ch+gap; d.rectangle([cx-bw/2,by,cx+bw/2,by+bh],fill=YEL)
    d.text((cx-(fr[2]-fr[0])/2-fr[0],by+pad-fr[1]),'FEAR',font=f,fill=INK)
    return bw

def banner(W,H,safe,photos,scale,out,full_height=False):
    sx,sy,sw,sh=safe
    img=Image.new('RGB',(W,H),INK)
    back=load(photos[0][0],W,H,photos[0][1]).filter(ImageFilter.GaussianBlur(30))
    back=ImageEnhance.Brightness(back).enhance(0.25)
    img.paste(back,(0,0),hmask(W,H,int(W*0.6)))
    d=ImageDraw.Draw(img)
    size=int(150*scale)
    f=ImageFont.truetype(F,size); fr=d.textbbox((0,0),'FEAR',font=f); bw=(fr[2]-fr[0])+size*0.33
    t1=ImageFont.truetype(F,int(78*scale)); t2=ImageFont.truetype(F,int(44*scale))
    L=[('SCOOTY & BIKE TRAINING',t1,WHITE,-122),("CAN'T RIDE A CYCLE? YOU CAN STILL RIDE.",t2,YEL,-22),('KOLKATA · 1-TO-1 · DOORSTEP · 79801 10273',t2,WHITE,46)]
    lx=sx+int(30*scale); gap=int(55*scale); tx=lx+bw+gap
    text_end=tx+max(d.textlength(t,font=fo) for t,fo,_,_ in L)
    # photos: from the end of the text to the right edge of the safe area
    px0=int(text_end+20*scale); avail=sx+sw-px0; n=len(photos)
    ov=int(avail*0.12); pw=(avail+ov*(n-1))//n
    py,ph=(0,H) if full_height else (sy,sh)
    lead=int(pw*0.45)  # first photo fades in from the dark side
    for i,(name,fy,fx) in enumerate(photos):
        x=px0+i*(pw-ov)-(lead if i==0 else 0); w=pw+(lead if i==0 else 0)
        p=load(name,w,ph,fy,fx)
        m=hmask(w,ph,lead+ov//2 if i==0 else ov,0,0 if full_height else int(ph*0.10),0 if full_height else int(ph*0.14))
        img.paste(p,(x,py),m)
    d=ImageDraw.Draw(img)
    cy=sy+sh/2
    logo(d,lx+bw/2,cy,size)
    d.rectangle([tx-gap/2-3*scale,cy-120*scale,tx-gap/2+3*scale,cy+120*scale],fill=YEL)
    for t,fo,c,dy in L: d.text((tx,cy+dy*scale),t,font=fo,fill=c)
    img.save(out,quality=90)
    return img

photos=[('gallery-hands-on',0.45,0.55),('bike-clutch-practice',0.35,0.45)]
yt=banner(2560,1440,(507,508,1546,423),photos,0.70,'zerofear-youtube-banner-2560x1440.jpg')
yt.crop((507,508,507+1546,508+423)).save('yt-safe-preview.jpg')
fb=banner(1640,856,(40,116,1600,624),photos,0.72,'zerofear-facebook-cover-1640x856.jpg',True)
