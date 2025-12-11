import HorizontalCarousel from '../HorizontalCarousel';
import img1 from "@assets/generated_images/Photography_studio_space_939d8944.png";
import img2 from "@assets/generated_images/Delivery_logistics_boxes_2caff4f9.png";
import img3 from "@assets/generated_images/Team_meeting_room_0e69a7c5.png";

export default function HorizontalCarouselExample() {
  const images = [
    { src: img1, alt: "Studio" },
    { src: img2, alt: "Delivery" },
    { src: img3, alt: "Meeting" },
    { src: img1, alt: "Studio 2" },
    { src: img2, alt: "Delivery 2" },
  ];

  return (
    <div className="py-8 space-y-8">
      <HorizontalCarousel images={images} direction="left" />
      <HorizontalCarousel images={images} direction="right" />
    </div>
  );
}
