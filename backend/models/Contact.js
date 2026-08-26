const mongoose = require("mongoose");

/**
 * Bidirectional contact/friend link between two users.
 * We always store a unique pair so duplicate contacts are prevented.
 */
const contactSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    contactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Prevent the same pair from being added twice (either direction is handled in route)
contactSchema.index({ userId: 1, contactId: 1 }, { unique: true });

module.exports = mongoose.model("Contact", contactSchema);
