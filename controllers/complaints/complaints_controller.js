"use strict";

const { sendSuccess } = require("../../handlers/success_response_handler");
const { ApiError } = require("../../middlewares/error");
const db = require("../../models");
const fs = require("fs");
const path = require("path");

const Complaint = db.complaints;

// Create a new complaint
exports.createComplaint = async (req, res, next) => {
  try {
    const { title, description, issue_type } = req.body;
    const { user_id } = req;

    // Check if title and description are provided
    if (!title) {
      throw new ApiError(400, "Title is required");
    }

    if (!description) {
      throw new ApiError(400, "Description is required");
    }

    if (!issue_type) {
      throw new ApiError(400, "Issue type is required");
    }

    // Check if attachment is uploaded (Multer will handle this)
    let attachment = null;

    if (req.file) {
      // Get the filename from the uploaded file
      attachment = req.file.filename; // The file is stored under req.files.attachment
    }

    // Generate a unique ticket number
    const ticket_no = `IC-${Date.now()}`;

    // Create a new complaint entry in the database
    const complaint = await Complaint.create({
      title,
      description,
      issue_type,
      attachment, // Save the filename here
      ticket_no,
      user_id,
    });

    // Send success response
    sendSuccess(res, "Complaint created successfully", { complaint }, 201);
  } catch (error) {
    next(error); // Pass the error to the error handler
  }
};

// Get all complaints
// exports.getAllComplaints = async (req, res, next) => {
//   try {
//     const complaint = await Complaint.findAll();
//     sendSuccess(res, "Complaints fetched successfully", { complaint }, 200);
//   } catch (error) {
//     next(error);
//   }
// };

exports.getAllComplaints = async (req, res, next) => {
  try {
    // Fetch all complaints from DB
    const complaints = await Complaint.findAll();

    if (!complaints.length) {
      throw new ApiError(404, "No complaints found");
    }

    // Generate full image URLs for each complaint
    const complaintsWithImages = complaints.map((complaint) => ({
      ...complaint.toJSON(),
      imageUrl: complaint.attachment ? `${req.protocol}://${req.get("host")}/icharge/uploads/complaints/${complaint.attachment}` : null,
    }));

    sendSuccess(res, "Complaints fetched successfully", { complaints: complaintsWithImages }, 200);
  } catch (error) {
    next(error);
  }
};

exports.getComplaintsByUserId = async (req, res, next) => {
  try {
    const { user_id } = req;
    // Fetch all complaints from DB
    const complaints = await Complaint.findAll({
      where: { user_id },
    });

    if (!complaints.length) {
      return sendSuccess(res, "No complaints found,", { complaints: [] }, 200);
    }
    // Generate full image URLs for each complaint
    const complaintsWithImages = complaints.map((complaint) => ({
      ...complaint.toJSON(),
      imageUrl: complaint.attachment ? `${req.protocol}://${req.get("host")}/icharge/uploads/complaints/${complaint.attachment}` : null,
    }));

    sendSuccess(res, "Complaints fetched successfully", { complaints: complaintsWithImages }, 200);
  } catch (error) {
    next(error);
  }
};

// Get a complaint by ID
// exports.getComplaintById = async (req, res, next) => {
//   try {
//     const { id } = req.params;
//     const complaint = await Complaint.findByPk(id);

//     if (!complaint) {
//       throw new ApiError(404, "Complaint not found");
//     }

//     sendSuccess(res, "Complaint fetched successfully", { complaint }, 200);
//   } catch (error) {
//     next(error);
//   }
// };

exports.getComplaintById = async (req, res, next) => {
  try {
    const complaint = await Complaint.findByPk(req.params.id);
    if (!complaint) throw new ApiError(404, "Complaint not found");

    // Generate full image URL dynamically
    const imageUrl = complaint.attachment
      ? `${req.protocol}://${req.get("host")}/uploads/complaints/${complaint.attachment}`
      : null;

    sendSuccess(
      res,
      "Complaint fetched successfully",
      {
        complaint: { ...complaint.toJSON(), imageUrl },
      },
      200
    );
  } catch (error) {
    next(error);
  }
};

// Update a complaint
exports.updateComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { title, description, issue_type, status } = req.body;

    // Find the existing complaint by its ID
    const complaint = await Complaint.findByPk(id);
    if (!complaint) {
      throw new ApiError(404, "Complaint not found");
    }

    let attachment = complaint.attachment; // Keep existing attachment if no new file is uploaded
    console.log("req.file ------->", req.file);

    if (req.file) {
      if (complaint.attachment) {
        // Ensure attachment exists before accessing it
        const oldAttachmentPath = path.join(__dirname, "../../uploads/complaints", complaint.attachment);
        try {
          await fs.unlink(oldAttachmentPath); // Delete the old file safely
        } catch (err) {
          console.error("Failed to delete old attachment:", err.message);
        }
      }
      attachment = req.file.filename;
    }

    // Handle other fields
    const updatedData = {
      title: title ?? complaint.title,
      description: description ?? complaint.description,
      issue_type: issue_type ?? complaint.issue_type,
      status: status ?? complaint.status,
      attachment,
    };

    // Update the complaint
    await complaint.update(updatedData);

    sendSuccess(res, "Complaint updated successfully", { complaint }, 200);
  } catch (error) {
    next(error);
  }
};

// Delete a complaint
exports.deleteComplaint = async (req, res, next) => {
  try {
    const { id } = req.params;
    const complaint = await Complaint.findByPk(id);

    if (!complaint) {
      throw new ApiError(404, "Complaint not found");
    }

    // Delete the attachment file if it exists
    const attachmentPath = path.join(__dirname, "../../uploads/complaints", complaint.attachment);

    if (fs.existsSync(attachmentPath)) {
      fs.unlinkSync(attachmentPath); // Delete the file
    }

    // Delete the complaint record from the database
    await complaint.destroy();
    sendSuccess(res, "Complaint deleted successfully", {}, 200);
  } catch (error) {
    next(error);
  }
};
