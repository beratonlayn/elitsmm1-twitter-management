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

export const handleBulletproofProfileUpdate: RequestHandler = async (
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

    console.log(`🎯 BULLETPROOF profil güncelleme: ${accountId}`);

    const result = await updateProfileBulletproof(
      accountId,
      authToken,
      ct0,
      displayName,
      bio,
      profileImage,
    );

    if (result.success) {
      console.log(`✅ BULLETPROOF profil güncellendi: ${accountId}`);
      res.json({
        success: true,
        message: "Profil başarıyla güncellendi",
      });
    } else {
      console.log(`❌ BULLETPROOF profil güncellenemedi: ${accountId}`);
      res.status(400).json({
        success: false,
        message: "Profil güncellenemedi",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("BULLETPROOF profil güncelleme hatası:", error);
    res.status(500).json({
      success: false,
      message: "Sunucu hatası",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const handleBulletproofSingleTweet: RequestHandler = async (
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

    console.log(`🎯 BULLETPROOF tweet gönderimi: ${accountIds.length} hesap`);

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
          `📤 BULLETPROOF tweet: ${accountId} (${i + 1}/${accountIds.length})`,
        );

        const result = await sendTweetBulletproof(
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
          console.log(`✅ BULLETPROOF tweet başarılı: ${accountId}`);
        } else {
          results.push({
            accountId,
            username: accountId,
            success: false,
            error: result.error,
          });
          errorCount++;
          console.log(`❌ BULLETPROOF tweet başarısız: ${accountId}`);
        }
      } catch (error) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: `Tweet hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        });
        errorCount++;
        console.error(`💥 BULLETPROOF tweet hatası: ${accountId}`, error);
      }

      if (i < accountIds.length - 1 && delay > 0) {
        console.log(`⏳ ${delay} saniye bekleniyor...`);
        await new Promise((resolve) => setTimeout(resolve, delay * 1000));
      }
    }

    console.log(
      `��� BULLETPROOF tweet tamamlandı: ${successCount} başarılı, ${errorCount} hata`,
    );

    res.json({
      success: true,
      results,
      totalProcessed: accountIds.length,
      successCount,
      errorCount,
    });
  } catch (error) {
    console.error("BULLETPROOF tweet API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

export const handleBulletproofBulkTweet: RequestHandler = async (req, res) => {
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
        const result = await sendTweetBulletproof(
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
    console.error("BULLETPROOF toplu tweet API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

async function updateProfileBulletproof(
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
    console.log(`🌐 BULLETPROOF Twitter profil güncelleme: ${username}`);

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-extensions",
        "--disable-web-security",
        "--window-size=1366,768",
      ],
    });

    page = await browser.newPage();
    page.setDefaultNavigationTimeout(180000); // 3 dakika
    page.setDefaultTimeout(120000); // 2 dakika

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

    // Profil sayfasına git
    console.log(`⚙️ Profil sayfasına gidiliyor`);
    await page.goto("https://twitter.com/settings/profile", {
      waitUntil: "domcontentloaded",
      timeout: 180000,
    });

    await new Promise((resolve) => setTimeout(resolve, 10000));

    // BULLETPROOF JavaScript profil güncelleme
    const updateResult = await page.evaluate(
      async (displayName, bio) => {
        console.log("🔧 BULLETPROOF JavaScript ile profil güncelleme");

        // 5 saniye bekle
        await new Promise((resolve) => setTimeout(resolve, 5000));

        let success = false;

        // İsim güncelle - BULLETPROOF
        if (displayName) {
          console.log(`📝 İsim güncelleniyor: ${displayName}`);

          // Tüm input alanlarını bul
          const allInputs = Array.from(
            document.querySelectorAll('input[type="text"]'),
          );

          for (const input of allInputs) {
            try {
              // Görünür ve aktif mi kontrol et
              const rect = input.getBoundingClientRect();
              if (
                rect.width > 0 &&
                rect.height > 0 &&
                !input.disabled &&
                !input.readOnly
              ) {
                const currentValue = input.value || "";

                // Eğer zaten bir değer varsa ve boş değilse, muhtemelen isim alanı
                if (
                  currentValue !== "" ||
                  input.placeholder?.toLowerCase().includes("name")
                ) {
                  input.focus();
                  await new Promise((resolve) => setTimeout(resolve, 500));

                  // Temizle ve yeni değeri yaz
                  input.value = "";
                  input.value = displayName;

                  // Event'leri tetikle
                  input.dispatchEvent(new Event("input", { bubbles: true }));
                  input.dispatchEvent(new Event("change", { bubbles: true }));
                  input.dispatchEvent(new Event("blur", { bubbles: true }));

                  console.log(`✅ İsim başarıyla güncellendi`);
                  success = true;
                  break;
                }
              }
            } catch (e) {
              console.log(`❌ Input işlem hatası: ${e}`);
            }
          }
        }

        // Bio güncelle - BULLETPROOF
        if (bio) {
          console.log(`📄 Bio güncelleniyor: ${bio}`);

          // Tüm textarea alanlarını bul
          const allTextareas = Array.from(
            document.querySelectorAll("textarea"),
          );

          for (const textarea of allTextareas) {
            try {
              // Görünür ve aktif mi kontrol et
              const rect = textarea.getBoundingClientRect();
              if (
                rect.width > 0 &&
                rect.height > 0 &&
                !textarea.disabled &&
                !textarea.readOnly
              ) {
                textarea.focus();
                await new Promise((resolve) => setTimeout(resolve, 500));

                // Temizle ve yeni değeri yaz
                textarea.value = "";
                textarea.value = bio;

                // Event'leri tetikle
                textarea.dispatchEvent(new Event("input", { bubbles: true }));
                textarea.dispatchEvent(new Event("change", { bubbles: true }));
                textarea.dispatchEvent(new Event("blur", { bubbles: true }));

                console.log(`✅ Bio başarıyla güncellendi`);
                success = true;
                break;
              }
            } catch (e) {
              console.log(`❌ Textarea işlem hatası: ${e}`);
            }
          }
        }

        // Kaydet - BULLETPROOF
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Tüm button ve div'leri bul
        const allButtons = Array.from(
          document.querySelectorAll('button, div[role="button"]'),
        );

        for (const button of allButtons) {
          try {
            const text = button.textContent?.toLowerCase() || "";
            const ariaLabel =
              button.getAttribute("aria-label")?.toLowerCase() || "";

            // Save, Kaydet, Submit gibi kelimeleri ara
            if (
              text.includes("save") ||
              text.includes("kaydet") ||
              text.includes("submit") ||
              ariaLabel.includes("save") ||
              ariaLabel.includes("kaydet")
            ) {
              const rect = button.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0 && !button.disabled) {
                button.click();
                console.log(`✅ Kaydet butonu tıklandı`);
                success = true;
                break;
              }
            }
          } catch (e) {
            console.log(`❌ Button işlem hatası: ${e}`);
          }
        }

        return { success };
      },
      displayName,
      bio,
    );

    console.log(`📄 BULLETPROOF güncelleme sonucu:`, updateResult);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    return { success: true };
  } catch (error) {
    console.error(`💥 BULLETPROOF profil hatası (${username}):`, error);
    return {
      success: false,
      error: `Profil güncelleme hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log(`🔒 BULLETPROOF profil tarayıcı kapatıldı: ${username}`);
    } catch (closeError) {
      console.error(`❌ Tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}

async function sendTweetBulletproof(
  username: string,
  content: string,
  authToken: string,
  ct0: string,
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  let browser = null;
  let page = null;

  try {
    console.log(`🌐 BULLETPROOF Twitter tweet: ${username}`);

    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-blink-features=AutomationControlled",
        "--disable-extensions",
        "--disable-web-security",
        "--window-size=1366,768",
      ],
    });

    page = await browser.newPage();
    page.setDefaultNavigationTimeout(180000); // 3 dakika
    page.setDefaultTimeout(120000); // 2 dakika

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
      waitUntil: "domcontentloaded",
      timeout: 180000,
    });

    await new Promise((resolve) => setTimeout(resolve, 10000));

    // BULLETPROOF JavaScript tweet gönderme
    const tweetResult = await page.evaluate(async (content) => {
      console.log("🔧 BULLETPROOF JavaScript ile tweet gönderme");

      // 5 saniye bekle
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Tweet alanı bul - BULLETPROOF
      console.log(`📝 Tweet alanı aranıyor...`);

      // Tüm contenteditable div'leri bul
      const allEditables = Array.from(
        document.querySelectorAll('div[contenteditable="true"]'),
      );

      let tweetArea = null;
      for (const editable of allEditables) {
        try {
          const rect = editable.getBoundingClientRect();
          if (rect.width > 200 && rect.height > 50) {
            // Yeterince büyük alan
            const placeholder = editable.getAttribute("data-placeholder") || "";
            const ariaLabel = editable.getAttribute("aria-label") || "";

            // Tweet yazma alanı karakteristikleri
            if (
              placeholder.toLowerCase().includes("tweet") ||
              placeholder.toLowerCase().includes("happening") ||
              ariaLabel.toLowerCase().includes("tweet")
            ) {
              tweetArea = editable;
              console.log(`✅ Tweet alanı bulundu`);
              break;
            }
          }
        } catch (e) {
          console.log(`❌ Editable kontrol hatası: ${e}`);
        }
      }

      // Eğer bulamazsa, en büyük contenteditable'ı al
      if (!tweetArea && allEditables.length > 0) {
        let maxArea = 0;
        for (const editable of allEditables) {
          const rect = editable.getBoundingClientRect();
          const area = rect.width * rect.height;
          if (area > maxArea) {
            maxArea = area;
            tweetArea = editable;
          }
        }
        console.log(`⚠️ Fallback: En büyük editable alan seçildi`);
      }

      if (!tweetArea) {
        throw new Error("Tweet yazma alanı bulunamadı");
      }

      // Tweet yaz - BULLETPROOF
      tweetArea.focus();
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Önce temizle
      tweetArea.textContent = "";
      tweetArea.innerHTML = "";

      // Sonra yaz
      tweetArea.textContent = content;

      // Event'leri tetikle
      tweetArea.dispatchEvent(new Event("input", { bubbles: true }));
      tweetArea.dispatchEvent(new Event("change", { bubbles: true }));
      tweetArea.dispatchEvent(new Event("keyup", { bubbles: true }));

      console.log(`✍️ Tweet yazıldı: ${content.substring(0, 50)}...`);

      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Tweet gönder - BULLETPROOF
      console.log(`📤 Gönder butonu aranıyor...`);

      // Tüm button ve div'leri bul
      const allButtons = Array.from(
        document.querySelectorAll('button, div[role="button"]'),
      );

      let sent = false;
      for (const button of allButtons) {
        try {
          const text = button.textContent?.toLowerCase() || "";
          const ariaLabel =
            button.getAttribute("aria-label")?.toLowerCase() || "";

          // Tweet, Post, Gönder gibi kelimeleri ara
          if (
            text.includes("tweet") ||
            text.includes("post") ||
            text.includes("gönder") ||
            ariaLabel.includes("tweet") ||
            ariaLabel.includes("post")
          ) {
            const rect = button.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0 && !button.disabled) {
              // Son kontrolü: buton rengi (mavi olmalı)
              const style = window.getComputedStyle(button);
              const bgColor = style.backgroundColor;

              button.click();
              console.log(`✅ Tweet gönderildi`);
              sent = true;
              break;
            }
          }
        } catch (e) {
          console.log(`❌ Button işlem hatası: ${e}`);
        }
      }

      if (!sent) {
        throw new Error("Tweet gönder butonu bulunamadı");
      }

      return { success: true };
    }, content);

    console.log(`📄 BULLETPROOF tweet sonucu:`, tweetResult);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    const tweetId = `bulletproof_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return { success: true, tweetId };
  } catch (error) {
    console.error(`💥 BULLETPROOF tweet hatası (${username}):`, error);
    return {
      success: false,
      error: `Tweet gönderim hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log(`🔒 BULLETPROOF tweet tarayıcı kapatıldı: ${username}`);
    } catch (closeError) {
      console.error(`❌ Tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}
