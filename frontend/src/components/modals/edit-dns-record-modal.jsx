import { IoClose } from "react-icons/io5";
import { useState } from "react";
import { IoIosArrowDown } from "react-icons/io";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { dnsAPI } from "../../api/domains";
import { useAlert } from "../../context/AlertContext";
import { useLanguage } from "../../hooks/useLanguage";

const EditDNSrecordModal = ({
  onClose,
  record,
  domainName,
  viewDomain,
  onSuccess,
}) => {
  const { t } = useLanguage();
  const { showAlert } = useAlert();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation schema
  const validationSchema = Yup.object().shape({
    type: Yup.string().required(t.admin.typeRequired),
    name: Yup.string(),
    pointsto: Yup.string().required(t.admin.pointsToRequired),
    ttl: Yup.string().required(t.admin.ttlRequired),
    priority: Yup.number().nullable(),
  });

  const formatRecordNameForEdit = (recordName, domain) => {
    if (!recordName || !domain) return "";

    if (recordName === domain || recordName === "@") {
      return "";
    }
    // If name ends with .domain, extract the subdomain
    if (recordName.endsWith(`.${domain}`)) {
      return recordName.replace(`.${domain}`, "");
    }
    return recordName;
  };

  // Initial values from record
  const initialValues = {
    type: record?.type || "A",
    name: formatRecordNameForEdit(record?.name, domainName) || "",
    pointsto: record?.value || record?.content || "",
    ttl: record?.ttl?.toString() || "14400",
    priority: record?.priority || 0,
  };

  const handleSubmit = async (values, { resetForm }) => {
    if (!domainName) {
      showAlert(t.admin.domainRequired, { type: "warning" });
      return;
    }

    if (!record?.id) {
      showAlert(t.admin.recordIdRequired || "Record ID is required", { type: "warning" });
      return;
    }

    setIsSubmitting(true);
    try {
      let recordName = domainName;
      if (values.name && values.name.trim()) {
        const nameValue = values.name.trim();
   
        if (nameValue.endsWith(`.${domainName}`) || nameValue === domainName) {
          recordName = nameValue;
        } else {
          recordName = `${nameValue}.${domainName}`;
        }
      }

      const params = {
        recordId: record.id, 
        domain: domainName,
        recordName: recordName,
        recordType: values.type,
        recordValue: values.pointsto,
        recordPriority: values.priority || 0,
        recordTTL: parseInt(values.ttl) || 14400,
        oldRecordName: record.name,
        oldRecordType: record.type,
        oldRecordValue: record.value || record.content,
      };

      const response = await dnsAPI.modifyDNSRecord(params);

      if (
        response?.responseMsg?.statusCode === 200 ||
        response?.responseData?.statusCode === 200
      ) {
        showAlert(
          response?.responseMsg?.message ||
            response?.responseData?.message ||
            t.admin.dnsRecordUpdatedSuccess || "DNS record updated successfully",
          {
            type: "success",
            duration: 2500,
          }
        );
        window.dispatchEvent(new CustomEvent("dnsRecordUpdated"));
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const errorMessage =
          response?.responseMsg?.message ||
          response?.responseData?.message ||
          t.admin.failedToUpdateDnsRecord || "Failed to update DNS record";
        showAlert(errorMessage, { type: "warning" });
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.responseMsg?.message ||
        error?.response?.data?.message ||
        error?.message ||
        t.admin.failedToUpdateDnsRecord || "Failed to update DNS record";
      showAlert(errorMessage, { type: "warning" });
      console.error("Error updating DNS record:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!record) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-white/80 dark:bg-gray-600/80 overflow-auto py-5">
      <div className="flex items-center justify-center w-full h-full">
        <div className="modal-dialog">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-500 hover:text-black"
          >
            <IoClose className="text-primary dark:text-gray-500" size={30} />
          </button>

          {/* Modal Title */}
          <div className="flex flex-col">
            <h2 className="modal-title mb-5">{t.admin.editDnsRecord || "Edit the record"}</h2>
            <Formik
              initialValues={initialValues}
              validationSchema={validationSchema}
              onSubmit={handleSubmit}
              enableReinitialize
            >
              {({
                values,
                errors,
                touched,
                handleChange,
                handleBlur,
                setFieldValue,
              }) => (
                <Form className="flex flex-col w-full gap-2">
                  <div className="relative">
                    <Field
                      as="select"
                      name="type"
                      id="type"
                      className={`input-field admin-form peer ${
                        errors.type && touched.type
                          ? "border-red-500 dark:border-red-400"
                          : ""
                      }`}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    >
                      <option value="A">A</option>
                      <option value="AAAA">AAAA</option>
                      <option value="CNAME">CNAME</option>
                      <option value="MX">MX</option>
                      <option value="TXT">TXT</option>
                      <option value="NS">NS</option>
                      <option value="SRV">SRV</option>
                    </Field>
                    <IoIosArrowDown
                      size={15}
                      className="absolute top-1/2 transform -translate-y-1/2 right-4 text-primary dark:text-white pointer-events-none"
                    />
                    <label
                      htmlFor="type"
                      className={`absolute left-5 transition-all font-medium ${
                        values.type
                          ? "top-2 text-xs text-gray-600"
                          : "top-4 text-13 text-primary dark:text-gray-500 "
                      } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                    >
                      {t.admin.type} *
                    </label>
                    <ErrorMessage
                      name="type"
                      component="p"
                      className="text-warning pl-5 text-xs font-medium mt-1"
                    />
                  </div>

                  <div className="relative w-full">
                    <Field
                      type="text"
                      name="name"
                      id="name"
                      className={`input-field admin-form peer w-full ${
                        errors.name && touched.name
                          ? "border-red-500 dark:border-red-400"
                          : ""
                      }`}
                      value={values.name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <label
                      htmlFor="name"
                      className={`absolute left-5 transition-all font-medium ${
                        values.name
                          ? "top-2 text-xs text-gray-600"
                          : "top-4 text-13 text-primary dark:text-gray-500 "
                      } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                    >
                      {t.admin.name}
                    </label>
                    <ErrorMessage
                      name="name"
                      component="p"
                      className="text-warning pl-5 text-xs font-medium mt-1"
                    />
                  </div>

                  <div className="relative w-full">
                    <Field
                      type="text"
                      name="pointsto"
                      id="pointsto"
                      className={`input-field admin-form peer w-full ${
                        errors.pointsto && touched.pointsto
                          ? "border-red-500 dark:border-red-400"
                          : ""
                      }`}
                      value={values.pointsto}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    />
                    <label
                      htmlFor="pointsto"
                      className={`absolute left-5 transition-all font-medium ${
                        values.pointsto
                          ? "top-2 text-xs text-gray-600"
                          : "top-4 text-13 text-primary dark:text-gray-500 "
                      } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                    >
                      {t.admin.pointsTo}
                    </label>
                    <ErrorMessage
                      name="pointsto"
                      component="p"
                      className="text-warning pl-5 text-xs font-medium mt-1"
                    />
                  </div>

                  <div className="relative">
                    <Field
                      as="select"
                      name="ttl"
                      id="ttl"
                      className={`input-field admin-form peer ${
                        errors.ttl && touched.ttl
                          ? "border-red-500 dark:border-red-400"
                          : ""
                      }`}
                      onChange={handleChange}
                      onBlur={handleBlur}
                    >
                      <option value="300">300</option>
                      <option value="600">600</option>
                      <option value="900">900</option>
                      <option value="1800">1800</option>
                      <option value="3600">3600</option>
                      <option value="7200">7200</option>
                      <option value="14400">14400</option>
                      <option value="28800">28800</option>
                      <option value="43200">43200</option>
                      <option value="86400">86400</option>
                    </Field>
                    <IoIosArrowDown
                      size={15}
                      className="absolute top-1/2 transform -translate-y-1/2 right-4 text-primary dark:text-white pointer-events-none"
                    />
                    <label
                      htmlFor="ttl"
                      className={`absolute left-5 transition-all font-medium ${
                        values.ttl
                          ? "top-2 text-xs text-gray-600"
                          : "top-4 text-13 text-primary dark:text-gray-500 "
                      } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                    >
                      {t.admin.ttl} *
                    </label>
                    <ErrorMessage
                      name="ttl"
                      component="p"
                      className="text-warning pl-5 text-xs font-medium mt-1"
                    />
                  </div>

                  {/* Priority field for MX records */}
                  {(values.type === "MX" || values.type === "SRV") && (
                    <div className="relative w-full">
                      <Field
                        type="number"
                        name="priority"
                        id="priority"
                        className={`input-field admin-form peer w-full ${
                          errors.priority && touched.priority
                            ? "border-red-500 dark:border-red-400"
                            : ""
                        }`}
                        value={values.priority}
                        onChange={handleChange}
                        onBlur={handleBlur}
                      />
                      <label
                        htmlFor="priority"
                        className={`absolute left-5 transition-all font-medium ${
                          values.priority !== undefined &&
                          values.priority !== null &&
                          values.priority !== ""
                            ? "top-2 text-xs text-gray-600"
                            : "top-4 text-13 text-primary dark:text-gray-500 "
                        } peer-focus:top-2 peer-focus:text-xs peer-focus:text-gray-600 peer-placeholder-shown:text-secondary`}
                      >
                        {t.admin.priority}
                      </label>
                      <ErrorMessage
                        name="priority"
                        component="p"
                        className="text-warning pl-5 text-xs font-medium mt-1"
                      />
                    </div>
                  )}

                  <div className="flex justify-end my-2 w-full admin-btn">
                    <button
                      type="submit"
                      className="add-to-cart capitalize"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? t.admin.updating : t.admin.update}
                    </button>
                  </div>
                </Form>
              )}
            </Formik>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditDNSrecordModal;
