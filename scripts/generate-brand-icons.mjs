import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'
import { dirname, resolve } from 'node:path'

const clamp = (v, a=0, b=255) => Math.max(a, Math.min(b, v))
const mix = (a,b,t) => a + (b-a)*t

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) {
    c ^= byte
    for (let k=0;k<8;k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (c ^ 0xffffffff) >>> 0
}
function chunk(type, data) {
  const t = Buffer.from(type)
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t,data])))
  return Buffer.concat([len,t,data,crc])
}
function encodePng(w,h,rgba) {
  const raw = Buffer.alloc((w*4+1)*h)
  for (let y=0;y<h;y++) {
    raw[y*(w*4+1)] = 0
    Buffer.from(rgba.buffer, rgba.byteOffset + y*w*4, w*4).copy(raw, y*(w*4+1)+1)
  }
  const sig = Buffer.from([137,80,78,71,13,10,26,10])
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w,0); ihdr.writeUInt32BE(h,4); ihdr[8]=8; ihdr[9]=6; ihdr[10]=0; ihdr[11]=0; ihdr[12]=0
  return Buffer.concat([sig, chunk('IHDR',ihdr), chunk('IDAT',deflateSync(raw,{level:9})), chunk('IEND',Buffer.alloc(0))])
}

function render(size, ss=2) {
  const W=size*ss, H=size*ss
  const a = new Uint8ClampedArray(W*H*4)
  const px=(x,y,c,alpha=1)=>{
    if(x<0||y<0||x>=W||y>=H)return
    const i=(y*W+x)*4, ia=alpha
    a[i]=clamp(a[i]*(1-ia)+c[0]*ia); a[i+1]=clamp(a[i+1]*(1-ia)+c[1]*ia); a[i+2]=clamp(a[i+2]*(1-ia)+c[2]*ia); a[i+3]=255
  }
  const rounded=(x0,y0,x1,y1,r,fill)=>{
    x0*=W; y0*=H; x1*=W; y1*=H; r*=W
    const ix0=Math.floor(x0), iy0=Math.floor(y0), ix1=Math.ceil(x1), iy1=Math.ceil(y1)
    for(let y=iy0;y<iy1;y++) for(let x=ix0;x<ix1;x++) {
      const cx=x+0.5, cy=y+0.5
      const qx=Math.max(x0+r-cx,0,cx-(x1-r)), qy=Math.max(y0+r-cy,0,cy-(y1-r))
      if(qx*qx+qy*qy<=r*r) px(x,y,typeof fill==='function'?fill((cx-x0)/(x1-x0),(cy-y0)/(y1-y0)):fill)
    }
  }
  const polygon=(pts,fill)=>{
    const P=pts.map(([x,y])=>[x*W,y*H]); const ys=P.map(p=>p[1]), xs=P.map(p=>p[0])
    const x0=Math.floor(Math.min(...xs)),x1=Math.ceil(Math.max(...xs)),y0=Math.floor(Math.min(...ys)),y1=Math.ceil(Math.max(...ys))
    for(let y=y0;y<y1;y++) for(let x=x0;x<x1;x++){
      let inside=false
      for(let i=0,j=P.length-1;i<P.length;j=i++){
        const [xi,yi]=P[i],[xj,yj]=P[j]
        if(((yi>y)!=(yj>y)) && (x < (xj-xi)*(y-yi)/(yj-yi)+xi)) inside=!inside
      }
      if(inside) px(x,y,typeof fill==='function'?fill(x/W,y/H):fill)
    }
  }

  for(let y=0;y<H;y++) for(let x=0;x<W;x++) {
    const nx=x/W-.5, ny=y/H-.5, d=Math.sqrt(nx*nx+ny*ny)
    const t=Math.min(1,d/.72)
    px(x,y,[mix(5,1,t),mix(11,4,t),mix(25,12,t)])
  }

  rounded(.105,.105,.895,.895,.19,(u,v)=>{
    const edge=Math.min(u,v,1-u,1-v)
    const g=Math.max(0,1-edge/.12)
    return [5+10*g,15+35*g,40+95*g]
  })
  rounded(.125,.125,.875,.875,.165,(u,v)=>{
    const shine=Math.max(0,1-Math.hypot(u-.38,v-.08)/.72)
    return [8+10*shine,22+24*shine,56+52*shine]
  })
  polygon([[.16,.17],[.80,.17],[.53,.50],[.18,.61]],()=>[24,46,91])
  const rings=[
    [.112,.112,.888,.888,.185,.010,[79,149,255]],
    [.130,.130,.870,.870,.160,.006,[157,204,255]],
  ]
  for (const [x0,y0,x1,y1,r,t,c] of rings) {
    rounded(x0,y0,x1,y1,r,c)
    rounded(x0+t,y0+t,x1-t,y1-t,r-t,(u,v)=>{
      const shine=Math.max(0,1-Math.hypot(u-.38,v-.08)/.72)
      return [8+10*shine,22+24*shine,56+52*shine]
    })
  }
  polygon([[.16,.17],[.80,.17],[.53,.50],[.18,.61]],()=>[27,50,96])

  rounded(.285,.255,.715,.755,.055,[2,7,20])
  rounded(.375,.265,.715,.755,.048,(u,v)=>[6+4*(1-v),16+7*(1-v),42+12*(1-v)])

  const metal=(u,v)=>{
    const light=.58 + .34*(1-v) + .08*Math.sin((u+v)*Math.PI*2)
    return [clamp(150+105*light),clamp(157+98*light),clamp(175+80*light)]
  }
  rounded(.285,.265,.405,.755,.048,metal)
  rounded(.335,.265,.672,.390,.038,metal)
  rounded(.360,.430,.605,.515,.030,metal)
  polygon([[.405,.390],[.585,.390],[.405,.475]],()=>[6,16,42])
  polygon([[.405,.515],[.545,.515],[.405,.585]],()=>[6,16,42])

  polygon([[.600,.265],[.715,.265],[.715,.382]],()=>[7,18,46])
  polygon([[.600,.265],[.715,.382],[.650,.382],[.600,.330]],(x,y)=>{
    const t=(x-.60)/.115
    return [220+25*t,224+22*t,234+18*t]
  })
  polygon([[.650,.382],[.715,.382],[.715,.400]],()=>[55,105,190])

  rounded(.515,.635,.650,.655,.010,()=>[200,207,220])
  rounded(.515,.675,.650,.695,.010,()=>[185,193,208])

  rounded(.292,.272,.398,.748,.043,()=>[205,211,224])
  rounded(.300,.280,.390,.740,.038,metal)

  const out=new Uint8ClampedArray(size*size*4)
  for(let y=0;y<size;y++) for(let x=0;x<size;x++) {
    let rr=0,gg=0,bb=0,aa=0,n=0
    for(let yy=0;yy<ss;yy++) for(let xx=0;xx<ss;xx++){
      const i=(((y*ss+yy)*W)+(x*ss+xx))*4
      rr+=a[i];gg+=a[i+1];bb+=a[i+2];aa+=a[i+3];n++
    }
    const o=(y*size+x)*4; out[o]=rr/n;out[o+1]=gg/n;out[o+2]=bb/n;out[o+3]=aa/n
  }
  return encodePng(size,size,out)
}

const outDir=resolve(process.argv[2] ?? 'public')
mkdirSync(outDir,{recursive:true})
for (const [name,size,ss] of [['apple-touch-icon.png',180,3],['pwa-192.png',192,3],['pwa-512.png',512,2]]) {
  const file=resolve(outDir,name)
  mkdirSync(dirname(file),{recursive:true})
  writeFileSync(file,render(size,ss))
  console.log(`${name} ${size}x${size}`)
}
