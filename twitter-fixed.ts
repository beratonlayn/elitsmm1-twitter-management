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

export const handleFixedProfileUpdate: RequestHandler = async (req, res) => {
  try {
    const { accountId, displayName, bio, profileImage, authToken, ct0 } =
      req.body as ProfileUpdateRequest & { authToken: string; ct0: string };

    if (!accountId || !authToken || !ct0) {
      return res.status(400).json({
        success: false,
        error: "Hesap ID, auth token ve ct0 gerekli",
      });
    }

    console.log(`🎭 FIXED profil güncelleme: ${accountId}`);

    const result = await updateProfileFixed(
      accountId,
      authToken,
      ct0,
      displayName,
      bio,
      profileImage,
    );

    if (result.success) {
      console.log(`✅ FIXED profil güncellendi: ${accountId}`);
      res.json({
        success: true,
        message: "Profil başarıyla güncellendi",
      });
    } else {
      console.log(`❌ FIXED profil güncellenemedi: ${accountId}`);
      res.status(400).json({
        success: false,
        message: "Profil güncellenemedi",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("FIXED profil güncelleme hatası:", error);
    res.status(500).json({
      success: false,
      message: "Sunucu hatası",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const handleFixedSingleTweet: RequestHandler = async (req, res) => {
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

    console.log(`🐦 FIXED tweet gönderimi: ${accountIds.length} hesap`);

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
          `📤 FIXED tweet: ${accountId} (${i + 1}/${accountIds.length})`,
        );

        const result = await sendTweetFixed(
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
          console.log(`✅ FIXED tweet başarılı: ${accountId}`);
        } else {
          results.push({
            accountId,
            username: accountId,
            success: false,
            error: result.error,
          });
          errorCount++;
          console.log(`❌ FIXED tweet başarısız: ${accountId}`);
        }
      } catch (error) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: `Tweet hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        });
        errorCount++;
        console.error(`💥 FIXED tweet hatası: ${accountId}`, error);
      }

      if (i < accountIds.length - 1 && delay > 0) {
        console.log(`⏳ ${delay} saniye bekleniyor...`);
        await new Promise((resolve) => setTimeout(resolve, delay * 1000));
      }
    }

    console.log(
      `🏁 FIXED tweet tamamlandı: ${successCount} başarılı, ${errorCount} hata`,
    );

    res.json({
      success: true,
      results,
      totalProcessed: accountIds.length,
      successCount,
      errorCount,
    });
  } catch (error) {
    console.error("FIXED tweet API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

export const handleFixedBulkTweet: RequestHandler = async (req, res) => {
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
      `🐦 FIXED toplu tweet: ${accountIds.length} hesap, ${tweets.length} tweet`,
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
          `📤 FIXED toplu tweet: ${accountId} - "${tweetContent.substring(0, 30)}..."`,
        );

        const result = await sendTweetFixed(
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
          console.log(`✅ FIXED toplu tweet başarılı: ${accountId}`);
        } else {
          results.push({
            accountId,
            username: accountId,
            success: false,
            error: result.error,
          });
          errorCount++;
          console.log(`❌ FIXED toplu tweet başarısız: ${accountId}`);
        }
      } catch (error) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: `Tweet hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        });
        errorCount++;
        console.error(`💥 FIXED toplu tweet hatası: ${accountId}`, error);
      }

      if (i < accountIds.length - 1 && delay > 0) {
        const randomDelay = delay + Math.random() * delay * 0.3;
        console.log(`⏳ ${randomDelay.toFixed(1)} saniye bekleniyor...`);
        await new Promise((resolve) => setTimeout(resolve, randomDelay * 1000));
      }
    }

    console.log(
      `🏁 FIXED toplu tweet tamamlandı: ${successCount} başarılı, ${errorCount} hata`,
    );

    res.json({
      success: true,
      results,
      totalProcessed: accountIds.length,
      successCount,
      errorCount,
    });
  } catch (error) {
    console.error("FIXED toplu tweet API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

async function updateProfileFixed(
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
    console.log(`🌐 FIXED Twitter profil güncelleme: ${username}`);

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

    // Timeout ayarları
    page.setDefaultNavigationTimeout(120000); // 2 dakika
    page.setDefaultTimeout(90000); // 1.5 dakika

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
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
      {
        name: "auth_token",
        value: authToken,
        domain: ".x.com",
        path: "/",
        httpOnly: true,
        secure: true,
      },
      {
        name: "ct0",
        value: ct0,
        domain: ".x.com",
        path: "/",
        httpOnly: false,
        secure: true,
      },
    );

    // Profil sayfasına git - timeout ile
    console.log(`⚙️ Twitter profil sayfasına gidiliyor`);

    let profileUrl = "https://twitter.com/settings/profile";
    try {
      await page.goto(profileUrl, {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });
    } catch (error) {
      console.log(`⚠️ Twitter.com başarısız, X.com deneniyor`);
      profileUrl = "https://x.com/settings/profile";
      await page.goto(profileUrl, {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });
    }

    // Sayfa yüklenmesini bekle
    await new Promise((resolve) => setTimeout(resolve, 8000));

    // JavaScript ile profil güncelleme
    const updateResult = await page.evaluate(
      async (displayName, bio) => {
        console.log("🔧 JavaScript ile profil güncelleme başlıyor");

        await new Promise((resolve) => setTimeout(resolve, 2000));

        // İsim güncelle
        if (displayName) {
          console.log(`📝 İsim güncelleniyor: ${displayName}`);

          const nameSelectors = [
            'input[data-testid="DisplayNameInput"]',
            'input[data-testid="displayNameInput"]',
            'input[name="displayName"]',
            'input[placeholder*="name" i]',
            'input[aria-label*="name" i]',
            'input[type="text"]',
          ];

          let nameUpdated = false;
          for (const selector of nameSelectors) {
            const inputs = document.querySelectorAll(selector);
            for (const input of inputs) {
              try {
                if (input.offsetParent !== null) {
                  // Görünür mü?
                  input.focus();
                  input.value = "";
                  input.value = displayName;
                  input.dispatchEvent(new Event("input", { bubbles: true }));
                  input.dispatchEvent(new Event("change", { bubbles: true }));
                  console.log(`✅ İsim güncellendi: ${selector}`);
                  nameUpdated = true;
                  break;
                }
              } catch (e) {
                console.log(`❌ İsim input hatası: ${e}`);
              }
            }
            if (nameUpdated) break;
          }
        }

        // Bio güncelle
        if (bio) {
          console.log(`📄 Bio güncelleniyor: ${bio}`);

          const bioSelectors = [
            'textarea[data-testid="BioTextarea"]',
            'textarea[data-testid="bioTextarea"]',
            'textarea[name="bio"]',
            'textarea[placeholder*="bio" i]',
            'textarea[aria-label*="bio" i]',
            "textarea",
          ];

          let bioUpdated = false;
          for (const selector of bioSelectors) {
            const textareas = document.querySelectorAll(selector);
            for (const textarea of textareas) {
              try {
                if (textarea.offsetParent !== null) {
                  // Görünür mü?
                  textarea.focus();
                  textarea.value = "";
                  textarea.value = bio;
                  textarea.dispatchEvent(new Event("input", { bubbles: true }));
                  textarea.dispatchEvent(
                    new Event("change", { bubbles: true }),
                  );
                  console.log(`✅ Bio güncellendi: ${selector}`);
                  bioUpdated = true;
                  break;
                }
              } catch (e) {
                console.log(`❌ Bio textarea hatası: ${e}`);
              }
            }
            if (bioUpdated) break;
          }
        }

        // Kaydet
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const saveSelectors = [
          'button[data-testid="settingsDetailSave"]',
          'div[data-testid="settingsDetailSave"]',
          '[role="button"][data-testid="settingsDetailSave"]',
          'button[type="submit"]',
          'button:contains("Save")',
        ];

        let saved = false;
        for (const selector of saveSelectors) {
          const buttons = document.querySelectorAll(selector);
          for (const button of buttons) {
            try {
              if (button.offsetParent !== null && !button.disabled) {
                button.click();
                console.log(`✅ Kaydet butonu tıklandı: ${selector}`);
                saved = true;
                break;
              }
            } catch (e) {
              console.log(`❌ Kaydet butonu hatası: ${e}`);
            }
          }
          if (saved) break;
        }

        return { success: true };
      },
      displayName,
      bio,
    );

    console.log(`📄 JavaScript güncelleme sonucu:`, updateResult);

    // Kaydetme işlemini bekle
    await new Promise((resolve) => setTimeout(resolve, 5000));

    return { success: true };
  } catch (error) {
    console.error(`💥 FIXED profil hatası (${username}):`, error);
    return {
      success: false,
      error: `Profil güncelleme hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log(`🔒 FIXED profil tarayıcı kapatıldı: ${username}`);
    } catch (closeError) {
      console.error(`❌ Tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}

async function sendTweetFixed(
  username: string,
  content: string,
  authToken: string,
  ct0: string,
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  let browser = null;
  let page = null;

  try {
    console.log(`🌐 FIXED Twitter tweet: ${username}`);

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

    // Timeout ayarları
    page.setDefaultNavigationTimeout(120000); // 2 dakika
    page.setDefaultTimeout(90000); // 1.5 dakika

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
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
      {
        name: "auth_token",
        value: authToken,
        domain: ".x.com",
        path: "/",
        httpOnly: true,
        secure: true,
      },
      {
        name: "ct0",
        value: ct0,
        domain: ".x.com",
        path: "/",
        httpOnly: false,
        secure: true,
      },
    );

    // Ana sayfaya git
    console.log(`🏠 Twitter ana sayfasına gidiliyor`);

    let homeUrl = "https://twitter.com/home";
    try {
      await page.goto(homeUrl, {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });
    } catch (error) {
      console.log(`⚠️ Twitter.com başarısız, X.com deneniyor`);
      homeUrl = "https://x.com/home";
      await page.goto(homeUrl, {
        waitUntil: "domcontentloaded",
        timeout: 120000,
      });
    }

    // Sayfa yüklenmesini bekle
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // JavaScript ile tweet gönderme
    const tweetResult = await page.evaluate(async (content) => {
      console.log("🔧 JavaScript ile tweet gönderme başlıyor");

      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Tweet alanı bul
      const tweetSelectors = [
        '[data-testid="tweetTextarea_0"]',
        'div[data-testid="tweetTextarea_0"]',
        '[role="textbox"][contenteditable="true"]',
        '[contenteditable="true"][role="textbox"]',
        'div[aria-label*="Tweet" i][contenteditable="true"]',
        ".public-DraftEditor-content",
      ];

      console.log(`📝 Tweet alanı aranıyor...`);

      let tweetArea = null;
      for (const selector of tweetSelectors) {
        const areas = document.querySelectorAll(selector);
        for (const area of areas) {
          try {
            if (area.offsetParent !== null && area.contentEditable === "true") {
              tweetArea = area;
              console.log(`✅ Tweet alanı bulundu: ${selector}`);
              break;
            }
          } catch (e) {
            console.log(`❌ Tweet alanı kontrolü hatası: ${e}`);
          }
        }
        if (tweetArea) break;
      }

      if (!tweetArea) {
        throw new Error("Tweet yazma alanı bulunamadı");
      }

      // Tweet yaz
      tweetArea.focus();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      tweetArea.textContent = content;
      tweetArea.dispatchEvent(new Event("input", { bubbles: true }));
      tweetArea.dispatchEvent(new Event("change", { bubbles: true }));

      console.log(`✍️ Tweet yazıldı: ${content.substring(0, 50)}...`);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Tweet gönder
      const sendSelectors = [
        '[data-testid="tweetButtonInline"]',
        '[data-testid="tweetButton"]',
        'button[data-testid="tweetButtonInline"]',
        'button[data-testid="tweetButton"]',
        'div[data-testid="tweetButtonInline"]',
      ];

      console.log(`📤 Gönder butonu aranıyor...`);

      let sent = false;
      for (const selector of sendSelectors) {
        const buttons = document.querySelectorAll(selector);
        for (const button of buttons) {
          try {
            if (
              button.offsetParent !== null &&
              !button.disabled &&
              button.getAttribute("aria-disabled") !== "true"
            ) {
              button.click();
              console.log(`✅ Tweet gönderildi: ${selector}`);
              sent = true;
              break;
            }
          } catch (e) {
            console.log(`❌ Gönder butonu hatası: ${e}`);
          }
        }
        if (sent) break;
      }

      if (!sent) {
        throw new Error("Tweet gönder butonu bulunamadı");
      }

      return { success: true };
    }, content);

    console.log(`📄 JavaScript tweet sonucu:`, tweetResult);

    // Tweet gönderimini bekle
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const tweetId = `fixed_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return { success: true, tweetId };
  } catch (error) {
    console.error(`💥 FIXED tweet hatası (${username}):`, error);
    return {
      success: false,
      error: `Tweet gönderim hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log(`🔒 FIXED tweet tarayıcı kapatıldı: ${username}`);
    } catch (closeError) {
      console.error(`❌ Tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}
