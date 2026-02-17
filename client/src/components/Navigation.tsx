import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
// ✅ Coins 삭제 (더 이상 안 씀)
import { Menu, X, User, LogOut, ChevronDown, ShoppingCart, History } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "wouter";
import logoImage from "@assets/nana_logo.png";
import CreditWalletDialog from "@/components/CreditWalletDialog";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileAiOpen, setMobileAiOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const [location, setLocation] = useLocation();

  const [cartCount, setCartCount] = useState(0);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [walletOpen, setWalletOpen] = useState(false);

  const [loadingFallback, setLoadingFallback] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoadingFallback(false), 1800);
    return () => clearTimeout(t);
  }, []);

  const effectiveLoading = loading && loadingFallback;

  const loadWalletBalance = async () => {
    if (!user) {
      setCreditBalance(null);
      return;
    }
    try {
      const res = await fetch("/api/wallet", { credentials: "include" });
      const data = await res.json();
      const bal = typeof data?.balance === "number" ? data.balance : null;
      setCreditBalance(bal);
    } catch {
      setCreditBalance(null);
    }
  };

  const loadCartCount = async () => {
    if (!user) {
      setCartCount(0);
      return;
    }
    try {
      const res = await fetch("/api/cart", { credentials: "include" });
      const data = await res.json();
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data?.rows) ? data.rows : [];
      setCartCount(items.length);
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    loadCartCount();
    loadWalletBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, location]);

  useEffect(() => {
    const onRefresh = () => {
      loadCartCount();
      loadWalletBalance();
    };
    window.addEventListener("wallet:refresh", onRefresh);
    return () => window.removeEventListener("wallet:refresh", onRefresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) setMobileAiOpen(false);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <Link
            href="/"
            className="flex items-center gap-3 hover-elevate px-2 py-1 rounded-md -ml-2"
          >
            <img
              src={logoImage}
              alt="나나인터내셔널 로고"
              className="h-10 w-10 md:h-12 md:w-12"
            />
            <span className="text-xl md:text-2xl font-bold text-primary"></span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/education"
              className="text-sm font-medium hover-elevate px-3 py-2 rounded-md"
              data-testid="link-education"
            >
              교육
            </Link>
            <Link
              href="/china-purchase"
              className="text-sm font-medium hover-elevate px-3 py-2 rounded-md"
              data-testid="link-china-purchase"
            >
              중국사입
            </Link>
            <Link
              href="/startup-center"
              className="text-sm font-medium hover-elevate px-3 py-2 rounded-md"
              data-testid="link-startup-center"
            >
              창업센터
            </Link>
            <Link
              href="/logistics"
              className="text-sm font-medium hover-elevate px-3 py-2 rounded-md"
              data-testid="link-logistics"
            >
              3PL
            </Link>
            <Link
              href="/extension"
              className="text-sm font-medium hover-elevate px-3 py-2 rounded-md"
              data-testid="link-extension"
            >
              확장프로그램
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  className="text-sm font-medium hover-elevate px-3 py-2 rounded-md inline-flex items-center gap-1"
                  data-testid="link-ai-detail"
                  type="button"
                >
                  AI 상세페이지
                  <ChevronDown className="h-4 w-4 opacity-70" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                <DropdownMenuItem asChild>
                  <Link href="/ai-detail/vvic" className="cursor-pointer" data-testid="link-ai-detail-vvic">
                    VVIC
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/ai-detail/1688" className="cursor-pointer" data-testid="link-ai-detail-1688">
                    1688
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <a
              href="/#contact"
              className="text-sm font-medium hover-elevate px-3 py-2 rounded-md"
              data-testid="link-contact"
            >
              문의
            </a>
          </div>

          <div className="hidden md:flex items-center gap-4">
            {effectiveLoading ? (
              <div className="w-24 h-9 bg-muted animate-pulse rounded-md" />
            ) : user ? (
              <div className="flex items-center gap-3">
                
                {/* ✅ 커스텀 C 코인 아이콘 적용 */}
                {typeof creditBalance === "number" && (
                  <button
                    type="button"
                    onClick={() => setWalletOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1 bg-white border border-black rounded-full shadow-sm hover:bg-gray-50 transition-colors cursor-pointer hover-elevate"
                    title="크레딧 내역 보기"
                    aria-label="크레딧 내역 보기"
                    data-testid="credit-balance"
                  >
                    {/* 원형 안에 C 텍스트를 넣어서 직접 만듦 */}
                    <div className="w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center shrink-0">
                      <span className="text-[9px] font-bold text-black leading-none pb-[1px]">C</span>
                    </div>
                    
                    <span className="text-sm font-bold text-black tabular-nums">
                      {(Math.floor(creditBalance / 10)).toLocaleString()}
                    </span>
                  </button>
                )}

                <Link
                  href="/cart"
                  className="relative hover-elevate px-2 py-2 rounded-md"
                  aria-label="장바구니"
                  title="장바구니"
                  data-testid="link-cart"
                >
                  <ShoppingCart className="h-5 w-5" />
                  {cartCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[11px] leading-[18px] text-white bg-red-500 rounded-full text-center"
                      aria-label={`장바구니 담긴 수량 ${cartCount}개`}
                    >
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="gap-2 pl-2" data-testid="button-user-menu">
                      <Avatar className="w-8 h-8 border border-border">
                        <AvatarImage src={user.profileImage} alt={user.name} />
                        <AvatarFallback className="text-xs bg-muted">
                          {user.name?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden lg:inline text-sm font-medium">{user.name}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link href="/mypage" className="flex items-center gap-2 cursor-pointer" data-testid="link-mypage">
                        <User className="w-4 h-4" />
                        마이페이지
                      </Link>
                    </DropdownMenuItem>
<DropdownMenuItem
  onClick={() => setWalletOpen(true)}
  className="flex items-center gap-2 cursor-pointer"
  data-testid="link-credit-history"
>
  <History className="w-4 h-4" />
  크레딧 내역
</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer text-red-600 focus:text-red-600" data-testid="button-nav-logout">
                      <LogOut className="w-4 h-4" />
                      로그아웃
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <Button
                variant="default"
                size="default"
                asChild
                data-testid="button-login"
              >
                <Link href="/login">로그인</Link>
              </Button>
            )}
          </div>

          {user && (
            <Link
              href="/cart"
              className="md:hidden relative p-2 rounded-full hover:bg-muted transition"
              data-testid="link-cart-mobile"
              aria-label="장바구니"
              onClick={() => setMobileMenuOpen(false)}
            >
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </Link>
          )}

          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            data-testid="button-mobile-menu"
          >
            {mobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t">
            <div className="flex flex-col gap-1">
              <Link
                href="/education"
                className="text-sm font-medium py-3 px-1 rounded-md"
                data-testid="link-mobile-education"
                onClick={() => setMobileMenuOpen(false)}
              >
                교육
              </Link>
              <Link
                href="/china-purchase"
                className="text-sm font-medium py-3 px-1 rounded-md"
                data-testid="link-mobile-china-purchase"
                onClick={() => setMobileMenuOpen(false)}
              >
                중국사입
              </Link>
              <Link
                href="/startup-center"
                className="text-sm font-medium py-3 px-1 rounded-md"
                data-testid="link-mobile-startup-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                창업센터
              </Link>
              <Link
                href="/logistics"
                className="text-sm font-medium py-3 px-1 rounded-md"
                data-testid="link-mobile-logistics"
                onClick={() => setMobileMenuOpen(false)}
              >
                3PL
              </Link>
              <Link
                href="/extension"
                className="text-sm font-medium py-3 px-1 rounded-md"
                data-testid="link-mobile-extension"
                onClick={() => setMobileMenuOpen(false)}
              >
                확장프로그램
              </Link>
              <div className="rounded-lg border border-border/70 bg-muted/20">
                <button
                  type="button"
                  className="w-full px-2 py-3 flex items-center justify-between text-sm font-medium"
                  onClick={() => setMobileAiOpen((prev) => !prev)}
                  aria-expanded={mobileAiOpen}
                  data-testid="button-mobile-ai-detail-toggle"
                >
                  <span>AI 상세페이지</span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${mobileAiOpen ? "rotate-180" : ""}`} />
                </button>
                {mobileAiOpen && (
                  <div className="px-2 pb-2">
                    <div className="pl-3 border-l border-border/80 flex flex-col gap-1">
                      <Link
                        href="/ai-detail/vvic"
                        className="text-sm py-2 opacity-90"
                        data-testid="link-mobile-ai-detail-vvic"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        VVIC
                      </Link>
                      <Link
                        href="/ai-detail/1688"
                        className="text-sm py-2 opacity-90"
                        data-testid="link-mobile-ai-detail-1688"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        1688
                      </Link>
                    </div>
                  </div>
                )}
              </div>
              <a
                href="/#contact"
                className="text-sm font-medium py-3 px-1 rounded-md"
                data-testid="link-mobile-contact"
                onClick={() => setMobileMenuOpen(false)}
              >
                문의
              </a>
              {effectiveLoading ? (
                <div className="w-full h-9 bg-muted animate-pulse rounded-md" />
              ) : user ? (
                <>
                  <Link
                    href="/cart"
                    className="text-sm font-medium py-2 flex items-center justify-between"
                    data-testid="link-mobile-cart"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      장바구니
                    </span>
                    {cartCount > 0 && (
                      <span className="min-w-[22px] h-[18px] px-1 text-[11px] leading-[18px] text-white bg-red-500 rounded-full text-center">
                        {cartCount > 99 ? "99+" : cartCount}
                      </span>
                    )}
                  </Link>
                  
                  {/* 모바일 - 커스텀 C 코인 아이콘 적용 */}
                  {typeof creditBalance === "number" && (
                    <button
                      type="button"
                      onClick={() => { setWalletOpen(true); setMobileMenuOpen(false); }}
                      className="flex items-center gap-2 py-2 w-full text-left hover:bg-muted/40 rounded-md px-1"
                      aria-label="크레딧 내역 보기"
                      title="크레딧 내역 보기"
                      data-testid="link-mobile-credit-history"
                    >
                       <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-black rounded-full">
                        <div className="w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center shrink-0">
                          <span className="text-[9px] font-bold text-black leading-none pb-[1px]">C</span>
                        </div>
                        <span className="text-sm font-bold text-black tabular-nums">
                          {(Math.floor(creditBalance / 10)).toLocaleString()}
                        </span>
                      </div>
                      <span className="text-sm opacity-80">크레딧 내역</span>
                    </button>
                  )}

                  <Link
                    href="/mypage"
                    className="text-sm font-medium py-2 flex items-center gap-2"
                    data-testid="link-mobile-mypage"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Avatar className="w-6 h-6">
                      <AvatarImage src={user.profileImage} alt={user.name} />
                      <AvatarFallback className="text-xs">{user.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    마이페이지
                  </Link>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleLogout}
                    data-testid="button-mobile-logout"
                  >
                    로그아웃
                  </Button>
                </>
              ) : (
                <Button
                  variant="default"
                  className="w-full"
                  asChild
                  data-testid="button-mobile-login"
                >
                  <Link href="/login">로그인</Link>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
      <CreditWalletDialog
        open={walletOpen}
        onOpenChange={setWalletOpen}
        balanceWon={creditBalance}
        onRefreshBalance={loadWalletBalance}
      />
    </nav>
  );
}
