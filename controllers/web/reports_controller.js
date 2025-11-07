const { Op } = require("sequelize");
const moment = require("moment");
const db = require("../../models");
const { sendSuccess } = require("../../handlers/success_response_handler");
const { ApiError } = require("../../middlewares/error");
const { getDuration } = require("../../helpers/rentalsHelper");
const { calculatePriceOnRentals, calculateTotalTimeUsed } = require("../../helpers/calculatePrices");

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
          attributes: ["type", "price", "duration", "hourly_price"], // Removed 'amount' due to error
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
        {
          model: db.rental_payments,
          as: "rental_payments",
          attributes: ["status"],
          required: false,
        },
      ],
      attributes: ["id", "start_time", "status", "extra_charge", "extra_hours", "return_time"],
      order: [["start_time", "DESC"]],
    });

    // Transform data for report
    const report = rentals.map((rental) => {
      // Calculate amounts (placeholder; adjust based on actual rental cost source)

      const { id, start_time, return_time, status, rented_package, rented_box, rental_payments, rented_user } = rental;

      console.log("RENTAL PAYMENTS ===========>", rental_payments);

      const { name } = rented_user;
      const { location } = rented_box;
      const { hourly_price, duration, price, type } = rented_package;

      const rentalAmount = price || 0; // TODO: Replace with actual rental cost from packages or other table
      const packageDuration = duration || 0;
      const cost_details = calculatePriceOnRentals(start_time, hourly_price, packageDuration || 0, type);
      const { extra_charge } = cost_details;

      const totalAmount = parseFloat(rentalAmount) + extra_charge;
      const time_used = calculateTotalTimeUsed(start_time, return_time, status);

      return {
        rentalId: id,
        userName: name || "N/A",
        rentedFrom: location?.name || "N/A",
        rentedAt: start_time,
        returnedAt: return_time,
        duration: duration,
        packageType: rented_package?.type || "N/A",
        rentalAmount,
        extraAmount: extra_charge,
        totalAmount,
        rentalStatus: status,
        paymentStatus: rental_payments?.status || "N/A",
        time_used,
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
          attributes: ["id", "start_time", "end_time", "status", "extra_charge", "return_time"],
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
              ...(locationId !== "all" && {
                where: {
                  location_id: locationId,
                },
              }),
              include: [
                {
                  model: db.locations,
                  as: "location",
                  attributes: ["name"],
                  required: true,
                },
              ],
            },
            {
              model: db.packages,
              as: "rented_package",
              attributes: ["type", "hourly_price", "price", "duration"],
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

    // Log for debugging
    if (!payments) {
      throw new ApiError(404, "Rental not found");
    }

    // Transform data for report
    const report = payments.map((payment, index) => {
      const rental = payment.rental;
      const { rented_package, start_time, return_time, status } = rental;
      const { type, hourly_price, duration: packageDuration } = rented_package;

      const cost_details = calculatePriceOnRentals(start_time, hourly_price, packageDuration || 0, type);
      const time_used = calculateTotalTimeUsed(start_time, return_time, status);

      const { extra_charge } = cost_details;

      // Calculate amounts with safeguards
      const rentedAmount = parseFloat(payment.amount);
      const extraAmount = extra_charge;
      const totalAmount = rentedAmount + extraAmount;

      // Log problematic amounts
      if (isNaN(totalAmount)) {
        console.warn(`Invalid totalAmount for payment ${payment.id}: rentedAmount=${rentedAmount}, extraAmount=${extraAmount}`);
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
        packageType: type || "N/A",
        rentedAmount: rentedAmount,
        overdue: extra_charge == 0 ? "No" : "Yes",
        totalRevenue: Number(totalAmount.toFixed(2)),
        paymentStatus,
        time_used,
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
