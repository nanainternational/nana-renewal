
import Navigation from "@/components/Navigation";
import ChinaPurchaseSection from "@/components/ChinaPurchaseSection";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Card } from "@/components/ui/card";
import { Globe, TrendingUp, Package, Clock } from "lucide-react";

const advantages = [
  {
    icon: Globe,
    title: "현지 공장 직접 컨택",
    description: "중간 단계 없이 공장과 직접 거래"
  },
  {
    icon: Package,
    title: "대량·소량 모두 가능",
    description: "필요한 수량만큼 유연하게 사입"
  },
  {
    icon: Clock,
    title: "빠른 견적",
    description: "1~2일 내 정확한 견적 안내"
  },
  {
    icon: TrendingUp,
    title: "샘플 확인 서비스",
    description: "본 주문 전 샘플로 품질 확인"
  }
];

export default function ChinaPurchase() {
  return (
    <div className="min-h-screen">
      <Navigation />
      
      <section className="pt-32 pb-16 md:pb-24 bg-gradient-to-b from-primary/5 to-background">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
              중국사입 서비스
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              구매대행이 아닌 현지 공장 직접 컨택으로 최적의 가격과 품질을 제공합니다
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            {advantages.map((advantage, index) => {
              const Icon = advantage.icon;
              return (
                <Card key={index} className="p-6 hover-elevate">
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold">{advantage.title}</h3>
                    <p className="text-sm text-muted-foreground">{advantage.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <ChinaPurchaseSection />
      <ContactForm />
      <Footer />
      <ScrollToTop />
    </div>
  );
}
