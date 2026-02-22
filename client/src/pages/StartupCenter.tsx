"use client";

import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { API_BASE } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { useState } from "react";
import {
  Building2,
  Camera,
  Package,
  MapPin,
  Users,
  Wifi,
  Coffee, // 탕비실용
  Clock, // 사용 안 함 (삭제 가능하나 유지)
  MessageCircle,
  Check,
  ArrowRight,
  PiggyBank, // 추가됨
  Calculator, // 추가됨
  Truck, // 추가됨
  Zap, // 추가됨
  Monitor, // 추가됨 (OA)
  Presentation, // 추가됨 (세미나실)
  Sparkles, // 추가됨
} from "lucide-react";

import basicImage from "@assets/generated_images/Basic_tier_facility_cf68a9cc.png";
import standardImage from "@assets/generated_images/Standard_tier_facility_de876649.png";
import premiumImage from "@assets/generated_images/Premium_tier_facility_fc0c557f.png";
import heroVideo from "@assets/kling_20251209_Text_to_Video____________4422_0_1765272109865.mp4";

// Why Choose Us 데이터
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

// Detailed Benefits 데이터
const benefits = [
  "보증금, 관리비, 공과금 0원",
  "개인 사무실 공간 (책상, 의자, 사물함 완비)",
  "초고속 Wi-Fi 및 복합기 무제한",
  "24시간 365일 자유로운 출입",
];

// 지점 데이터
const branches = [
  {
    name: "부천시 심곡남부센터",
    address: "경기도 부천시 경인로137번가길 83 성원빌딩 3층",
  },
  {
    name: "부천시 심곡북부센터",
    address: "경기도 부천시 심곡동 352-6 정우빌딩 2층",
  },
  {
    name: "서울시 구로센터",
    address: "서울특별시 구로구 디지털로34길 55, 코오롱싸이언스밸리 2차 B101호",
  },
  {
    name: "서울시 남대문센터",
    address: "서울특별시 중구 남대문시장8길 7 삼익상가 지하1층",
  },
  {
    name: "서울시 영등포센터",
    address: "서울특별시 영등포구 버드나루로 15길 3 (오픈예상일 미정)",
  },
  {
    name: "인천시 계양센터",
    address: "인천광역시 계양구 용종동 210-2 레드몰A동 6층",
  },
];

// 가격 데이터
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
  const kakaoConsultLink = "http://pf.kakao.com/_xmXtTs/chat";
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [submittingTrial, setSubmittingTrial] = useState(false);
  const [trialToast, setTrialToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [trialForm, setTrialForm] = useState({
    name: "",
    phone: "",
    email: "",
    message: "",
    agreePrivacy: false,
    hp: "",
  });

  const handleTrialClick = () => {
    if (!user) {
      setLocation("/login");
      return;
    }
    setTrialModalOpen(true);
  };

  const handleTrialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingTrial) return;

    if (!trialForm.name.trim() || !trialForm.phone.trim() || !trialForm.email.trim() || !trialForm.message.trim()) {
      setTrialToast({ type: "error", message: "필수 항목을 모두 입력해주세요." });
      return;
    }
    if (!trialForm.agreePrivacy) {
      setTrialToast({ type: "error", message: "개인정보 수집 및 이용 동의가 필요합니다." });
      return;
    }

    setSubmittingTrial(true);
    try {
      const res = await fetch(`${API_BASE}/api/formmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: "startup_trial",
          name: trialForm.name.trim(),
          phone: trialForm.phone.trim(),
          phoneConfirm: trialForm.phone.trim(),
          email: trialForm.email.trim(),
          question: trialForm.message.trim(),
          agreePrivacy: trialForm.agreePrivacy,
          hp: trialForm.hp,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.message || "신청 중 오류가 발생했습니다.");

      setTrialForm({ name: "", phone: "", email: "", message: "", agreePrivacy: false, hp: "" });
      setTrialToast({ type: "success", message: "60일 무료 체험 신청이 접수되었습니다." });
      setTimeout(() => {
        setTrialModalOpen(false);
        setTrialToast(null);
      }, 1200);
    } catch (e: any) {
      setTrialToast({ type: "error", message: e?.message || "신청 접수 실패" });
    } finally {
      setSubmittingTrial(false);
    }
  };

  const scrollToCostComparison = () => {
    document
      .getElementById("cost-comparison")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Hero Section */}
      <section className="pt-[88px] pb-20 md:pb-28">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="relative min-h-[70vh] flex items-center justify-center bg-gray-900 rounded-3xl overflow-hidden shadow-2xl">
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
              <h2 className="text-lg md:text-xl font-semibold text-white/90 mb-4 flex items-center justify-center gap-2">
                <PiggyBank className="w-5 h-5 text-[#FEE500]" />
                <span className="text-[#FEE500]">초기 창업 비용 0원</span> 도전
              </h2>

              <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold mb-8 leading-tight">
                일할 맛 나는 사무실
                <br />
                <span className="text-primary-foreground">
                  임대료는 사실상 0원
                </span>
              </h1>

              <p className="text-lg md:text-xl mb-8 text-white/80 max-w-2xl mx-auto leading-relaxed">
                보증금, 관리비, 집기 구매비용 없이
                <br className="md:hidden" /> 노트북만 들고 오세요.
                <br />
                쇼핑몰 창업에 최적화된 풀옵션 오피스입니다.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
                <Button
                  size="lg"
                  variant="default"
                  className="w-full sm:w-48 bg-white text-gray-900 hover:bg-gray-50 text-base font-bold h-14"
                  data-testid="button-quick-quote"
                  onClick={scrollToCostComparison}
                >
                  비용 절감표 보기
                  <ArrowRight className="ml-2 w-4 h-4" />
                </Button>

                <Button
                  asChild
                  size="lg"
                  className="w-full sm:w-48 bg-[#FEE500] text-black hover:bg-[#F7DA00] text-base font-bold h-14"
                  data-testid="button-5sec-consult"
                >
                  <a href={kakaoConsultLink} target="_blank" rel="noreferrer">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    카톡상담하기
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🔥 [NEW] Cost Comparison Section */}
      <section id="cost-comparison" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <span className="inline-flex items-center rounded-full border border-primary/20 bg-white px-4 py-1 text-sm font-bold text-primary mb-6 shadow-sm">
              <Calculator className="w-3 h-3 mr-2" />
              팩트 체크
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900">
              월세 19만원? <br className="md:hidden" />
              <span className="text-primary">아니요, 사실상 공짜입니다.</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              보증금 1,000만원, 월세 50만원, 관리비 10만원...{" "}
              <br className="hidden md:block" />
              숨겨진 비용까지 따져보면{" "}
              <span className="font-bold text-gray-900 underline decoration-primary/30 decoration-4 underline-offset-4">
                나나인터내셔널은 돈을 벌어주는 사무실
              </span>
              입니다.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
            {/* Traditional Office */}
            <div className="rounded-3xl p-8 bg-white border border-gray-200 shadow-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 bg-gray-100 px-6 py-3 rounded-bl-2xl font-bold text-gray-500 text-sm">
                일반 소형 사무실
              </div>
              <h3 className="text-2xl font-bold mb-8 text-gray-400 mt-2">
                매월 숨만 쉬어도 나가는 돈
              </h3>

              <div className="space-y-5 mb-8">
                <div className="flex justify-between items-center py-3 border-b border-dashed border-gray-200">
                  <span className="text-gray-500 font-medium">월 임대료</span>
                  <span className="font-semibold text-lg text-gray-700">
                    350,000원
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-dashed border-gray-200">
                  <span className="text-gray-500 font-medium">관리비</span>
                  <span className="font-semibold text-lg text-red-500">
                    + 80,000원
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-dashed border-gray-200">
                  <span className="text-gray-500 font-medium">
                    전기/수도/냉난방
                  </span>
                  <span className="font-semibold text-lg text-red-500">
                    + 130,000원
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-dashed border-gray-200">
                  <span className="text-gray-500 font-medium">
                    인터넷/정수기
                  </span>
                  <span className="font-semibold text-lg text-red-500">
                    + 70,000원
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-dashed border-gray-200">
                  <span className="text-gray-500 font-medium">비품/청소</span>
                  <span className="font-semibold text-lg text-red-500">
                    + 80,000원
                  </span>
                </div>
              </div>

              <div className="bg-gray-100 rounded-2xl p-6 text-center">
                <p className="text-sm text-gray-500 mb-2 font-medium">
                  실제 월 고정 지출
                </p>
                <p className="text-4xl font-bold text-gray-700">710,000원</p>
                <p className="text-xs text-red-500 mt-3 font-bold bg-white/50 inline-block px-3 py-1 rounded-full">
                  ⚠️ 보증금 1,000만원 별도 (목돈 묶임)
                </p>
              </div>
            </div>

            {/* Nana International */}
            <div className="rounded-3xl p-8 bg-white border-2 border-primary shadow-2xl shadow-primary/10 relative overflow-hidden z-10">
              <div className="absolute top-0 right-0 bg-primary px-6 py-3 rounded-bl-2xl font-bold text-white text-sm shadow-md">
                나나인터내셔널
              </div>
              <h3 className="text-2xl font-bold mb-8 text-gray-900 mt-2">
                모든 비용이 포함된 가격
              </h3>

              <div className="space-y-5 mb-8">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-900 font-bold">월 멤버십 비용</span>
                  <span className="font-bold text-2xl text-primary">
                    190,000원
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">관리비</span>
                  <span className="font-bold text-lg text-[#1c243a] flex items-center bg-[#eef1f7] px-3 py-1 rounded-full">
                    <Check className="w-4 h-4 mr-1" /> 0원
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">전기/수도/냉난방</span>
                  <span className="font-bold text-lg text-[#1c243a] flex items-center bg-[#eef1f7] px-3 py-1 rounded-full">
                    <Check className="w-4 h-4 mr-1" /> 0원
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">인터넷/정수기</span>
                  <span className="font-bold text-lg text-[#1c243a] flex items-center bg-[#eef1f7] px-3 py-1 rounded-full">
                    <Check className="w-4 h-4 mr-1" /> 0원
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">사무가구/비품</span>
                  <span className="font-bold text-lg text-[#1c243a] flex items-center bg-[#eef1f7] px-3 py-1 rounded-full">
                    <Check className="w-4 h-4 mr-1" /> 0원
                  </span>
                </div>
              </div>

              <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 rounded-2xl p-6 text-center border border-primary/20">
                <div className="flex flex-col md:flex-row justify-around items-center gap-6 md:gap-4">
                  <div>
                    <p className="text-sm text-gray-600 mb-1 font-medium">
                      월 절약 금액
                    </p>
                    <p className="text-3xl font-extrabold text-primary">
                      52만원
                    </p>
                  </div>
                  <div className="hidden md:block w-px h-12 bg-gray-300"></div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1 font-medium">
                      연간 절약 금액
                    </p>
                    <p className="text-3xl font-extrabold text-primary">
                      624만원
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-primary/10">
                  <p className="text-sm text-[#263252] font-bold flex items-center justify-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    보증금 0원! 목돈 투자 없이 바로 시작하세요
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 🔥 [NEW] Shopping Mall Benefits */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              쇼핑몰 사장님은 <br className="md:hidden" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
                돈을 더 법니다
              </span>
            </h2>
            <p className="text-xl text-gray-600">
              택배비와 촬영비만 아껴도 월세는 이미 뽑았습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-lg hover:border-primary hover:shadow-2xl transition-all duration-300 group">
              <div className="w-16 h-16 rounded-2xl bg-[#eef1f7] flex items-center justify-center mb-6 group-hover:bg-[#1c243a] transition-colors duration-300">
                <Truck className="w-8 h-8 text-[#1c243a] group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-bold mb-4">초저가 택배 계약</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                개인 계약시 3,500원 →{" "}
                <span className="text-[#1c243a] font-bold text-lg">
                  2,050원
                </span>
                <br />월 100건만 보내도{" "}
                <span className="font-bold underline decoration-[#c8d1e6] decoration-2">
                  15만원 절약!
                </span>
              </p>
              <p className="text-sm text-gray-400 border-t border-gray-100 pt-4">
                * 물량이 적어도 상관없습니다. 입주사는 누구나 최저가 요금 혜택을
                받습니다.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-lg hover:border-primary hover:shadow-2xl transition-all duration-300 group">
              <div className="w-16 h-16 rounded-2xl bg-purple-50 flex items-center justify-center mb-6 group-hover:bg-purple-600 transition-colors duration-300">
                <Camera className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-bold mb-4">스튜디오 완전 무료</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                렌탈 스튜디오 시간당 4만원 →{" "}
                <span className="text-purple-600 font-bold text-lg">0원</span>
                <br />주 2시간 촬영 시{" "}
                <span className="font-bold underline decoration-purple-200 decoration-2">
                  월 32만원 절약!
                </span>
              </p>
              <p className="text-sm text-gray-400 border-t border-gray-100 pt-4">
                * 촬영 장비와 조명까지 준비되어 있습니다. 상품만 가져오시면
                됩니다.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-3xl bg-white border border-gray-100 shadow-lg hover:border-primary hover:shadow-2xl transition-all duration-300 group">
              <div className="w-16 h-16 rounded-2xl bg-green-50 flex items-center justify-center mb-6 group-hover:bg-green-600 transition-colors duration-300">
                <Zap className="w-8 h-8 text-green-600 group-hover:text-white transition-colors" />
              </div>
              <h3 className="text-2xl font-bold mb-4">리스크 제로 창업</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">
                2년 노예 계약 →{" "}
                <span className="text-green-600 font-bold text-lg">
                  1개월 단위 갱신
                </span>
                <br />
                사업이 힘들면 <span className="font-bold">언제든 STOP 가능</span>
              </p>
              <p className="text-sm text-gray-400 border-t border-gray-100 pt-4">
                * 위약금 걱정 없이 사업을 시작하고, 규모에 따라 사무실을
                유연하게 옮기세요.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              왜 나나인터내셔널 <span className="text-primary">창업센터</span>
              인가요?
            </h2>
            <p className="text-xl text-gray-600">
              비용은 줄이고, 업무 효율은 극대화하는 최적의 환경
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col items-center text-center gap-4 group"
                >
                  <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center group-hover:bg-primary group-hover:text-white transition-all">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-lg font-bold">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ✅ Detailed Benefits & Locations (그리드 적용) */}
      <section className="py-20 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            {/* Left Column: Benefits Text */}
            <div className="lg:sticky lg:top-32">
              <div className="inline-block bg-[#eef1f7] text-primary px-4 py-1.5 rounded-full text-sm font-bold mb-6">
                몸만 오시면 됩니다
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-8 leading-tight">
                입주 즉시
                <br />
                <span className="text-primary">업무 시작 가능</span>
              </h2>
              <p className="text-lg text-gray-600 mb-10 leading-relaxed">
                인테리어 공사, 인터넷 설치, 가구 구매로 시간 낭비하지 마세요.
                계약 당일부터 바로 업무를 시작할 수 있도록 모든 것이 준비되어
                있습니다.
              </p>
              <div className="space-y-5">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Check className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-lg font-medium text-gray-800">
                      {benefit}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-10 p-6 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 flex items-start gap-4">
                <Users className="w-6 h-6 text-primary mt-1" />
                <div>
                  <h4 className="font-bold text-lg mb-1">외롭지 않은 창업</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    다양한 분야의 대표님들과 자연스럽게 네트워킹하며 정보를
                    공유하고, 함께 성장하는 에너지를 얻을 수 있습니다.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Location List (Grid - No Scroll) */}
            <div className="w-full">
              <div className="rounded-3xl bg-white border border-gray-100 shadow-2xl overflow-hidden">
                {/* Card Header */}
                <div className="p-8 bg-gray-50/50 border-b border-gray-100 text-center">
                  <div className="inline-flex items-center justify-center p-3 bg-primary/10 rounded-full mb-4">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    센터 위치 안내
                  </h3>
                  <p className="text-gray-500 mt-2">
                    전국 6개 지점을 운영하고 있습니다.
                  </p>
                </div>

                {/* List Content (Grid) */}
                <div className="p-6 md:p-8 bg-white">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-4">
                    {branches.map((branch, idx) => (
                      <div
                        key={idx}
                        className="group p-5 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-default"
                      >
                        <h4 className="font-bold text-gray-900 flex items-center gap-2 mb-2 text-base">
                          <span className="w-2 h-2 rounded-full bg-primary group-hover:scale-150 transition-transform"></span>
                          {branch.name}
                        </h4>
                        <p className="text-gray-600 text-sm pl-4 leading-relaxed break-keep">
                          {branch.address}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
              합리적인 이용 가격
            </h2>
            <p className="text-lg md:text-xl text-gray-500">
              추가 비용 없이 투명하게 공개합니다
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingTiers.map((tier, index) => (
              <div
                key={index}
                className={`bg-white p-8 rounded-3xl transition-all duration-300 ${
                  tier.featured
                    ? "border-2 border-primary shadow-xl hover:-translate-y-1 relative"
                    : "border border-gray-200 hover:shadow-xl hover:-translate-y-1"
                }`}
              >
                {tier.featured && (
                  <span className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl">
                    BEST
                  </span>
                )}
                <h3
                  className={`text-2xl font-bold mb-2 ${
                    tier.featured ? "text-primary" : ""
                  }`}
                >
                  {tier.name}
                </h3>
                <p className="text-sm text-gray-500 mb-6">{tier.subtitle}</p>
                <div className="rounded-xl overflow-hidden mb-6 bg-gray-100 h-48 flex items-center justify-center">
                  <img
                    src={tier.image}
                    alt={tier.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="space-y-4 mb-8">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                      예산(월)
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {tier.budget}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                      관리비
                    </p>
                    <p className="text-sm font-bold text-primary">0원 (무료)</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                      공간
                    </p>
                    <p className="text-sm text-gray-600">{tier.facility}</p>
                  </div>
                </div>
                <Button
                  asChild
                  className={`w-full py-6 text-lg font-bold rounded-xl ${
                    tier.featured
                      ? "bg-primary hover:bg-[#263252] shadow-lg shadow-[#c8d1e6]"
                      : "bg-white border-2 border-gray-100 text-gray-600 hover:bg-gray-50 hover:border-gray-200"
                  }`}
                  variant={tier.featured ? "default" : "ghost"}
                >
                  <a href={kakaoConsultLink} target="_blank" rel="noreferrer">
                    카톡상담하기
                  </a>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ Facilities (수정됨: 3열 그리드 & 아이콘/항목 추가) */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              충분한 <span className="text-primary">시설과 공간</span>
            </h2>
            <p className="text-xl text-gray-600">
              업무에만 집중하세요. 나머지는 저희가 준비했습니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* 1. Internet */}
            <div className="p-8 border border-gray-100 rounded-3xl hover:shadow-xl transition-all flex flex-col gap-4 group">
              <div className="w-14 h-14 bg-[#eef1f7] rounded-2xl flex items-center justify-center group-hover:bg-[#1c243a] transition-colors">
                <Wifi className="w-7 h-7 text-[#1c243a] group-hover:text-white transition-colors" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">기업용 초고속 인터넷</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  100Mbps 이상의 빠른 기업용 회선과 개별 IP를 제공합니다.
                </p>
              </div>
            </div>

            {/* 2. OA (Computer Icon) */}
            <div className="p-8 border border-gray-100 rounded-3xl hover:shadow-xl transition-all flex flex-col gap-4 group">
              <div className="w-14 h-14 bg-[#eef1f7] rounded-2xl flex items-center justify-center group-hover:bg-[#1c243a] transition-colors">
                <Monitor className="w-7 h-7 text-[#1c243a] group-hover:text-white transition-colors" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">OA 기기 완비</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  최신형 복합기(출력/스캔/복사)와 공용 PC가 준비되어 있어
                  편리합니다.
                </p>
              </div>
            </div>

            {/* 3. Seminar Room (New) */}
            <div className="p-8 border border-gray-100 rounded-3xl hover:shadow-xl transition-all flex flex-col gap-4 group">
              <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                <Presentation className="w-7 h-7 text-purple-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">세미나실</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  소규모 강연, 교육, 워크숍 진행이 가능한 빔프로젝터 완비
                  공간입니다.
                </p>
              </div>
            </div>

            {/* 4. Meeting Room (New) */}
            <div className="p-8 border border-gray-100 rounded-3xl hover:shadow-xl transition-all flex flex-col gap-4 group">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center group-hover:bg-green-600 transition-colors">
                <Users className="w-7 h-7 text-green-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">미팅룸 / 회의실</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  외부 손님 미팅, 팀 회의 등 프라이빗한 대화를 위한 독립된
                  회의실입니다.
                </p>
              </div>
            </div>

            {/* 5. Open Pantry (New) */}
            <div className="p-8 border border-gray-100 rounded-3xl hover:shadow-xl transition-all flex flex-col gap-4 group">
              <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center group-hover:bg-orange-600 transition-colors">
                <Coffee className="w-7 h-7 text-orange-600 group-hover:text-white transition-colors" />
              </div>
              <div>
                <h3 className="text-xl font-bold mb-2">오픈 탕비실</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  무제한 커피와 차, 제빙기, 전자레인지가 구비된 깔끔한 휴게
                  공간입니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-purple-600 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <svg
            className="h-full w-full"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <defs>
              <pattern
                id="grid-pattern"
                width="10"
                height="10"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 10 0 L 0 0 0 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid-pattern)" />
          </svg>
        </div>

        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center text-white relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            월 50만원씩 아끼고 시작하세요
          </h2>
          <p className="text-xl mb-10 opacity-90 leading-relaxed">
            성공적인 쇼핑몰 창업의 첫걸음,
            <br className="md:hidden" /> 나나인터내셔널이 함께합니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="text-lg px-8 py-6 rounded-xl font-bold shadow-lg hover:-translate-y-1 transition-transform"
            >
              <a href={kakaoConsultLink} target="_blank" rel="noreferrer">
                <MessageCircle className="w-5 h-5 mr-2" />
                카톡상담하기
              </a>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-lg px-8 py-6 rounded-xl font-bold bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm hover:-translate-y-1 transition-transform"
              onClick={handleTrialClick}
            >
              60일 무료 체험 신청
            </Button>
          </div>
        </div>
      </section>



      <Dialog open={trialModalOpen} onOpenChange={setTrialModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>60일 무료 체험 신청</DialogTitle>
            <DialogDescription>메인 문의하기와 동일한 항목으로 신청할 수 있습니다.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleTrialSubmit} className="space-y-4">
            <div>
              <Label htmlFor="trial-name">성명</Label>
              <Input
                id="trial-name"
                value={trialForm.name}
                onChange={(e) => setTrialForm({ ...trialForm, name: e.target.value })}
                placeholder="이름을 입력하세요"
              />
            </div>

            <div>
              <Label htmlFor="trial-phone">연락처</Label>
              <Input
                id="trial-phone"
                type="tel"
                value={trialForm.phone}
                onChange={(e) => setTrialForm({ ...trialForm, phone: e.target.value })}
                placeholder="010-0000-0000"
              />
            </div>

            <div>
              <Label htmlFor="trial-email">이메일</Label>
              <Input
                id="trial-email"
                type="email"
                value={trialForm.email}
                onChange={(e) => setTrialForm({ ...trialForm, email: e.target.value })}
                placeholder="example@email.com"
              />
            </div>

            <div>
              <Label htmlFor="trial-message">질문내용</Label>
              <Textarea
                id="trial-message"
                value={trialForm.message}
                onChange={(e) => setTrialForm({ ...trialForm, message: e.target.value })}
                placeholder="문의하실 내용을 입력하세요"
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>개인정보 수집 동의*</Label>
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={trialForm.agreePrivacy}
                  onCheckedChange={(v) => setTrialForm({ ...trialForm, agreePrivacy: Boolean(v) })}
                />
                <span>문의 접수 및 답변 연락을 위한 개인정보 수집·이용에 동의합니다.</span>
              </label>
              <Input
                className="hidden"
                tabIndex={-1}
                autoComplete="off"
                value={trialForm.hp}
                onChange={(e) => setTrialForm({ ...trialForm, hp: e.target.value })}
              />
            </div>

            <Button type="submit" className="w-full" disabled={submittingTrial}>
              {submittingTrial ? "제출 중..." : "문의하기"}
            </Button>

            {trialToast && (
              <div
                className={`rounded px-4 py-2 text-sm text-white ${trialToast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}
              >
                {trialToast.message}
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
