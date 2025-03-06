const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const db = require("./models");
const path = require("path");
const authRouter = require("./routes/v1/auth_route");
const userRouter = require("./routes/v1/user_routes");
const webRouter = require("./routes/v1/web_routes");
const { errorHandler } = require("./middlewares/error");


dotenv.config();

const port = process.env.PORT || 3000;

const app = express();

app.use(cors());

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join("uploads")));

app.use("/api/v1/auth/", authRouter);
app.use("/api/v1/user/", userRouter);
app.use("/api/v1/web/", webRouter);

app.use(errorHandler);

const startServer = async () => {
  try {
    await db.sequelize.authenticate();
    console.log("Database connected");
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
    });
  } catch (error) {
    console.error("Unable to connect to the database:", error);
  }
};

startServer();
