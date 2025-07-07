import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";
import { Button } from "./button";
import { Badge } from "./badge";
import {
  Activity,
  Pause,
  Play,
  Trash2,
  Download,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { LogEntry } from "@shared/api";
import { cn } from "@/lib/utils";

interface LiveLogsProps {
  logs: LogEntry[];
  onClearLogs: () => void;
  isConnected: boolean;
  onToggleConnection: () => void;
}

export function LiveLogs({
  logs,
  onClearLogs,
  isConnected,
  onToggleConnection,
}: LiveLogsProps) {
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (logsContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } =
        logsContainerRef.current;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setAutoScroll(isAtBottom);
    }
  };

  const getLogIcon = (level: LogEntry["level"]) => {
    switch (level) {
      case "success":
        return <CheckCircle className="w-4 h-4 text-neon-green" />;
      case "error":
        return <XCircle className="w-4 h-4 text-destructive" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-warning-orange" />;
      default:
        return <Info className="w-4 h-4 text-electric-blue" />;
    }
  };

  const getLogBadge = (level: LogEntry["level"]) => {
    const variants = {
      success: "bg-neon-green/20 text-neon-green border-neon-green/30",
      error: "bg-destructive/20 text-destructive border-destructive/30",
      warning:
        "bg-warning-orange/20 text-warning-orange border-warning-orange/30",
      info: "bg-electric-blue/20 text-electric-blue border-electric-blue/30",
    };

    const labels = {
      success: "BAŞARILI",
      error: "HATA",
      warning: "UYARI",
      info: "BİLGİ",
    };

    return (
      <Badge
        className={cn("border text-xs font-mono font-bold", variants[level])}
      >
        {labels[level]}
      </Badge>
    );
  };

  const exportLogs = () => {
    const logsText = logs
      .map(
        (log) =>
          `[${new Date(log.timestamp).toLocaleString("tr-TR")}] ${log.level.toUpperCase()}: ${log.message}${log.username ? ` (${log.username})` : ""}`,
      )
      .join("\n");

    const blob = new Blob([logsText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `twitter-token-logs-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="glass border-neon-green/20 h-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-xl gradient-text">
            <Activity
              className={cn(
                "w-5 h-5",
                isConnected ? "text-neon-green animate-pulse" : "text-muted",
              )}
            />
            Detaylı İşlem Logları
          </CardTitle>

          <div className="flex items-center gap-2">
            <Badge
              className={cn(
                "border",
                isConnected
                  ? "bg-neon-green/20 text-neon-green border-neon-green/30"
                  : "bg-muted/20 text-muted-foreground border-muted/30",
              )}
            >
              {isConnected ? "CANLI" : "DURDURULDU"}
            </Badge>

            <Button
              variant="outline"
              size="sm"
              onClick={onToggleConnection}
              className="border-border/50 hover:border-electric-blue"
            >
              {isConnected ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>

            {logs.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={exportLogs}
                  className="border-border/50 hover:border-neon-green"
                >
                  <Download className="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={onClearLogs}
                  className="border-border/50 hover:border-destructive text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Henüz log kaydı yok.</p>
            <p className="text-sm">
              İşlemler başladığında loglar burada görünecek.
            </p>
          </div>
        ) : (
          <div
            ref={logsContainerRef}
            onScroll={handleScroll}
            className="max-h-[600px] overflow-y-auto scroll-fade space-y-3 font-mono text-sm"
          >
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-4 p-4 bg-surface-darker rounded-lg border border-border/30 hover:border-border/60 transition-colors"
              >
                <div className="flex-shrink-0 mt-0.5">
                  {getLogIcon(log.level)}
                </div>

                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    {getLogBadge(log.level)}
                    <span className="text-xs text-muted-foreground font-medium">
                      {new Date(log.timestamp).toLocaleTimeString("tr-TR")}
                    </span>
                    {log.username && (
                      <Badge
                        variant="outline"
                        className="text-xs border-electric-blue/30 text-electric-blue"
                      >
                        @{log.username}
                      </Badge>
                    )}
                  </div>

                  <p className="text-foreground break-words leading-relaxed">
                    {log.message}
                  </p>

                  {log.details && (
                    <details className="mt-3">
                      <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground font-medium">
                        Detayları Göster
                      </summary>
                      <pre className="mt-2 p-3 bg-surface-light rounded text-xs overflow-x-auto border border-border/30 leading-relaxed">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}

        {logs.length > 0 && !autoScroll && (
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAutoScroll(true);
                logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className="border-electric-blue text-electric-blue hover:bg-electric-blue hover:text-black"
            >
              En Alta Kayd��r
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
