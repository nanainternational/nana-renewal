import { useState, useEffect } from "react";
import { ArrowDown, ArrowUp, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ScrollToTop() {
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    const updateChatVisibility = () => setShowChat(window.scrollY > 300);
    updateChatVisibility();
    window.addEventListener("scroll", updateChatVisibility, { passive: true });
    return () => window.removeEventListener("scroll", updateChatVisibility);
  }, []);

  const scrollToEdge = (edge: "top" | "bottom") => {
    const page = document.scrollingElement || document.documentElement;
    window.scrollTo({
      top: edge === "top" ? 0 : page.scrollHeight,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  return (
    <div
      className="fixed bottom-4 right-4 z-[9999] flex flex-col items-center gap-3 sm:bottom-8 sm:right-8"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      role="group"
      aria-label="페이지 이동"
    >
      {showChat && (
        <a
          href="http://pf.kakao.com/_xmXtTs/chat"
          target="_blank"
          rel="noreferrer"
          aria-label="카카오톡 문의"
          title="카카오톡 문의"
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE500] text-black shadow-lg transition-all hover:scale-105 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        </a>
      )}
      <Button
        type="button"
        onClick={() => scrollToEdge("top")}
        className="h-12 w-12 rounded-full shadow-lg transition-all hover:shadow-xl"
        size="icon"
        aria-label="맨 위로 이동"
        title="맨 위로 이동"
        data-testid="button-scroll-to-top"
      >
        <ArrowUp className="h-5 w-5" aria-hidden="true" />
      </Button>
      <Button
        type="button"
        onClick={() => scrollToEdge("bottom")}
        className="h-12 w-12 rounded-full shadow-lg transition-all hover:shadow-xl"
        size="icon"
        aria-label="맨 아래로 이동"
        title="맨 아래로 이동"
        data-testid="button-scroll-to-bottom"
      >
        <ArrowDown className="h-5 w-5" aria-hidden="true" />
      </Button>
    </div>
  );
}
