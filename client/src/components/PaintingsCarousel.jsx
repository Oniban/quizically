// Carousel component for displaying famous paintings
import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay, Keyboard, A11y } from 'swiper/modules';
import { paintings } from '../data/paintings';

// Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const PaintingsCarousel = () => {
  const [swiper, setSwiper] = useState(null);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!swiper || swiper.destroyed) return;
    if (paused || reducedMotion) swiper.autoplay.stop();
    else swiper.autoplay.start();
  }, [swiper, paused, reducedMotion]);

  return (
    <section aria-label="Famous paintings" aria-roledescription="carousel" className="relative w-full h-[400px] md:h-[500px] rounded-xl overflow-hidden shadow-xl mb-12" onFocusCapture={(event) => {
      if (!event.target.closest('[data-carousel-toggle]')) setPaused(true);
      swiper?.keyboard.enable();
    }} onBlurCapture={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) swiper?.keyboard.disable();
    }}>
      <button type="button" data-carousel-toggle onClick={() => setPaused(!paused)} disabled={reducedMotion} className="absolute top-4 right-4 z-10 px-3 py-2 rounded-lg bg-black/80 text-white text-sm disabled:opacity-90">
        {reducedMotion ? 'Auto-play off: reduced motion' : paused ? 'Play slideshow' : 'Pause slideshow'}
      </button>
      <Swiper
        modules={[Navigation, Pagination, Autoplay, Keyboard, A11y]}
        onSwiper={setSwiper}
        onSliderFirstMove={() => setPaused(true)}
        spaceBetween={30}
        slidesPerView={1}
        navigation
        pagination={{ clickable: true }}
        autoplay={{ enabled: !reducedMotion, delay: 5000, pauseOnMouseEnter: true, disableOnInteraction: false }}
        speed={reducedMotion ? 0 : 300}
        keyboard={{ enabled: false, onlyInViewport: true, pageUpDown: false }}
        a11y={{ prevSlideMessage: 'Previous painting', nextSlideMessage: 'Next painting', paginationBulletMessage: 'Go to painting {{index}}' }}
        tabIndex={0}
        aria-label="Painting slides; use left and right arrow keys to browse"
        className="h-full"
      >
        {paintings.map((painting) => (
          <SwiperSlide key={painting.id}>
            <div className="relative h-full w-full">
              <img
                src={painting.imageUrl}
                alt={`${painting.title} by ${painting.artist}`}
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
    </section>
  );
};

export default PaintingsCarousel;
