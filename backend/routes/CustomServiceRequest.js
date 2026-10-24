const express = require("express");
const router = express.Router();
const CustomServiceRequest = require("../schemas/customServiceRequestSchema");

// POST / - Create a new custom service request
router.post("/", async (req, res) => {
    try {
        const { category, name, email, phone, message } = req.body;

        if (
            !["Student", "Tutor"].includes(category) ||
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof message !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide valid request details.",
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();
        const cleanPhone = typeof phone === "string" ? phone.trim().slice(0, 30) : "";
        const cleanMessage = message.trim();

        if (
            cleanName.length < 2 ||
            cleanName.length > 100 ||
            cleanMessage.length < 5 ||
            cleanMessage.length > 3000 ||
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please check your name, email, and message.",
            });
        }

        const request = await CustomServiceRequest.create({
            category,
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            message: cleanMessage,
        });

        return res.status(201).json({
            success: true,
            message: "Custom service request submitted successfully.",
            requestId: request._id,
        });
    } catch (error) {
        console.error("Custom service request error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to submit your request right now.",
        });
    }
});

// GET / - List all custom service requests
router.get("/", async (_req, res) => {
    try {
        const requests = await CustomServiceRequest.find().sort({ createdAt: -1 });
        return res.json({
            success: true,
            count: requests.length,
            requests,
        });
    } catch (error) {
        console.error("Fetch custom service requests error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to retrieve service requests.",
        });
    }
});

// PATCH /:id/status - Update status of a request
router.patch("/:id/status", async (req, res) => {
    try {
        const { status } = req.body;
        if (!["New", "Contacted", "Resolved"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status. Must be 'New', 'Contacted', or 'Resolved'.",
            });
        }

        const updated = await CustomServiceRequest.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({
                success: false,
                message: "Request not found.",
            });
        }

        return res.json({
            success: true,
            message: "Request status updated successfully.",
            request: updated,
        });
    } catch (error) {
        console.error("Update request status error:", error);
        return res.status(500).json({
            success: false,
            message: "Unable to update request status.",
        });
    }
});

module.exports = router;
