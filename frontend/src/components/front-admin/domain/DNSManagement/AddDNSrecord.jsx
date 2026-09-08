import { useState } from "react";
import { IoIosArrowDown } from "react-icons/io";
import { Formik, Form, Field, ErrorMessage } from "formik";
import * as Yup from "yup";
import { dnsAPI } from "../../../../api/domains";
import { useAlert } from "../../../../context/AlertContext";
import { useLanguage } from "../../../../hooks/useLanguage";

const AddDNSrecord = ({ domainName, viewDomain }) => {
  const { showAlert } = useAlert();
  const { t } = useLanguage();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation schema
  const validationSchema = Yup.object().shape({
    type: Yup.string().required(t.admin.typeRequired),
    name: Yup.string(),
    pointsto: Yup.string().required(t.admin.pointsToRequired),
    ttl: Yup.string().required(t.admin.ttlRequired),
    priority: Yup.number().nullable(),
  });

  // Initial values
  const initialValues = {
    type: "A",
    name: "",
    pointsto: "",
    ttl: "14400",
    priority: 0,
  };  

  // Handle form submission
  const handleSubmit = async (values, { resetForm }) => {
    if (!domainName) {
      showAlert(t.admin.domainRequired, { type: "warning" });
      return;
    }

    setIsSubmitting(true);       
    try {

      const dnsZoneId = viewDomain?.dnsZoneId || viewDomain?.id || null;


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
        dnsZoneId: dnsZoneId,
        recordName: recordName,
        recordType: values.type,
        recordValue: values.pointsto,
        recordPriority: values.priority || 0,
        recordTTL: parseInt(values.ttl) || 14400,
      };

      // Remove dnsZoneId from params if it's null 
      if (!dnsZoneId) {
        delete params.dnsZoneId;
      }

      const response = await dnsAPI.addDNSRecord(params);

      if (response?.responseMsg?.statusCode === 200) {
        showAlert(
          response?.responseMsg?.message || t.admin.dnsRecordAddedSuccess,
          {
            type: "success",
            duration: 2500,
          }
        );
        resetForm();

        window.dispatchEvent(new CustomEvent("dnsRecordAdded"));
      } else {
        showAlert(
          response?.responseMsg?.message || t.admin.failedToAddDnsRecord,
          {
            type: "warning",
          }
        );
      }
    } catch (error) {
      const errorMessage =
        error?.response?.data?.responseMsg?.message ||
        error?.response?.data?.message ||
        error?.message ||
        t.admin.failedToAddDnsRecord;
      showAlert(errorMessage, { type: "warning" });
      console.error("Error adding DNS record:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-7 px-5 space-y-4">
      <div className="flex items-center gap-2 info-detail w-full">
        <span className="text-secondary">
          {t.admin.dnsRecordsDescription}
        </span>
      </div>

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({
          values,
          errors,
          touched,
          handleChange,
          handleBlur,
          setFieldValue,
        }) => (
          <Form>
            <div className="flex lg:flex-nowrap flex-wrap items-start gap-2">
              <div className="relative w-full">
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
                  <option value="CAA">CAA</option>
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

              <div className="relative w-full">
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

              <button
                type="submit"
                className="add-to-cart"
                disabled={isSubmitting}
              >
                {isSubmitting ? t.admin.adding : t.admin.addRecord}
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default AddDNSrecord;
