const puppeteer = require('puppeteer-core');
const path = require('path');

const SCREENSHOTS_DIR = __dirname;
const ss = (page, name) => {
  console.log(`  📸 ${name}`);
  return page.screenshot({ path: path.resolve(SCREENSHOTS_DIR, name) });
};
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function clickText(page, text) {
  const clicked = await page.evaluate((t) => {
    // Find all elements and check text content
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
    let node;
    while (node = walker.nextNode()) {
      const el = node;
      // Check direct text content (not children's text)
      const directText = Array.from(el.childNodes)
        .filter(n => n.nodeType === Node.TEXT_NODE)
        .map(n => n.textContent.trim())
        .join('');

      if (directText.includes(t) || el.textContent.trim() === t) {
        // Find the closest clickable ancestor
        let target = el;
        while (target && target.getAttribute && target.getAttribute('role') !== 'button' && target.tagName !== 'BUTTON') {
          target = target.parentElement;
        }
        if (target && target.click) {
          target.click();
          return true;
        }
        // Fallback: click the element itself
        el.click();
        return true;
      }
    }
    return false;
  }, text);
  return clicked;
}

async function goBack(page) {
  // Try clicking back button
  const clicked = await clickText(page, '戻る');
  if (!clicked) {
    await page.goBack();
  }
  await wait(1500);
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });

  console.log('🚀 Starting full app test...\n');

  // ===== SPLASH =====
  console.log('1️⃣ Splash Screen');
  await page.goto('http://localhost:8095', { waitUntil: 'networkidle0', timeout: 90000 });
  await wait(2000);
  await ss(page, 'test_01_splash.png');

  // Wait for auto-nav to menu
  await wait(4000);

  // ===== MENU =====
  console.log('2️⃣ Menu Screen');
  await ss(page, 'test_02_menu.png');

  // ===== GAME SELECT (CPU) =====
  console.log('3️⃣ Game Select (CPU)');
  await clickText(page, 'CPU対戦');
  await wait(2000);
  await ss(page, 'test_03_gameselect_cpu.png');

  // ===== COIN SELECT (Game 1) =====
  console.log('4️⃣ Coin Select (三目並べ)');
  await clickText(page, '三目並べ');
  await wait(2000);
  await ss(page, 'test_04_coinselect_game1.png');

  // Select fire coin
  console.log('   Selecting fire coin...');
  await clickText(page, '火');
  await wait(500);
  await ss(page, 'test_04b_coin_selected.png');

  // Start battle
  console.log('   Starting battle...');
  await clickText(page, 'バトル開始');
  await wait(1000);
  // Handle ticket dialog if it appears
  await clickText(page, 'はい');
  await wait(3000);

  // ===== GAME 1 =====
  console.log('5️⃣ Game 1: 三目並べ');
  await ss(page, 'test_05_game1_playing.png');

  // Go back
  await goBack(page);
  await wait(1000);
  await goBack(page);
  await wait(1000);
  await goBack(page);
  await wait(1000);

  // ===== GAME SELECT → Game 2 =====
  console.log('6️⃣ Game Select → Game 2');
  await clickText(page, 'CPU対戦');
  await wait(1500);
  await clickText(page, '一騎打ち');
  await wait(1500);
  // Coin select
  await clickText(page, '火');
  await wait(500);
  await clickText(page, 'バトル開始');
  await wait(500);
  await clickText(page, 'はい');
  await wait(3000);
  console.log('7️⃣ Game 2: 一騎打ち');
  await ss(page, 'test_06_game2_playing.png');
  await goBack(page);
  await wait(500);
  await goBack(page);
  await wait(500);
  await goBack(page);
  await wait(1000);

  // ===== Game 3 =====
  console.log('8️⃣ Game Select → Game 3');
  await clickText(page, 'CPU対戦');
  await wait(1500);
  await clickText(page, '三つ巴');
  await wait(1500);
  await clickText(page, '火');
  await wait(500);
  await clickText(page, 'バトル開始');
  await wait(500);
  await clickText(page, 'はい');
  await wait(3000);
  console.log('9️⃣ Game 3: 三つ巴');
  await ss(page, 'test_07_game3_playing.png');
  await goBack(page);
  await wait(500);
  await goBack(page);
  await wait(500);
  await goBack(page);
  await wait(1000);

  // ===== Game 4 =====
  console.log('🔟 Game Select → Game 4');
  await clickText(page, 'CPU対戦');
  await wait(1500);
  await clickText(page, 'パタパタ');
  await wait(1500);
  await clickText(page, '火');
  await wait(500);
  await clickText(page, 'バトル開始');
  await wait(500);
  await clickText(page, 'はい');
  await wait(3000);
  console.log('   Game 4: パタパタ');
  await ss(page, 'test_08_game4_playing.png');
  await goBack(page);
  await wait(500);
  await goBack(page);
  await wait(500);
  await goBack(page);
  await wait(1000);

  // ===== Game 5 (direct, no coin select) =====
  console.log('   Game Select → Game 5');
  await clickText(page, 'CPU対戦');
  await wait(1500);
  await clickText(page, '日月の戦い');
  await wait(3000);
  console.log('   Game 5: 日月の戦い');
  await ss(page, 'test_09_game5_playing.png');
  await goBack(page);
  await wait(500);
  await goBack(page);
  await wait(1000);

  // ===== Game 6 (subscriber only - should show lock) =====
  console.log('   Game Select → Game 6 (locked)');
  await clickText(page, 'CPU対戦');
  await wait(1500);
  await ss(page, 'test_10_gameselect_game6_locked.png');
  // Try clicking Game 6
  await clickText(page, 'Number Link');
  await wait(2000);
  await ss(page, 'test_10b_game6_locked_alert.png');
  // Dismiss alert
  await clickText(page, 'OK');
  await wait(500);
  await goBack(page);
  await wait(1000);

  // ===== SHOP =====
  console.log('   Shop Screen');
  await clickText(page, 'ショップ');
  await wait(2000);
  await ss(page, 'test_11_shop.png');
  await goBack(page);
  await wait(1000);

  // ===== SERIAL CODE =====
  console.log('   Serial Code Screen');
  await clickText(page, 'シリアルコード');
  await wait(2000);
  await ss(page, 'test_12_serialcode.png');
  await goBack(page);
  await wait(1000);

  // ===== SETTINGS =====
  console.log('   Settings Screen');
  await clickText(page, '設定');
  await wait(2000);
  await ss(page, 'test_13_settings.png');
  await goBack(page);
  await wait(1000);

  // ===== RANKING =====
  console.log('   Ranking Screen');
  await clickText(page, 'ランキング');
  await wait(2000);
  await ss(page, 'test_14_ranking.png');
  await goBack(page);
  await wait(1000);

  // ===== LOCAL MODE =====
  console.log('   Local Mode');
  await clickText(page, 'ローカル対戦');
  await wait(2000);
  await ss(page, 'test_15_gameselect_local.png');

  // Final menu
  await goBack(page);
  await wait(1000);
  await ss(page, 'test_16_final_menu.png');

  await browser.close();
  console.log('\n✅ Full test complete! Check screenshots/ folder.');
})().catch(e => console.error('❌ Error:', e.message));
