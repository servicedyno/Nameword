import { useState } from "react";
import { GrNext, GrPrevious  } from "react-icons/gr";
import { quote } from "../common/icons";
import { useLanguage } from "../../hooks/useLanguage";

export default function OurClients() {
  const { t } = useLanguage();
  const testimonials = t.home.clients.testimonials
  // const testimonials = t.home.clients.testimonials.flatMap((item, idx) => ([
  //   { ...item, uid: `${idx}-a` },
  //   { ...item, uid: `${idx}-b` },
  // ]));
  const itemsPerView = 3;
  const totalPages = Math.ceil(testimonials.length / itemsPerView);
  const [index, setIndex] = useState(0);

  const prev = () => {
    setIndex((prev) => (prev === 0 ? totalPages - 1 : prev - 1));
  };

  const next = () => {
    setIndex((prev) => (prev === totalPages - 1 ? 0 : prev + 1));
  };

  return (
    <section className="xl:w-10/12 w-full mx-auto">
      <h2 className="contact-title lg:mb-16 md:mb-10 mb-8 md:max-w-md md:ml-auto">
        {t.home.clients.title}
      </h2>
      <div className="relative md:px-10 px-2">
        {/* Arrows */}
        <button
          onClick={prev}
          className="absolute left-0 hover:-left-1 top-1/2 -translate-y-1/2 text-xl text-primary dark:text-white font-medium cursor-pointer">
          <GrPrevious />
        </button>

        <button
          onClick={next}
          className="absolute right-0 hover:-right-1 top-1/2 -translate-y-1/2 text-xl text-primary dark:text-white font-medium cursor-pointer">
          <GrNext />
        </button>

        {/* Slider */}
        <div className="overflow-hidden mt-16">
          <div className="flex transition-transform duration-500 ease-in-out" style={{ transform: `translateX(-${index * 100}%)` }}>
            {testimonials.map((item, i) => (
              <div key={item.uid} className="w-full sm:w-1/2 lg:w-1/3 px-4 flex-shrink-0">
                <div className="testimonila-bg">
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <h3>
                        {item.title}
                      </h3>
                      <img src={quote} alt="" title="" className="dark-mode"/>
                    </div>

                    <hr className="border-t border-stokecolor my-5" />

                    <p className="review-text mb-6">
                      {item.content}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <img src={item.image} alt={item.name} title={item.name} className="w-12 h-12 rounded-full object-cover overflow-hidden text-xs text-center" />
                    <div>
                      <h3>
                        {item.name}
                      </h3>
                      <p className="text-15 text-gray-500 dark:text-gray-500">
                        {item.role}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Dots */}
        <div className="flex justify-center gap-3 mt-10">
          {Array.from({ length: totalPages }).map((_, dotIndex) => (
            <button
              key={`dot-${testimonials[dotIndex * itemsPerView]?.uid || dotIndex}`}
              onClick={() => setIndex(dotIndex)}
              className={`h-1.5 w-12 rounded-full transition-all duration-300 ${
                index === dotIndex ? "bg-gray-400 scale-110" : "bg-gray-200"
              }`}
            />
          ))}
        </div>

      </div>
    </section>
  );
}