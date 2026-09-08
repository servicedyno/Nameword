import { IoCardOutline, IoClose } from "react-icons/io5";
import { PiWarningBold } from "react-icons/pi";
import { ErrorMessage, Field, Formik, Form } from "formik";
import * as Yup from 'yup';
import formatAmount from "../../utils/formatAmount";
import { useCallback } from "react";
import { walletAPI } from "../../api/walletApi";
import { useAlert } from "../../context/AlertContext";
import Loader from "../common/Loader";
import { useLanguage } from "../../hooks/useLanguage";

const WalletModal = ({ onClose }) => {
    const { t } = useLanguage();
    
    const walletTopUpSchema = Yup.object().shape({
        amount: Yup.number()
            .typeError(t.admin.amountMustBeNumber || "Amount must be a number")
            .positive(t.admin.amountMustBePositive || "Amount must be greater than 0")
            .required(t.admin.amountRequired || "Amount is required"),
    });
    const { showAlert } = useAlert();

  // Add funds to wallet
  const addFunds = useCallback(async (data) => {
    try {
      const result = await walletAPI.getDynoCheckoutUrl(data);

      return { success: true, data: result };

    } catch (err) {
      const errorMsg = err?.response?.data?.message || err?.response?.data?.errors[0]?.message || err.message || t.admin.failedToAddFundsToWallet;
      showAlert(errorMsg,{
        type: 'error',
        duration: 2500
      });
      return { success: false, error: errorMsg };
    } 
  }, [showAlert]);

  const handleFormSubmit = async (values, { setSubmitting }) => {
    setSubmitting(true);
    const response = await addFunds({ ...values});
    console.log('response: ', response);

    if (response?.success) {
      window.location.href = response?.data?.redirect_url;
      onClose();
      setSubmitting(false);
    } else {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-white/80 dark:bg-gray-600/80 overflow-auto py-5">
      <div className="flex items-center justify-center w-full h-full">
        <div className="modal-dialog">
          {/* Close Button */}
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-black">
            <IoClose className='text-primary dark:text-gray-500' size={30} />
          </button>

          {/* Modal Title */}
          <div className="flex flex-col gap-2">
            <h2 className="modal-title">
              {t.admin.topUpWallet}
              <p className="text-15 font-medium text-secondary mt-1">
                {t.admin.addMoneyToWallet}
              </p>
            </h2>
          </div>

          <Formik
            enableReinitialize
            initialValues={{
              amount: ''
            }}
            validationSchema={walletTopUpSchema}
            onSubmit={handleFormSubmit}
          >
            {({ values, errors, touched, handleChange, handleBlur, isValid, dirty, isSubmitting }) => (
              <Form>
                <div className={`relative w-full ${errors.amount && touched.amount ? "input-error" : ""}`}>
                  <Field
                    type="text"
                    id="amount"
                    name="amount"
                    className={`input-field peer w-full ${errors.amount && touched.amount ? 'border-red-500 dark:border-red-400' : 'admin-form '} disabled:cursor-not-allowed`} value={values.amount}
                    onChange={handleChange}
                    onBlur={handleBlur}
                  />
                  <label
                    htmlFor="amount"
                    className={`absolute left-5 transition-all font-medium ${values.amount
                      ? 'top-2 text-xs text-gray-600'
                      : 'top-4 text-13 text-primary dark:text-gray-500'
                      } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                  >
                    {t.admin.amount}
                  </label>
                  <ErrorMessage name="amount" component="p" className="text-warning pl-5 text-xs font-medium mt-1" />
                </div>
                <div className='flex items-center justify-between gap-2 px-4 py-2.5 rounded-md border border-stokecolor dark:border-gray-700 mb-3 bg-mutebg dark:bg-gray-800 mt-2.5'>
                  <div className='flex items-center gap-2.5 text-secondary'>
                    <PiWarningBold />
                    <span className="text-xs font-medium">
                      {t.admin.walletPaymentRedirect}
                    </span>
                  </div>
                </div>

                {/* Confirm Button */}
                <div className="mt-5 flex justify-end admin-btn">
                  <button type="submit" className={`${!(isValid && dirty) ? "disable" : ""} add-to-cart`} disabled={!(isValid && dirty)}>
                    <IoCardOutline className="text-white text-base" />
                    <span>{t.admin.addAmount.replace("${amount}", formatAmount(isValid ? values.amount || 0 : 0))}</span>
                  </button>
                </div>
                {isSubmitting && <Loader />}
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div >
  )
}

export default WalletModal