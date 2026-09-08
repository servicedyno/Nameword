import { FaCheck } from "react-icons/fa6";
import { webHosting, proDesign, payDollar, moneyBack } from "../common/icons";
import { HiOutlineSupport } from "react-icons/hi";
import { LuUsersRound } from "react-icons/lu";
import { useNavigate } from "react-router";
import { useLanguage } from "../../hooks/useLanguage";

export default function StartWithDomain() {
    const navigate = useNavigate()
    const { t } = useLanguage();

    const handleRedirectHosting = () => {
        navigate("/hosting");
    }
  return (
    <section className="lg:my-24 md:my-20 my-16 xl:w-10/12 w-full mx-auto" id="services">
        <h2 className="contact-title mb-14 lg:pl-16 sm:w-auto w-11/12">
            {t.home.extendLaunch.title}
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-14">
          {/* Left Card */}
            <div className="w-full">
                <div className="lunch-card w-full">
                    <img
                        src={webHosting}
                        alt="Web Hosting"
                        className="w-full object-cover h-full"
                    />
                </div>
                <div className="lunch-card-content bg-light-green dark:bg-gray-800">
                    <div className="flex flex-col gap-5 max-w-lg">
                        <h3>{t.home.extendLaunch.hosting.title}</h3>
                        <p>{t.home.extendLaunch.hosting.description}</p>
                        <div className="flex flex-wrap md:flex-row flex-col gap-4 text-13 text-lightgray-500 dark:text-white w-full">
                            {t.home.extendLaunch.hosting.features.map((item, idx) => (
                                <div className="flex items-center gap-2 text-[#3D5656] dark:text-white/70 font-medium" key={item + idx}>
                                    <FaCheck />
                                    {item}
                                </div>
                            ))}
                        </div>
                          <button className="btn-green-lunch" type="button" onClick={handleRedirectHosting} >
                            {t.home.extendLaunch.hosting.cta}
                        </button>
                    </div>
                </div>
            </div>

            {/* Right Card */}
            <div className="w-full">
                <div className="lunch-card w-full">
                    <img
                        src={proDesign}
                        alt="Web Hosting"
                        className="w-full object-cover h-full"
                    />
                </div>
                <div className="lunch-card-content bg-light-purple dark:bg-gray-800">
                    <div className="flex flex-col gap-5 max-w-lg">
                        <h3>{t.home.extendLaunch.design.title}</h3>
                        <p>{t.home.extendLaunch.design.description}</p>
                        <div className="flex flex-wrap md:flex-row flex-col gap-4 text-13 text-lightgray-500 dark:text-white w-full">
                            {t.home.extendLaunch.design.features.map((item, idx) => (
                                <div className="flex items-center gap-2 text-[#565176] dark:text-white/70 font-medium" key={item + idx}>
                                    <FaCheck />
                                    {item}
                                </div>
                            ))}
                        </div>
                        <button className="btn-purple-lunch">
                            {t.home.extendLaunch.design.cta}
                        </button>
                    </div>
                </div>
            </div>            
        </div>

        <div className="flex lg:flex-row flex-col lg:items-center justify-center xl:gap-10 lg:gap-4">
            {t.home.extendLaunch.highlights.map((item, idx) => (
                <div className="feature-bg" key={item + idx}>
                    {idx === 0 && <img src={payDollar} alt={item} className="text-tealdark w-6 h-6" />}
                    {idx === 1 && <img src={moneyBack} alt={item} className="text-tealdark w-6 h-6" />}
                    {idx === 2 && <HiOutlineSupport className="text-tealdark w-6 h-6" />}
                    {idx === 3 && <LuUsersRound className="text-tealdark w-6 h-6" />}
                    <p>{item}</p>
                </div>
            ))}
        </div>
    </section>
  );
}
