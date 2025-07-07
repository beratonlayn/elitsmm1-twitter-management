/**
 * Shared code between client and server
 * Twitter Token Management API interfaces
 */

export interface TwitterAccount {
  id: string;
  username: string;
  password?: string;
  twoFactorCode?: string;
  authToken?: string;
  ct0?: string;
  status: "pending" | "processing" | "success" | "error" | "2fa_required";
  lastUpdated: string;
  errorMessage?: string;
  profileData?: {
    displayName?: string;
    bio?: string;
    profileImage?: string;
    lastProfileUpdate?: string;
  };
}

export interface TokenExtractionRequest {
  accounts: Array<{
    username: string;
    password: string;
    twoFactorCode?: string;
  }>;
}

export interface TokenExtractionResponse {
  success: boolean;
  results: Array<{
    username: string;
    authToken?: string;
    ct0?: string;
    error?: string;
  }>;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
}

export interface BulkImportRequest {
  content: string; // File content as text
  format:
    | "username:password"
    | "username:password:token"
    | "username:password:2fa";
}

export interface BulkImportResponse {
  success: boolean;
  accountsImported: number;
  accounts: TwitterAccount[];
  errors: string[];
}

export interface ExportRequest {
  format: "auth:ct0" | "username:token:ct0";
  accounts: TwitterAccount[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "info" | "success" | "warning" | "error";
  message: string;
  username?: string;
  details?: any;
}

// Beğeni/Retweet için yeni interface'ler
export interface EngagementRequest {
  accountIds: string[];
  tweetUrl: string;
  actionType: "like" | "retweet";
  speed: "instant" | "medium" | "slow";
  tokens: { [accountId: string]: { authToken: string; ct0: string } };
  proxyList?: string[];
  useProxy?: boolean;
}

export interface EngagementResponse {
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

export interface LiveLogsResponse {
  logs: LogEntry[];
}

// Profile Management
export interface ProfileUpdateRequest {
  accountId: string;
  displayName?: string;
  bio?: string;
  profileImage?: string; // Base64 image data or file path
}

export interface ProfileUpdateResponse {
  success: boolean;
  message: string;
  error?: string;
}

// Tweet Automation
export interface TweetRequest {
  accountIds: string[]; // Multiple accounts to tweet from
  content: string;
  delay?: number; // Delay between tweets in seconds
}

export interface BulkTweetRequest {
  accountIds: string[];
  tweets: string[]; // Array of tweet content
  delay?: number;
  randomOrder?: boolean;
}

export interface TweetResponse {
  success: boolean;
  results: Array<{
    accountId: string;
    username: string;
    success: boolean;
    tweetId?: string;
    error?: string;
  }>;
  totalProcessed: number;
  successCount: number;
  errorCount: number;
}

export interface TweetStatus {
  id: string;
  accountId: string;
  username: string;
  content: string;
  status: "pending" | "posting" | "success" | "error";
  tweetId?: string;
  error?: string;
  timestamp: string;
}

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}
