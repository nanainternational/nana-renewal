"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  ArrowRight,
  Building2,
  Check,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import StartupCenter from "./StartupCenter";

const growthSteps = [
  {
    threshold: "월평균 500건 이상",
    support: "6개월 추가 지원",
    description: "최근 3개월 월평균 출고량 기준",
    icon: TrendingUp,
    accent: "from-sky-500 to-blue-600",
    iconBg: "bg-sky-50 text-sky-600",
  },
  {
    threshold: "월평균 1,000건 이상",
    support: "12개월 추가 지원",
    description: "최근 3개월 월평균 출고량 기준",
    icon: TrendingUp,
    accent: "from-blue-500 to-cyan-600",
    iconBg: "bg-blue-50 text-blue-600",
  },
  {
    threshold: "월평균 1,500건 이상",
    support: "12개월 추가 지원",
    extra: "사무실 1단계 업그레이드",
    description: "최근 3개월 월평균 출고량 기준",
    icon: Sparkles,
    accent: "from-cyan-500 to-teal-600",
    iconBg: "bg-teal-50 text-teal-600",
  },
  {
    threshold: "월평균 2,000건 이상",
    support: "12개월 추가 지원",
    extra: "사무실 2단계 업그레이드",
    description: "최근 3개월 월평균 출고량 기준",
    icon: Trophy,
    accent: "from-teal-500 to-emerald-600",
    iconBg: "bg-emerald-50 text-emerald-600",
  },
];

const officeGrades = ["1인실 내측", "1인실 창측", "1~2인실 내측", "3~4인실"];

function GrowthSupportProject() {
  return (
    <section className="py-20 md:py-24 bg-gradient-to-b from-[#f7fbff] via-white to-white border-y border-blue-100/70">
      <div className="max-w-7xl mx-auto px-4 md:px-8">
        <div className="text-center max-w-4xl mx-auto mb-12 md:mb-16">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-primary px-4 py-2 text-sm font-black mb-5 border border-blue-100">
            <Sparkles className="w-4 h-4" />
            성장지원 프로젝트
          </span>

          <h2 className="text-3xl md:text-5xl font-black text-gray-950 tracking-[-0.04em] mb-5 break-keep">
            처음 3개월은 함께 시작하고,
            <br className="hidden md:block" />
            <span className="text-primary">성장할수록 지원도 커집니다.</span>
          </h2>

          <p className="text-base md:text-xl text-gray-600 leading-relaxed break-keep">
            선정된 입주사는 먼저 <strong className="text-gray-900">3개월간 사무실을 무료 지원</strong>받습니다.
            <br className="hidden md:block" />
            이후 지원기간이 끝날 때마다 <strong className="text-gray-900">최근 3개월 월평균 출고량</strong>으로 동일하게 재평가합니다.
          </p>
        </div>

        <div className="rounded-3xl border border-blue-100 bg-white shadow-xl shadow-blue-950/5 overflow-hidden mb-8">
          <div className="grid lg:grid-cols-[280px_minmax(0,1fr)]">
            <div className="relative overflow-hidden bg-gradient-to-br from-[#172554] via-[#1e3a8a] to-primary p-8 md:p-10 text-white flex flex-col justify-between min-h-[260px]">
              <div className="absolute -right-12 -top-12 w-44 h-44 rounded-full bg-white/10" />
              <div className="absolute -left-12 -bottom-16 w-52 h-52 rounded-full bg-cyan-400/10" />

              <div className="relative z-10">
                <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black mb-5">
                  STEP 01
                </span>
                <h3 className="text-3xl font-black mb-3">기본 지원</h3>
                <p className="text-white/75 leading-relaxed break-keep">
                  시작 규모와 관계없이 선정된 사업자는 동일한 출발선에서 성장 미션을 시작합니다.
                </p>
              </div>

              <div className="relative z-10 mt-8">
                <div className="text-sm text-white/60 mb-1">선정 시</div>
                <div className="text-4xl font-black text-[#FEE500]">3개월 무료 지원</div>
              </div>
            </div>

            <div className="p-5 sm:p-7 md:p-9">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {growthSteps.map((step, index) => {
                  const Icon = step.icon;
                  return (
                    <div
                      key={step.threshold}
                      className="relative rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden flex flex-col min-h-[250px]"
                    >
                      <div className={`h-2 bg-gradient-to-r ${step.accent}`} />
                      <div className="p-5 flex flex-col flex-1">
                        <div className="flex items-center justify-between mb-5">
                          <div className={`w-11 h-11 rounded-xl ${step.iconBg} flex items-center justify-center`}>
                            <Icon className="w-6 h-6" />
                          </div>
                          <span className="text-xs font-black text-gray-300">0{index + 2}</span>
                        </div>

                        <div className="text-sm text-gray-400 mb-1">최근 3개월 기준</div>
                        <h4 className="text-xl font-black text-gray-950 mb-4 break-keep">
                          {step.threshold}
                        </h4>

                        <div className="mt-auto rounded-xl bg-gray-50 px-4 py-4">
                          <div className="font-black text-gray-900">{step.support}</div>
                          {step.extra && (
                            <div className="mt-2 flex items-start gap-2 text-sm font-black text-primary break-keep">
                              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
                              {step.extra}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="mt-5 text-sm text-gray-500 leading-relaxed break-keep">
                ※ 지원기간은 중복 합산되지 않으며, 재평가 시 달성한 <strong className="text-gray-700">최고 기준 1개</strong>가 적용됩니다.
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_360px] gap-6 items-stretch">
          <div className="rounded-3xl border border-gray-200 bg-white p-6 md:p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-7">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-primary flex items-center justify-center">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-primary mb-1">OFFICE LEVEL UP</p>
                <h3 className="text-2xl md:text-3xl font-black text-gray-950">사무실 업그레이드 단계</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 sm:gap-2 items-stretch">
              {officeGrades.map((grade, index) => (
                <div key={grade} className="flex sm:block items-center gap-2">
                  <div className="flex-1 h-full rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50/60 p-5 text-center min-h-[126px] flex flex-col items-center justify-center">
                    <span className="w-8 h-8 rounded-full bg-primary text-white text-xs font-black flex items-center justify-center mb-3">
                      {index + 1}
                    </span>
                    <span className="font-black text-gray-900 break-keep">{grade}</span>
                  </div>
                  {index < officeGrades.length - 1 && (
                    <div className="sm:hidden text-primary flex-shrink-0">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="hidden sm:flex items-center justify-around px-[10%] -mt-[77px] mb-[58px] pointer-events-none">
              <ArrowRight className="w-5 h-5 text-blue-300" />
              <ArrowRight className="w-5 h-5 text-blue-300" />
              <ArrowRight className="w-5 h-5 text-blue-300" />
            </div>

            <p className="mt-6 text-sm md:text-base text-gray-600 leading-relaxed break-keep">
              1,500건·2,000건 기준을 달성했다고 판단되면 <strong className="text-gray-900">센터장에게 확인을 요청</strong>해주세요.
              실제 출고량 확인 후 현재 지원 사무실을 기준으로 업그레이드가 적용되며, 공실 상황에 따라 순차적으로 진행됩니다.
            </p>
          </div>

          <div className="rounded-3xl bg-gray-950 text-white p-6 md:p-8 flex flex-col justify-between overflow-hidden relative">
            <div className="absolute -right-16 -bottom-16 w-48 h-48 rounded-full bg-primary/20 blur-2xl" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6">
                <Users className="w-6 h-6 text-[#FEE500]" />
              </div>
              <h3 className="text-2xl font-black mb-4">지원 종료 때마다 동일 재평가</h3>
              <p className="text-white/70 leading-relaxed break-keep">
                최초 3개월 이후뿐 아니라 6개월·12개월 추가 지원이 끝나는 시점에도 같은 기준으로 다시 평가합니다.
              </p>
            </div>

            <div className="relative z-10 mt-8 space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#FEE500] mt-0.5 flex-shrink-0" />
                <span>최근 3개월 월평균 출고량으로 재평가</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#FEE500] mt-0.5 flex-shrink-0" />
                <span>추가 지원기간과 사무실 등급 모두 다시 적용</span>
              </div>
              <div className="flex items-start gap-2">
                <Check className="w-4 h-4 text-[#FEE500] mt-0.5 flex-shrink-0" />
                <span>이전 평가 결과가 자동으로 유지되지는 않음</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function StartupCenterWithGrowthSupport() {
  const [portalNode, setPortalNode] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const costComparison = document.getElementById("cost-comparison");
    const parent = costComparison?.parentElement;

    if (!costComparison || !parent) return;

    const existing = document.getElementById("growth-support-project-anchor");
    if (existing) {
      setPortalNode(existing);
      return;
    }

    const anchor = document.createElement("div");
    anchor.id = "growth-support-project-anchor";
    parent.insertBefore(anchor, costComparison);
    setPortalNode(anchor);

    return () => {
      anchor.remove();
    };
  }, []);

  return (
    <>
      <StartupCenter />
      {portalNode ? createPortal(<GrowthSupportProject />, portalNode) : null}
    </>
  );
}
