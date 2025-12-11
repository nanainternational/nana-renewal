# Design Guidelines: Nana International Website Redesign

## Design Approach
**Reference-Based Design** inspired by WeFun Corp's modern Korean business service aesthetic, adapted for a startup center and logistics platform.

## Typography System

**Font Stack:**
- Primary: Noto Sans KR (Google Fonts) - for all Korean text
- Secondary: Inter (Google Fonts) - for English/numbers
- Weights: 400 (Regular), 600 (SemiBold), 700 (Bold), 800 (ExtraBold)

**Hierarchy:**
- Hero Headline: text-5xl md:text-6xl lg:text-7xl font-extrabold
- Section Headers: text-3xl md:text-4xl lg:text-5xl font-bold
- Subsection Headers: text-2xl md:text-3xl font-semibold
- Card Titles: text-xl md:text-2xl font-semibold
- Body Text: text-base md:text-lg font-normal
- Small Text/Labels: text-sm font-medium

## Layout System

**Spacing Scale:** Use Tailwind units of 2, 4, 6, 8, 12, 16, 20, 24, 32
- Component gaps: gap-6 or gap-8
- Section padding: py-16 md:py-24 lg:py-32
- Container margins: px-4 md:px-8 lg:px-12
- Card padding: p-6 md:p-8

**Grid System:**
- Max container width: max-w-7xl mx-auto
- Hero section: Full width background with centered content (max-w-4xl)
- Feature grids: grid-cols-1 md:grid-cols-2 lg:grid-cols-4
- Pricing cards: grid-cols-1 md:grid-cols-3
- Location cards: grid-cols-1 md:grid-cols-2 lg:grid-cols-3

## Component Library

### Navigation
- Sticky header with backdrop blur (backdrop-blur-md)
- Logo on left, navigation links center, CTA button on right
- Mobile: Hamburger menu with slide-in drawer
- Height: h-16 md:h-20

### Hero Section (100vh)
- Full-viewport hero with large background image (startup center office space)
- Centered content with bold Korean headline
- Two prominent CTAs: Primary "빠른 상담받기" + Secondary "5초 만에 견적받기" (with icon)
- Subtle scroll indicator at bottom

### Horizontal Scrolling Carousel
Inspired by WeFun Corp's product showcase:
- Two rows of horizontally scrolling images
- Row 1: Startup center facilities, workspace images, meeting rooms
- Row 2: Service offerings, delivery operations, educational sessions
- Continuous auto-scroll animation in opposite directions
- Image cards: rounded-xl with subtle shadow, aspect-ratio-square
- Use overflow-hidden with horizontal scroll snap

### Service Overview Cards (4-column grid)
- Icon at top (large, 64px)
- Bold title
- Brief description text
- Hover effect: subtle lift (transform scale-105)
- Each card: rounded-2xl, p-8, shadow-lg

### Pricing Section
Three-tier pricing cards (Basic/Standard/Premium):
- Card structure: rounded-2xl, p-8, shadow-xl
- Premium card: Highlighted with border accent
- Each includes:
  - Service tier name (top)
  - Representative image (rounded-lg)
  - Pricing details in list format
  - Specifications (예산, 설비, 간식, 서비스)
  - CTA button at bottom
- Layout: grid-cols-1 md:grid-cols-3 gap-8

### 8 Strengths Grid
2x4 grid on desktop (grid-cols-1 md:grid-cols-2 lg:grid-cols-4):
- Icon + Title + Description format
- Compact cards: p-6, rounded-xl
- Highlight key services: 중국 사입, 가격 경쟁력, 정부 지원금, 마케팅, 선정산, VVIC, 쿠팡 제트배송, 포토샵 교육

### Location Section
Interactive location cards:
- Grid layout: grid-cols-1 md:grid-cols-2 lg:grid-cols-3
- Each card: Center name, full address, status badge
- Hover: Expand to show map/additional details
- "오픈예상일 미정" badge for upcoming locations

### Client Logos Grid
- Masonry-style grid showcasing 입주업체 companies
- Small logo cards: p-4, rounded-lg, subtle border
- Grid: grid-cols-3 md:grid-cols-6 lg:grid-cols-8

### Contact Form
Two-column layout on desktop:
- Left: Form fields (성명, 연락처, 이메일, 질문내용)
- Right: Contact information, location details, KakaoTalk CTA
- Form inputs: rounded-lg, border-2, p-4
- Submit button: Full-width, prominent

### Footer
- Three-column layout: Company info, Quick links, Contact
- Bottom bar: Copyright, SNS links

## Images

**Hero Section:**
- Large, high-quality image of modern startup center workspace
- Professional office environment with desks, computers, bright lighting
- Should convey productivity and collaboration

**Carousel Sections:**
- 20-30 images total across two horizontal scrolling rows
- Mix of: office spaces, delivery boxes, team meetings, individual workstations, product photography areas, educational sessions

**Pricing Cards:**
- Three representative images showing facility scale
- Basic: Small desk setup
- Standard: Medium-sized workspace with shelving
- Premium: Luxury office environment

**Service Icons:**
- Use Heroicons (via CDN) for all service/feature icons
- 8 custom icons for strength points (can use relevant Heroicons like: TruckIcon, CurrencyDollarIcon, AcademicCapIcon, etc.)

## Animations

**Use sparingly:**
- Horizontal carousel auto-scroll (smooth, continuous)
- Fade-in on scroll for section headers (once)
- Subtle hover lifts on cards (scale-105)
- Smooth transitions for navigation (backdrop blur)

**Avoid:**
- Excessive parallax effects
- Distracting background animations
- Over-the-top entrance effects

## Responsive Behavior

- Mobile-first approach
- Stack all multi-column layouts to single column on mobile
- Hero text scales down gracefully
- Horizontal carousels remain scrollable on mobile (with touch)
- Form switches to single column on mobile
- Navigation collapses to hamburger menu

## Accessibility

- All interactive elements have clear focus states (ring-2 ring-offset-2)
- Form inputs have visible labels and proper spacing
- Buttons maintain 44px minimum touch targets
- Sufficient contrast ratios throughout (will be validated with color implementation)
- Semantic HTML structure with proper heading hierarchy