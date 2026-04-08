const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  const ss = (name) => page.screenshot({ path: path.resolve(__dirname, name) });
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  console.log('Navigating to Expo Web...');
  await page.goto('http://localhost:8095', { waitUntil: 'networkidle0', timeout: 90000 });
  await wait(5000);
  await ss('01_splash.png');
  console.log('✓ 01_splash.png');

  await wait(4000);
  await ss('02_menu.png');
  console.log('✓ 02_menu.png');

  // Try to find and click buttons by text content
  async function clickByText(text) {
    const elements = await page.evaluateHandle((t) => {
      const all = document.querySelectorAll('*');
      for (const el of all) {
        if (el.textContent && el.textContent.trim() === t && el.getAttribute('role') === 'button') {
          return el;
        }
      }
      // Fallback: any clickable element with that text
      for (const el of all) {
        if (el.textContent && el.textContent.includes(t) && (el.tagName === 'DIV' || el.tagName === 'BUTTON')) {
          return el;
        }
      }
      return null;
    }, text);

    if (elements) {
      await elements.click();
      return true;
    }
    return false;
  }

  // Navigate through screens
  try {
    if (await clickByText('CPU対戦')) {
      await wait(2000);
      await ss('03_gameselect_cpu.png');
      console.log('✓ 03_gameselect_cpu.png');
    }

    if (await clickByText('三目並べ')) {
      await wait(2000);
      await ss('04_coinselect.png');
      console.log('✓ 04_coinselect.png');
    }

    // Go back
    if (await clickByText('← 戻る') || await clickByText('戻る')) {
      await wait(1000);
    }
    if (await clickByText('← 戻る') || await clickByText('戻る')) {
      await wait(1000);
    }

    // Check shop
    if (await clickByText('ショップ')) {
      await wait(2000);
      await ss('05_shop.png');
      console.log('✓ 05_shop.png');
    }

    if (await clickByText('← 戻る') || await clickByText('戻る')) {
      await wait(1000);
    }

    // Check settings
    if (await clickByText('設定')) {
      await wait(2000);
      await ss('06_settings.png');
      console.log('✓ 06_settings.png');
    }

    if (await clickByText('← 戻る') || await clickByText('戻る')) {
      await wait(1000);
    }

    // Check serial code
    if (await clickByText('シリアルコード')) {
      await wait(2000);
      await ss('07_serialcode.png');
      console.log('✓ 07_serialcode.png');
    }
  } catch (e) {
    console.log('Navigation error:', e.message);
  }

  await browser.close();
  console.log('All screenshots taken!');
})().catch(e => console.error('Error:', e.message));
