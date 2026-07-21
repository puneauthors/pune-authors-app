const { z } = require('zod');

const eventSchema = z.object({
  name: z.string().min(3, "Event name must be at least 3 characters long"),
  description: z.string().optional(),
  dateType: z.enum(["exact", "tentative"]).optional().default("exact"),
  date: z.string().min(1, "Date is required"),
  tentativeDate: z.string().optional(),
  location: z.string().min(2, "Location is required"),
  duration: z.string().min(1, "Duration is required"),
  eventType: z.string().min(2, "Event type is required"),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  registrationFee: z.coerce.number().min(0, "Registration fee cannot be negative"),
  feeType: z.string().min(2, "Fee type is required")
}).superRefine((data, ctx) => {
  if (data.dateType === 'exact' && isNaN(Date.parse(data.date))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Invalid date format for exact date",
      path: ["date"]
    });
  }
});

module.exports = { eventSchema };
