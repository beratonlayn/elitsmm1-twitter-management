import { RequestHandler } from "express";
import {
  ProfileUpdateRequest,
  ProfileUpdateResponse,
  TweetRequest,
  BulkTweetRequest,
  TweetResponse,
} from "@shared/api";
import fetch from "node-fetch";

export const handleApiProfileUpdate: RequestHandler = async (req, res) => {
  try {
    const { accountId, displayName, bio, profileImage, authToken, ct0 } =
      req.body as ProfileUpdateRequest & { authToken: string; ct0: string };

    if (!accountId || !authToken || !ct0) {
      return res.status(400).json({
        success: false,
        error: "Hesap ID, auth token ve ct0 gerekli",
      });
    }

    console.log(`🎯 API profil güncelleme: ${accountId}`);

    const result = await updateProfileViaAPI(
      accountId,
      authToken,
      ct0,
      displayName,
      bio,
      profileImage,
    );

    if (result.success) {
      console.log(`✅ API profil güncellendi: ${accountId}`);
      res.json({
        success: true,
        message: "Profil başarıyla güncellendi",
      });
    } else {
      console.log(`❌ API profil güncellenemedi: ${accountId}`);
      res.status(400).json({
        success: false,
        message: "Profil güncellenemedi",
        error: result.error,
      });
    }
  } catch (error) {
    console.error("API profil güncelleme hatası:", error);
    res.status(500).json({
      success: false,
      message: "Sunucu hatası",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};

export const handleApiSingleTweet: RequestHandler = async (req, res) => {
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

    console.log(`🎯 API tweet gönderimi: ${accountIds.length} hesap`);

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
          `📤 API tweet: ${accountId} (${i + 1}/${accountIds.length})`,
        );

        const result = await sendTweetViaAPI(
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
          console.log(`✅ API tweet başarılı: ${accountId}`);
        } else {
          results.push({
            accountId,
            username: accountId,
            success: false,
            error: result.error,
          });
          errorCount++;
          console.log(`❌ API tweet başarısız: ${accountId}`);
        }
      } catch (error) {
        results.push({
          accountId,
          username: accountId,
          success: false,
          error: `Tweet hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        });
        errorCount++;
        console.error(`💥 API tweet hatası: ${accountId}`, error);
      }

      if (i < accountIds.length - 1 && delay > 0) {
        console.log(`⏳ ${delay} saniye bekleniyor...`);
        await new Promise((resolve) => setTimeout(resolve, delay * 1000));
      }
    }

    console.log(
      `🏁 API tweet tamamlandı: ${successCount} başarılı, ${errorCount} hata`,
    );

    res.json({
      success: true,
      results,
      totalProcessed: accountIds.length,
      successCount,
      errorCount,
    });
  } catch (error) {
    console.error("API tweet API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

export const handleApiBulkTweet: RequestHandler = async (req, res) => {
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
        const result = await sendTweetViaAPI(
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
    console.error("API toplu tweet API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};

// GERÇEK Twitter API profil güncelleme
async function updateProfileViaAPI(
  username: string,
  authToken: string,
  ct0: string,
  displayName?: string,
  bio?: string,
  profileImage?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🌐 API profil güncelleme: ${username}`);

    // Twitter'ın gerçek API endpoint'i
    const baseUrl = "https://api.twitter.com";
    const updateUrl = `${baseUrl}/1.1/account/update_profile.json`;

    // Request body oluştur
    const formData = new URLSearchParams();
    if (displayName) formData.append("name", displayName);
    if (bio) formData.append("description", bio);

    // Headers
    const headers = {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "X-CSRF-Token": ct0,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "X-Twitter-Active-User": "yes",
      "X-Twitter-Auth-Type": "OAuth2Session",
      "X-Twitter-Client-Language": "en",
    };

    console.log(`📡 API request gönderiliyor: ${updateUrl}`);
    console.log(`📝 Güncellenecek veriler:`, { displayName, bio });

    const response = await fetch(updateUrl, {
      method: "POST",
      headers: headers,
      body: formData.toString(),
    });

    const responseText = await response.text();
    console.log(`📊 API response: ${response.status} - ${responseText}`);

    if (response.ok) {
      const data = JSON.parse(responseText);
      console.log(
        `✅ Profil başarıyla güncellendi:`,
        data.name,
        data.description,
      );
      return { success: true };
    } else {
      // Alternatif endpoint dene
      console.log(`⚠️ V1.1 başarısız, V2 API deneniyor`);
      return await updateProfileViaAPIV2(
        username,
        authToken,
        ct0,
        displayName,
        bio,
      );
    }
  } catch (error) {
    console.error(`💥 API profil hatası (${username}):`, error);
    return {
      success: false,
      error: `API profil hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  }
}

// Twitter API V2 profil güncelleme
async function updateProfileViaAPIV2(
  username: string,
  authToken: string,
  ct0: string,
  displayName?: string,
  bio?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🌐 API V2 profil güncelleme: ${username}`);

    // Twitter V2 API endpoint
    const updateUrl = "https://api.twitter.com/2/users/me";

    const requestBody = {
      name: displayName,
      description: bio,
    };

    const headers = {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
      "X-CSRF-Token": ct0,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    };

    const response = await fetch(updateUrl, {
      method: "PATCH",
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log(`📊 API V2 response: ${response.status} - ${responseText}`);

    if (response.ok) {
      console.log(`✅ V2 API ile profil güncellendi`);
      return { success: true };
    } else {
      // Internal API dene
      return await updateProfileViaInternalAPI(
        username,
        authToken,
        ct0,
        displayName,
        bio,
      );
    }
  } catch (error) {
    console.error(`💥 API V2 profil hatası:`, error);
    return await updateProfileViaInternalAPI(
      username,
      authToken,
      ct0,
      displayName,
      bio,
    );
  }
}

// Twitter Internal API profil güncelleme
async function updateProfileViaInternalAPI(
  username: string,
  authToken: string,
  ct0: string,
  displayName?: string,
  bio?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`🔧 Internal API profil güncelleme: ${username}`);

    // Twitter'ın internal endpoint'i (web app'in kullandığı)
    const updateUrl =
      "https://twitter.com/i/api/1.1/account/update_profile.json";

    const formData = new URLSearchParams();
    if (displayName) formData.append("name", displayName);
    if (bio) formData.append("description", bio);

    const headers = {
      Authorization: `Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA`,
      "Content-Type": "application/x-www-form-urlencoded",
      "X-CSRF-Token": ct0,
      Cookie: `auth_token=${authToken}; ct0=${ct0}`,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "X-Twitter-Active-User": "yes",
      "X-Twitter-Auth-Type": "OAuth2Session",
      "X-Twitter-Client-Language": "en",
      Referer: "https://twitter.com/settings/profile",
      Origin: "https://twitter.com",
    };

    const response = await fetch(updateUrl, {
      method: "POST",
      headers: headers,
      body: formData.toString(),
    });

    const responseText = await response.text();
    console.log(
      `📊 Internal API response: ${response.status} - ${responseText}`,
    );

    if (response.ok) {
      console.log(`✅ Internal API ile profil güncellendi`);
      return { success: true };
    } else {
      return {
        success: false,
        error: `Internal API hatası: ${response.status}`,
      };
    }
  } catch (error) {
    console.error(`💥 Internal API profil hatası:`, error);
    return {
      success: false,
      error: `Internal API hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  }
}

// GERÇEK Twitter API tweet gönderme
async function sendTweetViaAPI(
  username: string,
  content: string,
  authToken: string,
  ct0: string,
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  try {
    console.log(`🌐 API tweet gönderme: ${username}`);

    // Twitter'ın gerçek tweet endpoint'i
    const tweetUrl = "https://api.twitter.com/1.1/statuses/update.json";

    const formData = new URLSearchParams();
    formData.append("status", content);

    const headers = {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "X-CSRF-Token": ct0,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "X-Twitter-Active-User": "yes",
      "X-Twitter-Auth-Type": "OAuth2Session",
    };

    console.log(`📡 Tweet API request: ${content.substring(0, 50)}...`);

    const response = await fetch(tweetUrl, {
      method: "POST",
      headers: headers,
      body: formData.toString(),
    });

    const responseText = await response.text();
    console.log(`📊 Tweet API response: ${response.status} - ${responseText}`);

    if (response.ok) {
      const data = JSON.parse(responseText);
      const tweetId = data.id_str;
      console.log(`✅ Tweet başarıyla gönderildi: ${tweetId}`);
      return { success: true, tweetId };
    } else {
      // V2 API dene
      console.log(`⚠️ V1.1 tweet başarısız, V2 API deneniyor`);
      return await sendTweetViaAPIV2(username, content, authToken, ct0);
    }
  } catch (error) {
    console.error(`💥 API tweet hatası (${username}):`, error);
    return {
      success: false,
      error: `API tweet hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  }
}

// Twitter API V2 tweet gönderme
async function sendTweetViaAPIV2(
  username: string,
  content: string,
  authToken: string,
  ct0: string,
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  try {
    console.log(`🌐 API V2 tweet gönderme: ${username}`);

    const tweetUrl = "https://api.twitter.com/2/tweets";

    const requestBody = {
      text: content,
    };

    const headers = {
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
      "X-CSRF-Token": ct0,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    };

    const response = await fetch(tweetUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log(
      `📊 Tweet V2 API response: ${response.status} - ${responseText}`,
    );

    if (response.ok) {
      const data = JSON.parse(responseText);
      const tweetId = data.data?.id;
      console.log(`✅ V2 API ile tweet gönderildi: ${tweetId}`);
      return { success: true, tweetId };
    } else {
      // Internal API dene
      return await sendTweetViaInternalAPI(username, content, authToken, ct0);
    }
  } catch (error) {
    console.error(`💥 API V2 tweet hatası:`, error);
    return await sendTweetViaInternalAPI(username, content, authToken, ct0);
  }
}

// Twitter Internal API tweet gönderme
async function sendTweetViaInternalAPI(
  username: string,
  content: string,
  authToken: string,
  ct0: string,
): Promise<{ success: boolean; tweetId?: string; error?: string }> {
  try {
    console.log(`🔧 Internal API tweet gönderme: ${username}`);

    // Twitter'ın internal endpoint'i (web app'in kullandığı)
    const tweetUrl =
      "https://twitter.com/i/api/graphql/VaenaVgh5q5ih7kvyVjgtg/CreateTweet";

    const requestBody = {
      variables: {
        tweet_text: content,
        dark_request: false,
        media: {
          media_entities: [],
          possibly_sensitive: false,
        },
        semantic_annotation_ids: [],
      },
      features: {
        tweetypie_unmention_optimization_enabled: true,
        responsive_web_edit_tweet_api_enabled: true,
        graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
        view_counts_everywhere_api_enabled: true,
        longform_notetweets_consumption_enabled: true,
        responsive_web_twitter_article_tweet_consumption_enabled: false,
        tweet_awards_web_tipping_enabled: false,
        freedom_of_speech_not_reach_fetch_enabled: true,
        standardized_nudges_misinfo: true,
        tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled:
          true,
        longform_notetweets_rich_text_read_enabled: true,
        longform_notetweets_inline_media_enabled: true,
        responsive_web_media_download_video_enabled: false,
        responsive_web_enhance_cards_enabled: false,
      },
      queryId: "VaenaVgh5q5ih7kvyVjgtg",
    };

    const headers = {
      Authorization: `Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA`,
      "Content-Type": "application/json",
      "X-CSRF-Token": ct0,
      Cookie: `auth_token=${authToken}; ct0=${ct0}`,
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "X-Twitter-Active-User": "yes",
      "X-Twitter-Auth-Type": "OAuth2Session",
      "X-Twitter-Client-Language": "en",
      Referer: "https://twitter.com/home",
      Origin: "https://twitter.com",
    };

    const response = await fetch(tweetUrl, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log(
      `📊 Internal tweet API response: ${response.status} - ${responseText.substring(0, 200)}...`,
    );

    if (response.ok) {
      const data = JSON.parse(responseText);
      const tweetId = data.data?.create_tweet?.tweet_results?.result?.rest_id;
      console.log(`✅ Internal API ile tweet gönderildi: ${tweetId}`);
      return { success: true, tweetId: tweetId || `internal_${Date.now()}` };
    } else {
      return {
        success: false,
        error: `Internal tweet API hatası: ${response.status}`,
      };
    }
  } catch (error) {
    console.error(`💥 Internal tweet API hatası:`, error);
    return {
      success: false,
      error: `Internal tweet API hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
    };
  }
}
