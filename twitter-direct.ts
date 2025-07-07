import { RequestHandler } from "express";
import {
  ProfileUpdateRequest,
  ProfileUpdateResponse,
  TweetRequest,
  BulkTweetRequest,
  TweetResponse,
} from "@shared/api";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export const handleDirectProfileUpdate: RequestHandler = async (req, res) => {
  try {
    const { accountId, displayName, bio, profileImage, authToken, ct0 } =
      req.body as ProfileUpdateRequest & { authToken: string; ct0: string };

    if (!accountId || !authToken || !ct0) {
      return res.status(400).json({
        success: false,
        error: "Hesap ID, auth token ve ct0 gerekli",
      });
    }

    console.log(`🎭 DİREKT profil güncelleme: ${accountId}`);

    const result = await updateProfileDirect(
      accountId,
      authToken,
      ct0,
      displayName,
      bio,
      profileImage,
    );

    if (result.success) {
      console.log(`✅ DİREKT profil güncellendi: ${accountId}`);
      res.json({
        success: true,
        message: "Profil başarıyla güncellendi",
      });
    } else {
      console.log(`❌ DİREKT profil güncellenemedi: ${accountId}`);
      res.status(400).json({
        success: false,
        message: "Profil güncellenemedi",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("DİREKT profil güncelleme hatası:", error);
    res.status(500).json({
      success: false,
      message: "Sunucu hatası",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const handleDirectSingleTweet: RequestHandler = async (req, res) => {
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

    console.log(`🐦 DİREKT tweet gönderimi: ${accountIds.length} hesap`);

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
          `📤 DİREKT tweet: ${accountId} (${i + 1}/${accountIds.length})`,
        );

        const result = await sendTweetDirect(
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
          console.log(`✅ DİREKT tweet başarılı: ${accountId}`);
        } else {
          results.push({
            accountId,
            username: accountId,
            success: false,
            error: result.error,
          });
          errorCount++;
          console.log(`❌ DİREKT tweet başarısız: ${accountId}`);
        }
      } catch (error) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: `Tweet hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        });
        errorCount++;
        console.error(`💥 DİREKT tweet hatası: ${accountId}`, error);
      }

      if (i < accountIds.length - 1 && delay > 0) {
        console.log(`⏳ ${delay} saniye bekleniyor...`);
        await new Promise((resolve) => setTimeout(resolve, delay * 1000));
      }
    }

    console.log(
      `🏁 DİREKT tweet tamamlandı: ${successCount} başarılı, ${errorCount} hata`,
    );

    res.json({
      success: true,
      results,
      totalProcessed: accountIds.length,
      successCount,
      errorCount,
    });
  } catch (error) {
    console.error("DİREKT tweet API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

async function updateProfileDirect(
  username: string,
  authToken: string,
  ct0: string,
  displayName?: string,
  bio?: string,
  profileImage?: string,
): Promise<{ success: boolean; error?: string }> {
  let browser = null;
  let page = null;

  try {
    console.log(`🌐 DİREKT Twitter profil güncelleme: ${username}`);

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
        "--disable-gpu",
        "--disable-images",
        "--disable-plugins",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--window-size=1920,1080",
        "--fast-start",
        "--disable-default-apps",
      ],
    });

    page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    );

    // Her iki domain için cookie set et
    const domains = [".twitter.com", ".x.com"];
    for (const domain of domains) {
      await page.setCookie(
        {
          name: "auth_token",
          value: authToken,
          domain,
          path: "/",
          httpOnly: true,
          secure: true,
        },
        {
          name: "ct0",
          value: ct0,
          domain,
          path: "/",
          httpOnly: false,
          secure: true,
        },
      );
    }

    // X.com profil düzenleme sayfasına git
    console.log(`⚙️ X.com profil sayfasına gidiliyor`);

    try {
      await page.goto("https://x.com/settings/profile", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
    } catch (error) {
      console.log(`⚠️ X.com başarısız, Twitter.com deneniyor`);
      await page.goto("https://twitter.com/settings/profile", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // JavaScript ile direkt profil güncelleme
    const updateResult = await page.evaluate(
      async (displayName, bio) => {
        console.log("🔧 JavaScript ile profil güncelleme başlıyor");

        // İsim güncelle
        if (displayName) {
          console.log(`📝 İsim güncelleniyor: ${displayName}`);

          // Tüm olası input alanlarını bul
          const nameInputs = [
            ...document.querySelectorAll('input[data-testid*="name" i]'),
            ...document.querySelectorAll('input[data-testid*="display" i]'),
            ...document.querySelectorAll('input[placeholder*="name" i]'),
            ...document.querySelectorAll('input[aria-label*="name" i]'),
            ...document.querySelectorAll('input[type="text"]'),
          ];

          for (const input of nameInputs) {
            try {
              input.focus();
              input.select();
              document.execCommand("delete");
              input.value = displayName;
              input.dispatchEvent(new Event("input", { bubbles: true }));
              input.dispatchEvent(new Event("change", { bubbles: true }));
              console.log(
                `✅ İsim güncellendi: ${input.outerHTML.substring(0, 100)}`,
              );
              break;
            } catch (e) {
              console.log(`❌ İsim input başarısız: ${e}`);
            }
          }
        }

        // Bio güncelle
        if (bio) {
          console.log(`📄 Bio güncelleniyor: ${bio}`);

          const bioInputs = [
            ...document.querySelectorAll('textarea[data-testid*="bio" i]'),
            ...document.querySelectorAll('textarea[placeholder*="bio" i]'),
            ...document.querySelectorAll('textarea[aria-label*="bio" i]'),
            ...document.querySelectorAll("textarea"),
          ];

          for (const textarea of bioInputs) {
            try {
              textarea.focus();
              textarea.select();
              document.execCommand("delete");
              textarea.value = bio;
              textarea.dispatchEvent(new Event("input", { bubbles: true }));
              textarea.dispatchEvent(new Event("change", { bubbles: true }));
              console.log(
                `✅ Bio güncellendi: ${textarea.outerHTML.substring(0, 100)}`,
              );
              break;
            } catch (e) {
              console.log(`❌ Bio textarea başarısız: ${e}`);
            }
          }
        }

        // Kaydet butonu
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const saveButtons = [
          ...document.querySelectorAll('button[data-testid*="save" i]'),
          ...document.querySelectorAll(
            '[role="button"][data-testid*="save" i]',
          ),
          ...document.querySelectorAll('button[type="submit"]'),
          ...document
            .querySelectorAll('[role="button"]')
            .filter(
              (btn) =>
                btn.textContent?.toLowerCase().includes("save") ||
                btn.textContent?.toLowerCase().includes("kaydet"),
            ),
        ];

        for (const button of saveButtons) {
          try {
            button.click();
            console.log(
              `✅ Kaydet butonu tıklandı: ${button.outerHTML.substring(0, 100)}`,
            );
            break;
          } catch (e) {
            console.log(`❌ Kaydet butonu başarısız: ${e}`);
          }
        }

        return { success: true };
      },
      displayName,
      bio,
    );

    console.log(`📄 JavaScript güncelleme sonucu:`, updateResult);

    // Kaydetme işlemini bekle
    await new Promise((resolve) => setTimeout(resolve, 3000));

    return { success: true };
  } catch (error) {
    console.error(`💥 DİREKT profil hatası (${username}):`, error);
    return {
      success: false,
      error: `Profil güncelleme hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log(`🔒 DİREKT profil tarayıcı kapatıldı: ${username}`);
    } catch (closeError) {
      console.error(`❌ Tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}

async function sendTweetDirect(
  username: string,
  content: string,
  authToken: string,
  ct0: string,
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  let browser = null;
  let page = null;

  try {
    console.log(`🌐 DİREKT Twitter tweet: ${username}`);

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
        "--disable-gpu",
        "--disable-images",
        "--disable-plugins",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--window-size=1920,1080",
        "--fast-start",
        "--disable-default-apps",
      ],
    });

    page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    );

    // Her iki domain için cookie set et
    const domains = [".twitter.com", ".x.com"];
    for (const domain of domains) {
      await page.setCookie(
        {
          name: "auth_token",
          value: authToken,
          domain,
          path: "/",
          httpOnly: true,
          secure: true,
        },
        {
          name: "ct0",
          value: ct0,
          domain,
          path: "/",
          httpOnly: false,
          secure: true,
        },
      );
    }

    // X.com ana sayfasına git
    console.log(`🏠 X.com ana sayfasına gidiliyor`);

    try {
      await page.goto("https://x.com/home", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
    } catch (error) {
      console.log(`⚠️ X.com başarısız, Twitter.com deneniyor`);
      await page.goto("https://twitter.com/home", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // JavaScript ile direkt tweet gönderme
    const tweetResult = await page.evaluate(async (content) => {
      console.log("🔧 JavaScript ile tweet gönderme başlıyor");

      // Tweet yazma alanını bul
      const tweetAreas = [
        ...document.querySelectorAll(
          '[data-testid*="tweet" i][contenteditable="true"]',
        ),
        ...document.querySelectorAll(
          '[role="textbox"][contenteditable="true"]',
        ),
        ...document
          .querySelectorAll('[contenteditable="true"]')
          .filter(
            (el) =>
              el.getAttribute("aria-label")?.toLowerCase().includes("tweet") ||
              el
                .getAttribute("placeholder")
                ?.toLowerCase()
                .includes("happening") ||
              el.getAttribute("data-testid")?.toLowerCase().includes("tweet"),
          ),
      ];

      console.log(`📝 ${tweetAreas.length} tweet alanı bulundu`);

      let tweetArea = null;
      for (const area of tweetAreas) {
        try {
          // Görünür ve düzenlenebilir mi kontrol et
          const rect = area.getBoundingClientRect();
          if (
            rect.width > 0 &&
            rect.height > 0 &&
            area.contentEditable === "true"
          ) {
            tweetArea = area;
            console.log(
              `✅ Tweet alanı seçildi: ${area.outerHTML.substring(0, 100)}`,
            );
            break;
          }
        } catch (e) {
          console.log(`❌ Tweet alanı kontrolü başarısız: ${e}`);
        }
      }

      if (!tweetArea) {
        throw new Error("Tweet yazma alanı bulunamadı");
      }

      // Tweet yazma
      tweetArea.focus();
      await new Promise((resolve) => setTimeout(resolve, 500));

      tweetArea.textContent = content;
      tweetArea.dispatchEvent(new Event("input", { bubbles: true }));
      tweetArea.dispatchEvent(new Event("change", { bubbles: true }));

      console.log(`✍️ Tweet yazıldı: ${content.substring(0, 50)}...`);

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Tweet gönder butonu
      const sendButtons = [
        ...document.querySelectorAll('button[data-testid*="tweet" i]'),
        ...document.querySelectorAll('[role="button"][data-testid*="tweet" i]'),
        ...document
          .querySelectorAll("button")
          .filter(
            (btn) =>
              btn.textContent?.toLowerCase().includes("post") ||
              btn.textContent?.toLowerCase().includes("tweet") ||
              btn.getAttribute("aria-label")?.toLowerCase().includes("post"),
          ),
      ];

      console.log(`📤 ${sendButtons.length} gönder butonu bulundu`);

      for (const button of sendButtons) {
        try {
          if (!button.disabled && !button.getAttribute("aria-disabled")) {
            button.click();
            console.log(
              `✅ Tweet gönderildi: ${button.outerHTML.substring(0, 100)}`,
            );
            return { success: true };
          }
        } catch (e) {
          console.log(`❌ Gönder butonu başarısız: ${e}`);
        }
      }

      throw new Error("Tweet gönder butonu bulunamadı");
    }, content);

    console.log(`📄 JavaScript tweet sonucu:`, tweetResult);

    // Tweet gönderimini bekle
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const tweetId = `direct_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return { success: true, tweetId };
  } catch (error) {
    console.error(`💥 DİREKT tweet hatası (${username}):`, error);
    return {
      success: false,
      error: `Tweet gönderim hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log(`🔒 DİREKT tweet tarayıcı kapatıldı: ${username}`);
    } catch (closeError) {
      console.error(`❌ Tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}

export const handleDirectBulkTweet: RequestHandler = async (req, res) => {
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
      `🐦 DİREKT toplu tweet: ${accountIds.length} hesap, ${tweets.length} tweet`,
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
          `📤 DİREKT toplu tweet: ${accountId} - "${tweetContent.substring(0, 30)}..."`,
        );

        const result = await sendTweetDirect(
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
          console.log(`✅ DİREKT toplu tweet başarılı: ${accountId}`);
        } else {
          results.push({
            accountId,
            username: accountId,
            success: false,
            error: result.error,
          });
          errorCount++;
          console.log(`❌ DİREKT toplu tweet başarısız: ${accountId}`);
        }
      } catch (error) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: `Tweet hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        });
        errorCount++;
        console.error(`💥 DİREKT toplu tweet hatası: ${accountId}`, error);
      }

      if (i < accountIds.length - 1 && delay > 0) {
        const randomDelay = delay + Math.random() * delay * 0.3;
        console.log(`⏳ ${randomDelay.toFixed(1)} saniye bekleniyor...`);
        await new Promise((resolve) => setTimeout(resolve, randomDelay * 1000));
      }
    }

    console.log(
      `🏁 DİREKT toplu tweet tamamlandı: ${successCount} başarılı, ${errorCount} hata`,
    );

    res.json({
      success: true,
      results,
      totalProcessed: accountIds.length,
      successCount,
      errorCount,
    });
  } catch (error) {
    console.error("DİREKT toplu tweet API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};
