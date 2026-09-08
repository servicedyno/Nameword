const { addItemToCart, listCart, removeItemFromCart } = require("../../services/cart");
const transporter = require("../../services/mailer");
const nunjucks = require("nunjucks");
const env = require("../../../start/env");
const User = require("../../models/User");
const Domain = require("../../models/Domain");
const moment = require("moment");
const { createPaymentRecord, processAutomaticRefund } = require("../../utils/paymentHelper");
const { markPromoCodeAsUsed } = require("../promo/PromoController");
const CartItem = require("../../models/CartItem");
const Transaction = require("../../models/Transaction");
const Payment = require("../../models/Payment");
const axios = require("axios");
const HostingPlansController = require("../hosting/HostingPlansController");

class CartController {
  static async add(req, res, next) {
    try {
      const userId = req.user.id;
      const {
        itemType,
        websiteName,
        action,
        years,
        whoisProtection,
        nameservers,
        provider,
        productId,
        price,
        metadata,
        renew,
        bundle,
        hosting,
      } = req.body;

      const item = await addItemToCart({
        userId,
        itemType,
        domain:
          itemType === "domain"
            ? {
                name: websiteName,
                action,
                years,
                whoisProtection,
                nameservers,
                provider,
                productId,
                renew,
              }
            : undefined,
        bundle: itemType === "bundle" ? bundle : undefined,
        hosting: itemType === "hosting" ? hosting : undefined,
        price,
        metadata,
      });

      const message =
        itemType === "hosting"
          ? "The hosting plan has been successfully added to your cart."
          : "The domain has been successfully added to your cart.";

      res.json({ success: true, data: item, message });
    } catch (err) {
      next(err);
    }
  }

  static async list(req, res, next) {
    try {
      const userId = req.user.id;
      if (req.query?.markRead || req.query?.markRead === "true") {
        await CartItem.updateMany(
          { userId, status: "in_cart" },
          { $set: { isRead: true } }
        );
      }
      const result = await listCart(userId);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  }

  static async remove(req, res, next) {
    try {
      const userId = req.user.id;
      const { id } = req.query;
      const removed = await removeItemFromCart(userId, id, );
      if (!removed) {
        return res.status(404).json({ success: false, message: "Item not found in cart" });
      }
      res.json({ success: true, message: "Item deleted from cart" });
    } catch (err) {
      next(err);
    }
  }

  static async checkout(req, res, next) {
    const userId = req.user.id;

    try {
      const { payment_status, walletTransactionId } = req.body;
      if (payment_status !== "success") {
        return res.status(400).json({ success: false, message: "Payment not confirmed. Please complete wallet payment first." });
      }

      // Track wallet transaction for potential refund
      let walletTransaction = null;
      if (walletTransactionId) {
        walletTransaction = await Transaction.findOne({
          userId,
          transactionId: walletTransactionId,
          type: "debit",
          status: "completed",
        });

        if (!walletTransaction) {
          return res.status(400).json({
            success: false,
            message: "No valid wallet transaction found. Please retry payment.",
          });
        }

        console.log(`✅ Verified wallet transaction: ${walletTransactionId}`);
      }


      const cartItems = await CartItem.find({ userId, status: "in_cart" });
      if (cartItems.length === 0) {
        return res.status(400).json({ success: false, message: "No items in cart to checkout." });
      }

      const apiBase = process.env.APP_URL || "http://localhost:8000";
      const headers = {
        Authorization: req.headers.authorization,
        "x-api-key": req.headers["x-api-key"] || "",
      };

      const purchasedDomains = [];
      const failedDomains = [];
      const failedDomainPayments = []; // Track failed domain payments for refund
      const purchasedHosting = [];
      const failedHosting = [];
      const failedHostingPayments = []; // Track failed hosting payments for refund

      for (const item of cartItems) {
        if (item.itemType !== "domain") continue;

        const domainPayload = {
          productType: item.domain.action || "register",
          websiteName: item.domain.name,
          duration: item.domain.years || 1,
          isWhoisProtection: Boolean(item.domain.whoisProtection),
          ns1: item.domain.nameservers?.[0] || null,
          ns2: item.domain.nameservers?.[1] || null,
          ns3: item.domain.nameservers?.[2] || null,
          ns4: item.domain.nameservers?.[3] || null,
          id: item.domain.productId || null,
          isEnablePremium: false,
          provider: item.domain.provider || "openprovider",
          handle: "default",
        };

        try {
          const response = await axios.get(`${apiBase}/api/v1/domain/order`, {
            headers,
            params: domainPayload,
          });

          if (response.data?.responseMsg?.statusCode === 200) {
            item.status = "purchased";
            await item.save();
            purchasedDomains.push(item.domain.name);

        
            if (walletTransaction && item.price?.amount) {
              try {
                await createPaymentRecord({
                  userId,
                  service: "Domain Registration",
                  title: item.domain.name,
                  amount: item.price.amount,
                  currency: item.price.currency || "USD",
                  paymentMethod: "wallet_balance",
                  status: "completed",
                  transactionId: walletTransaction._id,
                  metadata: {
                    domainName: item.domain.name,
                    duration: item.domain.years || 1,
                    provider: item.domain.provider || "openprovider",
                    cartCheckout: true,
                  },
                });
              } catch (paymentError) {
                console.error(`Failed to create payment record for ${item.domain.name}:`, paymentError);
              }
            }

            // Send domain purchase confirmation email
            try {
              const user = await User.findById(req.user.id);
              if (user && user.email) {
                // Check if user has email notifications enabled for subscriptions and payments
                const { shouldSendEmail } = require("../../utils/notificationHelper");
                const canSendEmail = await shouldSendEmail(user, 'subscriptionsAndPayments');                                                                                  
                if (canSendEmail) {
                  // Get domain details from database
                  const domainData = await Domain.findOne({ websiteName: item.domain.name });
                  const registrationDate = moment().format("MMMM Do YYYY");
                  const expiryDate = domainData?.expiryDate 
                    ? moment(domainData.expiryDate).format("MMMM Do YYYY")
                    : moment().add(item.domain.years || 1, 'years').format("MMMM Do YYYY");
                  const autoRenewStatus = domainData?.autoRenew ? "Enabled" : "Disabled";
                      
                  let html = nunjucks.render('mails/domain_purchase.html', {
                    NAME: user.name || user.email,
                    DOMAIN_NAME: item.domain.name,
                    DATE: registrationDate,
                    EXPIRY_DATE: expiryDate,
                    AUTO_RENEW_STATUS: autoRenewStatus,
                    manageDomainLink: env.FRONTEND_URL + `/domains/${item.domain.name}`,
                    setupDnsLink: env.FRONTEND_URL + `/domains/${item.domain.name}/dns`,
                    logoUrl: env.FRONTEND_URL
                  });
                  
                  await transporter.sendMail({
                    from: process.env.MAIL_FROM_ADDRESS,
                    to: user.email,
                    subject: `Domain registered - ${item.domain.name}`,
                    html: html,
                  });
                  
                  console.log(`Domain purchase email sent to ${user.email} for ${item.domain.name}`);
                } else {
                  console.log(`Email notification disabled for user ${user.email} - skipping domain purchase email`);
                }
                
                // Send domain setup email
                try {
                  let setupHtml = nunjucks.render('mails/domain_setup.html', {
                    NAME: user.name || user.email,
                    DOMAIN_NAME: item.domain.name,
                    setupLink: env.FRONTEND_URL + `/domains/${item.domain.name}/setup`,
                    setupGuideLink: env.FRONTEND_URL + '/help/domain-setup',
                    logoUrl: env.FRONTEND_URL
                  });
                  
                  await transporter.sendMail({
                    from: process.env.MAIL_FROM_ADDRESS,
                    to: user.email,
                    subject: `Set up your domain - ${item.domain.name}`,
                    html: setupHtml,
                  });
                  
                  console.log(`Domain setup email sent to ${user.email} for ${item.domain.name}`);
                } catch (setupEmailError) {
                  console.error("Error sending domain setup email:", setupEmailError);
                  // Continue even if email fails
                }
              }
            } catch (emailError) {
              console.error("Error sending domain purchase email:", emailError);
              // Continue even if email fails
            }
          } else {
            failedDomains.push(item.domain.name);
            // Track payment info for refund if wallet payment was used
            if (walletTransaction && item.price?.amount) {
              failedDomainPayments.push({
                domainName: item.domain.name,
                amount: item.price.amount,
                currency: item.price.currency || "USD",
              });
            }
          }
        }  catch (err) {
          const domainName = item.domain?.name || "unknown-domain";
          const userId = req.user?.id || "unknown-user";

          console.error("❌ Domain purchase exception:");
          console.error(`   🕒 Time: ${new Date().toISOString()}`);
          console.error(`   👤 User ID: ${userId}`);
          console.error(`   🌐 Domain: ${domainName}`);
          console.error(`   💬 Error: ${err.message}`);

          if (err.response?.data) {
            console.error(`   📦 Response Data: ${JSON.stringify(err.response.data, null, 2)}`);
          } else if (err.request) {
            console.error("   🚫 No response received from domain provider API.");
          }

          failedDomains.push(domainName);
          
          // Track payment info for refund if wallet payment was used
          if (walletTransaction && item.price?.amount) {
            failedDomainPayments.push({
              domainName: domainName,
              amount: item.price.amount,
              currency: item.price.currency || "USD",
            });
          }
        }

      }

      // Process hosting items (wallet checkout)
      const hostingCartItems = cartItems.filter((i) => i.itemType === "hosting" && i.status === "in_cart");
      if (hostingCartItems.length > 0 && walletTransaction) {
        const hostingController = new HostingPlansController();
        const hostingCartItemIds = hostingCartItems.map((i) => i._id);
        const paymentReference = walletTransactionId || "cart-checkout";
        try {
          const { successfulOrders, failedOrders } = await hostingController.processHostingOrders(
            userId,
            hostingCartItemIds,
            walletTransaction._id,
            paymentReference,
            "WALLET"
          );
          for (const o of successfulOrders) {
            purchasedHosting.push({
              cartItemId: o.cartItemId,
              orderId: o.orderId,
              domainName: o.domainName,
            });
          }
          for (const f of failedOrders) {
            const cartItem = hostingCartItems.find((c) => c._id.toString() === f.cartItemId?.toString());
            failedHosting.push(cartItem?.hosting?.domainName || cartItem?.hosting?.planName || f.cartItemId?.toString() || "hosting");
            if (cartItem?.price?.amount) {
              failedHostingPayments.push({
                amount: cartItem.price.amount,
                currency: cartItem.price.currency || "USD",
              });
            }
          }
        } catch (hostingErr) {
          console.error("❌ Hosting processing exception:", hostingErr);
          for (const item of hostingCartItems) {
            failedHosting.push(item.hosting?.domainName || item.hosting?.planName || item._id?.toString() || "hosting");
            if (item.price?.amount) {
              failedHostingPayments.push({
                amount: item.price.amount,
                currency: item.price.currency || "USD",
              });
            }
          }
        }
      }

      //  REFUND LOGIC: Process automatic refund if domains failed and wallet payment was used
      if (failedDomains.length > 0 && walletTransaction) {
        try {
          // Calculate total refund amount for failed domains
          const totalRefundAmount = failedDomainPayments.reduce(
            (sum, payment) => sum + (payment.amount || 0),
            0
          );

          // Only process refund if there's an amount to refund
          if (totalRefundAmount > 0) {
            // Find payment record associated with this transaction
            const paymentRecord = await Payment.findOne({
              userId,
              transactionId: walletTransaction._id,
              status: "completed",
            });

            if (paymentRecord) {
              // Process refund for failed domains
              await processAutomaticRefund({
                userId: userId,
                originalPaymentId: paymentRecord.paymentId,
                originalPayment: paymentRecord,
                amount: totalRefundAmount,
                currency: walletTransaction.currency || "USD",
                reason: `Domain purchase failed for: ${failedDomains.join(", ")}`,
                service: "Domain Registration",
                title: `Refund - Failed Domain Purchase`,
                metadata: {
                  failedDomains: failedDomains,
                  walletTransactionId: walletTransactionId,
                  purchasedDomains: purchasedDomains,
                  refundType: purchasedDomains.length > 0 ? "partial" : "full",
                },
              });

              console.log(`✅ Automatic refund processed: $${totalRefundAmount} ${walletTransaction.currency || "USD"} refunded to wallet for failed domains`);
            } else {
              // If no payment record found, try to refund based on transaction amount
              // This handles edge cases where payment record might not exist
              console.warn(`⚠️ Payment record not found for transaction ${walletTransactionId}, attempting direct refund`);
              
              await processAutomaticRefund({
                userId: userId,
                originalPaymentId: null,
                originalPayment: null,
                amount: totalRefundAmount,
                currency: walletTransaction.currency || "USD",
                reason: `Domain purchase failed for: ${failedDomains.join(", ")}`,
                service: "Domain Registration",
                title: `Refund - Failed Domain Purchase`,
                metadata: {
                  failedDomains: failedDomains,
                  walletTransactionId: walletTransactionId,
                  purchasedDomains: purchasedDomains,
                  refundType: purchasedDomains.length > 0 ? "partial" : "full",
                  note: "Refund processed without original payment record",
                },
              });

              console.log(`✅ Direct refund processed: $${totalRefundAmount} ${walletTransaction.currency || "USD"} refunded to wallet`);
            }
          }
        } catch (refundError) {
          console.error("❌ Failed to process automatic refund:", refundError);
          // Don't fail the entire request, just log the error
          // The user can contact support for manual refund if needed
        }
      }

      // Refund failed hosting when wallet payment was used
      if (failedHosting.length > 0 && walletTransaction && failedHostingPayments.length > 0) {
        try {
          const totalHostingRefund = failedHostingPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
          if (totalHostingRefund > 0) {
            const paymentRecord = await Payment.findOne({
              userId,
              transactionId: walletTransaction._id,
              status: "completed",
            });
            await processAutomaticRefund({
              userId,
              originalPaymentId: paymentRecord?.paymentId || null,
              originalPayment: paymentRecord || null,
              amount: totalHostingRefund,
              currency: walletTransaction.currency || "USD",
              reason: `Hosting purchase failed for: ${failedHosting.join(", ")}`,
              service: "Premium Web Hosting",
              title: "Refund - Failed Hosting Purchase",
              metadata: {
                failedHosting,
                walletTransactionId,
                purchasedHosting,
                refundType: purchasedHosting.length > 0 ? "partial" : "full",
              },
            });
            console.log(`✅ Automatic refund processed: $${totalHostingRefund} ${walletTransaction.currency || "USD"} for failed hosting`);
          }
        } catch (refundError) {
          console.error("❌ Failed to process automatic refund for hosting:", refundError);
        }
      }

      let success = true;
      let message = "";

      const hasAnySuccess = purchasedDomains.length > 0 || purchasedHosting.length > 0;
      const hasAnyFailure = failedDomains.length > 0 || failedHosting.length > 0;
      if (!hasAnySuccess && hasAnyFailure) {
        success = false;
        const parts = [];
        if (failedDomains.length) parts.push(`domains: ${failedDomains.join(", ")}`);
        if (failedHosting.length) parts.push(`hosting: ${failedHosting.join(", ")}`);
        message = `❌ Purchase failed for ${parts.join("; ")}`;
      } else if (hasAnySuccess && hasAnyFailure) {
        success = true;
        const parts = [];
        if (failedDomains.length) parts.push(`domains: ${failedDomains.join(", ")}`);
        if (failedHosting.length) parts.push(`hosting: ${failedHosting.join(", ")}`);
        message = `⚠️ Some items purchased successfully, but failed for ${parts.join("; ")}`;
      } else if (hasAnySuccess) {
        success = true;
        const parts = [];
        if (purchasedDomains.length) parts.push("domains");
        if (purchasedHosting.length) parts.push("hosting");
        message = `✅ All ${parts.join(" and ")} purchased successfully.`;
      } else {
        success = false;
        message = "❌ No items in cart to checkout or purchase failed.";
      }

      console.log("🔍 Checkout Summary:");
      console.log(`   ✅ Domains purchased: ${purchasedDomains.join(", ") || "None"}`);
      console.log(`   ❌ Domains failed: ${failedDomains.join(", ") || "None"}`);
      console.log(`   ✅ Hosting purchased: ${purchasedHosting.length} order(s)`);
      console.log(`   ❌ Hosting failed: ${failedHosting.join(", ") || "None"}`);
      console.log("----------------------------------------------------");

      // Mark promocode as used if purchase was successful and promocode was applied
      if (success && (purchasedDomains.length > 0 || purchasedHosting.length > 0)) {
        const promoCode = req.body.promoCode || req.query.promoCode;
        if (promoCode) {
          try {
            await markPromoCodeAsUsed(userId, promoCode, walletTransactionId || "cart-checkout");
            console.log(`✅ Promocode ${promoCode} marked as used for user ${userId}`);
          } catch (promoError) {
            console.error("Error marking promocode as used:", promoError);
            // Don't fail the request if promocode marking fails
          }
        }
      }
      
      res.status(success ? 200 : 400).json({
        success,
        message,
        data: {
          purchasedDomains,
          failedDomains,
          purchasedHosting,
          failedHosting,
        },
      });

    } catch (error) {
      console.error("❌ Checkout Error:", error);
      next(error);
    }
  }

  static async clear(req, res, next) {
    try {
      const userId = req.user.id;
      const result = await CartItem.deleteMany({ userId });
      return res.status(200).json({
        success: true,
        message: "Cart cleared successfully.",
        deletedCount: result.deletedCount,
      });
    } catch (error) {
      console.error("Error clearing cart:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to clear cart.",
      });
    }
  }

  static async update(req, res, next) {
    try {
      const userId = req.user.id;
      const { id, years, price, whoisProtection, hosting } = req.body;

      const updateData = {};
      if (years !== undefined) updateData["domain.years"] = years;
      if (price !== undefined) {
        if (typeof price === 'object') {
          if (price.amount !== undefined) updateData["price.amount"] = price.amount;
          if (price.originalAmount !== undefined) updateData["price.originalAmount"] = price.originalAmount;
          // if (price.discountPercent !== undefined) updateData["price.discountPercent"] = price.discountPercent;
          if (price.currency !== undefined) updateData["price.currency"] = price.currency;
        } else {
          updateData.price = price;
        }
      }
      if (whoisProtection !== undefined) {
        updateData["domain.whoisProtection"] = Boolean(whoisProtection);
      }
      // Handle hosting data updates
      if (hosting !== undefined && typeof hosting === 'object') {
        Object.keys(hosting).forEach(key => {
          updateData[`hosting.${key}`] = hosting[key];
        });
      }

      const updatedItem = await CartItem.findOneAndUpdate(
        { _id: id, userId, status: "in_cart" },
        { $set: updateData },
        { new: true }
      );

      if (!updatedItem) {
        return res.status(404).json({ success: false, message: "Item not found in cart" });
      }

      res.json({ success: true, data: updatedItem, message: "Cart item updated successfully" });
    } catch (err) {
      next(err);
    }
  }




  
}

module.exports = CartController;


