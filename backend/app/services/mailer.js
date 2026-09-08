const env = require("../../start/env");
const { TransactionalEmailsApi, SendSmtpEmail } = require("@getbrevo/brevo");

const transporter = {
	sendMail : async({ to: email, subject, html}) => {
		let emailAPI = new TransactionalEmailsApi();
		emailAPI.authentications.apiKey.apiKey = env.BREVO_API_KEY;

		let message = new SendSmtpEmail();
		message.subject = subject;
		message.htmlContent = html;
		message.sender = { email: env.BREVO_EMAIL, name: env.MAIL_NAME };
		message.to = [{ email: email }];

		try {
			const res = await emailAPI.sendTransacEmail(message);
			return res;
		} catch (err) {
			console.error("Error sending email:", err?.body || err);
			throw err;
		}
	}
}


// const transporter = nodemailer.createTransport({
// 	host: env.MAIL_HOST,
// 	port: env.MAIL_PORT,
// 	secure: false, // Use `true` for port 465, `false` for all other ports
// 	auth: {
// 		user: env.MAIL_USERNAME,
// 		pass: env.MAIL_PASSWORD,
// 	},
// });

module.exports = transporter;