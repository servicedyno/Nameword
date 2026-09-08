import { IoClose } from "react-icons/io5";
import { useEffect, useState } from "react";
import { IoIosArrowBack } from "react-icons/io";
import { NavLink } from "react-router";
import { MdCheck } from "react-icons/md";
import { useLanguage } from "../../hooks/useLanguage";

const TransferCompleteModal = ({ onClose }) => {
    const { t } = useLanguage();
    const [progress, setProgress] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                return prev + 1;
            });
        }, 100); // speed
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-600/80">
            <div className="modal-dialog">
                {/* Close Button */}
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black">
                    <IoClose className='text-primary dark:text-gray-500' size={30} />
                </button>

                {progress < 100 ? (
                    <>
                        {/* Progress line */}
                        <div div className="text-center my-10">
                            <h2 className="text-lg font-medium text-primary dark:text-white mb-5">{t.admin.transferInProgress}</h2>

                            <div className="relative max-w-md mx-auto">
                                {/* progress bar background */}
                                <div className="w-full bg-progressbar rounded-full h-2.5">

                                    {/* progress bar */}
                                    <div className="bg-darkbtn h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }}
                                    ></div>
                                </div>

                                {/* percentage number */}
                                <span className="absolute -bottom-6 font-medium text-13 text-primary dark:text-white transition-all" style={{ left: `${progress}%`, transform: "translateX(-50%)" }}>
                                    {progress}%
                                </span>
                            </div>
                        </div>
                    </>
                ) : (
                    <>
                        {/* success message */}
                        <div className="flex items-center justify-center flex-col text-center my-10">
                            <div className="rounded-icon-bg">
                                <MdCheck size={24} className='text-darkbtn dark:text-white' />
                            </div>
                            <h2 className="text-lg font-medium text-primary dark:text-white">{t.admin.transferComplete}</h2>

                            <div className="text-13 font-medium text-primary dark:text-white">
                                {t.admin.waitTwoHoursForTransfer}
                            </div>

                            <div className="mt-5 flex items-center admin-btn gap-2 justify-center">
                                <button className="add-to-cart" >
                                    {t.admin.gotIt}
                                </button>
                            </div>
                        </div>
                    </>
                )}

            </div>
        </div >
    )
}

export default TransferCompleteModal