// Carousel component for displaying famous paintings
import React from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { paintings } from '../data/paintings';

// Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const PaintingsCarousel = () => {
  return (
    <div className="w-full h-[400px] md:h-[500px] rounded-xl overflow-hidden shadow-xl mb-12">
      <Swiper
        modules={[Navigation, Pagination, Autoplay]}
        spaceBetween={30}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000 }}
        className="h-full"
      >
        {paintings.map((painting) => (
          <SwiperSlide key={painting.id}>
            <div className="relative h-full w-full">
              <img
                src={painting.imageUrl}
                alt={painting.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-8 text-white">
                <h3 className="text-2xl font-bold">{painting.title}</h3>
                <p className="text-lg opacity-90">{painting.artist}, {painting.year}</p>
                <p className="mt-2 text-sm max-w-2xl hidden md:block">{painting.description}</p>
              </div>
            </div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default PaintingsCarousel;
