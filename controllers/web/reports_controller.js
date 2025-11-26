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
    const { user, startDate, endDate, packageType, rentalStatus, paymentStatus, locationId, corporateId, type, page = 1, limit = 20 } = req.query;

    // Build filter conditions
    const where = {
      type,
    };

    if (user) {
      where.user_id = user;
    }

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

    let result = {};

    if (type == "location") {
      result = await getLocationWiseRentals(where, locationId, page, limit);
    } else {
      result = await getCorporateWiseRentals(where, corporateId, page, limit);
    }

    const { rentals, pagination } = result;

    // Transform data for report
    const report = rentals.map((rental) => {
      const { id, start_time, return_time, status, code: code_used, rented_package, rental_payments, rented_user } = rental;

      const pickup_location = type == "location" ? rental.pickup_location?.name : rental.rented_corporate?.name;
      const returned_location = type == "location" ? rental.returned_location?.name : rental.rented_corporate?.name;

      const { name } = rented_user;
      const { hourly_price, duration, type: packageType } = rented_package;

      const packageDuration = duration || 0;
      const cost_details = calculatePriceOnRentals(start_time, hourly_price, packageDuration || 0, packageType);
      const { extra_charge } = cost_details;
      const payment = Array.isArray(rental_payments) && rental_payments.length > 0 ? rental_payments[0] : rental_payments;

      const time_used = calculateTotalTimeUsed(start_time, return_time, status);

      const paymentStatus = payment?.status || payment?.dataValues?.status || "N/A";
      const amountPaid = payment?.amount || payment?.dataValues?.amount || 0;
      const totalAmount = parseFloat(amountPaid) + extra_charge;

      return {
        rentalId: id,
        userName: name || "N/A",
        rentedFrom: pickup_location || "N/A",
        rentedTo: returned_location || "N/A",
        rentedAt: start_time,
        returnedAt: return_time,
        duration: duration,
        packageType: rented_package?.type || "N/A",
        rentalAmount: amountPaid,
        extraAmount: extra_charge,
        totalAmount,
        rentalStatus: status,
        paymentStatus,
        time_used,
        code_used: code_used || "N/A",
      };
    });

    sendSuccess(res, "Rental report generated successfully", { report, pagination }, 200);
  } catch (error) {
    console.error("Error generating rental report:", error);
    next(new ApiError(500, "Failed to generate rental report", error.message));
  }
};

exports.generateLocationsReport = async (req, res, next) => {
  const { type } = req.query;

  try {
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
    const {
      user,
      startDate,
      endDate,
      locationId = "all",
      packageType = "all",
      corporateId = "all",
      type: rentalType,
      page = 1,
      limit = 20,
    } = req.query;

    const where = {};

    if (user) {
      where.user_id = user;
    }

    // Date filter for payment creation time
    if (startDate && endDate) {
      where.created_at = {
        [Op.between]: [moment(startDate).startOf("day").toDate(), moment(endDate).endOf("day").toDate()],
      };
    }

    let payments = [];
    if (rentalType == "location") {
      payments = await locationWiseRevenues(where, packageType, locationId, page, limit);
    } else {
      payments = await corporateWiseRevenues(where, packageType, corporateId, page, limit);
    }

    const { payments: paymentsData, pagination } = payments;

    // Transform data for report
    const report = paymentsData.map((payment, index) => {
      const rental = payment.rental;
      const { rented_package, start_time, return_time, status } = rental;
      const { type, hourly_price, duration: packageDuration } = rented_package;

      const cost_details = calculatePriceOnRentals(start_time, hourly_price, packageDuration || 0, type);
      const time_used = calculateTotalTimeUsed(start_time, return_time, status);

      const rented_from = rentalType == "location" ? rental?.pickup_location?.name || "N/A" : rental?.rented_corporate?.name || "N/A";

      const { extra_charge } = cost_details;

      // Calculate amounts with safeguards
      const rentedAmount = parseFloat(payment.amount);
      const extraAmount = extra_charge;
      const totalAmount = rentedAmount + extraAmount;

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
        rentalLocation: rented_from,
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

    sendSuccess(res, "Revenue report generated successfully", { report, pagination }, 200);
  } catch (error) {
    console.error("Error generating revenue report:", error);
    next(new ApiError(500, "Failed to generate revenue report", error.message));
  }
};

exports.getUserReferels = async (req, res, next) => {
  try {
    const referals = await db.user_referels.findAll({
      include: [
        {
          model: db.users,
          as: "user",
          attributes: ["name"],
        },
        {
          model: db.referel_codes,
          as: "code",
          attributes: ["code"],
        },
      ],
    });

    return sendSuccess(res, "User referels fetched successfully", referals, 200);
  } catch (error) {
    console.error("Error getting user referels :", error);
    next(error);
  }
};

const getLocationWiseRentals = async (where, location_id, page = 1, limit = 20) => {
  if (location_id) {
    where["location_id"] = location_id;
  }

  try {
    // Convert page and limit to integers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    // Get total count for pagination
    const totalCount = await Rentals.findAll({
      where,
      include: [
        {
          model: db.packages,
          as: "rented_package",
          attributes: [], // Removed 'amount' due to error
        },
      ],
      attributes: ["id"],
      order: [["start_time", "DESC"]],
    });

    const rentals = await Rentals.findAll({
      where,
      subQuery: false,
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
        },
        {
          model: db.packages,
          as: "rented_package",
          attributes: ["type", "duration", "hourly_price"], // Removed 'amount' due to error
        },
        {
          model: db.locations,
          as: "pickup_location", // 🔹 first location association
          attributes: ["id", "name", "address"],
        },
        {
          model: db.locations,
          as: "return_location", // 🔹 second location association
          attributes: ["id", "name", "address"],
        },
        {
          model: db.rental_payments,
          as: "rental_payments",
          attributes: ["status", "amount"],
          seperate: true,
        },
      ],
      attributes: ["id", "start_time", "status", "extra_charge", "extra_hours", "return_time", "code"],
      order: [["start_time", "DESC"]],
      limit: limitNum,
      offset: offset,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount?.length / limitNum);

    return {
      rentals,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: totalCount.length,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
    };
  } catch (error) {
    console.log("error getting location wise rentals", error);
    throw error;
  }
};

const getCorporateWiseRentals = async (where, corporate_id, page = 1, limit = 20) => {
  if (corporate_id) {
    where["corporate_id"] = corporate_id;
  }

  try {
    // Convert page and limit to integers
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;

    const totalCount = await Rentals.findAll({
      where,
      include: [
        {
          model: db.packages,
          as: "rented_package",
          attributes: [], // Removed 'amount' due to error
        },
      ],
      attributes: ["id"],
      order: [["start_time", "DESC"]],
    });

    const rentals = await Rentals.findAll({
      where,
      subQuery: false,
      include: [
        {
          model: db.users,
          as: "rented_user",
          attributes: ["name"],
        },
        {
          model: db.packages,
          as: "rented_package",
          attributes: ["type", "duration", "hourly_price"], // Removed 'amount' due to error
        },
        {
          model: db.corporates,
          as: "rented_corporate", // 🔹 first location association
          attributes: ["id", "name"],
        },
        {
          model: db.rental_payments,
          as: "rental_payments",
          attributes: ["status", "amount"],
          seperate: true,
        },
      ],
      attributes: ["id", "start_time", "status", "extra_charge", "extra_hours", "return_time", "corporate_id", "code"],
      order: [["start_time", "DESC"]],
      limit: limitNum,
      offset: offset,
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(totalCount?.length / limitNum);

    return {
      rentals,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: totalCount?.length,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
    };
  } catch (error) {
    console.log("error getting corporate wise rentals", error);
    throw error;
  }
};

const locationWiseRevenues = async (where, packageType, locationId, page = 1, limit = 20) => {
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;

  try {
    const paymentsCount = await db.rental_payments.findAll({
      where,
      include: [
        {
          model: db.rentals,
          as: "rental",
          required: true,
          attributes: ["id"],
          include: [
            {
              model: db.locations,
              as: "pickup_location", // 🔹 first location association
              attributes: ["id"],
              required: true,
              ...(locationId !== "all" && {
                where: {
                  id: locationId,
                },
              }),
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
      attributes: ["id"],
    });

    const payments = await db.rental_payments.findAll({
      where,
      include: [
        {
          model: db.rentals,
          as: "rental",
          required: true,
          attributes: ["id", "start_time", "end_time", "status", "extra_charge", "return_time", "type", "location_id"],
          include: [
            {
              model: db.users,
              as: "rented_user",
              attributes: ["name"],
            },
            {
              model: db.locations,
              as: "pickup_location", // 🔹 first location association
              attributes: ["id", "name", "address"],
              required: true,
              ...(locationId !== "all" && {
                where: {
                  id: locationId,
                },
              }),
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
      limit: limitNum,
      offset: offset,
    });

    const totalPages = Math.ceil(paymentsCount?.length / limitNum);

    return {
      payments,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: paymentsCount?.length,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
    };
  } catch (error) {
    console.log("error getting location wise revenues", error);
    throw error;
  }
};

const corporateWiseRevenues = async (where, packageType, corporateId, page = 1, limit = 20) => {
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  const offset = (pageNum - 1) * limitNum;
  try {
    const paymentsCount = await db.rental_payments.findAll({
      where,
      include: [
        {
          model: db.rentals,
          as: "rental",
          required: true,
          attributes: ["id"],
          include: [
            {
              model: db.corporates,
              as: "rented_corporate", // 🔹 first location association
              attributes: ["id", "name"],
              required: true,
              ...(corporateId !== "all" && {
                where: {
                  id: corporateId,
                },
              }),
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
      attributes: ["id"],
    });

    const payments = await db.rental_payments.findAll({
      where,
      include: [
        {
          model: db.rentals,
          as: "rental",
          required: true,
          attributes: ["id", "start_time", "end_time", "status", "extra_charge", "return_time", "type", "corporate_id"],
          include: [
            {
              model: db.users,
              as: "rented_user",
              attributes: ["name"],
            },
            {
              model: db.corporates,
              as: "rented_corporate", // 🔹 first location association
              attributes: ["id", "name"],
              required: true,
              ...(corporateId !== "all" && {
                where: {
                  id: corporateId,
                },
              }),
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
      limit: limitNum,
      offset: offset,
    });

    const totalPages = Math.ceil(paymentsCount?.length / limitNum);

    return {
      payments,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems: paymentsCount?.length,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
      },
    };
  } catch (error) {
    console.log("error getting corporate wise revenues", error);
    throw error;
  }
};

const getLocationWiseReports = async () => {
  try {
    const report = await db.sequelize.query(
      `
      SELECT 
  l.name AS location_name,
  COUNT(DISTINCT b.id) AS total_devices,
  COALESCE(SUM(b.available_powerbanks), 0) AS total_slot,
  COUNT(r.id) AS total_rentals
FROM 
  locations l
  LEFT JOIN 
  boxes b ON b.location_id = l.id
LEFT JOIN 
  rentals b ON b.location_id = l.id
GROUP BY 
  l.id, l.name
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
          model: db.locations,
          as: "pickup_location", // 🔹 first location association
          attributes: ["id", "name", "address"],
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

    return {
      report,
      rentals,
    };
  } catch (error) {
    console.log("error getting location wise reports", error);
    throw error;
  }
};

const getCorporateWiseReports = async () => {
  try {
    const report = await db.sequelize.query(
      `
      SELECT 
  l.name AS location_name,
  COUNT(DISTINCT b.id) AS total_devices,
  COALESCE(SUM(b.available_powerbanks), 0) AS total_slot,
  COUNT(r.id) AS total_rentals
FROM 
  corporates l
  LEFT JOIN 
  boxes b ON b.corporate_id = l.id
LEFT JOIN 
  rentals b ON b.corporate_id = l.id
GROUP BY 
  l.id, l.name
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
          model: db.locations,
          as: "pickup_location", // 🔹 first location association
          attributes: ["id", "name", "address"],
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
  } catch (error) {
    console.log("error getting location wise reports", error);
    throw error;
  }
};
