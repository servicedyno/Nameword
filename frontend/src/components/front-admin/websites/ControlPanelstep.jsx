import { useState, useEffect } from "react";
import { FiCheck, FiInfo } from "react-icons/fi";
import { PiWarningBold, PiArrowArcRightFill } from "react-icons/pi";
import { TbCopy } from "react-icons/tb";
import { cPanel, plesk } from "../../common/icons";
import { useLanguage } from "../../../hooks/useLanguage";

const ControlPanelstep = ({
  serverInfo,
  onControlPanelSelected,
  initialData = {},
}) => {
  const { t } = useLanguage();
  // Convert controlPanel string to number if needed
  const getInitialSelectedPlan = () => {
    if (!initialData.controlPanel) return null;
    if (typeof initialData.controlPanel === "number")
      return initialData.controlPanel;
    if (initialData.controlPanel === "cpanel") return 1;
    if (initialData.controlPanel === "plesk") return 2;
    return null;
  };

  const [selectedPlan, setSelectedPlan] = useState(getInitialSelectedPlan());

  // Determine available control panels from server info
  const getAvailableControlPanels = () => {
    if (!serverInfo?.specifications?.control_panel) {
      // Default: show both if no server info
      return { cpanel: true, plesk: true };
    }

    const controlPanel = serverInfo.specifications.control_panel.toLowerCase();
    return {
      cpanel: controlPanel.includes("cpanel") || controlPanel.includes("whm"),
      plesk: controlPanel.includes("plesk"),
    };
  };

  const availablePanels = getAvailableControlPanels();

  useEffect(() => {
    // Auto-select if only one option is available
    if (availablePanels.cpanel && !availablePanels.plesk && !selectedPlan) {
      setSelectedPlan(1);
      if (onControlPanelSelected) {
        onControlPanelSelected("cpanel");
      }
    } else if (
      availablePanels.plesk &&
      !availablePanels.cpanel &&
      !selectedPlan
    ) {
      setSelectedPlan(2);
      if (onControlPanelSelected) {
        onControlPanelSelected("plesk");
      }
    }
  }, [availablePanels, selectedPlan, onControlPanelSelected]);

  const handlePanelSelect = (panelNumber, panelName) => {
    setSelectedPlan(panelNumber);
    if (onControlPanelSelected) {
      onControlPanelSelected(panelName);
    }
  };

  return (
    <div className="py-7 px-5 space-y-4 card-essential">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 w-full gap-4">
        {/* {availablePanels.cpanel && ( */}
        <label
          className={`choose-plan-price flex flex-col gap-4 mb-1 ${selectedPlan === 1 ? "selected" : ""
            }`}
        >
          <div className="flex items-start gap-2">
            <div className="mt-1">
              <input
                type="radio"
                name="plan"
                checked={selectedPlan === 1}
                onChange={() => handlePanelSelect(1, "cpanel")}
                className="sr-only"
              />

              <div
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${selectedPlan === 1
                  ? "border-tealdark bg-tealdark"
                  : "border-gray-400"
                  }`}
              >
                {selectedPlan === 1 && (
                  <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                )}
              </div>
            </div>
            <p className="font-medium text-15 text-primary dark:text-gray-300">
              {t.admin.cpanel}
            </p>
          </div>
          <div className="h-36">
            <img
              src={cPanel}
              alt="cPanel"
              title="cPanel"
              className="h-full w-full object-fit-cover"
            />
          </div>
          <p className="font-medium text-13 text-primary dark:text-gray-500">
            {t.admin.cpanelDescriptionShort}
          </p>
        </label>
        {/* )} */}
        {/* {availablePanels.plesk && ( */}
        {/* <label
          className={`choose-plan-price flex flex-col gap-4 mb-1 ${
            selectedPlan === 2 ? "selected" : ""
          }`}
        >
          <div className="flex items-start gap-2">
            <div className="mt-1">
              <input
                type="radio"
                name="plan"
                checked={selectedPlan === 2}
                onChange={() => handlePanelSelect(2, "plesk")}
                className="sr-only"
              />

              <div
                className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors duration-200 ${
                  selectedPlan === 2
                    ? "border-tealdark bg-tealdark"
                    : "border-gray-400"
                }`}
              >
                {selectedPlan === 2 && (
                  <div className="w-1.5 h-1.5 bg-white dark:bg-gray-800 rounded-full"></div>
                )}
              </div>
            </div>
            <p className="font-medium text-15 text-primary dark:text-gray-300">
              Plesk
            </p>
          </div>
          <div className="h-36">
            <img
              src={plesk}
              alt="Plesk"
              title="Plesk"
              className="h-full w-full object-fit-cover"
            />
          </div>
          <p className="font-medium text-13 text-primary dark:text-gray-500">
            A modern, flexible control panel with a clean UI. Supports both
            Linux and Windows, great for managing multiple sites or advanced
            tools like Docker.
          </p>
        </label> */}
        {/* // )} */}
      </div>
    </div>
  );
};

export default ControlPanelstep;
