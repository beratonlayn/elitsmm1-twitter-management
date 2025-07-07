import { RequestHandler } from "express";
import { ProfileUpdateRequest, ProfileUpdateResponse } from "@shared/api";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export const handleOptimizedProfileUpdate: RequestHandler = async (
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

    console.log(`🎭 OPTİMİZE profil güncelleme: ${accountId}`);

    const result = await updateTwitterProfileOptimized(
      accountId,
      authToken,
      ct0,
      displayName,
      bio,
      profileImage,
    );

    if (result.success) {
      console.log(`✅ OPTİMİZE profil güncellendi: ${accountId}`);
      res.json({
        success: true,
        message: "Profil başarıyla güncellendi",
      });
    } else {
      console.log(`❌ OPTİMİZE profil güncellenemedi: ${accountId}`);
      res.status(400).json({
        success: false,
        message: "Profil güncellenemedi",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("OPTİMİZE profil güncelleme hatası:", error);
    res.status(500).json({
      success: false,
      message: "Sunucu hatası",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

async function updateTwitterProfileOptimized(
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
    console.log(`🌐 HIZLI Twitter profil güncelleme: ${username}`);

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

    // Hızlı user agent
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

    // Direkt profil edit sayfasına git
    console.log(`⚡ Direkt profil düzenleme sayfasına gidiliyor`);
    await page.goto("https://twitter.com/settings/profile", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    // Hızlı yükleme bekle
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Çoklu profil güncelleme - paralel işlem
    const updates = [];

    // Display name güncelle
    if (displayName) {
      updates.push(updateDisplayName(page, displayName));
    }

    // Bio güncelle
    if (bio) {
      updates.push(updateBio(page, bio));
    }

    // Profil resmi güncelle
    if (profileImage) {
      updates.push(updateProfileImage(page, profileImage));
    }

    // Tüm güncellemeleri paralel çalıştır
    const results = await Promise.allSettled(updates);

    // Sonuçları kontrol et
    const failed = results.filter((r) => r.status === "rejected");
    if (failed.length > 0) {
      console.log(
        `⚠️ Bazı güncellemeler başarısız: ${failed.length}/${results.length}`,
      );
    }

    // Kaydet
    await saveProfile(page);

    return { success: true };
  } catch (error) {
    console.error(`💥 OPTİMİZE profil hatası (${username}):`, error);
    return {
      success: false,
      error: `Profil güncelleme hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log(`🔒 HIZLI profil tarayıcı kapatıldı: ${username}`);
    } catch (closeError) {
      console.error(`❌ Tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}

async function updateDisplayName(
  page: any,
  displayName: string,
): Promise<void> {
  console.log(`📝 Display name güncelleniyor: ${displayName}`);

  // 2024 Twitter güncel selectors
  const nameSelectors = [
    'input[data-testid="DisplayNameInput"]',
    'input[data-testid="displayNameInput"]',
    'input[name="displayName"]',
    'input[placeholder*="Name" i]',
    'input[aria-label*="name" i]',
    'input[maxlength="50"]',
    'input[type="text"]:first-of-type',
  ];

  for (const selector of nameSelectors) {
    try {
      const nameInput = await page.$(selector);
      if (nameInput) {
        await nameInput.click({ clickCount: 3 });
        await page.keyboard.type(displayName, { delay: 30 });
        console.log(`✅ Display name güncellendi: ${selector}`);
        return;
      }
    } catch (e) {
      console.log(`❌ Name selector başarısız: ${selector}`);
    }
  }

  throw new Error("Display name input bulunamadı");
}

async function updateBio(page: any, bio: string): Promise<void> {
  console.log(`📄 Bio güncelleniyor: ${bio.substring(0, 50)}...`);

  // 2024 Twitter güncel bio selectors
  const bioSelectors = [
    'textarea[data-testid="BioTextarea"]',
    'textarea[data-testid="bioTextarea"]',
    'textarea[name="bio"]',
    'textarea[placeholder*="bio" i]',
    'textarea[aria-label*="bio" i]',
    'textarea[maxlength="160"]',
    "textarea",
  ];

  for (const selector of bioSelectors) {
    try {
      const bioInput = await page.$(selector);
      if (bioInput) {
        await bioInput.click({ clickCount: 3 });
        await page.keyboard.type(bio, { delay: 20 });
        console.log(`✅ Bio güncellendi: ${selector}`);
        return;
      }
    } catch (e) {
      console.log(`❌ Bio selector başarısız: ${selector}`);
    }
  }

  throw new Error("Bio textarea bulunamadı");
}

async function updateProfileImage(
  page: any,
  profileImage: string,
): Promise<void> {
  console.log(`🖼️ Profil resmi güncelleniyor`);

  // 2024 Twitter güncel profil resmi selectors
  const photoSelectors = [
    '[data-testid="avatarPhoto"]',
    '[data-testid="changeAvatar"]',
    '[aria-label*="photo" i]',
    '[aria-label*="avatar" i]',
    'input[type="file"][accept*="image"]',
    'input[type="file"]',
  ];

  for (const selector of photoSelectors) {
    try {
      const photoElement = await page.$(selector);
      if (photoElement) {
        if (selector.includes('input[type="file"]')) {
          await photoElement.uploadFile(profileImage);
        } else {
          await photoElement.click();
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const fileInput = await page.$('input[type="file"]');
          if (fileInput) {
            await fileInput.uploadFile(profileImage);
          }
        }
        console.log(`✅ Profil resmi yüklendi: ${selector}`);
        return;
      }
    } catch (e) {
      console.log(`❌ Photo selector başarısız: ${selector}`);
    }
  }

  console.log(`⚠️ Profil resmi güncellenemedi`);
}

async function saveProfile(page: any): Promise<void> {
  console.log(`💾 Profil kaydediliyor`);

  // 2024 Twitter güncel save selectors
  const saveSelectors = [
    '[data-testid="settingsDetailSave"]',
    'button[data-testid="settingsDetailSave"]',
    'div[data-testid="settingsDetailSave"]',
    'button[type="submit"]',
    '[role="button"]:has-text("Save")',
    '[role="button"][aria-label*="Save" i]',
  ];

  for (const selector of saveSelectors) {
    try {
      const saveButton = await page.$(selector);
      if (saveButton) {
        await saveButton.click();
        console.log(`✅ Profil kaydedildi: ${selector}`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return;
      }
    } catch (e) {
      console.log(`❌ Save selector başarısız: ${selector}`);
    }
  }

  // Fallback: Enter tuşu
  await page.keyboard.press("Enter");
  console.log(`⚠️ Enter ile kaydetme denendi`);
}
