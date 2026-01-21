const axios = require("axios");
const { chromium } = require("playwright");

const token = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;
const APP_URL = process.env.APP_URL || "";

// 隐藏敏感信息
const MASKED_URL = APP_URL.replace(/(:\/\/)[^.]+/, "$1****");
function maskSensitiveInfo(text) {
  if (!text || !APP_URL) return text;
  return text.split(APP_URL).join(MASKED_URL);
}

// 随机延迟函数
const randomDelay = (min, max) =>
  new Promise((resolve) =>
    setTimeout(resolve, Math.floor(Math.random() * (max - min + 1) + min)),
  );

async function sendTelegram(message) {
  if (!token || !chatId) return;
  const now = new Date();
  const hkTime = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const timeStr = hkTime.toISOString().replace("T", " ").substr(0, 19) + " HKT";

  // 确保通知内容已脱敏
  const safeMessage = maskSensitiveInfo(message);
  const fullMessage = `🤖 Streamlit 自动唤醒\n\n执行时间: ${timeStr}\n\n${safeMessage}`;

  try {
    await axios.post(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        chat_id: chatId,
        text: fullMessage,
      },
      { timeout: 15000 },
    );
  } catch (e) {
    console.log("⚠️ Telegram notification failed");
  }
}

async function wakeUpApp() {
  const initialDelay = Math.floor(Math.random() * 50000) + 10000;
  console.log(`⏳ Random startup delay: ${initialDelay / 1000}s`);
  await new Promise((r) => setTimeout(r, initialDelay));

  console.log(`🚀 Accessing: ${MASKED_URL}`);

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-blink-features=AutomationControlled",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    locale: "en-US",
    timezoneId: "UTC",
    viewport: { width: 1440, height: 900 },
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });

  let statusMessage = "";

  try {
    await page.goto(APP_URL, { waitUntil: "domcontentloaded", timeout: 45000 });
    await randomDelay(3000, 7000);

    const hasButton =
      (await page.locator('[data-testid="wakeup-button-viewer"]').count()) > 0;
    const hasZzzz = (await page.locator('text="Zzzz"').count()) > 0;

    if (hasButton || hasZzzz) {
      console.log(
        `🚩 Hibernation detected (Button: ${hasButton}, Zzzz: ${hasZzzz})`,
      );

      const wakeUpButton = page.locator('[data-testid="wakeup-button-viewer"]');

      if (
        (await wakeUpButton.count()) > 0 &&
        (await wakeUpButton.isVisible())
      ) {
        await wakeUpButton.hover();
        await randomDelay(1000, 2500);
        await wakeUpButton.click({ delay: Math.random() * 150 + 50 });

        console.log("🔄 Waking up...");
        await page.waitForTimeout(60000);

        await page.reload({ waitUntil: "networkidle", timeout: 45000 });
        const stillDown =
          (await page.locator('[data-testid="wakeup-button-viewer"]').count()) >
          0;
        statusMessage = !stillDown
          ? "✅ Success: App woken up."
          : "⚠️ Partial Success: Clicked, but still hibernating.";
      } else {
        await page.reload();
        statusMessage =
          "ℹ️ Wake-up button not visible upon check. Page reloaded.";
      }
    } else {
      console.log("🌞 App is online.");
      await page.mouse.wheel(0, 500);
      await randomDelay(2000, 4000);
      statusMessage = "ℹ️ App is currently online. No action needed.";
    }
  } catch (e) {
    const safeError = maskSensitiveInfo(e.message);
    statusMessage = `❌ Exception: ${safeError}`;
    console.error(statusMessage);
  } finally {
    await browser.close();
  }

  await sendTelegram(statusMessage);
}

wakeUpApp().catch((err) => {
  console.error(maskSensitiveInfo(err.message));
});
