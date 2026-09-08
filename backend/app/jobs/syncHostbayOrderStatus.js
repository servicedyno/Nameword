const schedule = require('node-schedule');
const HostingOrder = require('../models/HostingOrder');
const provider_config = require('../utils/Domain/config');
const createAxiosInstance = require('../utils/Domain/axiosInstance');

const axiosInstance = createAxiosInstance();


const fetchHostbayOrderStatus = async (orderId) => {
  try {
    const baseUrl = provider_config.hostbay.apiUrl.replace(/\/+$/, "");
    const cleanPath = `hosting/orders/${orderId}`.trim().replace(/^\/+/, "");
    const url = `${baseUrl}/${cleanPath}`;
    
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': provider_config.hostbay.apiKey,
      'accept': 'application/json',
    };

    const response = await axiosInstance({
      method: 'GET',
      url: url,
      headers: headers,
    });

    if (response.data && response.data.success === true) {
      return {
        success: true,
        data: response.data.data,
      };
    }

    return {
      success: false,
      error: 'Invalid response from HostBay API',
    };
  } catch (error) {
    console.error(`Error fetching HostBay order ${orderId}:`, error.message);
    return {
      success: false,
      error: error.message,
      statusCode: error.response?.status,
    };
  }
};

/**
 * Sync HostBay order statuses
 */
const syncHostbayOrderStatus = async () => {
  try {
    console.log('🔄 Starting HostBay order status sync...');


    const ordersToCheck = await HostingOrder.find({
      provider: 'hostbay',
      hostbayOrderId: { $exists: true, $ne: null },
      $or: [
        { status: { $in: ['pending', 'processing', 'failed'] } }, 
        {
          'hostbayResponse.status': {
            $in: ['provisioning', 'processing', 'pending', 'failed'], // Added 'failed'
          },
        },
      ],
    }).lean();

    const totalOrders = await HostingOrder.countDocuments({
      provider: 'hostbay',
      hostbayOrderId: { $exists: true, $ne: null },
    });


    if (ordersToCheck.length === 0) {
      console.log('✅ No orders to sync');
      const allHostbayOrders = await HostingOrder.find({
        provider: 'hostbay',
        hostbayOrderId: { $exists: true, $ne: null },
      })
        .select('status hostbayResponse.status hostbayOrderId')
        .lean();
      return;
    }

    let updatedCount = 0;
    let errorCount = 0;



    // Process each order
    for (const order of ordersToCheck) {
      try {
        const orderStatus = await fetchHostbayOrderStatus(order.hostbayOrderId);

        if (!orderStatus.success) {
          console.error(
            `❌ Failed to fetch status for order ${order.hostbayOrderId}:`,
            orderStatus.error
          );
          errorCount++;
          continue;
        }

        const hostbayData = orderStatus.data;
        const newStatus = hostbayData.status; // "completed", "failed", etc.

        let mappedStatus;
        switch (newStatus) {
          case 'completed':
            mappedStatus = 'completed';
            break;
          case 'failed':
            mappedStatus = 'failed';
            break;
          case 'cancelled':
            mappedStatus = 'cancelled';
            break;
          case 'processing':
          case 'pending':
          case 'provisioning':
            mappedStatus = 'processing';
            break;
          default:
            mappedStatus = 'processing';
        }

        // Only update if status changed
        if (order.status !== mappedStatus) {
          const updateData = {
            status: mappedStatus,
            hostbayResponse: hostbayData,
            updatedAt: new Date(),
          };

          // Update error message if failed, clear if completed
          if (mappedStatus === 'failed' && hostbayData.message) {
            updateData.errorMessage = hostbayData.message;
          } else if (mappedStatus === 'completed') {
            updateData.errorMessage = null; // Clear error message on completion
          }

          // Update HostingOrder in database
          await HostingOrder.findByIdAndUpdate(order._id, updateData);

          console.log(
            `✅ Updated order ${order.hostbayOrderId}: ${order.status} → ${mappedStatus}`
          );
          updatedCount++;

          // If completed, you might want to trigger additional actions here
          if (mappedStatus === 'completed') {
            console.log(
              `🎉 Order ${order.hostbayOrderId} completed successfully`
            );
            // You can add notification logic here if needed
          }

          // If failed, log the error
          if (mappedStatus === 'failed') {
            console.error(
              `❌ Order ${order.hostbayOrderId} failed:`,
              hostbayData.message || 'Unknown error'
            );
            // You can add notification logic here if needed
          }
        } else {
          // Status unchanged, but update hostbayResponse to keep it fresh
          await HostingOrder.findByIdAndUpdate(order._id, {
            hostbayResponse: hostbayData,
            updatedAt: new Date(),
          });
        }
      } catch (error) {
        console.error(
          `❌ Error processing order ${order.hostbayOrderId}:`,
          error.message
        );
        errorCount++;
      }
    }

    console.log(
      `✅ Sync complete: ${updatedCount} updated, ${errorCount} errors, ${ordersToCheck.length - updatedCount - errorCount} unchanged`
    );
  } catch (error) {
    console.error('❌ Error in HostBay order status sync:', error);
  }
};

schedule.scheduleJob('*/5 * * * *', () => {
  console.log('🔄 Running HostBay order status sync job...');
  syncHostbayOrderStatus();
});

module.exports = syncHostbayOrderStatus;

