const mongoose = require("mongoose");

const customServiceRequestSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ["Student", "Tutor"],
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
      maxlength: 30,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    status: {
      type: String,
      enum: ["New", "Contacted", "Resolved"],
      default: "New",
    },
  },
  { timestamps: true }
);

const CustomServiceRequest =
  mongoose.models.CustomServiceRequest ||
  mongoose.model("CustomServiceRequest", customServiceRequestSchema);

module.exports = CustomServiceRequest;
