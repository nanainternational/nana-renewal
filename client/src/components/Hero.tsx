import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowRight } from "lucide-react";
import heroVideo from "@assets/kling_20251209_Text_to_Video____________4422_0_1765272109865.mp4";

export default function Hero() {
  return (
    <section className="pt-20 pb-20 md:pb-28">
      <div className="relative min-h-[70vh] flex items-center justify-center bg-gray-900 rounded-3xl overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        >
          <source src={heroVideo} type="video/mp4" />
        </video>

        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/60 via-gray-900/40 to-gray-900/70" />

        <div className="relative z-10 text-center text-white px-6 max-w-4xl mx-auto py-20">
          <h2 className="text-lg md:text-xl font-semibold text-white/90 mb-4">
            우리가 꿈꾸던 창업센터
          </h2>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
            일할 맛 나는<br />사무실을 만듭니다
          </h1>

          <p className="text-lg md:text-xl mb-6 text-white/80">
            국내 NO.1 사무실 온라인쇼핑몰 창업 서비스
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <Button
              size="lg"
              variant="default"
              className="w-full sm:w-40"
              data-testid="button-quick-quote"
            >
              빠른 견적받기
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>

            <Button
              size="lg"
              className="w-full sm:w-40 bg-[#FEE500] text-black hover:bg-[#F7DA00]"
              data-testid="button-5sec-consult"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              5초 만에 상담받기
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
