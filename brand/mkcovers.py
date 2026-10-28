from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import sys
REPO='/home/user/Zerofear-v7'; F='/tmp/claude-0/-home-user-Zerofear-v7/dd3f792c-8bc1-59d3-afe1-22127f4c16fb/scratchpad/logo/anton.ttf'
INK=(12,15,22); YEL=(255,214,10); WHITE=(255,255,255)

def bg(W,H,photo,focus_y=0.45):
    im=Image.open(f'{REPO}/public/images/{photo}.webp').convert('RGB')
    s=max(W/im.width,H/im.height); im=im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
    x=(im.width-W)//2; y=int((im.height-H)*focus_y); im=im.crop((x,y,x+W,y+H))
    im=ImageEnhance.Brightness(im).enhance(0.45)
    ov=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(ov)
    # darker band behind the text
    for i in range(H):
        a=int(110*(1-abs(i-H/2)/(H/2))**0.6); d.line([(0,i),(W,i)],fill=(12,15,22,a))
    return Image.alpha_composite(im.convert('RGBA'),ov)

def logo(d,cx,cy,size):
    f=ImageFont.truetype(F,size); pad=size*0.11
    z=d.textbbox((0,0),'ZERO',font=f); fr=d.textbbox((0,0),'FEAR',font=f)
    ch=z[3]-z[1]; gap=size*0.10; bh=ch+pad*2; bw=(fr[2]-fr[0])+pad*3
    top=cy-(ch+gap+bh)/2
    d.text((cx-(z[2]-z[0])/2-z[0],top-z[1]),'ZERO',font=f,fill=WHITE)
    by=top+ch+gap; d.rectangle([cx-bw/2,by,cx+bw/2,by+bh],fill=YEL)
    d.text((cx-(fr[2]-fr[0])/2-fr[0],by+pad-fr[1]),'FEAR',font=f,fill=INK)
    return max(z[2]-z[0],bw)

def block(img,cx,cy,scale):
    d=ImageDraw.Draw(img)
    lw=logo(d,0,0,1) if False else None
    size=int(150*scale)
    # measure logo width
    f=ImageFont.truetype(F,size); fr=d.textbbox((0,0),'FEAR',font=f); bw=(fr[2]-fr[0])+size*0.33
    t1=ImageFont.truetype(F,int(84*scale)); t2=ImageFont.truetype(F,int(46*scale))
    l1='SCOOTY & BIKE TRAINING · KOLKATA'; l2="CAN'T RIDE A CYCLE? YOU CAN STILL RIDE."; l3='1-TO-1  ·  TOLLYGUNGE + DOORSTEP  ·  79801 10273'
    w1=d.textlength(l1,font=t1); gap=60*scale
    total=bw+gap+max(w1,d.textlength(l3,font=t2))
    x0=cx-total/2
    logo(d,x0+bw/2,cy,size)
    tx=x0+bw+gap
    d.rectangle([tx-gap/2-3*scale,cy-120*scale,tx-gap/2+3*scale,cy+120*scale],fill=YEL)
    d.text((tx,cy-118*scale),l1,font=t1,fill=WHITE)
    d.text((tx,cy+2*scale),l2,font=t2,fill=YEL)
    d.text((tx,cy+64*scale),l3,font=t2,fill=WHITE)

# YouTube: 2560x1440, safe area 1546x423 in the centre
yt=bg(2560,1440,'hero-wide',0.4); block(yt,1280,720,0.92); yt.convert('RGB').save('zerofear-youtube-banner-2560x1440.jpg',quality=88)
# Facebook: 1640x856 (phones show the middle ~1230 px)
fb=bg(1640,856,'learners-group',0.45); block(fb,820,250,0.66); fb.convert('RGB').save('zerofear-facebook-cover-1640x856.jpg',quality=90)
# preview of YouTube safe area
yt.crop((1280-773,720-212,1280+773,720+212)).convert('RGB').save('yt-safe-preview.jpg')
