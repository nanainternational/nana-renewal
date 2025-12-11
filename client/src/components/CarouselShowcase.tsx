import HorizontalCarousel from "./HorizontalCarousel";
import photo from "@assets/generated_images/Photography_studio_space_939d8944.png";
import delivery from "@assets/generated_images/Delivery_logistics_boxes_2caff4f9.png";
import education from "@assets/generated_images/Education_training_session_c53131b8.png";
import meeting from "@assets/generated_images/Team_meeting_room_0e69a7c5.png";
import workstation from "@assets/generated_images/Individual_workstation_bc819a4e.png";
import inventory from "@assets/generated_images/Product_inventory_shelves_bc95fc02.png";

const row1Images = [
  { src: photo, alt: "제품 촬영 공간" },
  { src: meeting, alt: "회의실" },
  { src: workstation, alt: "개인 작업공간" },
  { src: inventory, alt: "재고 관리" },
  { src: photo, alt: "스튜디오" },
];

const row2Images = [
  { src: delivery, alt: "택배 서비스" },
  { src: education, alt: "교육 프로그램" },
  { src: meeting, alt: "팀 미팅" },
  { src: workstation, alt: "워크스테이션" },
  { src: inventory, alt: "상품 진열" },
];

export default function CarouselShowcase() {
  return (
    <section className="py-12 md:py-8 bg-background overflow-hidden">
      <div className="mb-12 text-center px-4">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
          나나인터내셔널의 시설
        </h2>
        <p className="text-lg text-muted-foreground">
          업계 최대 규모의 시설과 서비스
        </p>
      </div>

      <div className="space-y-8">
        <HorizontalCarousel images={row1Images} direction="left" />
        <HorizontalCarousel images={row2Images} direction="right" />
      </div>
    </section>
  );
}
