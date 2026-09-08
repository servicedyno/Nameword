import { NavLink } from "react-router";
import { useState } from "react";
import { IoCheckmarkOutline, IoClose } from "react-icons/io5";
import { googleAuthenticator, telegram } from "../../../common/icons";
import { MdOutlineMail } from "react-icons/md";
import { TbSearch, TbArrowDown } from "react-icons/tb";
import { FiExternalLink } from "react-icons/fi";

import { PiListChecks } from "react-icons/pi";
import { GoUnlock } from "react-icons/go";
import { MdPassword } from "react-icons/md";
import { RxRocket } from "react-icons/rx";
import { SlEqualizer } from "react-icons/sl";
import { IoAnalyticsSharp } from "react-icons/io5";
import { useLanguage } from "../../../../hooks/useLanguage";


const WhyUseApi = () => {
    const { t } = useLanguage();

    return (
        <div className='p-8 min-h-64 flex items-center justify-center'>
            <div className='grid md:grid-cols-3 grid-cols-1 lg:gap-12 md:gap-8 gap-8'>
                <div className='flex flex-col items-center how-it-works text-center'>
                    <div className="rounded-icon-bg">
                        <RxRocket size={25} className='text-darkbtn dark:text-white' />
                    </div>
                    <p>{t.admin.launchServicesInNoTime}</p>
                    <span>{t.admin.launchServicesDescription}</span>
                </div>
                <div className='flex flex-col items-center how-it-works text-center'>
                    <div className="rounded-icon-bg">
                        <SlEqualizer size={25} className='text-darkbtn dark:text-white' />
                    </div>
                    <p>{t.admin.takeCompleteControl}</p>
                    <span>{t.admin.takeCompleteControlDescription}</span>
                </div>
                <div className='flex flex-col items-center how-it-works text-center'>
                    <div className="rounded-icon-bg">
                        <IoAnalyticsSharp size={25} className='text-darkbtn dark:text-white' />
                    </div>
                    <p>{t.admin.trackPerformanceLive}</p>
                    <span>{t.admin.trackPerformanceLiveDescription}</span>
                </div>
            </div>
        </div>
    )
}

export default WhyUseApi