import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { API_BASE } from "@/lib/queryClient";
import { useState } from "react";
import {
  ArrowRight,
  Boxes,
  Camera,
  Check,
  ChevronRight,
  Globe2,
  Megaphone,
  PackageCheck,
  RefreshCw,
  Send,
  ShoppingBag,
  Sparkles,
  Truck,
  Workflow,
} from "lucide-react";

type SurveyFormState = {
  name: string;
  phone: string;
  email: string;
  sellerStatus: string;
  interests: string[];
  message: string;
  agreePrivacy: boolean;
  hp: string;
};

const defaultForm: SurveyFormState = {
  name: "",
  phone: "",
  email: "",
  sellerStatus: "",
  interests: [],
  message: "",
  agreePrivacy: false,
  hp: "",
};

const programs = [
  {
    key: "자사몰 직접 만들기",
    title: "자사몰 직접 만들기",
    description:
      "플랫폼에만 의존하지 않고 내 쇼핑몰을 직접 만들고 운영하는 방법",
    icon: Globe2,
  },
  {
    key: "상품 소싱·중국 사입",
    title: "상품 소싱 · 중국 사입",
    description:
      "상품 찾기부터 거래처 확인, 샘플, 사입과 국내 입고까지의 실무",
    icon: Boxes,
  },
  {
    key: "상세페이지·상품 콘텐츠",
    title: "상세페이지 · 상품 콘텐츠",
    description:
      "상품 사진과 정보를 판매용 상세페이지와 콘텐츠로 만드는 방법",
    icon: Camera,
  },
  {
    key: "광고·고객 유입",
    title: "광고 · 고객 유입",
    description:
      "인스타그램, 검색광고 등 실제 고객을 쇼핑몰로 데려오는 운영 방법",
    icon: Megaphone,
  },
  {
    key: "주문·재고 자동화",
    title: "주문 · 재고 자동화",
    description:
      "반복 업무를 줄이고 주문, 재고, 상품 관리를 효율화하는 방법",
    icon: Workflow,
  },
  {
    key: "포장·배송·3PL",
    title: "포장 · 배송 · 3PL",
    description:
      "직접 발송부터 물류대행까지 규모에 맞는 출고 구조를 만드는 방법",
    icon: Truck,
  },
];

const sellerStatuses = [
  "현재 온라인 쇼핑몰 운영 중",
  "오픈 준비 중",
  "판매 경험은 있지만 현재 휴식 중",
  "아직 시작 전",
];

function EducationInterestSurvey() {
  const [form, setForm] = useState<SurveyFormState>(defaultForm);
  const [openPrivacy, setOpenPrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const updateForm = <K extends keyof SurveyFormState>(
    key: K,
    value: SurveyFormState[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleInterest = (interest: string) => {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((item) => item !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleSubmit = async () => {
    if (submitting) return;

    if (!form.name.trim() || !form.phone.trim() || !form.email.trim()) {
      setToast({
        type: "error",
        message: "이름, 연락처, 이메일을 입력해주세요.",
      });
      return;
    }

    if (form.interests.length === 0) {
      setToast({
        type: "error",
        message: "관심 있는 프로그램을 1개 이상 선택해주세요.",
      });
      return;
    }

    if (!form.agreePrivacy) {
      setToast({
        type: "error",
        message: "개인정보 수집 및 이용 동의가 필요합니다.",
      });
      return;
    }

    setSubmitting(true);

    try {
      const surveyMessage = [
        "[온라인 셀러 실무 프로그램 수요조사]",
        `현재 상태: ${form.sellerStatus || "미선택"}`,
        `관심 프로그램: ${form.interests.join(", ")}`,
        "",
        "[추가로 궁금한 내용]",
        form.message.trim() || "없음",
      ].join("\n");

      const res = await fetch(`${API_BASE}/api/formmail`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          type: "contact",
          name: form.name.trim(),
          age: null,
          phone: form.phone.trim(),
          phoneConfirm: form.phone.trim(),
          region: "온라인 셀러 실무 프로그램 수요조사",
          expectedSales: form.interests.join(", "),
          question: surveyMessage,
          email: form.email.trim(),
          agreePrivacy: form.agreePrivacy,
          hp: form.hp,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data?.ok) {
        throw new Error(data?.message || "의견 접수 중 오류가 발생했습니다.");
      }

      setForm(defaultForm);
      setToast({
        type: "success",
        message: "의견이 접수되었습니다. 준비 과정에 반영하겠습니다.",
      });
    } catch (error: any) {
      setToast({
        type: "error",
        message: error?.message || "의견 접수에 실패했습니다.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-200/40 sm:p-8 md:p-10">
      <div className="mb-8 text-center">
        <Badge className="mb-4 border-none bg-slate-900 px-4 py-1.5 text-white hover:bg-slate-900">
          1분 수요조사
        </Badge>
        <h2 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl md:text-4xl">
          어떤 실무 프로그램이 가장 궁금하신가요?
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
          여러 개 선택하셔도 됩니다. 응답이 많은 주제부터 실제 운영에 도움이 되는
          프로그램으로 준비하겠습니다.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {programs.map((program) => {
          const Icon = program.icon;
          const selected = form.interests.includes(program.key);

          return (
            <button
              key={program.key}
              type="button"
              onClick={() => toggleInterest(program.key)}
              className={`group flex min-h-[132px] w-full items-start gap-4 rounded-2xl border p-5 text-left transition-all ${
                selected
                  ? "border-slate-950 bg-slate-950 text-white shadow-lg"
                  : "border-slate-200 bg-white text-slate-900 hover:-translate-y-0.5 hover:border-slate-400 hover:shadow-md"
              }`}
            >
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                  selected
                    ? "bg-white/15 text-white"
                    : "bg-slate-100 text-slate-700"
                }`}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-black leading-snug">{program.title}</h3>
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                      selected
                        ? "border-white bg-white text-slate-950"
                        : "border-slate-300 text-transparent"
                    }`}
                  >
                    <Check className="h-4 w-4" />
                  </div>
                </div>
                <p
                  className={`mt-2 text-sm leading-relaxed ${
                    selected ? "text-white/75" : "text-slate-500"
                  }`}
                >
                  {program.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 grid gap-5 rounded-2xl bg-slate-50 p-5 sm:p-6 md:grid-cols-2">
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-800">
            이름 <span className="text-red-500">*</span>
          </label>
          <Input
            value={form.name}
            onChange={(e) => updateForm("name", e.target.value)}
            placeholder="성함을 입력해주세요"
            className="h-12 bg-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-800">
            연락처 <span className="text-red-500">*</span>
          </label>
          <Input
            value={form.phone}
            onChange={(e) =>
              updateForm("phone", e.target.value.replace(/[^0-9-]/g, ""))
            }
            placeholder="010-0000-0000"
            inputMode="tel"
            className="h-12 bg-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-800">
            이메일 <span className="text-red-500">*</span>
          </label>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => updateForm("email", e.target.value)}
            placeholder="example@email.com"
            className="h-12 bg-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-slate-800">
            현재 상태
          </label>
          <select
            value={form.sellerStatus}
            onChange={(e) => updateForm("sellerStatus", e.target.value)}
            className="h-12 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">선택해주세요</option>
            {sellerStatuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-5">
        <label className="mb-2 block text-sm font-bold text-slate-800">
          그 밖에 배우고 싶은 내용이 있다면 알려주세요
        </label>
        <Textarea
          value={form.message}
          onChange={(e) => updateForm("message", e.target.value)}
          placeholder="예: 자사몰을 만들었는데 주문·배송 자동화가 가장 궁금합니다."
          rows={4}
        />
      </div>

      <div className="mt-5 rounded-xl border border-slate-200 p-4">
        <div className="flex items-start gap-3">
          <Checkbox
            id="education-survey-privacy"
            checked={form.agreePrivacy}
            onCheckedChange={(checked) =>
              updateForm("agreePrivacy", Boolean(checked))
            }
          />
          <div className="flex-1">
            <label
              htmlFor="education-survey-privacy"
              className="cursor-pointer text-sm font-medium text-slate-700"
            >
              프로그램 준비 및 안내를 위한 개인정보 수집·이용에 동의합니다.
            </label>
            <button
              type="button"
              onClick={() => setOpenPrivacy((prev) => !prev)}
              className="ml-2 text-sm font-bold text-slate-900 underline underline-offset-2"
            >
              {openPrivacy ? "내용 닫기" : "내용 보기"}
            </button>
          </div>
        </div>

        {openPrivacy && (
          <div className="mt-4 rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
            <p>수집 목적: 온라인 셀러 실무 프로그램 수요조사 및 오픈 안내</p>
            <p>수집 항목: 이름, 연락처, 이메일, 관심 프로그램, 기타 의견</p>
            <p>보유 기간: 접수일로부터 1년</p>
            <p>
              개인정보 수집에 동의하지 않을 수 있으나, 의견 접수 및 안내가 제한될
              수 있습니다.
            </p>
          </div>
        )}

        <Input
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          value={form.hp}
          onChange={(e) => updateForm("hp", e.target.value)}
        />
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        className="mt-6 h-14 w-full bg-slate-950 text-base font-black text-white hover:bg-slate-800 sm:text-lg"
      >
        {submitting ? (
          <>
            <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
            의견 접수 중...
          </>
        ) : (
          <>
            관심 프로그램 의견 보내기
            <Send className="ml-2 h-5 w-5" />
          </>
        )}
      </Button>

      <p className="mt-3 text-center text-xs leading-relaxed text-slate-500">
        현재는 수요조사 단계이며 결제나 교육 신청이 진행되지 않습니다.
      </p>

      {toast && (
        <div
          className={`fixed right-4 top-24 z-[100] max-w-sm rounded-xl px-5 py-4 text-sm font-bold text-white shadow-2xl ${
            toast.type === "success" ? "bg-emerald-600" : "bg-slate-900"
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default function Education() {
  const scrollToSurvey = () => {
    document
      .getElementById("education-interest-survey")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900">
      <Navigation />

      <section className="relative overflow-hidden bg-slate-950 pb-20 pt-[88px] text-white md:pb-28">
        <div className="pointer-events-none absolute -left-20 top-20 h-72 w-72 rounded-full bg-blue-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-80 w-80 rounded-full bg-violet-500/15 blur-3xl" />

        <div className="relative z-10 mx-auto max-w-6xl px-4 pt-14 text-center md:px-8 md:pt-20">
          <Badge className="mb-6 border border-white/15 bg-white/10 px-4 py-2 text-white hover:bg-white/10">
            <Sparkles className="mr-2 h-4 w-4" />
            온라인 셀러 실무 프로그램 개편 중
          </Badge>

          <h1 className="mx-auto max-w-4xl text-4xl font-black leading-tight tracking-[-0.04em] sm:text-5xl md:text-6xl lg:text-7xl">
            온라인 셀러에게
            <br />
            <span className="text-[#FEE500]">지금 가장 필요한 건 무엇인가요?</span>
          </h1>

          <p className="mx-auto mt-7 max-w-3xl text-base leading-relaxed text-white/70 sm:text-lg md:text-xl">
            기존 정규 교육 프로그램은 잠시 모집을 중단했습니다.
            <br className="hidden sm:block" />
            단순한 매출 강의보다 실제 쇼핑몰 운영에 필요한 실무 프로그램을 다시
            준비하려고 합니다.
          </p>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              size="lg"
              onClick={scrollToSurvey}
              className="h-14 w-full bg-[#FEE500] px-8 font-black text-black hover:bg-[#f4dc00] sm:w-auto"
            >
              관심 프로그램 선택하기
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>

            <Button
              size="lg"
              variant="outline"
              className="h-14 w-full border-white/25 bg-white/5 px-8 font-bold text-white hover:bg-white hover:text-slate-950 sm:w-auto"
              asChild
            >
              <a href="/startup-center">
                무료 사무실 지원 보기
                <ChevronRight className="ml-1 h-5 w-5" />
              </a>
            </Button>
          </div>

          <p className="mt-6 text-sm text-white/45">
            교육 판매보다 먼저, 실제 셀러에게 필요한 내용을 듣겠습니다.
          </p>
        </div>
      </section>

      <section className="bg-white px-4 py-20 md:px-8 md:py-28">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-12 max-w-3xl text-center">
            <Badge className="mb-4 bg-slate-100 text-slate-700 hover:bg-slate-100">
              준비 방향
            </Badge>
            <h2 className="text-3xl font-black tracking-tight text-slate-950 md:text-5xl">
              돈 버는 법보다
              <br />
              <span className="text-blue-600">직접 운영할 수 있는 방법</span>
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600 md:text-lg">
              상품을 찾고, 판매 페이지를 만들고, 고객을 모으고, 주문을 처리하고,
              배송하는 과정까지 실제 사업 운영에서 반복해서 쓰는 내용을 중심으로
              구성하려고 합니다.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <Card className="border-slate-200 p-6 shadow-sm">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black">판매 기반 만들기</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                자사몰, 상품 등록, 상세페이지처럼 판매를 시작하는 데 필요한 기본
                구조를 다룹니다.
              </p>
            </Card>

            <Card className="border-slate-200 p-6 shadow-sm">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-600">
                <PackageCheck className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black">운영 효율 높이기</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                주문, 재고, CS, 포장과 발송 등 운영 과정에서 시간이 많이 드는 일을
                줄이는 방법을 다룹니다.
              </p>
            </Card>

            <Card className="border-slate-200 p-6 shadow-sm">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                <Workflow className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-black">실제 업무에 연결하기</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                단순 이론이 아니라 현재 운영 중인 쇼핑몰 업무에 바로 적용할 수 있는
                실무 중심으로 준비합니다.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-20 md:px-8 md:py-24">
        <div className="mx-auto max-w-6xl">
          <div className="grid items-center gap-10 rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:grid-cols-[1fr_0.9fr] md:p-10 lg:p-14">
            <div>
              <Badge className="mb-4 bg-[#FEE500] text-black hover:bg-[#FEE500]">
                운영 지원
              </Badge>
              <h2 className="text-3xl font-black leading-tight tracking-tight md:text-4xl">
                당분간은 교육보다
                <br />
                <span className="text-blue-600">셀러의 실제 운영 지원</span>에 집중합니다.
              </h2>
              <p className="mt-5 max-w-2xl leading-relaxed text-slate-600">
                나나인터내셔널은 사무실, 상품 촬영, 포장·발송, 물류처럼 온라인 셀러가
                매일 부딪히는 실제 운영 환경을 지원하고 있습니다. 교육 프로그램도 이
                운영 경험과 연결되는 방향으로 다시 준비합니다.
              </p>

              <Button
                className="mt-7 h-12 bg-slate-950 px-6 font-black text-white hover:bg-slate-800"
                asChild
              >
                <a href="/startup-center">
                  온라인 셀러 사무실 지원 보기
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="rounded-3xl bg-slate-950 p-6 text-white sm:p-8">
              <p className="text-sm font-bold text-[#FEE500]">NANA INTERNATIONAL</p>
              <h3 className="mt-3 text-2xl font-black leading-snug">
                공간부터 촬영,
                <br />
                포장과 발송까지
              </h3>
              <div className="mt-7 space-y-3 text-sm text-white/75">
                {[
                  "온라인 셀러 업무 공간",
                  "상품 촬영 환경",
                  "포장 및 발송 업무",
                  "3PL 및 물류 운영",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-3 rounded-xl bg-white/5 px-4 py-3"
                  >
                    <Check className="h-4 w-4 text-[#FEE500]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        id="education-interest-survey"
        className="scroll-mt-24 bg-white px-4 py-20 md:px-8 md:py-28"
      >
        <div className="mx-auto max-w-5xl">
          <EducationInterestSurvey />
        </div>
      </section>

      <Footer />
      <ScrollToTop />
    </div>
  );
}
