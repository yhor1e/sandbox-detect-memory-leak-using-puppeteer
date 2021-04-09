const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    //    headless: false,
    args: ['--js-flags=--expose-gc'],
    devtools: true,
  });
  const context = await browser.createIncognitoBrowserContext();
  const page = await context.newPage();
  //  const page = await browser.newPage();

  const fs = require('fs');

  let writeStream = fs.createWriteStream('test.heapsnapshot');

  writeStream.on('finish', () => {
    console.log('wrote all data to file');
  });

  const cdpSession = await page.target().createCDPSession();
  cdpSession.on('HeapProfiler.addHeapSnapshotChunk', (data) => {
    writeStream.write(data.chunk);
  });
  cdpSession.on('HeapProfiler.reportHeapSnapshotProgress', (data) => {
    console.log('reportHeapSnapshotProgress');
    console.log(data);
    if (data.finished) {
      console.log('end');
    }
  });
  await cdpSession.send('HeapProfiler.takeHeapSnapshot', {
    reportProgress: true,
    treatGlobalObjectsAsRoot: true,
  });
  await cdpSession.detach();

  await page.goto('http://localhost:8080');
  await page.screenshot({ path: 'example.png' });
  await page.evaluate(() => gc());
  console.log((await page.metrics()).JSHeapUsedSize);
  await page.click('#button');
  await page.evaluate(() => gc());
  console.log((await page.metrics()).JSHeapUsedSize);
  await browser.close();
  setTimeout(() => {
    writeStream.end();
  }, 2000);
})();
