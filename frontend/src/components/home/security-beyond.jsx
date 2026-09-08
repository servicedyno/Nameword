import { useNavigate } from "react-router";
import { lock, certificates, Privacy, Hostingplans, security1, privacy1, hosting1 } from "../common/icons";
import { useLanguage } from "../../hooks/useLanguage";

export default function SecurityBeyond() {
    const navigate = useNavigate()
    const { t } = useLanguage();

    const handleRedirectHosting = () => {
        navigate("/hosting");
    }
    return (
        <section className="search-section w-full !py-20 !min-h-auto">
            <img
                src={lock}
                alt="globe"
                title="globe"
                className="globe-image dark:opacity-5"
            />
            <div className="xl:w-10/12 w-full mx-auto gap-12 flex xl:flex-row flex-col-reverse items-end">

                {/* Left Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {t.home.security.cards.map((card, idx) => (
                        <div className='contact-card !rounded-xl relative !gap-0' key={card.title + idx}>
                            <img src={idx === 0 ? security1 : idx === 1 ? privacy1 : hosting1} alt={card.title} title={card.title} className="dark-mode" />
                            <img src={idx === 0 ? certificates : idx === 1 ? Privacy : Hostingplans} alt={card.title} title={card.title} className="bg-transparent" />

                            <div className="flex flex-col justify-between h-full gap-3 lg:mt-28 md:mt-20 mt-8">

                                <div className="flex flex-col gap-3">
                                    <p>{card.title}</p>
                                    <p className="!text-base">{card.description}</p>
                                </div>

                                {idx === 2 ? (
                                    <a onClick={handleRedirectHosting} className="text-base font-medium text-tealdark hover:underline cursor-pointer">
                                        {card.cta}
                                    </a>
                                ) : (
                                    <a className="text-base font-medium text-tealdark hover:underline cursor-pointer">
                                        {card.cta}
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Right Content */}
                <div className="xl:max-w-md w-full">
                    <h2 className="contact-title mb-6">
                        {t.home.security.title}
                    </h2>

                    <p className="text-lg text-primary dark:text-lightgray font-medium">
                        {t.home.security.description}
                    </p>
                </div>
            </div>
        </section>
    );
}
