const mongoose = require("mongoose");

const connectDatabase = () => {
  const uri =
    "mongodb+srv://samuelndewa2018:Sam37188917.@cluster0.xdwwv45.mongodb.net/"; // Replace with your actual URI
  const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };

  mongoose
    .connect(uri, options)
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((error) => {
      console.error("Error connecting to MongoDB:", error.message);
    });
};

module.exports = connectDatabase;
