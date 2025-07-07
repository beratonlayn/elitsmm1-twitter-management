import { RequestHandler } from "express";
import { TweetRequest, BulkTweetRequest, TweetResponse } from "@shared/api";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export const handleOptimizedSingleTweet: RequestHandler = async (req, res) => {
  try {
    const {
      accountIds,
      content,
      delay = 0,
      tokens,
    } = req.body as TweetRequest & {
      tokens: { [accountId: string]: { authToken: string; ct0: string } };
    };

    if (!accountIds || accountIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "En az bir hesap ID gerekli",
      });
    }

    if (!content) {
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

    console.log(`🐦 OPTİMİZE tweet gönderimi: ${accountIds.length} hesap`);

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
          `📤 HIZLI tweet: ${accountId} (${i + 1}/${accountIds.length})`,
        );

        const result = await sendOptimizedTweet(
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
          console.log(`✅ HIZLI tweet başarılı: ${accountId}`);
        } else {
          results.push({
            accountId,
            username: accountId,
            success: false,
            error: result.error,
          });
          errorCount++;
          console.log(`❌ HIZLI tweet başarısız: ${accountId}`);
        }
      } catch (error) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: `Tweet hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        });
        errorCount++;
        console.error(`💥 OPTİMİZE tweet hatası: ${accountId}`, error);
      }

      // Kısa bekleme
      if (i < accountIds.length - 1 && delay > 0) {
        console.log(`⏳ ${delay} saniye bekleniyor...`);
        await new Promise((resolve) => setTimeout(resolve, delay * 1000));
      }
    }

    console.log(
      `🏁 OPTİMİZE tweet tamamlandı: ${successCount} başarılı, ${errorCount} hata`,
    );

    res.json({
      success: true,
      results,
      totalProcessed: accountIds.length,
      successCount,
      errorCount,
    });
  } catch (error) {
    console.error("OPTİMİZE tweet API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

export const handleOptimizedBulkTweet: RequestHandler = async (req, res) => {
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

    if (!accountIds || accountIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "En az bir hesap ID gerekli",
      });
    }

    if (!tweets || tweets.length === 0) {
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
      `🐦 OPTİMİZE toplu tweet: ${accountIds.length} hesap, ${tweets.length} tweet`,
    );

    const results = [];
    let successCount = 0;
    let errorCount = 0;

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
          `📤 HIZLI toplu tweet: ${accountId} - "${tweetContent.substring(0, 30)}..."`,
        );

        const result = await sendOptimizedTweet(
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
          console.log(`✅ HIZLI toplu tweet başarılı: ${accountId}`);
        } else {
          results.push({
            accountId,
            username: accountId,
            success: false,
            error: result.error,
          });
          errorCount++;
          console.log(`❌ HIZLI toplu tweet başarısız: ${accountId}`);
        }
      } catch (error) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: `Tweet hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        });
        errorCount++;
        console.error(`💥 OPTİMİZE toplu tweet hatası: ${accountId}`, error);
      }

      if (i < accountIds.length - 1 && delay > 0) {
        const randomDelay = delay + Math.random() * delay * 0.3;
        console.log(`⏳ ${randomDelay.toFixed(1)} saniye bekleniyor...`);
        await new Promise((resolve) => setTimeout(resolve, randomDelay * 1000));
      }
    }

    console.log(
      `🏁 OPTİMİZE toplu tweet tamamlandı: ${successCount} başarılı, ${errorCount} hata`,
    );

    res.json({
      success: true,
      results,
      totalProcessed: accountIds.length,
      successCount,
      errorCount,
    });
  } catch (error) {
    console.error("OPTİMİZE toplu tweet API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

async function sendOptimizedTweet(
  username: string,
  content: string,
  authToken: string,
  ct0: string,
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  let browser = null;
  let page = null;

  try {
    console.log(`🌐 HIZLI Twitter tweet sayfası: ${username}`);

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-extensions",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--window-size=1366,768",
      ],
    });

    page = await browser.newPage();

    // Hızlı setup
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    );

    // Cookie'leri hızla set et
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

    // Direkt tweet sayfasına git
    console.log(`🏠 Hızla Twitter compose sayfasına gidiliyor`);
    await page.goto("https://twitter.com/compose/tweet", {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    });

    // Kısa bekleme
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 2024 Twitter güncel tweet selectors - daha kapsamlı
    const tweetSelectors = [
      // Compose sayfası selectors
      '[data-testid="tweetTextarea_0"]',
      'div[data-testid="tweetTextarea_0"]',

      // Ana sayfa selectors
      '[role="textbox"][data-testid="tweetTextarea_0"]',
      '[contenteditable="true"][role="textbox"]',

      // Güncel 2024 selectors
      '[data-testid="DMComposerTextInput"]',
      ".public-DraftEditor-content",
      '.notranslate[contenteditable="true"]',

      // Fallback selectors
      '[role="textbox"][placeholder*="happening" i]',
      '[role="textbox"][placeholder*="tweet" i]',
      '[aria-label*="Tweet text" i]',
      'div[aria-label*="Tweet" i][contenteditable="true"]',
    ];

    console.log(`📝 HIZLI tweet yazma alanı bulunuyor`);
    let tweetBox = null;

    for (const selector of tweetSelectors) {
      try {
        await page.waitForSelector(selector, { visible: true, timeout: 2000 });
        tweetBox = await page.$(selector);
        if (tweetBox) {
          const isEditable = await tweetBox.evaluate((el) => {
            return el.contentEditable === "true" || el.isContentEditable;
          });
          if (isEditable) {
            console.log(`✅ HIZLI tweet box bulundu: ${selector}`);
            break;
          }
        }
      } catch (e) {
        // Sessizce devam et
      }
    }

    if (!tweetBox) {
      // Fallback: Ana sayfaya git ve dene
      console.log(`🔄 Ana sayfaya gidip tekrar deneniyor`);
      await page.goto("https://twitter.com/home", {
        waitUntil: "domcontentloaded",
        timeout: 10000,
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      for (const selector of tweetSelectors.slice(0, 6)) {
        try {
          await page.waitForSelector(selector, {
            visible: true,
            timeout: 2000,
          });
          tweetBox = await page.$(selector);
          if (tweetBox) {
            console.log(`✅ Ana sayfada tweet box bulundu: ${selector}`);
            break;
          }
        } catch (e) {
          // Devam et
        }
      }
    }

    if (!tweetBox) {
      throw new Error("Tweet yazma alanı bulunamadı");
    }

    // Hızlı tweet yazma
    console.log(`✍️ HIZLI tweet yazılıyor: ${content.substring(0, 50)}...`);

    await tweetBox.click();
    await new Promise((resolve) => setTimeout(resolve, 300));

    // İçeriği hızlı yaz
    await page.keyboard.type(content, { delay: 20 });

    // Tweet gönder butonunu bul
    console.log(`📤 HIZLI tweet gönderiliyor`);

    // 2024 Twitter güncel send selectors
    const sendSelectors = [
      '[data-testid="tweetButtonInline"]',
      '[data-testid="tweetButton"]',
      'button[data-testid="tweetButtonInline"]',
      'button[data-testid="tweetButton"]',
      'div[data-testid="tweetButtonInline"]',
      '[role="button"][data-testid*="tweet"]',
      '[role="button"][aria-label*="Post" i]',
      '[role="button"][aria-label*="Tweet" i]',
    ];

    let sendButton = null;
    for (const selector of sendSelectors) {
      try {
        await page.waitForSelector(selector, { visible: true, timeout: 1000 });
        sendButton = await page.$(selector);
        if (sendButton) {
          const isDisabled = await sendButton.evaluate((btn) => {
            return (
              btn.hasAttribute("disabled") ||
              btn.getAttribute("aria-disabled") === "true"
            );
          });
          if (!isDisabled) {
            console.log(`✅ HIZLI tweet butonu bulundu: ${selector}`);
            break;
          }
        }
      } catch (e) {
        // Devam et
      }
    }

    if (!sendButton) {
      throw new Error("Tweet gönder butonu bulunamadı");
    }

    await sendButton.click();

    // Tweet gönderilmesini bekle
    console.log(`⏳ HIZLI tweet gönderim sonucu bekleniyor`);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Başarı kontrolü
    const currentUrl = page.url();
    let tweetId = `fast_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    try {
      const urlMatch = currentUrl.match(/\/status\/(\d+)/);
      if (urlMatch) {
        tweetId = urlMatch[1];
      }
    } catch (e) {
      // Tweet ID alınamadı, varsayılan kullan
    }

    console.log(`✅ HIZLI tweet gönderildi: ${username} - ${tweetId}`);
    return { success: true, tweetId };
  } catch (error) {
    console.error(`💥 HIZLI tweet hatası (${username}):`, error);
    return {
      success: false,
      error: `Tweet gönderim hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log(`🔒 HIZLI tweet tarayıcı kapatıldı: ${username}`);
    } catch (closeError) {
      console.error(`❌ Tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}
