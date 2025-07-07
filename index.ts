import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { handleRealTokenExtraction as handleTokenExtraction } from "./routes/real-tokens";
import { handleBulkImport, handleExport } from "./routes/files";
import { handleSimpleProfileUpdate as handleProfileUpdate } from "./routes/twitter-simple";
import {
  handleSimpleSingleTweet as handleSingleTweet,
  handleSimpleBulkTweet as handleBulkTweet,
  handleSimpleEngagement as handleEngagement,
  handleSimpleFollow as handleFollow,
  handleSimpleTweetScraping as handleTweetScraping,
  handleFollowersAnalysis,
  handleTweetRepliesAnalysis,
  handleQuoteTweet,
  handleMultiFollow,
} from "./routes/twitter-simple";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Health check
  app.get("/api/ping", (_req, res) => {
    res.json({
      message: "ElitSMM Twitter Account Management System API v2.0",
    });
  });

  // Twitter Token Management APIs
  app.post("/api/extract-tokens", handleTokenExtraction);
  app.post("/api/import-accounts", handleBulkImport);
  app.post("/api/export-tokens", handleExport);

  // Profile Management APIs
  app.post("/api/update-profile", handleProfileUpdate);

  // Tweet Automation APIs
  app.post("/api/send-tweet", handleSingleTweet);
  app.post("/api/send-bulk-tweets", handleBulkTweet);
  app.post("/api/tweets/simple/single", handleSingleTweet);
  app.post("/api/tweets/simple/bulk", handleBulkTweet);

  // Engagement APIs (Beğeni/Retweet)
  app.post("/api/engagement", handleEngagement);

  // Follow APIs (Takip)
  app.post("/api/follow", handleFollow);
  app.post("/api/multi-follow", handleMultiFollow);

  // Quote Tweet APIs (Alıntı Tweet)
  app.post("/api/quote-tweet", handleQuoteTweet);

  // Tweet Scraping APIs (Tweet Çekme)
  app.post("/api/scrape-tweets", handleTweetScraping);

  // Social Media Analysis APIs (Sosyal Medya Analizi)
  app.post("/api/analyze-followers", handleFollowersAnalysis);
  app.post("/api/analyze-replies", handleTweetRepliesAnalysis);

  // Example API routes
  app.get("/api/demo", handleDemo);

  return app;
}
