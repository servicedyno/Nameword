const schedule = require('node-schedule');
const Domain = require('../models/Domain');
const domainProviderApiClient = require('../utils/domainProviderApiClient');

/**
 * Sync domain transfer statuses from HostBay API
 */
const syncDomainTransferStatus = async () => {
  try {
    console.log('🔄 Starting domain transfer status sync...');

    // Find all domains with transfer-related status
    const domainsWithTransfers = await Domain.find({
      "transferInfo.transferStatus": { $exists: true, $ne: null },
      $or: [
        { "transferInfo.transferStatus": "Pending" },
        { "transferInfo.transferStatus": "Accepted" },
      ],
      deletedAt: { $eq: null }
    }).lean();

    if (domainsWithTransfers.length === 0) {
      console.log('✅ No domains with active transfers to sync');
      return;
    }

    console.log(`📋 Found ${domainsWithTransfers.length} domains with active transfers`);

    let updatedCount = 0;
    let errorCount = 0;
    let unchangedCount = 0;

    // Process each domain
    for (const domain of domainsWithTransfers) {
      try {
        const provider = domain.provider || "hostbay";

        // Only sync HostBay domains
        if (provider.toLowerCase() !== "hostbay") {
          unchangedCount++;
          continue;
        }

        // Fetch transfer status from HostBay API
        const response = await domainProviderApiClient.request(
          "TransferStatus",
          {
            domain_name: domain.websiteName.toLowerCase(),
          },
          "GET",
          "hostbay"
        );

        // Map the API response status
        const apiStatus = 
          response?.responseData?.status ||
          response?.responseData?.transfer_status ||
          response?.data?.status ||
          domain.transferInfo?.transferStatus;

        let mappedTransferStatus = "Pending";
        if (apiStatus?.toLowerCase().includes("accept") || 
          apiStatus?.toLowerCase() === "accepted") {
          mappedTransferStatus = "Accepted";
        } else if (apiStatus?.toLowerCase().includes("complete") || 
          apiStatus?.toLowerCase() === "completed") {
          mappedTransferStatus = "Completed";
        } else if (apiStatus?.toLowerCase().includes("fail") || 
          apiStatus?.toLowerCase() === "failed") {
          mappedTransferStatus = "Failed";
        } else if (apiStatus?.toLowerCase().includes("pending")) {
          mappedTransferStatus = "Pending";
        }

        // Only update if status changed
        if (domain.transferInfo.transferStatus !== mappedTransferStatus) {
          const updateData = {
            "transferInfo.transferStatus": mappedTransferStatus,
            updatedAt: new Date(),
          };

          // Update timestamps based on status
          if (mappedTransferStatus === "Accepted" || mappedTransferStatus === "Completed") {
            updateData["transferInfo.acceptedAt"] = domain.transferInfo?.acceptedAt || new Date();
          }
          if (mappedTransferStatus === "Completed") {
            updateData["transferInfo.completedAt"] = new Date();
          }

          await Domain.findByIdAndUpdate(domain._id, updateData);

          console.log(
            `✅ Updated domain ${domain.websiteName}: ${domain.transferInfo.transferStatus} → ${mappedTransferStatus}`
          );
          updatedCount++;

          // Log completion
          if (mappedTransferStatus === "Completed") {
            console.log(
              `🎉 Domain transfer ${domain.websiteName} completed successfully`
            );
          }

          // Log failures
          if (mappedTransferStatus === "Failed") {
            console.error(
              `❌ Domain transfer ${domain.websiteName} failed`
            );
          }
        } else {
          unchangedCount++;
        }
      } catch (error) {
        console.error(
          `❌ Error processing domain ${domain.websiteName}:`,
          error.message
        );
        errorCount++;
      }
    }

    console.log(
      `✅ Sync complete: ${updatedCount} updated, ${errorCount} errors, ${unchangedCount} unchanged`
    );
  } catch (error) {
    console.error('❌ Error in domain transfer status sync:', error);
  }
};

// Schedule to run every 5 minutes
schedule.scheduleJob('*/5 * * * *', () => {
  console.log('🔄 Running domain transfer status sync job...');
  syncDomainTransferStatus();
});

module.exports = syncDomainTransferStatus;
