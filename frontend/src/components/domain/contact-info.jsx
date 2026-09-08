import { eye, support, browser, downtime, quote } from "../common/icons";
import { useLanguage } from "../../hooks/useLanguage";

const ContactInfo = () => {
    const { t } = useLanguage();
    
    // Split the quote to handle the bold "foundation" word
    const quoteParts = t.contactInfo.quote.split('{foundation}');
    
    return (
        <div className='mt-12'>
            <div className='conatct-info p-6 lg:py-20 md:py-20 sm:py-14 py-12'>
                <div className='xl:w-10/12 w-full mx-auto'>
                    <div className='grid grid-cols-1 lg:grid-cols-5 w-full gap-6 h-full'>
                        <div className='w-full lg:col-span-2 grid grid-cols-1 gap-5 h-full'>
                            <p className='contact-title mb-5 lg:mb-5 xl:mb-5 2xl:mb-0 3xl:mb-9 sm:w-auto w-4/5'>34,224 <br/>{t.contactInfo.customersChose}<br/> <span className='text-darkbtn dark:text-white'>NameWord</span></p>

                            <div className='contact-card h-full'>
                                <img src={eye} alt={t.contactInfo.zeroHiddenFees} title={t.contactInfo.zeroHiddenFees} className="dark-mode" />
                                <p>{t.contactInfo.zeroHiddenFees}</p>
                            </div>
                        </div>
                        <div className='w-full grid grid-cols-1 gap-5 h-full'>
                            <div className='contact-card h-full'>
                                <img src={support} alt={t.contactInfo.customerSupport} title={t.contactInfo.customerSupport} className="dark-mode" />
                                <p>{t.contactInfo.customerSupport}</p>
                            </div>
                            <div className='contact-card h-full'>
                                <img src={browser} alt={t.contactInfo.intuitiveInterface} title={t.contactInfo.intuitiveInterface} className="dark-mode" />
                                <p>{t.contactInfo.intuitiveInterface}</p>
                            </div>
                        </div>
                        <div className='w-full lg:col-span-2 grid grid-cols-1 gap-5 h-full'>
                            <div className='contact-card lg:w-1/2 h-full'>
                                <img src={downtime} alt={t.contactInfo.noDowntimes} title={t.contactInfo.noDowntimes} className="dark-mode" />
                                <p>{t.contactInfo.noDowntimes}</p>
                            </div>

                            {/* <div className='testimonial relative p-3 pl-7 mt-4 pt-0 lg:mt-0 lg:pt-3'> */}
                            <div className='testimonial relative mt-4 lg:mt-0 max-lg:p-3 max-lg:pt-0 pl-7 lg:pt-0'>
                                <img src={quote} alt="" title="" className="absolute right-0 lg:right-1/5 -top-4 dark-mode" />
                                <p className="mb-3 leading-9">
                                    {quoteParts[0]}
                                    <span className='text-darkbtn dark:text-white'>{t.contactInfo.foundation}</span>
                                    {quoteParts[1]}
                                </p>
                                <span className="text-15 font-medium text-primary dark:text-gray-500">{t.contactInfo.quoteAuthor}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

    )
}

export default ContactInfo