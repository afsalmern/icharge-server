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

const calculatePriceOnRentals = (duration, started_on, price) => {
  const startTime = new Date(started_on);
  const currentTime = new Date();


  // Calculate total hours elapsed
  const elapsedHours = Math.floor((currentTime - startTime) / (1000 * 60 * 60));

  console.log(started_on)
  console.log(startTime)
  console.log(currentTime)
  console.log(elapsedHours)

  // Calculate total price and extra cost
  const totalPrice = (elapsedHours * price).toFixed(2);
  const extraHours = elapsedHours > duration ? elapsedHours - duration : 0;
  const extraCost = (extraHours * price).toFixed(2);

  return { elapsedHours, totalPrice, extraHours, extraCost };
};

module.exports = { getCostOnHours, getCostOnWeeks, calculatePriceOnRentals };
