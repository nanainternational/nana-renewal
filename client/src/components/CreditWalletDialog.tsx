import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Copy, Check, FileText, Link as LinkIcon, Type, History, Coins } from "lucide-react";

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
  if (!v) return "-";
  try {
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return String(v);

    // 날짜 포맷 (YY.MM.DD HH:mm)
    const year = d.getFullYear().toString().slice(2);
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const day = d.getDate().toString().padStart(2, "0");
    const hour = d.getHours().toString().padStart(2, "0");
    const min = d.getMinutes().toString().padStart(2, "0");

    return `${year}.${month}.${day} ${hour}:${min}`;
  } catch {
    return String(v || "");
  }
}

function fmtCreditsWonToDisplay(balanceWon: number) {
  return Math.floor(balanceWon / 10).toLocaleString();
}

// 복사 버튼 컴포넌트
function CopyButton({ text, label }: { text: string | null | undefined; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!text) return <span className="text-muted-foreground">-</span>;

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs hover:bg-zinc-100 hover:text-black transition-colors gap-1.5"
      onClick={handleCopy}
      title={label || "복사하기"}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-green-600" />
          <span className="text-green-600 font-medium">복사됨</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3 text-zinc-400" />
          <span className="text-zinc-500 font-normal">{label || "복사"}</span>
        </>
      )}
    </Button>
  );
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
  const [userId, setUserId] = useState<string>(""); // ✅ 추가

  const balanceText = useMemo(() => {
    if (typeof balanceWon !== "number") return "-";
    return `${fmtCreditsWonToDisplay(balanceWon)}`;
  }, [balanceWon]);

  const load = async () => {
    setLoading(true);
    try {
      const [w, h, u] = await Promise.all([
        fetch("/api/wallet", { credentials: "include" }).then((r) => r.json()),
        fetch("/api/wallet/history?limit=30", { credentials: "include" }).then((r) => r.json()),
        fetch("/api/wallet/usage?limit=50", { credentials: "include" }).then((r) => r.json()),
      ]);

      if (w?.ok && typeof w?.user_id === "string") setUserId(w.user_id);
      setHistory(Array.isArray(h?.rows) ? h.rows : []);
      setUsage(Array.isArray(u?.rows) ? u.rows : []);

      onRefreshBalance?.();
    } catch {
      setUserId("");
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
      <DialogContent className="max-w-5xl p-0 gap-0 overflow-hidden bg-white border-zinc-200">
        {/* 다크 스타일 헤더 */}
        <DialogHeader className="p-6 bg-zinc-900 text-white flex-row items-center justify-between space-y-0 border-b border-zinc-800">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Credit Wallet
            </DialogTitle>

            <p className="text-xs text-zinc-400 font-light">
              AI 상세페이지 생성 내역 및 크레딧 차감 내역을 확인합니다.
            </p>

            {/* ✅ Account ID 표시 + 복사 */}
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Account ID</span>
              <span className="text-xs text-zinc-200 font-mono">{userId || "-"}</span>
              <CopyButton text={userId || ""} label="복사" />
            </div>
          </div>

          <div className="flex flex-col items-end">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">Balance</span>
            <div className="flex items-center gap-2 bg-zinc-800 px-3 py-1.5 rounded-full border border-zinc-700">
              <div className="w-4 h-4 rounded-full border border-white/30 flex items-center justify-center">
                <span className="text-[9px] font-bold text-white">C</span>
              </div>
              <span className="text-lg font-bold font-mono text-white tracking-wide">{balanceText}</span>
            </div>
          </div>
        </DialogHeader>

        {/* 컨트롤 바 */}
        <div className="flex items-center justify-between p-4 bg-white border-b border-zinc-100">
          <div className="flex items-center gap-2 p-1 bg-zinc-100 rounded-lg">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTab("history")}
              className={`text-xs font-medium h-8 rounded-md transition-all ${
                tab === "history"
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-500 hover:text-black hover:bg-zinc-200/50"
              }`}
            >
              <History className="w-3.5 h-3.5 mr-1.5" />
              작업내역
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTab("usage")}
              className={`text-xs font-medium h-8 rounded-md transition-all ${
                tab === "usage"
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-500 hover:text-black hover:bg-zinc-200/50"
              }`}
            >
              <Coins className="w-3.5 h-3.5 mr-1.5" />
              차감내역
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={load}
            disabled={loading}
            className="h-8 text-xs border-zinc-300 hover:bg-zinc-50 hover:text-black"
          >
            새로고침
          </Button>
        </div>

        {/* 컨텐츠 영역 */}
        <div className="p-4 bg-zinc-50/50 min-h-[400px]">
          {tab === "history" ? (
            <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden shadow-sm">
              {/* 테이블 헤더 */}
              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-zinc-900 text-zinc-100 text-xs font-medium">
                <div className="col-span-3">URL 소스</div>
                <div className="col-span-3">상품명 (AI Title)</div>
                <div className="col-span-4">에디터 내용 (HTML)</div>
                <div className="col-span-2 text-right">날짜</div>
              </div>

              <div className="max-h-[600px] overflow-auto divide-y divide-zinc-100">
                {loading ? (
                  <div className="p-8 text-center text-sm text-zinc-400">데이터를 불러오는 중입니다...</div>
                ) : history.length === 0 ? (
                  <div className="p-8 text-center text-sm text-zinc-400">작업 내역이 없습니다.</div>
                ) : (
                  history.map((r, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-12 gap-4 px-4 py-4 text-sm hover:bg-zinc-50/80 transition-colors group items-start"
                    >
                      {/* URL 컬럼 */}
                      <div className="col-span-3 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="text-xs font-medium text-zinc-700">source_url</span>
                          <CopyButton text={r.source_url} />
                        </div>
                        <a
                          href={r.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline break-all leading-relaxed"
                        >
                          {r.source_url}
                        </a>
                      </div>

                      {/* 상품명 컬럼 */}
                      <div className="col-span-3 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <Type className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="text-xs font-medium text-zinc-700">ai_title</span>
                          <CopyButton text={r.ai_title || ""} />
                        </div>
                        <div className="text-xs text-zinc-800 break-words whitespace-pre-wrap leading-relaxed">
                          {r.ai_title || "-"}
                        </div>
                      </div>

                      {/* 에디터 컬럼 */}
                      <div className="col-span-4 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="text-xs font-medium text-zinc-700">ai_editor</span>
                          <CopyButton text={r.ai_editor || ""} />
                        </div>
                        <div className="text-xs text-zinc-700 break-words whitespace-pre-wrap leading-relaxed line-clamp-6 group-hover:line-clamp-none transition-all">
                          {r.ai_editor || "-"}
                        </div>
                      </div>

                      {/* 날짜 컬럼 */}
                      <div className="col-span-2 text-right flex flex-col gap-1">
                        <div className="text-xs font-medium text-zinc-800">{fmtDate(r.created_at)}</div>
                        <div className="text-[10px] text-zinc-400">TTL: {fmtDate(r.expires_at)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden shadow-sm">
              {/* 테이블 헤더 */}
              <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-zinc-900 text-zinc-100 text-xs font-medium">
                <div className="col-span-3">기능</div>
                <div className="col-span-3">URL</div>
                <div className="col-span-2">Cost</div>
                <div className="col-span-4 text-right">날짜</div>
              </div>

              <div className="max-h-[600px] overflow-auto divide-y divide-zinc-100">
                {loading ? (
                  <div className="p-8 text-center text-sm text-zinc-400">데이터를 불러오는 중입니다...</div>
                ) : usage.length === 0 ? (
                  <div className="p-8 text-center text-sm text-zinc-400">차감 내역이 없습니다.</div>
                ) : (
                  usage.map((r, i) => (
                    <div key={i} className="grid grid-cols-12 gap-4 px-4 py-4 text-sm hover:bg-zinc-50/80 transition-colors group items-start">
                      <div className="col-span-3 text-xs text-zinc-800 break-words">{r.feature}</div>

                      <div className="col-span-3 flex items-center gap-2">
                        <div className="text-xs text-blue-600 break-all">{r.source_url || "-"}</div>
                        <CopyButton text={r.source_url || ""} />
                      </div>

                      <div className="col-span-2 text-xs font-mono text-zinc-900">{r.cost?.toLocaleString?.() ?? r.cost}</div>

                      <div className="col-span-4 text-right text-xs text-zinc-700">{fmtDate(r.created_at)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
