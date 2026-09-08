const moment = require('moment');

const calculateNextPaymentDate = (currentPaymentDate, billingCycleType) => {
    const currentDate = moment.utc(); 
    let subscriptionEnd = moment.utc(currentPaymentDate); 

    // Check if the current subscription end date is before today's date
    if (subscriptionEnd.isBefore(currentDate)) {
        subscriptionEnd = currentDate.clone();
    }

    switch (billingCycleType) {
        case "Hourly":
            subscriptionEnd.add(1, "hours");
            break;
        case "Monthly":
            subscriptionEnd.add(1, "months");
            break;
        case "Quarterly":
            subscriptionEnd.add(3, "months");
            break;
        case "Annually":
            subscriptionEnd.add(1, "years");
            break;
        default:
            console.warn(`⚠ Unknown billing cycle type: ${billingCycleType}. Defaulting to Monthly.`);
            subscriptionEnd.add(1, "months");
    }

    return subscriptionEnd.toDate();
};

module.exports = { calculateNextPaymentDate };
