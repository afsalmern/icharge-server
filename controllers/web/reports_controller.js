const { Op } = require("sequelize");
const moment = require("moment");
const db = require("../../models");
const { sendSuccess } = require("../../handlers/success_response_handler");
const { ApiError } = require("../../middlewares/error");

const Rentals = db.rentals;

// Generate Rental Report
exports.generateRentalReport = async (req, res, next) => {
  try {
    const { startDate, endDate, packageType, rentalStatus, paymentStatus, locationId } = req.query;

    console.log("Query parameters:", req.query);

    // Build filter conditions
    const where = {};

    // Date filter
    if (startDate && endDate) {
      where.start_time = {
        [Op.between]: [moment(startDate).startOf("day").toDate(), moment(endDate).endOf("day").toDate()],
      };
    }

    // Package type filter
    if (packageType) {
      where["$rented_package.type$"] = packageType;
    }

    // Rental status filter
    if (rentalStatus) {
      where.status = rentalStatus;
    }

    // Payment status filter (placeholder; adjust based on actual source)
    if (paymentStatus) {
      where.payment_status = paymentStatus; // Remove or adjust if not in rentals table
    }

    // Location filter (rented from)
    if (locationId) {
      where["$rented_box.location_id$"] = locationId;
    }

    // Fetch rentals with associated models
    const rentals = await Rentals.findAll({
      where,
      include: [
        {
          model: db.users,
          as: "rented_user",
          attributes: ["name"],
        },
        {
          model: db.boxes,
          as: "rented_box",
          attributes: ["id", "location_id"],
          include: [
            {
              model: db.locations,
              as: "location",
              attributes: ["name", "id"],
            },
          ],
        },
        {
          model: db.packages,
          as: "rented_package",
          attributes: ["type"], // Removed 'amount' due to error
        },
        {
          model: db.locations,
          as: "return_location",
          attributes: ["name", "id"],
          required: false,
        },
        {
          model: db.disputes,
          as: "disputes",
          attributes: ["id"],
          required: false,
        },
      ],
      attributes: ["id", "start_time", "end_time", "status", "extra_charge", "extra_hours", "power_number"],
      order: [["start_time", "DESC"]],
    });

    // Transform data for report
    const report = rentals.map((rental) => {
      const duration = rental.end_time && rental.start_time ? moment(rental.end_time).diff(moment(rental.start_time), "hours") : null;

      // Calculate swap count (simplified; assumes power_number change = swap)
      const swapCount = rental.power_number ? 1 : 0; // TODO: Confirm swap count logic

      // Calculate amounts (placeholder; adjust based on actual rental cost source)
      const rentalAmount = 0; // TODO: Replace with actual rental cost from packages or other table
      const extraAmount = rental.extra_charge || 0;
      const totalAmount = rentalAmount + extraAmount;

      // Derive payment status (placeholder; adjust based on actual payment logic)
      const derivedPaymentStatus = totalAmount > 0 ? "Paid" : "Unpaid"; // TODO: Confirm payment status logic

      return {
        rentalId: rental.id,
        userName: rental.rented_user?.name || "N/A",
        rentedFrom: rental.rented_box?.location?.name || "N/A",
        returnedTo: rental.return_location?.name || "N/A",
        rentedAt: rental.start_time,
        returnedAt: rental.end_time,
        duration: duration ? `${duration} hours` : "Ongoing",
        swapCount,
        packageType: rental.rented_package?.type || "N/A",
        rentalAmount,
        extraAmount,
        totalAmount,
        viewDispute: rental.disputes?.length > 0 ? "View" : "None",
        rentalStatus: rental.status,
        paymentStatus: paymentStatus ? rental.payment_status : derivedPaymentStatus,
      };
    });

    sendSuccess(res, "Rental report generated successfully", { report }, 200);
  } catch (error) {
    console.error("Error generating rental report:", error);
    next(new ApiError(500, "Failed to generate rental report", error.message));
  }
};

exports.generateLocationsReport = async (req, res, next) => {
  try {
    const { startDate, endDate, packageType, rentalStatus, paymentStatus, locationId } = req.query;

    const report = await db.sequelize.query(
      `
      SELECT 
  l.name AS location_name,
  l.address,
  COUNT(DISTINCT b.id) AS total_devices,
  COALESCE(SUM(b.available_powerbanks), 0) AS total_slot,
  COUNT(r.id) AS total_rentals
FROM 
  locations l
LEFT JOIN 
  boxes b ON b.location_id = l.id
LEFT JOIN 
  rentals r ON r.box_id = b.id
GROUP BY 
  l.id, l.name, l.address
ORDER BY
  total_rentals DESC
  ;`,
      {
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    const rentals = await Rentals.findAll({
      include: [
        {
          model: db.users,
          as: "rented_user",
          attributes: ["name"],
        },
        {
          model: db.boxes,
          as: "rented_box",
          attributes: ["id", "location_id"],
          include: [
            {
              model: db.locations,
              as: "location",
              attributes: ["name", "id"],
            },
          ],
        },
        {
          model: db.locations,
          as: "return_location",
          attributes: ["name", "id"],
          required: false,
        },
        {
          model: db.disputes,
          as: "disputes",
          attributes: ["id"],
          required: false,
        },
      ],
      attributes: ["id", "start_time", "end_time", "status"],
      order: [["start_time", "DESC"]],
    });

    const locationWiseReport = rentals.map((rental) => {
      return {
        rentedFrom: rental.rented_box?.location?.name || "N/A",
        userName: rental.rented_user?.name || "N/A",
        returnedTo: rental.return_location?.name || "N/A",
        rentedAt: rental.start_time,
        returnedAt: rental.end_time,
        rentalStatus: rental.status,
      };
    });

    console.log("report", report);

    sendSuccess(res, "Location report generated successfully", { report, locationWiseReport }, 200);
  } catch (error) {
    console.error("Error generating location report:", error);
    next(new ApiError(500, "Failed to generate location report", error.message));
  }
};

exports.generateRevenewReport = async (req, res, next) => {
  try {
    const { startDate, endDate, locationId = "all", packageType = "all" } = req.query;

    console.log("Query parameters:", req.query);

    // Build filter conditions for rental_payments
    const where = {};

    // Date filter for payment creation time
    if (startDate && endDate) {
      where.created_at = {
        [Op.between]: [moment(startDate).startOf("day").toDate(), moment(endDate).endOf("day").toDate()],
      };
    }

    // Fetch payments with associated models
    const payments = await db.rental_payments.findAll({
      where,
      include: [
        {
          model: db.rentals,
          as: "rental",
          required: true,
          attributes: ["id", "start_time", "end_time", "status", "extra_charge"],
          include: [
            {
              model: db.users,
              as: "rented_user",
              attributes: ["name"],
            },
            {
              model: db.boxes,
              as: "rented_box",
              attributes: ["id", "location_id"],
              include: [
                {
                  model: db.locations,
                  as: "location",
                  attributes: ["name"],
                  required: true,
                  ...(locationId !== "all" && {
                    where: {
                      name: locationId,
                    },
                  }),
                },
              ],
            },
            {
              model: db.packages,
              as: "rented_package",
              attributes: ["type"],
              required: true,
              ...(packageType !== "all" && {
                where: {
                  type: packageType,
                },
              }),
            },
          ],
        },
      ],
      attributes: ["id", "amount", "status", "created_at"],
    });

    // Transform data for report
    const report = payments.map((payment, index) => {
      const rental = payment.rental;

      // Log for debugging
      if (!rental) {
        console.warn(`Payment ${payment.id} at index ${index} has no associated rental`);
      }

      const duration = rental?.end_time && rental?.start_time ? moment(rental.end_time).diff(moment(rental.start_time), "hours") : null;

      // Calculate amounts with safeguards
      const rentedAmount = payment.status === "success" && payment.amount != null ? Number(payment.amount) : 0;
      const extraAmount = rental?.extra_charge != null ? Number(rental.extra_charge) : 0;
      const totalAmount = rentedAmount + extraAmount;

      // Log problematic amounts
      if (isNaN(totalAmount)) {
        console.warn(`Invalid totalAmount for payment ${payment.id}: rentedAmount=${rentedAmount}, extraAmount=${extraAmount}`);
      }

      // Determine overdue status based on end_time
      let overdue = "No";
      if (rental && rental.end_time) {
        const isOverdue = moment().isAfter(moment(rental.end_time));
        overdue = isOverdue ? "Yes" : "No";
        if (isOverdue) {
          console.log(`Rental ${rental.id} is overdue: end_time=${rental.end_time}, current_time=${moment().toISOString()}`);
        }
      } else if (rental && !rental.end_time) {
        console.log(`Rental ${rental.id} has no end_time, marking overdue as No`);
      } else {
        console.warn(`Payment ${payment.id} has no rental, marking overdue as No`);
      }

      // Map payment status
      let paymentStatus;
      switch (payment.status) {
        case "success":
          paymentStatus = "Paid";
          break;
        case "pending":
          paymentStatus = "Unpaid";
          break;
        case "failed":
          paymentStatus = "Failed";
          break;
        default:
          paymentStatus = "Unknown";
      }

      return {
        rentalId: rental?.id || "N/A",
        userName: rental?.rented_user?.name || "N/A",
        rentalLocation: rental?.rented_box?.location?.name || "N/A",
        totalDurationUsed: duration ? `${duration} hours` : "Ongoing",
        packageType: rental?.rented_package?.type || "N/A",
        rentedAmount: Number(rentedAmount.toFixed(2)),
        overdue,
        totalRevenue: Number(totalAmount.toFixed(2)),
        paymentStatus,
      };
    });

    // Sort by totalRevenue (highest to lowest)
    report.sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Calculate sum of total amount and format to two decimal places
    const sumTotalAmount = report.length > 0 ? report.reduce((sum, item) => sum + (item.totalRevenue || 0), 0).toFixed(2) : "0.00";

    sendSuccess(res, "Revenue report generated successfully", { report, sumTotalAmount }, 200);
  } catch (error) {
    console.error("Error generating revenue report:", error);
    next(new ApiError(500, "Failed to generate revenue report", error.message));
  }
};
