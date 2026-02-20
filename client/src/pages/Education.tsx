import Navigation from "@/components/Navigation";
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
  ShieldAlert,
  LineChart,
  Trophy,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { API_BASE } from "@/lib/queryClient";



type EducationFormState = {
  duplicateChecked: boolean;
  name: string;
  age: string;
  phone1: string;
  phone2: string;
  phone3: string;
  phoneConfirm1: string;
  phoneConfirm2: string;
  phoneConfirm3: string;
  region: string;
  expectedSales: string;
  question: string;
  email: string;
  agreePrivacy: boolean;
  hp: string;
};

const defaultForm: EducationFormState = {
  duplicateChecked: false,
  name: "",
  age: "",
  phone1: "",
  phone2: "",
  phone3: "",
  phoneConfirm1: "",
  phoneConfirm2: "",
  phoneConfirm3: "",
  region: "",
  expectedSales: "",
  question: "",
  email: "",
  agreePrivacy: false,
  hp: "",
};
// ✅ [설득 요소] 실제 성과를 보여주는 자동 슬라이더 (2025년 최신 사례 반영)
const GraphSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const slides = [
    {
      title: "매출 2,275% 폭등 신화",
      desc: "전직 공무원 셀러, 로켓그로스 전환 후 22배 성장 달성 (2025.11 보도)",
      // 상승 그래프 느낌의 이미지
      img: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&h=400&fit=crop&q=80",
    },
    {
      title: "연간 거래액 66조 원의 시장",
      desc: "뉴스는 시끄러워도 고객은 떠나지 않습니다. 압도적 1위 트래픽.",
      img: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&h=400&fit=crop&q=80",
    },
    {
      title: "소형 상품 수수료 인하",
      desc: "2025년 요금 개편! 작고 가벼운 상품일수록 마진 극대화.",
      img: "https://images.unsplash.com/photo-1543286386-713df548e9cc?w=800&h=400&fit=crop&q=80",
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="relative overflow-hidden rounded-3xl shadow-2xl aspect-video bg-gray-900 group border border-gray-800">
      {slides.map((slide, index) => (
        <div
          key={index}
          className={`absolute inset-0 transition-all duration-1000 ease-in-out transform ${
            index === currentIndex
              ? "opacity-100 scale-100"
              : "opacity-0 scale-105"
          }`}
        >
          <div className="absolute inset-0 bg-black/60 z-10" />
          <img
            src={slide.img}
            alt={slide.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 p-8 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
            <Badge className="mb-3 bg-red-600 text-white border-none animate-pulse">
              HOT ISSUE {index + 1}
            </Badge>
            <h4 className="text-3xl font-bold text-white mb-2 tracking-tight">
              {slide.title}
            </h4>
            <p className="text-xl text-gray-200 font-medium">{slide.desc}</p>
          </div>
        </div>
      ))}
      <div className="absolute bottom-6 right-6 z-30 flex gap-2">
        {slides.map((_, idx) => (
          <div
            key={idx}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              idx === currentIndex ? "w-8 bg-red-500" : "w-2 bg-gray-500"
            }`}
          />
        ))}
      </div>
    </div>
  );
};

function EducationApplyForm() {
  const [form, setForm] = useState<EducationFormState>(defaultForm);
  const [openPrivacy, setOpenPrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const phone = useMemo(() => [form.phone1, form.phone2, form.phone3].map((v) => v.trim()).join("-"), [form.phone1, form.phone2, form.phone3]);
  const phoneConfirm = useMemo(() => [form.phoneConfirm1, form.phoneConfirm2, form.phoneConfirm3].map((v) => v.trim()).join("-"), [form.phoneConfirm1, form.phoneConfirm2, form.phoneConfirm3]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const onChange = (key: keyof EducationFormState, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const onSubmit = async () => {
    if (submitting) return;
    if (!form.duplicateChecked || !form.name.trim() || !form.age.trim() || !form.region.trim() || !form.expectedSales.trim()) {
      setToast({ type: "error", message: "필수 항목을 모두 입력해주세요." });
      return;
    }
    if (phone.replace(/-/g, "").length < 9 || phoneConfirm.replace(/-/g, "").length < 9) {
      setToast({ type: "error", message: "연락처를 정확히 입력해주세요." });
      return;
    }
    if (phone !== phoneConfirm) {
      setToast({ type: "error", message: "연락처와 연락처 확인이 일치하지 않습니다." });
      return;
    }
    if (!form.agreePrivacy) {
      setToast({ type: "error", message: "개인정보 수집 및 이용 동의가 필요합니다." });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`${API_BASE}/api/formmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: "education",
          name: form.name.trim(),
          age: Number(form.age),
          phone,
          phoneConfirm,
          region: form.region.trim(),
          expectedSales: form.expectedSales.trim(),
          question: form.question.trim(),
          email: form.email.trim() || undefined,
          agreePrivacy: form.agreePrivacy,
          hp: form.hp,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.message || "신청 중 오류가 발생했습니다.");

      setForm(defaultForm);
      setToast({ type: "success", message: "교육 신청이 완료되었습니다. 안내 문자를 확인해주세요." });
    } catch (e: any) {
      setToast({ type: "error", message: e?.message || "신청 실패" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-3xl p-6 md:p-10 border border-red-100 shadow-lg">
      <h3 className="text-3xl font-bold mb-4 text-slate-900">교육 신청서</h3>
      <p className="text-slate-600 mb-6">아래 항목을 작성해주시면 담당자가 순차 안내드립니다.</p>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden text-left">
        <div className="grid md:grid-cols-[220px_1fr] border-b">
          <div className="bg-slate-50 p-4 font-semibold">중복참석 확인*</div>
          <div className="p-4">
            <label className="flex items-start gap-2">
              <Checkbox checked={form.duplicateChecked} onCheckedChange={(v) => onChange("duplicateChecked", Boolean(v))} />
              <span className="text-sm text-slate-700">동일 신청자의 중복 신청/지인양도/대리신청은 불가함을 확인합니다.</span>
            </label>
          </div>
        </div>

        {[["신청자 성함*","name","text"],["나이*","age","number"],["거주지역*","region","text"],["희망매출*","expectedSales","text"],["이메일(선택)","email","email"]].map(([label,key,type]) => (
          <div key={String(key)} className="grid md:grid-cols-[220px_1fr] border-b">
            <div className="bg-slate-50 p-4 font-semibold">{label}</div>
            <div className="p-4">
              <Input type={String(type)} value={(form as any)[key]} onChange={(e) => onChange(key as keyof EducationFormState, e.target.value)} />
            </div>
          </div>
        ))}

        <div className="grid md:grid-cols-[220px_1fr] border-b">
          <div className="bg-slate-50 p-4 font-semibold">연락처*</div>
          <div className="p-4 flex gap-2">
            {["phone1", "phone2", "phone3"].map((k) => <Input key={k} inputMode="numeric" value={(form as any)[k]} onChange={(e) => onChange(k as keyof EducationFormState, e.target.value.replace(/[^0-9]/g, ""))} />)}
          </div>
        </div>

        <div className="grid md:grid-cols-[220px_1fr] border-b">
          <div className="bg-slate-50 p-4 font-semibold">연락처 확인*</div>
          <div className="p-4 flex gap-2">
            {["phoneConfirm1", "phoneConfirm2", "phoneConfirm3"].map((k) => <Input key={k} inputMode="numeric" value={(form as any)[k]} onChange={(e) => onChange(k as keyof EducationFormState, e.target.value.replace(/[^0-9]/g, ""))} />)}
          </div>
        </div>

        <div className="grid md:grid-cols-[220px_1fr] border-b">
          <div className="bg-slate-50 p-4 font-semibold">강사에게 질문</div>
          <div className="p-4">
            <Textarea value={form.question} onChange={(e) => onChange("question", e.target.value)} rows={4} />
          </div>
        </div>

        <div className="grid md:grid-cols-[220px_1fr] border-b">
          <div className="bg-slate-50 p-4 font-semibold">개인정보 처리방침*</div>
          <div className="p-4 space-y-3">
            <Button type="button" variant="outline" onClick={() => setOpenPrivacy((v) => !v)}>{openPrivacy ? "접기" : "펼쳐보기"}</Button>
            {openPrivacy && (
              <div className="max-h-44 overflow-y-auto rounded border p-3 text-sm text-slate-600 whitespace-pre-line">
개인정보 수집·이용 목적: 교육 신청 접수 및 안내 연락
수집 항목: 성함, 나이, 연락처, 거주지역, 희망매출, 질문(선택), 이메일(선택)
보유 기간: 접수일로부터 1년
동의 거부 권리: 동의를 거부할 권리가 있으나 서비스 신청이 제한됩니다.
              </div>
            )}
            <label className="flex items-start gap-2">
              <Checkbox checked={form.agreePrivacy} onCheckedChange={(v) => onChange("agreePrivacy", Boolean(v))} />
              <span className="text-sm">개인정보 수집 및 이용에 동의합니다.</span>
            </label>
            <Input className="hidden" tabIndex={-1} autoComplete="off" value={form.hp} onChange={(e) => onChange("hp", e.target.value)} />
          </div>
        </div>
      </div>

      <div className="mt-5 rounded-lg bg-slate-100 p-4 text-sm text-slate-700 space-y-1 text-left">
        {[
          "행사 특성상 자녀 및 반려동물은 동반 불가합니다.",
          "교육 진행중 핸드폰은 진동으로 해주세요.",
          "신청자가 과도하게 많은 경우 일부 인원은 교육시간이 변경 되어 진행 될 수 있습니다.",
          "입장권 문자를 받은 분만 행사 참석 가능합니다.",
          "입장권 문자 지인양도/대리참석/대리신청 불가합니다.",
          "주차 불가 하오니 대중교통 이용을 부탁드립니다.",
          "교육시작 10분 전까지 입장 부탁드립니다.",
        ].map((line) => <p key={line}>• {line}</p>)}
      </div>

      <Button disabled={submitting} onClick={onSubmit} className="mt-6 w-full h-14 text-xl font-bold shadow-xl shadow-red-500/20 bg-red-600 hover:bg-red-700">
        {submitting ? "제출 중..." : "교육신청"}
      </Button>

      {toast && (
        <div className={`fixed right-4 top-24 z-50 rounded-lg px-4 py-3 text-sm text-white shadow ${toast.type === "success" ? "bg-emerald-600" : "bg-red-600"}`}>{toast.message}</div>
      )}
    </div>
  );
}

export default function Education() {
  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <Navigation />

      {/* 1. Hero Section: 위기 속 기회 강조 */}
      <section className="pt-[88px] pb-20 md:pb-32 relative overflow-hidden">
        <div className="absolute inset-0 bg-slate-900">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=1920&h=1080&fit=crop')] bg-cover bg-center opacity-20 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-900/90 to-slate-900"></div>
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 text-center pt-10">
          <Badge className="mb-8 bg-red-600 text-white hover:bg-red-700 border-none px-6 py-2 text-lg font-bold backdrop-blur-sm animate-bounce">
            🚨 선착순 무료 교육 마감 임박
          </Badge>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-8 leading-tight tracking-tight">
            "남들이 위기라고 할 때<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-orange-400">
              진짜 부자들
            </span>은 진입합니다"
          </h1>

          <p className="text-lg md:text-xl text-slate-300 mb-12 max-w-3xl mx-auto leading-relaxed">
            쿠팡 위기설? 흔들리지 않는 팩트는 단 하나.<br />
            <strong>대한민국 오픈마켓 점유율 압도적 1위</strong>는 여전히 쿠팡입니다.<br />
            경쟁자가 주춤하는 지금이, 당신이 <span className="text-white font-bold underline decoration-red-500">시장(Market Share)</span>을 장악할 유일한 기회입니다.
          </p>

          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <Button
              size="lg"
              className="text-lg px-10 h-16 rounded-full bg-red-600 hover:bg-red-700 shadow-lg shadow-red-600/30 transition-transform hover:scale-105"
              onClick={() =>
                document
                  .getElementById("formArea")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
            >
              무료 교육 신청하고 기회 잡기
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <div className="flex items-center gap-4 text-sm text-slate-400">
              <span className="flex items-center">
                <CheckCircle2 className="w-4 h-4 mr-1 text-green-500" /> 매출 22배 성장 노하우 공개
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 팩트 체크: 왜 쿠팡인가? (Why Now?) */}
      <section className="py-20 bg-white px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              데이터는 <span className="text-red-600">거짓말을 하지 않습니다</span>
            </h2>
            <p className="text-slate-600 text-lg">
              뉴스에 흔들리지 마세요. 숫자가 증명하는 확실한 기회를 확인하세요.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="p-8 border-2 border-slate-100 shadow-xl hover:-translate-y-2 transition-transform duration-300 bg-white">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <Trophy className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-slate-900">
                부동의 점유율 1위
              </h3>
              <p className="text-slate-600 leading-relaxed font-medium">
                2025년 결제 추정액 66조 원 돌파.<br />
                타 오픈마켓이 따라올 수 없는 압도적인 거래량이 당신의 매출을 보장합니다.
              </p>
            </Card>

            <Card className="p-8 border-2 border-slate-100 shadow-xl hover:-translate-y-2 transition-transform duration-300 bg-white">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                <LineChart className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-slate-900">
                2,275% 성장 신화
              </h3>
              <p className="text-slate-600 leading-relaxed font-medium">
                "전직 공무원, 로켓그로스로 인생 역전"<br />
                2025년 11월 보도된 실제 사례입니다. 로켓 뱃지의 위력은 여전히 강력합니다.
              </p>
            </Card>

            <Card className="p-8 border-2 border-red-50 shadow-xl hover:-translate-y-2 transition-transform duration-300 bg-red-50/50">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
                <ShieldAlert className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold mb-3 text-red-600">
                지금이 바로 '블루오션'
              </h3>
              <p className="text-slate-700 leading-relaxed font-bold">
                이슈로 인해 경쟁자들이 주춤하는 지금,<br />
                누구보다 빠르게 진입하여 상위 노출 자리를 선점할 절호의 타이밍입니다.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* 3. 로켓그로스 핵심 경쟁력 */}
      <section className="py-20 bg-slate-50 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-slate-900 text-white px-3 py-1">2025년 최신 업데이트</Badge>
              <h2 className="text-3xl md:text-5xl font-bold mb-6 leading-tight">
                대표님은 <span className="text-primary">선택</span>만 하세요<br />
                나머지는 쿠팡이 다 합니다
              </h2>
              <p className="text-slate-600 text-lg mb-8">
                일반 택배 배송으로는 절대 이길 수 없습니다.<br />
                로켓그로스(로켓배송) 뱃지를 다는 순간, 노출수가 3~4배 폭등합니다.
              </p>
              
              <ul className="space-y-4">
                {[
                  "2025년 요금 개편: 작고 가벼운 상품 수수료 인하",
                  "주문, 배송, 반품, CS까지 100% 자동화",
                  "까다로운 로켓배송 승인 없이 누구나 입점 가능",
                  "판매 가격 자율권 보장 (마진율 방어 가능)"
                ].map((item, idx) => (
                  <li key={idx} className="flex items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <CheckCircle2 className="w-6 h-6 text-red-500 mr-3 flex-shrink-0" />
                    <span className="font-bold text-slate-800">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="relative">
               {/* 시각적 자료: 비교 그래프 등 */}
               <div className="bg-white p-8 rounded-3xl shadow-2xl border border-slate-100">
                 <div className="flex justify-between items-end mb-6">
                    <div>
                        <p className="text-slate-500 mb-1">일반 판매자 vs 로켓그로스</p>
                        <h3 className="text-2xl font-bold">평균 노출 도달률</h3>
                    </div>
                    <span className="text-red-500 font-bold text-3xl">+350%</span>
                 </div>
                 
                 {/* 막대 그래프 시각화 */}
                 <div className="space-y-4">
                    <div>
                        <div className="flex justify-between text-sm mb-1 font-bold text-slate-700">
                            <span>로켓그로스(제트배송)</span>
                            <span>매우 높음</span>
                        </div>
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500 w-[95%]"></div>
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between text-sm mb-1 text-slate-500">
                            <span>일반 판매</span>
                            <span>낮음</span>
                        </div>
                        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-slate-400 w-[25%]"></div>
                        </div>
                    </div>
                 </div>
                 <p className="text-xs text-slate-400 mt-6 text-right">* 쿠팡 내부 데이터 및 판매자 리포트 기반</p>
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 커리큘럼 & 영상 */}
      <section className="py-20 md:py-28 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
                 <h2 className="text-3xl font-bold">현직 셀러가 알려주는 '진짜' 노하우</h2>
                 <p className="text-slate-500 mt-2">유튜브에서는 말할 수 없는 매출 비밀을 오프라인에서 공개합니다.</p>
            </div>
          <div className="flex flex-col md:flex-row gap-12 items-center">
            <div className="flex-1 w-full">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl bg-black aspect-video group cursor-pointer border-4 border-slate-900">
                <iframe 
                  src="https://www.youtube.com/embed/Rq9U75_75OU" 
                  title="나나인터내셔널 교육 영상" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                  allowFullScreen
                  className="w-full h-full"
                ></iframe>
              </div>
            </div>

            <div className="flex-1">
              <div className="space-y-6">
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 font-bold text-red-600 text-xl">1</div>
                  <div>
                    <h4 className="font-bold text-xl mb-1">경쟁 없는 키워드 소싱법</h4>
                    <p className="text-slate-600">남들이 다 파는 거 팔면 망합니다. 2025년 뜨는 키워드 찾는 법을 알려드립니다.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 font-bold text-red-600 text-xl">2</div>
                  <div>
                    <h4 className="font-bold text-xl mb-1">로켓그로스 입고 승인 프리패스</h4>
                    <p className="text-slate-600">복잡한 바코드 작업부터 입고 예약까지, 한 번에 통과하는 실무 팁.</p>
                  </div>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 font-bold text-red-600 text-xl">3</div>
                  <div>
                    <h4 className="font-bold text-xl mb-1">광고비 0원으로 노출하기</h4>
                    <p className="text-slate-600">오직 '검색 최적화(SEO)'와 '리뷰 관리'만으로 상단 먹는 비법.</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* 5. 성과 증명 & 툴 제공 */}
      <section className="py-24 bg-slate-900 text-white px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            
            {/* Left: Graph Slider (Updated Content) */}
            <div className="order-2 lg:order-1">
               <div className="mb-8">
                 <h3 className="text-3xl font-bold mb-2 flex items-center gap-3">
                   <BarChart className="w-8 h-8 text-red-500" />
                   위기설을 잠재우는 성장 그래프
                 </h3>
                 <p className="text-slate-400 text-lg">말뿐인 강의가 아닙니다. 실제 수강생들의 데이터가 증명합니다.</p>
               </div>
               <GraphSlider />
            </div>

            {/* Right: Margin Calculator Offer */}
            <div className="order-1 lg:order-2">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] p-10 border border-slate-700 shadow-2xl relative">
                <div className="absolute -top-4 -right-4 bg-yellow-400 text-black font-bold px-4 py-2 rounded-full shadow-lg transform rotate-3 animate-pulse">
                  참석자 전원 100% 무료 증정
                </div>

                <div className="w-16 h-16 bg-blue-500/20 rounded-2xl flex items-center justify-center mb-8">
                  <Calculator className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-3xl font-bold mb-6">
                  "역마진 날까 봐 겁나시나요?"<br/>
                  <span className="text-blue-400">마진 계산기 엑셀</span> 파일 제공
                </h3>
                <p className="text-slate-300 mb-8 text-lg leading-relaxed">
                  2025년 변경된 수수료 정책이 완벽 반영된 엑셀 파일 하나면,<br/>
                  <span className="text-white font-bold decoration-blue-500">원가/수수료/순수익</span> 계산이 3초 만에 끝납니다.
                </p>
                
                <div className="bg-black/40 rounded-xl p-6 font-mono border border-slate-700/50">
                  <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-3">
                    <span className="text-slate-400">상품 원가 (CNY)</span>
                    <span className="text-white">15.0 위안</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-slate-700 pb-3 mb-3">
                    <span className="text-slate-400">2025 변경 수수료</span>
                    <span className="text-red-400">- 2,500 원 (인하)</span>
                  </div>
                  <div className="flex justify-between items-center pt-2">
                    <span className="text-blue-400 font-bold text-lg">예상 순수익률</span>
                    <span className="text-blue-400 font-bold text-2xl">35.5% ▲</span>
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
              오직 <span className="text-red-600">오프라인</span>에서만<br/>
              공개하는 자료가 있습니다
            </h2>
            <p className="text-slate-600 text-lg">
              온라인에는 공개할 수 없는 민감한 소싱 리스트와 팁, 현장에서 가져가세요.
            </p>
          </div>

          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden mb-16">
            <div className="grid md:grid-cols-2">
               <div className="p-10 md:p-12 flex flex-col justify-center bg-slate-900 text-white">
                 <h3 className="text-2xl font-bold mb-8 flex items-center gap-2">
                   <MapPin className="w-6 h-6 text-red-500"/> 오시는 길
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
               <div className="bg-slate-200 min-h-[300px] relative group">
                  <img 
                    src="https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&h=600&fit=crop" 
                    alt="Office Location" 
                    className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <span className="bg-white/90 px-5 py-3 rounded-xl text-sm font-bold shadow-lg text-slate-900">
                      부천역 도보 10분 거리
                    </span>
                  </div>
               </div>
            </div>
          </div>

          <div id="formArea" className="text-center">
            <EducationApplyForm />
          </div>

        </div>
      </section>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
