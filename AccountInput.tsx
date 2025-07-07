import React, { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Upload, UserPlus, Zap } from "lucide-react";
import { TwitterAccount } from "@shared/api";

interface AccountInputProps {
  onAddAccount: (
    account: Omit<TwitterAccount, "id" | "status" | "lastUpdated">,
  ) => void;
  onBulkImport: (
    content: string,
    format: "username:password" | "username:password:token",
  ) => void;
  isProcessing?: boolean;
}

export function AccountInput({
  onAddAccount,
  onBulkImport,
  isProcessing,
}: AccountInputProps) {
  const [singleAccount, setSingleAccount] = useState({
    username: "",
    password: "",
    authToken: "",
    twoFactorCode: "",
  });
  const [bulkContent, setBulkContent] = useState("");
  const [bulkFormat, setBulkFormat] = useState<
    "username:password" | "username:password:token" | "username:password:2fa"
  >("username:password");

  const handleSingleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleAccount.username || !singleAccount.password) return;

    onAddAccount({
      username: singleAccount.username,
      password: singleAccount.password,
      authToken: singleAccount.authToken || undefined,
      twoFactorCode: singleAccount.twoFactorCode || undefined,
    });

    setSingleAccount({
      username: "",
      password: "",
      authToken: "",
      twoFactorCode: "",
    });
  };

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkContent.trim()) return;

    onBulkImport(bulkContent, bulkFormat);
    setBulkContent("");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setBulkContent(content);
    };
    reader.readAsText(file);
  };

  return (
    <Card className="glass border-electric-blue/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl gradient-text">
          <UserPlus className="w-5 h-5" />
          Hesap Yönetimi
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="single" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-surface-light">
            <TabsTrigger
              value="single"
              className="data-[state=active]:bg-electric-blue data-[state=active]:text-black"
            >
              Tekil Hesap
            </TabsTrigger>
            <TabsTrigger
              value="bulk"
              className="data-[state=active]:bg-electric-blue data-[state=active]:text-black"
            >
              Toplu İçe Aktar
            </TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4">
            <form onSubmit={handleSingleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Kullanıcı Adı
                  </label>
                  <Input
                    placeholder="@kullanici_adi"
                    value={singleAccount.username}
                    onChange={(e) =>
                      setSingleAccount((prev) => ({
                        ...prev,
                        username: e.target.value,
                      }))
                    }
                    className="bg-surface-light border-border/50 focus:border-electric-blue"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Şifre
                  </label>
                  <Input
                    type="password"
                    placeholder="Hesap şifresi"
                    value={singleAccount.password}
                    onChange={(e) =>
                      setSingleAccount((prev) => ({
                        ...prev,
                        password: e.target.value,
                      }))
                    }
                    className="bg-surface-light border-border/50 focus:border-electric-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    Auth Token (Opsiyonel)
                  </label>
                  <Input
                    placeholder="Mevcut auth token varsa"
                    value={singleAccount.authToken}
                    onChange={(e) =>
                      setSingleAccount((prev) => ({
                        ...prev,
                        authToken: e.target.value,
                      }))
                    }
                    className="bg-surface-light border-border/50 focus:border-electric-blue"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">
                    2FA Kodu (Opsiyonel)
                  </label>
                  <Input
                    placeholder="2FA doğrulama kodu"
                    value={singleAccount.twoFactorCode}
                    onChange={(e) =>
                      setSingleAccount((prev) => ({
                        ...prev,
                        twoFactorCode: e.target.value,
                      }))
                    }
                    className="bg-surface-light border-border/50 focus:border-electric-blue"
                  />
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-electric-blue hover:bg-electric-blue/80 text-black font-semibold electric-glow"
                disabled={
                  isProcessing ||
                  !singleAccount.username ||
                  !singleAccount.password
                }
              >
                <Zap className="w-4 h-4 mr-2" />
                Hesap Ekle
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Format Seçimi
                </label>
                <Tabs
                  value={bulkFormat}
                  onValueChange={(value: any) => setBulkFormat(value)}
                >
                  <TabsList className="grid w-full grid-cols-3 bg-surface-light">
                    <TabsTrigger
                      value="username:password"
                      className="text-xs data-[state=active]:bg-electric-purple data-[state=active]:text-white"
                    >
                      kullanici:sifre
                    </TabsTrigger>
                    <TabsTrigger
                      value="username:password:token"
                      className="text-xs data-[state=active]:bg-electric-purple data-[state=active]:text-white"
                    >
                      kullanici:sifre:token
                    </TabsTrigger>
                    <TabsTrigger
                      value="username:password:2fa"
                      className="text-xs data-[state=active]:bg-neon-green data-[state=active]:text-black"
                    >
                      kullanici:sifre:2fa
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Dosya Yükle
                </label>
                <div className="relative">
                  <Input
                    type="file"
                    accept=".txt,.csv"
                    onChange={handleFileUpload}
                    className="bg-surface-light border-border/50 file:bg-electric-purple file:text-white file:border-0 file:rounded file:px-3 file:py-1"
                  />
                  <Upload className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Hesap Listesi
                </label>
                <Textarea
                  placeholder={`Her satıra bir hesap:\n${
                    bulkFormat === "username:password"
                      ? "kullanici1:sifre1\nkullanici2:sifre2"
                      : bulkFormat === "username:password:token"
                        ? "kullanici1:sifre1:token1\nkullanici2:sifre2:token2"
                        : "kullanici1:sifre1:123456\nkullanici2:sifre2:789012"
                  }`}
                  value={bulkContent}
                  onChange={(e) => setBulkContent(e.target.value)}
                  className="min-h-32 bg-surface-light border-border/50 focus:border-electric-blue font-mono text-sm"
                />
              </div>

              <Button
                onClick={handleBulkSubmit}
                className="w-full bg-electric-purple hover:bg-electric-purple/80 text-white font-semibold electric-glow"
                disabled={isProcessing || !bulkContent.trim()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Toplu İçe Aktar
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
