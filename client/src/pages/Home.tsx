import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import ScrollToTop from "@/components/ScrollToTop";
import SeoHead, { SITE_URL } from "@/components/SeoHead";
import HomeServices from "@/components/HomeServices";

const homeSeoSchemas = [
  { "@context": "https://schema.org", "@type": "WebSite", url: `${SITE_URL}/`, name: "나나인터내셔널 창업센터", alternateName: "나나인터내셔널" },
  { "@context": "https://schema.org", "@type": "Organization", name: "나나인터내셔널", url: `${SITE_URL}/` },
];

export default function Home() {
  return <div className="min-h-screen bg-white font-sans">
    <SeoHead title="나나인터내셔널 창업센터 | 온라인 쇼핑몰 사업 지원"
      description="온라인 쇼핑몰 창업부터 사무공간, 3PL 물류, AI 상세페이지 제작까지 온라인 셀러의 사업 운영을 지원하는 나나인터내셔널입니다."
      canonical={`${SITE_URL}/`} jsonLd={homeSeoSchemas} />
    <Navigation />
    <HomeServices />
    <Footer />
    <ScrollToTop />
  </div>;
}
