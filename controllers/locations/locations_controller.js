const db = require("../../models");
const Location = db.locations;

exports.addLocation = async (req, res, next) => {
  const { name, latitude, longitude, address } = req.body;
  const transaction = await db.sequelize.transaction();
  try {
    const addedLocation = await Location.create(
      {
        name,
        latitude,
        longitude,
        address,
      },
      { transaction }
    );

    await transaction.commit();

    res.status(200).json({ message: "Location added successfully", data: addedLocation });
  } catch (error) {
    console.error(error);
    await transaction.rollback();
    res.status(500).json({ error: "Internal server error" });
  }
};

exports.getLocations = async (req, res) => {
  try {
    const locations = await Location.findAll({ attributes: ["id", "name", "latitude", "longitude", "address"] });
    return res.status(200).json({ message: "Locations fetched successfully", data: locations });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};


