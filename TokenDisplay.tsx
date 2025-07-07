import React, { useState } from "react";
import { Button } from "./button";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Badge } from "./badge";
import { Progress } from "./progress";
import {
  Download,
  Copy,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  Eye,
  EyeOff,
  Trash2,
} from "lucide-react";
import { TwitterAccount } from "@shared/api";
import { cn } from "@/lib/utils";

interface TokenDisplayProps {
  accounts: TwitterAccount[];
  onExport: (format: "auth:ct0" | "username:token:ct0") => void;
  onRefreshToken: (accountId: string) => void;
  onRemoveAccount: (accountId: string) => void;
  isProcessing?: boolean;
}

export function TokenDisplay({
  accounts,
  onExport,
  onRefreshToken,
  onRemoveAccount,
  isProcessing,
}: TokenDisplayProps) {
  const [showTokens, setShowTokens] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const successCount = accounts.filter(
    (acc) => acc.status === "success",
  ).length;
  const errorCount = accounts.filter((acc) => acc.status === "error").length;
  const processingCount = accounts.filter(
    (acc) => acc.status === "processing",
  ).length;
  const successRate =
    accounts.length > 0 ? (successCount / accounts.length) * 100 : 0;

  const copyToClipboard = async (text: string, accountId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(accountId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Kopyalama başarısız:", error);
    }
  };

  const getStatusIcon = (status: TwitterAccount["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-neon-green" />;
      case "error":
        return <XCircle className="w-4 h-4 text-destructive" />;
      case "processing":
        return (
          <RefreshCw className="w-4 h-4 text-electric-blue animate-spin" />
        );
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: TwitterAccount["status"]) => {
    const variants = {
      success: "bg-neon-green/20 text-neon-green border-neon-green/30",
      error: "bg-destructive/20 text-destructive border-destructive/30",
      processing:
        "bg-electric-blue/20 text-electric-blue border-electric-blue/30",
      pending: "bg-muted/20 text-muted-foreground border-muted/30",
    };

    const labels = {
      success: "Başarılı",
      error: "Hata",
      processing: "İşleniyor",
      pending: "Bekliyor",
    };

    return (
      <Badge className={cn("border", variants[status])}>{labels[status]}</Badge>
    );
  };

  return (
    <Card className="glass border-electric-purple/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl gradient-text">
            <Zap className="w-5 h-5" />
            Token Yönetimi
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowTokens(!showTokens)}
              className="border-border/50 hover:border-electric-blue"
            >
              {showTokens ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              {showTokens ? "Gizle" : "Göster"}
            </Button>
          </div>
        </div>

        {accounts.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Başarı Oranı</span>
              <span className="font-medium text-neon-green">
                {successRate.toFixed(1)}%
              </span>
            </div>
            <Progress value={successRate} className="h-2" />

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-neon-green">
                  {successCount}
                </div>
                <div className="text-xs text-muted-foreground">Başarılı</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-electric-blue">
                  {processingCount}
                </div>
                <div className="text-xs text-muted-foreground">İşleniyor</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-destructive">
                  {errorCount}
                </div>
                <div className="text-xs text-muted-foreground">Hata</div>
              </div>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {accounts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Zap className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Henüz hesap eklenmedi.</p>
            <p className="text-sm">
              Yukarıdaki formdan hesap ekleyerek başlayın.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2 mb-4">
              <Button
                onClick={() => onExport("auth:ct0")}
                className="bg-neon-green hover:bg-neon-green/80 text-black font-semibold"
                disabled={successCount === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Auth:CT0 İndir
              </Button>
              <Button
                onClick={() => onExport("username:token:ct0")}
                variant="outline"
                className="border-electric-blue text-electric-blue hover:bg-electric-blue hover:text-black"
                disabled={successCount === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Detaylı İndir
              </Button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto scroll-fade">
              {accounts.map((account) => (
                <Card
                  key={account.id}
                  className="bg-surface-light border-border/30"
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(account.status)}
                        <span className="font-medium">@{account.username}</span>
                        {account.twoFactorCode && (
                          <Badge className="bg-neon-green/20 text-neon-green border-neon-green/30 text-xs">
                            2FA
                          </Badge>
                        )}
                        {getStatusBadge(account.status)}
                      </div>
                      <div className="flex items-center gap-2">
                        {account.status === "success" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onRefreshToken(account.id)}
                            className="h-8 w-8 p-0 hover:bg-electric-blue/20"
                            disabled={isProcessing}
                          >
                            <RefreshCw className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemoveAccount(account.id)}
                          className="h-8 w-8 p-0 hover:bg-destructive/20 text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {account.status === "success" &&
                      account.authToken &&
                      account.ct0 && (
                        <div className="space-y-2">
                          <div className="p-3 bg-surface-darker rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-muted-foreground">
                                Auth Token
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(
                                    account.authToken!,
                                    `${account.id}-auth`,
                                  )
                                }
                                className="h-6 w-6 p-0"
                              >
                                {copiedId === `${account.id}-auth` ? (
                                  <CheckCircle className="w-3 h-3 text-neon-green" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                            <code className="text-xs font-mono break-all">
                              {showTokens ? account.authToken : "•".repeat(32)}
                            </code>
                          </div>

                          <div className="p-3 bg-surface-darker rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-muted-foreground">
                                CT0 Token
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(
                                    account.ct0!,
                                    `${account.id}-ct0`,
                                  )
                                }
                                className="h-6 w-6 p-0"
                              >
                                {copiedId === `${account.id}-ct0` ? (
                                  <CheckCircle className="w-3 h-3 text-neon-green" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                            <code className="text-xs font-mono break-all">
                              {showTokens ? account.ct0 : "•".repeat(16)}
                            </code>
                          </div>

                          <div className="p-3 bg-surface-darker rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-muted-foreground">
                                Birleşik Format
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  copyToClipboard(
                                    `${account.authToken}:${account.ct0}`,
                                    `${account.id}-combined`,
                                  )
                                }
                                className="h-6 w-6 p-0"
                              >
                                {copiedId === `${account.id}-combined` ? (
                                  <CheckCircle className="w-3 h-3 text-neon-green" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </Button>
                            </div>
                            <code className="text-xs font-mono break-all">
                              {showTokens
                                ? `${account.authToken}:${account.ct0}`
                                : "•".repeat(50)}
                            </code>
                          </div>
                        </div>
                      )}

                    {account.status === "error" && account.errorMessage && (
                      <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                        <p className="text-sm text-destructive">
                          {account.errorMessage}
                        </p>
                      </div>
                    )}

                    <div className="flex justify-between items-center mt-3 text-xs text-muted-foreground">
                      <span>
                        Son Güncelleme:{" "}
                        {new Date(account.lastUpdated).toLocaleString("tr-TR")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
