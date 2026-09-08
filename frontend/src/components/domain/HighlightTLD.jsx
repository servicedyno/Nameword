import { RiGlobalLine } from 'react-icons/ri';

const HighlightTLD = ({ domain }) => {

  if (!domain) return null;

  const [name, tld] = domain.split(".");

  return (
    <h2 className='flex flex-wrap items-center card-title'>
      <RiGlobalLine className='mr-1.5 text-lg' />
      {name && <span className='text-primary dark:text-gray-500'>{name}</span>}
      {tld && <span className='text-darkbtn dark:text-white'>.{tld}</span>}
    </h2>
  )
}

export default HighlightTLD
