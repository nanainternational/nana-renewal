
import { useState, useEffect } from "react";
import { ArrowUp, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener("scroll", toggleVisibility);

    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <>
      {isVisible && (
        <>
          <a
            href="http://pf.kakao.com/_xmXtTs/chat"
            target="_blank"
            rel="noreferrer"
            aria-label="카카오톡 문의"
            className="fixed right-8 bottom-24 z-[9999] w-12 h-12 rounded-full bg-[#FEE500] text-black shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center"
          >
            <MessageCircle className="w-5 h-5" />
          </a>

          <Button
            onClick={scrollToTop}
            className="w-12 h-12 rounded-full shadow-lg hover:shadow-xl transition-all"
            style={{
              position: "fixed",
              bottom: "2rem",
              right: "2rem",
              left: "auto",
              zIndex: 9999,
            }}
            size="icon"
            data-testid="button-scroll-to-top"
          >
            <ArrowUp className="w-5 h-5" />
          </Button>
        </>
      )}
    </>
  );
}
