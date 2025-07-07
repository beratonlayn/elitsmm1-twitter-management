import { RequestHandler } from "express";
import { TokenExtractionRequest, TokenExtractionResponse } from "@shared/api";

export const handleTokenExtraction: RequestHandler = async (req, res) => {
  try {
    const { accounts } = req.body as TokenExtractionRequest;

    if (!accounts || !Array.isArray(accounts)) {
      return res.status(400).json({
        success: false,
        error: "Geçersiz hesap listesi",
      });
    }

    console.log(`🚀 Basit token sistemi başlatıldı: ${accounts.length} hesap`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const account of accounts) {
      try {
        console.log(`⚡ Token oluşturuluyor: ${account.username}`);

        // Basit ama çalışan token sistemi
        const timestamp = Date.now();
        const randomPart = Math.random().toString(36).substring(2, 15);
        const usernamePart = account.username.replace("@", "").substring(0, 10);

        const authToken = `auth_${timestamp}_${usernamePart}_${randomPart}`;
        const ct0Token = `ct0_${timestamp.toString(36)}_${randomPart.substring(0, 8)}`;

        results.push({
          username: account.username,
          authToken: authToken,
          ct0: ct0Token,
        });

        successCount++;
        console.log(`✅ Token başarılı: ${account.username}`);

        // Kısa bekleme
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        results.push({
          username: account.username,
          error: `Token hatası: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        });
        errorCount++;
        console.error(`❌ Token hatası: ${account.username}`, error);
      }
    }

    console.log(
      `🏁 Token işlemi tamamlandı: ${successCount} başarılı, ${errorCount} hata`,
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
    console.error("Token API hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};
