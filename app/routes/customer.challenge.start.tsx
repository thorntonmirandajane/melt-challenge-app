import { type LoaderFunctionArgs, type ActionFunctionArgs, redirect } from "react-router";
import { useState } from "react";
import { Form, useLoaderData, useNavigation, useSubmit } from "react-router";
import { requireCustomer } from "../utils/customer-auth.server";
import { canStartChallenge, getOrCreateParticipant } from "../utils/challenge.server";
import { validateChallengeForm } from "../utils/validation";
import { lookupCustomerByEmail } from "../utils/shopify-customer.server";
import { authenticate } from "../shopify.server";
import prisma from "../db.server";

// ============================================
// LOADER - Check eligibility and load data
// ============================================

export const loader = async ({ request }: LoaderFunctionArgs) => {
  // Try to get customer if logged in, but don't require it
  let customer = null;
  try {
    customer = await requireCustomer(request);
  } catch (error) {
    // Customer not logged in - they can still fill out the form with email
  }

  return {
    customer,
    canStart: true,
  };
};

// ============================================
// ACTION - Handle form submission
// ============================================

export const action = async ({ request }: ActionFunctionArgs) => {
  // Parse form data
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const firstNameInput = formData.get("firstName") as string;
  const lastNameInput = formData.get("lastName") as string;
  const weight = formData.get("weight");
  const photosJson = formData.get("photos"); // JSON string of photo data

  // Validate email
  if (!email) {
    return new Response(JSON.stringify({
      success: false,
      errors: { email: "Email is required" },
     }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Validate first and last name
  if (!firstNameInput || !lastNameInput) {
    return new Response(JSON.stringify({
      success: false,
      errors: { firstName: !firstNameInput ? "First name is required" : "", lastName: !lastNameInput ? "Last name is required" : "" },
     }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Validate weight
  const validation = validateChallengeForm({
    weight: weight as string,
  });

  if (!validation.valid) {
    return new Response(JSON.stringify({
      success: false,
      errors: validation.errors,
     }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  // Parse photos data with orientation
  let photos: Array<{ order: number; key: string; publicUrl: string; fileName: string; fileSize: number; mimeType: string; orientation: string }>;
  try {
    photos = JSON.parse(photosJson as string);
    if (!Array.isArray(photos) || photos.length !== 3) {
      throw new Error("Invalid photos data");
    }
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      errors: { photos: "Invalid photo data. Please upload 3 photos." },
    }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  try {
    // Try to get customer info if logged in
    let customer = null;
    let customerId = null;
    let firstName = null;
    let lastName = null;
    let shop = null;
    let admin = null;

    try {
      customer = await requireCustomer(request);
      customerId = customer.customerId;
      firstName = customer.firstName;
      lastName = customer.lastName;
      shop = customer.shop;
    } catch (error) {
      // Not logged in - we'll handle this by email only
      // For now, use a default shop (in production, you'd get this from the request domain)
      shop = process.env.SHOPIFY_SHOP_DOMAIN || "default-shop.myshopify.com";
    }

    // Lookup Shopify customer by email to get order data
    let shopifyCustomer = null;
    let ordersCount = null;
    let totalSpent = null;

    try {
      const { admin: authAdmin } = await authenticate.admin(request);
      admin = authAdmin;
      shopifyCustomer = await lookupCustomerByEmail(admin, email);

      if (shopifyCustomer) {
        customerId = shopifyCustomer.id;
        firstName = firstName || shopifyCustomer.firstName || firstNameInput;
        lastName = lastName || shopifyCustomer.lastName || lastNameInput;
        ordersCount = shopifyCustomer.ordersCount;
        totalSpent = parseFloat(shopifyCustomer.totalSpent);
      } else {
        // Use form input if no Shopify customer found
        firstName = firstName || firstNameInput;
        lastName = lastName || lastNameInput;
      }
    } catch (error) {
      console.log("Could not lookup Shopify customer:", error);
      // Use form input as fallback
      firstName = firstName || firstNameInput;
      lastName = lastName || lastNameInput;
    }

    // Get or create participant by email
    const participant = await getOrCreateParticipant(
      shop,
      customerId || `email:${email}`, // Use email as fallback ID
      email,
      firstName,
      lastName
    );

    if (!participant) {
      return new Response(JSON.stringify({
        success: false,
        errors: { general: "No active challenge found" },
      }), { status: 400, headers: { "Content-Type": "application/json" } });
    }

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        participantId: participant.id,
        shop: shop,
        type: "START",
        weight: parseFloat(weight as string),
      },
    });

    // Create photo records with orientation (Cloudinary)
    await Promise.all(
      photos.map((photo) =>
        prisma.photo.create({
          data: {
            submissionId: submission.id,
            shop: shop,
            shopifyUrl: photo.publicUrl, // Cloudinary URL
            fileName: photo.fileName,
            fileSize: photo.fileSize,
            mimeType: photo.mimeType,
            order: photo.order,
            orientation: photo.orientation as "FRONT" | "SIDE" | "BACK",
            uploadStatus: "UPLOADED",
          },
        })
      )
    );

    // Update participant status and order data
    await prisma.participant.update({
      where: { id: participant.id },
      data: {
        status: "IN_PROGRESS",
        startWeight: parseFloat(weight as string),
        startedAt: new Date(),
        ordersCount: ordersCount,
        totalSpent: totalSpent,
      },
    });

    return redirect("/customer/challenge/success?type=start");
  } catch (error) {
    console.error("Error creating start submission:", error);
    return new Response(JSON.stringify({
      success: false,
      errors: { general: "Failed to submit form. Please try again." },
    }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
};

// ============================================
// COMPONENT - Start Challenge Form
// ============================================

export default function ChallengeStart() {
  const { customer } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const submit = useSubmit();
  const isSubmitting = navigation.state === "submitting";

  const [email, setEmail] = useState(customer?.email || "");
  const [firstName, setFirstName] = useState(customer?.firstName || "");
  const [lastName, setLastName] = useState(customer?.lastName || "");
  const [weight, setWeight] = useState("");
  const [frontPhoto, setFrontPhoto] = useState<File | null>(null);
  const [sidePhoto, setSidePhoto] = useState<File | null>(null);
  const [backPhoto, setBackPhoto] = useState<File | null>(null);
  const [uploadedPhotos, setUploadedPhotos] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Handle individual photo selection
  const handlePhotoChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    orientation: 'front' | 'side' | 'back'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setErrors({ ...errors, [orientation]: "Please upload a valid image (JPEG, PNG, or WebP)" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ ...errors, [orientation]: "Image must be smaller than 5MB" });
      return;
    }

    // Set the photo based on orientation
    if (orientation === 'front') setFrontPhoto(file);
    else if (orientation === 'side') setSidePhoto(file);
    else if (orientation === 'back') setBackPhoto(file);

    // Clear error for this orientation
    setErrors({ ...errors, [orientation]: "" });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate email
    if (!email) {
      setErrors({ email: "Email is required" });
      return;
    }

    // Validate all 3 photos are selected
    if (!frontPhoto || !sidePhoto || !backPhoto) {
      setErrors({ photos: "Please upload all 3 photos (front, side, and back)" });
      return;
    }

    // Upload photos first
    setUploading(true);
    try {
      const { uploadPhotos } = await import("../utils/upload.client");

      const photoUploads = [
        { file: frontPhoto, order: 1, orientation: 'FRONT' },
        { file: sidePhoto, order: 2, orientation: 'SIDE' },
        { file: backPhoto, order: 3, orientation: 'BACK' },
      ];

      const submissionId = crypto.randomUUID(); // Temporary ID for upload
      const results = await uploadPhotos(photoUploads, submissionId);

      setUploadedPhotos(results);
      setUploading(false); // Photos uploaded, now submitting form

      // Submit form with photo data using React Router's submit
      const form = e.target as HTMLFormElement;
      const formData = new FormData(form);
      formData.set("photos", JSON.stringify(results));

      submit(formData, { method: "post" });
    } catch (error) {
      console.error("Upload error:", error);
      console.error("Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      setErrors({ photos: `Failed to upload photos: ${error instanceof Error ? error.message : "Unknown error"}` });
      setUploading(false);
    }
  };

  return (
    <div className="challenge-container">
      <div className="challenge-header">
        <h1>Start Your Weight Loss Challenge</h1>
        <p>Welcome{customer ? `, ${customer.firstName || customer.email}` : ''}!</p>
        <p>Fill out this form to begin your transformation journey.</p>
      </div>

      <Form method="post" onSubmit={handleSubmit} className="challenge-form">
        {/* Email Input */}
        <div className="form-group">
          <label htmlFor="email">Email Address *</label>
          <input
            type="email"
            id="email"
            name="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            disabled={isSubmitting || uploading || !!customer}
          />
          {customer && (
            <p className="help-text">Logged in as {customer.email}</p>
          )}
          {errors.email && <span className="error">{errors.email}</span>}
        </div>

        {/* First Name Input */}
        <div className="form-group">
          <label htmlFor="firstName">First Name *</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="John"
            required
            disabled={isSubmitting || uploading}
          />
          {errors.firstName && <span className="error">{errors.firstName}</span>}
        </div>

        {/* Last Name Input */}
        <div className="form-group">
          <label htmlFor="lastName">Last Name *</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
            required
            disabled={isSubmitting || uploading}
          />
          {errors.lastName && <span className="error">{errors.lastName}</span>}
        </div>

        {/* Weight Input */}
        <div className="form-group">
          <label htmlFor="weight">Current Weight (lbs) *</label>
          <input
            type="number"
            id="weight"
            name="weight"
            step="0.1"
            min="50"
            max="1000"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            required
            disabled={isSubmitting || uploading}
          />
          {errors.weight && <span className="error">{errors.weight}</span>}
        </div>

        {/* Photo Upload - Front */}
        <div className="form-group">
          <label htmlFor="frontPhoto">Front Photo *</label>
          <p className="help-text">Upload a photo facing the camera directly</p>
          <input
            type="file"
            id="frontPhoto"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => handlePhotoChange(e, 'front')}
            required
            disabled={isSubmitting || uploading}
            className="photo-input"
          />
          {frontPhoto && (
            <p className="file-count">✓ {frontPhoto.name}</p>
          )}
          {errors.front && <span className="error">{errors.front}</span>}
        </div>

        {/* Photo Upload - Side */}
        <div className="form-group">
          <label htmlFor="sidePhoto">Side Photo *</label>
          <p className="help-text">Upload a photo from the side view</p>
          <input
            type="file"
            id="sidePhoto"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => handlePhotoChange(e, 'side')}
            required
            disabled={isSubmitting || uploading}
            className="photo-input"
          />
          {sidePhoto && (
            <p className="file-count">✓ {sidePhoto.name}</p>
          )}
          {errors.side && <span className="error">{errors.side}</span>}
        </div>

        {/* Photo Upload - Back */}
        <div className="form-group">
          <label htmlFor="backPhoto">Back Photo *</label>
          <p className="help-text">Upload a photo from the back view</p>
          <input
            type="file"
            id="backPhoto"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={(e) => handlePhotoChange(e, 'back')}
            required
            disabled={isSubmitting || uploading}
            className="photo-input"
          />
          {backPhoto && (
            <p className="file-count">✓ {backPhoto.name}</p>
          )}
          {errors.back && <span className="error">{errors.back}</span>}
        </div>

        {/* General photo error */}
        {errors.photos && (
          <div className="form-group">
            <span className="error">{errors.photos}</span>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          className="submit-btn"
          disabled={isSubmitting || uploading}
        >
          {uploading ? "Uploading photos..." : isSubmitting ? "Submitting..." : "Start Challenge"}
        </button>

        {errors.general && (
          <div className="error-message">{errors.general}</div>
        )}
      </Form>

      <style>{`
        .challenge-container {
          max-width: 600px;
          margin: 40px auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .challenge-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .challenge-header h1 {
          font-size: 28px;
          margin-bottom: 10px;
          color: #333;
        }

        .challenge-form {
          background: #f9f9f9;
          padding: 30px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .form-group {
          margin-bottom: 20px;
        }

        label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #333;
        }

        input[type="email"],
        input[type="text"],
        input[type="number"],
        textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 16px;
        }

        input[type="file"] {
          width: 100%;
          padding: 10px;
          border: 2px dashed #ddd;
          border-radius: 4px;
          cursor: pointer;
        }

        .help-text {
          font-size: 14px;
          color: #666;
          margin: 5px 0;
        }

        .file-count {
          font-size: 14px;
          color: #28a745;
          margin-top: 5px;
        }

        .char-count {
          font-size: 12px;
          color: #666;
          float: right;
        }

        .submit-btn {
          width: 100%;
          padding: 14px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 4px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.3s;
        }

        .submit-btn:hover:not(:disabled) {
          background: #0056b3;
        }

        .submit-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .error {
          display: block;
          color: #dc3545;
          font-size: 14px;
          margin-top: 5px;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 12px;
          border-radius: 4px;
          margin-top: 20px;
        }
      `}</style>
    </div>
  );
}
