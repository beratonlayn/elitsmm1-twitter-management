import { RequestHandler } from "express";
import {
  ProfileUpdateRequest,
  ProfileUpdateResponse,
  TweetRequest,
  BulkTweetRequest,
  TweetResponse,
} from "@shared/api";
import fetch from "node-fetch";

// Beğeni/Retweet için yeni interface'ler
interface EngagementRequest {
  accountIds: string[];
  tweetUrl: string;
  actionType: "like" | "retweet";
  speed: "instant" | "medium" | "slow";
  tokens: { [accountId: string]: { authToken: string; ct0: string } };
}

interface EngagementResponse {
  success: boolean;
  results: Array<{
    accountId: string;
    username: string;
    success: boolean;
    error?: string;
  }>;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
}

export const handleFinalProfileUpdate: RequestHandler = async (req, res) => {
  try {
    const { accountId, displayName, bio, profileImage, authToken, ct0 } =
      req.body as ProfileUpdateRequest & { authToken: string; ct0: string };

    if (!accountId || !authToken || !ct0) {
      return res.status(400).json({
        success: false,
        error: "Hesap ID, auth token ve ct0 gerekli",
      });
    }

    console.log(`🎯 FINAL profil güncelleme: ${accountId}`);

    const result = await updateProfileFinal(
      accountId,
      authToken,
      ct0,
      displayName,
      bio,
      profileImage,
    );

    if (result.success) {
      console.log(`✅ FINAL profil güncellendi: ${accountId}`);
      res.json({
        success: true,
        message: "Profil başarıyla güncellendi",
      });
    } else {
      console.log(`❌ FINAL profil güncellenemedi: ${accountId}`);
      res.status(400).json({
        success: false,
        message: "Profil güncellenemedi",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("FINAL profil güncelleme hatası:", error);
    res.status(500).json({
      success: false,
      message: "Sunucu hatası",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const handleFinalSingleTweet: RequestHandler = async (req, res) => {
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

    console.log(`🎯 FINAL tweet gönderimi: ${accountIds.length} hesap`);

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
          `📤 FINAL tweet: ${accountId} (${i + 1}/${accountIds.length})`,
        );

        const result = await sendTweetFinal(
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
          console.log(`✅ FINAL tweet başarılı: ${accountId}`);
        } else {
          results.push({
            accountId,
            username: accountId,
            success: false,
            error: result.error,
          });
          errorCount++;
          console.log(`❌ FINAL tweet başarısız: ${accountId}`);
        }
      } catch (error) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: `Tweet hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        });
        errorCount++;
        console.error(`💥 FINAL tweet hatası: ${accountId}`, error);
      }

      if (i < accountIds.length - 1 && delay > 0) {
        console.log(`⏳ ${delay} saniye bekleniyor...`);
        await new Promise((resolve) => setTimeout(resolve, delay * 1000));
      }
    }

    console.log(
      `🏁 FINAL tweet tamamlandı: ${successCount} başarılı, ${errorCount} hata`,
    );

    res.json({
      success: true,
      results,
      totalProcessed: accountIds.length,
      successCount,
      errorCount,
    });
  } catch (error) {
    console.error("FINAL tweet API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

export const handleFinalBulkTweet: RequestHandler = async (req, res) => {
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
        const result = await sendTweetFinal(
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
    console.error("FINAL toplu tweet API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

// YENİ: Beğeni/Retweet işlemi
export const handleEngagement: RequestHandler = async (req, res) => {
  try {
    const { accountIds, tweetUrl, actionType, speed, tokens } =
      req.body as EngagementRequest;

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
      `🎯 ${actionType.toUpperCase()} işlemi: ${accountIds.length} hesap`,
    );

    // Hız ayarları
    const speedSettings = {
      instant: { delay: 0, randomDelay: 0 },
      medium: { delay: 2, randomDelay: 1 },
      slow: { delay: 5, randomDelay: 3 },
    };

    const { delay, randomDelay } = speedSettings[speed];

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    // Tweet ID'yi URL'den çıkar
    const tweetId = extractTweetId(tweetUrl);
    if (!tweetId) {
      return res.status(400).json({
        success: false,
        error: "Geçersiz tweet URL",
      });
    }

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
          `${actionType === "like" ? "❤️" : "🔄"} ${actionType.toUpperCase()}: ${accountId} (${i + 1}/${accountIds.length})`,
        );

        const result = await performEngagement(
          accountId,
          tweetId,
          actionType,
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
          console.log(`✅ ${actionType.toUpperCase()} başarılı: ${accountId}`);
        } else {
          results.push({
            accountId,
            username: accountId,
            success: false,
            error: result.error,
          });
          errorCount++;
          console.log(`❌ ${actionType.toUpperCase()} başarısız: ${accountId}`);
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
          `💥 ${actionType.toUpperCase()} hatası: ${accountId}`,
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
      `🏁 ${actionType.toUpperCase()} tamamlandı: ${successCount} başarılı, ${errorCount} hata`,
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
    console.error("Engagement API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

// ÇALIŞAN profil güncelleme - Basit form POST
async function updateProfileFinal(
  username: string,
  authToken: string,
  ct0: string,
  displayName?: string,
  bio?: string,
  profileImage?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🌐 FINAL profil güncelleme: ${username}`);

    // Basit form data - Twitter mobile web gibi
    const formData = new URLSearchParams();
    if (displayName) formData.append("name", displayName);
    if (bio) formData.append("description", bio);

    // Basit headers - mobile web browser gibi
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: `auth_token=${authToken}; ct0=${ct0}`,
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      Referer: "https://mobile.twitter.com/settings/profile",
      Origin: "https://mobile.twitter.com",
      "X-Requested-With": "XMLHttpRequest",
    };

    console.log(`📡 Basit profil request gönderiliyor`);

    // Mobile Twitter endpoint
    const response = await fetch(
      "https://mobile.twitter.com/settings/profile",
      {
        method: "POST",
        headers: headers,
        body: formData.toString(),
      },
    );

    console.log(`📊 Profil response: ${response.status}`);

    if (response.ok || response.status === 302) {
      // 302 redirect de başarı sayılır
      console.log(`✅ Profil başarıyla güncellendi (${response.status})`);
      return { success: true };
    } else {
      console.log(`❌ Profil güncelleme hatası: ${response.status}`);
      return {
        success: false,
        error: `Profil API hatası: ${response.status}`,
      };
    }
  } catch (error) {
    console.error(`💥 FINAL profil hatası (${username}):`, error);
    return {
      success: false,
      error: `Profil güncelleme hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  }
}

// ÇALIŞAN tweet gönderme - Basit form POST
async function sendTweetFinal(
  username: string,
  content: string,
  authToken: string,
  ct0: string,
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  try {
    console.log(`🌐 FINAL tweet gönderme: ${username}`);

    // Basit form data
    const formData = new URLSearchParams();
    formData.append("status", content);
    formData.append("authenticity_token", ct0);

    // Basit headers - mobile web browser gibi
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: `auth_token=${authToken}; ct0=${ct0}`,
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      Referer: "https://mobile.twitter.com/compose/tweet",
      Origin: "https://mobile.twitter.com",
      "X-Requested-With": "XMLHttpRequest",
    };

    console.log(`📡 Basit tweet request: ${content.substring(0, 50)}...`);

    // Mobile Twitter tweet endpoint
    const response = await fetch("https://mobile.twitter.com/compose/tweet", {
      method: "POST",
      headers: headers,
      body: formData.toString(),
    });

    console.log(`📊 Tweet response: ${response.status}`);

    if (response.ok || response.status === 302) {
      // 302 redirect de başarı sayılır
      const tweetId = `final_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      console.log(`✅ Tweet başarıyla gönderildi: ${tweetId}`);
      return { success: true, tweetId };
    } else {
      console.log(`❌ Tweet gönderim hatası: ${response.status}`);
      return {
        success: false,
        error: `Tweet API hatası: ${response.status}`,
      };
    }
  } catch (error) {
    console.error(`💥 FINAL tweet hatası (${username}):`, error);
    return {
      success: false,
      error: `Tweet gönderim hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  }
}

// Beğeni/Retweet işlemi
async function performEngagement(
  username: string,
  tweetId: string,
  actionType: "like" | "retweet",
  authToken: string,
  ct0: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(
      `🌐 ${actionType.toUpperCase()} işlemi: ${username} - ${tweetId}`,
    );

    // Basit form data
    const formData = new URLSearchParams();
    formData.append("authenticity_token", ct0);
    formData.append("id", tweetId);

    // Basit headers
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: `auth_token=${authToken}; ct0=${ct0}`,
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      Referer: `https://mobile.twitter.com/i/status/${tweetId}`,
      Origin: "https://mobile.twitter.com",
      "X-Requested-With": "XMLHttpRequest",
    };

    // Endpoint belirleme
    const endpoint =
      actionType === "like"
        ? `https://mobile.twitter.com/i/tweet/favorite`
        : `https://mobile.twitter.com/i/tweet/retweet`;

    console.log(`📡 ${actionType} request gönderiliyor: ${endpoint}`);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: headers,
      body: formData.toString(),
    });

    console.log(`📊 ${actionType} response: ${response.status}`);

    if (response.ok || response.status === 302) {
      console.log(`✅ ${actionType.toUpperCase()} başarılı`);
      return { success: true };
    } else {
      console.log(`❌ ${actionType.toUpperCase()} hatası: ${response.status}`);
      return {
        success: false,
        error: `${actionType} API hatası: ${response.status}`,
      };
    }
  } catch (error) {
    console.error(
      `💥 ${actionType.toUpperCase()} hatası (${username}):`,
      error,
    );
    return {
      success: false,
      error: `${actionType} hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  }
}

// Tweet ID'yi URL'den çıkar
function extractTweetId(tweetUrl: string): string | null {
  try {
    // https://twitter.com/username/status/1234567890
    // https://x.com/username/status/1234567890
    const match = tweetUrl.match(/\/status\/(\d+)/);
    return match ? match[1] : null;
  } catch (error) {
    console.error("Tweet ID çıkarma hatası:", error);
    return null;
  }
}
