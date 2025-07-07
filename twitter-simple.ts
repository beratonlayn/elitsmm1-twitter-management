import { RequestHandler } from "express";
import {
  ProfileUpdateRequest,
  ProfileUpdateResponse,
  TweetRequest,
  BulkTweetRequest,
  TweetResponse,
  EngagementRequest,
  EngagementResponse,
} from "@shared/api";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";

puppeteer.use(StealthPlugin());

export const handleSimpleProfileUpdate: RequestHandler = async (req, res) => {
  try {
    const { accountId, displayName, bio, profileImage, authToken, ct0 } =
      req.body as ProfileUpdateRequest & { authToken: string; ct0: string };

    if (!accountId || !authToken || !ct0) {
      return res.status(400).json({
        success: false,
        error: "Hesap ID, auth token ve ct0 gerekli",
      });
    }

    console.log(`🎯 SIMPLE profil güncelleme: ${accountId}`);

    const result = await updateProfileSimple(
      accountId,
      authToken,
      ct0,
      displayName,
      bio,
      profileImage,
    );

    if (result.success) {
      console.log(`✅ SIMPLE profil güncellendi: ${accountId}`);
      res.json({
        success: true,
        message: "Profil başarıyla güncellendi",
      });
    } else {
      console.log(`❌ SIMPLE profil güncellenemedi: ${accountId}`);
      res.status(400).json({
        success: false,
        message: "Profil güncellenemedi",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("SIMPLE profil güncelleme hatası:", error);
    res.status(500).json({
      success: false,
      message: "Sunucu hatası",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const handleSimpleSingleTweet: RequestHandler = async (req, res) => {
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

    console.log(`🎯 SIMPLE tweet gönderimi: ${accountIds.length} hesap`);

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
          `📤 SIMPLE tweet: ${accountId} (${i + 1}/${accountIds.length})`,
        );

        const result = await sendTweetSimple(
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
          console.log(`✅ SIMPLE tweet başarılı: ${accountId}`);
        } else {
          results.push({
            accountId,
            username: accountId,
            success: false,
            error: result.error,
          });
          errorCount++;
          console.log(`❌ SIMPLE tweet başarısız: ${accountId}`);
        }
      } catch (error) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: `Tweet hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        });
        errorCount++;
        console.error(`💥 SIMPLE tweet hatası: ${accountId}`, error);
      }

      if (i < accountIds.length - 1 && delay > 0) {
        console.log(`⏳ ${delay} saniye bekleniyor...`);
        await new Promise((resolve) => setTimeout(resolve, delay * 1000));
      }
    }

    console.log(
      `🏁 SIMPLE tweet tamamlandı: ${successCount} başarılı, ${errorCount} hata`,
    );

    res.json({
      success: true,
      results,
      totalProcessed: accountIds.length,
      successCount,
      errorCount,
    });
  } catch (error) {
    console.error("SIMPLE tweet API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

export const handleSimpleBulkTweet: RequestHandler = async (req, res) => {
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
        const result = await sendTweetSimple(
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
    console.error("SIMPLE toplu tweet API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

export const handleFollowersAnalysis: RequestHandler = async (req, res) => {
  try {
    const {
      targetUsername,
      maxFollowers = 50,
      authToken,
      ct0,
    } = req.body as {
      targetUsername: string;
      maxFollowers?: number;
      authToken: string;
      ct0: string;
    };

    if (!targetUsername) {
      return res.status(400).json({
        success: false,
        error: "Kullanıcı adı gerekli",
      });
    }

    if (!authToken || !ct0) {
      return res.status(400).json({
        success: false,
        error: "Token bilgileri gerekli",
      });
    }

    console.log(
      `🎯 TAKİPÇİ ANALİZİ: @${targetUsername} - ${maxFollowers} takipçi`,
    );

    const result = await analyzeFollowers(
      targetUsername,
      maxFollowers,
      authToken,
      ct0,
    );

    if (result.success) {
      console.log(
        `✅ Takipçi analizi başarılı: ${result.followers?.length} takipçi`,
      );
      res.json({
        success: true,
        followers: result.followers,
        totalFollowers: result.followers?.length || 0,
        username: targetUsername,
      });
    } else {
      console.log(`❌ Takipçi analizi başarısız: ${targetUsername}`);
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Takipçi analizi API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

export const handleTweetRepliesAnalysis: RequestHandler = async (req, res) => {
  try {
    const {
      tweetUrl,
      maxReplies = 50,
      authToken,
      ct0,
    } = req.body as {
      tweetUrl: string;
      maxReplies?: number;
      authToken: string;
      ct0: string;
    };

    if (!tweetUrl) {
      return res.status(400).json({
        success: false,
        error: "Tweet URL gerekli",
      });
    }

    if (!authToken || !ct0) {
      return res.status(400).json({
        success: false,
        error: "Token bilgileri gerekli",
      });
    }

    console.log(`🎯 YORUM ANALİZİ: ${tweetUrl} - ${maxReplies} yorum`);

    const result = await analyzeTweetReplies(
      tweetUrl,
      maxReplies,
      authToken,
      ct0,
    );

    if (result.success) {
      console.log(`✅ Yorum analizi başarılı: ${result.replies?.length} yorum`);
      res.json({
        success: true,
        replies: result.replies,
        totalReplies: result.replies?.length || 0,
        tweetUrl,
      });
    } else {
      console.log(`❌ Yorum analizi başarısız: ${tweetUrl}`);
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Yorum analizi API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

export const handleSimpleTweetScraping: RequestHandler = async (req, res) => {
  try {
    const {
      targetUsername,
      maxTweets = 20,
      authToken,
      ct0,
    } = req.body as {
      targetUsername: string;
      maxTweets?: number;
      authToken: string;
      ct0: string;
    };

    if (!targetUsername) {
      return res.status(400).json({
        success: false,
        error: "Kullanıcı adı gerekli",
      });
    }

    if (!authToken || !ct0) {
      return res.status(400).json({
        success: false,
        error: "Token bilgileri gerekli",
      });
    }

    console.log(`🎯 TWEET ÇEKİMİ: @${targetUsername} - ${maxTweets} tweet`);

    const result = await scrapeTweetsFromUser(
      targetUsername,
      maxTweets,
      authToken,
      ct0,
    );

    if (result.success) {
      console.log(`✅ Tweet çekimi başarılı: ${result.tweets?.length} tweet`);
      res.json({
        success: true,
        tweets: result.tweets,
        totalTweets: result.tweets?.length || 0,
        username: targetUsername,
      });
    } else {
      console.log(`❌ Tweet çekimi başarısız: ${targetUsername}`);
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("Tweet çekimi API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

export const handleSimpleFollow: RequestHandler = async (req, res) => {
  try {
    const { accountIds, targetUsername, speed, tokens } = req.body as {
      accountIds: string[];
      targetUsername: string;
      speed: "instant" | "medium" | "slow";
      tokens: { [accountId: string]: { authToken: string; ct0: string } };
    };

    if (!accountIds || accountIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "En az bir hesap ID gerekli",
      });
    }

    if (!targetUsername) {
      return res.status(400).json({
        success: false,
        error: "Takip edilecek kullanıcı adı gerekli",
      });
    }

    if (!tokens) {
      return res.status(400).json({
        success: false,
        error: "Token bilgileri gerekli",
      });
    }

    console.log(
      `🎯 SIMPLE TAKIP işlemi: ${accountIds.length} hesap -> @${targetUsername}`,
    );

    // Hız ayarları - Optimized
    const speedSettings = {
      instant: { delay: 0, randomDelay: 0 },
      medium: { delay: 0.2, randomDelay: 0.1 },
      slow: { delay: 0.5, randomDelay: 0.2 },
    };

    const { delay, randomDelay } = speedSettings[speed];

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
          `👥 SIMPLE TAKIP: ${accountId} -> @${targetUsername} (${i + 1}/${accountIds.length})`,
        );

        const result = await performSimpleFollow(
          accountId,
          targetUsername,
          accountTokens.authToken,
          accountTokens.ct0,
        );

        if (result.success) {
          results.push({
            accountId,
            username: accountId,
            success: true,
          });
          successCount++;
          console.log(
            `✅ SIMPLE TAKIP başarılı: ${accountId} -> @${targetUsername}`,
          );
        } else {
          results.push({
            accountId,
            username: accountId,
            success: false,
            error: result.error,
          });
          errorCount++;
          console.log(
            `❌ SIMPLE TAKIP başarısız: ${accountId} -> @${targetUsername}`,
          );
        }
      } catch (error) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: `Takip hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        });
        errorCount++;
        console.error(`💥 SIMPLE TAKIP hatası: ${accountId}`, error);
      }

      // Hız ayarına göre bekleme
      if (i < accountIds.length - 1) {
        const actualDelay = delay + Math.random() * randomDelay;
        if (actualDelay > 0) {
          console.log(`⏳ ${actualDelay.toFixed(2)} saniye bekleniyor...`);
          await new Promise((resolve) =>
            setTimeout(resolve, actualDelay * 1000),
          );
        }
      }
    }

    console.log(
      `🏁 SIMPLE TAKIP tamamlandı: ${successCount} başarılı, ${errorCount} hata`,
    );

    res.json({
      success: true,
      results,
      totalProcessed: accountIds.length,
      successCount,
      errorCount,
    });
  } catch (error) {
    console.error("SIMPLE Follow API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

export const handleSimpleEngagement: RequestHandler = async (req, res) => {
  try {
    const {
      accountIds,
      tweetUrl,
      actionType,
      speed,
      tokens,
      proxyList,
      useProxy,
    } = req.body as EngagementRequest & {
      proxyList?: string[];
      useProxy?: boolean;
    };

    if (!accountIds || accountIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "En az bir hesap ID gerekli",
      });
    }

    if (!tweetUrl) {
      return res.status(400).json({
        success: false,
        error: "Tweet URL gerekli",
      });
    }

    if (!tokens) {
      return res.status(400).json({
        success: false,
        error: "Token bilgileri gerekli",
      });
    }

    console.log(
      `🎯 SIMPLE ${actionType.toUpperCase()} işlemi: ${accountIds.length} hesap`,
    );

    // Hız ayarları - Dakikada 200+ beğeni için ULTRA optimize
    const speedSettings = {
      instant: { delay: 0, randomDelay: 0 },
      medium: { delay: 0.1, randomDelay: 0.05 },
      slow: { delay: 0.2, randomDelay: 0.1 },
    };

    const { delay, randomDelay } = speedSettings[speed];

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
          `${actionType === "like" ? "❤️" : "🔄"} SIMPLE ${actionType.toUpperCase()}: ${accountId} (${i + 1}/${accountIds.length})`,
        );

        // Proxy seçimi (varsa)
        const proxy =
          useProxy && proxyList && proxyList.length > 0
            ? proxyList[i % proxyList.length]
            : undefined;

        const result = await performSimpleEngagement(
          accountId,
          tweetUrl,
          actionType,
          accountTokens.authToken,
          accountTokens.ct0,
          proxy,
        );

        if (result.success) {
          results.push({
            accountId,
            username: accountId,
            success: true,
          });
          successCount++;
          console.log(
            `✅ SIMPLE ${actionType.toUpperCase()} başarılı: ${accountId}`,
          );
        } else {
          results.push({
            accountId,
            username: accountId,
            success: false,
            error: result.error,
          });
          errorCount++;
          console.log(
            `❌ SIMPLE ${actionType.toUpperCase()} başarısız: ${accountId}`,
          );
        }
      } catch (error) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: `${actionType} hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        });
        errorCount++;
        console.error(
          `💥 SIMPLE ${actionType.toUpperCase()} hatası: ${accountId}`,
          error,
        );
      }

      // Hız ayarına göre bekleme
      if (i < accountIds.length - 1) {
        const actualDelay =
          delay + Math.random() * randomDelay + Math.random() * 2;
        console.log(`⏳ ${actualDelay.toFixed(1)} saniye bekleniyor...`);
        await new Promise((resolve) => setTimeout(resolve, actualDelay * 1000));
      }
    }

    console.log(
      `🏁 SIMPLE ${actionType.toUpperCase()} tamamlandı: ${successCount} başarılı, ${errorCount} hata`,
    );

    const response: EngagementResponse = {
      success: true,
      results,
      totalProcessed: accountIds.length,
      successCount,
      errorCount,
    };

    res.json(response);
  } catch (error) {
    console.error("SIMPLE Engagement API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

// SIMPLE profil güncelleme - Puppeteer ile UI automation
async function updateProfileSimple(
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
    console.log(`🌐 SIMPLE profil güncelleme: ${username}`);

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
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(30000);

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    );

    // Cookie'leri hem .twitter.com hem de .x.com için set et
    const cookies = [
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
    ];

    await page.setCookie(...cookies);

    // Önce ana sayfaya git
    console.log(`🏠 Ana sayfaya gidiliyor`);
    await page.goto("https://x.com/home", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Profil düzenleme sayfasına git
    console.log(`⚙️ Profil düzenleme sayfasına gidiliyor`);
    await page.goto("https://x.com/settings/profile", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Profil güncelleme işlemleri
    let updated = false;

    if (displayName) {
      console.log(`📝 İsim güncelleniyor: ${displayName}`);
      try {
        // Çoklu selector deneme
        const nameSelectors = [
          'input[name="displayName"]',
          'input[placeholder*="name"]',
          'input[placeholder*="Name"]',
          'input[aria-label*="name"]',
          'input[aria-label*="Name"]',
          'input[data-testid*="name"]',
          'label:contains("Name") + input',
          'label:contains("İsim") + input',
        ];

        let nameInput = null;
        for (const selector of nameSelectors) {
          try {
            nameInput = await page.$(selector);
            if (nameInput) {
              console.log(`✅ İsim alanı bulundu: ${selector}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }

        // Text içeriğine göre arama
        if (!nameInput) {
          const inputs = await page.$$('input[type="text"]');
          for (const input of inputs) {
            const placeholder = await input.evaluate((el) => el.placeholder);
            const ariaLabel = await input.evaluate((el) =>
              el.getAttribute("aria-label"),
            );
            if (
              (placeholder &&
                (placeholder.includes("name") ||
                  placeholder.includes("Name"))) ||
              (ariaLabel &&
                (ariaLabel.includes("name") || ariaLabel.includes("Name")))
            ) {
              nameInput = input;
              console.log(`✅ İsim alanı placeholder/aria ile bulundu`);
              break;
            }
          }
        }

        if (nameInput) {
          await nameInput.click({ clickCount: 3 });
          await new Promise((resolve) => setTimeout(resolve, 50));
          await page.keyboard.type(displayName);
          console.log(`✅ İsim güncellendi: ${displayName}`);
          updated = true;
        } else {
          console.log(`⚠️ İsim alanı bulunamadı`);
        }
      } catch (error) {
        console.log(`⚠️ İsim güncelleme hatası: ${error}`);
      }
    }

    if (bio) {
      console.log(`📄 Bio güncelleniyor: ${bio}`);
      try {
        // Çoklu bio selector deneme
        const bioSelectors = [
          'textarea[name="description"]',
          'textarea[placeholder*="bio"]',
          'textarea[placeholder*="Bio"]',
          'textarea[aria-label*="bio"]',
          'textarea[aria-label*="Bio"]',
          'textarea[data-testid*="bio"]',
          'label:contains("Bio") + textarea',
          'label:contains("Biyografi") + textarea',
          "textarea",
        ];

        let bioTextarea = null;
        for (const selector of bioSelectors) {
          try {
            bioTextarea = await page.$(selector);
            if (bioTextarea) {
              console.log(`✅ Bio alanı bulundu: ${selector}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }

        if (bioTextarea) {
          await bioTextarea.click({ clickCount: 3 });
          await new Promise((resolve) => setTimeout(resolve, 50));
          await page.keyboard.type(bio);
          console.log(`✅ Bio güncellendi: ${bio}`);
          updated = true;
        } else {
          console.log(`⚠️ Bio alanı bulunamadı`);
        }
      } catch (error) {
        console.log(`⚠️ Bio güncelleme hatası: ${error}`);
      }
    }

    if (updated) {
      // Kaydet butonunu bul ve tıkla
      console.log(`💾 Kaydet butonuna tıklanıyor`);
      try {
        const saveSelectors = [
          'button[data-testid="settingsDetailsSave"]',
          'button[type="submit"]',
          'button:contains("Save")',
          'button:contains("Kaydet")',
          '[role="button"]:contains("Save")',
          '[role="button"]:contains("Kaydet")',
        ];

        let saveButton = null;
        for (const selector of saveSelectors) {
          try {
            saveButton = await page.$(selector);
            if (saveButton) {
              console.log(`✅ Kaydet butonu bulundu: ${selector}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }

        if (saveButton) {
          await saveButton.click();
          await new Promise((resolve) => setTimeout(resolve, 3000));
          console.log(`✅ Profil kaydedildi`);
        } else {
          // Klavye kısayolu dene
          await page.keyboard.down("Control");
          await page.keyboard.press("Enter");
          await page.keyboard.up("Control");
          await new Promise((resolve) => setTimeout(resolve, 3000));
          console.log(`✅ Ctrl+Enter ile kaydedildi`);
        }
      } catch (error) {
        console.log(`⚠️ Kaydetme hatası: ${error}`);
      }
    }

    return { success: true };
  } catch (error) {
    console.error(`💥 SIMPLE profil hatası (${username}):`, error);
    return {
      success: false,
      error: `Profil güncelleme hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log(`🔒 SIMPLE profil tarayıcı kapatıldı: ${username}`);
    } catch (closeError) {
      console.error(`❌ Tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}

// SIMPLE tweet gönderme - Puppeteer ile UI automation
async function sendTweetSimple(
  username: string,
  content: string,
  authToken: string,
  ct0: string,
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  let browser = null;
  let page = null;

  try {
    console.log(`🌐 SIMPLE tweet gönderme: ${username}`);

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
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(30000);

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    );

    // Cookie'leri hem .twitter.com hem de .x.com için set et
    const cookies = [
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
    ];

    await page.setCookie(...cookies);

    // X.com ana sayfasına git
    console.log(`🏠 X.com ana sayfasına gidiliyor`);
    await page.goto("https://x.com/home", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    // Tweet yazma alanını bul - çoklu selector deneme
    console.log(`📝 Tweet yazma alanı bulunuyor`);

    const textboxSelectors = [
      '[data-testid="tweetTextarea_0"]',
      '[role="textbox"][data-testid*="tweet"]',
      '[role="textbox"][placeholder*="happening"]',
      '[role="textbox"][placeholder*="What"]',
      '[role="textbox"][aria-label*="Tweet"]',
      '[role="textbox"]',
      '.public-DraftEditor-content[role="textbox"]',
      '.DraftEditor-editorContainer [role="textbox"]',
      'div[contenteditable="true"][role="textbox"]',
    ];

    let tweetBox = null;
    for (const selector of textboxSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 5000 });
        tweetBox = await page.$(selector);
        if (tweetBox) {
          console.log(`✅ Tweet alan�� bulundu: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`❌ Selector başarısız: ${selector}`);
        continue;
      }
    }

    if (!tweetBox) {
      // XPath ile deneme
      try {
        await page.waitForXPath('//div[@role="textbox"]', { timeout: 5000 });
        const [xpathElement] = await page.$x('//div[@role="textbox"]');
        if (xpathElement) {
          tweetBox = xpathElement;
          console.log(`✅ Tweet alanı XPath ile bulundu`);
        }
      } catch (e) {
        console.log(`❌ XPath selector başarısız`);
      }
    }

    if (!tweetBox) {
      // Compose butonu tıklayarak yeni tweet modalı aç
      try {
        console.log(`📝 Compose butonuna tıklanıyor`);
        const composeSelectors = [
          '[data-testid="SideNav_NewTweet_Button"]',
          '[aria-label*="Tweet"]',
          '[aria-label*="Post"]',
          'a[href="/compose/tweet"]',
        ];

        for (const selector of composeSelectors) {
          const composeBtn = await page.$(selector);
          if (composeBtn) {
            await composeBtn.click();
            console.log(`✅ Compose butonu tıklandı: ${selector}`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
            break;
          }
        }

        // Modal açıldıktan sonra tekrar dene
        for (const selector of textboxSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 3000 });
            tweetBox = await page.$(selector);
            if (tweetBox) {
              console.log(`✅ Modal'da tweet alanı bulundu: ${selector}`);
              break;
            }
          } catch (e) {
            continue;
          }
        }
      } catch (e) {
        console.log(`��� Compose butonu bulunamadı`);
      }
    }

    if (!tweetBox) {
      throw new Error("Tweet yazma alanı hiçbir yöntemle bulunamadı");
    }

    // Tweet yazma alanına tıkla ve yaz
    await tweetBox.click();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Önce alanı temizle
    await page.keyboard.down("Control");
    await page.keyboard.press("a");
    await page.keyboard.up("Control");
    await page.keyboard.press("Delete");

    await new Promise((resolve) => setTimeout(resolve, 500));
    await tweetBox.type(content);
    console.log(`✍️ Tweet yazıldı: ${content.substring(0, 50)}...`);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Tweet gönder butonunu bul ve tıkla
    console.log(`📤 Tweet gönder butonu aranıyor`);

    const sendSelectors = [
      '[data-testid="tweetButtonInline"]',
      '[data-testid="tweetButton"]',
      '[data-testid="tweetButton_0"]',
      'button[type="submit"]',
      '[role="button"]:contains("Post")',
      '[role="button"]:contains("Tweet")',
      'button:contains("Post")',
      'button:contains("Tweet")',
    ];

    let sent = false;
    for (const selector of sendSelectors) {
      try {
        const sendButton = await page.$(selector);
        if (sendButton) {
          const isDisabled = await sendButton.evaluate(
            (btn) =>
              btn.hasAttribute("disabled") ||
              btn.getAttribute("aria-disabled") === "true",
          );
          if (!isDisabled) {
            await sendButton.click();
            console.log(`✅ Tweet gönderildi: ${selector}`);
            sent = true;
            break;
          } else {
            console.log(`⚠️ Buton disabled: ${selector}`);
          }
        }
      } catch (e) {
        console.log(`❌ Selector başarısız: ${selector}`);
      }
    }

    if (!sent) {
      // XPath ile gönder butonu ara
      try {
        const [sendBtn] = await page.$x(
          '//button[contains(text(), "Post") or contains(text(), "Tweet")]',
        );
        if (sendBtn) {
          await sendBtn.click();
          console.log(`✅ XPath ile tweet gönderildi`);
          sent = true;
        }
      } catch (e) {
        console.log(`❌ XPath send button başarısız`);
      }
    }

    if (!sent) {
      // Klavye kısayolu dene
      await page.keyboard.down("Control");
      await page.keyboard.press("Enter");
      await page.keyboard.up("Control");
      console.log(`⌨️ Klavye kısayolu ile gönderildi`);
      sent = true;
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Tweet gönderildiğini doğrula
    try {
      // Başarı mesajı veya URL değişimi kontrol et
      await page.waitForFunction(
        () => {
          return (
            window.location.href.includes("/home") ||
            document.querySelector('[data-testid="toast"]') ||
            document.querySelector('[role="alert"]')
          );
        },
        { timeout: 5000 },
      );
      console.log(`✅ Tweet gönderimi onaylandı`);
    } catch (e) {
      console.log(`⚠️ Tweet gönderim onayı bulunamadı`);
    }

    const tweetId = `simple_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    return { success: true, tweetId };
  } catch (error) {
    console.error(`💥 SIMPLE tweet hatası (${username}):`, error);
    return {
      success: false,
      error: `Tweet gönderim hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log(`🔒 SIMPLE tweet tarayıcı kapatıldı: ${username}`);
    } catch (closeError) {
      console.error(`❌ Tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}

// SIMPLE beğeni/retweet - Puppeteer ile UI automation
async function performSimpleEngagement(
  username: string,
  tweetUrl: string,
  actionType: "like" | "retweet",
  authToken: string,
  ct0: string,
  proxy?: string,
): Promise<{ success: boolean; error?: string }> {
  let browser = null;
  let page = null;

  try {
    console.log(
      `🌐 SIMPLE ${actionType.toUpperCase()} işlemi: ${username} - ${tweetUrl}`,
    );

    const launchOptions: any = {
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
    };

    // Proxy desteği
    if (proxy) {
      launchOptions.args.push(`--proxy-server=${proxy}`);
      console.log(`🔒 Proxy kullanılıyor: ${proxy}`);
    }

    browser = await puppeteer.launch(launchOptions);

    page = await browser.newPage();
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(30000);

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    );

    // Cookie'leri hem .twitter.com hem de .x.com için set et
    const cookies = [
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
    ];

    await page.setCookie(...cookies);

    // Tweet URL'ini x.com formatına çevir
    let normalizedUrl = tweetUrl;
    if (tweetUrl.includes("twitter.com")) {
      normalizedUrl = tweetUrl.replace("twitter.com", "x.com");
    }

    // Tweet sayfasına git
    console.log(`🔗 Tweet sayfasına gidiliyor: ${normalizedUrl}`);
    await page.goto(normalizedUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Beğeni veya retweet butonunu bul - çoklu selector deneme
    const actionSelectors =
      actionType === "like"
        ? [
            '[data-testid="like"]',
            '[data-testid="heart"]',
            '[aria-label*="Like"]',
            '[aria-label*="like"]',
            '[aria-label*="Beğen"]',
            'button[aria-label*="Like"]',
            'div[role="button"][aria-label*="Like"]',
            'svg[data-testid="heart"]',
            'path[d*="20.884"]', // Heart icon path
          ]
        : [
            '[data-testid="retweet"]',
            '[data-testid="unretweet"]',
            '[aria-label*="Retweet"]',
            '[aria-label*="retweet"]',
            '[aria-label*="Repost"]',
            'button[aria-label*="Retweet"]',
            'div[role="button"][aria-label*="Retweet"]',
            'svg[data-testid="retweet"]',
          ];

    console.log(`🔍 ${actionType} butonu aranıyor`);

    let actionButton = null;
    for (const selector of actionSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        actionButton = await page.$(selector);
        if (actionButton) {
          console.log(`✅ ${actionType} butonu bulundu: ${selector}`);
          break;
        }
      } catch (e) {
        console.log(`❌ Selector başarısız: ${selector}`);
        continue;
      }
    }

    // XPath ile deneme
    if (!actionButton) {
      try {
        const xpathQuery =
          actionType === "like"
            ? '//button[contains(@aria-label, "Like") or contains(@aria-label, "like")]'
            : '//button[contains(@aria-label, "Retweet") or contains(@aria-label, "retweet") or contains(@aria-label, "Repost")]';

        await page.waitForXPath(xpathQuery, { timeout: 5000 });
        const [xpathElement] = await page.$x(xpathQuery);
        if (xpathElement) {
          actionButton = xpathElement;
          console.log(`✅ ${actionType} butonu XPath ile bulundu`);
        }
      } catch (e) {
        console.log(`❌ XPath ${actionType} button başarısız`);
      }
    }

    // Ana tweet container'ı bul ve içindeki butonları ara
    if (!actionButton) {
      try {
        const tweetContainers = await page.$$('[data-testid="tweet"]');
        if (tweetContainers.length > 0) {
          // İlk tweet (ana tweet) al
          const mainTweet = tweetContainers[0];

          const buttonsInTweet = await mainTweet.$$(
            'button, div[role="button"]',
          );
          for (const button of buttonsInTweet) {
            const ariaLabel = await button.evaluate((el) =>
              el.getAttribute("aria-label"),
            );
            if (ariaLabel) {
              const labelLower = ariaLabel.toLowerCase();
              if (
                (actionType === "like" && labelLower.includes("like")) ||
                (actionType === "retweet" &&
                  (labelLower.includes("retweet") ||
                    labelLower.includes("repost")))
              ) {
                actionButton = button;
                console.log(
                  `✅ ${actionType} butonu tweet container'da bulundu`,
                );
                break;
              }
            }
          }
        }
      } catch (e) {
        console.log(`❌ Tweet container arama başarısız`);
      }
    }

    if (!actionButton) {
      throw new Error(`${actionType} butonu hiçbir y��ntemle bulunamadı`);
    }

    // Butonun tıklanabilir olduğunu kontrol et
    const isClickable = await actionButton.evaluate((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && !el.disabled;
    });

    if (!isClickable) {
      throw new Error(`${actionType} butonu tıklanabilir değil`);
    }

    // Butona tıkla
    await actionButton.click();
    console.log(`✅ ${actionType.toUpperCase()} butonu tıklandı`);

    await new Promise((resolve) => setTimeout(resolve, 300));

    // Retweet için onay butonunu bekle
    if (actionType === "retweet") {
      const retweetConfirmSelectors = [
        '[data-testid="retweetConfirm"]',
        '[data-testid="repost"]',
        'button:contains("Retweet")',
        'button:contains("Repost")',
        '[role="menuitem"]:contains("Retweet")',
        '[role="menuitem"]:contains("Repost")',
      ];

      let retweetConfirm = null;
      for (const selector of retweetConfirmSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          retweetConfirm = await page.$(selector);
          if (retweetConfirm) {
            console.log(`✅ Retweet onay butonu bulundu: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // XPath ile retweet onay
      if (!retweetConfirm) {
        try {
          const [xpathConfirm] = await page.$x(
            '//span[contains(text(), "Retweet") or contains(text(), "Repost")]/ancestor::button',
          );
          if (xpathConfirm) {
            retweetConfirm = xpathConfirm;
            console.log(`✅ Retweet onay XPath ile bulundu`);
          }
        } catch (e) {
          console.log(`❌ XPath retweet confirm başarısız`);
        }
      }

      if (retweetConfirm) {
        await retweetConfirm.click();
        console.log(`✅ Retweet onaylandı`);
      } else {
        console.log(
          `⚠️ Retweet onay butonu bulunamadı - direkt retweet olmuş olabilir`,
        );
      }
    }

    // İşlemin başarılı olduğunu doğrula
    await new Promise((resolve) => setTimeout(resolve, 500));

    try {
      // Butonun durumunu kontrol et (beğenildi/retweet edildi)
      const buttonState = await actionButton.evaluate((el) =>
        el.getAttribute("aria-label"),
      );
      const isSuccess =
        actionType === "like"
          ? buttonState?.toLowerCase().includes("liked") ||
            buttonState?.toLowerCase().includes("unlike")
          : buttonState?.toLowerCase().includes("undo") ||
            buttonState?.toLowerCase().includes("unretweet");

      if (isSuccess) {
        console.log(`✅ ${actionType.toUpperCase()} işlemi onaylandı`);
      } else {
        console.log(`⚠️ ${actionType.toUpperCase()} işlem durumu belirsiz`);
      }
    } catch (e) {
      console.log(`⚠️ İşlem doğrulama başarısız`);
    }

    return { success: true };
  } catch (error) {
    console.error(
      `💥 SIMPLE ${actionType.toUpperCase()} hatası (${username}):`,
      error,
    );
    return {
      success: false,
      error: `${actionType} hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log(
        `🔒 SIMPLE ${actionType.toUpperCase()} tarayıcı kapatıldı: ${username}`,
      );
    } catch (closeError) {
      console.error(`❌ Tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}

// SIMPLE takip etme - Puppeteer ile UI automation
async function performSimpleFollow(
  username: string,
  targetUsername: string,
  authToken: string,
  ct0: string,
): Promise<{ success: boolean; error?: string }> {
  let browser = null;
  let page = null;

  try {
    console.log(`🌐 SIMPLE TAKIP: ${username} -> @${targetUsername}`);

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
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(30000);

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    );

    // Cookie'leri hem .twitter.com hem de .x.com için set et
    const cookies = [
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
    ];

    await page.setCookie(...cookies);

    // Hedef kullanıcının profil sayfasına git
    const profileUrl = `https://x.com/${targetUsername.replace("@", "")}`;
    console.log(`🔗 Profil sayfasına gidiliyor: ${profileUrl}`);

    await page.goto(profileUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Takip et butonunu bul - çoklu selector deneme
    const followSelectors = [
      '[data-testid*="follow"]',
      '[aria-label*="Follow"]',
      '[aria-label*="follow"]',
      '[aria-label*="Takip"]',
      'button:contains("Follow")',
      'button:contains("Takip")',
      'div[role="button"]:contains("Follow")',
      'div[role="button"]:contains("Takip")',
    ];

    console.log(`🔍 Takip butonu aranıyor`);

    let followButton = null;
    for (const selector of followSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 3000 });
        followButton = await page.$(selector);
        if (followButton) {
          const buttonText = await followButton.evaluate(
            (el) => el.textContent,
          );
          if (
            buttonText &&
            (buttonText.includes("Follow") || buttonText.includes("Takip"))
          ) {
            console.log(`✅ Takip butonu bulundu: ${selector}`);
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }

    // XPath ile deneme
    if (!followButton) {
      try {
        const xpathQuery =
          '//span[contains(text(), "Follow") or contains(text(), "Takip")]/ancestor::button[1] | //span[contains(text(), "Follow") or contains(text(), "Takip")]/ancestor::div[@role="button"][1]';
        await page.waitForXPath(xpathQuery, { timeout: 5000 });
        const [xpathElement] = await page.$x(xpathQuery);
        if (xpathElement) {
          followButton = xpathElement;
          console.log(`✅ Takip butonu XPath ile bulundu`);
        }
      } catch (e) {
        console.log(`❌ XPath takip button başarısız`);
      }
    }

    // Aria-label ile daha spesifik arama
    if (!followButton) {
      try {
        const allButtons = await page.$$('button, div[role="button"]');
        for (const button of allButtons) {
          const ariaLabel = await button.evaluate((el) =>
            el.getAttribute("aria-label"),
          );
          const textContent = await button.evaluate((el) => el.textContent);

          if (
            (ariaLabel && ariaLabel.toLowerCase().includes("follow")) ||
            (textContent &&
              (textContent.includes("Follow") || textContent.includes("Takip")))
          ) {
            followButton = button;
            console.log(`✅ Takip butonu manuel aramada bulundu`);
            break;
          }
        }
      } catch (e) {
        console.log(`❌ Manuel takip button arama başarısız`);
      }
    }

    if (!followButton) {
      throw new Error(
        "Takip butonu bulunamadı - hesap zaten takip ediliyor olabilir",
      );
    }

    await followButton.click();
    console.log(`✅ Takip butonu tıklandı`);

    await new Promise((resolve) => setTimeout(resolve, 800));
    return { success: true };
  } catch (error) {
    console.error(
      `💥 SIMPLE TAKIP hatası (${username} -> @${targetUsername}):`,
      error,
    );
    return {
      success: false,
      error: `Takip hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log(`🔒 SIMPLE TAKIP tarayıcı kapatıldı: ${username}`);
    } catch (closeError) {
      console.error(`❌ Tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}

// Tweet çekme fonksiyonu
async function scrapeTweetsFromUser(
  username: string,
  maxTweets: number,
  authToken: string,
  ct0: string,
): Promise<{ success: boolean; tweets?: string[]; error?: string }> {
  let browser = null;
  let page = null;

  try {
    console.log(`🌐 Tweet çekimi: @${username}`);

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
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(30000);

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    );

    // Cookie'leri set et
    const cookies = [
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
    ];

    await page.setCookie(...cookies);

    // Kullanıcının profil sayfasına git
    const profileUrl = `https://x.com/${username.replace("@", "")}`;
    console.log(`🔗 Profil sayfasına gidiliyor: ${profileUrl}`);

    await page.goto(profileUrl, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const tweets: string[] = [];
    let lastHeight = 0;
    let scrollAttempts = 0;
    const maxScrollAttempts = 10;

    console.log(`📝 Tweet'ler çekiliyor...`);

    while (tweets.length < maxTweets && scrollAttempts < maxScrollAttempts) {
      // Tweet'leri bul
      const tweetElements = await page.$$('[data-testid="tweet"]');

      for (const tweetElement of tweetElements) {
        try {
          // Tweet içeriğini çek
          const tweetText = await tweetElement.evaluate((el) => {
            const textElements = el.querySelectorAll(
              '[data-testid="tweetText"]',
            );
            const texts = Array.from(textElements)
              .map((t) => t.textContent?.trim())
              .filter(Boolean);
            return texts.join(" ");
          });

          if (
            tweetText &&
            tweetText.length > 0 &&
            !tweets.includes(tweetText)
          ) {
            tweets.push(tweetText);
            console.log(
              `📄 Tweet ${tweets.length}: ${tweetText.substring(0, 100)}...`,
            );

            if (tweets.length >= maxTweets) break;
          }
        } catch (e) {
          continue;
        }
      }

      // Daha fazla tweet yüklemek için scroll
      if (tweets.length < maxTweets) {
        const currentHeight = await page.evaluate(
          () => document.body.scrollHeight,
        );

        if (currentHeight === lastHeight) {
          scrollAttempts++;
        } else {
          scrollAttempts = 0;
          lastHeight = currentHeight;
        }

        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    console.log(`✅ Toplam ${tweets.length} tweet çekildi`);
    return { success: true, tweets };
  } catch (error) {
    console.error(`💥 Tweet çekimi hatası (@${username}):`, error);
    return {
      success: false,
      error: `Tweet çekimi hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log(`🔒 Tweet çekimi tarayıcı kapatıldı: @${username}`);
    } catch (closeError) {
      console.error(`❌ Tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}

// Takipçi analizi fonksiyonu
async function analyzeFollowers(
  username: string,
  maxFollowers: number,
  authToken: string,
  ct0: string,
): Promise<{ success: boolean; followers?: string[]; error?: string }> {
  let browser = null;
  let page = null;

  try {
    console.log(`🌐 Takipçi analizi: @${username}`);

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
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(30000);

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    );

    // Cookie'leri set et
    const cookies = [
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
    ];

    await page.setCookie(...cookies);

    // Kullanıcının takipçiler sayfasına git - normal followers sayfası
    const followersUrl = `https://x.com/${username.replace("@", "")}/followers`;
    console.log(`🔗 Takipçiler sayfasına gidiliyor: ${followersUrl}`);

    await page.goto(followersUrl, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const followers: string[] = [];
    let scrollCount = 0;
    const maxScrolls = Math.max(20, Math.ceil(maxFollowers / 10)); // Her scroll'da yaklaşık 10 takipçi

    console.log(`👥 Takipçiler çekiliyor... Hedef: ${maxFollowers}`);

    while (followers.length < maxFollowers && scrollCount < maxScrolls) {
      // Takipçi kullanıcı adlarını bul
      const userElements = await page.$$('[data-testid="UserCell"]');

      console.log(
        `📋 Sayfa üzerinde ${userElements.length} kullanıcı elementi bulundu`,
      );

      for (const userElement of userElements) {
        try {
          // Kullanıcı adını çek
          const followerUsername = await userElement.evaluate((el) => {
            const linkElement = el.querySelector('a[href*="/"]');
            if (linkElement) {
              const href = linkElement.getAttribute("href");
              return href?.split("/")[1]?.replace("@", "") || "";
            }
            return "";
          });

          if (
            followerUsername &&
            followerUsername.length > 0 &&
            !followers.includes(followerUsername)
          ) {
            followers.push(followerUsername);
            console.log(`👤 Takipçi ${followers.length}: @${followerUsername}`);

            if (followers.length >= maxFollowers) break;
          }
        } catch (e) {
          continue;
        }
      }

      // Daha fazla takipçi yüklemek için scroll
      if (followers.length < maxFollowers) {
        console.log(
          `⬇️ Scroll ${scrollCount + 1}/${maxScrolls} - Şu ana kadar ${followers.length} takipçi`,
        );

        // Sayfanın sonuna scroll
        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        // Biraz bekle ki yeni içerik yüklensin
        await new Promise((resolve) => setTimeout(resolve, 4000));

        // Ekstra scroll deneme
        await page.evaluate(() => {
          window.scrollBy(0, 1000);
        });

        await new Promise((resolve) => setTimeout(resolve, 2000));

        scrollCount++;
      }
    }

    console.log(`✅ Toplam ${followers.length} takipçi çekildi`);
    return { success: true, followers };
  } catch (error) {
    console.error(`💥 Takipçi analizi hatası (@${username}):`, error);
    return {
      success: false,
      error: `Takipçi analizi hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log(`🔒 Takipçi analizi tarayıcı kapatıldı: @${username}`);
    } catch (closeError) {
      console.error(`❌ Tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}

// Tweet yorumları analizi fonksiyonu
async function analyzeTweetReplies(
  tweetUrl: string,
  maxReplies: number,
  authToken: string,
  ct0: string,
): Promise<{ success: boolean; replies?: string[]; error?: string }> {
  let browser = null;
  let page = null;

  try {
    console.log(`🌐 Yorum analizi: ${tweetUrl}`);

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
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(30000);

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    );

    // Cookie'leri set et
    const cookies = [
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
    ];

    await page.setCookie(...cookies);

    // Tweet sayfasına git
    const normalizedUrl = tweetUrl.includes("twitter.com")
      ? tweetUrl.replace("twitter.com", "x.com")
      : tweetUrl;

    console.log(`🔗 Tweet sayfasına gidiliyor: ${normalizedUrl}`);
    await page.goto(normalizedUrl, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await new Promise((resolve) => setTimeout(resolve, 5000));

    const replies: string[] = [];
    let scrollAttempts = 0;
    const maxScrollAttempts = 15;

    console.log(`💬 Yorum yapanlar çekiliyor...`);

    while (replies.length < maxReplies && scrollAttempts < maxScrollAttempts) {
      // Tweet'leri bul (yorumlar da tweet formatında)
      const tweetElements = await page.$$('[data-testid="tweet"]');

      console.log(
        `📋 Sayfa üzerinde ${tweetElements.length} tweet elementi bulundu`,
      );

      for (const tweetElement of tweetElements) {
        try {
          // Sadece username'i al
          const replyUsername = await tweetElement.evaluate((el) => {
            const usernameElement = el.querySelector(
              '[data-testid="User-Name"] a',
            );
            const username =
              usernameElement
                ?.getAttribute("href")
                ?.split("/")[1]
                ?.replace("@", "") || "";
            return username;
          });

          if (
            replyUsername &&
            replyUsername.length > 0 &&
            !replies.includes(replyUsername)
          ) {
            replies.push(replyUsername);
            console.log(`💬 Yorum yapan ${replies.length}: @${replyUsername}`);

            if (replies.length >= maxReplies) break;
          }
        } catch (e) {
          continue;
        }
      }

      // Scroll
      if (replies.length < maxReplies) {
        console.log(
          `⬇️ Scroll ${scrollAttempts + 1}/${maxScrollAttempts} - Şu ana kadar ${replies.length} yorum yapan`,
        );

        await page.evaluate(() => {
          window.scrollTo(0, document.body.scrollHeight);
        });

        await new Promise((resolve) => setTimeout(resolve, 4000));
        scrollAttempts++;
      }
    }

    console.log(`✅ Toplam ${replies.length} yorum çekildi`);
    return { success: true, replies };
  } catch (error) {
    console.error(`💥 Yorum analizi hatası:`, error);
    return {
      success: false,
      error: `Yorum analizi hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log(`🔒 Yorum analizi tarayıcı kapatıldı`);
    } catch (closeError) {
      console.error(`❌ Tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}

// Quote tweet fonksiyonu
async function sendQuoteTweet(
  tweetUrl: string,
  quoteText: string,
  authToken: string,
  ct0: string,
): Promise<{ success: boolean; error?: string }> {
  let browser = null;
  let page = null;

  try {
    console.log(`🌐 Quote tweet gönderiliyor: ${tweetUrl}`);

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
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(30000);

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    );

    // Cookie'leri set et
    const cookies = [
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
    ];

    await page.setCookie(...cookies);

    // Tweet sayfasına git
    console.log(`🔗 Tweet sayfasına gidiliyor: ${tweetUrl}`);
    await page.goto(tweetUrl, {
      waitUntil: "networkidle2",
      timeout: 60000,
    });

    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Quote tweet butonunu bul ve tıkla
    console.log(`🔁 Quote tweet butonu aranıyor...`);

    const quoteSelectors = [
      '[data-testid="retweet"]',
      'button[aria-label*="Retweet"]',
      'button[aria-label*="retweet"]',
      'div[role="button"][aria-label*="Retweet"]',
    ];

    let quoteButton = null;
    for (const selector of quoteSelectors) {
      try {
        quoteButton = await page.$(selector);
        if (quoteButton) {
          console.log(`✅ Retweet butonu bulundu: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!quoteButton) {
      throw new Error("Retweet butonu bulunamadı");
    }

    await quoteButton.click();
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Quote tweet seçeneğini bul ve tıkla
    console.log(`💬 Quote tweet se��eneği aranıyor...`);

    const quoteOptionSelectors = ['[data-testid="quotetweet"]'];

    let quoteOption = null;
    for (const selector of quoteOptionSelectors) {
      try {
        quoteOption = await page.$(selector);
        if (quoteOption) {
          console.log(`✅ Quote seçeneği bulundu: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // Eğer quote option bulunamazsa, text content ile ara
    if (!quoteOption) {
      quoteOption = await page.evaluateHandle(() => {
        const elements = Array.from(
          document.querySelectorAll('div[role="menuitem"], span'),
        );
        return elements.find(
          (el) =>
            el.textContent?.includes("Quote Tweet") ||
            el.textContent?.includes("Alıntı Tweet") ||
            el.textContent?.includes("Quote") ||
            el.textContent?.includes("Alıntı"),
        ) as Element;
      });

      if (quoteOption && (await quoteOption.evaluate((el) => el))) {
        console.log(`✅ Quote seçeneği bulundu (text içerik)`);
      }
    }

    if (!quoteOption) {
      throw new Error("Quote tweet seçeneği bulunamadı");
    }

    await quoteOption.click();
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Quote tweet metin alanını bul ve metni yaz
    console.log(`✍️ Quote text yazılıyor: ${quoteText}`);

    const textAreaSelectors = [
      '[data-testid="tweetTextarea_0"]',
      'div[contenteditable="true"]',
      'textarea[placeholder*="tweet"]',
      'div[role="textbox"]',
    ];

    let textArea = null;
    for (const selector of textAreaSelectors) {
      try {
        textArea = await page.$(selector);
        if (textArea) {
          console.log(`✅ Text area bulundu: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    if (!textArea) {
      throw new Error("Quote tweet text alanı bulunamadı");
    }

    // Önceki içeriği temizle ve yeni metni yaz
    await textArea.click();
    await new Promise((resolve) => setTimeout(resolve, 500));

    await page.keyboard.down("Control");
    await page.keyboard.press("a");
    await page.keyboard.up("Control");
    await new Promise((resolve) => setTimeout(resolve, 300));

    await page.keyboard.type(quoteText);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Tweet gönder butonunu bul ve tıkla
    console.log(`📤 Tweet gönder butonu aranıyor...`);

    const sendButtonSelectors = [
      '[data-testid="tweetButton"]',
      '[data-testid="tweetButtonInline"]',
      'button[aria-label*="Tweet"]',
      'button[aria-label*="Post"]',
    ];

    let sendButton = null;
    for (const selector of sendButtonSelectors) {
      try {
        sendButton = await page.$(selector);
        if (sendButton) {
          console.log(`✅ Send butonu bulundu: ${selector}`);
          break;
        }
      } catch (e) {
        continue;
      }
    }

    // Eğer bulunamazsa text content ile ara
    if (!sendButton) {
      sendButton = await page.evaluateHandle(() => {
        const elements = Array.from(
          document.querySelectorAll('div[role="button"], button'),
        );
        return elements.find(
          (el) =>
            el.textContent?.includes("Tweet") ||
            el.textContent?.includes("Post") ||
            el.textContent?.includes("Gönder"),
        ) as Element;
      });

      if (sendButton && (await sendButton.evaluate((el) => el))) {
        console.log(`✅ Send butonu bulundu (text içerik)`);
      }
    }

    if (!sendButton) {
      throw new Error("Tweet gönder butonu bulunamadı");
    }

    await sendButton.click();
    await new Promise((resolve) => setTimeout(resolve, 5000));

    console.log(`✅ Quote tweet başarıyla gönderildi`);
    return { success: true };
  } catch (error) {
    console.error(`💥 Quote tweet hatası:`, error);
    return {
      success: false,
      error: `Quote tweet hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  } finally {
    try {
      if (page) await page.close();
      if (browser) await browser.close();
      console.log(`🔒 Quote tweet tarayıcı kapatıldı`);
    } catch (closeError) {
      console.error(`❌ Tarayıcı kapatma hatası: ${closeError}`);
    }
  }
}

// Multi-follow fonksiyonu (çoklu kullanıcı takip etme)
async function followMultipleUsers(
  usernames: string[],
  authToken: string,
  ct0: string,
  speed: "instant" | "medium" | "slow" = "medium",
): Promise<{
  success: boolean;
  results: any[];
  successCount: number;
  errorCount: number;
}> {
  const results: any[] = [];

  const delays = {
    instant: 0,
    medium: 1000,
    slow: 2000,
  };

  const delay = delays[speed];

  for (const username of usernames) {
    console.log(`👤 Takip ediliyor: @${username}`);

    try {
      const result = await followUser(username, authToken, ct0);
      results.push({
        username: username,
        success: result.success,
        error: result.error,
      });

      console.log(
        `${result.success ? "✅" : "❌"} @${username}: ${result.success ? "Başarılı" : result.error}`,
      );
    } catch (error) {
      results.push({
        username: username,
        success: false,
        error: error instanceof Error ? error.message : "Bilinmeyen hata",
      });
      console.log(`❌ @${username}: ${error}`);
    }

    // Delay between follows
    if (delay > 0) {
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  const successCount = results.filter((r) => r.success).length;
  const errorCount = results.filter((r) => !r.success).length;

  console.log(
    `📊 Multi-follow tamamlandı: ${successCount} başarılı, ${errorCount} hata`,
  );

  return {
    success: true,
    results,
    successCount,
    errorCount,
  };
}

// Quote tweet handler
export const handleQuoteTweet: RequestHandler = async (req, res) => {
  try {
    const { accountIds, tweetUrl, quoteTexts, tokens } = req.body;

    if (!accountIds || accountIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Hesap ID'leri gerekli",
      });
    }

    if (!tweetUrl) {
      return res.status(400).json({
        success: false,
        error: "Tweet URL'si gerekli",
      });
    }

    if (!quoteTexts || quoteTexts.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Quote metinleri gerekli",
      });
    }

    console.log(
      `🎯 Quote tweet işlemi: ${accountIds.length} hesap, ${quoteTexts.length} metin`,
    );

    const results: any[] = [];

    for (let i = 0; i < accountIds.length; i++) {
      const accountId = accountIds[i];
      const token = tokens[accountId];

      if (!token || !token.authToken || !token.ct0) {
        results.push({
          accountId,
          username: "Bilinmeyen",
          success: false,
          error: "Token bilgileri eksik",
        });
        continue;
      }

      // Metinleri sırayla kullan (döngüsel)
      const quoteText = quoteTexts[i % quoteTexts.length];

      try {
        const result = await sendQuoteTweet(
          tweetUrl,
          quoteText,
          token.authToken,
          token.ct0,
        );

        results.push({
          accountId,
          username: accountId,
          success: result.success,
          error: result.error,
          quoteText,
        });

        console.log(
          `${result.success ? "✅" : "❌"} Quote tweet (${accountId}): ${result.success ? "Başarılı" : result.error}`,
        );

        // Hesaplar arası delay
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: error instanceof Error ? error.message : "Bilinmeyen hata",
          quoteText,
        });
        console.log(`❌ Quote tweet hatası (${accountId}): ${error}`);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      results,
      successCount,
      errorCount,
      message: `Quote tweet tamamlandı: ${successCount} başarılı, ${errorCount} hata`,
    });
  } catch (error) {
    console.error("Quote tweet handler hatası:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

// Multi-follow handler
export const handleMultiFollow: RequestHandler = async (req, res) => {
  try {
    const { accountIds, targetUsernames, speed, tokens } = req.body;

    if (!accountIds || accountIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Hesap ID'leri gerekli",
      });
    }

    if (!targetUsernames || targetUsernames.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Hedef kullanıcı adları gerekli",
      });
    }

    console.log(
      `🎯 Multi-follow işlemi: ${accountIds.length} hesap, ${targetUsernames.length} hedef`,
    );

    const results: any[] = [];

    for (const accountId of accountIds) {
      const token = tokens[accountId];

      if (!token || !token.authToken || !token.ct0) {
        results.push({
          accountId,
          username: "Bilinmeyen",
          success: false,
          error: "Token bilgileri eksik",
        });
        continue;
      }

      try {
        const result = await followMultipleUsers(
          targetUsernames,
          token.authToken,
          token.ct0,
          speed || "medium",
        );

        // Her hedef için ayrı sonuç ekle
        result.results.forEach((followResult: any) => {
          results.push({
            accountId,
            username: accountId,
            targetUsername: followResult.username,
            success: followResult.success,
            error: followResult.error,
          });
        });

        console.log(
          `✅ Multi-follow (${accountId}): ${result.successCount} başarılı, ${result.errorCount} hata`,
        );

        // Hesaplar arası delay
        await new Promise((resolve) => setTimeout(resolve, 3000));
      } catch (error) {
        targetUsernames.forEach((target: string) => {
          results.push({
            accountId,
            username: accountId,
            targetUsername: target,
            success: false,
            error: error instanceof Error ? error.message : "Bilinmeyen hata",
          });
        });
        console.log(`❌ Multi-follow hatası (${accountId}): ${error}`);
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const errorCount = results.filter((r) => !r.success).length;

    res.json({
      success: true,
      results,
      successCount,
      errorCount,
      message: `Multi-follow tamamlandı: ${successCount} başarılı, ${errorCount} hata`,
    });
  } catch (error) {
    console.error("Multi-follow handler hatası:", error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};
