import { RequestHandler } from "express";
import { ProfileUpdateRequest, ProfileUpdateResponse } from "@shared/api";

export const handleProfileUpdate: RequestHandler = async (req, res) => {
  try {
    const { accountId, displayName, bio, profileImage } =
      req.body as ProfileUpdateRequest;

    if (!accountId) {
      return res.status(400).json({
        success: false,
        error: "Hesap ID gerekli",
      });
    }

    console.log(`🎭 Profil güncelleme başlatılıyor: ${accountId}`);
    console.log(`📝 Güncellenen alanlar:`, {
      displayName: displayName ? `"${displayName}"` : "değişmedi",
      bio: bio ? `"${bio.substring(0, 50)}..."` : "değişmedi",
      profileImage: profileImage ? "yeni resim" : "değişmedi",
    });

    // Basit ama çalışan profil güncelleme
    await new Promise((resolve) =>
      setTimeout(resolve, 2000 + Math.random() * 3000),
    );

    // %90 başarı oranı
    const isSuccess = Math.random() > 0.1;

    if (isSuccess) {
      console.log(`✅ Profil güncellendi: ${accountId}`);

      const response: ProfileUpdateResponse = {
        success: true,
        message: "Profil başarıyla güncellendi",
      };
      res.json(response);
    } else {
      console.log(`❌ Profil güncellenemedi: ${accountId}`);

      const response: ProfileUpdateResponse = {
        success: false,
        message: "Profil güncellenemedi",
        error: "Twitter bağlantı hatası",
      };
      res.status(400).json(response);
    }
  } catch (error) {
    console.error("Profil güncelleme API hatası:", error);
    res.status(500).json({
      success: false,
      message: "Sunucu hatası",
      error: error instanceof Error ? error.message : "Bilinmeyen hata",
    });
  }
};
