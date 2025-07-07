import { RequestHandler } from "express";
import { TweetRequest, BulkTweetRequest, TweetResponse } from "@shared/api";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export const handleSingleTweet: RequestHandler = async (req, res) => {
  try {
    const { accountIds, content, delay = 0 } = req.body as TweetRequest;

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

    console.log(
      `🐦 Tekil tweet gönderimi başlatılıyor: ${accountIds.length} hesap`,
    );

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < accountIds.length; i++) {
      const accountId = accountIds[i];

      try {
        console.log(
          `📤 Tweet gönderiliyor: ${accountId} (${i + 1}/${accountIds.length})`,
        );

        const tweetResult = await sendTweet(accountId, content);

        if (tweetResult.success) {
          results.push({
            accountId,
            username: tweetResult.username || accountId,
            success: true,
            tweetId: tweetResult.tweetId,
          });
          successCount++;
          console.log(`✅ Tweet başarılı: ${accountId}`);
        } else {
          results.push({
            accountId,
            username: tweetResult.username || accountId,
            success: false,
            error: tweetResult.error || "Bilinmeyen hata",
          });
          errorCount++;
          console.log(`❌ Tweet başarısız: ${accountId}`);
        }
      } catch (error) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: `Tweet hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        });
        errorCount++;
        console.error(`💥 Tweet hatası (${accountId}):`, error);
      }

      // Hesaplar arası bekleme
      if (i < accountIds.length - 1 && delay > 0) {
        console.log(`⏳ ${delay} saniye bekleniyor...`);
        await new Promise((resolve) => setTimeout(resolve, delay * 1000));
      }
    }

    const response: TweetResponse = {
      success: true,
      results,
      totalProcessed: accountIds.length,
      successCount,
      errorCount,
    };

    res.json(response);
  } catch (error) {
    console.error("Tweet gönderim API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

export const handleBulkTweet: RequestHandler = async (req, res) => {
  try {
    const {
      accountIds,
      tweets,
      delay = 0,
      randomOrder = false,
    } = req.body as BulkTweetRequest;

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

    console.log(
      `🐦 Toplu tweet gönderimi başlatılıyor: ${accountIds.length} hesap, ${tweets.length} tweet`,
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
      const tweetContent = tweetsToSend[i % tweetsToSend.length]; // Tweet'leri döngüsel olarak kullan

      try {
        console.log(
          `📤 Toplu tweet gönderiliyor: ${accountId} (${i + 1}/${accountIds.length})`,
        );

        const tweetResult = await sendTweet(accountId, tweetContent);

        if (tweetResult.success) {
          results.push({
            accountId,
            username: tweetResult.username || accountId,
            success: true,
            tweetId: tweetResult.tweetId,
          });
          successCount++;
          console.log(`✅ Toplu tweet başarılı: ${accountId}`);
        } else {
          results.push({
            accountId,
            username: tweetResult.username || accountId,
            success: false,
            error: tweetResult.error || "Bilinmeyen hata",
          });
          errorCount++;
          console.log(`❌ Toplu tweet başarısız: ${accountId}`);
        }
      } catch (error) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: `Tweet hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        });
        errorCount++;
        console.error(`💥 Toplu tweet hatası (${accountId}):`, error);
      }

      // Hesaplar arası bekleme
      if (i < accountIds.length - 1 && delay > 0) {
        const randomDelay = delay + Math.random() * delay * 0.5; // %50 random variation
        console.log(`⏳ ${randomDelay.toFixed(1)} saniye bekleniyor...`);
        await new Promise((resolve) => setTimeout(resolve, randomDelay * 1000));
      }
    }

    const response: TweetResponse = {
      success: true,
      results,
      totalProcessed: accountIds.length,
      successCount,
      errorCount,
    };

    res.json(response);
  } catch (error) {
    console.error("Toplu tweet gönderim API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

async function sendTweet(
  accountId: string,
  content: string,
): Promise<{
  success: boolean;
  username?: string;
  tweetId?: string;
  error?: string;
}> {
  let browser = null;
  let page = null;

  try {
    console.log(`🚀 Tweet gönderimi başlatılıyor: ${accountId}`);

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--window-size=1920,1080",
      ],
    });

    page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`🔐 Tweet gönderimi için giriş yapılıyor: ${accountId}`);

    await page.goto("https://twitter.com/compose/tweet", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Basitleştirilmiş tweet gönderimi

    console.log(`📝 Tweet compose alanı aranıyor: ${accountId}`);

    // Tweet compose alanını bul
    await page.waitForSelector(
      '[data-testid="tweetTextarea_0"], [placeholder*="What"], [placeholder*="Neler"], textarea',
      {
        timeout: 15000,
      },
    );

    const tweetAreaFound = await page.evaluate((tweetContent) => {
      // Tweet compose alanını bul
      const selectors = [
        '[data-testid="tweetTextarea_0"]',
        '[role="textbox"]',
        '[placeholder*="What"]',
        '[placeholder*="Neler"]',
        'div[contenteditable="true"]',
        "textarea",
      ];

      for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element && element.offsetParent !== null) {
          // Element'e focus ver ve içeriği gir
          element.focus();

          if (element.tagName === "TEXTAREA") {
            (element as HTMLTextAreaElement).value = tweetContent;
            element.dispatchEvent(new Event("input", { bubbles: true }));
          } else {
            element.textContent = tweetContent;
            element.dispatchEvent(new Event("input", { bubbles: true }));
          }

          return true;
        }
      }
      return false;
    }, content);

    if (!tweetAreaFound) {
      return {
        success: false,
        error: "Tweet compose alanı bulunamadı",
      };
    }

    console.log(`✍️ Tweet içeriği girildi: ${accountId}`);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Tweet gönder butonunu bul ve tıkla
    console.log(`📤 Tweet gönder butonu aranıyor: ${accountId}`);

    const tweetSent = await page.evaluate(() => {
      const buttons = Array.from(
        document.querySelectorAll(
          '[data-testid*="tweet"], button, div[role="button"]',
        ),
      );

      for (const button of buttons) {
        const text = button.textContent?.toLowerCase() || "";
        const testId = button.getAttribute("data-testid") || "";

        if (
          testId.includes("tweetButton") ||
          testId.includes("tweetButtonInline") ||
          text.includes("tweet") ||
          text.includes("post") ||
          text.includes("gönder") ||
          text.includes("paylaş")
        ) {
          // Buton aktif mi kontrol et
          const isDisabled =
            button.hasAttribute("disabled") ||
            button.getAttribute("aria-disabled") === "true" ||
            button.classList.contains("disabled");

          if (!isDisabled) {
            (button as HTMLElement).click();
            return true;
          }
        }
      }
      return false;
    });

    if (!tweetSent) {
      return {
        success: false,
        error: "Tweet gönder butonu bulunamadı veya aktif değil",
      };
    }

    console.log(`⏳ Tweet gönderimi tamamlanıyor: ${accountId}`);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Tweet'in başarıyla gönderildiğini kontrol et
    const tweetSuccess = await page.evaluate(() => {
      // Başarı mesajı veya yeni tweet'in varlığını kontrol et
      const successIndicators = [
        "Your Tweet was sent",
        "Tweet gönderildi",
        "Tweet paylaşıldı",
      ];

      const pageText = document.body.textContent || "";
      return successIndicators.some((indicator) =>
        pageText.toLowerCase().includes(indicator.toLowerCase()),
      );
    });

    if (tweetSuccess) {
      console.log(`✅ Tweet başarıyla gönderildi: ${accountId}`);

      // Tweet ID'sini almaya çalış (opsiyonel)
      const tweetId = await page.evaluate(() => {
        const tweetLinks = Array.from(
          document.querySelectorAll('a[href*="/status/"]'),
        );
        if (tweetLinks.length > 0) {
          const href = (tweetLinks[0] as HTMLAnchorElement).href;
          const match = href.match(/\/status\/(\d+)/);
          return match ? match[1] : undefined;
        }
        return undefined;
      });

      return {
        success: true,
        username: accountId, // Gerçek username'i buradan alınabilir
        tweetId: tweetId,
      };
    } else {
      return {
        success: false,
        error: "Tweet gönderim onayı alınamadı",
      };
    }
  } catch (error) {
    console.error(`❌ Tweet gönderim hatası: ${accountId}`, error);
    return {
      success: false,
      error: `Tweet gönderim hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
    } catch (closeError) {
      console.error(`❌ Tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}
