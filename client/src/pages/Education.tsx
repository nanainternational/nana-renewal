import Navigation from "@/components/Navigation";
import ContactForm from "@/components/ContactForm";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  TrendingUp,
  Package,
  Calculator,
  MapPin,
  Youtube,
  CheckCircle2,
  BarChart,
  Users,
  ShoppingBag,
  Rocket,
  Target,
  Clock,
} from "lucide-react";
import { useEffect, useState } from "react";

// ✅ [설득 요소] 실제 성과를 보여주는 자동 슬라이더 (애니메이션 효과 강화)
const GraphSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = [
    {
      title: "매출 폭발적 성장",
      desc: "제트배송 전환 후 매출 300% 이상 급상승",
      // 실제 상승 그래프 느낌의 이미지 (예시)
      img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&q=80",
    },
    {
      title: "압도적인 노출 효과",
      desc: "일반 마켓플레이스 대비 3~4배 높은 노출 도달률",
      img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop&q=80",
    },
    {
      title: "수익률 최적화",
      desc: "마진 계산기 솔루션 도입 후 순수익 25% 개선",
      img: "https://images.unsplash.com/photo-1543286386-713df548e9cc?w=800&h=400&fit=crop&q=80",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 4000); // 4초마다 전환
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-2xl aspect-video bg-gray-900 group border border-gray-800">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-all duration-1000 ease-in-out transform ${
            index === currentIndex ? "opacity-100 scale-100" : "opacity-0 scale-105"
          }`}
        >
          {/* 이미지 오버레이 처리로 텍스트 가독성 확보 */}
          <div className="absolute inset-0 bg-black/50 z-10" />
          <img
            src={slide.img}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 p-8 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
            <Badge className="mb-3 bg-primary text-white border-none">Success Case {index + 1}</Badge>
            <h4 className="text-3xl font-bold text-white mb-2 tracking-tight">
              {slide.title}
            </h4>
            <p className="text-xl text-gray-200 font-medium">{slide.desc}</p>
          </div>
        </div>
      ))}
      {/* 슬라이드 인디케이터 */}
      <div className="absolute bottom-6 right-6 z-30 flex gap-2">
        {slides.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              idx === currentIndex ? "w-8 bg-primary" : "w-2 bg-gray-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default function Education() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <Navigation />

      {/* 1. Hero Section: 압도적인 혜택 강조 */}
      <section className="pt-[88px] pb-20 md:pb-32 relative overflow-hidden">
        {/* 배경 효과 */}
        <div className="absolute inset-0 bg-slate-900">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1920&h=1080&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/80 to-slate-900"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 text-center pt-10">
          <Badge className="mb-8 bg-primary/20 text-primary hover:bg-primary/30 border-primary/50 px-4 py-1.5 text-base backdrop-blur-sm animate-fade-in-up">
            나나인터내셔널 공식 무료 교육
          </Badge>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-8 leading-tight tracking-tight animate-fade-in-up delay-100">
            당신의 쇼핑몰 매출,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
              제트배송(로켓그로스)
            </span>으로 폭발시키세요
          </h1>
          
          <p className="text-lg md:text-xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed animate-fade-in-up delay-200">
            배송/CS 스트레스는 쿠팡에 맡기고, 사장님은 매출만 확인하세요.<br />
            <span className="text-white font-semibold">"왜 내 상품만 안 팔릴까?"</span> 고민되시나요?<br />
            현직 억대 셀러가 그 비밀을 무료로 공개합니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center animate-fade-in-up delay-300">
            <Button size="lg" className="text-lg px-10 h-16 rounded-full bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25 transition-transform hover:scale-105"
             onClick={() => document.getElementById('formArea')?.scrollIntoView({ behavior: 'smooth' })}>
              무료 교육 신청하기
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-1 text-green-500"/> 선착순 마감</span>
              <span className="flex items-center"><CheckCircle2 className="w-4 h-4 mr-1 text-green-500"/> 100% 무료</span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 문제 제기 & 해결 (Why Jet Delivery?) - 검색 기반 데이터 활용 */}
      <section className="py-20 bg-white px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              왜 지금 <span className="text-primary">제트배송</span>을 해야 할까요?
            </h2>
            <p className="text-slate-600 text-lg">
              쿠팡 마켓플레이스 판매 대비 압도적인 3가지 차이점
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-2 transition-transform duration-300 bg-gradient-to-br from-white to-slate-50">
              <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <TrendingUp className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3">매출 3~4배 상승</h3>
              <p className="text-slate-600 leading-relaxed">
                로켓 뱃지가 붙으면 노출이 달라집니다. 일반 판매 대비 구매 전환율과 노출 빈도가 압도적으로 증가합니다.
                <br/><span className="text-xs text-slate-400 mt-2 block">*아이보스 및 주요 매체 분석 결과</span>
              </p>
            </Card>

            <Card className="p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-2 transition-transform duration-300 bg-gradient-to-br from-white to-slate-50">
              <div className="w-14 h-14 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                <Clock className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3">운영 시간 90% 절감</h3>
              <p className="text-slate-600 leading-relaxed">
                포장, 배송, 반품, CS... 귀찮은 일은 쿠팡 풀필먼트가 다 합니다. 사장님은 '상품 소싱'에만 집중하세요.
              </p>
            </Card>

            <Card className="p-8 border border-slate-100 shadow-xl shadow-slate-200/50 hover:-translate-y-2 transition-transform duration-300 bg-gradient-to-br from-white to-slate-50">
              <div className="w-14 h-14 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                <Target className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3">판매가 자유 설정</h3>
              <p className="text-slate-600 leading-relaxed">
                기존 로켓배송과 달리, 제트배송(로켓그로스)은 판매자가 직접 가격을 결정하여 마진율을 방어할 수 있습니다.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. 추천 대상 (타겟 오디언스) */}
      <section className="py-20 bg-slate-50 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block mb-4 px-4 py-1.5 rounded-full bg-slate-200 text-slate-700 font-semibold text-sm">
                CHECK LIST
              </div>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                이런 고민이 있다면<br />
                <span className="text-primary">지금이 기회</span>입니다
              </h2>
              <p className="text-slate-600 text-lg mb-8">
                온라인 창업, 막연한 두려움만 가지고 계신가요? <br />
                검증된 전문가가 A부터 Z까지 로드맵을 그려드립니다.
              </p>
              
              <ul className="space-y-4">
                {[
                  "온라인 창업을 시작하고 싶지만 아이템이 없는 분",
                  "스마트스토어 매출이 정체되어 돌파구가 필요한 분",
                  "쿠팡 입점은 했지만 노출이 안 되어 답답한 분",
                  "투잡으로 월급 외 추가 수익을 만들고 싶은 직장인"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
                    <CheckCircle2 className="w-5 h-5 text-primary mr-3 flex-shrink-0" />
                    <span className="font-medium text-slate-800">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
               {/* 이미지 그리드 - 시각적 흥미 유발 */}
               <div className="space-y-4 mt-8">
                 <div className="bg-white p-6 rounded-2xl shadow-lg h-40 flex flex-col justify-center items-center text-center">
                    <ShoppingBag className="w-8 h-8 text-orange-500 mb-2"/>
                    <span className="font-bold text-slate-700">초보 셀러<br/>환영</span>
                 </div>
                 <div className="bg-slate-900 p-6 rounded-2xl shadow-lg h-48 flex flex-col justify-center items-center text-center text-white">
                    <Rocket className="w-8 h-8 text-yellow-400 mb-2"/>
                    <span className="font-bold">매출 부스팅<br/>전략 전수</span>
                 </div>
               </div>
               <div className="space-y-4">
                 <div className="bg-primary/10 p-6 rounded-2xl shadow-lg h-48 flex flex-col justify-center items-center text-center">
                    <Users className="w-8 h-8 text-primary mb-2"/>
                    <span className="font-bold text-slate-700">1:1 맞춤<br/>컨설팅</span>
                 </div>
                 <div className="bg-white p-6 rounded-2xl shadow-lg h-40 flex flex-col justify-center items-center text-center">
                    <BarChart className="w-8 h-8 text-blue-500 mb-2"/>
                    <span className="font-bold text-slate-700">데이터 기반<br/>소싱</span>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 커리큘럼 & 영상 (권위 입증) */}
      <section className="py-20 md:py-28 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-black aspect-video group cursor-pointer">
                {/* 유튜브 썸네일/재생 버튼 느낌 */}
                <iframe 
                  src="https://www.youtube.com/embed/Rq9U75_75OU" 
                  title="나나인터내셔널 교육 영상" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
              <div className="mt-4 text-center">
                 <a href="https://www.youtube.com/@NANAINC/featured" target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-slate-600 hover:text-red-600 font-semibold transition-colors">
                    <Youtube className="w-5 h-5"/>
                    나나인터내셔널 공식 유튜브 채널 방문하기
                 </a>
              </div>
            </div>

            <div className="flex-1">
              <Badge variant="outline" className="mb-4 text-primary border-primary px-3 py-1">
                Special Curriculum
              </Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                "이론만 떠드는 강의가 아닙니다"<br/>
                <span className="text-primary">실전 셀러</span>의 노하우
              </h2>
              <div className="prose text-slate-600 mb-8">
                <p className="text-lg">
                  현재 맨투맨 제트배송 교육을 담당하는 실전 강사가 직접 강의합니다.
                  유튜브에서 다 말하지 못한 '진짜 돈 버는 정보'를 오프라인에서 확인하세요.
                </p>
              </div>
              
              <div className="space-y-4 mb-8">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">1</div>
                  <div>
                    <h4 className="font-bold text-lg">시장 분석 & 소싱</h4>
                    <p className="text-sm text-slate-500">지금 가장 핫한 키워드와 팔리는 상품 찾는 법</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">2</div>
                  <div>
                    <h4 className="font-bold text-lg">입점 및 판매 프로세스</h4>
                    <p className="text-sm text-slate-500">복잡한 서류 절차부터 상품 등록, 입고까지 완벽 가이드</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 font-bold text-primary">3</div>
                  <div>
                    <h4 className="font-bold text-lg">매출 뻥튀기 전략</h4>
                    <p className="text-sm text-slate-500">광고 없이 노출 늘리는 법 & 마진 최적화 비법</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 5. 성과 증명 & 툴 제공 (킬러 콘텐츠) */}
      <section className="py-24 bg-slate-900 text-white px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Graph Slider */}
            <div className="order-2 lg:order-1">
               <div className="mb-8">
                 <h3 className="text-3xl font-bold mb-2 flex items-center gap-3">
                   <BarChart className="w-8 h-8 text-primary" />
                   데이터가 증명하는 효과
                 </h3>
                 <p className="text-slate-400 text-lg">말뿐인 강의가 아닙니다. 실제 수강생들의 성장 그래프를 확인하세요.</p>
               </div>
               <GraphSlider />
            </div>

            {/* Right: Margin Calculator Offer */}
            <div className="order-1 lg:order-2">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] p-10 border border-slate-700 shadow-2xl relative">
                {/* 뱃지 */}
                <div className="absolute -top-4 -right-4 bg-yellow-400 text-black font-bold px-4 py-2 rounded-full shadow-lg transform rotate-3">
                  참석자 전원 무료 증정
                </div>

                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-8">
                  <Calculator className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-3xl font-bold mb-6">
                  "얼마나 남을까?" 고민 끝!<br/>
                  <span className="text-blue-400">마진 계산기 엑셀</span> 제공
                </h3>
                <p className="text-slate-300 mb-8 text-lg leading-relaxed">
                  원가와 판매가만 입력하면 <span className="text-white font-bold underline decoration-blue-500">수수료, 관세, 부가세, 배송비</span>까지 
                  한 번에 계산해주는 시크릿 엑셀 파일을 무료로 드립니다.
                </p>
                
                {/* 계산기 UI 예시 */}
                <div className="bg-black/40 rounded-xl p-6 font-mono border border-slate-700/50">
                  <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-3">
                    <span className="text-slate-400">상품 원가 (CNY)</span>
                    <span className="text-white">15.0 위안</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-3">
                    <span className="text-slate-400">희망 판매가</span>
                    <span className="text-white">19,800 원</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-blue-400 font-bold text-lg">예상 순수익률</span>
                    <span className="text-blue-400 font-bold text-2xl animate-pulse">32.5%</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* 6. 오시는 길 & 최종 CTA */}
      <section className="py-20 md:py-32 px-6 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-slate-900">
              오프라인이라 가능한<br/>
              <span className="text-primary">밀착 코칭</span>을 놓치지 마세요
            </h2>
            <p className="text-slate-600 text-lg">
              부천 남부센터에서 진행되는 실전 교육, 좌석이 한정되어 있습니다.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-16">
            <div className="grid md:grid-cols-2">
               <div className="p-10 md:p-12 flex flex-col justify-center bg-slate-900 text-white">
                 <h3 className="text-2xl font-bold mb-8 flex items-center gap-2">
                   <MapPin className="w-6 h-6 text-primary"/> 오시는 길
                 </h3>
                 <div className="space-y-6">
                   <div>
                     <p className="text-sm text-slate-400 mb-1">장소</p>
                     <p className="text-lg font-medium">나나인터내셔널 부천남부센터 2층</p>
                     <p className="text-slate-400">(경기 부천시 경인로 137번가길 83)</p>
                   </div>
                   <div>
                     <p className="text-sm text-slate-400 mb-1">문의</p>
                     <p className="text-lg font-medium">카카오톡 채널 '나나인터내셔널'</p>
                   </div>
                   <Button variant="outline" className="mt-4 border-slate-600 text-black hover:bg-slate-800 hover:text-white" asChild>
                    <a href="https://map.kakao.com/?urlX=450354.0&urlY=1107039.0&name=%EA%B2%BD%EA%B8%B0%20%EB%B6%80%EC%B2%9C%EC%8B%9C%20%EA%B2%BD%EC%9D%B8%EB%A1%9C137%EB%B2%88%EA%B0%80%EA%B8%B8%2083" target="_blank" rel="noreferrer">
                      지도 보기
                    </a>
                   </Button>
                 </div>
               </div>
               {/* 지도 API 영역 대체 이미지 */}
               <div className="bg-slate-200 min-h-[300px] relative">
                  <img 
                    src="https://images.unsplash.com/photo-1524661135-423995f22d0b?w=800&h=600&fit=crop" 
                    alt="Map Location" 
                    className="w-full h-full object-cover opacity-80"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="bg-white/90 px-4 py-2 rounded-lg text-sm font-semibold shadow-sm">
                      부천역 도보 10분 거리
                    </span>
                  </div>
               </div>
            </div>
          </div>

          <div id="formArea" className="text-center">
            <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-3xl p-12 border border-primary/20">
              <h3 className="text-3xl font-bold mb-6 text-slate-900">
                지금 바로 신청하세요
              </h3>
              <p className="text-slate-600 mb-8 max-w-xl mx-auto">
                고민하는 사이 이번 달 무료 교육 신청이 마감될 수 있습니다.<br/>
                성함과 연락처만 남기면 담당자가 안내해 드립니다.
              </p>
              
              {/* 실제 폼 영역 (iframe 등) */}
              <div className="bg-white p-8 rounded-2xl shadow-sm max-w-lg mx-auto">
                 <p className="text-slate-400 mb-4 text-sm">신청 폼이 로드되는 영역입니다</p>
                 <Button className="w-full h-12 text-lg font-bold shadow-lg shadow-primary/30">
                   무료 교육 신청서 제출하기
                 </Button>
              </div>
            </div>
          </div>

        </div>
      </section>

      <ContactForm />
      <Footer />
      <ScrollToTop />
    </div>
  );
}
