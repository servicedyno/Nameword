import { globeIcon } from "../../components/common/icons";
import { TbSearch } from "react-icons/tb";
import { IoFlashOutline } from "react-icons/io5";
import { IoClose } from "react-icons/io5";
import { useLanguage } from "../../hooks/useLanguage";

const AccountInfomation = () => {
  const { t } = useLanguage();
  return (
    <div className="space-y-7">
      {/* Dashboard title */}
      <div className="flex flex-col gap-2 title-section">
        <h2>Hi, Jaden!</h2>
        <p>Complete all necessary actions on a single page.</p>
      </div>

      {/* Dashboard cards */}
      <div className="flex flex-nowrap gap-2.5 overflow-x-auto w-full">
        <div className="admin-card">
          <div className="flex items-center justify-between w-full">
            <p className="text-13 text-secondary font-medium flex items-center gap-1">
              <IoFlashOutline /> Smart Suggestion
            </p>
            <p className="text-xs text-secondary font-medium flex items-center gap-1">
              <IoClose /> Hide
            </p>
          </div>

          <p className="text-lg font-medium text-primary dark:text-gray-400">
            Protect your brand. Buy{" "}
            <span className="text-darkbtn dark:text-gray-500">
              applecommunity.com
            </span>{" "}
            right now!
          </p>

          <p className="flex items-center gap-5">
            <span className="save-lable">Save 85%</span>
            <p className="text-2xl font-medium text-tealdark flex gap-3 items-center">
              $10.99
              <span className="text-secondary line-through text-base">
                $72.99
              </span>
            </p>
          </p>

          <div className="flex items-center">
            <a href="#" className="add-to-cart">
              Buy now
            </a>
          </div>
        </div>

        <div className="admin-card">
          <div className="flex items-center justify-between w-full">
            <p className="text-13 text-secondary font-medium flex items-center gap-1">
              <IoFlashOutline /> Smart Suggestion
            </p>
            <p className="text-xs text-secondary font-medium flex items-center gap-1">
              <IoClose /> Hide
            </p>
          </div>

          <p className="text-lg font-medium text-primary dark:text-gray-400">
            Protect your brand. Buy{" "}
            <span className="text-darkbtn dark:text-gray-500">apple.br</span>{" "}
            right now!
          </p>

          <p className="flex items-center gap-5">
            <span className="save-lable">Save 11%</span>
            <p className="text-2xl font-medium text-tealdark flex gap-3 items-center">
              $18.46
              <span className="text-secondary line-through text-base">
                $22.99
              </span>
            </p>
          </p>

          <div className="flex items-center admin-btn gap-2">
            <a href="#" className="add-to-cart">
              Buy now
            </a>
            <a href="#" className="btn-outline">
              More options
            </a>
          </div>
        </div>

        {/* <div className='admin-card'>
						<div className='flex items-center justify-between w-full'>
							<p className='text-13 text-secondary font-medium flex items-center gap-1'>
								<IoFlashOutline /> Smart Suggestion
							</p>
							<p className='text-xs text-secondary font-medium flex items-center gap-1'>
								<IoClose /> Hide
							</p>
						</div>

						<p className='text-lg font-medium text-primary dark:text-gray-400'>
							Protect your brand. Buy <span className='text-darkbtn dark:text-gray-500'>applecommunity.com</span> right now!
						</p>

						<p className='flex items-center gap-5'>
							<span className='save-lable'>Save 85%</span>
							<p className="text-2xl font-medium text-tealdark flex gap-3 items-center">
								$10.99
								<span className="text-secondary line-through text-base">$72.99</span>
							</p>
						</p>

						<div className='flex items-center'>
							<a href='#' className='add-to-cart'>
								Buy now
							</a>
						</div>
					</div> */}
      </div>

      {/* register domain section */}
      <div className="register-domain-section">
        <img
          src={globeIcon}
          alt="globe"
          title="globe"
          className="globe-image dark:opacity-5"
        />

        <div className="flex flex-col w-2/3 justify-start">
          <p className="card-admin-title">{t.domain.registerNewDomain}</p>
          <div className="flex sm:flex-row flex-col items-center justify-center gap-3 w-full">
            <input
              type="text"
              placeholder={t.domain.searchPlaceholder}
              className="input-admin w-full disabled:opacity-50 disabled:!cursor-not-allowed"
            />
            <button className="btn-blue !h-12 sm:!w-14 !w-full disabled:opacity-50 disabled:!cursor-not-allowed">
              <TbSearch size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* domain list */}
      <div>
        <p className="card-admin-title">Domain List</p>
        <div className="table-card"></div>
      </div>
    </div>
  );
};

export default AccountInfomation;
