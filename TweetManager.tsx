import React, { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { Textarea } from "./textarea";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { Badge } from "./badge";
import { Checkbox } from "./checkbox";
import {
  MessageSquare,
  Send,
  Upload,
  Users,
  Clock,
  Zap,
  RefreshCw,
  FileText,
  Shuffle,
  XCircle,
} from "lucide-react";
import { TwitterAccount } from "@shared/api";
import { cn } from "@/lib/utils";

interface TweetManagerProps {
  accounts: TwitterAccount[];
  onSendTweet: (accountIds: string[], content: string, delay?: number) => void;
  onSendBulkTweets: (
    accountIds: string[],
    tweets: string[],
    delay?: number,
    randomOrder?: boolean,
  ) => void;
  onRemoveAccount?: (accountId: string) => void;
  isProcessing?: boolean;
}

export function TweetManager({
  accounts,
  onSendTweet,
  onSendBulkTweets,
  onRemoveAccount,
  isProcessing,
}: TweetManagerProps) {
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [singleTweet, setSingleTweet] = useState("");
  const [bulkTweets, setBulkTweets] = useState("");
  const [delay, setDelay] = useState(5);
  const [randomOrder, setRandomOrder] = useState(false);

  const successfulAccounts = accounts.filter(
    (acc) => acc.status === "success" && acc.authToken && acc.ct0,
  );

  const handleAccountToggle = (accountId: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(accountId)
        ? prev.filter((id) => id !== accountId)
        : [...prev, accountId],
    );
  };

  const handleSelectAll = () => {
    if (selectedAccounts.length === successfulAccounts.length) {
      setSelectedAccounts([]);
    } else {
      setSelectedAccounts(successfulAccounts.map((acc) => acc.id));
    }
  };

  const handleSingleTweetSubmit = () => {
    if (selectedAccounts.length === 0) {
      alert("En az bir hesap seçin");
      return;
    }
    if (!singleTweet.trim()) {
      alert("Tweet içeriği gerekli");
      return;
    }
    onSendTweet(selectedAccounts, singleTweet, delay);
  };

  const handleBulkTweetSubmit = () => {
    if (selectedAccounts.length === 0) {
      alert("En az bir hesap seçin");
      return;
    }
    if (!bulkTweets.trim()) {
      alert("Tweet içerikleri gerekli");
      return;
    }

    const tweetList = bulkTweets
      .split("\n")
      .map((tweet) => tweet.trim())
      .filter((tweet) => tweet.length > 0);

    if (tweetList.length === 0) {
      alert("En az bir tweet içeriği gerekli");
      return;
    }

    onSendBulkTweets(selectedAccounts, tweetList, delay, randomOrder);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setBulkTweets(content);
    };
    reader.readAsText(file);
  };

  const tweetCount = bulkTweets
    .split("\n")
    .map((tweet) => tweet.trim())
    .filter((tweet) => tweet.length > 0).length;

  return (
    <Card className="glass border-neon-green/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl gradient-text">
          <MessageSquare className="w-5 h-5" />
          Tweet Otomasyonu
        </CardTitle>
        {successfulAccounts.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {successfulAccounts.length} hesap tweet atmaya hazır
          </p>
        )}
      </CardHeader>

      <CardContent>
        {successfulAccounts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Tweet atmak için önce hesap token'larını çıkarın.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Hesap Seçimi */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-muted-foreground">
                  Tweet Atacak Hesaplar ({selectedAccounts.length}/
                  {successfulAccounts.length})
                </label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="border-border/50 hover:border-electric-blue"
                >
                  <Users className="w-4 h-4 mr-2" />
                  {selectedAccounts.length === successfulAccounts.length
                    ? "Hiçbirini Seçme"
                    : "Tümünü Seç"}
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-60 overflow-y-auto scroll-fade">
                {successfulAccounts.map((account) => (
                  <Card
                    key={account.id}
                    className={cn(
                      "cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                      selectedAccounts.includes(account.id)
                        ? "border-neon-green bg-neon-green/10"
                        : "border-border/50 hover:border-neon-green/50",
                    )}
                    onClick={() => handleAccountToggle(account.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={selectedAccounts.includes(account.id)}
                          onChange={() => {}}
                          className="data-[state=checked]:bg-neon-green data-[state=checked]:border-neon-green"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">
                            @{account.username}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Son güncelleme:{" "}
                            {new Date(account.lastUpdated).toLocaleDateString(
                              "tr-TR",
                            )}
                          </p>
                        </div>
                        {onRemoveAccount && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRemoveAccount(account.id);
                              setSelectedAccounts((prev) =>
                                prev.filter((id) => id !== account.id),
                              );
                            }}
                            className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Gecikme Ayarı */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Hesaplar Arası Gecikme (saniye)
                </label>
                <Input
                  type="number"
                  min="0"
                  max="300"
                  value={delay}
                  onChange={(e) => setDelay(Number(e.target.value))}
                  className="bg-surface-light border-border/50 focus:border-electric-blue"
                />
                <p className="text-xs text-muted-foreground">
                  Her tweet arasında beklenecek süre
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Tahmini Süre
                </label>
                <div className="p-3 bg-surface-light rounded-lg border border-border/50">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-electric-blue" />
                    <span className="text-sm">
                      ~{Math.ceil((selectedAccounts.length * delay) / 60)}{" "}
                      dakika
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tweet Türü */}
            <Tabs defaultValue="single" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-surface-light">
                <TabsTrigger
                  value="single"
                  className="data-[state=active]:bg-neon-green data-[state=active]:text-black"
                >
                  Tekil Tweet
                </TabsTrigger>
                <TabsTrigger
                  value="bulk"
                  className="data-[state=active]:bg-electric-purple data-[state=active]:text-white"
                >
                  Toplu Tweet
                </TabsTrigger>
              </TabsList>

              <TabsContent value="single" className="space-y-4 mt-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Tweet İçeriği
                  </label>
                  <Textarea
                    placeholder="Tweet içeriğinizi buraya yazın..."
                    value={singleTweet}
                    onChange={(e) => setSingleTweet(e.target.value)}
                    className="min-h-32 bg-surface-light border-border/50 focus:border-electric-blue resize-none"
                    maxLength={280}
                  />
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground">
                      {singleTweet.length}/280 karakter
                    </p>
                    <Badge
                      className={cn(
                        "border",
                        singleTweet.length > 280
                          ? "bg-destructive/20 text-destructive border-destructive/30"
                          : "bg-neon-green/20 text-neon-green border-neon-green/30",
                      )}
                    >
                      {280 - singleTweet.length} kalan
                    </Badge>
                  </div>
                </div>

                <Button
                  onClick={handleSingleTweetSubmit}
                  className="w-full bg-neon-green hover:bg-neon-green/80 text-black font-semibold electric-glow"
                  disabled={
                    isProcessing ||
                    selectedAccounts.length === 0 ||
                    !singleTweet.trim() ||
                    singleTweet.length > 280
                  }
                >
                  {isProcessing ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Tweet Gönderiliyor...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {selectedAccounts.length} Hesaptan Tweet At
                    </>
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="bulk" className="space-y-4 mt-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Dosya Yükle
                    </label>
                    <div className="relative">
                      <Input
                        type="file"
                        accept=".txt"
                        onChange={handleFileUpload}
                        className="bg-surface-light border-border/50 file:bg-electric-purple file:text-white file:border-0 file:rounded file:px-3 file:py-1"
                      />
                      <FileText className="absolute right-3 top-3 w-4 h-4 text-muted-foreground" />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Her satıra bir tweet yazılı TXT dosyası
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">
                      Tweet Listesi
                    </label>
                    <Textarea
                      placeholder="Her satıra bir tweet yazın..."
                      value={bulkTweets}
                      onChange={(e) => setBulkTweets(e.target.value)}
                      className="min-h-40 bg-surface-light border-border/50 focus:border-electric-blue font-mono text-sm resize-none"
                    />
                    <div className="flex justify-between items-center">
                      <p className="text-xs text-muted-foreground">
                        {tweetCount} tweet tespit edildi
                      </p>
                      <Badge className="bg-electric-purple/20 text-electric-purple border-electric-purple/30">
                        {bulkTweets.length} karakter
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="randomOrder"
                      checked={randomOrder}
                      onCheckedChange={(checked) =>
                        setRandomOrder(checked as boolean)
                      }
                      className="data-[state=checked]:bg-electric-purple data-[state=checked]:border-electric-purple"
                    />
                    <label
                      htmlFor="randomOrder"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Shuffle className="w-4 h-4" />
                        Tweet'leri rastgele sırada gönder
                      </div>
                    </label>
                  </div>

                  <Button
                    onClick={handleBulkTweetSubmit}
                    className="w-full bg-electric-purple hover:bg-electric-purple/80 text-white font-semibold electric-glow"
                    disabled={
                      isProcessing ||
                      selectedAccounts.length === 0 ||
                      tweetCount === 0
                    }
                  >
                    {isProcessing ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Tweet'ler Gönderiliyor...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        {tweetCount} Tweet'i {selectedAccounts.length} Hesaptan
                        Gönder
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
