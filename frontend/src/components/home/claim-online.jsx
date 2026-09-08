import { FaCheck } from "react-icons/fa6";
import { TbSearch } from "react-icons/tb";
import { AI, DNS, SSD } from "../common/icons";
import { useState } from "react";
import { useNavigate } from "react-router";
import { useLanguage } from "../../hooks/useLanguage";

export default function HeroSection() {

    const [search, setSearch] = useState("");
    const { t } = useLanguage();

    const navigate = useNavigate();

    const handleRedirectDomain = () => {
        let path = "/home";
        if (search) {
            path += `?value=${search}`
        }
        navigate(path);
    }
    
    const handleRedirectHosting = () => {
        navigate("/hosting");
    }
  return (
    <section className="claim-bg lg:mt-24 md:mt-20 mt-16">
        <div className="2xl:w-10/12 xl:w-11/12 w-full mx-auto lg:py-16 md:py-12 py-10">
            <div className="flex xl:flex-row flex-col justify-between 2xl:gap-16 xl:gap-10 gap-8">
                <div>
                    <h2 className="contact-title mb-5 !text-white">
                        {t.home.claim.title}
                    </h2>
                </div>
                <div className="claim-right 2xl:w-3/5 xl:w-3/4 w-full">
                    <p className="md:w-3/4 w-full">
                        {t.home.claim.description}<br/>
                        <span className="text-[#C7BCFE] font-medium">
                            {t.home.claim.highlight}
                        </span>
                    </p>

                    {/* Search Bar */}
                    <div className="flex items-center w-full">
                        <div className="w-full md:max-w-4xl">
                            {/* Input Section */}
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex sm:flex-row flex-col items-center gap-3 w-full">
                                    <input
                                        type="text"
                                        placeholder={t.home.claim.placeholder}
                                        className="search-input home-search"
                                        onChange={(e) => setSearch(e.target.value?.trim())}
                                        value={search}
                                    />
                                    <button type="button" onClick={handleRedirectDomain} className="btn-white disabled:opacity-50 disabled:!cursor-not-allowed gap-2" >
                                        <TbSearch size={16} />
                                        {t.home.claim.button}
                                    </button>
                                </div>
                            </div>
    
                            {/* Features */}
                            <div className="flex md:flex-row flex-col-reverse md:items-center mt-4">
                                <div className="flex sm:flex-wrap sm:flex-row flex-col gap-4 text-13 text-lightgray-500 dark:text-gray-500">
                                    {t.home.claim.features.map((item, idx) => (
                                        <div className="flex items-center gap-2 text-light-purple/70 font-medium" key={item + idx}>
                                            <FaCheck />
                                            {item}
                                        </div>
                                    ))}
                                </div>
                                  <button type="button" onClick={handleRedirectHosting} className="text-white dark:text-gray-500 text-15 font-medium 2xl:ml-24 lg:ml-10 mb-3 cursor-pointer">{t.home.claim.needHosting}</button>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Feature Pills */}
                    <div className="w-full">
                        <div className="flex flex-wrap gap-2">
                            {t.home.claim.pills.map((pill, idx) => (
                                <div className="feature-pills" key={pill + idx}>
                                    <img src={idx === 0 ? AI : idx === 1 ? DNS : SSD} alt={pill} className="text-tealdark w-6 h-6" />
                                    {pill}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>       
    </section>
  );
}
