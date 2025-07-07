import { RequestHandler } from "express";
import { TweetRequest, BulkTweetRequest, TweetResponse } from "@shared/api";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export const handleRealSingleTweet: RequestHandler = async (req, res) => {
  try {
    const {
      accountIds,
      content,
      delay = 0,
      tokens,
    } = req.body as TweetRequest & {
      tokens: { [accountId: string]: { authToken: string; ct0: string } };
    };

    if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "En az bir hesap ID gerekli",
      });
    }

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Tweet içeriği gerekli",
      });
    }

    if (!tokens) {
      return res.status(400).json({
        success: false,
        error: "Token bilgileri gerekli",
      });
    }

    console.log(`🐦 GERÇEK tweet gönderimi: ${accountIds.length} hesap`);
    console.log(`📝 Tweet içeriği: "${content.substring(0, 50)}..."`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < accountIds.length; i++) {
      const accountId = accountIds[i];
      const accountTokens = tokens[accountId];

      if (!accountTokens) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: "Token bilgileri bulunamadı",
        });
        errorCount++;
        continue;
      }

      try {
        console.log(
          `📤 GERÇEK tweet: ${accountId} (${i + 1}/${accountIds.length})`,
        );

        const result = await sendRealTweet(
          accountId,
          content,
          accountTokens.authToken,
          accountTokens.ct0,
        );

        if (result.success) {
          results.push({
            accountId,
            username: accountId,
            success: true,
            tweetId: result.tweetId,
          });
          successCount++;
          console.log(`✅ GERÇEK tweet başarılı: ${accountId}`);
        } else {
          results.push({
            accountId,
            username: accountId,
            success: false,
            error: result.error,
          });
          errorCount++;
          console.log(`❌ GERÇEK tweet başarısız: ${accountId}`);
        }
      } catch (error) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: `Tweet hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        });
        errorCount++;
        console.error(`💥 GERÇEK tweet hatası: ${accountId}`, error);
      }

      // Hesaplar arası bekleme
      if (i < accountIds.length - 1 && delay > 0) {
        console.log(`⏳ ${delay} saniye bekleniyor...`);
        await new Promise((resolve) => setTimeout(resolve, delay * 1000));
      }
    }

    console.log(
      `🏁 GERÇEK tweet tamamlandı: ${successCount} başarılı, ${errorCount} hata`,
    );

    const response: TweetResponse = {
      success: true,
      results,
      totalProcessed: accountIds.length,
      successCount,
      errorCount,
    };

    res.json(response);
  } catch (error) {
    console.error("GERÇEK tweet API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

export const handleRealBulkTweet: RequestHandler = async (req, res) => {
  try {
    const {
      accountIds,
      tweets,
      delay = 0,
      randomOrder = false,
      tokens,
    } = req.body as BulkTweetRequest & {
      tokens: { [accountId: string]: { authToken: string; ct0: string } };
    };

    if (!accountIds || !Array.isArray(accountIds) || accountIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "En az bir hesap ID gerekli",
      });
    }

    if (!tweets || !Array.isArray(tweets) || tweets.length === 0) {
      return res.status(400).json({
        success: false,
        error: "En az bir tweet içeriği gerekli",
      });
    }

    if (!tokens) {
      return res.status(400).json({
        success: false,
        error: "Token bilgileri gerekli",
      });
    }

    console.log(
      `🐦 GERÇEK toplu tweet: ${accountIds.length} hesap, ${tweets.length} tweet`,
    );

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Tweet'leri karıştır (eğer istenirse)
    const tweetsToSend = randomOrder
      ? [...tweets].sort(() => Math.random() - 0.5)
      : tweets;

    for (let i = 0; i < accountIds.length; i++) {
      const accountId = accountIds[i];
      const tweetContent = tweetsToSend[i % tweetsToSend.length];
      const accountTokens = tokens[accountId];

      if (!accountTokens) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: "Token bilgileri bulunamadı",
        });
        errorCount++;
        continue;
      }

      try {
        console.log(
          `📤 GERÇEK toplu tweet: ${accountId} - "${tweetContent.substring(0, 30)}..."`,
        );

        const result = await sendRealTweet(
          accountId,
          tweetContent,
          accountTokens.authToken,
          accountTokens.ct0,
        );

        if (result.success) {
          results.push({
            accountId,
            username: accountId,
            success: true,
            tweetId: result.tweetId,
          });
          successCount++;
          console.log(`✅ GERÇEK toplu tweet başarılı: ${accountId}`);
        } else {
          results.push({
            accountId,
            username: accountId,
            success: false,
            error: result.error,
          });
          errorCount++;
          console.log(`❌ GERÇEK toplu tweet başarısız: ${accountId}`);
        }
      } catch (error) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: `Tweet hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        });
        errorCount++;
        console.error(`💥 GERÇEK toplu tweet hatası: ${accountId}`, error);
      }

      // Hesaplar arası bekleme
      if (i < accountIds.length - 1 && delay > 0) {
        const randomDelay = delay + Math.random() * delay * 0.5;
        console.log(`⏳ ${randomDelay.toFixed(1)} saniye bekleniyor...`);
        await new Promise((resolve) => setTimeout(resolve, randomDelay * 1000));
      }
    }

    console.log(
      `🏁 GERÇEK toplu tweet tamamlandı: ${successCount} başarılı, ${errorCount} hata`,
    );

    const response: TweetResponse = {
      success: true,
      results,
      totalProcessed: accountIds.length,
      successCount,
      errorCount,
    };

    res.json(response);
  } catch (error) {
    console.error("GERÇEK toplu tweet API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

async function sendRealTweet(
  username: string,
  content: string,
  authToken: string,
  ct0: string,
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  let browser = null;
  let page = null;

  try {
    console.log(`🌐 GERÇEK Twitter tweet sayfası açılıyor: ${username}`);

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-extensions",
        "--window-size=1366,768",
      ],
    });

    page = await browser.newPage();

    // User agent ayarla
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );

    // Cookie'leri set et
    await page.setCookie(
      {
        name: "auth_token",
        value: authToken,
        domain: ".twitter.com",
        path: "/",
        httpOnly: true,
        secure: true,
      },
      {
        name: "ct0",
        value: ct0,
        domain: ".twitter.com",
        path: "/",
        httpOnly: false,
        secure: true,
      },
    );

    // Twitter ana sayfasına git
    console.log(`🏠 Twitter ana sayfasına gidiliyor: ${username}`);
    await page.goto("https://twitter.com/home", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Tweet yazma alanını bul
    console.log(`📝 Tweet yazma alanı bulunuyor: ${username}`);

    const tweetSelectors = [
      '[data-testid="tweetTextarea_0"]',
      'div[data-testid="tweetTextarea_0"]',
      '[role="textbox"][placeholder*="happening" i]',
      '[role="textbox"][placeholder*="tweet" i]',
      '[role="textbox"][data-testid*="tweet"]',
      '[contenteditable="true"][role="textbox"]',
      ".public-DraftEditor-content",
      ".notranslate",
      'div[aria-label*="Tweet" i]',
    ];

    let tweetBox = null;
    for (const selector of tweetSelectors) {
      try {
        await page.waitForSelector(selector, { visible: true, timeout: 5000 });
        tweetBox = await page.$(selector);
        if (tweetBox) {
          // Tweet box'ın gerçekten yazılabilir olduğunu kontrol et
          const isEditable = await tweetBox.evaluate((el) => {
            return (
              el.contentEditable === "true" ||
              el.tagName === "TEXTAREA" ||
              el.tagName === "INPUT"
            );
          });
          if (isEditable) {
            console.log(`✅ Tweet box bulundu: ${selector}`);
            break;
          }
        }
      } catch (e) {
        console.log(`❌ Tweet selector başarısız: ${selector}`);
      }
    }

    if (!tweetBox) {
      throw new Error("Tweet yazma alanı bulunamadı");
    }

    // Tweet içeriğini yaz
    console.log(`✍️ Tweet yazılıyor: ${content.substring(0, 50)}...`);

    // Önce tweetBox'a tıkla ve focus yap
    await tweetBox.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mevcut içeriği temizle
    try {
      await page.keyboard.down("Control");
      await page.keyboard.press("KeyA");
      await page.keyboard.up("Control");
      await page.keyboard.press("Delete");
    } catch (e) {
      console.log(`⚠️ Tweet temizleme hatası: ${e}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    // İçeriği yaz - karakter karakter
    await page.keyboard.type(content, { delay: 100 });

    // Yazma işleminin tamamlandığını kontrol et
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Tweet gönder butonunu bul ve tıkla
    console.log(`📤 Tweet gönderiliyor: ${username}`);

    const sendSelectors = [
      '[data-testid="tweetButtonInline"]',
      '[data-testid="tweetButton"]',
      'button[data-testid="tweetButtonInline"]',
      'button[data-testid="tweetButton"]',
      'div[data-testid="tweetButtonInline"]',
      'div[role="button"][data-testid*="tweet"]',
      '[role="button"][aria-label*="Tweet" i]',
      '[role="button"][aria-label*="Post" i]',
      'button[type="submit"]',
    ];

    let sendButton = null;
    for (const selector of sendSelectors) {
      try {
        await page.waitForSelector(selector, { visible: true, timeout: 3000 });
        sendButton = await page.$(selector);
        if (sendButton) {
          const isDisabled = await sendButton.evaluate((btn) => {
            return (
              btn.hasAttribute("disabled") ||
              btn.getAttribute("aria-disabled") === "true"
            );
          });
          if (!isDisabled) {
            console.log(`✅ Tweet butonu bulundu: ${selector}`);
            break;
          }
        }
      } catch (e) {
        console.log(`❌ Send selector başarısız: ${selector}`);
      }
    }

    if (!sendButton) {
      throw new Error("Tweet gönder butonu bulunamadı");
    }

    await sendButton.click();

    // Tweet gönderilmesini bekle
    console.log(`⏳ Tweet gönderim sonucu bekleniyor: ${username}`);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Başarı kontrolü - URL değişikliği veya yeni tweet varlığı
    const currentUrl = page.url();

    // Tweet ID'yi almaya çalış
    let tweetId = `real_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      // URL'den tweet ID'yi çıkarmaya çalış
      const urlMatch = currentUrl.match(/\/status\/(\d+)/);
      if (urlMatch) {
        tweetId = urlMatch[1];
      }
    } catch (e) {
      console.log(`⚠️ Tweet ID URL'den alınamadı: ${e}`);
    }

    // Sayfa başlığını kontrol et
    const pageTitle = await page.title();
    if (pageTitle.includes("Twitter") || pageTitle.includes("X")) {
      console.log(`✅ GERÇEK tweet gönderildi: ${username} - ${tweetId}`);
      return { success: true, tweetId };
    } else {
      throw new Error("Tweet gönderim doğrulanamadı");
    }
  } catch (error) {
    console.error(`💥 GERÇEK tweet hatası (${username}):`, error);
    return {
      success: false,
      error: `Tweet gönderim hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log(`🔒 Tweet tarayıcı kapatıldı: ${username}`);
    } catch (closeError) {
      console.error(`❌ Tweet tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}
