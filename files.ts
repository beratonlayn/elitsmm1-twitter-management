import { RequestHandler } from "express";
import { BulkImportRequest, BulkImportResponse } from "@shared/api";

export const handleBulkImport: RequestHandler = async (req, res) => {
  try {
    const { content, format } = req.body as BulkImportRequest;

    if (!content || !format) {
      return res.status(400).json({
        success: false,
        error: "İçerik ve format gerekli",
      });
    }

    const lines = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);

    const accounts = [];
    const errors = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNumber = i + 1;
      const parts = line.split(":");

      try {
        if (format === "username:password" && parts.length >= 2) {
          accounts.push({
            id: Date.now().toString() + Math.random(),
            username: parts[0],
            password: parts[1],
            status: "pending" as const,
            lastUpdated: new Date().toISOString(),
          });
        } else if (format === "username:password:token" && parts.length >= 3) {
          accounts.push({
            id: Date.now().toString() + Math.random(),
            username: parts[0],
            password: parts[1],
            authToken: parts[2],
            ct0: parts[3] || "",
            status: parts[2] ? ("success" as const) : ("pending" as const),
            lastUpdated: new Date().toISOString(),
          });
        } else {
          errors.push(`Satır ${lineNumber}: Geçersiz format - ${line}`);
        }
      } catch (error) {
        errors.push(
          `Satır ${lineNumber}: İşlem hatası - ${error instanceof Error ? error.message : "Bilinmeyen hata"}`,
        );
      }
    }

    const response: BulkImportResponse = {
      success: true,
      accountsImported: accounts.length,
      accounts,
      errors,
    };

    res.json(response);
  } catch (error) {
    console.error("Toplu içe aktarma hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
      accountsImported: 0,
      accounts: [],
      errors: [],
    });
  }
};

export const handleExport: RequestHandler = async (req, res) => {
  try {
    const { format, accounts } = req.body;

    if (!format || !accounts || !Array.isArray(accounts)) {
      return res.status(400).json({
        success: false,
        error: "Format ve hesap listesi gerekli",
      });
    }

    const successfulAccounts = accounts.filter(
      (acc: any) => acc.status === "success" && acc.authToken && acc.ct0,
    );

    let content = "";
    if (format === "auth:ct0") {
      content = successfulAccounts
        .map((acc: any) => `${acc.authToken}:${acc.ct0}`)
        .join("\n");
    } else if (format === "username:token:ct0") {
      content = successfulAccounts
        .map((acc: any) => `${acc.username}:${acc.authToken}:${acc.ct0}`)
        .join("\n");
    }

    res.setHeader("Content-Type", "text/plain");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="twitter-tokens-${format.replace(":", "-")}-${new Date().toISOString().split("T")[0]}.txt"`,
    );
    res.send(content);
  } catch (error) {
    console.error("Dışa aktarma hatası:", error);
    res.status(500).json({
      success: false,
      error: "Sunucu hatası",
    });
  }
};
