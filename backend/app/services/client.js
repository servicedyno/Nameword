const apiClient = require('../utils/apiclient');

const addClient = async (clientData) => {
    const {
        FirstName, UserName, Password, CompanyName, Address1, City,
        StateName, CountryName, Zip, PhoneNo_cc, PhoneNo, Faxno_cc,
        FaxNo, Alternate_Phone_cc, Alternate_Phone, Id
    } = clientData;


    const validationRules = [
        { name: 'FirstName', value: FirstName, required: true, type: 'string' },
        { name: 'UserName', value: UserName, required: true, type: 'string' },
        { name: 'Password', value: Password, required: true, type: 'string' },
        { name: 'CompanyName', value: CompanyName, required: true, type: 'string' },
        { name: 'Address1', value: Address1, required: true, type: 'string' },
        { name: 'City', value: City, required: true, type: 'string' },
        { name: 'StateName', value: StateName, required: true, type: 'string' },
        { name: 'CountryName', value: CountryName, required: true, type: 'string' },
        { name: 'Zip', value: Zip, required: true, type: 'string' },
        { name: 'PhoneNo_cc', value: PhoneNo_cc, required: true, type: 'string' },
        { name: 'PhoneNo', value: PhoneNo, required: true, type: 'string' },
        { name: 'Faxno_cc', value: Faxno_cc, required: false, type: 'string' },
        { name: 'FaxNo', value: FaxNo, required: false, type: 'string' },
        { name: 'Alternate_Phone_cc', value: Alternate_Phone_cc, required: false, type: 'string' },
        { name: 'Alternate_Phone', value: Alternate_Phone, required: false, type: 'string' },
        { name: 'Id', value: Id, required: true, type: 'string' }
    ];

    // Validate the parameters
    for (let rule of validationRules) {
        if (rule.required && (rule.value === undefined || rule.value === null || rule.value === '')) {
            throw new Error(`${rule.name} is required`);
        }
        if (rule.value !== undefined && rule.value !== null && rule.value !== '' && typeof rule.value !== rule.type) {
            throw new Error(`${rule.name} must be a ${rule.type}`);
        }
    }

    try {
        const params = {
            FirstName,
            UserName,
            Password,
            CompanyName,
            Address1,
            City,
            StateName,
            CountryName,
            Zip,
            PhoneNo_cc,
            PhoneNo,
            Faxno_cc,
            FaxNo,
            Alternate_Phone_cc,
            Alternate_Phone,
            Id
        };

        const response = await apiClient.get('AddClient', { params });
        return response;
    } catch (error) {
        if (error.response) {
            throw new Error(`API request failed with status ${error.response.status}: ${error.response.data.message || 'Unknown error'}`);
        } else if (error.request) {
            throw new Error('API request failed: No response received');
        } else {
            throw new Error(`API request failed: ${error.message}`);
        }
    }
};

module.exports = {
    addClient
};
