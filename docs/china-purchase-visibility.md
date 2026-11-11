# Temporary China purchase visibility change

- `shared/service-visibility.ts` controls public exposure. The original ChinaPurchase page, route, APIs, admin tools and customer order data remain intact.
- Desktop/mobile navigation, footer links/copy, service overview and the upload-page sourcing promotion are hidden while disabled. AI detail-page tools remain available.
- Direct requests to `/china-purchase` (including trailing slash, query strings and child paths) receive a 200 service-paused notice, `X-Robots-Tag: noindex, follow`, a matching meta tag and `Cache-Control: no-store`, before static files/SPA fallback. Client navigation also renders a paused notice. No permanent redirect or 410 is used because this is reversible.
- The sitemap entry is commented out. Robots.txt continues to allow crawling so crawlers can see noindex. Search removal depends on recrawling and is not immediate.
- This gates public page access; it is not a replacement for authentication. Existing authenticated APIs/order history are unchanged to preserve customer and admin operations.
- To reopen: set `CHINA_PURCHASE_ENABLED` to true, uncomment the sitemap entry, restore the home SEO description if desired, rebuild and deploy. No database migration is required.
- The startup-center URL is unchanged. Its top navigation label is now 공유오피스; 3PL is first on desktop and mobile.
