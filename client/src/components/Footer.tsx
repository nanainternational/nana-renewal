export default function Footer() {
  return (
    <footer className="bg-card border-t">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div>
            <h3 className="text-lg font-bold mb-4">나나인터내셔널</h3>
            <p className="text-sm text-muted-foreground">
              온라인쇼핑몰 창업을 위한<br />
              원스톱 솔루션 제공
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4">빠른 링크</h4>
            <ul className="space-y-2">
              <li>
                <a href="#services" className="text-sm text-muted-foreground hover:text-foreground">
                  서비스
                </a>
              </li>
              <li>
                <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">
                  가격안내
                </a>
              </li>
              <li>
                <a href="#locations" className="text-sm text-muted-foreground hover:text-foreground">
                  센터위치
                </a>
              </li>
              <li>
                <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground">
                  문의하기
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-4">연락처</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>본사: 경기도 부천시 경인로137번가길83</li>
              <li>이메일: nanainternational@naver.com</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 나나인터내셔널. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
