const QRCode = require("qrcode");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");

const generateCode = async (deviceId, logoColors = null) => {
  try {
    // Ensure uploads/qr directory exists
    const uploadsDir = path.join(process.cwd(), "uploads", "qr");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Default color theme (can be overridden by logo colors)
    const colorTheme = logoColors || {
      primary: "#6abe55", // Blue
      secondary: "#1e40af", // Darker blue
      accent: "#3b82f6", // Light blue
      text: "#1f2937", // Dark gray
      lightText: "#6b7280", // Medium gray
      border: "#e5e7eb", // Light gray
    };

    // Generate QR code with theme colors
    const qrCodeBuffer = await QRCode.toBuffer(deviceId.toString(), {
      errorCorrectionLevel: "M",
      type: "png",
      quality: 0.92,
      margin: 2,
      color: {
        dark: colorTheme.primary, // Use primary color for QR code
        light: "#FFFFFF",
      },
      width: 300,
    });

    // Create PDF document (A4 size)
    const doc = new PDFDocument({
      size: "A4",
      margins: {
        top: 50,
        bottom: 50,
        left: 50,
        right: 50,
      },
    });

    // Generate unique filename
    const timestamp = Date.now();
    const filename = `qr_${deviceId}_${timestamp}.pdf`;
    const filePath = path.join(uploadsDir, filename);

    // Pipe PDF to file
    doc.pipe(fs.createWriteStream(filePath));

    const pageWidth = doc.page.width;

    // Add company logo at top center (PNG format)
    const logoPath = path.join(process.cwd(), "assets", "logo.png");
    const logoWidth = 250; // Increased size for better visibility
    const logoHeight = 80;
    const logoX = (pageWidth - logoWidth) / 2;

    // Check if logo exists
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, logoX, 60, {
        width: logoWidth,
        height: logoHeight,
      });
    } else {
      // Create a styled placeholder for logo
      doc
        .rect(logoX, 60, logoWidth, logoHeight)
        .fillAndStroke(colorTheme.accent, colorTheme.border)
        .fontSize(14)
        .fillColor(colorTheme.text)
        .text("LOGO", logoX + 55, 90, {
          width: logoWidth - 40,
          align: "center",
        });
    }

    // Add decorative line under title
    const lineY = 190;
    doc
      .moveTo(pageWidth * 0.3, lineY)
      .lineTo(pageWidth * 0.7, lineY)
      .strokeColor(colorTheme.text)
      .lineWidth(2)
      .stroke();

    // Add QR code in center of page
    const qrSize = 280; // Slightly larger for better scanning
    const qrX = (pageWidth - qrSize) / 2;
    const qrY = 220;

    // Add subtle background for QR code
    doc
      .rect(qrX - 15, qrY - 15, qrSize + 30, qrSize + 30)
      .fillColor("#f9fafb")
      .fill()
      .rect(qrX - 15, qrY - 15, qrSize + 30, qrSize + 30)
      .strokeColor(colorTheme.border)
      .stroke();

    doc.image(qrCodeBuffer, qrX, qrY, {
      width: qrSize,
      height: qrSize,
    });

    // Add instructions with accent color
    doc
      .fontSize(12)
      .fillColor(colorTheme.lightText)
      .text("Scan this QR code to access device information", 0, qrY + qrSize + 75, {
        width: pageWidth,
        align: "center",
      });

    // Add footer with generation date
    const currentDate = new Date().toLocaleDateString();
    doc
      .fontSize(10)
      .fillColor(colorTheme.lightText)
      .text(`Generated on: ${currentDate}`, 50, doc.page.height - 80, {
        width: pageWidth - 100,
        align: "center",
      });

    // Add themed border around the entire content
    doc
      .rect(25, 25, pageWidth - 50, doc.page.height - 50)
      .strokeColor(colorTheme.primary)
      .lineWidth(3)
      .stroke()
      .rect(30, 30, pageWidth - 60, doc.page.height - 60)
      .strokeColor(colorTheme.border)
      .lineWidth(1)
      .stroke();

    // Finalize PDF
    doc.end();

    return {
      filePath: `uploads/qr/${filename}`,
      filename,
    };
  } catch (error) {
    console.error("QR Code generation failed:", error);
    throw new Error("Failed to generate QR Code PDF");
  }
};

module.exports = generateCode;
