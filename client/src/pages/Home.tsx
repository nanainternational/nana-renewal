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
import { useState, useEffect } from "react";

// ✅ main1.mp4 (client/src/assets/images/main1.mp4)
import mainVideo from "@/assets/images/main1.mp4";

// ✅ 이미지 추가 (profile_guest1, profile_guest2, profile_guest3)
import profileGuest1 from "@/assets/images/profile_guest1.jpg";
import profileGuest2 from "@/assets/images/profile_guest2.jpg";
import profileGuest3 from "@/assets/images/profile_guest3.jpg";

function CountUpAnimation({
  end,
  suffix = "",
}: {
  end: number;
  suffix?: string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
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

    return () => clearInterval(timer);
  }, [end]);

  return (
    <div className="text-3xl font-bold text-primary">
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

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navigation />

      {/* ===================== Hero Section ===================== */}
      <section className="pt-20 pb-20 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="relative min-h-[70vh] flex items-center justify-center bg-gray-900 rounded-3xl overflow-hidden">
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
            </div>
          </div>
        </div>
      </section>

      {/* ===================== 성공 사례 ===================== */}
      <section className="py-20 md:py-28 bg-gray-50 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              나나인터내셔널과 함께 성공한
              <br />
              고객사 성공 사례
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* ✅ 최고수준 (이미지 교체됨) */}
            <Card className="bg-gray-900 text-white rounded-3xl overflow-hidden hover:shadow-xl transition-all">
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
                src={profileGuest1}
                alt="최고수준 성공 사례"
                className="w-full h-80 object-cover object-center rounded-b-3xl px-8 pb-8"
              />
            </Card>

            {/* ✅ 브랜디액션 (이미지 교체됨) */}
            <Card className="bg-gray-900 text-white rounded-3xl overflow-hidden hover:shadow-xl transition-all">
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
                src={profileGuest2}
                alt="브랜디액션 성공 사례"
                className="w-full h-80 object-cover object-center rounded-b-3xl px-8 pb-8"
              />
            </Card>

            {/* ✅ 곤팀장 (이미지 교체됨) */}
            <Card className="bg-gray-900 text-white rounded-3xl overflow-hidden hover:shadow-xl transition-all">
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
                src={profileGuest3}
                alt="곤팀장 성공 사례"
                className="w-full h-80 object-cover object-center rounded-b-3xl px-8 pb-8"
              />
            </Card>
          </div>
        </div>
      </section>

      {/* 아래 섹션은 기존 코드 그대로 유지 */}
      <ContactForm />
      <Footer />
      <ScrollToTop />
    </div>
  );
}
