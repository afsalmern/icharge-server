const calculatePriceOnRentals = (started_on, price) => {
  console.log(started_on);
  const startTime = new Date(started_on);
  const currentTime = new Date();

  console.log(startTime);
  console.log(currentTime);

  // Calculate total elapsed time in milliseconds
  const elapsedMs = currentTime - startTime;

  console.log(elapsedMs);

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

const calculateTotalPrice = (passedDate, duration, pricePerHour) => {
  // Convert the passed date to a Date object
  const givenDate = new Date(passedDate);

  // Get the current date and time
  const currentDate = new Date();

  // Calculate the difference in milliseconds
  const diffInMs = currentDate - givenDate;

  // Convert milliseconds to hours
  const totalHours = diffInMs / (1000 * 60 * 60);

  // Check if extra hours are used
  const isExtraHour = totalHours > duration;

  // Calculate price
  const totalPrice = isExtraHour
    ? duration * pricePerHour + (totalHours - duration) * pricePerHour * 1.5 // 1.5x rate for extra hours
    : totalHours * pricePerHour;

  return {
    totalHours: totalHours.toFixed(2),
    totalPrice: totalPrice.toFixed(2),
    isExtraHour,
  };
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

module.exports = { calculatePriceOnRentals, getHourlyPrice, calculateTotalPrice, getEndTime };
