import { quote , dataCenter, chartline } from "../common/icons";
import { LiaPrayingHandsSolid } from "react-icons/lia";
import { BiStore } from "react-icons/bi";
import { useLanguage } from "../../hooks/useLanguage";

export default function HowItWorks() {
  const { t } = useLanguage();

  return (
    <section className="w-full bg-white dark:bg-gray-900 rounded-3xl py-10 md:py-14 px-4 how-works-section mb-5">
        <div className="xl:w-10/12 w-full mx-auto gap-12 flex lg:flex-row flex-col items-end">
            <div className="lg:w-3/5 w-full">
                <h2 className="contact-title mb-12 sm:text-start text-center">
                    {t.home.howItWorks.title}
                </h2>

                <div className="space-y-4">
                    {t.home.howItWorks.steps.map((step, idx) => (
                        <div className="faq-items" key={step + idx}>
                            <span>{idx + 1}</span>
                            <p>{step}</p>
                        </div>
                    ))}
                </div>
            </div>

            <div className="relative lg:w-2/5 w-full">
                {/* Feature Badges */}
                <div className="space-y-4 mb-6">
                    <div className="feature-bg md:w-max w-full">
                        <BiStore className="text-tealdark w-6 h-6" />
                        <p>{t.home.howItWorks.highlights[0]}</p>
                    </div>
                    <div className="feature-bg md:w-max w-full">
                        <LiaPrayingHandsSolid className="text-tealdark w-6 h-6" />
                        <p>{t.home.howItWorks.highlights[1]}</p>
                    </div>
                    <div className="feature-bg md:w-max w-full">
                        <img src={chartline} alt="chartline" title="chartline" className="text-tealdark w-6 h-6" />
                        <p>{t.home.howItWorks.highlights[2]}</p>
                    </div>
                </div>

                {/* Testimonial */}
                <div className='testimonial relative p-3 pt-0 lg:mt-0 lg:pt-3'>
                    <img src={quote} alt="" title="" className="absolute right-0 -top-4 dark-mode" />
                    <p className="mb-3">
                        {t.home.howItWorks.testimonial}
                    </p>
                    <span className="text-15 font-medium text-primary dark:text-gray-500">{t.home.howItWorks.testimonialAuthor}</span>
                </div>
            </div>
        </div>
    </section>
  );
}