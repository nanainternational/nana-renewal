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
import { Menu, X, User, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useLocation } from "wouter";
import logoImage from "@assets/nana_logo.png";

export default function Navigation() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();

  // ✅ AuthContext의 loading이 어떤 이유로든 영구 true로 고정되면(요청 미발생/에러 누락 등)
  //    로그인 버튼이 영원히 스켈레톤으로 가려집니다.
  //    1.8초 후에도 user가 없고 loading이면 강제로 로그인 버튼을 보여주도록 fallback 처리합니다.
  const [loadingFallback, setLoadingFallback] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setLoadingFallback(false), 1800);
    return () => clearTimeout(t);
  }, []);

  const effectiveLoading = loading && loadingFallback;

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="flex items-center justify-between h-16 md:h-20">
          <a
            href="/"
            className="flex items-center gap-3 hover-elevate px-2 py-1 rounded-md -ml-2"
          >
            <img
              src={logoImage}
              alt="나나인터내셔널 로고"
              className="h-10 w-10 md:h-12 md:w-12"
            />
            <span className="text-xl md:text-2xl font-bold text-primary"></span>
          </a>

          <div className="hidden md:flex items-center gap-6">
            <a
              href="/education"
              className="text-sm font-medium hover-elevate px-3 py-2 rounded-md"
              data-testid="link-education"
            >
              교육
            </a>
            <a
              href="/china-purchase"
              className="text-sm font-medium hover-elevate px-3 py-2 rounded-md"
              data-testid="link-china-purchase"
            >
              중국사입
            </a>
            <a
              href="/startup-center"
              className="text-sm font-medium hover-elevate px-3 py-2 rounded-md"
              data-testid="link-startup-center"
            >
              창업센터
            </a>
            <a
              href="/logistics"
              className="text-sm font-medium hover-elevate px-3 py-2 rounded-md"
              data-testid="link-logistics"
            >
              3PL
            </a>
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
              href="#contact"
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2" data-testid="button-user-menu">
                    <Avatar className="w-7 h-7">
                      <AvatarImage src={user.profileImage} alt={user.name} />
                      <AvatarFallback className="text-xs">
                        {user.name?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:inline">{user.name}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href="/mypage" className="flex items-center gap-2 cursor-pointer" data-testid="link-mypage">
                      <User className="w-4 h-4" />
                      마이페이지
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2 cursor-pointer" data-testid="button-nav-logout">
                    <LogOut className="w-4 h-4" />
                    로그아웃
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
            <div className="flex flex-col gap-4">
              <a
                href="/education"
                className="text-sm font-medium py-2"
                data-testid="link-mobile-education"
              >
                교육
              </a>
              <a
                href="/china-purchase"
                className="text-sm font-medium py-2"
                data-testid="link-mobile-china-purchase"
              >
                중국사입
              </a>
              <a
                href="/startup-center"
                className="text-sm font-medium py-2"
                data-testid="link-mobile-startup-center"
              >
                창업센터
              </a>
              <a
                href="/logistics"
                className="text-sm font-medium py-2"
                data-testid="link-mobile-logistics"
              >
                3PL
              </a>
              <div className="flex flex-col gap-2">
                <Link
                  href="/ai-detail/1688"
                  className="text-sm font-medium py-2"
                  data-testid="link-mobile-ai-detail"
                >
                  AI 상세페이지
                </Link>
                <div className="pl-3 flex flex-col gap-2 border-l">
                  <Link
                    href="/ai-detail/vvic"
                    className="text-sm py-1 opacity-90"
                    data-testid="link-mobile-ai-detail-vvic"
                  >
                    - VVIC
                  </Link>
                  <Link
                    href="/ai-detail/1688"
                    className="text-sm py-1 opacity-90"
                    data-testid="link-mobile-ai-detail-1688"
                  >
                    - 1688
                  </Link>
                </div>
              </div>
              <a
                href="#contact"
                className="text-sm font-medium py-2"
                data-testid="link-mobile-contact"
              >
                문의
              </a>
              {effectiveLoading ? (
                <div className="w-full h-9 bg-muted animate-pulse rounded-md" />
              ) : user ? (
                <>
                  <Link
                    href="/mypage"
                    className="text-sm font-medium py-2 flex items-center gap-2"
                    data-testid="link-mobile-mypage"
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
    </nav>
  );
}
