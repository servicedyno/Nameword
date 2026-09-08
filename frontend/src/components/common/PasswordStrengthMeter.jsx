import { useEffect, useState } from 'react'
import { MdCheck } from "react-icons/md";
import { IoClose } from "react-icons/io5";
import { useLanguage } from '../../hooks/useLanguage';

const StrengthItem = ({ passed, label }) => (
  <li className="flex items-start gap-1.5">
    <span className="text-primary dark:text-gray-500">
      {!passed ? (
        <MdCheck className="w-4 h-4 flex-none" />
      ) : (
        <IoClose className="w-4 h-4 flex-none" />
      )}
    </span>
    <span
      className={`text-xs font-medium ${!passed ? "text-primary dark:text-gray-500" : "text-primary dark:text-gray-500 line-through"
        }`}
    >
      {label}
    </span>
  </li>
);

const PasswordStrengthMeter = ({ password }) => {
  const { t } = useLanguage();
  const [checks, setChecks] = useState({
    hasMinLength: false,
    hasSpecialChar: false,
    hasUpperAndLowerCase: false,
    hasNumber: false,
  });

  useEffect(() => {
    setChecks({
      hasMinLength: password?.length >= 8,
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      hasUpperAndLowerCase: /(?=.*[a-z])(?=.*[A-Z])/.test(password),
      hasNumber: /[0-9]/.test(password)
    });
  }, [password]);

  const allPassed = Object.values(checks).every(Boolean);
  const passedCount = Object.values(checks).filter(Boolean).length;

  const getBarColor = (index) => {
    if (allPassed) return "bg-tealdark";
    return index < passedCount ? "bg-warning" : "bg-lightgray";
  };

  const getStrengthLabel = () => {
    if (allPassed) return { text: t.common.passwordStrength.strong, className: "text-tealdark" };
    if (passedCount >= 2) return { text: t.common.passwordStrength.medium, className: "text-yellow-500" };
    return { text: t.common.passwordStrength.weak, className: "text-warning" };
  };

  const strength = getStrengthLabel();


  return (
    <div className="border border-stokecolor rounded p-4 space-y-1.5 w-full mt-1">
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {[...Array(7)].map((_, i) => (
            <div key={i} className={`w-5 h-1 rounded-full ${getBarColor(i)}`} />
          ))}
        </div>
        <span className={`font-medium text-13 ${strength.className}`}>{strength.text}</span>
      </div>
      <ul className="space-y-1">
        <StrengthItem
          passed={checks.hasMinLength}
          label={t.common.passwordStrength.minLength}
        />
        <StrengthItem
          passed={checks.hasSpecialChar}
          label={t.common.passwordStrength.specialChar}
        />
        <StrengthItem
          passed={checks.hasUpperAndLowerCase}
          label={t.common.passwordStrength.upperLowerCase}
        />
        <StrengthItem
          passed={checks.hasNumber}
          label={t.common.passwordStrength.number}
        />
      </ul>
    </div>
  )
}

export default PasswordStrengthMeter