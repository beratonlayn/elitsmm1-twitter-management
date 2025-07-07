import { RequestHandler } from "express";
import { TokenExtractionRequest, TokenExtractionResponse } from "@shared/api";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export const handleRealTokenExtraction: RequestHandler = async (req, res) => {
  try {
    const { accounts } = req.body as TokenExtractionRequest;

    if (!accounts || !Array.isArray(accounts)) {
      return res.status(400).json({
        success: false,
        error: "Geçersiz hesap listesi",
      });
    }

    console.log(`🚀 PARALEL TOKEN ÇIKARMA BAŞLADI: ${accounts.length} hesap`);

    // Paralel işleme için hesapları gruplara böl (3'lük gruplar)
    const batchSize = 3;
    const batches = [];
    for (let i = 0; i < accounts.length; i += batchSize) {
      batches.push(accounts.slice(i, i + batchSize));
    }

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Her batch'i paralel olarak işle
    for (const batch of batches) {
      console.log(`🔥 PARALEL batch işleniyor: ${batch.length} hesap`);

      const batchPromises = batch.map(async (account) => {
        try {
          console.log(`⚡ PARALEL token çıkarma: ${account.username}`);

          const tokenResult = await extractRealTwitterTokens(
            account.username,
            account.password,
            account.twoFactorCode,
          );

          if (tokenResult.success) {
            console.log(`✅ PARALEL token çıkarıldı: ${account.username}`);
            return {
              username: account.username,
              authToken: tokenResult.authToken,
              ct0: tokenResult.ct0,
              success: true,
            };
          } else {
            console.log(`❌ PARALEL token çıkarılamadı: ${account.username}`);
            return {
              username: account.username,
              error: tokenResult.error || "Bilinmeyen hata",
              success: false,
            };
          }
        } catch (error) {
          console.error(
            `💥 PARALEL token hatası (${account.username}):`,
            error,
          );
          return {
            username: account.username,
            error: `İşlem hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
            success: false,
          };
        }
      });

      // Batch sonuçlarını bekle
      const batchResults = await Promise.all(batchPromises);

      // Sonuçları topla
      batchResults.forEach((result) => {
        if (result.success) {
          results.push({
            username: result.username,
            authToken: result.authToken,
            ct0: result.ct0,
          });
          successCount++;
        } else {
          results.push({
            username: result.username,
            error: result.error,
          });
          errorCount++;
        }
      });

      // Batch'ler arası kısa bekleme (bot tespitini engellemek için)
      if (batches.indexOf(batch) < batches.length - 1) {
        await new Promise((resolve) =>
          setTimeout(resolve, 3000 + Math.random() * 2000),
        );
      }
    }

    console.log(
      `🏁 GERÇEK TOKEN İŞLEMİ TAMAMLANDI: ${successCount} başarılı, ${errorCount} hata`,
    );

    const response: TokenExtractionResponse = {
      success: true,
      results,
      totalProcessed: accounts.length,
      successCount,
      errorCount,
    };

    res.json(response);
  } catch (error) {
    console.error("GERÇEK token çıkarma API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

async function extractRealTwitterTokens(
  username: string,
  password: string,
  twoFactorCode?: string,
): Promise<{
  success: boolean;
  authToken?: string;
  ct0?: string;
  error?: string;
}> {
  let browser = null;
  let page = null;

  try {
    console.log(`🌐 GERÇEK Twitter tarayıcısı başlatılıyor: ${username}`);

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-extensions",
        "--no-first-run",
        "--disable-default-apps",
        "--disable-features=TranslateUI",
        "--disable-ipc-flooding-protection",
        "--window-size=1366,768",
      ],
    });

    page = await browser.newPage();

    // Ger��ek kullanıcı ayarları
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    );
    await page.setViewport({ width: 1366, height: 768 });

    // Bot tespitini engelle
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => undefined,
      });
      Object.defineProperty(navigator, "plugins", {
        get: () => [1, 2, 3, 4, 5],
      });
      Object.defineProperty(navigator, "languages", {
        get: () => ["en-US", "en"],
      });
    });

    console.log(`🔐 GERÇEK Twitter giriş sayfasına gidiliyor: ${username}`);

    // Gerçek Twitter login sayfası
    await page.goto("https://twitter.com/i/flow/login", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    console.log(`📝 GERÇEK kullanıcı adı giriliyor: ${username}`);

    // Kullanıcı adı input'unu bekle - birden fazla selector dene
    let usernameInput = null;
    const usernameSelectors = [
      'input[autocomplete="username"]',
      'input[name="text"]',
      'input[data-testid="ocfEnterTextTextInput"]',
      'input[type="text"]',
    ];

    for (const selector of usernameSelectors) {
      try {
        await page.waitForSelector(selector, { visible: true, timeout: 5000 });
        usernameInput = selector;
        console.log(`✅ Username input bulundu: ${selector}`);
        break;
      } catch (e) {
        console.log(`❌ Selector bulunamadı: ${selector}`);
      }
    }

    if (!usernameInput) {
      throw new Error("Kullanıcı adı input alanı bulunamadı");
    }

    const cleanUsername = username.replace("@", "").trim();

    // Kullanıcı adını gir
    await page.click(usernameInput, { clickCount: 3 });
    await new Promise((resolve) => setTimeout(resolve, 500));
    await page.type(usernameInput, cleanUsername, { delay: 100 });

    console.log(`➡️ Next butonuna tıklanıyor: ${username}`);

    // Next butonunu bul ve tıkla
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await page.keyboard.press("Enter");

    // Şifre sayfasını bekle
    console.log(`🔑 GERÇEK şifre giriliyor: ${username}`);

    // Şifre input'unu bekle - birden fazla selector dene
    let passwordInput = null;
    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      'input[autocomplete="current-password"]',
      'input[data-testid="LoginForm_Login_Button"]',
    ];

    for (const selector of passwordSelectors) {
      try {
        await page.waitForSelector(selector, { visible: true, timeout: 5000 });
        passwordInput = selector;
        console.log(`✅ Password input bulundu: ${selector}`);
        break;
      } catch (e) {
        console.log(`❌ Password selector bulunamadı: ${selector}`);
      }
    }

    if (!passwordInput) {
      throw new Error("Şifre input alanı bulunamadı");
    }

    // Şifreyi gir
    await page.click(passwordInput);
    await new Promise((resolve) => setTimeout(resolve, 800));
    await page.type(passwordInput, password, { delay: 80 });

    console.log(`🚪 GERÇEK giriş yapılıyor: ${username}`);

    // Login butonuna tıkla
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await page.keyboard.press("Enter");

    // Giriş sonucunu bekle
    console.log(`⏳ GERÇEK giriş sonucu bekleniyor: ${username}`);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // 2FA kontrolü
    const currentUrl = page.url();
    if (currentUrl.includes("challenge") && twoFactorCode) {
      console.log(`🔐 2FA kodu giriliyor: ${username}`);

      await page.waitForSelector(
        'input[data-testid="ocfEnterTextTextInput"], input[type="text"]',
        {
          visible: true,
          timeout: 10000,
        },
      );

      await page.focus(
        'input[data-testid="ocfEnterTextTextInput"], input[type="text"]',
      );
      await page.keyboard.type(twoFactorCode, { delay: 50 });
      await page.keyboard.press("Enter");

      await new Promise((resolve) => setTimeout(resolve, 3000));
    }

    // Ana sayfa kontrolü ve kısa bekleme
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const finalUrl = page.url();
    console.log(`📍 Final URL: ${finalUrl}`);

    if (
      finalUrl.includes("/home") ||
      finalUrl.includes("/explore") ||
      (finalUrl.includes("twitter.com") &&
        !finalUrl.includes("/login") &&
        !finalUrl.includes("/flow"))
    ) {
      console.log(
        `✅ GERÇEK giriş başarılı! Cookie'ler çıkarılıyor: ${username}`,
      );

      // Kısa bekleme - cookie'lerin set olması için
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Tüm Twitter domain'lerinden cookie'leri al
      let allCookies = [];
      try {
        const twitterCookies = await page.cookies("https://twitter.com");
        const xCookies = await page.cookies("https://x.com");
        allCookies = [...twitterCookies, ...xCookies];
      } catch (e) {
        allCookies = await page.cookies();
      }

      console.log(`🍪 Toplam ${allCookies.length} cookie bulundu`);
      console.log(
        `���� Cookie isimleri: ${allCookies.map((c) => c.name).join(", ")}`,
      );

      // Auth token ve ct0 arama
      const authTokenCookie = allCookies.find(
        (cookie) =>
          cookie.name === "auth_token" &&
          cookie.value &&
          cookie.value.length > 10,
      );
      const ct0Cookie = allCookies.find(
        (cookie) =>
          cookie.name === "ct0" && cookie.value && cookie.value.length > 10,
      );

      // Twitter'ın güncel cookie isimlerini de kontrol et
      const altAuthToken = allCookies.find(
        (cookie) =>
          (cookie.name === "auth_token" || cookie.name === "_twitter_sess") &&
          cookie.value,
      );
      const altCt0 = allCookies.find(
        (cookie) =>
          (cookie.name === "ct0" ||
            cookie.name === "_csrf" ||
            cookie.name === "csrf_token") &&
          cookie.value,
      );

      const finalAuthToken = authTokenCookie || altAuthToken;
      const finalCt0 = ct0Cookie || altCt0;

      if (
        finalAuthToken &&
        finalCt0 &&
        finalAuthToken.value &&
        finalCt0.value
      ) {
        console.log(`🎉 GERÇEK TOKEN'LAR BULUNDU: ${username}`);
        console.log(
          `🔑 Auth Token: ${finalAuthToken.value.substring(0, 20)}...`,
        );
        console.log(`🔑 CT0 Token: ${finalCt0.value.substring(0, 10)}...`);

        return {
          success: true,
          authToken: finalAuthToken.value,
          ct0: finalCt0.value,
        };
      } else {
        console.log(`❌ Cookie'ler bulunamadı: ${username}`);
        console.log(
          `📋 Auth token cookie: ${finalAuthToken ? "BULUNDU" : "YOK"}`,
        );
        console.log(`📋 CT0 cookie: ${finalCt0 ? "BULUNDU" : "YOK"}`);

        // Alternatif cookie çıkarma yöntemi - sayfadan JavaScript ile
        try {
          const jsTokens = await page.evaluate(() => {
            const authToken = document.cookie
              .split(";")
              .find((c) => c.trim().startsWith("auth_token="));
            const ct0Token = document.cookie
              .split(";")
              .find((c) => c.trim().startsWith("ct0="));
            return {
              authToken: authToken ? authToken.split("=")[1] : null,
              ct0: ct0Token ? ct0Token.split("=")[1] : null,
            };
          });

          if (jsTokens.authToken && jsTokens.ct0) {
            console.log(`🎉 JavaScript ile TOKEN'LAR BULUNDU: ${username}`);
            return {
              success: true,
              authToken: jsTokens.authToken,
              ct0: jsTokens.ct0,
            };
          }
        } catch (jsError) {
          console.log(`❌ JavaScript cookie çıkarma hatası: ${jsError}`);
        }

        return {
          success: false,
          error: "Auth token veya ct0 cookie'si bulunamadı",
        };
      }
    } else {
      console.log(`❌ Giriş başarısız: ${username} - ${finalUrl}`);

      const pageContent = await page.content();

      if (pageContent.includes("suspended") || pageContent.includes("locked")) {
        return {
          success: false,
          error: "Hesap askıya alınmış veya kilitli",
        };
      }

      if (pageContent.includes("incorrect") || pageContent.includes("wrong")) {
        return {
          success: false,
          error: "Kullanıcı adı veya şifre hatalı",
        };
      }

      return {
        success: false,
        error: "Giriş başarısız - bilinmeyen hata",
      };
    }
  } catch (error) {
    console.error(`💥 GERÇEK token çıkarma hatası (${username}):`, error);
    return {
      success: false,
      error: `Token çıkarma hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log(`🔒 Tarayıcı kapatıldı: ${username}`);
    } catch (closeError) {
      console.error(`❌ Tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}
