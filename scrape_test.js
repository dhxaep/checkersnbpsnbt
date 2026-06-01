const puppeteer = require('puppeteer');
(async()=>{
  const b=await puppeteer.launch({headless:'new'});
  const p=await b.newPage();
  await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)');
  
  p.on('request', req => {
    if(req.url().includes('.json') && !req.url().includes('config')) console.log('FETCHED JSON:', req.url());
  });

  await p.goto('https://snbp.upnvj.ac.id/',{waitUntil:'networkidle2'});
  
  await p.evaluate(()=>{
    const i=document.querySelectorAll('input');
    if(i.length>=2){
      i[0].value='426631705';
      i[0].dispatchEvent(new Event('input',{bubbles:true}));
      i[1].value='15042008';
      i[1].dispatchEvent(new Event('input',{bubbles:true}));
      const btn=document.querySelectorAll('flt-semantics[role="button"]');
      if(btn.length>0){
        btn[btn.length-1].click();
      }
    }
  });
  
  await new Promise(r=>setTimeout(r,5000));
  await b.close();
})();
