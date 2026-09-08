import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import { globeIcon } from "../components/common/icons";
import { TbSearch } from "react-icons/tb";
import NoDomainAvailable from '../components/domain/no-domain-available'
import FindMoreOptions from '../components/domain/find-more-options'
import ContactInfo from '../components/domain/contact-info'
import { useLanguage } from '../hooks/useLanguage';

const NoDomain = () => {
  const { t } = useLanguage();
	return (
		<div> 
			<Navbar />
			<div className='px-5 mb-10'>
				<div className='search-section w-full'>
					<img src={globeIcon} alt="globe" title='globe' className='globe-image dark:opacity-5'/>
					{/* domain search */}
					<div className='searcharea w-full text-center'>
						<h2 className='mb-8'>{t.domain.registerNewDomain}</h2>
						<div className='max-w-2xl mx-auto relative'>
							<div className='flex sm:flex-row flex-col items-center justify-center gap-3 w-full mb-8'>
								<input
									type="text"
									placeholder={t.domain.searchPlaceholder}
									className='search-input w-full'
									value={"apple.com"}
								/>
								<button className='btn-blue sm:!w-48 !w-full'>
									<TbSearch size={14} />
								</button>
							</div>
						</div>
						
						{/* No domain availabel */}
						<NoDomainAvailable />
					</div>
				</div>

                {/* Find more options */}
                <FindMoreOptions />

                {/* contact info */}
                <ContactInfo />
			</div>
			<Footer />
		</div>
	)
}

export default NoDomain