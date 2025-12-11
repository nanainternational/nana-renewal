import { Building2, Package, GraduationCap, TrendingUp, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";

const services = [
  {
    icon: Building2,
    title: "창업센터",
    description: "개인 사무실 공간 및 택배 적재 공간 제공, 제품 촬영 공간 제공 및 카메라 대여 서비스",
    link: "/startup-center"
  },
  {
    icon: Globe,
    title: "중국사입",
    description: "현지 공장 직접 컨택, 대량·소량 사입, 샘플 확인 서비스, 1~2일 내 견적 안내",
    link: "/china-purchase"
  },
  {
    icon: GraduationCap,
    title: "쇼핑몰 교육",
    description: "맨투맨 1:1 맞춤형 교육, 쿠팡 제트배송 무료교육, 실전 경험을 가진 강사진",
    link: "/education"
  },
  {
    icon: Package,
    title: "3PL 물류",
    description: "건당 2,040원 메이저 택배회사 계약, 재고 관리, 주문 처리, 국내 최저가 배송 서비스",
    link: "/logistics"
  },
  {
    icon: TrendingUp,
    title: "유튜브 채널",
    description: "쇼핑몰 창업 노하우, 중국사입 팁, 성공 사례 공유, 실시간 교육 콘텐츠 제공",
    link: "#"
  },
];

export default function ServiceOverview() {
  return (
    <section className="py-20 md:py-28 bg-gray-50 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            OUR BUSINESS
          </h2>
          <p className="text-lg text-muted-foreground">
            나나인터내셔널이 제공하는 핵심 서비스
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <a
                key={index}
                href={service.link}
                className="block"
              >
                <Card
                  className="p-8 hover-elevate active-elevate-2 transition-transform cursor-pointer h-full"
                  data-testid={`card-service-${index}`}
                >
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Icon className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-xl md:text-2xl font-semibold">
                      {service.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {service.description}
                    </p>
                  </div>
                </Card>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}