import { FiCheck } from "react-icons/fi";

export default function SimpleStepper({ steps = [], current = 0, onStepClick }) {
	return (
		<div className="flex items-center gap-2 w-full justify-between">
			{steps.map((label, i) => {
			const isDone = i < current;
			const isActive = i === current;
			return (
				<div key={label}>
					<button type="button" onClick={() => onStepClick?.(i)} className="flex items-center focus:outline-none gap-3">
						<div className={`w-12 h-12 flex items-center justify-center rounded-full text-xs font-medium border transition ${
							isActive ? "border-darkbtn-200 dark:border-gray-600 bg-lightgray text-primary dark:bg-gray-700 dark:text-white" 
							: isDone ? "border-lightgray bg-lightgray dark:border-gray-700 dark:bg-gray-600 text-darkbtn dark:text-white" : "border-secondary text-secondary font-medium"
						}`}
						>
						{isDone ? (
							<FiCheck size={14} />
						) : (
							i + 1
						)}
						</div>
						<div className={`text-13 font-medium text-primary dark:text-white whitespace-nowrap lg:flex hidden 
							${
								isActive ? "text-primary dark:text-white" 
								: isDone ? "text-primary dark:text-white" : "border-secondary text-secondary font-medium"
							}`}
						>
							{label}
						</div>
					</button>
				</div>
				);
			})}
		</div>
	);
}
