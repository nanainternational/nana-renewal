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

  const balanceText = useMemo(() => {
    if (typeof balanceWon !== "number") return "-";
    return `${fmtCreditsWonToDisplay(balanceWon)}`;
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
      <DialogContent className="max-w-4xl p-0 gap-0 overflow-hidden bg-white border-zinc-200">
        
        {/* 1. 다크 스타일 헤더 */}
        <DialogHeader className="p-6 bg-zinc-900 text-white flex-row items-center justify-between space-y-0 border-b border-zinc-800">
          <div className="flex flex-col gap-1">
            <DialogTitle className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              Credit Wallet
            </DialogTitle>
            <p className="text-xs text-zinc-400 font-light">
              AI 상세페이지 생성 내역 및 크레딧 차감 내역을 확인합니다.
            </p>
          </div>
          
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider mb-0.5">Balance</span>
            <div className="flex items-center gap-2 bg-zinc-800 px-3 py-1.5 rounded-full border border-zinc-700">
              <div className="w-4 h-4 rounded-full border border-white/30 flex items-center justify-center">
                 <span className="text-[9px] font-bold text-white">C</span>
              </div>
              <span className="text-lg font-bold font-mono text-white tracking-wide">
                {balanceText}
              </span>
            </div>
          </div>
        </DialogHeader>

        {/* 2. 컨트롤 바 (탭 & 새로고침) */}
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

        {/* 3. 컨텐츠 영역 */}
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

              {/* 리스트 */}
              <div className="max-h-[400px] overflow-auto divide-y divide-zinc-100">
                {loading ? (
                  <div className="p-8 text-center text-sm text-zinc-400">데이터를 불러오는 중입니다...</div>
                ) : history.length === 0 ? (
                  <div className="p-8 text-center text-sm text-zinc-400">작업 내역이 없습니다.</div>
                ) : (
                  history.map((r, i) => (
                    <div key={i} className="grid grid-cols-12 gap-4 px-4 py-4 text-sm hover:bg-zinc-50/80 transition-colors group">
                      
                      {/* URL 컬럼 */}
                      <div className="col-span-3 flex flex-col gap-1.5">
                        <div className="flex items-center gap-1.5 text-zinc-500 text-xs uppercase tracking-wider font-bold">
                          <LinkIcon className="w-3 h-3" /> Source
                        </div>
                        <div className="truncate text-zinc-900 font-medium text-xs leading-relaxed mb-1" title={r.source_url}>
                          {r.source_url}
                        </div>
                        <div className="flex">
                           <CopyButton text={r.source_url} label="URL 복사" />
                        </div>
                      </div>

                      {/* 상품명 컬럼 */}
                      <div className="col-span-3 flex flex-col gap-1.5 border-l border-zinc-100 pl-4">
                        <div className="flex items-center gap-1.5 text-zinc-500 text-xs uppercase tracking-wider font-bold">
                          <Type className="w-3 h-3" /> Product Name
                        </div>
                        <div className="truncate text-zinc-900 font-medium text-xs mb-1" title={r.ai_title || ""}>
                          {r.ai_title || <span className="text-zinc-300 italic">No Title</span>}
                        </div>
                        <div className="flex">
                           <CopyButton text={r.ai_title} label="상품명 복사" />
                        </div>
                      </div>

                      {/* 에디터 내용 컬럼 */}
                      <div className="col-span-4 flex flex-col gap-1.5 border-l border-zinc-100 pl-4">
                        <div className="flex items-center gap-1.5 text-zinc-500 text-xs uppercase tracking-wider font-bold">
                          <FileText className="w-3 h-3" /> Editor Content
                        </div>
                        <div className="text-zinc-600 text-xs line-clamp-1 mb-1 font-mono bg-zinc-50 px-1.5 py-0.5 rounded border border-zinc-100">
                           {r.ai_editor ? "<html>...</html>" : <span className="text-zinc-300 italic">Empty</span>}
                        </div>
                        <div className="flex">
                           <CopyButton text={r.ai_editor} label="HTML 전체 복사" />
                        </div>
                      </div>

                      {/* 날짜 컬럼 */}
                      <div className="col-span-2 text-right flex flex-col justify-center text-xs text-zinc-400 border-l border-zinc-100 pl-4">
                        <div className="flex flex-col gap-1">
                          <span><span className="text-zinc-300 mr-1">생성:</span> {fmtDate(r.created_at)}</span>
                          <span><span className="text-zinc-300 mr-1">만료:</span> {fmtDate(r.expires_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden shadow-sm">
               {/* 차감내역 헤더 */}
              <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-zinc-900 text-zinc-100 text-xs font-medium">
                <div className="col-span-3">기능 (Feature)</div>
                <div className="col-span-3 text-right pr-4">차감 포인트</div>
                <div className="col-span-4">관련 URL</div>
                <div className="col-span-2 text-right">시간</div>
              </div>

              {/* 차감내역 리스트 */}
              <div className="max-h-[400px] overflow-auto divide-y divide-zinc-100">
                {loading ? (
                  <div className="p-8 text-center text-sm text-zinc-400">데이터를 불러오는 중입니다...</div>
                ) : usage.length === 0 ? (
                  <div className="p-8 text-center text-sm text-zinc-400">차감 내역이 없습니다.</div>
                ) : (
                  usage.map((r, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 px-4 py-3 text-sm hover:bg-zinc-50 transition-colors">
                      <div className="col-span-3 font-medium text-zinc-800 flex items-center">{r.feature}</div>
                      <div className="col-span-3 text-right pr-4 font-mono font-bold text-red-600">
                        -{Number(r.cost || 0).toLocaleString()}
                      </div>
                      <div className="col-span-4 flex items-center">
                        <div className="truncate text-xs text-zinc-500 w-full bg-zinc-50 px-2 py-1 rounded" title={r.source_url || ""}>
                          {r.source_url || "-"}
                        </div>
                      </div>
                      <div className="col-span-2 text-xs text-zinc-400 text-right flex items-center justify-end">
                        {fmtDate(r.created_at)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-2 text-[11px] text-zinc-400 bg-zinc-100 px-3 py-2 rounded border border-zinc-200">
            <AlertCircleIcon className="w-3.5 h-3.5" />
            <span>작업내역(AI 결과물)은 서버 부하 관리를 위해 30일 보관 후 자동 삭제됩니다. 중요한 데이터는 미리 복사하여 저장해주세요.</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// 아이콘 헬퍼
function AlertCircleIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}
