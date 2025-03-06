const getCostOnHours = (duration, started_on, price) => {
  const startTime = new Date(started_on);
  const currentTime = new Date();

  // Calculate elapsed time in hours
  const elapsedHours = Math.ceil((currentTime - startTime) / (1000 * 60 * 60)); // Convert ms to hours

  // Determine extra hours used
  const extraHours = Math.max(0, elapsedHours - duration);

  // Calculate extra cost (assuming per-hour cost is price/duration)
  const hourlyRate = price / duration;
  const extraCost = extraHours * hourlyRate;

  // Calculate total cost
  const totalCost = price + extraCost;

  return { elapsedHours, extraHours, extraCost, totalCost };
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

module.exports = { getCostOnHours, getCostOnWeeks };
