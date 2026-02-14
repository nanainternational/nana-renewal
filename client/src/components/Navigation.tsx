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
import { Menu, X, User, LogOut, ShoppingCart } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "wouter";
import logoImage from "@assets/nana_logo.png";
import CreditWalletDialog from "@/components/CreditWalletDialog";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const [location, setLocation] = useLocation();

  const [cartCount, setCartCount] = useState(0);
  const [creditBalance, setCreditBalance] = useState<number | null>(null);
  const [creditOpen, setCreditOpen] = useState(false);

  // ✅ AuthContext loading fallback
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

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  const CreditBadge = ({ onClick }: { onClick: () => void }) => (
    <button
      type="button"
      className="flex items-center gap-1.5 px-3 py-1 bg-white border border-black rounded-full shadow-sm hover:bg-gray-50 transition-colors cursor-pointer"
      title="보유 크레딧"
      aria-label="보유 크레딧"
      data-testid="credit-balance"
      onClick={onClick}
    >
      <div className="w-3.5 h-3.5 rounded-full border border-black flex items-center justify-center shrink-0">
        <span className="text-[9px] font-bold leading-none">C</span>
      </div>
      <span className="text-xs font-semibold">
        {typeof creditBalance === "number" ? Math.floor(creditBalance / 10).toLocaleString() : "0"}
      </span>
    </button>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <img src={logoImage} alt="NANA International" className="h-8 w-auto" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              href="/"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location === "/" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              홈
            </Link>
            <Link
              href="/china-purchase"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location === "/china-purchase" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              중국사입
            </Link>
            <Link
              href="/ai-detail/1688"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location === "/ai-detail/1688" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              AI상세페이지
            </Link>
            <Link
              href="/extension"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location === "/extension" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              확장프로그램
            </Link>
            <Link
              href="/contact"
              className={`text-sm font-medium transition-colors hover:text-primary ${
                location === "/contact" ? "text-primary" : "text-muted-foreground"
              }`}
            >
              문의
            </Link>
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            {user ? (
              <div className="flex items-center gap-2">
                {typeof creditBalance === "number" && <CreditBadge onClick={() => setCreditOpen(true)} />}

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
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.photoURL || ""} alt={user.displayName || ""} />
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <div className="flex flex-col space-y-1 p-2">
                      <p className="text-sm font-medium leading-none">{user.displayName}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setLocation("/mypage")}>
                      <User className="mr-2 h-4 w-4" />
                      <span>마이페이지</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>로그아웃</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {effectiveLoading ? (
                  <div className="h-9 w-24 rounded-md bg-muted animate-pulse" aria-label="loading login" />
                ) : (
                  <>
                    <Button variant="ghost" onClick={() => setLocation("/login")}>
                      로그인
                    </Button>
                    <Button onClick={() => setLocation("/signup")}>회원가입</Button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col space-y-2">
              <Link
                href="/"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"
                onClick={() => setMobileMenuOpen(false)}
              >
                홈
              </Link>
              <Link
                href="/china-purchase"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"
                onClick={() => setMobileMenuOpen(false)}
              >
                중국사입
              </Link>
              <Link
                href="/ai-detail/1688"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"
                onClick={() => setMobileMenuOpen(false)}
              >
                AI상세페이지
              </Link>
              <Link
                href="/extension"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"
                onClick={() => setMobileMenuOpen(false)}
              >
                확장프로그램
              </Link>
              <Link
                href="/contact"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-muted"
                onClick={() => setMobileMenuOpen(false)}
              >
                문의
              </Link>

              <div className="pt-2 border-t">
                {user ? (
                  <div className="space-y-2">
                    {/* ✅ 모바일: 크레딧 + 장바구니 줄 추가 */}
                    <div className="flex items-center justify-between px-3 py-2">
                      {typeof creditBalance === "number" ? (
                        <CreditBadge
                          onClick={() => {
                            setCreditOpen(true);
                            setMobileMenuOpen(false);
                          }}
                        />
                      ) : (
                        <div />
                      )}

                      <Link
                        href="/cart"
                        className="relative px-2 py-2 rounded-md hover:bg-muted"
                        aria-label="장바구니"
                        title="장바구니"
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <ShoppingCart className="h-5 w-5" />
                        {cartCount > 0 && (
                          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[11px] leading-[18px] text-white bg-red-500 rounded-full text-center">
                            {cartCount > 99 ? "99+" : cartCount}
                          </span>
                        )}
                      </Link>
                    </div>

                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        setLocation("/mypage");
                        setMobileMenuOpen(false);
                      }}
                    >
                      <User className="mr-2 h-4 w-4" />
                      마이페이지
                    </Button>

                    <Button
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={async () => {
                        await handleLogout();
                        setMobileMenuOpen(false);
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      로그아웃
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {effectiveLoading ? (
                      <div className="h-9 w-full rounded-md bg-muted animate-pulse" aria-label="loading login" />
                    ) : (
                      <>
                        <Button
                          variant="ghost"
                          className="w-full"
                          onClick={() => {
                            setLocation("/login");
                            setMobileMenuOpen(false);
                          }}
                        >
                          로그인
                        </Button>
                        <Button
                          className="w-full"
                          onClick={() => {
                            setLocation("/signup");
                            setMobileMenuOpen(false);
                          }}
                        >
                          회원가입
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <CreditWalletDialog
        open={creditOpen}
        onOpenChange={setCreditOpen}
        balanceWon={creditBalance}
        onRefreshBalance={loadWalletBalance}
      />
    </nav>
  );
}
