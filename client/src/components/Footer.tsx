import { useEffect, useState } from 'react';
import { useAdminAccess } from '@/hooks/useAdminAccess';
import { API_BASE } from '@/lib/queryClient';
import { ArrowUpRight, Phone } from 'lucide-react';
import { BLOG_ENABLED, EXTENSION_NAV_ENABLED } from '@/config/features';
import { useAuth } from '@/contexts/AuthContext';
import { logisticsPhone } from '@/data/logistics';
import './footer.css';

const serviceMenus = [
  { href: '/china-purchase', label: '중국사입' },
  { href: '/education', label: '교육' },
  { href: '/startup-center', label: '창업센터' },
  { href: '/logistics', label: '3PL' },
  ...(EXTENSION_NAV_ENABLED ? [{ href: '/extension', label: '확장프로그램' }] : []),
  { href: '/happy-call', label: '해피콜서비스' },

];
const aiMenus = [
  { href: '/ai-detail/upload', label: '직접 이미지 업로드' },
  { href: '/ai-detail/1688', label: '1688 상세페이지' },
  { href: '/ai-detail/vvic', label: 'VVIC 상세페이지' },
];

export default function Footer() {
  const { user } = useAuth();
  const { isAdmin } = useAdminAccess();
  const [collectorAllowed, setCollectorAllowed] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!isAdmin) { setCollectorAllowed(false); return; }
    fetch(API_BASE + '/api/admin/collector/access', { credentials: 'include' })
      .then(response => { if (!cancelled) setCollectorAllowed(response.ok); })
      .catch(() => { if (!cancelled) setCollectorAllowed(false); });
    return () => { cancelled = true; };
  }, [isAdmin]);
  return <footer className="site-footer">
    <div className="site-footer-container">
      <div className="site-footer-grid">
        <div className="site-footer-brand">
          <a href="/" className="site-footer-wordmark" aria-label="나나인터내셔널 홈">NANA<span>INTERNATIONAL</span></a>
          <p>셀러의 시작부터 다음 성장까지.<br />중국사입 · 3PL 물류 · AI 상세페이지</p>
          <span className="site-footer-company">나나인터내셔널</span>
        </div>
        <nav aria-label="푸터 전체 서비스 메뉴"><h2>전체 메뉴</h2>
          {serviceMenus.map(menu => <a href={menu.href} key={menu.href}>{menu.label}</a>)}
          {isAdmin && <a href="/customer-management">고객관리</a>}
          {collectorAllowed && <a href="/admin/collector">통합수집기</a>}
          {BLOG_ENABLED && <a href="/blog">블로그</a>}
        </nav>
        <nav aria-label="푸터 AI 상세페이지 메뉴"><h2>AI 상세페이지</h2>
          {aiMenus.map(menu => <a href={menu.href} key={menu.href}>{menu.label}</a>)}
          <h2 className="site-footer-account-title">내 계정</h2>
          {user ? <><a href="/mypage">마이페이지</a><a href="/cart">장바구니</a></> : <a href="/login">로그인</a>}
        </nav>
        <div className="site-footer-contact"><h2>상담 · 문의</h2>
          <a href={`tel:${logisticsPhone}`} className="site-footer-phone"><Phone size={15} />{logisticsPhone}</a>
          <a href="https://pf.kakao.com/_xmXtTs/chat" target="_blank" rel="noreferrer">카카오톡 상담<ArrowUpRight size={14} /></a>
          <a href="mailto:nanainternational@naver.com">nanainternational@naver.com</a>
          <p>본사 · 경기도 부천시 경인로137번가길 83</p>
          <a href="/logistics#center-info">물류센터 안내<ArrowUpRight size={14} /></a>
        </div>
      </div>
      <div className="site-footer-bottom"><span>© {new Date().getFullYear()} NANA INTERNATIONAL. All rights reserved.</span><a href="#" onClick={event => {event.preventDefault();window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});}}>BACK TO TOP<ArrowUpRight size={14} /></a></div>
    </div>
  </footer>;
}
