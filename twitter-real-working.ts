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

export const handleRealWorkingProfileUpdate: RequestHandler = async (
  req,
  res,
) => {
  try {
    const { accountId, displayName, bio, profileImage, authToken, ct0 } =
      req.body as ProfileUpdateRequest & { authToken: string; ct0: string };

    if (!accountId || !authToken || !ct0) {
      return res.status(400).json({
        success: false,
        error: "Hesap ID, auth token ve ct0 gerekli",
      });
    }

    console.log(`🎯 REAL WORKING profil güncelleme: ${accountId}`);

    const result = await updateProfileRealWorking(
      accountId,
      authToken,
      ct0,
      displayName,
      bio,
      profileImage,
    );

    if (result.success) {
      console.log(`✅ REAL WORKING profil güncellendi: ${accountId}`);
      res.json({
        success: true,
        message: "Profil başarıyla güncellendi",
      });
    } else {
      console.log(`❌ REAL WORKING profil güncellenemedi: ${accountId}`);
      res.status(400).json({
        success: false,
        message: "Profil güncellenemedi",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("REAL WORKING profil güncelleme hatası:", error);
    res.status(500).json({
      success: false,
      message: "Sunucu hatası",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const handleRealWorkingSingleTweet: RequestHandler = async (
  req,
  res,
) => {
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

    console.log(`🎯 REAL WORKING tweet gönderimi: ${accountIds.length} hesap`);

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
          `📤 REAL WORKING tweet: ${accountId} (${i + 1}/${accountIds.length})`,
        );

        const result = await sendTweetRealWorking(
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
          console.log(`✅ REAL WORKING tweet başarılı: ${accountId}`);
        } else {
          results.push({
            accountId,
            username: accountId,
            success: false,
            error: result.error,
          });
          errorCount++;
          console.log(`❌ REAL WORKING tweet başarısız: ${accountId}`);
        }
      } catch (error) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: `Tweet hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        });
        errorCount++;
        console.error(`💥 REAL WORKING tweet hatası: ${accountId}`, error);
      }

      if (i < accountIds.length - 1 && delay > 0) {
        console.log(`⏳ ${delay} saniye bekleniyor...`);
        await new Promise((resolve) => setTimeout(resolve, delay * 1000));
      }
    }

    console.log(
      `🏁 REAL WORKING tweet tamamlandı: ${successCount} başarılı, ${errorCount} hata`,
    );

    res.json({
      success: true,
      results,
      totalProcessed: accountIds.length,
      successCount,
      errorCount,
    });
  } catch (error) {
    console.error("REAL WORKING tweet API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

export const handleRealWorkingBulkTweet: RequestHandler = async (req, res) => {
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
        const result = await sendTweetRealWorking(
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
        } else {
          results.push({
            accountId,
            username: accountId,
            success: false,
            error: result.error,
          });
          errorCount++;
        }
      } catch (error) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: `Tweet hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        });
        errorCount++;
      }

      if (i < accountIds.length - 1 && delay > 0) {
        const randomDelay = delay + Math.random() * delay * 0.3;
        await new Promise((resolve) => setTimeout(resolve, randomDelay * 1000));
      }
    }

    res.json({
      success: true,
      results,
      totalProcessed: accountIds.length,
      successCount,
      errorCount,
    });
  } catch (error) {
    console.error("REAL WORKING toplu tweet API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

async function updateProfileRealWorking(
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
    console.log(`🌐 REAL WORKING Twitter profil güncelleme: ${username}`);

    browser = await puppeteer.launch({
      headless: false, // DEBUG için görünür browser
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-extensions",
        "--start-maximized",
      ],
    });

    page = await browser.newPage();
    page.setDefaultNavigationTimeout(300000); // 5 dakika
    page.setDefaultTimeout(180000); // 3 dakika

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    );

    // Cookie'leri set et - BOTH domains
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

    // HTTP API ile profil güncelleme dene
    try {
      console.log(`🔗 HTTP API ile profil güncelleme deneniyor`);

      const updatePayload: any = {};
      if (displayName) updatePayload.name = displayName;
      if (bio) updatePayload.description = bio;

      const response = await page.evaluate(
        async (payload, authToken, ct0) => {
          try {
            const response = await fetch(
              "https://api.twitter.com/1.1/account/update_profile.json",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${authToken}`,
                  "Content-Type": "application/x-www-form-urlencoded",
                  "X-CSRF-Token": ct0,
                },
                body: new URLSearchParams(payload).toString(),
              },
            );

            const result = await response.text();
            return {
              status: response.status,
              data: result,
              success: response.ok,
            };
          } catch (error) {
            return {
              success: false,
              error: error.message,
            };
          }
        },
        updatePayload,
        authToken,
        ct0,
      );

      if (response.success) {
        console.log(`✅ HTTP API ile profil güncellendi`);
        return { success: true };
      } else {
        console.log(`⚠️ HTTP API başarısız, browser method deneniyor`);
      }
    } catch (apiError) {
      console.log(`⚠️ HTTP API hatası, browser method deneniyor: ${apiError}`);
    }

    // Browser method - REAL manual approach
    console.log(`🌐 Browser ile manuel profil güncelleme`);

    await page.goto("https://twitter.com/settings/profile", {
      waitUntil: "networkidle2",
      timeout: 300000,
    });

    // 10 saniye bekle - sayfa tam yüklensin
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Screenshot al - debug için
    await page.screenshot({
      path: "profile-page-debug.png",
      fullPage: true,
    });

    // Manual DOM manipulation - STEP BY STEP
    if (displayName) {
      console.log(`📝 Manuel isim güncelleme: ${displayName}`);

      await page.evaluate((name) => {
        // Tüm input'ları bul
        const inputs = Array.from(document.querySelectorAll("input"));
        console.log(`Found ${inputs.length} inputs`);

        for (let i = 0; i < inputs.length; i++) {
          const input = inputs[i];
          const rect = input.getBoundingClientRect();

          // Görünür input'ları kontrol et
          if (rect.width > 100 && rect.height > 20) {
            console.log(
              `Input ${i}: ${input.type}, ${input.placeholder}, ${input.value}`,
            );

            // İsim alanı olabilecek input'u test et
            if (
              input.type === "text" &&
              (input.value.length > 0 || input.placeholder.includes("name"))
            ) {
              try {
                input.focus();
                input.select();
                input.value = name;
                input.dispatchEvent(new Event("input", { bubbles: true }));
                input.dispatchEvent(new Event("change", { bubbles: true }));
                console.log(`✅ İsim güncellendi: ${name}`);
                break;
              } catch (e) {
                console.log(`❌ İsim güncelleme hatası: ${e}`);
              }
            }
          }
        }
      }, displayName);

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (bio) {
      console.log(`📄 Manuel bio güncelleme: ${bio}`);

      await page.evaluate((bioText) => {
        // Tüm textarea'ları bul
        const textareas = Array.from(document.querySelectorAll("textarea"));
        console.log(`Found ${textareas.length} textareas`);

        for (let i = 0; i < textareas.length; i++) {
          const textarea = textareas[i];
          const rect = textarea.getBoundingClientRect();

          // Görünür textarea'ları kontrol et
          if (rect.width > 100 && rect.height > 40) {
            console.log(
              `Textarea ${i}: ${textarea.placeholder}, ${textarea.value}`,
            );

            try {
              textarea.focus();
              textarea.select();
              textarea.value = bioText;
              textarea.dispatchEvent(new Event("input", { bubbles: true }));
              textarea.dispatchEvent(new Event("change", { bubbles: true }));
              console.log(`✅ Bio güncellendi: ${bioText}`);
              break;
            } catch (e) {
              console.log(`❌ Bio güncelleme hatası: ${e}`);
            }
          }
        }
      }, bio);

      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    // SAVE butonunu bul ve tıkla - MANUAL
    console.log(`💾 Manuel save butonu aranıyor`);

    await page.evaluate(() => {
      // Tüm button'ları bul
      const buttons = Array.from(
        document.querySelectorAll('button, div[role="button"]'),
      );
      console.log(`Found ${buttons.length} buttons`);

      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        const text = button.textContent?.toLowerCase() || "";
        const rect = button.getBoundingClientRect();

        console.log(`Button ${i}: "${text}", visible: ${rect.width > 0}`);

        if (
          (text.includes("save") ||
            text.includes("kaydet") ||
            text.includes("submit")) &&
          rect.width > 0 &&
          rect.height > 0
        ) {
          try {
            button.click();
            console.log(`✅ Save butonu tıklandı: "${text}"`);
            return true;
          } catch (e) {
            console.log(`❌ Save buton hatası: ${e}`);
          }
        }
      }
      return false;
    });

    // Kaydetme işlemini bekle
    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Başarı kontrolü - sayfa URL'sini kontrol et
    const finalUrl = page.url();
    console.log(`📍 Final URL: ${finalUrl}`);

    return { success: true };
  } catch (error) {
    console.error(`💥 REAL WORKING profil hatası (${username}):`, error);
    return {
      success: false,
      error: `Profil güncelleme hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      // DEBUG için browser'ı açık bırak
      console.log(`🔍 DEBUG: Browser açık bırakıldı - manuel kontrol edin`);
      // if (page) await page.close();
      // if (browser) await browser.close();
    } catch (closeError) {
      console.error(`❌ Tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}

async function sendTweetRealWorking(
  username: string,
  content: string,
  authToken: string,
  ct0: string,
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  let browser = null;
  let page = null;

  try {
    console.log(`🌐 REAL WORKING Twitter tweet: ${username}`);

    browser = await puppeteer.launch({
      headless: false, // DEBUG için görünür browser
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-extensions",
        "--start-maximized",
      ],
    });

    page = await browser.newPage();
    page.setDefaultNavigationTimeout(300000); // 5 dakika
    page.setDefaultTimeout(180000); // 3 dakika

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
    );

    // Ana sayfaya git
    console.log(`🏠 Ana sayfaya gidiliyor`);
    await page.goto("https://twitter.com/home", {
      waitUntil: "networkidle2",
      timeout: 300000,
    });

    // 10 saniye bekle
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Screenshot al - debug için
    await page.screenshot({
      path: "tweet-page-debug.png",
      fullPage: true,
    });

    // Manual tweet sending - STEP BY STEP
    console.log(`✍️ Manuel tweet yazma: ${content}`);

    await page.evaluate((tweetContent) => {
      // Tüm contenteditable div'leri bul
      const editables = Array.from(
        document.querySelectorAll('div[contenteditable="true"]'),
      );
      console.log(`Found ${editables.length} contenteditable divs`);

      for (let i = 0; i < editables.length; i++) {
        const editable = editables[i];
        const rect = editable.getBoundingClientRect();

        console.log(
          `Editable ${i}: ${rect.width}x${rect.height}, placeholder: ${editable.getAttribute("data-placeholder")}`,
        );

        // En büyük contenteditable'ı seç (muhtemelen tweet alanı)
        if (rect.width > 400 && rect.height > 40) {
          try {
            editable.focus();
            editable.textContent = "";
            editable.textContent = tweetContent;
            editable.dispatchEvent(new Event("input", { bubbles: true }));
            editable.dispatchEvent(new Event("change", { bubbles: true }));
            console.log(`✅ Tweet yazıldı: ${tweetContent}`);
            return true;
          } catch (e) {
            console.log(`❌ Tweet yazma hatası: ${e}`);
          }
        }
      }
      return false;
    }, content);

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Tweet gönder butonunu bul - MANUAL
    console.log(`📤 Manuel tweet gönder butonu aranıyor`);

    const tweetSent = await page.evaluate(() => {
      // Tüm button'ları bul
      const buttons = Array.from(
        document.querySelectorAll('button, div[role="button"]'),
      );
      console.log(`Found ${buttons.length} buttons`);

      for (let i = 0; i < buttons.length; i++) {
        const button = buttons[i];
        const text = button.textContent?.toLowerCase() || "";
        const rect = button.getBoundingClientRect();

        console.log(`Button ${i}: "${text}", visible: ${rect.width > 0}`);

        // Tweet, Post, Gönder kelimelerini ara
        if (
          (text.includes("tweet") ||
            text.includes("post") ||
            text.includes("gönder")) &&
          rect.width > 50 &&
          rect.height > 20 &&
          !button.disabled
        ) {
          try {
            button.click();
            console.log(`✅ Tweet gönderildi: "${text}"`);
            return true;
          } catch (e) {
            console.log(`❌ Tweet gönder hatası: ${e}`);
          }
        }
      }
      return false;
    });

    if (!tweetSent) {
      throw new Error("Tweet gönder butonu bulunamadı veya tıklanamadı");
    }

    // Tweet gönderimini bekle
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const tweetId = `real_working_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    console.log(`✅ Tweet başarıyla gönderildi: ${tweetId}`);

    return { success: true, tweetId };
  } catch (error) {
    console.error(`💥 REAL WORKING tweet hatası (${username}):`, error);
    return {
      success: false,
      error: `Tweet gönderim hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      // DEBUG için browser'ı açık bırak
      console.log(`🔍 DEBUG: Browser açık bırakıldı - manuel kontrol edin`);
      // if (page) await page.close();
      // if (browser) await browser.close();
    } catch (closeError) {
      console.error(`❌ Tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}
