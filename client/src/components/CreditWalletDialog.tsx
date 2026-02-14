import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type AiRow = {
  source_url: string;
  ai_title?: string | null;
  ai_editor?: string | null;
  created_at?: string | null;
  expires_at?: string | null;
};

type UsageRow = {
  feature: string;
  cost: number;
  source_url?: string | null;
  created_at?: string | null;
};

function fmtDate(v?: string | null) {
  if (!v) return "";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);
    return d.toLocaleString();
  } catch {
    return String(v || "");
  }
}

function fmtCreditsWonToDisplay(balanceWon: number) {
  return Math.floor(balanceWon / 10).toLocaleString();
}

export default function CreditWalletDialog({
  open,
  onOpenChange,
  balanceWon,
  onRefreshBalance,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  balanceWon: number | null;
  onRefreshBalance?: () => void;
}) {
  const [tab, setTab] = useState<"history" | "usage">("history");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<AiRow[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const balanceText = useMemo(() => {
    if (typeof balanceWon !== "number") return "-";
    return `${fmtCreditsWonToDisplay(balanceWon)} credit`;
  }, [balanceWon]);

  const load = async () => {
    setLoading(true);
    try {
      const [h, u] = await Promise.all([
        fetch("/api/wallet/history?limit=30", { credentials: "include" }).then((r) => r.json()),
        fetch("/api/wallet/usage?limit=50", { credentials: "include" }).then((r) => r.json()),
      ]);

      setHistory(Array.isArray(h?.rows) ? h.rows : []);
      setUsage(Array.isArray(u?.rows) ? u.rows : []);
      onRefreshBalance?.();
    } catch {
      setHistory([]);
      setUsage([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>크레딧</span>
            <span className="text-sm text-muted-foreground">{balanceText}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button
            variant={tab === "history" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("history")}
          >
            작업내역
          </Button>
          <Button
            variant={tab === "usage" ? "default" : "outline"}
            size="sm"
            onClick={() => setTab("usage")}
          >
            차감내역
          </Button>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            새로고침
          </Button>
        </div>

        {tab === "history" ? (
          <div className="border rounded-md overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs bg-muted/40">
              <div className="col-span-5">URL</div>
              <div className="col-span-4">상품명</div>
              <div className="col-span-3">생성/만료</div>
            </div>

            <div className="max-h-[420px] overflow-auto">
              {loading ? (
                <div className="p-4 text-sm text-muted-foreground">불러오는 중...</div>
              ) : history.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">작업내역이 없습니다.</div>
              ) : (
                history.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 border-t text-sm">
                    <div className="col-span-5">
                      <div className="truncate" title={r.source_url}>
                        {r.source_url}
                      </div>
                      <div className="mt-1 flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigator.clipboard.writeText(r.source_url)}
                        >
                          URL 복사
                        </Button>
                      </div>
                    </div>
                    <div className="col-span-4">
                      <div className="font-medium truncate" title={r.ai_title || ""}>
                        {r.ai_title || "-"}
                      </div>
                      {r.ai_editor ? (
                        <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                          {r.ai_editor}
                        </div>
                      ) : null}
                    </div>
                    <div className="col-span-3 text-xs text-muted-foreground">
                      <div>생성: {fmtDate(r.created_at)}</div>
                      <div>만료: {fmtDate(r.expires_at)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs bg-muted/40">
              <div className="col-span-3">기능</div>
              <div className="col-span-2">차감(원)</div>
              <div className="col-span-5">URL</div>
              <div className="col-span-2">시간</div>
            </div>

            <div className="max-h-[420px] overflow-auto">
              {loading ? (
                <div className="p-4 text-sm text-muted-foreground">불러오는 중...</div>
              ) : usage.length === 0 ? (
                <div className="p-4 text-sm text-muted-foreground">차감내역이 없습니다.</div>
              ) : (
                usage.map((r, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 px-3 py-2 border-t text-sm">
                    <div className="col-span-3 font-medium">{r.feature}</div>
                    <div className="col-span-2">{Number(r.cost || 0).toLocaleString()}</div>
                    <div className="col-span-5">
                      <div className="truncate" title={r.source_url || ""}>
                        {r.source_url || "-"}
                      </div>
                    </div>
                    <div className="col-span-2 text-xs text-muted-foreground">{fmtDate(r.created_at)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        <div className="text-xs text-muted-foreground">
          * 작업내역(ai 결과)은 30일 보관 후 자동 삭제됩니다.
        </div>
      </DialogContent>
    </Dialog>
  );
}
