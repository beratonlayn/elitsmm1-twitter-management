import React, { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Badge } from "./badge";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import {
  User,
  Upload,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  Image as ImageIcon,
} from "lucide-react";
import { TwitterAccount } from "@shared/api";
import { cn } from "@/lib/utils";

interface ProfileManagerProps {
  accounts: TwitterAccount[];
  onUpdateProfile: (
    accountId: string,
    profileData: {
      displayName?: string;
      bio?: string;
      profileImage?: string;
    },
  ) => void;
  onRemoveAccount?: (accountId: string) => void;
  isProcessing?: boolean;
}

export function ProfileManager({
  accounts,
  onUpdateProfile,
  onRemoveAccount,
  isProcessing,
}: ProfileManagerProps) {
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [profileData, setProfileData] = useState({
    displayName: "",
    bio: "",
    profileImage: "",
  });
  const [imagePreview, setImagePreview] = useState<string>("");

  const successfulAccounts = accounts.filter(
    (acc) => acc.status === "success" && acc.authToken && acc.ct0,
  );

  const handleAccountSelect = (accountId: string) => {
    setSelectedAccount(accountId);
    const account = accounts.find((acc) => acc.id === accountId);
    if (account?.profileData) {
      setProfileData({
        displayName: account.profileData.displayName || "",
        bio: account.profileData.bio || "",
        profileImage: account.profileData.profileImage || "",
      });
      setImagePreview(account.profileData.profileImage || "");
    } else {
      setProfileData({ displayName: "", bio: "", profileImage: "" });
      setImagePreview("");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Dosya boyutu kontrolü (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert("Dosya boyutu 5MB'dan küçük olmalıdır");
      return;
    }

    // Dosya türü kontrolü
    if (!file.type.startsWith("image/")) {
      alert("Sadece resim dosyaları yüklenebilir");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setProfileData((prev) => ({
        ...prev,
        profileImage: base64String,
      }));
      setImagePreview(base64String);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = () => {
    if (!selectedAccount) {
      alert("Lütfen bir hesap seçin");
      return;
    }

    if (
      !profileData.displayName &&
      !profileData.bio &&
      !profileData.profileImage
    ) {
      alert("En az bir alan doldurulmalıdır");
      return;
    }

    onUpdateProfile(selectedAccount, profileData);
  };

  const selectedAccountData = accounts.find(
    (acc) => acc.id === selectedAccount,
  );

  return (
    <Card className="glass border-electric-purple/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl gradient-text">
          <User className="w-5 h-5" />
          Profil Yönetimi
        </CardTitle>
        {successfulAccounts.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {successfulAccounts.length} hesap profil düzenlemeye hazır
          </p>
        )}
      </CardHeader>

      <CardContent>
        {successfulAccounts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Profil düzenlemek için önce hesap token'larını çıkarın.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Hesap Seçimi */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-muted-foreground">
                Düzenlenecek Hesap
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {successfulAccounts.map((account) => (
                  <Card
                    key={account.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                      selectedAccount === account.id
                        ? "border-electric-blue bg-electric-blue/10"
                        : "border-border/50 hover:border-electric-blue/50",
                    )}
                    onClick={() => handleAccountSelect(account.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage
                            src={account.profileData?.profileImage}
                            alt={account.username}
                          />
                          <AvatarFallback className="bg-electric-blue/20 text-electric-blue">
                            {account.username.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            @{account.username}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {account.profileData?.displayName ||
                              "İsim belirtilmemiş"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {onRemoveAccount && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onRemoveAccount(account.id);
                              }}
                              className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          )}
                          {selectedAccount === account.id && (
                            <CheckCircle className="w-4 h-4 text-electric-blue" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Profil Düzenleme Formu */}
            {selectedAccount && selectedAccountData && (
              <Card className="bg-surface-light border-border/30">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <User className="w-4 h-4" />@{selectedAccountData.username}{" "}
                    Profil Düzenleme
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Profil Resmi */}
                  <div className="space-y-3">
                    <label className="text-sm font-medium text-muted-foreground">
                      Profil Resmi
                    </label>
                    <div className="flex items-center gap-4">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={imagePreview} alt="Profil resmi" />
                        <AvatarFallback className="bg-electric-blue/20 text-electric-blue text-lg">
                          {selectedAccountData.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-2">
                        <div className="relative">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="sr-only"
                            id="profile-image"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                              document.getElementById("profile-image")?.click()
                            }
                            className="border-electric-blue text-electric-blue hover:bg-electric-blue hover:text-black"
                          >
                            <ImageIcon className="w-4 h-4 mr-2" />
                            Resim Seç
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          JPG, PNG, GIF (max 5MB)
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Görünen İsim */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Görünen İsim
                    </label>
                    <Input
                      placeholder="Profilinizde görünecek isim"
                      value={profileData.displayName}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          displayName: e.target.value,
                        }))
                      }
                      className="bg-surface-darker border-border/50 focus:border-electric-blue"
                      maxLength={50}
                    />
                    <p className="text-xs text-muted-foreground">
                      {profileData.displayName.length}/50 karakter
                    </p>
                  </div>

                  {/* Biyografi */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Biyografi
                    </label>
                    <Textarea
                      placeholder="Kendinizi tanıtın..."
                      value={profileData.bio}
                      onChange={(e) =>
                        setProfileData((prev) => ({
                          ...prev,
                          bio: e.target.value,
                        }))
                      }
                      className="min-h-24 bg-surface-darker border-border/50 focus:border-electric-blue resize-none"
                      maxLength={160}
                    />
                    <p className="text-xs text-muted-foreground">
                      {profileData.bio.length}/160 karakter
                    </p>
                  </div>

                  {/* Mevcut Profil Bilgileri */}
                  {selectedAccountData.profileData && (
                    <div className="p-4 bg-surface-darker rounded-lg space-y-2">
                      <h4 className="text-sm font-medium text-electric-blue">
                        Mevcut Profil Bilgileri
                      </h4>
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="text-muted-foreground">��sim:</span>{" "}
                          {selectedAccountData.profileData.displayName ||
                            "Belirtilmemiş"}
                        </p>
                        <p>
                          <span className="text-muted-foreground">Bio:</span>{" "}
                          {selectedAccountData.profileData.bio ||
                            "Belirtilmemiş"}
                        </p>
                        <p>
                          <span className="text-muted-foreground">
                            Son Güncelleme:
                          </span>{" "}
                          {selectedAccountData.profileData.lastProfileUpdate
                            ? new Date(
                                selectedAccountData.profileData.lastProfileUpdate,
                              ).toLocaleString("tr-TR")
                            : "Hiç güncellenmemiş"}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Güncelleme Butonu */}
                  <Button
                    onClick={handleSubmit}
                    className="w-full bg-electric-purple hover:bg-electric-purple/80 text-white font-semibold electric-glow"
                    disabled={
                      isProcessing ||
                      (!profileData.displayName &&
                        !profileData.bio &&
                        !profileData.profileImage)
                    }
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Güncelleniyor...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Profili Güncelle
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
