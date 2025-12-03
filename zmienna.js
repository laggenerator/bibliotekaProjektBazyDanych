require("dotenv").config();

module.exports = {
  pokazowka: process.env.POKAZOWKA === "true",
};
