import { useState, useMemo } from "react";
import { HiArrowSmRight } from "react-icons/hi";
import { useLanguage } from "../../../hooks/useLanguage";

// Helper function to format answer from translation object
const formatAnswer = (answer) => {
  if (typeof answer === 'string') {
    return answer;
  }
  
  if (typeof answer === 'object' && answer !== null) {
    const parts = [];
    const listItems = [];
    
    // Handle intro text (paragraph)
    if (answer.intro) {
      parts.push(<p key="intro">{answer.intro}</p>);
    }
    
    // Collect all list items (excluding intro and conclusion)
    const excludeKeys = new Set(['intro', 'conclusion']);
    Object.keys(answer).forEach((key) => {
      if (!excludeKeys.has(key) && answer[key]) {
        const value = answer[key];
        // Check if value contains a colon (format: "Label: description")
        if (typeof value === 'string' && value.includes(':')) {
          const [label, ...rest] = value.split(':');
          listItems.push(
            <li key={key} className="list-disc list-inside">
              <strong>{label}:</strong> {rest.join(':').trim()}
            </li>
          );
        } else {
          listItems.push(
            <li key={key} className="list-disc list-inside">
              {value}
            </li>
          );
        }
      }
    });
    
    // Add list if there are items
    if (listItems.length > 0) {
      parts.push(<ul key="list">{listItems}</ul>);
    }
    
    // Handle conclusion text (paragraph)
    if (answer.conclusion) {
      parts.push(<p key="conclusion">{answer.conclusion}</p>);
    }
    
    return parts.length > 0 ? <>{parts}</> : null;
  }
  
  return answer;
};

const DiscoverDomain = () => {
    const [showDomainCard, _setShowDomainCard] = useState(false);
    const [expandedQues, setExpandedQues] = useState(null);
    const { t } = useLanguage();

    const toggleQuestion = (index) => {
        setExpandedQues(expandedQues === index ? null : index);
    };

    // Get Q&A data from translations
    const qaData = useMemo(() => {
        if (!t.helpSupport?.sections?.discoverDomain) {
            return [];
        }

        return t.helpSupport.sections.discoverDomain.map((qa) => ({
            question: qa.question,
            answer: formatAnswer(qa.answer)
        }));
    }, [t]);

    return (
        <>
            {/* title */}
            <div className='flex flex-col gap-2 title-section' >
                <h2>{t.helpSupport?.sidebar?.discoverDomain || "Discover Domains"}
                    {showDomainCard && (
                        <span className="text-secondary"> / {t.helpSupport?.common?.getStartedWithDomains || "Get started with Domains"}</span>
                    )}
                </h2>
            </div>

            {!showDomainCard && (
                <div className='w-full action-card overflow-hidden'>
                    {qaData.map((qa, index) => (
                        <div key={index} className="border-b border-stokecolor dark:border-gray-700">
                            <div 
                                className='inner-action-card cursor-pointer'
                                onClick={() => toggleQuestion(index)}
                            >
                                <p>{qa.question}</p>
                                <HiArrowSmRight 
                                    size={20} 
                                    className={`flex-none transition-transform duration-200 ${
                                        expandedQues === index ? 'rotate-90' : ''
                                    }`}
                                />
                            </div>
                            {expandedQues === index && (
                                <div className="px-5 pb-4 pt-2">
                                    <div className="text-secondary dark:text-gray-400 text-sm leading-relaxed">
                                        {typeof qa.answer === 'string' ? (
                                            <p>{qa.answer}</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {qa.answer}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </>
    )
}

export default DiscoverDomain