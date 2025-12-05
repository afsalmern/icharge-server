const calculatePriceOnRentals = (start_time, hourly_price, package_duration, package_type) => {
  const now = new Date();
  const start = new Date(start_time);

  // 1) Exact used hours as a decimal (no rounding)
  const usedMs = now - start;
  const usedHoursFloat = usedMs / (1000 * 60 * 60);

  // 2) Convert package duration to allowed hours
  let packageHours = 0;
  switch (package_type) {
    case "hourly":
    case "free":
      packageHours = Number(package_duration) || 0;
      break;
    case "daily":
      packageHours = (Number(package_duration) || 0) * 24;
      break;
    case "weekly":
      packageHours = (Number(package_duration) || 0) * 7 * 24;
      break;
    case "monthly":
      packageHours = (Number(package_duration) || 0) * 30 * 24;
      break;
    default:
      throw new Error("Invalid package type: " + package_type);
  }

  const roundBy30Minutes = (hours) => {
    const whole = Math.floor(hours);
    const decimal = hours - whole;

    return decimal >= 0.5 ? whole + 1 : whole;
  };

  // 3) Extra hour calculation (round only overtime)
  const extraFloat = usedHoursFloat - packageHours;
  // const extraHours = extraFloat > 0 ? Math.ceil(extraFloat) : 0;
  const extraHours = extraFloat > 0 ? roundBy30Minutes(extraFloat) : 0;

  // 4) Charges
  let extraCharge = 0;
  let totalCost = 0;

  if (package_type === "free") {
    extraCharge = extraHours * hourly_price;
    totalCost = extraCharge;
  } else {
    extraCharge = extraHours * hourly_price;
    totalCost = extraCharge;
  }

  // Helpers
  const pluralize = (val, unit) => `${val} ${unit}${val === 1 ? "" : "s"}`;

  const formatDuration = (hours) => {
    const days = Math.floor(hours / 24);
    const hrs = Math.floor(hours % 24);
    if (days > 0 && hrs > 0) return `${pluralize(days, "day")} and ${pluralize(hrs, "hour")}`;
    if (days > 0) return pluralize(days, "day");
    return pluralize(hrs, "hour");
  };

  // Readable texts
  let totalTimeText, allowedTimeText, overdueText;

  if (package_type === "free") {
    totalTimeText = `Used for ${formatDuration(usedHoursFloat)}`;
    allowedTimeText = `First ${package_duration} hours free`;
    overdueText = extraHours > 0 ? `Exceeded by ${pluralize(extraHours, "hour")} (₹${hourly_price}/hour)` : "Within free period";
  } else {
    totalTimeText = `Used for ${formatDuration(usedHoursFloat)}`;
    switch (package_type) {
      case "hourly":
        allowedTimeText = `Allowed up to ${package_duration} hour${package_duration > 1 ? "s" : ""}`;
        break;
      case "daily":
        allowedTimeText = `Allowed up to ${package_duration} day${package_duration > 1 ? "s" : ""}`;
        break;
      case "weekly":
        allowedTimeText = `Allowed up to ${package_duration} week${package_duration > 1 ? "s" : ""}`;
        break;
      case "monthly":
        allowedTimeText = `Allowed up to ${package_duration} month${package_duration > 1 ? "s" : ""}`;
        break;
    }
    overdueText = extraHours > 0 ? `Exceeded by ${formatDuration(extraHours)}` : "Within allowed time";
  }

  const readable = {
    totalTime: totalTimeText,
    allowedTime: allowedTimeText,
    overdueTime: overdueText,
  };

  // 6) Return structured result
  return {
    total_hours_billed: Math.ceil(usedHoursFloat),
    allowed_hours: packageHours,
    extra_hours: extraHours,
    extra_charge: extraCharge,
    total_cost: totalCost,
    readable,
  };
};

const getHourlyPrice = (type, price, duration = 1) => {
  let hourly = 0;

  switch (type) {
    case "free":
      hourly = price;
      break;

    case "hourly":
      // price = total price for given X hours
      hourly = price / duration;
      break;

    case "weekly":
      // price = total price for given X weeks
      hourly = price / (duration * 7 * 24);
      break;

    case "monthly":
      // price = total price for given X months
      hourly = price / (duration * 30 * 24);
      break;

    default:
      throw new Error("Invalid type. Allowed values: free, hourly, weekly, monthly");
  }

  // round UP to 2 decimals
  return Number(((hourly * 100) / 100).toFixed(2));
};

const getEndTime = (start_date, duration, type) => {
  const startDate = new Date(start_date);

  console.log(startDate);
  console.log(duration);
  console.log(type);

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

function calculateTotalTimeUsed(startDate, endDate, status = "completed") {
  const start = new Date(startDate);
  const end = status == "ongoing" ? new Date() : new Date(endDate);

  let diffMs = end - start; // difference in milliseconds
  if (diffMs < 0) return "Invalid dates";

  const msInMinute = 1000 * 60;
  const msInHour = msInMinute * 60;
  const msInDay = msInHour * 24;

  const days = Math.floor(diffMs / msInDay);
  diffMs -= days * msInDay;

  const hours = Math.floor(diffMs / msInHour);
  diffMs -= hours * msInHour;

  const minutes = Math.floor(diffMs / msInMinute);

  let data = "";

  if (days > 0) {
    data = `${days} day${days > 1 ? "s" : ""}${hours ? " " + hours + " hour" + (hours > 1 ? "s" : "") : ""} used`;
  } else if (hours > 0) {
    data = `${hours} hour${hours > 1 ? "s" : ""}${minutes ? " " + minutes + " min" : ""} used`;
  } else {
    data = `${minutes} min used`;
  }

  return data;
}

function isTimeBetween(start, end) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  console.log(start);
  console.log(end);
  console.log(now);
  console.log(currentMinutes);

  const [sH, sM] = start.split(":").map(Number);
  const [eH, eM] = end.split(":").map(Number);

  console.log(sH);
  console.log(sM);
  console.log(eH);
  console.log(eM);

  const startMinutes = sH * 60 + sM;
  const endMinutes = eH * 60 + eM;

  console.log(startMinutes);
  console.log(endMinutes);
  console.log(currentMinutes);

  // Handle normal range (e.g., 13:00 → 14:04)
  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  // Handle overnight ranges (e.g., 22:00 → 04:00)
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

module.exports = { calculatePriceOnRentals, getHourlyPrice, getEndTime, calculateRentalCharge, calculateTotalTimeUsed, isTimeBetween };
