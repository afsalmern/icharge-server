const getCostOnHours = (duration, started_on, price) => {
  const startTime = new Date(started_on);
  const currentTime = new Date();

  // Calculate elapsed time in hours
  const elapsed_hours = Math.ceil((currentTime - startTime) / (1000 * 60 * 60)); // Convert ms to hours

  // Determine extra hours used
  const extra_hours = Math.max(0, elapsed_hours - duration);

  // Calculate extra cost (assuming per-hour cost is price/duration)
  const hourlyRate = price / duration;
  const extra_cost = extra_hours * hourlyRate;

  // Calculate total cost
  const totalCost = price + extra_cost;

  return { elapsed_hours, extra_hours, extra_cost, totalCost };
};

const getCostOnWeeks = (started_on, price) => {
  const startTime = new Date(started_on);
  const currentTime = new Date();

  // Calculate the difference in time (milliseconds)
  const diffInMilliseconds = currentTime - startTime;

  // Convert milliseconds to weeks (1 week = 7 days = 7 * 24 * 60 * 60 * 1000 ms)
  const elapsedWeeks = diffInMilliseconds / (7 * 24 * 60 * 60 * 1000);

  // Calculate the number of full weeks used
  const fullWeeksUsed = Math.ceil(elapsedWeeks); // Always round up

  // If the duration is exceeded, charge extra
  const totalCost = fullWeeksUsed * price;

  return {
    fullWeeksUsed,
    totalCost,
  };
};

const calculatePriceOnRentals = (started_on, price) => {

  console.log(started_on)
  const startTime = new Date(started_on);
  const currentTime = new Date();

  console.log(startTime)
  console.log(currentTime)
  
  // Calculate total elapsed time in milliseconds
  const elapsedMs = currentTime - startTime;

  console.log(elapsedMs)


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

module.exports = { getCostOnHours, getCostOnWeeks, calculatePriceOnRentals, getHourlyPrice };
