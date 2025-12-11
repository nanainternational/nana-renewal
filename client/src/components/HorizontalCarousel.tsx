import { useEffect, useRef } from "react";

interface CarouselImage {
  src: string;
  alt: string;
}

interface HorizontalCarouselProps {
  images: CarouselImage[];
  direction?: "left" | "right";
}

export default function HorizontalCarousel({ images, direction = "left" }: HorizontalCarouselProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollElement = scrollRef.current;
    if (!scrollElement) return;

    let animationId: number;
    let scrollPosition = 0;
    const speed = direction === "left" ? 1 : -1;

    const animate = () => {
      scrollPosition += speed;
      
      if (direction === "left" && scrollPosition >= scrollElement.scrollWidth / 2) {
        scrollPosition = 0;
      } else if (direction === "right" && scrollPosition <= 0) {
        scrollPosition = scrollElement.scrollWidth / 2;
      }
      
      scrollElement.scrollLeft = scrollPosition;
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationId);
  }, [direction]);

  const doubledImages = [...images, ...images];

  return (
    <div className="overflow-hidden">
      <div 
        ref={scrollRef}
        className="flex gap-6 overflow-x-hidden"
        style={{ scrollBehavior: "auto" }}
      >
        {doubledImages.map((image, index) => (
          <div
            key={index}
            className="flex-shrink-0 w-64 h-64 rounded-xl overflow-hidden"
          >
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
