const db = require("../models");

const Rentals = db.rentals;
const Locations = db.locations;
const Corporates = db.corporates;
const Users = db.users;
const Boxes = db.boxes;
const Complaints = db.complaints;
const PowerBanks = db.powerbanks;
const getCardData = async () => {
  try {
    const data = await getAllCounts();
    const cardData = data;

    const metaData = [
      {
        variant: "success",
        description: "Active Users",
        stats: String(cardData?.activeUsers),
        icon: "fe-user-check",
      },
      {
        variant: "secondary",
        description: "Total Users",
        stats: String(cardData?.totalUsers?.total_users),
        icon: "fe-users",
      },

      {
        variant: "primary",
        description: "Corporates",
        stats: String(cardData?.corporates),
        icon: "fe-briefcase",
      },
      {
        variant: "info",
        description: "Locations",
        stats: String(cardData?.locations),
        icon: "fe-map-pin",
      },
      {
        variant: "warning",
        description: "Total Rentals",
        stats: String(cardData?.rentals),
        icon: "fe-clock",
      },
      {
        variant: "warning",
        description: "Total Revenue",
        stats: String(cardData?.totalRevenue?.total_revenue),
        icon: "fe-dollar-sign",
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
      order: [["created_at", "DESC"]],
      limit: 10,
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

    const labels = ["Total Power Banks", "In Use", "Available"];
    const series = [counts.totalCount, counts.inUse, counts.available];

    console.log("statusCounts", statusCounts);
    console.log("statusCounts", labels);
    console.log("statusCounts", series);

    return { labels, series };
  } catch (error) {
    console.log("Error in getting power bank counts");
    throw error;
  }
};

const getAllCounts = async () => {
  try {
    const [rentals, activeUsers, locations, corporates, totalUsers, totalRevenue] = await Promise.all([
      Rentals.count(),
      Users.count({
        where: {
          status: "active",
        },
      }),
      Locations.count(),
      Corporates.count(),
      db.sequelize.query(
        `
  SELECT COUNT(DISTINCT user_id) AS total_users
  FROM rentals;`,
        {
          type: db.sequelize.QueryTypes.SELECT,
        }
      ),
      db.sequelize.query(
        `
        SELECT SUM(p.amount) AS total_revenue
        FROM rental_payments p;`,
        {
          type: db.sequelize.QueryTypes.SELECT,
        }
      ),
    ]);

    return {
      rentals,
      activeUsers,
      locations,
      corporates,
      totalUsers: totalUsers?.[0] || 0,
      totalRevenue: totalRevenue?.[0] || 0,
    };
  } catch (error) {
    console.log("error in getting all counts", error);
    throw error;
  }
};

const getLocationWiseRentalsCount = async () => {
  try {
    const locationWiseCount = await db.sequelize.query(
      `
      SELECT 
  l.name AS label,
  COUNT(r.id) AS value
FROM 
  rentals r
JOIN 
  locations l ON r.location_id = l.id
GROUP BY 
  l.name;
      `,
      {
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    return locationWiseCount;
  } catch (error) {
    console.log("error in getting location wise rentals count", error);
    throw error;
  }
};

const getCorporateWiseRentalsCount = async () => {
  try {
    const locationWiseCount = await db.sequelize.query(
      `
      SELECT 
  l.name AS label,
  COUNT(r.id) AS value
FROM 
  rentals r
JOIN 
  corporates l ON r.corporate_id = l.id
GROUP BY 
  l.name;
      `,
      {
        type: db.sequelize.QueryTypes.SELECT,
      }
    );

    return locationWiseCount;
  } catch (error) {
    console.log("error in getting corporate wise rentals count", error);
    throw error;
  }
};

module.exports = {
  getCardData,
  getCompalaintsList,
  getYearWiseReveue,
  getPowerBankCounts,
  getLocationWiseRentalsCount,
  getCorporateWiseRentalsCount,
};
