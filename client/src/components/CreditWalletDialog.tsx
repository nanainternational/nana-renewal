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

function fmtCreditsCostToDisplay(costWon: number) {
  return Math.floor(costWon / 10).toLocaleString();
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
      className="h-6 px-2 text-xs hover:bg-zinc-100 hover:text-black transition-colors gap-1.5 shrink-0"
      onClick={handleCopy}
      title={label || "복사하기"}
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-green-600" />
          <span className="text-green-600 font-medium">완료</span>
        </>
      ) : (
        <>
          <Copy className="w-3 h-3 text-zinc-400" />
          {label && <span className="text-zinc-500 font-normal">{label}</span>}
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
  const [userId, setUserId] = useState<string>("");

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

  // 나나인터내셔널 테마 컬러 (Deep Navy)
  const NANA_NAVY = "bg-[#1c243a]"; 
  const NANA_NAVY_BORDER = "border-[#2d3a5e]";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 gap-0 overflow-hidden bg-white border-zinc-200 max-h-[90vh] flex flex-col [&>button]:right-3 [&>button]:top-3 [&>button]:z-50 [&>button]:rounded-full [&>button]:bg-white/10 [&>button]:text-white [&>button]:opacity-100 [&>button:hover]:bg-white/20">
        
        {/* 헤더: 나나인터내셔널 테마 적용 */}
        <DialogHeader className={`p-5 md:p-6 ${NANA_NAVY} text-white flex-row items-center justify-between space-y-0 border-b ${NANA_NAVY_BORDER} shrink-0`}>
          <div className="flex flex-col gap-1.5 w-full pr-8">
            <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Credit Wallet
            </DialogTitle>

            <p className="text-xs text-zinc-300/80 font-light">
              AI 상세페이지 생성 및 크레딧 내역
            </p>

            {/* Account ID */}
            <div className="mt-1 flex items-center gap-2 bg-black/20 px-2 py-1 rounded w-fit max-w-full">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider shrink-0">ID</span>
              <span className="text-xs text-zinc-200 font-mono truncate">{userId || "-"}</span>
              <CopyButton text={userId || ""} />
            </div>
          </div>

          <div className="flex flex-col items-end shrink-0">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">Balance</span>
            <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-full border border-white/10">
              <div className="w-4 h-4 rounded-full border border-white/30 flex items-center justify-center bg-yellow-500/20">
                <span className="text-[9px] font-bold text-yellow-400">C</span>
              </div>
              <span className="text-lg font-bold font-mono text-white tracking-wide">{balanceText}</span>
            </div>
          </div>
        </DialogHeader>

        {/* 컨트롤 바 */}
        <div className="flex items-center justify-between p-3 md:p-4 bg-white border-b border-zinc-100 shrink-0">
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

        {/* 컨텐츠 영역 (스크롤 가능) */}
        <div className="p-3 md:p-4 bg-zinc-50/50 overflow-y-auto flex-1 min-h-0">
          {tab === "history" ? (
            <div className="space-y-3">
              {/* PC 버전 헤더 */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-zinc-800 text-zinc-100 text-xs font-medium rounded-t-lg">
                <div className="col-span-3">URL 소스</div>
                <div className="col-span-3">상품명 (AI Title)</div>
                <div className="col-span-4">에디터 내용 (HTML)</div>
                <div className="col-span-2 text-right">날짜</div>
              </div>

              {loading ? (
                 <div className="p-8 text-center text-sm text-zinc-400">데이터를 불러오는 중입니다...</div>
              ) : history.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-400">작업 내역이 없습니다.</div>
              ) : (
                <div className="space-y-3 md:space-y-0 md:bg-white md:border md:border-zinc-200 md:rounded-b-lg md:divide-y md:divide-zinc-100">
                  {history.map((r, i) => (
                    <div
                      key={i}
                      className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm md:shadow-none md:border-0 md:rounded-none md:p-0 md:grid md:grid-cols-12 md:gap-4 md:px-4 md:py-4 text-sm hover:bg-zinc-50/80 transition-colors group items-start"
                    >
                      {/* URL */}
                      <div className="md:col-span-3 flex flex-col gap-1.5 mb-3 md:mb-0">
                        <div className="flex items-center gap-1.5">
                          <LinkIcon className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="text-xs font-bold text-zinc-700 md:font-medium">Source URL</span>
                          <CopyButton text={r.source_url} />
                        </div>
                        {/* 📌 핵심 수정: break-all 적용하여 줄바꿈 강제 */}
                        <a
                          href={r.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline break-all whitespace-normal leading-relaxed block"
                        >
                          {r.source_url}
                        </a>
                      </div>

                      {/* AI Title */}
                      <div className="md:col-span-3 flex flex-col gap-1.5 mb-3 md:mb-0">
                        <div className="flex items-center gap-1.5">
                          <Type className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="text-xs font-bold text-zinc-700 md:font-medium">AI Title</span>
                          <CopyButton text={r.ai_title || ""} />
                        </div>
                        <div className="text-xs text-zinc-800 break-words whitespace-pre-wrap leading-relaxed">
                          {r.ai_title || "-"}
                        </div>
                      </div>

                      {/* Editor Content */}
                      <div className="md:col-span-4 flex flex-col gap-1.5 mb-3 md:mb-0">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5 text-zinc-400" />
                          <span className="text-xs font-bold text-zinc-700 md:font-medium">Editor Content</span>
                          <CopyButton text={r.ai_editor || ""} />
                        </div>
                        <div className="text-xs text-zinc-700 break-words whitespace-pre-wrap leading-relaxed line-clamp-3 md:line-clamp-6 group-hover:line-clamp-none transition-all">
                          {r.ai_editor || "-"}
                        </div>
                      </div>

                      {/* Date */}
                      <div className="md:col-span-2 md:text-right flex flex-row md:flex-col justify-between md:justify-start items-center md:items-end gap-1 border-t border-zinc-100 pt-3 md:pt-0 md:border-0 mt-2 md:mt-0">
                        <div className="text-xs font-medium text-zinc-800">{fmtDate(r.created_at)}</div>
                        <div className="text-[10px] text-zinc-400">만료: {fmtDate(r.expires_at)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* PC 버전 헤더 */}
              <div className="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-zinc-800 text-zinc-100 text-xs font-medium rounded-t-lg">
                <div className="col-span-3">기능</div>
                <div className="col-span-5">URL</div>
                <div className="col-span-2">Cost</div>
                <div className="col-span-2 text-right">날짜</div>
              </div>

              {loading ? (
                <div className="p-8 text-center text-sm text-zinc-400">데이터를 불러오는 중입니다...</div>
              ) : usage.length === 0 ? (
                <div className="p-8 text-center text-sm text-zinc-400">차감 내역이 없습니다.</div>
              ) : (
                <div className="space-y-3 md:space-y-0 md:bg-white md:border md:border-zinc-200 md:rounded-b-lg md:divide-y md:divide-zinc-100">
                  {usage.map((r, i) => (
                    <div
                      key={i}
                      className="bg-white p-4 rounded-lg border border-zinc-200 shadow-sm md:shadow-none md:border-0 md:rounded-none md:p-0 md:grid md:grid-cols-12 md:gap-4 md:px-4 md:py-4 text-sm hover:bg-zinc-50/80 transition-colors group items-start"
                    >
                      {/* 기능 */}
                      <div className="md:col-span-3 flex items-center justify-between md:block mb-2 md:mb-0">
                         <span className="text-xs font-bold text-zinc-800 break-words bg-zinc-100 px-2 py-1 rounded md:bg-transparent md:px-0 md:py-0">
                           {r.feature}
                         </span>
                         {/* 모바일에서만 보이는 날짜 */}
                         <span className="md:hidden text-xs text-zinc-400">{fmtDate(r.created_at)}</span>
                      </div>

                      {/* URL - 📌 핵심 수정: 줄바꿈 강제 및 카드 안쪽 여백 확보 */}
                      <div className="md:col-span-5 flex flex-col gap-1 mb-3 md:mb-0 bg-zinc-50 p-2 rounded md:bg-transparent md:p-0">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-400 md:hidden font-bold">TARGET URL</span>
                            <CopyButton text={r.source_url || ""} label="URL 복사" />
                        </div>
                        <div className="text-xs text-blue-600 break-all whitespace-normal leading-relaxed">
                            {r.source_url || "-"}
                        </div>
                      </div>

                      {/* Cost */}
                      <div className="md:col-span-2 flex items-center justify-between md:justify-start gap-2 mb-1 md:mb-0">
                        <span className="md:hidden text-xs text-zinc-500 font-bold">차감 크레딧:</span>
                        <div className="text-xs font-mono font-bold text-red-600 bg-red-50 px-2 py-1 rounded md:bg-transparent md:px-0 md:text-zinc-900 md:font-normal">
                           -{typeof r.cost === "number" ? fmtCreditsCostToDisplay(r.cost) : r.cost}
                        </div>
                      </div>

                      {/* Date (PC Only) */}
                      <div className="hidden md:block md:col-span-2 text-right text-xs text-zinc-700">
                        {fmtDate(r.created_at)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
