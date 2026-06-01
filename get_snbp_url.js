const puppeteer = require('puppeteer');
(async()=>{
  const b = await puppeteer.launch({headless:'new'});
  const p = await b.newPage();
  
  // Set Mobile UA so HTML renderer is used
  await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1');
  
  p.on('request', req => {
    const url = req.url();
    if(url.includes('.json') && !url.includes('config.json') && !url.includes('manifest')) {
      console.log('BINGO_JSON:', url);
    }
  });

  await p.goto('https://snbp.upnvj.ac.id/', {waitUntil:'networkidle2'});
  
  await p.evaluate(()=>{
    const inputs = document.querySelectorAll('input');
    if(inputs.length>=2){
      inputs[0].value='426630866';
      inputs[0].dispatchEvent(new Event('input',{bubbles:true}));
      inputs[1].value='12122006';
      inputs[1].dispatchEvent(new Event('input',{bubbles:true}));
      
      const btn = document.querySelectorAll('flt-semantics[role="button"]');
      if(btn.length > 0) { 
        btn[btn.length-1].click(); 
      }
    }
  });
  
  await new Promise(r=>setTimeout(r,5000));
  await b.close();
})();
