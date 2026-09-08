import { IoClose } from "react-icons/io5";
import { useState } from "react";
import { PiWarningBold } from "react-icons/pi";
import { NavLink } from "react-router";
import DomainForwardingConfirmChoice from "./confirm-domain-forwarding";
import { IoIosArrowDown, IoIosArrowBack } from "react-icons/io";
import { useLanguage } from "../../../../hooks/useLanguage";

const AddDomainForwarding = ({
  onClose,
  onFinished,
  selectedDomains = [],
  mode = "add",
}) => {
  const [protocol, setProtocol] = useState("https://");
  const [redirectType, setRedirectType] = useState(2);
  const [website, setWebsite] = useState("");
  const [formError, setFormError] = useState("");
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState(null);
  const { t } = useLanguage();

  const isRemoveMode = mode === "remove";
  const applyLabel = isRemoveMode
    ? t.admin.removeDomainForwarding
    : t.admin.applyDomainForwarding;

  const handleOpenConfirm = () => {
    if (!isRemoveMode && !website.trim()) {
      setFormError(t.admin.pleaseEnterDestinationUrl);
      return;
    }

    setFormError("");
    const destination = isRemoveMode ? "" : `${protocol}${website.trim()}`;
    setConfirmPayload({
      destination,
      redirectType,
    });
    setIsConfirmOpen(true);
  };

  const handleConfirmClose = () => setIsConfirmOpen(false);

  const handleSuccess = () => {
    setIsConfirmOpen(false);
    onFinished?.();
  };

  return (
    <div className="fixed inset-0 z-50 bg-white/80 dark:bg-gray-600/80 overflow-auto py-5">
      <div className="flex items-center justify-center w-full h-full">
        <div className="modal-dialog">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-black cursor-pointer"
          >
            <IoClose className="text-primary dark:text-gray-500" size={30} />
          </button>

          <div className="flex flex-col gap-2">
            <h2 className="modal-title">
              <NavLink
                to="#"
                onClick={(e) => {
                  e.preventDefault();
                  onClose();
                }}
                className="right-link !text-darkbtn dark:!text-gray-500 mb-2"
              >
                <IoIosArrowBack /> {t.admin.back}
              </NavLink>
              {t.admin.manageDomainForwarding}
              <p className="text-15 font-medium text-secondary mt-1">
                {t.admin.updatingForwardingAffectsAll}
              </p>
            </h2>
          </div>

          {!isRemoveMode && (
            <>
              <div className="flex gap-2 items-center w-full">
                <div className="relative min-w-28">
                  <select
                    className="input-field admin-form !pt-3 !pb-4"
                    value={protocol}
                    onChange={(e) => setProtocol(e.target.value)}
                  >
                    <option value="https://">https://</option>
                    <option value="http://">http://</option>
                  </select>
                  <IoIosArrowDown
                    size={15}
                    className="absolute top-1/2 transform -translate-y-1/2 right-4 text-primary dark:text-white"
                  />
                </div>
                <div className="relative w-full">
                  <input
                    type="text"
                    className="input-field admin-form peer w-full"
                    id="website"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                  />
                  <label
                    htmlFor="website"
                    className={`absolute left-5 transition-all font-medium ${
                      website
                        ? "top-2 text-xs text-gray-600"
                        : "top-4 text-13 text-primary dark:text-gray-500 "
                    } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                  >
                    {t.admin.websiteUrl}
                  </label>
                </div>
              </div>
              {formError && (
                <p className="text-xs text-red-500 mt-2">{formError}</p>
              )}
            </>
          )}

          {isRemoveMode ? (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-stokecolor dark:border-gray-700 bg-mutebg dark:bg-gray-700 text-secondary mt-4">
              <PiWarningBold />
              <span className="text-xs font-medium">
                {t.admin.domainsWillStopForwarding}
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-start gap-2 px-4 py-2.5 rounded-md border border-stokecolor dark:border-gray-700 bg-mutebg dark:bg-gray-700 text-secondary mt-2.5">
                <PiWarningBold />
                <span className="text-xs font-medium">
                  {t.admin.connectingToHostingRemovesForwarder}
                </span>
              </div>

              <p className="font-medium text-base text-primary dark:text-gray-300 pt-3.5 pb-2.5">
                {t.admin.redirectType}
              </p>

              <div className="flex flex-col gap-2 w-full">
                <label
                  className={`flex gap-2 ${
                    redirectType === 1 ? "selected" : ""
                  }`}
                >
                  <div className="mt-1">
                    <input
                      type="radio"
                      name="redirectType"
                      checked={redirectType === 1}
                      onChange={() => setRedirectType(1)}
                      className="sr-only"
                    />

                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${
                        redirectType === 1
                          ? "border-tealdark bg-tealdark"
                          : "border-gray-400"
                      }`}
                    >
                      {redirectType === 1 && (
                        <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <p className="font-medium text-13 text-primary dark:text-gray-300">
                    {t.admin.temporary302}
                  </p>
                </label>
                <label
                  className={`flex gap-2 ${
                    redirectType === 2 ? "selected" : ""
                  }`}
                >
                  <div className="mt-1">
                    <input
                      type="radio"
                      name="redirectType"
                      checked={redirectType === 2}
                      onChange={() => setRedirectType(2)}
                      className="sr-only"
                    />

                    <div
                      className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${
                        redirectType === 2
                          ? "border-tealdark bg-tealdark"
                          : "border-gray-400"
                      }`}
                    >
                      {redirectType === 2 && (
                        <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                      )}
                    </div>
                  </div>
                  <p className="font-medium text-13 text-primary dark:text-gray-300">
                    {t.admin.permanent301}
                  </p>
                </label>
              </div>
            </>
          )}

          <div className="mt-5 flex justify-end gap-2 admin-btn">
            <button className="add-to-cart" onClick={handleOpenConfirm}>
              {applyLabel}
            </button>
          </div>

          {isConfirmOpen && (
            <DomainForwardingConfirmChoice
              onClose={handleConfirmClose}
              onSuccess={handleSuccess}
              selectedDomains={selectedDomains}
              mode={mode}
              destination={confirmPayload?.destination}
              redirectType={confirmPayload?.redirectType}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AddDomainForwarding;
