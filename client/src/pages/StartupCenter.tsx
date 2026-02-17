"use client";

import Navigation from "@/components/Navigation";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Camera,
  Package,
  MapPin,
  Users,
  Wifi,
  Coffee,
  Clock,
  MessageCircle,
  Check,
  ArrowRight,
} from "lucide-react";

import basicImage from "@assets/generated_images/Basic_tier_facility_cf68a9cc.png";
import standardImage from "@assets/generated_images/Standard_tier_facility_de876649.png";
import premiumImage from "@assets/generated_images/Premium_tier_facility_fc0c557f.png";
import heroVideo from "@assets/kling_20251209_Text_to_Video____________4422_0_1765272109865.mp4";

const features = [
  {
    icon: Building2,
    title: "개인 사무실 공간",
    description: "쾌적한 개인 작업 공간 제공",
  },
  {
    icon: Package,
    title: "택배 적재 공간",
    description: "넉넉한 재고 보관 공간",
  },
  {
    icon: Camera,
    title: "제품 촬영 스튜디오",
    description: "전문 촬영 공간 및 카메라 대여",
  },
  {
    icon: MapPin,
    title: "편리한 위치",
    description: "부천역 도보 10분, 대중교통 편리",
  },
];

const benefits = [
  "개인 사무실 공간 제공 (책상, 의자, 사물함)",
  "택배 적재 공간 (쿠팡, 네이버, 11번가 등)",
  "제품 촬영 공간 및 카메라 대여",
  "무료 Wi-Fi 및 프린터 사용",
  "무료 간식 제공 (커피, 음료, 과자)",
  "부천역 도보 10분 거리",
  "24시간 출입 가능",
  "주차 공간 제공",
];

const pricingTiers = [
  {
    name: "Basic",
    subtitle: "창고 서비스",
    image: basicImage,
    budget: "20,000원~",
    facility: "지하창고에 마련된 랙 사용",
    products: "1개월마다 갱신",
    service: "보관 서비스",
    delivery: "무료",
  },
  {
    name: "Standard",
    subtitle: "임대 서비스",
    image: standardImage,
    budget: "190,000원~",
    facility: "1~2인실",
    products: "1개월마다 갱신",
    service: "임대 서비스",
    delivery: "무료",
    featured: true,
  },
  {
    name: "Premium",
    subtitle: "임대 서비스",
    image: premiumImage,
    budget: "550,000원~",
    facility: "3~4인실",
    products: "1개월마다 갱신",
    service: "임대 서비스",
    delivery: "무료",
  },
];

export default function StartupCenter() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section (영상 + 일할 맛 나는 사무실을 만듭니다) */}
      <section className="pt-[88px] pb-20 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
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
                일할 맛 나는
                <br />
                사무실을 만듭니다
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
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              왜 나나인터내셔널 <span className="text-primary">창업센터</span>
              인가요?
            </h2>
            <p className="text-xl text-gray-600">
              온라인 쇼핑몰 창업에 최적화된 공간과 시스템
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="p-8 hover:shadow-2xl transition-all duration-300 border-2 hover:border-primary/50"
                >
                  <div className="flex flex-col items-center text-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="text-xl font-bold">{feature.title}</h3>
                    <p className="text-gray-600">{feature.description}</p>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Detailed Benefits */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                창업자를 위한
                <br />
                <span className="text-primary">완벽한 환경</span>
              </h2>
              <p className="text-xl text-gray-600 mb-8 leading-relaxed">
                나나인터내셔널 창업센터는 온라인 쇼핑몰 창업자들이 비즈니스에만
                집중할 수 있도록 필요한 모든 인프라를 제공합니다.
              </p>
              <div className="space-y-4">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-lg text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/20 to-purple-500/20 p-8">
                <div className="w-full h-full rounded-2xl bg-white shadow-2xl flex items-center justify-center">
                  <div className="text-center p-8">
                    <Building2 className="w-24 h-24 text-primary mx-auto mb-4" />
                    <h3 className="text-2xl font-bold mb-2">부천 남부점</h3>
                    <p className="text-gray-600">
                      경기도 부천시 경인로 137번가길 83
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section - 스낵 서비스 이용 가격 */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              이용 가격
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              부담 없는 나나인터내셔널 이용 가격
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingTiers.map((tier, index) => (
              <Card
                key={index}
                className="p-8 hover-elevate active-elevate-2 transition-all"
                data-testid={`card-pricing-${tier.name.toLowerCase()}`}
              >
                {tier.featured && (
                  <Badge className="mb-4" data-testid="badge-popular">
                    인기
                  </Badge>
                )}

                <h3 className="text-2xl font-bold mb-2">{tier.name}</h3>
                <p className="text-sm text-muted-foreground mb-6">
                  {tier.subtitle}
                </p>

                <div className="rounded-lg overflow-hidden mb-6">
                  <img
                    src={tier.image}
                    alt={tier.name}
                    className="w-full h-48 object-cover"
                  />
                </div>

                <div className="space-y-4 mb-8">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      예산(월)
                    </p>
                    <p className="text-lg font-semibold">{tier.budget}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      대여
                    </p>
                    <p className="text-sm">{tier.facility}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      사용기간
                    </p>
                    <p className="text-sm">{tier.products}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      유형
                    </p>
                    <p className="text-sm">{tier.service}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      관리비
                    </p>
                    <p className="text-sm">{tier.delivery}</p>
                  </div>
                </div>

                <Button
                  className="w-full"
                  variant={tier.featured ? "default" : "outline"}
                  data-testid={`button-quote-${tier.name.toLowerCase()}`}
                >
                  빠른 견적 받아보기
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Facilities Highlight */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              충분한 <span className="text-primary">시설과 공간</span>
            </h2>
            <p className="text-xl text-gray-600">
              창업자의 성장을 돕는 최적의 작업 환경
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="p-8 hover:shadow-xl transition-all">
              <Wifi className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-2xl font-bold mb-3">빠른 인터넷</h3>
              <p className="text-gray-600 text-lg">
                100Mbps 이상의 빠른 인터넷으로 업무 효율성을 극대화하세요.
              </p>
            </Card>
            <Card className="p-8 hover:shadow-xl transition-all">
              <Coffee className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-2xl font-bold mb-3">무료 간식</h3>
              <p className="text-gray-600 text-lg">
                커피, 음료, 과자 등 다양한 간식을 무료로 제공합니다.
              </p>
            </Card>
            <Card className="p-8 hover:shadow-xl transition-all">
              <Clock className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-2xl font-bold mb-3">24시간 이용</h3>
              <p className="text-gray-600 text-lg">
                언제든지 자유롭게 사무실을 이용할 수 있습니다.
              </p>
            </Card>
            <Card className="p-8 hover:shadow-xl transition-all">
              <Users className="w-12 h-12 text-primary mb-4" />
              <h3 className="text-2xl font-bold mb-3">네트워킹</h3>
              <p className="text-gray-600 text-lg">
                같은 길을 걷는 창업자들과 함께 성장하세요.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-purple-600">
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center text-white">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            지금 바로 시작하세요
          </h2>
          <p className="text-xl mb-8 opacity-90">
            나나인터내셔널 창업센터에서 여러분의 꿈을 현실로 만들어보세요
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-6">
              <MessageCircle className="w-5 h-5 mr-2" />
              상담 신청하기
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white border-white"
            >
              자세히 알아보기
            </Button>
          </div>
        </div>
      </section>

      <ContactForm />
      <Footer />
      <ScrollToTop />
    </div>
  );
}
