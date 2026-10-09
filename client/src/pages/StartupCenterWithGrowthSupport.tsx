"use client";

import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Building2, Check, CalendarDays, Sparkles, Users } from "lucide-react";
import StartupCenter from "./StartupCenter";

const officeGrades = [
  {
    name: "1인실",
    condition: "월 1,500건 이상",
    description: "무료 지원 프로그램의 기본 사무공간",
    featured: false,
    window: false,
    wide: false,
    seats: 1,
  },
  {
    name: "1~2인실",
    condition: "월 2,000건 이상",
    description: "운영 규모에 따른 공간 안내",
    featured: false,
    window: false,
    wide: true,
    seats: 2,
  },
  {
    name: "3~4인실",
    condition: "월 3,000건 이상",
    description: "운영 규모에 따른 공간 안내",
    featured: true,
    window: false,
    wide: true,
    seats: 4,
  },
];

function RoomVisual({
  window,
  wide,
  seats,
}: {
  window: boolean;
  wide: boolean;
  seats: number;
}) {
  return (
    <div className="relative h-36 overflow-hidden bg-gradient-to-b from-[#f8fafc] to-[#eef2f7]">
      <div className="absolute inset-x-0 bottom-0 h-9 bg-[#e2e8f0]" />

      {window && (
        <div className="absolute right-5 top-5 h-16 w-24 rounded-md border-2 border-sky-100 bg-gradient-to-b from-sky-100 to-white shadow-inner">
          <div className="absolute left-1/2 top-0 h-full w-px bg-sky-200" />
          <div className="absolute left-0 top-1/2 h-px w-full bg-sky-200" />
        </div>
      )}

      <div className="absolute left-5 top-6 h-12 w-8 rounded-t-full bg-emerald-50">
        <div className="absolute left-0 top-2 h-4 w-4 -rotate-12 rounded-full bg-emerald-300" />
        <div className="absolute right-0 top-1 h-4 w-4 rotate-12 rounded-full bg-emerald-400" />
        <div className="absolute bottom-0 left-1/2 h-7 w-1 -translate-x-1/2 bg-emerald-500" />
      </div>

      <div
        className={`absolute bottom-10 left-1/2 -translate-x-1/2 rounded-md border border-slate-200 bg-white shadow-md ${
          wide ? "h-5 w-36" : "h-5 w-24"
        }`}
      />
      <div className="absolute bottom-5 left-1/2 h-6 w-1 -translate-x-1/2 bg-slate-400" />

      <div className="absolute bottom-5 left-1/2 flex -translate-x-1/2 gap-2">
        {Array.from({ length: Math.min(seats, 4) }).map((_, index) => (
          <div key={index} className="relative h-8 w-6">
            <div className="absolute left-1/2 top-0 h-5 w-5 -translate-x-1/2 rounded-t-lg bg-slate-500" />
            <div className="absolute bottom-0 left-1/2 h-4 w-1 -translate-x-1/2 bg-slate-500" />
          </div>
        ))}
      </div>
    </div>
  );
}

function GrowthSupportProject() {
  return (
    <section className="border-y border-gray-100 bg-gray-50 py-20 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <div className="mx-auto mb-12 max-w-4xl text-center md:mb-14">
          <span className="mb-5 inline-flex items-center rounded-full border border-primary/15 bg-white px-4 py-1.5 text-sm font-bold text-primary shadow-sm">
            <Sparkles className="mr-2 h-4 w-4" />
            온라인 쇼핑몰 성장지원 프로그램
          </span>
          <h2 className="mb-5 text-3xl font-bold tracking-[-0.04em] text-gray-900 md:text-5xl break-keep">
            온라인 쇼핑몰 사무실 <span className="text-primary">1년 무료 지원</span>
          </h2>
          <p className="mx-auto max-w-3xl text-base leading-relaxed text-gray-600 md:text-xl break-keep">
            사업 운영에 필요한 사무공간을 임대료 부담 없이 이용할 수 있도록 지원합니다.
            기본 1인실부터 다양한 공간을 안내해 드립니다. 지금 신청해 보세요.
          </p>
        </div>

        <div className="mb-16 grid gap-5 lg:grid-cols-[1fr_1.5fr]">
          <div className="relative overflow-hidden rounded-3xl border-2 border-primary bg-white p-7 shadow-xl shadow-primary/10 md:p-9">
            <span className="absolute right-0 top-0 rounded-bl-xl bg-primary px-4 py-1.5 text-xs font-black text-white">
              기본 지원
            </span>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Building2 className="h-7 w-7" />
            </div>
            <p className="mb-2 text-sm font-bold text-gray-500">사무실 지원 프로그램</p>
            <div className="text-5xl font-black tracking-[-0.05em] text-gray-900">12개월</div>
            <div className="mt-3 text-2xl font-black text-primary">1인실 무료 지원</div>
            <p className="mt-6 border-t border-gray-100 pt-5 text-sm leading-relaxed text-gray-600 break-keep">
              기본 1인실을 1년간 임대료 0원으로 지원합니다.
              신청서 접수 후 이용 안내를 드립니다.
            </p>
          </div>

          <div className="flex flex-col justify-center rounded-3xl border border-gray-200 bg-white p-7 shadow-sm md:p-9">
            <div className="mb-6 flex items-center gap-3">
              <CalendarDays className="h-7 w-7 text-primary" />
              <h3 className="text-xl font-black text-gray-900 md:text-2xl">지원기간 및 연장 안내</h3>
            </div>
            <div className="space-y-5">
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-bold text-gray-900">1년 무료 지원</p>
                  <p className="mt-1 text-sm text-gray-600">기본 1인실을 12개월간 임대료 없이 이용하는 프로그램입니다.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-bold text-gray-900">지원기간 종료 시 재심사</p>
                  <p className="mt-1 text-sm text-gray-600">운영 현황 등을 종합적으로 확인합니다.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Check className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <p className="font-bold text-gray-900">재심사 후 연장 가능</p>
                  <p className="mt-1 text-sm text-gray-600">연장 여부는 재심사 결과에 따라 안내됩니다.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-9 text-center">
          <span className="mb-4 inline-flex items-center rounded-full bg-white px-4 py-1.5 text-sm font-bold text-primary shadow-sm ring-1 ring-gray-100">
            사무공간 지원 기준
          </span>
          <h3 className="mb-4 text-3xl font-bold text-gray-900 md:text-4xl break-keep">
            온라인 쇼핑몰 규모에 맞는 <span className="text-primary">사무공간</span>
          </h3>
          <p className="mx-auto max-w-3xl text-base leading-relaxed text-gray-600 md:text-lg break-keep">
            기본 지원 공간은 1인실입니다.
            아래는 사업 규모에 따라 이용할 수 있는 사무공간 안내입니다.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {officeGrades.map((grade) => (
            <div
              key={grade.name}
              className={`overflow-hidden rounded-3xl bg-white shadow-sm transition-all hover:shadow-lg ${
                grade.featured ? "border-2 border-primary" : "border border-gray-200"
              }`}
            >
              {grade.featured && (
                <div className="bg-primary px-4 py-2 text-center text-xs font-black text-white">
                  넓은 사무공간 지원
                </div>
              )}
              <RoomVisual window={grade.window} wide={grade.wide} seats={grade.seats} />
              <div className="p-6">
                <p className="mb-2 text-sm font-bold text-primary">{grade.condition}</p>
                <h4 className="mb-2 text-2xl font-black text-gray-900">{grade.name}</h4>
                <p className="text-sm text-gray-600">{grade.description}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-gray-200 bg-white px-5 py-5 text-sm leading-relaxed text-gray-600 md:px-7">
          <p className="flex items-start gap-2 break-keep">
            <Users className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            신청서 접수 후 지원 여부 및 이용 가능한 사무공간을 개별 안내드립니다.
            공간 유형은 이용 현황과 공실 상황 등을 고려하여 안내됩니다.
          </p>
          <p className="mt-3 border-t border-gray-100 pt-3 font-semibold text-gray-900 break-keep">
            지원기간 종료 시 운영 현황 등을 재심사하여 연장 가능합니다.
          </p>
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
