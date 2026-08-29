import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'

const [baselineRoot, featureRoot] = process.argv.slice(2)
if (!baselineRoot || !featureRoot) throw new Error('Usage: node script baselineRoot featureRoot')
const artifactDir = resolve('artifacts/client-catalog')
mkdirSync(artifactDir, { recursive: true })
const widths = [390, 430, 768, 1280]
const assertions = []; const failures = []; const report = { assertions, widths: {}, failure: null }
const mime = { '.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webmanifest':'application/manifest+json' }
function serve(root){const dist=resolve(root,'dist');const server=createServer((req,res)=>{const pathname=new URL(req.url,'http://x').pathname;let file=join(dist,pathname==='/'?'index.html':pathname);if(!existsSync(file))file=join(dist,'index.html');try{res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(readFileSync(file))}catch{res.writeHead(404);res.end('not found')}});return new Promise(r=>server.listen(0,'127.0.0.1',()=>r({server,url:`http://127.0.0.1:${server.address().port}`})))}
function check(name,ok,detail=''){assertions.push({name,ok,detail});if(!ok)failures.push(`${name}: ${detail}`)}

async function seed(page,url){
  await page.goto(url)
  await page.evaluate(async()=>{
    const req=indexedDB.open('facture-pwa',3)
    const db=await new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})
    const tx=db.transaction(['settings','documents','clients','catalog'],'readwrite')
    tx.objectStore('settings').put({name:'TAPISTOR',brand:'TAPISTOR',address:'Rabat',cityLabel:'Rabat',phone:'',fax:'',email:'',ice:'001',ifNumber:'001',rc:'',patente:'',cnss:'',bankName:'',rib:'',legalLine:'',defaultVatRate:20,logoDataUrl:'',managerSignatureDataUrl:'',pdfTemplate:'premium',onboardingCompleted:true,numberingPrefixes:{DEVIS:'DEV',FACTURE:'F',BL:'BL',BC:'BC'},numberingBaseline:{year:2026,lastUsed:{DEVIS:0,FACTURE:1,BL:0,BC:0}}},'company')
    for(const name of ['documents','clients','catalog'])tx.objectStore(name).clear()
    tx.objectStore('clients').put({id:'c1',name:'Youssef',company:'Atlas SARL',address:'Rabat',ice:'001234567890123',ifNumber:'12345678',phone:'0600000000',email:'atlas@example.com',usageCount:4,createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-08-01T00:00:00.000Z'})
    tx.objectStore('catalog').put({id:'i1',designation:'Nettoyage tapis',unit:'Forfait',lastUnitPriceHT:100,vatRate:20,usageCount:3,createdAt:'2026-01-01T00:00:00.000Z',updatedAt:'2026-08-01T00:00:00.000Z'})
    tx.objectStore('documents').put({id:'d1',type:'FACTURE',number:'F-2026-001',date:'2026-08-01',client:'Atlas SARL',clientId:'c1',clientAddress:'Rabat',clientIce:'001234567890123',clientIfNumber:'12345678',object:'Service',lines:[{id:'l1',designation:'Nettoyage tapis',unit:'Forfait',quantity:1,unitPriceHT:100,vatRate:20,discountPercent:0}],blShowPrices:false,globalDiscountPercent:0,dueDate:'',paymentMethod:'UNSPECIFIED',payments:[],status:'FINALIZED',finalizedAt:'2026-08-01T09:00:00.000Z',paidAt:'',cancelledAt:'',sourceDocumentId:'',createdAt:'2026-08-01T09:00:00.000Z',updatedAt:'2026-08-01T09:00:00.000Z'})
    await new Promise((resolve,reject)=>{tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})
    db.close()
  })
  await page.reload(); await page.waitForTimeout(180)
}
async function raw(page,store,id){return page.evaluate(async({store,id})=>{const req=indexedDB.open('facture-pwa',3);const db=await new Promise((resolve,reject)=>{req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)});const tx=db.transaction(store,'readonly');const r=tx.objectStore(store).get(id);const value=await new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();return value},{store,id})}

const baseline=await serve(baselineRoot); const feature=await serve(featureRoot); const browser=await chromium.launch({headless:true})
try{
  for(const width of widths){const row=report.widths[width]={};for(const phase of ['before','after']){const page=await browser.newPage({viewport:{width,height:width<=430?844:900}});const errors=[];const consoles=[];page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error')consoles.push(m.text())});await seed(page,phase==='before'?baseline.url:feature.url);if(phase==='after'){await page.getByRole('button',{name:/Clients & catalogue/}).click();await page.waitForTimeout(120)}await page.screenshot({path:join(artifactDir,`${phase}-${width}.png`),fullPage:true});row[phase]=await page.evaluate(()=>({innerWidth,scrollWidth:document.documentElement.scrollWidth,text:document.body.innerText}));row[phase].pageErrors=errors;row[phase].consoleErrors=consoles;await page.close()}}

  const before=await browser.newPage({viewport:{width:390,height:844}});await seed(before,baseline.url);check('baseline_defect',await before.getByRole('button',{name:/Clients & catalogue/}).count()===0,'main must not expose dedicated manager');await before.close()
  const page=await browser.newPage({viewport:{width:390,height:844}});await seed(page,feature.url);await page.getByRole('button',{name:/Clients & catalogue/}).click()
  check('manager_access',await page.getByRole('heading',{name:'Clients & catalogue'}).isVisible(),'manager heading must be visible')
  await page.getByLabel('Rechercher dans la mémoire').fill('001234567890123');await page.waitForTimeout(80);check('client_search',await page.locator('.entity-card').count()===1 && (await page.locator('.entity-card').innerText()).includes('Atlas SARL'),'ICE search must find Atlas')
  await page.locator('.entity-card').getByText('Modifier',{exact:true}).click();await page.getByLabel('Société').fill('Atlas Nouveau');await page.getByRole('button',{name:'Enregistrer'}).click();await page.waitForTimeout(120)
  const docAfterEdit=await raw(page,'documents','d1');const clientAfterEdit=await raw(page,'clients','c1');check('snapshot_after_edit',docAfterEdit.client==='Atlas SARL' && clientAfterEdit.company==='Atlas Nouveau',JSON.stringify({document:docAfterEdit.client,profile:clientAfterEdit.company}))
  await page.getByLabel('Rechercher dans la mémoire').fill('');page.once('dialog',d=>d.accept());await page.locator('.entity-card').getByText('Supprimer',{exact:true}).click();await page.waitForTimeout(120);const docAfterDelete=await raw(page,'documents','d1');const deleted=await raw(page,'clients','c1');check('snapshot_after_delete',docAfterDelete.client==='Atlas SARL' && deleted===undefined,'finalized document must survive profile deletion')
  await page.getByRole('button',{name:/Catalogue/}).first().click();await page.getByLabel('Rechercher dans la mémoire').fill('Nettoyage tapis');check('catalog_search',await page.locator('.entity-card').count()===1,'catalog search must find item');await page.locator('.entity-card').getByText('Modifier',{exact:true}).click();await page.getByLabel('Prix HT').fill('120');await page.getByRole('button',{name:'Enregistrer'}).click();await page.waitForTimeout(100);check('catalog_edit', (await page.locator('.entity-card').innerText()).includes('120,00'), 'updated price must render')
  await page.close()
  const layoutsOk=widths.every(width=>['before','after'].every(phase=>{const x=report.widths[width][phase];return x.scrollWidth===x.innerWidth&&x.pageErrors.length===0&&x.consoleErrors.length===0}));check('responsive_clean',layoutsOk,'all viewports exact width and zero browser errors')
}catch(error){report.failure=error instanceof Error?error.stack:String(error);failures.push(report.failure)}finally{await browser.close();baseline.server.closeAllConnections?.();feature.server.closeAllConnections?.();await Promise.all([new Promise(r=>baseline.server.close(r)),new Promise(r=>feature.server.close(r))])}
writeFileSync(join(artifactDir,'report.json'),JSON.stringify(report,null,2));if(failures.length){console.error(failures.join('\n'));process.exit(1)}console.log(`CLIENT CATALOG CERTIFIED: ${assertions.length}/${assertions.length} assertions`)
