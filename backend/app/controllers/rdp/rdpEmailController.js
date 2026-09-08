const transporter = require("../../services/mailer");
const UpCloudController = require("../upcloud/upcloudController");
const moment = require("moment");
  const nunjucks = require("nunjucks");
const env = require("../../../start/env");

const wrapEmail = (title, content, color = "#28a745") => `
  <!DOCTYPE html>
  <html>
  <head>
    <style>
      body {
        font-family: Arial, sans-serif;
        background-color: #f1f1f1;
        color: #333;
        margin: 0;
        padding: 20px;
      }
      .container {
        max-width: 600px;
        margin: 0 auto;
        background: #fff;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.1);
        overflow: hidden;
      }
      .header {
        background-color: ${color};
        color: #fff;
        padding: 20px;
        text-align: center;
        font-size: 20px;
        font-weight: bold;
      }
      .content {
        padding: 25px;
        background-color: #fafafa;
      }
      .content p {
        font-size: 16px;
        line-height: 1.6;
        margin: 15px 0;
      }
      .footer {
        font-size: 12px;
        text-align: center;
        color: #777;
        padding: 20px;
        background-color: #f4f4f4;
        border-top: 1px solid #ddd;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">${title}</div>
      <div class="content">
        ${content}
      </div>
      <div class="footer">This is an automated message. Please do not reply.</div>
    </div>
  </body>
  </html>
`;

const RDPEmailController = {
    /**
     * Send RDP subscription confirmation email
     * @param {Object} params
     * @param {Object} params.user
     * @param {Object} params.billingCycle
     * @param {String} params.title
     * @param {Number} params.price
     * @param {Object} params.rdpCredentials - { ipAddress, password }
     * @param {Object} params.vncCredentials - { password, port }
     */
    sendSubscriptionConfirmation: async ({
        user,
        expiryDate,
        billingCycle,
        title,
        price,
        rdpCredentials,
        vncCredentials
    }) => {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="UTF-8" />
              <title>RDP Subscription Activated</title>
              <style>
                body {
                  font-family: Arial, sans-serif;
                  color: #333;
                  background-color: #f1f1f1;
                  margin: 0;
                  padding: 20px;
                }
      
                .container {
                  max-width: 600px;
                  margin: 0 auto;
                  background: #fff;
                  border-radius: 10px;
                  overflow: hidden;
                  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
                }
      
                .header {
                  background-color: #28a745;
                  color: #fff;
                  padding: 20px;
                  text-align: center;
                  font-size: 24px;
                  font-weight: bold;
                }
      
                .notice {
                  text-align: center;
                  background-color: #f4f4f4;
                  color: #555;
                  font-size: 15px;
                  padding: 10px 20px;
                  font-style: italic;
                }
      
                .content {
                  padding: 30px 25px;
                  background-color: #fafafa;
                }
      
                .content p {
                  font-size: 16px;
                  line-height: 1.6;
                  margin-bottom: 15px;
                }
      
                .info-table {
                  width: 100%;
                  margin-top: 20px;
                  border-collapse: separate;
                  border-spacing: 0 10px;
                }
      
                .info-table td {
                  padding: 14px 16px;
                  background-color: #eeeeee;
                  border: 1px solid #ddd;
                  border-radius: 6px;
                  font-size: 15px;
                }
      
                h3 {
                  margin-top: 30px;
                  margin-bottom: 12px;
                  font-size: 18px;
                  color: #28a745;
                }
      
                .credential-box {
                  background-color: #eeeeee;
                  padding: 15px;
                  border-radius: 6px;
                  margin-bottom: 12px;
                  border: 1px solid #ddd;
                  font-size: 15px;
                }
      
                .footer {
                  font-size: 12px;
                  text-align: center;
                  color: #777;
                  padding: 20px;
                  background-color: #f4f4f4;
                  border-top: 1px solid #ddd;
                }
              </style>
            </head>
      
            <body>
              <div class="container">
                <div class="header">✅ RDP Subscription Activated!</div>
                <div class="notice">Your Windows RDP is being provisioned and will be ready in approximately <strong>5 minutes</strong>.</div>
      
                <div class="content">
                  <p>Hello <strong>${user?.name || user?.email}</strong>,</p>
                  <p>Your <strong>${billingCycle?.type} RDP Plan</strong> has been successfully activated!</p>
      
                  <table class="info-table">
                    <tr><td><strong>RDP Name:</strong> ${title}</td></tr>
                    <tr><td><strong>Amount Charged:</strong> $${price || 0} (USD)</td></tr>
                    <tr><td><strong>Next Expiry Date:</strong> ${expiryDate}</td></tr>
                    <tr><td><strong>Billing Cycle:</strong> ${billingCycle?.type}</td></tr>
                  </table>
      
                  <h3>🔐 RDP Access Credentials</h3>
                  <div class="credential-box"><strong>IP Address:</strong> ${rdpCredentials?.ipAddress}</div>
                  <div class="credential-box"><strong>Username:</strong> ${rdpCredentials?.username}</div>
                  <div class="credential-box"><strong>Password:</strong> ${rdpCredentials?.password}</div>
      
                  <h3>🖥 VNC Access</h3>
                  <div class="credential-box"><strong>Hostname:</strong> ${vncCredentials?.host}</div>
                  <div class="credential-box"><strong>Port:</strong> ${vncCredentials?.port}</div>
                  <div class="credential-box"><strong>VNC Password:</strong> ${vncCredentials?.password}</div>
      
                  <p>Your subscription is now active. Thank you for staying with us! We appreciate your continued trust.</p>
                  <p>To manage or cancel your subscription, please visit your account dashboard.</p>
                </div>
      
                <div class="footer">
                  This is an automated message. Please do not reply to this email.
                </div>
              </div>
            </body>
          </html>
        `;

        try {
            await transporter.sendMail({
                from: process.env.MAIL_FROM_ADDRESS,
                to: user.email,
                subject: '✅ Your RDP Subscription is Activated!',
                html: emailHtml
            });

            console.log(`📩 RDP Subscription email sent to ${user.email}`);
        } catch (error) {
            console.error('⚠ Error sending RDP subscription email:', error);
        }
    },
    sendReinstallLicenseUpdate: async ({
        user,
        oldLicenseUSD,
        newLicenseUSD,
        oldPlanPrice,
        newPlanPrice,
        billingCycle
    }) => {
        const emailHtml = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2c3e50; max-width: 700px; margin: 0 auto; border: 1px solid #dcdcdc; border-radius: 10px; overflow: hidden; box-shadow: 0px 4px 16px rgba(0,0,0,0.1);">
        <div style="background-color: #007bff; color: white; padding: 24px 32px; text-align: center; font-size: 26px; font-weight: bold;">
          🔁 RDP License Fee Updated After Reinstallation
        </div>

        <div style="padding: 24px 32px; background-color: #ffffff;">
          <p style="font-size: 18px; margin-bottom: 16px;">
            Hello <strong>${user.name}</strong>,
          </p>
          <p style="font-size: 16px; margin-bottom: 16px;">
            We've successfully reinstalled your Windows RDP server. The license fee has been adjusted based on the newly selected operating system.
          </p>

          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 16px;">
            <thead>
              <tr style="background-color: #f4f6f8;">
                <th style="text-align: left; padding: 12px; border: 1px solid #ddd;">Detail</th>
                <th style="text-align: left; padding: 12px; border: 1px solid #ddd;">Previous</th>
                <th style="text-align: left; padding: 12px; border: 1px solid #ddd;">New</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style="padding: 12px; border: 1px solid #ddd;">License Fee</td>
                <td style="padding: 12px; border: 1px solid #ddd;">$${oldLicenseUSD}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">$${newLicenseUSD}</td>
              </tr>
              <tr>
                <td style="padding: 12px; border: 1px solid #ddd;">Plan Price (${billingCycle})</td>
                <td style="padding: 12px; border: 1px solid #ddd;">$${oldPlanPrice}</td>
                <td style="padding: 12px; border: 1px solid #ddd;">$${newPlanPrice}</td>
              </tr>
            </tbody>
          </table>

          <p style="font-size: 16px; margin-top: 20px;">
            Your updated subscription has been successfully saved. If you have any questions or concerns, feel free to contact our support team.
          </p>

          <p style="font-size: 16px; margin-top: 10px;">
            Thank you for using our service! 🙌
          </p>
        </div>

        <div style="background-color: #f1f3f5; padding: 16px; text-align: center; font-size: 12px; color: #7f8c8d;">
          This is an automated message. Please do not reply to this email.
        </div>
      </div>
    `;

        try {
            await transporter.sendMail({
                from: process.env.MAIL_FROM_ADDRESS,
                to: user.email,
                subject: '🔁 RDP License Updated After Reinstall',
                html: emailHtml,
            });
            console.log(`📩 Reinstall license update email sent to ${user.email}`);
        } catch (error) {
            console.error('⚠ Error sending reinstall license update email:', error);
        }
    },
    sendRenewalReminder: async ({ user, rdp, plan, billingCycle, subscription, minutesLeft, daysLeft }) => {
        const timeText = minutesLeft
            ? `${minutesLeft} minutes`
            : daysLeft === 1
                ? `1 day`
                : `${daysLeft} days`;

        const expiryDate = moment(subscription.subscriptionEnd).format("MMMM D, YYYY, hh:mm A");

        const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8" />
            <title>RDP Renewal Reminder</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                color: #333;
                background-color: #f1f1f1;
                margin: 0;
                padding: 20px;
              }
    
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: #fff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
              }
    
              .header {
                background-color: #ffc107;
                color: #000;
                padding: 20px;
                text-align: center;
                font-size: 24px;
                font-weight: bold;
              }
    
              .content {
                padding: 30px 25px;
                background-color: #fafafa;
              }
    
              .content p {
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 15px;
              }
    
              .info-table {
                width: 100%;
                margin-top: 20px;
                border-collapse: separate;
                border-spacing: 0 10px;
              }
    
              .info-table td {
                padding: 14px 16px;
                background-color: #eeeeee;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 15px;
              }
    
              h3 {
                margin-top: 30px;
                margin-bottom: 12px;
                font-size: 18px;
                color: #28a745;
              }
    
              .footer {
                font-size: 12px;
                text-align: center;
                color: #777;
                padding: 20px;
                background-color: #f4f4f4;
                border-top: 1px solid #ddd;
              }
            </style>
          </head>
    
          <body>
            <div class="container">
              <div class="header">⏰ RDP Renewal Reminder</div>
    
              <div class="content">
                <p>Hello <strong>${user?.name || user?.email}</strong>,</p>
                <p>Your <strong>${billingCycle}</strong> RDP subscription will renew in <strong>${timeText}</strong>.</p>
    
                <table class="info-table">
                  <tr><td><strong>RDP Name:</strong> ${rdp?.title || "RDP Server"}</td></tr>
                  <tr><td><strong>Plan:</strong> ${plan?.name}</td></tr>
                  <tr><td><strong>Specs:</strong> ${plan?.cpu} vCPU / ${plan?.ram} GB RAM / ${plan?.storage?.size} GB ${plan?.storage?.type}</td></tr>
                  <tr><td><strong>Billing Cycle:</strong> ${billingCycle}</td></tr>
                  <tr><td><strong>Next Renewal Date:</strong> ${expiryDate}</td></tr>
                  <tr><td><strong>Auto-Renewal:</strong> Enabled</td></tr>
                </table>
    
                <p style="margin-top: 20px;">
                  No action is needed if you wish to continue your service. Your plan will renew automatically.
                </p>
    
                <p style="margin-top: 10px;">
                  If you would like to cancel or change your plan, please visit your account dashboard before the renewal time.
                </p>
              </div>
    
              <div class="footer">
                This is an automated message. Please do not reply to this email.
              </div>
            </div>
          </body>
        </html>
        `;

        try {
            await transporter.sendMail({
                from: process.env.MAIL_FROM_ADDRESS,
                to: user.email,
                subject: `⏰ Reminder: Your ${billingCycle} RDP plan will renew in ${timeText}`,
                html: emailHtml
            });

            console.log(`📩 Sent renewal reminder to ${user.email}`);
        } catch (err) {
            console.error("❌ Failed to send renewal reminder email:", err);
        }
    },
    sendRDPRenewalConfirmationEmail: async (subscription) => {
        const { userId: user, planId: plan, billingCycleId: billingCycle, rdpId: rdp } = subscription;

        try {
            const { shouldSendEmail } = require("../../utils/notificationHelper");
            const canSendEmail = await shouldSendEmail(user, 'subscriptionsAndPayments');
            if (!canSendEmail) {
                console.log(`Email notification disabled for user ${user?.email || user} - skipping RDP renewal confirmation email`);
                return;
            }

            // 🟢 Fetch live RDP server details (title)
            let rdpTitle = "Windows RDP";
            try {
                if (rdp?.serverId) {
                    const live = await UpCloudController.getRDPServerDetails(rdp.serverId);
                    if (live.success && live.data?.title) {
                        rdpTitle = live.data.title;
                    }
                }
            } catch (err) {
                console.warn("⚠️ Failed to fetch RDP title from UpCloud:", err.message);
            }

            const productName = `${billingCycle?.type} RDP Plan`;
            const expiryDate = moment(subscription.subscriptionEnd).format("MMMM Do YYYY");
            const amount = subscription.price?.toFixed(2) || "0.00";
            
            let html = nunjucks.render('mails/renewal_success.html', {
                NAME: user.name || user.email,
                PRODUCT_NAME: productName,
                CURRENCY: 'USD',
                AMOUNT: amount,
                NEW_EXPIRY_DATE: expiryDate,
                invoiceLink: env.FRONTEND_URL + '/account/invoices',
                logoUrl: env.FRONTEND_URL
            });

            await transporter.sendMail({
                from: process.env.MAIL_FROM_ADDRESS,
                to: user.email,
                subject: `Renewal confirmed - ${productName}`,
                html: html
            });

            console.log(`📩 RDP renewal confirmation email sent to ${user.email}`);
        } catch (error) {
            console.error("❌ Failed to send RDP renewal email:", error);
        }
    },
    sendManualRenewReminder: async ({ user, rdp, plan, billingCycle, subscription, expiresAt, minutesLeft, daysLeft }) => {
        const timeText = minutesLeft
            ? `${minutesLeft} minutes`
            : daysLeft === 1
                ? `1 day`
                : `${daysLeft} days`;

        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8" />
            <title>Manual RDP Renewal Reminder</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                color: #333;
                background-color: #f1f1f1;
                margin: 0;
                padding: 20px;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: #fff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
              }
              .header {
                background-color: #ffc107;
                color: #000;
                padding: 20px;
                text-align: center;
                font-size: 22px;
                font-weight: bold;
              }
              .content {
                padding: 30px 25px;
                background-color: #fafafa;
              }
              .content p {
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 15px;
              }
              .info-table {
                width: 100%;
                margin-top: 20px;
                border-collapse: separate;
                border-spacing: 0 10px;
              }
              .info-table td {
                padding: 14px 16px;
                background-color: #eeeeee;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 15px;
              }
              .footer {
                font-size: 12px;
                text-align: center;
                color: #777;
                padding: 20px;
                background-color: #f4f4f4;
                border-top: 1px solid #ddd;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">🕐 RDP Subscription Expiring Soon</div>
              <div class="content">
                <p>Hello <strong>${user?.name || user?.email}</strong>,</p>
                <p>Your <strong>${billingCycle}</strong> RDP subscription will expire in <strong>${timeText}</strong>.</p>
      
                <table class="info-table">
                  <tr><td><strong>Plan:</strong> ${plan?.name}</td></tr>
                  <tr><td><strong>Specs:</strong> ${plan?.cpu} vCPU / ${plan?.ram} GB RAM / ${plan?.storage?.size} GB ${plan?.storage?.type}</td></tr>
                  <tr><td><strong>Expiry Date:</strong> ${expiresAt}</td></tr>
                  <tr><td><strong>Auto-Renewal:</strong> Disabled</td></tr>
                </table>
      
                <p style="margin-top: 20px;">To avoid service interruption, please renew your subscription manually from your dashboard.</p>
              </div>
              <div class="footer">This is an automated message. Please do not reply.</div>
            </div>
          </body>
          </html>
        `;

        try {
            await transporter.sendMail({
                from: process.env.MAIL_FROM_ADDRESS,
                to: user.email,
                subject: "🕐 Your RDP Subscription is Expiring Soon",
                html: emailHtml,
            });
            console.log(`📬 Manual renew reminder sent to ${user.email}`);
        } catch (err) {
            console.error("❌ Failed to send manual renewal reminder:", err);
        }
    },
    sendLowBalanceReminder: async ({ user, amountDue, currentBalance, subscription, billingCycle, expiresAt }) => {
        const emailHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8" />
            <title>Insufficient Balance for RDP Auto-Renewal</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                color: #333;
                background-color: #f1f1f1;
                margin: 0;
                padding: 20px;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: #fff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.15);
              }
              .header {
                background-color: #dc3545;
                color: #fff;
                padding: 20px;
                text-align: center;
                font-size: 22px;
                font-weight: bold;
              }
              .content {
                padding: 30px 25px;
                background-color: #fafafa;
              }
              .content p {
                font-size: 16px;
                line-height: 1.6;
                margin-bottom: 15px;
              }
              .info-table {
                width: 100%;
                margin-top: 20px;
                border-collapse: separate;
                border-spacing: 0 10px;
              }
              .info-table td {
                padding: 14px 16px;
                background-color: #eeeeee;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 15px;
              }
              .footer {
                font-size: 12px;
                text-align: center;
                color: #777;
                padding: 20px;
                background-color: #f4f4f4;
                border-top: 1px solid #ddd;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">⚠️ Insufficient Wallet Balance</div>
              <div class="content">
                <p>Hello <strong>${user?.name || user?.email}</strong>,</p>
                <p>Your <strong>${billingCycle}</strong> RDP subscription is scheduled to auto-renew but your wallet balance is insufficient.</p>
      
                <table class="info-table">
                  <tr><td><strong>Amount Due:</strong> $${amountDue.toFixed(2)} (USD)</td></tr>
                  <tr><td><strong>Current Balance:</strong> $${currentBalance.toFixed(2)} (USD)</td></tr>
                  <tr><td><strong>Next Expiry Date:</strong> ${expiresAt}</td></tr>
                </table>
      
                <p style="margin-top: 20px;">Please top up your wallet before renewal to avoid service disruption.</p>
              </div>
              <div class="footer">This is an automated message. Please do not reply.</div>
            </div>
          </body>
          </html>
        `;

        try {
            await transporter.sendMail({
                from: process.env.MAIL_FROM_ADDRESS,
                to: user.email,
                subject: "⚠️ RDP Auto-Renew Failed Due to Low Balance",
                html: emailHtml,
            });
            console.log(`📬 Low balance warning sent to ${user.email}`);
        } catch (err) {
            console.error("❌ Failed to send low balance email:", err);
        }
    },
    sendTerminationEmail: async (user, rdp) => {
        const html = wrapEmail("❌ RDP Subscription Terminated", `
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>Your RDP <strong>${rdp?.title || rdp?.hostname || ""}</strong> has been <strong>terminated</strong> due to non-payment.</p>
          <p>You may order a new RDP at any time from your dashboard.</p>
        `, "#d32f2f");

        await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: user.email,
            subject: "❌ RDP Terminated Due to Non-Payment",
            html,
        });
    },

    sendSuspensionEmail: async (user, rdp) => {
        const html = wrapEmail("⚠️ RDP Suspended", `
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>Your RDP instance <strong>${rdp?.title || rdp?.hostname || ""}</strong> has been <strong>suspended</strong> because the grace period has ended without payment.</p>
          <p>You may reactivate it by topping up your wallet and contacting support.</p>
        `, "#ff9800");

        await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: user.email,
            subject: "⚠️ Your RDP Has Been Suspended",
            html,
        });
    },

    sendReinstatementFeeEmail: async (user, rdp, fee) => {
        const html = wrapEmail("🔁 Reactivation Fee Required", `
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>Your RDP <strong>${rdp?.title}</strong> is in the grace period.</p>
          <p>A <strong>reinstatement fee of $${fee}</strong> will be added when you renew this subscription.</p>
          <p>Please top up your wallet before the grace period ends to avoid suspension.</p>
        `, "#ffcc00");

        await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: user.email,
            subject: "⚠️ Reactivation Fee Notice - RDP in Grace Period",
            html,
        });
    },

    sendReactivatedEmail: async ({ user, rdp, subscription, billingCycle }) => {
        const expiryFormatted = moment(subscription.subscriptionEnd).format("MMMM D, YYYY, hh:mm A");

        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body {
                font-family: Arial, sans-serif;
                background-color: #f1f1f1;
                padding: 20px;
                color: #333;
              }
              .container {
                max-width: 600px;
                margin: auto;
                background: #fff;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                overflow: hidden;
              }
              .header {
                background-color: #28a745;
                color: white;
                padding: 20px;
                text-align: center;
                font-size: 20px;
                font-weight: bold;
              }
              .content {
                padding: 25px;
                background: #fafafa;
              }
              .content p {
                font-size: 16px;
                line-height: 1.6;
              }
              .info-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0 10px;
                margin-top: 15px;
              }
              .info-table td {
                background: #eee;
                padding: 12px 16px;
                border: 1px solid #ddd;
                border-radius: 6px;
              }
              .footer {
                padding: 15px;
                font-size: 12px;
                text-align: center;
                background: #f4f4f4;
                color: #777;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">✅ Your RDP is Reactivated!</div>
              <div class="content">
                <p>Hello <strong>${user?.name}</strong>,</p>
                <p>Great news! Your RDP <strong>${rdp?.title}</strong> has been successfully <strong>reactivated</strong>.</p>
      
                <table class="info-table">
                  <tr><td><strong>Status:</strong> Active</td></tr>
                  <tr><td><strong>Next Expiry:</strong> ${expiryFormatted}</td></tr>
                  <tr><td><strong>Billing Cycle:</strong> ${billingCycle}</td></tr>
                  <tr><td><strong>Plan:</strong> ${subscription?.planId?.cpu} vCPU / ${subscription?.planId?.ram}GB RAM / ${subscription?.planId?.storage?.size}GB ${subscription?.planId?.storage?.type}</td></tr>
                </table>
      
                <p>You can now continue using your RDP server. Thank you for staying with us!</p>
              </div>
              <div class="footer">This is an automated message. Please do not reply.</div>
            </div>
          </body>
          </html>
        `;

        await transporter.sendMail({
            from: process.env.MAIL_FROM_ADDRESS,
            to: user.email,
            subject: "✅ Your RDP Has Been Reactivated",
            html
        });
    },

    sendInsufficientFundsEmail: async (user, rdp, price, balance, expiry) => {
        const html = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8" />
            <title>⚠ Insufficient Wallet Balance</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                background-color: #f1f1f1;
                color: #333;
                padding: 20px;
                margin: 0;
              }
              .container {
                max-width: 600px;
                margin: 0 auto;
                background: #fff;
                border-radius: 10px;
                overflow: hidden;
                box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
              }
              .header {
                background-color: #ff4d4d;
                color: white;
                padding: 20px;
                text-align: center;
                font-size: 22px;
                font-weight: bold;
              }
              .content {
                padding: 25px;
                background-color: #fafafa;
              }
              .content p {
                font-size: 16px;
                line-height: 1.6;
                margin: 15px 0;
              }
              .info-table {
                width: 100%;
                border-collapse: separate;
                border-spacing: 0 10px;
                margin-top: 10px;
              }
              .info-table td {
                padding: 12px 16px;
                background-color: #eee;
                border: 1px solid #ddd;
                border-radius: 6px;
                font-size: 15px;
              }
              .footer {
                padding: 15px;
                font-size: 12px;
                text-align: center;
                background: #f4f4f4;
                color: #777;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">⚠ Insufficient Wallet Balance</div>
              <div class="content">
                <p>Hello <strong>${user?.name || user?.email}</strong>,</p>
                <p>We attempted to auto-renew your RDP subscription for <strong>${rdp?.title || "your RDP"}</strong>, but your wallet does not have enough funds.</p>
      
                <table class="info-table">
                  <tr><td><strong>Required:</strong> $${parseFloat(price).toFixed(2)} (USD)</td></tr>
                  <tr><td><strong>Current Balance:</strong> $${parseFloat(balance).toFixed(2)} (USD)</td></tr>
                  <tr><td><strong>Renewal Deadline:</strong> ${expiry}</td></tr>
                </table>
      
                <p>Please top up your wallet before the deadline to prevent suspension of your RDP service.</p>
                <p>If you've already added funds, your subscription will renew automatically.</p>
              </div>
              <div class="footer">
                This is an automated message. Please do not reply.
              </div>
            </div>
          </body>
          </html>
        `;

        try {
            await transporter.sendMail({
                from: process.env.MAIL_FROM_ADDRESS,
                to: user.email,
                subject: "⚠ RDP Auto-Renewal Failed - Low Balance",
                html
            });
            console.log(`📩 Insufficient funds email sent to ${user.email}`);
        } catch (err) {
            console.error("❌ Failed to send insufficient funds email:", err);
        }
    }
};

module.exports = RDPEmailController;
