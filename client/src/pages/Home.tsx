import Navigation from "@/components/Navigation";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  LineChart,
  Trophy,
  Target,
  ThumbsUp,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import profileGuest1 from "@/assets/images/profile_guest1.jpg";
import profileGuest2 from "@/assets/images/profile_guest2.jpg";
import profileGuest3 from "@/assets/images/profile_guest3.jpg";
import mainVideo from "@/assets/images/main1.mp4";

// ✅ 크리에이터 사진
import profileLim from "@/assets/images/profile_lim.jpg";
import profileShin from "@/assets/images/profile_shin.jpg";

// ✅ Swiper 관련 임포트 (자연스러운 롤링을 위한 핵심)
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/free-mode";

// ================= CountUp Component =================
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
          // duration을 줄여서 더 빠른 느낌을 줌
          const duration = 1500;
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
    <div ref={ref} className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-600">
      {count.toLocaleString()}
      {suffix}
    </div>
  );
}

// ================= Data =================
const educationPrograms = [
  {
    title: "쿠팡 제트배송 교육",
    description: "쿠팡 제트배송 입점부터 운영까지 완벽 마스터",
    duration: "4주 과정",
    level: "초급~중급",
    badge: "무료",
    color: "bg-blue-100 text-blue-700",
  },
  {
    title: "스마트스토어 창업",
    description: "네이버 스마트스토어 입점 및 마케팅 전략",
    duration: "6주 과정",
    level: "초급",
    badge: "인기",
    color: "bg-green-100 text-green-700",
  },
  {
    title: "해외직구 판매",
    description: "아마존, 이베이 등 해외 플랫폼 진출 전략",
    duration: "8주 과정",
    level: "중급~고급",
    badge: "신규",
    color: "bg-purple-100 text-purple-700",
  },
];

const features = [
  {
    icon: Users,
    title: "1:1 맞춤 교육",
    description: "개인별 맞춤 커리큘럼으로 효과적인 학습을 제공합니다.",
  },
  {
    icon: Video,
    title: "온/오프라인 병행",
    description: "시간과 장소에 구애받지 않는 유연한 학습 환경을 지원합니다.",
  },
  {
    icon: Award,
    title: "실전 중심 강사진",
    description: "실제 쇼핑몰 운영 경험을 가진 현직 대표님들이 강의합니다.",
  },
  {
    icon: TrendingUp,
    title: "수익 창출 지속 지원",
    description: "교육 수료 후에도 실제 수익이 날 때까지 지속적으로 케어합니다.",
  },
];

const reviews = [
  {
    name: "김*영 님",
    course: "쿠팡 제트배송 교육 수강",
    rating: 5,
    comment:
      "전혀 몰랐던 쿠팡 입점부터 매출까지 모두 배웠어요. 막막했던 시작이 확신으로 바뀌었고, 이제 월 500만원 매출을 달성했습니다! 실전 팁이 정말 큰 도움이 되었습니다.",
  },
  {
    name: "이*수 님",
    course: "스마트스토어 창업 수강",
    rating: 5,
    comment:
      "처음부터 차근차근 알려주셔서 3개월만에 안정적인 매출을 만들었습니다. 혼자 했으면 절대 몰랐을 마케팅 노하우를 전수받아 경쟁사보다 빠르게 자리 잡았습니다.",
  },
  {
    name: "박*진 님",
    course: "해외직구 판매 수강",
    rating: 5,
    comment:
      "해외 플랫폼 진출이 막연했는데, 언어 장벽부터 배송 문제까지 실전 노하우 덕분에 성공적으로 시작했어요. 첫 해외 주문 들어왔을 때의 짜릿함을 잊을 수 없습니다.",
  },
];

const curriculum = [
  {
    week: "1주차",
    title: "온라인 쇼핑몰 이해 및 전략 수립",
    topics: [
      "쇼핑몰 종류와 특징 완벽 분석",
      "나에게 맞는 최적의 플랫폼 선택",
      "성공적인 사업 계획서 작성 기초",
    ],
  },
  {
    week: "2주차",
    title: "팔리는 상품 소싱 노하우",
    topics: ["중국 사입(알리바바 등) 기초", "국내 도매 사이트 활용 비법", "마진율 높은 황금 키워드 찾기"],
  },
  {
    week: "3주차",
    title: "매출을 부르는 스토어 구축",
    topics: ["고객을 사로잡는 상세페이지 기획", "검색 상위 노출 SEO 세팅", "신뢰를 주는 스토어 디자인"],
  },
  {
    week: "4주차",
    title: "실전 마케팅 & 운영 자동화",
    topics: ["효율적인 광고 집행 전략 (CPC 등)", "재구매를 부르는 고객 응대 스킬", "데이터 분석을 통한 매출 극대화"],
  },
];

const successCards = [
  {
    tags: "#인스타그램 #인플루언서 #커뮤니티",
    name: "Honey Girl",
    desc: [
      "김진영 대표",
      "9.9만 팔로워 커뮤니티 운영",
      "수강 후 2023년 연매출 4억 달성",
    ],
    image: profileGuest1,
    alt: "게스트_프로필사진_1",
  },
  {
    tags: "#파워셀러 #매출수직상승",
    name: "나인조이",
    desc: [
      "김영준 대표",
      "실제 성과 사례 1,000건 이상 보유",
      "대기업 출신 마케팅 전문가의 전략 도입",
    ],
    image: profileGuest2,
    alt: "게스트_프로필사진_2",
  },
  {
    tags: "#억대매출 #콘텐츠마케팅",
    name: "클린365",
    desc: [
      "신기화 대표",
      "누적 수강생 1만명 돌파",
      "초고속 성장 신화, 연매출 10억 돌파",
    ],
    image: profileGuest3,
    alt: "게스트_프로필사진_3",
  },
];

const instructorCards = [
  {
    name: "임채운 강사 (콘텐츠 디렉터)",
    role: "크리에이터를 통한 콘텐츠 제작 전문가",
    quote: "\"초보 상태 1개월에서 광고주와 미팅을, 첫 달 결과까지 만들어냅니다. 콘텐츠가 곧 매출입니다.\"",
    image: profileLim,
    alt: "전속강사_1",
  },
  {
    name: "신동윤 강사 (데이터 애널리스트)",
    role: "데이터 기반 분석 및 전략가",
    quote: "\"감에 의존하지 마세요. 체계적인 데이터 분석으로 성장 방향을 명확하게 잡아드립니다.\"",
    image: profileShin,
    alt: "전속강사_2",
  },
];

// ================= Main Component =================
export default function Home() {
  // 기존의 복잡한 useRef, useState 기반 스크롤 로직 제거됨.
  // Swiper가 이 모든 것을 자연스럽게 처리합니다.

  return (
    <div className="min-h-screen bg-white font-sans">
      <Navigation />

      {/* ===================== Hero Section (디자인 강화) ===================== */}
      <section className="relative pt-[88px] pb-0 md:pb-0 h-screen max-h-[900px] flex items-center overflow-hidden">
         {/* ✅ 배경 동영상 및 오버레이 강화 */}
         <div className="absolute inset-0 z-0">
          <video
            className="w-full h-full object-cover"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src={mainVideo} type="video/mp4" />
          </video>
          {/* 단순 opacity 조절 대신 그라데이션 오버레이로 깊이감 부여 */}
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/95 via-gray-900/80 to-blue-900/50"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 md:px-8 h-full flex items-center">
          <div className="max-w-4xl text-white py-20">
            <Badge variant="secondary" className="mb-6 px-4 py-2 text-sm bg-white/20 text-white backdrop-blur-sm border-none">
              ✨ 온라인 비즈니스의 시작과 끝
            </Badge>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold mb-8 leading-tight tracking-tight">
              꿈은 현실이 됩니다.<br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                나나인터내셔널
              </span>과 함께<br />
              쇼핑몰 창업 성공하세요.
            </h1>
            <p className="text-lg md:text-xl mb-10 text-gray-200 max-w-2xl leading-relaxed">
              혼자서는 막막했던 온라인 창업, 검증된 전문가들과 체계적인 커리큘럼으로 성공의 길을 열어드립니다. 지금 바로 시작하세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-5">
              <Button size="lg" className="text-lg px-10 py-7 rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/30 transition-transform hover:scale-105">
                무료 상담 신청하기
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-10 py-7 rounded-full bg-white/5 hover:bg-white/15 text-white border-white/40 backdrop-blur-sm transition-transform hover:scale-105"
              >
                <Video className="mr-2 w-5 h-5" />
                교육 영상 맛보기
              </Button>
            </div>
          </div>
        </div>
        
        {/* 스크롤 유도 아이콘 */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce text-white/70">
          <ChevronRight className="w-8 h-8 rotate-90" />
        </div>
      </section>

      {/* ===================== 통계 섹션 (시각화 강화) ===================== */}
      <section className="py-24 relative z-20 -mt-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { icon: Users, end: 20000, suffix: "+", label: "누적 수강생", sub: "검증된 교육의 증거" },
              { icon: ThumbsUp, end: 98, suffix: "%", label: "수강 만족도", sub: "실질적인 도움 제공" },
              { icon: Target, end: 87, suffix: "%", label: "창업 성공률", sub: "교육 후 실제 창업까지" },
              { icon: Trophy, end: 5.0, suffix: " 만점", label: "평균 평점", sub: "리뷰로 증명하는 품질" }
            ].map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="border-0 shadow-xl rounded-[2rem] overflow-hidden group hover:-translate-y-2 transition-all duration-300 bg-white/80 backdrop-blur-md">
                  <CardContent className="p-8 text-center relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-purple-500 transform origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
                    <Icon className="w-12 h-12 mx-auto mb-4 text-blue-500/80 group-hover:text-blue-600 transition-colors" />
                    <CountUpAnimation end={stat.end} suffix={stat.suffix} />
                    <div className="font-bold text-gray-800 text-lg mt-3">{stat.label}</div>
                    <div className="text-sm text-gray-500 mt-1">{stat.sub}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== 고객사 성공사례 (자연스러운 Swiper 롤링 적용) ===================== */}
      <section className="py-24 bg-gradient-to-b from-gray-50 to-white px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 hover:bg-blue-200 border-none px-4 py-1">Success Stories</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight text-gray-900">
              나나인터내셔널과 함께<br />성공 신화를 쓴 대표님들
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              평범했던 시작이 놀라운 결과로. 다음 성공 스토리의 주인공은 바로 당신입니다.
            </p>
          </div>

          {/* ✅ Swiper 도입: 자연스러운 무한 롤링 구현 */}
          <Swiper
            modules={[Autoplay, FreeMode]}
            spaceBetween={24} // 카드 사이 간격
            slidesPerView={"auto"} // 컨테이너 크기에 맞춰 자동 조절
            loop={true} // 무한 루프
            freeMode={true} // 부드러운 관성 스크롤
            autoplay={{
              delay: 0, // 딜레이 없이 지속적으로 움직임
              disableOnInteraction: false, // 사용자 상호작용 후에도 멈추지 않음
              pauseOnMouseEnter: true, // 마우스 올리면 일시정지 (사용성 고려)
            }}
            speed={5000} // 부드럽게 흘러가는 속도 조절
            className="!pb-10 !px-4 md:!px-0 success-swiper" // Swiper 커스텀 스타일
            breakpoints={{
              320: { slidesPerView: 1.2, spaceBetween: 20 }, // 모바일: 다음 카드가 살짝 보이게
              640: { slidesPerView: 1.5, spaceBetween: 24 },
              1024: { slidesPerView: 2.5, spaceBetween: 30 },
              1280: { slidesPerView: 3.2, spaceBetween: 40 },
            }}
          >
            {/* loopCards 대신 원본 데이터 사용 후 Swiper가 알아서 복제 처리 */}
            {successCards.map((card, idx) => (
              <SwiperSlide key={idx} className="!h-auto swiper-slide-custom">
                <Card className="bg-gray-900 text-white rounded-[2rem] overflow-hidden shadow-xl h-full flex flex-col group hover:shadow-2xl transition-all duration-300 border-gray-800">
                  <div className="p-8 pb-4 flex-grow">
                    <div className="mb-4 text-sm font-medium text-blue-300 bg-blue-900/30 inline-block px-3 py-1 rounded-full">
                      {card.tags}
                    </div>
                    <h3 className="text-3xl font-bold mb-6 group-hover:text-blue-300 transition-colors">{card.name}</h3>
                    <ul className="space-y-3 text-gray-300 mb-8">
                      {card.desc.map((t, i) => (
                        <li key={i} className="flex items-start">
                           <CheckCircle2 className="w-5 h-5 mr-2 text-blue-500 flex-shrink-0 mt-0.5" />
                           <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="relative h-80 overflow-hidden">
                     <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent z-10"></div>
                    <img
                      src={card.image}
                      alt={card.alt}
                      className="w-full h-full object-cover object-top rounded-b-[2rem] transform group-hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                </Card>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* ===================== 전속 강사 (자연스러운 Swiper 적용, 모바일 최적화) ===================== */}
      <section className="py-24 px-6 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-purple-100 text-purple-700 hover:bg-purple-200 border-none px-4 py-1">World-Class Instructors</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900">
              검증된 실전 전문가,<br/>나나인터내셔널 전속 강사진
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              이론만 아는 강사가 아닙니다. 지금 이 순간에도 현장에서 성과를 내고 있는 전문가들이 직접 가르칩니다.
            </p>
          </div>

          {/* ✅ Swiper 도입: 전속 강사 섹션 */}
          <Swiper
             modules={[Autoplay, FreeMode]}
             spaceBetween={30}
             slidesPerView={"auto"}
             loop={true}
            //  freeMode={true} // 강사 프로필은 한 장씩 넘기는 느낌이 더 좋을 수 있어서 freeMode는 선택사항 (여기선 뺌)
             autoplay={{
               delay: 4000, // 성공사례보다 조금 더 천천히 넘어감
               disableOnInteraction: false,
             }}
             className="!pb-10 !px-4 md:!px-0"
             breakpoints={{
               320: { slidesPerView: 1.1, spaceBetween: 20 }, // 모바일: 우측이 살짝 보이게 (요청사항 반영)
               768: { slidesPerView: 1.5, spaceBetween: 30 },
               1024: { slidesPerView: 2, spaceBetween: 40 },
             }}
          >
            {instructorCards.map((item, idx) => (
              <SwiperSlide key={idx} className="!h-auto">
                <Card className="overflow-hidden rounded-[2rem] shadow-lg border-0 h-full group hover:shadow-2xl transition-all duration-300">
                  <div className="grid md:grid-cols-5 h-full">
                    <div className="md:col-span-2 relative overflow-hidden h-[300px] md:h-full">
                      <div className="absolute inset-0 bg-blue-900/10 group-hover:bg-transparent transition-colors z-10"></div>
                      <img
                        src={item.image}
                        alt={item.alt}
                        className="w-full h-full object-cover object-top transform group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    </div>
                    <div className="md:col-span-3 p-8 md:p-10 flex flex-col justify-center bg-gradient-to-br from-white to-gray-50">
                      <div className="mb-3">
                        <Badge variant="outline" className="text-primary border-primary bg-primary/5">전속 강사</Badge>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold mb-2">{item.name}</h3>
                      <p className="text-gray-500 mb-6 font-medium">{item.role}</p>
                      <blockquote className="text-lg text-gray-700 italic leading-relaxed border-l-4 border-primary pl-6 py-2 bg-primary/5 rounded-r-lg relative">
                        <span className="absolute top-0 left-1 text-4xl text-primary/20">"</span>
                        {item.quote}
                      </blockquote>
                    </div>
                  </div>
                </Card>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      {/* ===================== 교육 프로그램 (카드 디자인 개선) ===================== */}
      <section className="py-24 px-6 bg-gray-50 relative overflow-hidden">
        {/* 배경 장식 요소 */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-50">
            <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-200/30 blur-3xl"></div>
            <div className="absolute bottom-[10%] right-[10%] w-[30%] h-[30%] rounded-full bg-purple-200/30 blur-3xl"></div>
        </div>
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-700 border-none px-4 py-1">Our Programs</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900">
              수준별 맞춤 교육 프로그램
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              왕초보부터 매출 확장이 필요한 셀러까지, 단계별로 준비된 체계적인 커리큘럼을 만나보세요.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {educationPrograms.map((program, index) => (
              <Card key={index} className="p-8 border-0 shadow-md hover:shadow-2xl transition-all duration-300 rounded-[2rem] bg-white group flex flex-col justify-between relative overflow-hidden">
                <div className={`absolute top-0 left-0 w-full h-2 ${program.color.replace('text', 'bg').replace('100', '500')}`}></div>
                <div>
                  <Badge className={`mb-6 px-3 py-1 ${program.color} border-none text-sm font-semibold`}>{program.badge}</Badge>
                  <h3 className="text-2xl font-bold mb-4 group-hover:text-primary transition-colors">{program.title}</h3>
                  <p className="text-gray-600 mb-8 leading-relaxed">{program.description}</p>
                  <div className="space-y-3 mb-8 bg-gray-50 p-5 rounded-xl">
                    <div className="flex items-center text-sm text-gray-700 font-medium">
                      <Clock className="w-5 h-5 mr-3 text-gray-400" />
                      {program.duration}
                    </div>
                    <div className="flex items-center text-sm text-gray-700 font-medium">
                      <GraduationCap className="w-5 h-5 mr-3 text-gray-400" />
                      {program.level}
                    </div>
                  </div>
                </div>
                <Button className="w-full rounded-xl py-6 text-base group-hover:bg-primary/90 transition-all">
                  자세히 보기
                  <ChevronRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== 교육 특징 (아이콘 및 레이아웃 개선) ===================== */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
             <Badge className="mb-4 bg-purple-100 text-purple-700 border-none px-4 py-1">Why Us</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900">
              왜 <span className="text-primary">나나인터내셔널</span>인가요?
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              다른 곳과는 차별화된 우리만의 압도적인 교육 시스템으로 여러분의 성공을 보장합니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-12">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="group text-center">
                  <div className="w-24 h-24 rounded-3xl bg-primary/5 flex items-center justify-center mx-auto mb-8 group-hover:bg-primary/10 group-hover:scale-110 transition-all duration-300 relative overflow-hidden shadow-sm">
                    <div className="absolute inset-0 bg-primary/20 rotate-45 transform scale-0 group-hover:scale-150 transition-transform duration-500 rounded-3xl"></div>
                    <Icon className="w-10 h-10 text-primary relative z-10" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 group-hover:text-primary transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed px-4">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===================== 커리큘럼 (타임라인 디자인 적용) ===================== */}
      <section className="py-24 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-6xl mx-auto">
           <div className="text-center mb-20">
            <Badge className="mb-4 bg-blue-100 text-blue-700 border-none px-4 py-1">Curriculum</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900">
              4주 완성 속성 커리큘럼
            </h2>
             <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              가장 빠르고 효율적으로 쇼핑몰을 마스터할 수 있도록 설계된 단계별 로드맵입니다.
            </p>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-8">
             {/* 연결선 (데스크탑 전용) */}
             <div className="hidden md:block absolute top-16 left-0 w-full h-0.5 bg-dashed border-t-2 border-gray-200 border-dashed z-0"></div>

            {curriculum.map((item, index) => (
              <div key={index} className="relative z-10 flex flex-col h-full group">
                {/* 주차 표시 원 */}
                <div className="w-12 h-12 rounded-full bg-primary text-white font-bold flex items-center justify-center mx-auto mb-6 shadow-lg shadow-primary/30 group-hover:scale-110 transition-transform relative">
                  <span className="z-10">{index + 1}주</span>
                  {/* 활성화 효과 */}
                  <div className="absolute inset-0 rounded-full bg-primary animate-ping opacity-20"></div>
                </div>
                
                <Card className="p-8 md:p-6 border-0 shadow-md hover:shadow-xl transition-all duration-300 rounded-[1.5rem] flex-grow bg-white relative overflow-hidden hover:-translate-y-1">
                   <div className="absolute top-0 left-0 w-2 h-full bg-primary/10 group-hover:bg-primary transition-colors"></div>
                  <div className="pl-4">
                    <h3 className="text-xl font-bold mb-6 group-hover:text-primary transition-colors">{item.title}</h3>
                    <ul className="space-y-4">
                      {item.topics.map((topic, i) => (
                        <li key={i} className="flex items-start text-gray-700">
                          <CheckCircle2 className="w-5 h-5 mr-3 text-primary flex-shrink-0 mt-0.5" />
                          <span className="text-sm font-medium">{topic}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </Card>
              </div>
            ))}
          </div>
        </div>
      </section>

       {/* ===================== 수강생 후기 (디자인 개선) ===================== */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
           <div className="text-center mb-16">
            <Badge className="mb-4 bg-yellow-100 text-yellow-700 border-none px-4 py-1">Reviews</Badge>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900">
              수강생들이 증명하는<br/>압도적인 만족도
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              거짓 없는 100% 리얼 후기. 여러분의 미래 모습입니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {reviews.map((review, index) => (
              <Card key={index} className="p-8 border-0 shadow-lg rounded-[2rem] bg-gray-50 hover:bg-white hover:shadow-2xl transition-all duration-300 relative">
                <div className="absolute top-8 right-8 text-6xl text-gray-200 font-serif leading-none opacity-50">"</div>
                <div className="flex items-center gap-1 mb-6">
                  {[...Array(review.rating)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-5 h-5 fill-yellow-400 text-yellow-400 drop-shadow-sm"
                    />
                  ))}
                </div>
                <p className="text-gray-700 mb-8 leading-relaxed text-lg font-medium relative z-10">
                  {review.comment}
                </p>
                <div className="flex items-center">
                   <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center font-bold text-gray-600 mr-4 shadow-inner">
                      {review.name.charAt(0)}
                   </div>
                  <div>
                    <div className="font-bold text-gray-900">{review.name}</div>
                    <div className="text-sm text-primary font-medium">{review.course}</div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== CTA 섹션 (임팩트 강화) ===================== */}
      <section className="py-24 px-6 relative overflow-hidden">
         {/* 배경 그라데이션 및 패턴 */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary to-blue-700 transform -skew-y-3 origin-top-left z-0"></div>
        <div className="absolute inset-0 bg-[url('/pattern-bg.png')] opacity-10 mix-blend-overlay z-0"></div> {/* 패턴 이미지 예시 */}

        <div className="max-w-4xl mx-auto relative z-10">
          <Card className="p-12 md:p-16 text-center bg-white/10 backdrop-blur-lg border-white/20 shadow-2xl rounded-[3rem] overflow-hidden relative">
             <div className="absolute -top-20 -left-20 w-40 h-40 bg-blue-400/30 rounded-full blur-3xl animate-pulse"></div>
             <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-purple-400/30 rounded-full blur-3xl animate-pulse delay-700"></div>

            <BookOpen className="w-20 h-20 mx-auto mb-8 text-white drop-shadow-lg" />
            <h2 className="text-4xl md:text-5xl font-extrabold mb-6 text-white leading-tight">
              망설이는 순간에도<br/>경쟁자는 앞서갑니다.
            </h2>
            <p className="text-xl mb-12 text-white/90 max-w-2xl mx-auto leading-relaxed">
              지금이 가장 빠른 시작입니다. 무료 상담으로 나에게 딱 맞는 성공 로드맵을 설계받으세요.
            </p>
            <div className="flex flex-col sm:flex-row gap-5 justify-center">
              <Button
                size="lg"
                variant="secondary"
                className="text-lg px-10 py-7 rounded-full bg-white text-primary hover:bg-gray-100 font-bold shadow-lg transition-transform hover:scale-105"
              >
                <MessageCircle className="mr-2 w-6 h-6" />
                카카오톡 간편 상담
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-10 py-7 rounded-full bg-transparent text-white border-2 border-white/50 hover:bg-white/10 hover:border-white font-bold transition-transform hover:scale-105 backdrop-blur-sm"
              >
                전화 상담 신청
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
