const calculatePriceOnRentals = (start_time, hourly_price, package_duration, package_type) => {
  const now = new Date();
  const start = new Date(start_time);

  // 1️⃣ Total hours used
  let totalHours = (now - start) / (1000 * 60 * 60); // ms → hours
  totalHours = Math.ceil(totalHours); // round up

  // 2️⃣ Convert package duration to hours based on type
  let packageHours = 0;
  switch (package_type) {
    case "hourly":
      packageHours = package_duration;
      break;
    case "weekly":
      packageHours = package_duration * 7 * 24;
      break;
    case "monthly":
      packageHours = package_duration * 30 * 24; // approx 30 days
      break;
    case "free":
      packageHours = 0;
      break;
    default:
      throw new Error("Invalid package type: " + package_type);
  }

  // 3️⃣ Calculate extra (overdue) hours
  let extraHours = totalHours - packageHours;
  extraHours = extraHours > 0 ? extraHours : 0;

  // 4️⃣ Calculate extra charge and total cost
  const extraCharge = extraHours * hourly_price;
  const totalCost = totalHours * hourly_price;

  // 5️⃣ Human readable breakdown
  let usedTimeStr, allowedTimeStr, overdueTimeStr;

  switch (package_type) {
    case "hourly":
      usedTimeStr = `${totalHours} hour(s) used`;
      allowedTimeStr = `${packageHours} hour(s) allowed`;
      overdueTimeStr = extraHours > 0 ? `${extraHours} hour(s) over limit` : "Within time limit";
      break;

    case "weekly":
      usedTimeStr = `${Math.floor(totalHours / 24 / 7)} week(s) and ${totalHours % (24 * 7)} hour(s) used`;
      allowedTimeStr = `${package_duration} week(s) allowed`;
      overdueTimeStr = extraHours > 0 ? `${(extraHours / 24).toFixed(2)} day(s) over limit` : "Within time limit";
      break;

    case "monthly":
      usedTimeStr = `${Math.floor(totalHours / (24 * 30))} month(s) and ${totalHours % (24 * 30)} hour(s) used`;
      allowedTimeStr = `${package_duration} month(s) allowed`;
      overdueTimeStr = extraHours > 0 ? `${(extraHours / 24).toFixed(2)} day(s) over limit` : "Within time limit";
      break;

    case "free":
      usedTimeStr = "This is a free package";
      allowedTimeStr = "Free usage — no time limit";
      overdueTimeStr = "No overdue for free package";
      break;
  }

  // 6️⃣ Return consistent structured data
  return {
    total_hours: totalHours, // total hours used
    elapsed_hours: package_type === "free" ? 0 : extraHours, // extra or overdue hours
    current_cost: package_type === "free" ? 0 : totalCost, // total cost for all hours
    extra_charge: package_type === "free" ? 0 : extraCharge, // only for extra hours
    readable: {
      totalTime: usedTimeStr,
      allowedTime: allowedTimeStr,
      overdueTime: overdueTimeStr,
    },
  };
};

const getHourlyPrice = (type, price) => {
  let cost = 0.0;

  switch (type) {
    case "hourly":
      cost = price; // Hourly price remains the same
      break;
    case "weekly":
      cost = price / (7 * 24); // Convert weekly price to hourly rate
      break;
    case "monthly":
      cost = price / (30 * 24); // Convert monthly price to hourly rate (assuming 30 days in a month)
      break;
    default:
      throw new Error("Invalid type. Allowed values: hourly, weekly, monthly");
  }

  const formattedCost = parseFloat(Math.ceil(cost).toFixed(2));

  return formattedCost;
};

const getEndTime = (start_date, duration, type) => {
  const startDate = new Date(start_date);

  switch (type) {
    case "free":
      return new Date(startDate.getTime() + duration * 60 * 60 * 1000); // duration in hours
    case "hourly":
      return new Date(startDate.getTime() + duration * 60 * 60 * 1000); // duration in hours

    case "weekly":
      return new Date(startDate.getTime() + duration * 7 * 24 * 60 * 60 * 1000); // duration in weeks

    case "monthly":
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + duration); // adds months
      return endDate;

    default:
      throw new Error("Invalid type. Valid types are: hourly, weekly, monthly.");
  }
};

function calculateRentalCharge(rental, returnTime = new Date()) {
  // 1️⃣ Total hours used
  let totalHours = (returnTime - rental.start_time) / (1000 * 60 * 60); // ms → hours
  totalHours = Math.ceil(totalHours); // round up

  // 2️⃣ Convert package duration to hours
  let packageHours;
  let packageType = rental.rented_package.type;

  const isFree = packageType === "free";
  console.log(packageType);
  switch (packageType) {
    case "hourly":
      packageHours = rental.rental_hours;
      break;
    case "weekly":
      packageHours = rental.rented_package.duration * 7 * 24;
      break;
    case "monthly":
      packageHours = rental.rented_package.duration * 30 * 24; // approximate
      break;
    case "free":
      packageHours = 0;
      break;
    default:
      throw new Error("Unknown package type: " + packageType);
  }

  // 3️⃣ Calculate extra hours
  let extraHours = totalHours - packageHours;
  extraHours = extraHours > 0 ? extraHours : 0;

  // 4️⃣ Calculate extra charge
  const extraCharge = extraHours * rental.rented_package.hourly_price;

  // 5️⃣ User-friendly breakdown
  let usedTimeStr;
  switch (packageType) {
    case "hourly":
      usedTimeStr = `${totalHours} hour(s) used`;
      break;
    case "weekly":
      usedTimeStr = `${Math.floor(totalHours / 24 / 7)} week(s) and ${totalHours % (24 * 7)} hour(s) used`;
      break;
    case "monthly":
      usedTimeStr = `${Math.floor(totalHours / (24 * 30))} month(s) and ${totalHours % (24 * 30)} hour(s) used`;
      break;
    case "free":
      usedTimeStr = "This is a free package";
      break;
  }

  let allowedTimeStr;
  switch (packageType) {
    case "hourly":
      allowedTimeStr = `${packageHours} hour(s) allowed`;
      break;
    case "weekly":
      allowedTimeStr = `${rental.rented_package.duration} week(s) allowed`;
      break;
    case "monthly":
      allowedTimeStr = `${rental.rented_package.duration} month(s) allowed`;
      break;
    case "free":
      allowedTimeStr = "This is a free package";
      break;
  }

  return {
    totalHours,
    extraHours: isFree ? 0 : extraHours,
    extraCharge: isFree ? 0 : extraCharge,
    usedTime: usedTimeStr,
    allowedTime: allowedTimeStr,
  };
}

module.exports = { calculatePriceOnRentals, getHourlyPrice, getEndTime, calculateRentalCharge };
