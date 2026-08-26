import mongoose from "mongoose";

const contactSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    contactId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

contactSchema.index({ userId: 1, contactId: 1 }, { unique: true });

export default mongoose.models.Contact || mongoose.model("Contact", contactSchema);
