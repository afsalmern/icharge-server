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
              attributes: ["name"],
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
          attributes: ["name"],
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
      const duration =
        rental.end_time && rental.start_time ? moment(rental.end_time).diff(moment(rental.start_time), "hours") : null;

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
