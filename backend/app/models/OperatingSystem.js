const mongoose = require("mongoose");

const OperatingSystemSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // OS Name (e.g., Ubuntu, Windows Server 2022)
  version: { type: String, required: true }, // OS Version
  cloud: { type: String, required: true }, // Cloud image name
  family: { type: String, required: true }, // Family name for compatibility
  caption: { type: String, required: true }, // Short description
  os_name: { type: String, required: true }, // Short OS identifier (e.g., ubuntu, win)
  price: { type: Number, default: 0 }, 
  priceDuration: { type: String, default: null } // "monthly" for paid OS, null for free OS
});

// Middleware: Update caption for Windows OS when price is updated
OperatingSystemSchema.pre("save", function (next) {
  if (this.os_name === "win" && this.isModified("price")) {
    this.caption = `For Windows-based applications (+$${this.price}/month)`;
  }
  next();
});

const OperatingSystem = mongoose.model("OperatingSystem", OperatingSystemSchema);
module.exports = OperatingSystem;
