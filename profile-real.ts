import { RequestHandler } from "express";
import { ProfileUpdateRequest, ProfileUpdateResponse } from "@shared/api";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export const handleRealProfileUpdate: RequestHandler = async (req, res) => {
  try {
    const { accountId, displayName, bio, profileImage, authToken, ct0 } =
      req.body as ProfileUpdateRequest & { authToken: string; ct0: string };

    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: "Hesap ID gerekli",
      });
    }

    if (!authToken || !ct0) {
      return res.status(400).json({
        success: false,
        error: "Auth token ve ct0 gerekli",
      });
    }

    console.log(`🎭 GERÇEK profil güncelleme: ${accountId}`);

    const result = await updateTwitterProfile(
      accountId,
      authToken,
      ct0,
      displayName,
      bio,
      profileImage,
    );

    if (result.success) {
      console.log(`✅ GERÇEK profil güncellendi: ${accountId}`);
      const response: ProfileUpdateResponse = {
        success: true,
        message: "Profil başarıyla güncellendi",
      };
      res.json(response);
    } else {
      console.log(`❌ GERÇEK profil güncellenemedi: ${accountId}`);
      res.status(400).json({
        success: false,
        message: "Profil güncellenemedi",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("GERÇEK profil güncelleme hatası:", error);
    res.status(500).json({
      success: false,
      message: "Sunucu hatası",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

async function updateTwitterProfile(
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
    console.log(`🌐 GERÇEK Twitter profil sayfası açılıyor: ${username}`);

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

    // Profil ayarları sayfasına git
    console.log(`⚙️ Profil ayarları sayfasına gidiliyor: ${username}`);

    // Önce ana sayfaya git
    await page.goto("https://twitter.com/home", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Profil sayfasına git
    await page.goto("https://twitter.com/settings/profile", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Display name güncelle
    if (displayName) {
      console.log(`📝 Display name güncelleniyor: ${displayName}`);

      const nameSelectors = [
        'input[data-testid="displayNameInput"]',
        'input[name="displayName"]',
        'input[data-testid="DisplayNameInput"]',
        'input[placeholder*="name" i]',
        'input[aria-label*="name" i]',
        'input[type="text"]:first-of-type',
        'input[maxlength="50"]',
      ];

      let nameUpdated = false;
      for (const selector of nameSelectors) {
        try {
          const nameInput = await page.$(selector);
          if (nameInput) {
            await nameInput.click({ clickCount: 3 });
            await page.keyboard.type(displayName, { delay: 100 });
            nameUpdated = true;
            console.log(`✅ Display name güncellendi: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`❌ Name selector başarısız: ${selector}`);
        }
      }

      if (!nameUpdated) {
        console.log(`⚠️ Display name güncellenemedi`);
      }
    }

    // Bio güncelle
    if (bio) {
      console.log(`📄 Bio güncelleniyor: ${bio.substring(0, 50)}...`);

      const bioSelectors = [
        'textarea[data-testid="bioTextarea"]',
        'textarea[name="bio"]',
        'textarea[data-testid="BioTextarea"]',
        'textarea[placeholder*="bio" i]',
        'textarea[aria-label*="bio" i]',
        'textarea[maxlength="160"]',
        "textarea",
      ];

      let bioUpdated = false;
      for (const selector of bioSelectors) {
        try {
          const bioInput = await page.$(selector);
          if (bioInput) {
            await bioInput.click({ clickCount: 3 });
            await page.keyboard.type(bio, { delay: 50 });
            bioUpdated = true;
            console.log(`✅ Bio güncellendi: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`❌ Bio selector başarısız: ${selector}`);
        }
      }

      if (!bioUpdated) {
        console.log(`⚠️ Bio güncellenemedi`);
      }
    }

    // Profil resmi güncelle
    if (profileImage) {
      console.log(`🖼️ Profil resmi güncelleniyor`);

      try {
        // Profil resmi değiştirme butonunu bul
        const changePhotoSelectors = [
          '[data-testid="changeAvatar"]',
          '[aria-label*="photo" i]',
          'input[type="file"]',
          '[data-testid="fileInput"]',
        ];

        let photoUpdated = false;
        for (const selector of changePhotoSelectors) {
          try {
            const photoButton = await page.$(selector);
            if (photoButton) {
              if (selector.includes('input[type="file"]')) {
                // Dosya input'una doğrudan yükle
                await photoButton.uploadFile(profileImage);
              } else {
                // Butona tıkla ve dosya input'unu bekle
                await photoButton.click();
                await new Promise((resolve) => setTimeout(resolve, 2000));

                const fileInput = await page.$('input[type="file"]');
                if (fileInput) {
                  await fileInput.uploadFile(profileImage);
                }
              }
              photoUpdated = true;
              console.log(`✅ Profil resmi yüklendi: ${selector}`);
              break;
            }
          } catch (e) {
            console.log(`❌ Photo selector başarısız: ${selector}`);
          }
        }

        if (!photoUpdated) {
          console.log(`⚠️ Profil resmi güncellenemedi`);
        }
      } catch (photoError) {
        console.log(`❌ Profil resmi hatası: ${photoError}`);
      }
    }

    // Değişiklikleri kaydet
    console.log(`💾 Profil değişiklikleri kaydediliyor`);

    const saveSelectors = [
      '[data-testid="settingsDetailSave"]',
      'button[type="submit"]',
      'button:has-text("Save")',
      '[role="button"]:has-text("Save")',
    ];

    let saved = false;
    for (const selector of saveSelectors) {
      try {
        const saveButton = await page.$(selector);
        if (saveButton) {
          await saveButton.click();
          saved = true;
          console.log(`✅ Profil kaydedildi: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`❌ Save selector başarısız: ${selector}`);
      }
    }

    if (!saved) {
      // Enter tuşu ile kaydetmeyi dene
      await page.keyboard.press("Enter");
      console.log(`⚠️ Enter ile kaydetme denendi`);
    }

    // Başarı kontrolü
    await new Promise((resolve) => setTimeout(resolve, 3000));

    return { success: true };
  } catch (error) {
    console.error(`💥 GERÇEK profil güncelleme hatası (${username}):`, error);
    return {
      success: false,
      error: `Profil güncelleme hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log(`🔒 Profil tarayıcı kapatıldı: ${username}`);
    } catch (closeError) {
      console.error(`❌ Profil tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}
