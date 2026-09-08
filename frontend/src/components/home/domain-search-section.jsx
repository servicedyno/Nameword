import { useState } from "react";

import { bgglobal, dataCenter } from "../common/icons";
import { LuKeyRound, LuGlobe } from "react-icons/lu";
import { FaCheck } from "react-icons/fa6";
import { TbSearch } from "react-icons/tb";
import { useNavigate } from "react-router";
import { useLanguage } from "../../hooks/useLanguage";

const HomeSearchDomain = () => {
    const [activeTab, setActiveTab] = useState("search");
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
        <div className="flex xl:flex-row flex-col justify-center items-center gap-5">
            <div className="search-section xl:!min-h-[80vh] !min-h-auto w-full">
                <img
                    src={bgglobal}
                    alt="globe"
                    title="globe"
                    className="globe-image dark:opacity-5"
                />

                <div className="home-search-section lg:w-3/4 w-full">
                    <h1>{t.home.hero.heading}</h1>
                    <p className="text-lg text-primary dark:text-lightgray font-medium">{t.home.hero.subheading}</p>

                    <div className="flex items-center mt-7">
                        <div className="w-full max-w-4xl">
                            {/* Tabs */}
                            <div className="hosting-tabpanel">
                                <button
                                    onClick={() => setActiveTab("search")}
                                    className={`tab-link cursor-pointer ${activeTab === "search"
                                            ? "bg-beige-200 text-primary"
                                            : "dark:text-white"
                                        }`}
                                >
                                    {t.home.hero.tabs.search}
                                </button>
                                <button
                                    onClick={() => setActiveTab("transfer")}
                                    className={`tab-link ${activeTab === "transfer"
                                            ? "bg-beige-200 text-primary"
                                            : "dark:text-white"
                                        }`}
                                >
                                    {t.home.hero.tabs.transfer}
                                </button>
                            </div>
                            {/* Input Section */}
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex sm:flex-row flex-col items-center gap-3 w-full">
                                    <input
                                        type="text"
                                        placeholder={t.home.hero.placeholder}
                                        className="search-input home-search"
                                        onChange={(e) => setSearch(e.target.value?.trim())}
                                        value={search}
                                    />
                                    <button type="button" className="btn-blue disabled:opacity-50 disabled:!cursor-not-allowed sm:!w-3xs !w-full gap-2" onClick={handleRedirectDomain}>
                                        <TbSearch size={16} />
                                        {activeTab === "search" ? t.home.hero.buttons.search : t.home.hero.buttons.transfer}
                                    </button>
                                </div>
                            </div>

                            {/* Features */}
                            <div className="flex md:flex-row flex-col-reverse md:items-center items-start mt-4 gap-2">
                                <div className="flex sm:flex-wrap sm:flex-row flex-col gap-4 text-13 text-lightgray-500 dark:text-gray-500 font-medium">
                                    {t.home.hero.features.map((feature, idx) => (
                                        <div className="flex items-center gap-2" key={feature + idx}>
                                            <FaCheck />
                                            {feature}
                                        </div>
                                    ))}
                                </div>
                                <button type="button" className="text-darkbtn dark:text-gray-500 text-15 font-medium 2xl:ml-24 lg:ml-10 cursor-pointer md:mb-0 mb-4" onClick={handleRedirectHosting}>{t.home.hero.needHosting}</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="xl:w-3xl w-full bg-domain-search p-6 rounded-lg">
                <div className="feature-bg">
                    <LuKeyRound className="text-tealdark w-6 h-6" />
                    <p>{t.home.hero.featureCards[0]}</p>
                </div>
                <div className="feature-bg">
                    <LuGlobe className="text-tealdark w-6 h-6" />
                    <p>{t.home.hero.featureCards[1]}</p>
                </div>
                <div className="feature-bg">
                    <img src={dataCenter} alt="Telegram" className="text-tealdark w-6 h-6" />
                    <p>{t.home.hero.featureCards[2]}</p>
                </div>
            </div>
        </div>
    )
}

export default HomeSearchDomain