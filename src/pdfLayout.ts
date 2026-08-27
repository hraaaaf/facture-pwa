export type PdfLayoutMatrix = Array<Array<string | number | null>>

type PdfItem = { str: string; transform: number[]; width?: number }
type P = { text: string; x: number; centerX: number; y: number }

const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
const isItem = (v: unknown): v is PdfItem => !!v && typeof v === 'object' && typeof (v as PdfItem).str === 'string' && Array.isArray((v as PdfItem).transform) && (v as PdfItem).transform.length >= 6
const numeric = (s: string) => /^[-+]?\d+(?:[.,]\d+)?$/.test(s.replace(/[\s\u00a0\u202f]/g, ''))
const med = (a: number[]) => { const s=[...a].sort((x,y)=>x-y); if(!s.length)return 0; const m=Math.floor(s.length/2); return s.length%2?s[m]:(s[m-1]+s[m])/2 }

function explode(item: PdfItem): P[] {
  const raw=item.str.trim(); if(!raw)return []
  const x=item.transform[4], y=item.transform[5], width=Number.isFinite(item.width) ? (item.width as number) : 0
  const parts=[...raw.matchAll(/\S+/g)]
  if(parts.length<=1 || width<=0) return [{text:raw,x,centerX:x+width/2,y}]
  const denom=Math.max(raw.length,1)
  return parts.map(m=>{
    const text=m[0], start=m.index ?? 0, end=start+text.length
    const tx=x+width*(start/denom), tw=width*((end-start)/denom)
    return {text,x:tx,centerX:tx+tw/2,y}
  })
}

function group(items:P[],tol=3){const groups:P[][]=[];for(const i of [...items].sort((a,b)=>b.y-a.y)){const g=groups.find(e=>Math.abs(e[0].y-i.y)<=tol); if(g)g.push(i); else groups.push([i])} return groups}
const lineText=(l:P[])=>[...l].sort((a,b)=>a.x-b.x).map(i=>i.text).join(' ')

export function pdfItemsToCandidateTables(items: unknown[]): PdfLayoutMatrix[] {
  const p=items.filter(isItem).flatMap(explode)
  if(!p.length)return []
  const lines=group(p)
  const header=lines.find(l=>{const s=norm(lineText(l));return /\b(designation|article|description|libelle)\b/.test(s)&&/\b(quantite|qte|qty)\b/.test(s)&&/\b(prix|p\.?u\.?)\b/.test(s)})
  if(!header)return []
  const headerText=norm(lineText(header))
  const extraHeader = /\btotal\b/.test(headerText) ? 'Total HT' : /\b(tva|vat)\b/.test(headerText) ? 'TVA' : null
  const hy=header.reduce((s,i)=>s+i.y,0)/header.length

  type NRow={y:number; nums:P[]; distance:number; direction:1|-1}
  const candidates:NRow[]=[]
  for(const l of lines){if(l===header)continue; const nums=l.filter(i=>numeric(i.text)).sort((a,b)=>a.centerX-b.centerX); if(nums.length<2)continue; const y=l.reduce((s,i)=>s+i.y,0)/l.length; const dy=y-hy; if(Math.abs(dy)<=3)continue; candidates.push({y,nums,distance:Math.abs(dy),direction:dy>0?1:-1})}
  const side=(d:1|-1)=>candidates.filter(r=>r.direction===d&&r.distance<420).sort((a,b)=>a.distance-b.distance)
  const plus=side(1),minus=side(-1)
  const minNums = extraHeader ? 3 : 2
  let rows=(plus.filter(r=>r.nums.length>=minNums).length>minus.filter(r=>r.nums.length>=minNums).length?plus:minus).filter(r=>r.nums.length>=minNums)
  if(!rows.length)return []

  // keep the first contiguous body block; summary/footer numerics are farther away
  const contiguous:NRow[]=[]; const gaps:number[]=[]
  for(const r of rows){if(contiguous.length){const gap=r.distance-contiguous[contiguous.length-1].distance; const typical=med(gaps); if(gaps.length>=2&&typical>0&&gap>typical*2.1)break; gaps.push(gap)} contiguous.push(r)}
  if(!contiguous.length)return []

  const qx=med(contiguous.map(r=>r.nums[0].centerX)), px=med(contiguous.map(r=>r.nums[1].centerX)), tx=extraHeader ? med(contiguous.filter(r=>r.nums[2]).map(r=>r.nums[2].centerX)) : 0
  if(!(px>qx+6))return []
  const leftQ=qx-(px-qx)/2
  const direction=contiguous[0].direction
  const body=p.map(i=>({...i,t:(i.y-hy)*direction}))
  const table:PdfLayoutMatrix=[['Désignation','Quantité','Prix unitaire HT',...(extraHeader?[extraHeader]:[])]]

  contiguous.forEach((r,index)=>{
    const t=Math.abs(r.y-hy)
    const prev=index===0?0:Math.abs(contiguous[index-1].y-hy)
    const next=index+1<contiguous.length?Math.abs(contiguous[index+1].y-hy):t+Math.max(t-prev,24)
    const top=(prev+t)/2,bottom=(t+next)/2
    const desc=body.filter(i=>i.t>top&&i.t<bottom&&i.centerX<leftQ)
      .sort((a,b)=>Math.abs(a.t-b.t)>1?a.t-b.t:a.x-b.x).map(i=>i.text).join(' ').replace(/\s+/g,' ').replace(/\s+([),.;:])/g,'$1').trim()
    const nums=r.nums.map(n=>n.text.replace(/[\s\u00a0\u202f]/g,''))
    table.push([desc,nums[0],nums[1],...(extraHeader?[nums[2]??'']:[])])
  })
  return table.length>1?[table]:[]
}

export function matrixToObjects(matrix: PdfLayoutMatrix){const h=matrix[0].map(String);return matrix.slice(1).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]??null])))}
