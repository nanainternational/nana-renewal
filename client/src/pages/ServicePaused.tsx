import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import SeoHead, { SITE_URL } from "@/components/SeoHead";
import { Link } from "wouter";

const schemas: Record<string, unknown>[] = [];

export default function ServicePaused() {
  return <>
    <SeoHead title="서비스 준비 중 | 나나인터내셔널" description="현재 해당 서비스의 신규 안내와 신청을 잠시 중단했습니다." canonical={`${SITE_URL}/china-purchase`} robots="noindex, follow" jsonLd={schemas} />
    <Navigation />
    <main className="max-w-3xl mx-auto px-6 pt-40 pb-24 min-h-[60vh]">
      <h1 className="text-3xl font-bold mb-6">서비스 준비 중입니다.</h1>
      <p className="mb-3">현재 해당 서비스의 신규 안내와 신청을 잠시 중단했습니다.</p>
      <p className="mb-8">다른 서비스는 정상적으로 이용하실 수 있습니다.</p>
      <div className="flex flex-wrap gap-6 underline">
        <Link href="/">홈으로 이동</Link>
        <Link href="/logistics">3PL 안내</Link>
        <Link href="/startup-center">공유오피스 안내</Link>
      </div>
    </main>
    <Footer />
  </>;
}
