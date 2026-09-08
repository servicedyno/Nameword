import { useState, useEffect } from "react";
import { HiArrowSmRight } from "react-icons/hi";
import { useLanguage } from "../../../hooks/useLanguage";

const QASection = ({ title, qaData = [] }) => {
    const [expandedQues, setExpandedQues] = useState(0);

    useEffect(() => {
        setExpandedQues(qaData.length > 0 ? 0 : null);
    }, [qaData]);
    const { t } = useLanguage();

    const toggleQuestion = (index) => {
        setExpandedQues(expandedQues === index ? null : index);
    };

    return (
        <>
            {/* title */}
            <div className='flex flex-col gap-2 title-section'>
                <h2>{title}</h2>
            </div>

            {qaData.length > 0 ? (
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
            ) : (
                <div className='w-full action-card overflow-hidden'>
                    <div className="px-5 py-4 text-secondary dark:text-gray-400">
                        <p>{t.helpSupport?.common?.noQAContent || "No Q&A content available yet."}</p>
                    </div>
                </div>
            )}
        </>
    );
};

export default QASection;

