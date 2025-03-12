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

const getCostOnWeeks = (duration, started_on, price) => {
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

const calculatePriceOnRentals = (duration, started_on, price) => {
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
  const total_price = (elapsed_hours * price).toFixed(2);
  const extra_hours = elapsed_hours > duration ? elapsed_hours - duration : 0;
  const extra_cost = (extra_hours * price).toFixed(2);

  return { elapsed_hours, current_price: total_price, extra_hours, additional_cost: extra_cost, total_time_used, gst: 1 };
};

module.exports = { getCostOnHours, getCostOnWeeks, calculatePriceOnRentals };
