import Navigation from "@/components/Navigation";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  GraduationCap,
  Users,
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  Star,
  BookOpen,
  Video,
  MessageCircle,
  ChevronRight,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import profileGuest1 from "@/assets/images/profile_guest1.jpg";
import profileGuest2 from "@/assets/images/profile_guest2.jpg";
import profileGuest3 from "@/assets/images/profile_guest3.jpg";
import mainVideo from "@/assets/images/main1.mp4";

// ✅ 크리에이터 사진
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          let start = 0;
          const duration = 2000;
          const increment = end / (duration / 16);

          const timer = setInterval(() => {
            start += increment;
            if (start >= end) {
              setCount(end);
              clearInterval(timer);
            } else {
              setCount(Math.floor(start));
            }
          }, 16);
        }
      },
      { threshold: 0.5 },
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [end]);

  return (
    <div ref={ref} className="text-3xl font-bold text-primary">
      {count.toLocaleString()}
      {suffix}
    </div>
  );
}

const educationPrograms = [
  {
    title: "쿠팡 제트배송 교육",
    description: "쿠팡 제트배송 입점부터 운영까지 완벽 마스터",
    duration: "4주 과정",
    level: "초급~중급",
    badge: "무료",
  },
  {
    title: "스마트스토어 창업",
    description: "네이버 스마트스토어 입점 및 마케팅 전략",
    duration: "6주 과정",
    level: "초급",
    badge: "인기",
  },
  {
    title: "해외직구 판매",
    description: "아마존, 이베이 등 해외 플랫폼 진출 전략",
    duration: "8주 과정",
    level: "중급~고급",
    badge: "신규",
  },
];

const features = [
  {
    icon: Users,
    title: "1:1 맞춤 교육",
    description: "개인별 맞춤 커리큘럼으로 효과적인 학습",
  },
  {
    icon: Video,
    title: "온/오프라인 병행",
    description: "시간과 장소에 구애받지 않는 유연한 학습",
  },
  {
    icon: Award,
    title: "실전 중심 교육",
    description: "실제 쇼핑몰 운영 경험을 가진 강사진",
  },
  {
    icon: TrendingUp,
    title: "수익 창출 지원",
    description: "교육 후 실제 수익 창출까지 지속 지원",
  },
];

const reviews = [
  {
    name: "김*영",
    course: "쿠팡 제트배송 교육",
    rating: 5,
    comment:
      "전혀 몰랐던 쿠팡 입점부터 매출까지 모두 배웠어요. 이제 월 500만원 벌고 있습니다!",
  },
  {
    name: "이*수",
    course: "스마트스토어 창업",
    rating: 5,
    comment:
      "처음부터 차근차근 알려주셔서 3개월만에 안정적인 매출을 만들었습니다.",
  },
  {
    name: "박*진",
    course: "해외직구 판매",
    rating: 5,
    comment:
      "해외 플랫폼 진출이 막연했는데, 실전 노하우 덕분에 성공적으로 시작했어요.",
  },
];

const curriculum = [
  {
    week: "1주차",
    title: "온라인 쇼핑몰 이해",
    topics: [
      "쇼핑몰 종류와 특징",
      "플랫폼별 비교 분석",
      "나에게 맞는 플랫폼 선택",
    ],
  },
  {
    week: "2주차",
    title: "상품 소싱",
    topics: ["중국 사입 기초", "국내 도매 활용법", "수익성 높은 상품 찾기"],
  },
  {
    week: "3주차",
    title: "스토어 오픈",
    topics: ["입점 절차", "상세페이지 제작", "초기 세팅 완료"],
  },
  {
    week: "4주차",
    title: "마케팅 & 운영",
    topics: ["광고 집행 전략", "고객 응대", "매출 분석 및 개선"],
  },
];

// ✅ 고객사 성공사례 카드 데이터 (무한 롤링용)
const successCards = [
  {
    tags: "#인스타그램 #인플루언서 #커뮤니티",
    name: "Honey Girl",
    desc: [
      "김진영 대표",
      "9.9만 최고수준",
      "4.4만 하이스트 운영자",
      "2023년 연매출 4억 달성",
    ],
    image: profileGuest1,
    alt: "게스트_프로필사진_1",
  },
  {
    tags: "#파워링 #프로라이선성매출증대",
    name: "나인조이",
    desc: [
      "김영준 대표",
      "1000개 이상 실제 성과사례",
      "시의 매출 성장 프로그램",
      "대기업 마케팅 전문가",
    ],
    image: profileGuest2,
    alt: "게스트_프로필사진_2",
  },
  {
    tags: "#투자 #컨텐츠 #영매출 10억 돌파",
    name: "클린365",
    desc: [
      "신기화 대표",
      "0.1% 탑급 강사 클래스 운영",
      "누적수강 1만명 이상 강사",
      "초고속 성장, 스위칭 배당 작가",
    ],
    image: profileGuest3,
    alt: "게스트_프로필사진_3",
  },
];

// ✅ 전속 강사 카드 데이터 (무한 롤링용) — 기존 map을 데이터로 고정
const instructorCards = [
  {
    name: "크리에이터를 통한 콘텐츠 제작 후",
    quote: "초보 상태 1개월에서 광고주와 미팅을, 첫 달 결과까지",
    image: profileLim,
    alt: "전속강사_1",
  },
  {
    name: "데이터 기반 분석",
    quote: "체계적인 데이터 분석으로 성장 방향을 명확하게 잡을 수 있었습니다",
    image: profileShin,
    alt: "전속강사_2",
  },
];

export default function Home() {
  const cardsRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  // ✅ 무한 롤링을 위해 3배 렌더
  const loopCards = [...successCards, ...successCards, ...successCards];

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!cardsRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - cardsRef.current.offsetLeft);
    setScrollLeft(cardsRef.current.scrollLeft);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !cardsRef.current) return;
    e.preventDefault();
    const x = e.pageX - cardsRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    cardsRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // ✅ 무한 롤링: 가운데 묶음에서 시작
  useEffect(() => {
    if (!cardsRef.current) return;

    const container = cardsRef.current;

    // 첫 렌더에서 width 측정이 0일 수 있어 1프레임 늦춰서 세팅
    requestAnimationFrame(() => {
      if (!cardsRef.current) return;
      const first = container.children.item(0) as HTMLElement | null;
      if (!first) return;

      const cardWidth = first.clientWidth + 24; // gap-6 = 24px
      container.scrollLeft = cardWidth * successCards.length;
    });
  }, []);

  // ✅ 무한 롤링: 끝으로 가면 가운데로 순간이동
  const handleSuccessScroll = () => {
    if (!cardsRef.current) return;

    const container = cardsRef.current;
    const first = container.children.item(0) as HTMLElement | null;
    if (!first) return;

    const cardWidth = first.clientWidth + 24; // gap-6
    const total = successCards.length;

    // 왼쪽 끝에 가까우면 -> 오른쪽(가운데)로 이동
    if (container.scrollLeft <= cardWidth * 0.5) {
      container.scrollLeft += cardWidth * total;
    }

    // 오른쪽 끝에 가까우면 -> 왼쪽(가운데)로 이동
    if (container.scrollLeft >= cardWidth * total * 2) {
      container.scrollLeft -= cardWidth * total;
    }
  };

  // ===================== ✅ 전속강사 롤링(추가) =====================
  const instructorsRef = useRef<HTMLDivElement>(null);
  const [isDraggingIns, setIsDraggingIns] = useState(false);
  const [startXIns, setStartXIns] = useState(0);
  const [scrollLeftIns, setScrollLeftIns] = useState(0);

  // ✅ 무한 롤링을 위해 3배 렌더
  const loopInstructors = [
    ...instructorCards,
    ...instructorCards,
    ...instructorCards,
  ];

  const handleMouseDownIns = (e: React.MouseEvent) => {
    if (!instructorsRef.current) return;
    setIsDraggingIns(true);
    setStartXIns(e.pageX - instructorsRef.current.offsetLeft);
    setScrollLeftIns(instructorsRef.current.scrollLeft);
  };

  const handleMouseMoveIns = (e: React.MouseEvent) => {
    if (!isDraggingIns || !instructorsRef.current) return;
    e.preventDefault();
    const x = e.pageX - instructorsRef.current.offsetLeft;
    const walk = (x - startXIns) * 2;
    instructorsRef.current.scrollLeft = scrollLeftIns - walk;
  };

  const handleMouseUpIns = () => {
    setIsDraggingIns(false);
  };

  const handleMouseLeaveIns = () => {
    setIsDraggingIns(false);
  };

  // ✅ 무한 롤링: 가운데 묶음에서 시작 (전속강사)
  useEffect(() => {
    if (!instructorsRef.current) return;

    const container = instructorsRef.current;

    requestAnimationFrame(() => {
      if (!instructorsRef.current) return;
      const first = container.children.item(0) as HTMLElement | null;
      if (!first) return;

      const cardWidth = first.clientWidth + 32; // gap-8 = 32px
      container.scrollLeft = cardWidth * instructorCards.length;
    });
  }, []);

  // ✅ 무한 롤링: 끝으로 가면 가운데로 순간이동 (전속강사)
  const handleInstructorScroll = () => {
    if (!instructorsRef.current) return;

    const container = instructorsRef.current;
    const first = container.children.item(0) as HTMLElement | null;
    if (!first) return;

    const cardWidth = first.clientWidth + 32; // gap-8
    const total = instructorCards.length;

    if (container.scrollLeft <= cardWidth * 0.5) {
      container.scrollLeft += cardWidth * total;
    }

    if (container.scrollLeft >= cardWidth * total * 2) {
      container.scrollLeft -= cardWidth * total;
    }
  };
  // ===================== ✅ 전속강사 롤링(추가) 끝 =====================

  return (
    <div className="min-h-screen">
      <Navigation />

      {/* ===================== Hero Section ===================== */}
      <section className="pt-[88px] pb-20 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="relative min-h-[70vh] flex items-center justify-center bg-gray-900 rounded-3xl overflow-hidden">
            {/* ✅ 배경 동영상 */}
            <video
              className="absolute inset-0 w-full h-full object-cover opacity-30"
              autoPlay
              loop
              muted
              playsInline
            >
              <source src={mainVideo} type="video/mp4" />
            </video>

            <div className="relative z-10 text-center text-white px-6 max-w-4xl mx-auto py-20">
              <p className="text-lg md:text-xl mb-6 text-white/80">
                꿈은 곧 현실이 됩니다
              </p>
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
                나나인터내셔널과 함께
                <br />
                온라인 쇼핑몰 창업 성공하세요
              </h1>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
                <Button size="lg" className="text-lg px-8 py-6">
                  무료 상담 신청하기
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white border-white/30"
                >
                  <Video className="mr-2 w-5 h-5" />
                  교육 영상 보기
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 통계 섹션 ===================== */}
      <section className="py-20 md:py-28 bg-gray-50 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              검증된 교육 성과
            </h2>
            <p className="text-lg text-muted-foreground">
              숫자로 증명하는 나나인터내셔널의 교육 품질
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
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
              <div className="text-sm text-gray-500 mt-2">창업 성공률</div>
            </Card>

            <Card
              className="p-6 text-center rounded-3xl"
              data-testid="stat-verify-3"
            >
              <div className="flex items-center justify-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-yellow-400 text-yellow-400"
                  />
                ))}
              </div>
              <div className="text-sm text-gray-500">5.0 만점</div>
            </Card>
          </div>
        </div>
      </section>

      {/* ===================== 고객사 성공사례 ===================== */}
      <section className="py-20 md:py-28 bg-gray-50 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              나나인터내셔널과 함께 성공한
              <br />
              고객사 성공 사례
            </h2>
          </div>

          <div className="relative">
            <div
              ref={cardsRef}
              onScroll={handleSuccessScroll}
              // ✅ 모바일에서 다음 카드가 "살짝" 보이도록: pr + snap-start + scroll padding
              className="flex gap-6 overflow-x-auto pb-4 pr-10 md:pr-0 snap-x snap-mandatory scrollbar-hide cursor-grab active:cursor-grabbing scroll-pl-6 md:scroll-pl-0"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseLeave}
            >
              {loopCards.map((card, idx) => (
                <Card
                  key={idx}
                  className="bg-gray-900 text-white rounded-3xl overflow-hidden hover:shadow-xl transition-all flex-shrink-0 w-[72vw] sm:w-[320px] md:w-[350px] lg:w-[380px] snap-start md:snap-center"
                >
                  <div className="p-8 pb-0">
                    <div className="mb-4 text-sm text-gray-400">
                      {card.tags}
                    </div>
                    <h3 className="text-3xl font-bold mb-6">{card.name}</h3>
                    <div className="space-y-2 text-gray-300 mb-8">
                      {card.desc.map((t, i) => (
                        <p key={i}>{t}</p>
                      ))}
                    </div>
                  </div>
                  <img
                    src={card.image}
                    alt={card.alt}
                    className="w-full h-80 object-cover object-top mix-blend-lighten rounded-b-3xl px-8 pb-8"
                  />
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ===================== ✅ 나나인터내셔널 전속강사(롤링 적용) ===================== */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-2xl md:text-4xl font-bold mb-4">
              나나인터내셔널의 전속 강사
            </h2>
          </div>

          <div className="relative">
            <div
              ref={instructorsRef}
              onScroll={handleInstructorScroll}
              className="flex gap-8 overflow-x-auto pb-4 pr-10 md:pr-0 snap-x snap-mandatory scrollbar-hide cursor-grab active:cursor-grabbing scroll-pl-6 md:scroll-pl-0"
              style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
              onMouseDown={handleMouseDownIns}
              onMouseMove={handleMouseMoveIns}
              onMouseUp={handleMouseUpIns}
              onMouseLeave={handleMouseLeaveIns}
            >
              {loopInstructors.map((item, idx) => (
                <Card
                  key={idx}
                  className="overflow-hidden rounded-3xl flex-shrink-0 w-[82vw] sm:w-[520px] md:w-[620px] lg:w-[680px] snap-start md:snap-center"
                >
                  <div className="grid md:grid-cols-2">
                    <div className="aspect-[4/5] md:aspect-auto md:h-full bg-gray-100 overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.alt}
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
        </div>
      </section>

      {/* ===================== 교육 프로그램 ===================== */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              교육 프로그램
            </h2>
            <p className="text-lg text-muted-foreground">
              초보자도 쉽게 따라할 수 있는 체계적인 커리큘럼
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {educationPrograms.map((program, index) => (
              <Card key={index} className="p-8 hover-elevate transition-all">
                <Badge className="mb-4">{program.badge}</Badge>
                <h3 className="text-2xl font-bold mb-3">{program.title}</h3>
                <p className="text-gray-600 mb-6">{program.description}</p>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="w-4 h-4 mr-2" />
                    {program.duration}
                  </div>
                  <div className="flex items-center text-sm text-gray-500">
                    <GraduationCap className="w-4 h-4 mr-2" />
                    {program.level}
                  </div>
                </div>
                <Button className="w-full">
                  자세히 보기
                  <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 교육 특징 ===================== */}
      <section className="py-20 md:py-28 bg-gray-50 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              왜 나나인터내셔널인가?
            </h2>
            <p className="text-lg text-muted-foreground">
              차별화된 교육 시스템으로 성공을 보장합니다
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card
                  key={index}
                  className="p-8 text-center hover-elevate transition-all"
                >
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== 커리큘럼 ===================== */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              4주 완성 커리큘럼
            </h2>
            <p className="text-lg text-muted-foreground">
              단계별로 체계적으로 배우는 온라인 쇼핑몰 창업
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {curriculum.map((item, index) => (
              <Card key={index} className="p-6 hover-elevate transition-all">
                <div className="text-primary font-bold mb-3">{item.week}</div>
                <h3 className="text-xl font-bold mb-4">{item.title}</h3>
                <ul className="space-y-2">
                  {item.topics.map((topic, i) => (
                    <li
                      key={i}
                      className="flex items-start text-sm text-gray-600"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-2 text-primary flex-shrink-0 mt-0.5" />
                      {topic}
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 수강생 후기 ===================== */}
      <section className="py-20 md:py-28 bg-gray-50 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              수강생 후기
            </h2>
            <p className="text-lg text-muted-foreground">
              실제 수강생들의 생생한 경험담
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {reviews.map((review, index) => (
              <Card key={index} className="p-8 hover-elevate transition-all">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-gray-700 mb-6 leading-relaxed">
                  {review.comment}
                </p>
                <div className="border-t pt-4">
                  <div className="font-semibold">{review.name}</div>
                  <div className="text-sm text-gray-500">{review.course}</div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== CTA 섹션 ===================== */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-4xl mx-auto">
          <Card className="p-12 text-center bg-gradient-to-br from-primary to-purple-600 text-white">
            <BookOpen className="w-16 h-16 mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              지금 바로 시작하세요
            </h2>
            <p className="text-lg mb-8 text-white/90">
              무료 상담으로 나에게 맞는 교육 과정을 찾아보세요
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-8 py-6"
              >
                <MessageCircle className="mr-2 w-5 h-5" />
                카카오톡 상담
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 text-white border-white/30"
              >
                전화 상담신청
              </Button>
            </div>
          </Card>
        </div>
      </section>

      <ContactForm />
      <Footer />
      <ScrollToTop />
    </div>
  );
}
