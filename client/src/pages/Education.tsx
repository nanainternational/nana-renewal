import Navigation from "@/components/Navigation";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BarChart3,
  FileText,
  Target,
  Star,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ✅ 로컬 이미지 (client/src/assets/images 안에 있는 파일)
import profileLim from "@/assets/images/profile_lim.jpg";
import profileShin from "@/assets/images/profile_shin.jpg";

function CountUpAnimation({
  end,
  suffix = "",
}: {
  end: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000;
    const steps = 60;
    const increment = end / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= end) {
        setCount(end);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [isVisible, end]);

  return (
    <div ref={ref} className="text-3xl font-bold text-primary">
      {count.toLocaleString()}
      {suffix}
    </div>
  );
}

export default function Education() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section - 어두운 배경 */}
      <section className="pt-20 pb-20 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="relative min-h-[70vh] flex items-center justify-center bg-gray-900 rounded-3xl overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-30"
              style={{
                backgroundImage:
                  "url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&h=1080&fit=crop')",
              }}
            />
            <div className="relative z-10 text-center text-white px-6 max-w-4xl mx-auto py-20">
              <p
                className="text-lg md:text-xl mb-6 text-white/80"
                data-testid="text-hero-subtitle"
              >
                곧 현실이 됩니다는 성공이 현재,
              </p>
              <h1
                className="text-3xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight"
                data-testid="text-hero-title"
              >
                라이브클래스와 함께 돌아가세요
              </h1>
              <Button
                size="lg"
                className="mt-4"
                data-testid="button-hero-consult"
              >
                무료 상담 신청하기
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 컨설팅 소개 섹션 */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <img
                src="https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&h=400&fit=crop"
                alt="컨설팅 이미지"
                className="rounded-3xl shadow-lg w-full"
                data-testid="img-consulting"
              />
            </div>
            <div>
              <h2
                className="text-2xl md:text-4xl font-bold mb-6 leading-tight"
                data-testid="text-consulting-title"
              >
                지식 비즈니스의 성공비결을 배우는
                <br />
                <span className="text-primary">창업형 컨설팅</span>
              </h2>
              <p
                className="text-gray-600 text-lg leading-relaxed"
                data-testid="text-consulting-desc"
              >
                온라인 비즈니스 성공을 위한 체계적인 컨설팅과 맞춤형 교육을
                제공합니다. 검증된 노하우로 당신의 성공을 함께 만들어갑니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 라이브클래스와 함께 성공한 고객사 성공 사례 */}
      <section className="py-20 md:py-28 bg-gray-50 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-3xl md:text-5xl font-bold mb-4"
              data-testid="text-success-title"
            >
              라이브클래스와 함께 성공한
              <br />
              고객사 성공 사례
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* 최고수준 */}
            <Card
              className="bg-gray-900 text-white rounded-3xl overflow-hidden hover:shadow-xl transition-all"
              data-testid="card-success-0"
            >
              <div className="p-8 pb-0">
                <div className="mb-4 text-sm text-gray-400">
                  #인스타그램 #인플루언서 #커뮤니티
                </div>
                <h3 className="text-3xl font-bold mb-6">최고수준</h3>
                <div className="space-y-2 text-gray-300 mb-8">
                  <p>(주)하이스트 대표</p>
                  <p>9.9만 최고수준</p>
                  <p>4.4만 하이스트 운영자</p>
                  <p>2023년 연매출 4억 달성</p>
                </div>
              </div>
              <img
                src="https://images.unsplash.com/photo-1601288496920-b6154fe3626a?w=400&h=500&fit=crop&q=80"
                alt="최고수준"
                className="w-full h-80 object-cover object-top mix-blend-lighten rounded-b-3xl px-8 pb-8"
                data-testid="img-success-0"
              />
            </Card>

            {/* 브랜디액션 */}
            <Card
              className="bg-gray-900 text-white rounded-3xl overflow-hidden hover:shadow-xl transition-all"
              data-testid="card-success-1"
            >
              <div className="p-8 pb-0">
                <div className="mb-4 text-sm text-gray-400">
                  #파워링 #프로라이선성매출증대
                </div>
                <h3 className="text-3xl font-bold mb-6">브랜디액션</h3>
                <div className="space-y-2 text-gray-300 mb-8">
                  <p>(주)브랜디액션 대표</p>
                  <p>1000개 이상 실제 성과사례</p>
                  <p>시의 매출 성장 프로그램</p>
                  <p>대기업 마케팅 전문가</p>
                </div>
              </div>
              <img
                src="https://images.unsplash.com/photo-1621784563330-caee0b138a00?w=400&h=500&fit=crop&q=80"
                alt="브랜디액션"
                className="w-full h-80 object-cover object-top mix-blend-lighten rounded-b-3xl px-8 pb-8"
                data-testid="img-success-1"
              />
            </Card>

            {/* 곤팀장 */}
            <Card
              className="bg-gray-900 text-white rounded-3xl overflow-hidden hover:shadow-xl transition-all"
              data-testid="card-success-2"
            >
              <div className="p-8 pb-0">
                <div className="mb-4 text-sm text-gray-400">
                  #투자 #컨텐츠 #영매출 10억 돌파
                </div>
                <h3 className="text-3xl font-bold mb-6">곤팀장</h3>
                <div className="space-y-2 text-gray-300 mb-8">
                  <p>(주)네블스랩 대표</p>
                  <p>0.1% 탑급 강사 클래스 운영</p>
                  <p>누적수강 1만명 이상 강사</p>
                  <p>초고속 성장, 스위칭 배당 작가</p>
                </div>
              </div>
              <img
                src="https://images.unsplash.com/photo-1621784563330-caee0b138a00?w=400&h=500&fit=crop&q=80"
                alt="곤팀장"
                className="w-full h-80 object-cover object-top mix-blend-lighten rounded-b-3xl px-8 pb-8"
                data-testid="img-success-2"
              />
            </Card>
          </div>
        </div>
      </section>

      {/* 크리에이터 인터뷰 섹션 */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2
              className="text-2xl md:text-4xl font-bold mb-4"
              data-testid="text-interview-title"
            >
              성공한 크리에이터들의 경험
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                name: "크리에이터를 통한 콘텐츠 제작 후",
                quote: "초보 상태 1개월에서 광고주와 미팅을, 첫 달 결과까지",
                image: profileLim,
              },
              {
                name: "데이터 기반 분석",
                quote:
                  "체계적인 데이터 분석으로 성장 방향을 명확하게 잡을 수 있었습니다",
                image: profileShin,
              },
            ].map((item, idx) => (
              <Card
                key={idx}
                className="overflow-hidden rounded-3xl"
                data-testid={`card-interview-${idx}`}
              >
                <div className="grid md:grid-cols-2">
                  {/* ✅ 규격 고정: 모바일/PC 모두 사진이 "쏙" 들어가게 */}
                  <div className="aspect-[4/5] md:aspect-auto md:h-full bg-gray-100 overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover object-center"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-8 flex flex-col justify-center">
                    <h3 className="text-xl font-bold mb-4">{item.name}</h3>
                    <p className="text-gray-600">{item.quote}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* 서비스 프로세스 블록들 */}
      <section className="py-20 md:py-28 bg-gray-50 px-6">
        <div className="max-w-6xl mx-auto">
          {/* 블록 1: 데이터 기반 분석 */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
            <div className="order-2 md:order-1">
              <div className="bg-white rounded-3xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm text-gray-500">Analytics</span>
                </div>
                <div className="space-y-3">
                  <div className="h-3 bg-gray-100 rounded-full w-full" />
                  <div className="h-3 bg-primary/20 rounded-full w-3/4" />
                  <div className="h-3 bg-gray-100 rounded-full w-1/2" />
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <Badge variant="outline" className="mb-4">
                Step 01
              </Badge>
              <h3
                className="text-2xl md:text-3xl font-bold mb-4"
                data-testid="text-process-1"
              >
                데이터 기반 분석
              </h3>
              <p className="text-gray-600 text-lg">
                정확한 데이터 분석을 통해 현재 상황을 파악하고 최적의 성장
                전략을 수립합니다.
              </p>
            </div>
          </div>

          {/* 블록 2: 맞춤형 컨텐츠 수집 */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-24">
            <div>
              <Badge variant="outline" className="mb-4">
                Step 02
              </Badge>
              <h3
                className="text-2xl md:text-3xl font-bold mb-4"
                data-testid="text-process-2"
              >
                맞춤형 컨텐츠 수집
              </h3>
              <p className="text-gray-600 text-lg">
                타겟 고객에게 맞는 콘텐츠 전략을 수립하고 효과적인 마케팅 자료를
                제작합니다.
              </p>
            </div>
            <div>
              <div className="bg-white rounded-3xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm text-gray-500">Content</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="aspect-square bg-gray-100 rounded-2xl"
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 블록 3: 실행 가능한 액션 플랜 */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1">
              <div className="bg-white rounded-3xl shadow-lg p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center">
                    <Target className="w-6 h-6 text-primary" />
                  </div>
                  <span className="text-sm text-gray-500">Action Plan</span>
                </div>
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-primary" />
                      <div className="h-3 bg-gray-100 rounded-full flex-1" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <Badge variant="outline" className="mb-4">
                Step 03
              </Badge>
              <h3
                className="text-2xl md:text-3xl font-bold mb-4"
                data-testid="text-process-3"
              >
                실행 가능한 액션 플랜
              </h3>
              <p className="text-gray-600 text-lg">
                구체적이고 실행 가능한 단계별 액션 플랜을 제공하여 바로 실천할
                수 있도록 도와드립니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 플랫폼 소개 섹션 - 어두운 배경 */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto bg-gray-900 text-white rounded-3xl p-12 md:p-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2
                className="text-2xl md:text-4xl font-bold mb-6"
                data-testid="text-platform-title"
              >
                지식 비즈니스 온라인 전문가들과 함께
                <br />
                더할 빠르게 수익을 창출하세요
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                검증된 전문가들의 노하우와 시스템으로 당신의 온라인 비즈니스
                성공을 지원합니다.
              </p>
              <Button
                size="lg"
                variant="secondary"
                data-testid="button-platform-cta"
              >
                자세히 알아보기
                <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
            <div className="relative">
              <div className="bg-gray-800 rounded-3xl p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold">실시간 상담</div>
                    <div className="text-sm text-gray-400">
                      전문가와 1:1 상담
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div
                      key={i}
                      className="aspect-square bg-gray-700 rounded-2xl overflow-hidden"
                    >
                      <img
                        src={`https://images.unsplash.com/photo-${1500000000000 + i * 10000}?w=100&h=100&fit=crop`}
                        alt=""
                        className="w-full h-full object-cover opacity-70"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 검증 섹션 */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2
                className="text-2xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight"
                data-testid="text-verify-title"
              >
                국내 1위 지식 비즈니스
                <br />
                플랫폼 라이브클래스가
                <br />
                <span className="text-primary">검증합니다</span>
              </h2>
              <p
                className="text-gray-600 text-lg mb-8"
                data-testid="text-verify-desc"
              >
                2만 명 이상의 지식 창업가 성공 사례를 기반으로
                <br />
                확실한 성공 방법을 제시해 드립니다
              </p>
              <div className="flex items-center gap-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="w-10 h-10 rounded-full bg-gray-200 border-2 border-white overflow-hidden"
                    >
                      <img
                        src={`https://images.unsplash.com/photo-${1500000000000 + i * 50000}?w=100&h=100&fit=crop&faces`}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                  <span className="ml-2 text-sm text-gray-500">5.0 만점</span>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="grid grid-cols-2 gap-4">
                <Card
                  className="p-6 text-center rounded-3xl"
                  data-testid="stat-verify-0"
                >
                  <CountUpAnimation end={20000} suffix="+" />
                  <div className="text-sm text-gray-500 mt-2">누적 수강생</div>
                </Card>
                <Card
                  className="p-6 text-center rounded-3xl"
                  data-testid="stat-verify-1"
                >
                  <CountUpAnimation end={98} suffix="%" />
                  <div className="text-sm text-gray-500 mt-2">만족도</div>
                </Card>
                <Card
                  className="p-6 text-center rounded-3xl"
                  data-testid="stat-verify-2"
                >
                  <CountUpAnimation end={87} suffix="%" />
                  <div className="text-sm text-gray-500 mt-2">재수강률</div>
                </Card>
                <Card
                  className="p-6 text-center rounded-3xl"
                  data-testid="stat-verify-3"
                >
                  <CountUpAnimation end={1500} suffix="+" />
                  <div className="text-sm text-gray-500 mt-2">성공 사례</div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 무엇이든 수강생의 성공을 돕겠습니다 */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto bg-gray-900 text-white rounded-3xl p-12 md:p-16 text-center">
          <h2
            className="text-2xl md:text-4xl lg:text-5xl font-bold mb-6"
            data-testid="text-final-title"
          >
            무엇이든, 수강생의
            <br />
            성공을 돕겠습니다
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            온라인 비즈니스 성공을 위한 모든 것을 제공합니다
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" data-testid="button-final-cta">
              무료 상담 신청
              <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/30 text-white"
              data-testid="button-final-secondary"
            >
              서비스 소개서 받기
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
