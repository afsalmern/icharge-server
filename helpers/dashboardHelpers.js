const db = require("../models");

const Rentals = db.rentals;
const Locations = db.locations;
const Users = db.users;
const Complaints = db.complaints;
const PowerBanks = db.powerbanks;
const getCardData = async () => {
  try {
    const data = await getAllCounts();
    const cardData = data;

    const metaData = [
      {
        label: "Total Rentals",
        icon: "clock", // ⏰ Feather icon for time/rentals
        bg: "warning-subtle", // Yellow background tone
        value: cardData?.rentals,
      },
      {
        label: "Active Users",
        icon: "user-check", // ✅ Represents verified/active users
        bg: "success-subtle", // Green tone for active/healthy status
        value: cardData?.activeUsers,
      },
      {
        label: "Locations",
        icon: "map-pin", // 📍 Common icon for locations
        bg: "info-subtle", // Blue tone for geography/info
        value: cardData?.locations,
      },
      {
        label: "Total Revenue",
        icon: "dollar-sign", // 💰 Revenue icon
        bg: "primary-subtle", // Strong primary tone for importance
        value: cardData?.totalRevenue,
      },
    ];
    return metaData;
  } catch (error) {
    console.log("error in getting card data", error);
    throw error;
  }
};

const getCompalaintsList = async () => {
  try {
    const complaints = await Complaints.findAll({
      attributes: ["id", "user_id", "description", "issue_type", "ticket_no", "status"],
      include: [
        {
          model: Users,
          as: "user",
          attributes: ["name", "email", "mobile"],
        },
      ],
    });

    return complaints;
  } catch (error) {
    console.log("error in getting complaints list", error);
    throw error;
  }
};

const getYearWiseReveue = async (year) => {
  try {
    const yearWiseData = db.sequelize.query(
      `
      WITH months AS (
    SELECT generate_series(1, 12) AS month_num
),
rental_data AS (
    SELECT 
        EXTRACT(MONTH FROM r.created_at)::int AS month_num,
        SUM(p.price) AS total_revenue
    FROM rentals r
    JOIN packages p ON r.package_id = p.id
    WHERE EXTRACT(YEAR FROM r.created_at) = :year  -- 🎯 Year filter
    GROUP BY month_num
)
SELECT 
    TO_CHAR(TO_DATE(m.month_num::text, 'MM'), 'Mon') AS month,
    COALESCE(rd.total_revenue, 0) AS total_revenue
FROM months m
LEFT JOIN rental_data rd ON m.month_num = rd.month_num
ORDER BY m.month_num;
`,
      {
        type: db.sequelize.QueryTypes.SELECT,
        replacements: { year },
      }
    );

    return yearWiseData;
  } catch (error) {
    console.log("Error getting year wise data", error);
    throw error;
  }
};

const getPowerBankCounts = async () => {
  try {
    const statusCounts = await PowerBanks.findAll({
      attributes: ["status", [db.Sequelize.fn("COUNT", db.Sequelize.col("status")), "count"]],
      group: ["status"],
    });

    const counts = {
      totalCount: 0,
      inUse: 0,
      available: 0,
    };

    statusCounts.forEach(({ dataValues }) => {
      const { status, count } = dataValues;
      counts.totalCount += parseInt(count);
      if (status === "rented") counts.inUse += parseInt(count);
      if (status === "available") counts.available += parseInt(count);
    });

    return [counts];
  } catch (error) {
    console.log("Error in getting power bank counts");
    throw error;
  }
};

const getAllCounts = async () => {
  try {
    const [rentals, activeUsers, locations, totalRevenue] = await Promise.all([
      Rentals.count(),
      Users.count({
        where: {
          status: "active",
        },
      }),
      Locations.count(),
      db.sequelize.query(
        `
        SELECT SUM(p.price) AS total_revenue
        FROM rentals r
        JOIN packages p ON r.package_id = p.id;`,
        {
          type: db.sequelize.QueryTypes.SELECT,
        }
      ),
    ]);

    return {
      rentals,
      activeUsers,
      locations,
      totalRevenue: totalRevenue?.total_revenue?.[0] || 0,
    };
  } catch (error) {
    console.log("error in getting all counts", error);
    throw error;
  }
};

module.exports = { getCardData, getCompalaintsList, getYearWiseReveue, getPowerBankCounts };
