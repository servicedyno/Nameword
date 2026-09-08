import { IoClose } from "react-icons/io5";
import { PiWarningBold } from "react-icons/pi";
import { TbCopy } from "react-icons/tb";
import { copyToClipboard } from "../../utils/copyToClipboard";
import { useAlert } from "../../context/AlertContext";
import { useLanguage } from "../../hooks/useLanguage";

const GenerateApiKey = ({ onClose, createdToken }) => {
    const { t } = useLanguage();
    const { showAlert } = useAlert();

    const handleCopy = () => {
        copyToClipboard(createdToken, (message) => {
            showAlert(message, { duration: 2500, type: 'success' });
        });
    };

    return (
        <div className="fixed inset-0 z-50 bg-white/80 dark:bg-gray-600/80 overflow-auto py-5">
            <div className="flex items-center justify-center w-full h-full">
                <div className="modal-dialog">
                    {/* Close Button */}
                    <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black cursor-pointer">
                        <IoClose className='text-primary dark:text-gray-500' size={30} />
                    </button>

                    {/* Modal Title */}
                    <div className="flex flex-col gap-2">
                        <h2 className="modal-title">
                            {t.admin.generateApiKey}
                        </h2>
                    </div>

                    <div className='flex items-center justify-start gap-2 px-4 py-2.5 rounded-md border border-stokecolor dark:border-gray-700 bg-mutebg dark:bg-gray-700 text-secondary'>
                        <PiWarningBold />
                        <span className="text-xs font-medium">
                            {t.admin.copyYourKey}
                        </span>
                    </div>
                    
                    <div className='relative mt-2.5'>
                        <input type="text" name="password" className='input-field peer' id="password" value={createdToken} readOnly />
                        <button type="button" className="absolute right-5 top-5 text-primary dark:text-gray-500 cursor-pointer" onClick={handleCopy}>
                            <TbCopy size={18} />
                        </button>
                        <label htmlFor="password" className={`absolute left-5 transition-all font-medium ${createdToken ? 'top-2 text-xs text-gray-600' : 'top-4 text-13 text-primary dark:text-gray-500'} peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}>
                            {t.admin.apiKey}
                        </label>
                    </div>

                    {/* Confirm Button */}
                    <div className="mt-5 flex justify-end admin-btn">
                        <button className="add-to-cart" onClick={onClose} >
                            {t.admin.gotIt}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default GenerateApiKey