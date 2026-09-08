const { addClient } = require("../../services/client");

class ClientController {
	async createClient(req, res) {
		const {
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
			Id,
		} = req.body;

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
				Id,
			};
			const response = await addClient(params);
			return res.status(200).json(response);
		} catch (error) {
			return res.status(500).json({ message: error.message });
		}
	}
}

module.exports = new ClientController();
