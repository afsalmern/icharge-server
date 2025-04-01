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
    });

    // Send success response
    sendSuccess(res, "Complaint created successfully", { complaint }, 201);
  } catch (error) {
    next(error); // Pass the error to the error handler
  }
};

// Get all complaints
exports.getAllComplaints = async (req, res, next) => {
  try {
    const complaint = await Complaint.findAll();
    sendSuccess(res, "Complaints fetched successfully", { complaint }, 200);
  } catch (error) {
    next(error);
  }
};

// Get a complaint by ID
exports.getComplaintById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const complaint = await Complaint.findByPk(id);

    if (!complaint) {
      throw new ApiError(404, "Complaint not found");
    }

    sendSuccess(res, "Complaint fetched successfully", { complaint }, 200);
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

    // Handle the attachment (if a new file is uploaded)
    let attachment = complaint.attachment; // Keep the existing attachment if no new file is uploaded
    if (req.file) {
      // Delete the old attachment file if it exists
      const oldAttachmentPath = path.join(__dirname, "../../uploads/complaints", complaint.attachment);
      if (fs.existsSync(oldAttachmentPath)) {
        fs.unlinkSync(oldAttachmentPath); // Delete the old file
      }
      // Save the new attachment file path
      attachment = req.file.filename;
    }

    // Handle other fields (title, description, issue_type, status)
    const updatedData = {
      title: title || complaint.title, // Keep existing if no new title provided
      description: description || complaint.description, // Keep existing if no new description
      issue_type: issue_type || complaint.issue_type, // Keep existing if no new issue_type provided
      status: status || complaint.status, // Keep existing if no new status provided
      attachment, // Updated attachment if a new one is uploaded, otherwise retain the old one
    };

    // Update the complaint with the new data
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
