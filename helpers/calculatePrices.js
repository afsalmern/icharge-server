const calculatePriceOnRentals = (started_on, price) => {
  console.log(started_on);
  const startTime = new Date(started_on);
  const currentTime = new Date();

  // Calculate total elapsed time in milliseconds
  const elapsedMs = currentTime - startTime;

  // Convert elapsed time to minutes, hours, or days
  const elapsedMinutes = Math.floor(elapsedMs / (1000 * 60));
  const elapsed_hours = Math.floor(elapsedMinutes / 60);
  const elapsedDays = Math.floor(elapsed_hours / 24);

  // Determine best unit for total time used
  let total_time_used;
  if (elapsedDays > 0) {
    total_time_used = `${elapsedDays} day(s)`;
  } else if (elapsed_hours > 0) {
    total_time_used = `${elapsed_hours} hour(s)`;
  } else {
    total_time_used = `${elapsedMinutes} minute(s)`;
  }

  // Calculate total price and extra cost
  const total_price = elapsed_hours == 0 ? price : (elapsed_hours * price).toFixed(2);

  return { elapsed_hours, current_price: total_price, total_time_used, gst: 1 };
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
      packageHours = rental.rented_package.duration;
      break;
    case "weekly":
      packageHours = rental.rented_package.duration * 7 * 24;
      break;
    case "monthly":
      packageHours = rental.rented_package.duration * 30 * 24; // approximate
      break;
    case "free":
      packageHours = 0;
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
