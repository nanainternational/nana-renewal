import { useState } from 'react';
import { ArrowUpRight, MapPin, Phone } from 'lucide-react';
import { sellerPartners, salesChannels, logisticsCenters, logisticsPhone } from '@/data/logistics';
import './logistics-network.css';

function PartnerLogo({ name, src }: { name: string; src: string | null }) {
  const [failed, setFailed] = useState(false);
  return <div className="network-partner-logo">
    {src && !failed ? <img src={src} alt={`${name} 로고`} loading="lazy" onError={() => setFailed(true)} /> : <span aria-hidden="true">{name.slice(0, 1)}</span>}
  </div>;
}

export default function LogisticsNetwork() {
  return <>
    <section className="ng-section ng-light network-partners" id="partners" aria-labelledby="partners-title">
      <div className="ng-container">
        <span className="ng-kicker">SELLER PARTNERS</span>
        <div className="ng-section-heading">
          <h2 id="partners-title">다양한 판매 채널,<br />함께하는 셀러 파트너.</h2>
          <p>나나의 물류와 함께하는 실제 출고 브랜드.<br />셀러의 다양한 판매 활동을 지원합니다.</p>
        </div>
        <ul className="network-channels" aria-label="주요 판매 채널">
          {salesChannels.map(channel => <li key={channel}>{channel}</li>)}
        </ul>
        <ul className="network-partner-grid" aria-label="셀러 파트너">
          {sellerPartners.map(partner => <li key={partner.name}><PartnerLogo {...partner} /><h3>{partner.name}</h3></li>)}
        </ul>
      </div>
    </section>
    <section className="ng-section network-centers" id="center-info" aria-labelledby="center-info-title">
      <div className="ng-container">
        <span className="ng-kicker">LOGISTICS CENTER</span>
        <div className="ng-section-heading"><h2 id="center-info-title">가까이에서 연결하는<br />나나 물류센터.</h2><p>부천과 시흥, 두 곳의 물류 거점.<br />입고와 이용 문의는 통합센터로 연락해 주세요.</p></div>
        <div className="network-center-grid">
          {logisticsCenters.map((center, i) => <article key={center.name}>
            <div className="network-center-top"><span>0{i + 1} / {center.city}</span><MapPin size={24} strokeWidth={1.4} /></div>
            <h3>{center.name}</h3><address>{center.address}</address>
            <a href={`https://map.naver.com/p/search/${encodeURIComponent(center.address)}`} target="_blank" rel="noreferrer">지도에서 위치 보기<ArrowUpRight size={16} /></a>
          </article>)}
        </div>
        <div className="network-phone"><span><Phone size={19} />물류 통합센터</span><a href={`tel:${logisticsPhone}`}>{logisticsPhone}<ArrowUpRight size={21} /></a></div>
      </div>
    </section>
  </>;
}
