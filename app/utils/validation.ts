/**
 * Validation utilities for forms and data
 *
 * Can be used on both client and server
 */

// ============================================
// EMAIL VALIDATION
// ============================================

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || email.trim().length === 0) {
    return { valid: false, error: "Email is required" };
  }

  if (!isValidEmail(email)) {
    return { valid: false, error: "Please enter a valid email address" };
  }

  return { valid: true };
}

// ============================================
// WEIGHT VALIDATION
// ============================================

export function validateWeight(
  weight: number | string,
  unit: "lbs" | "kg" = "lbs"
): { valid: boolean; error?: string } {
  const weightNum = typeof weight === "string" ? parseFloat(weight) : weight;

  if (isNaN(weightNum)) {
    return { valid: false, error: "Weight must be a number" };
  }

  if (weightNum <= 0) {
    return { valid: false, error: "Weight must be greater than 0" };
  }

  // Reasonable weight ranges
  const min = unit === "lbs" ? 50 : 22; // 50 lbs or 22 kg
  const max = unit === "lbs" ? 1000 : 450; // 1000 lbs or 450 kg

  if (weightNum < min) {
    return { valid: false, error: `Weight must be at least ${min} ${unit}` };
  }

  if (weightNum > max) {
    return { valid: false, error: `Weight must be less than ${max} ${unit}` };
  }

  return { valid: true };
}

// ============================================
// NAME VALIDATION
// ============================================

export function validateName(name: string, fieldName: string = "Name"): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: `${fieldName} is required` };
  }

  if (name.trim().length < 2) {
    return { valid: false, error: `${fieldName} must be at least 2 characters` };
  }

  if (name.length > 50) {
    return { valid: false, error: `${fieldName} must be less than 50 characters` };
  }

  return { valid: true };
}

// ============================================
// CHALLENGE FORM VALIDATION
// ============================================

export interface ChallengeFormData {
  weight: number | string;
  notes?: string;
  photos?: File[];
}

export function validateChallengeForm(
  data: ChallengeFormData
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  // Validate weight
  const weightValidation = validateWeight(data.weight);
  if (!weightValidation.valid) {
    errors.weight = weightValidation.error!;
  }

  // Validate notes (optional, but max length)
  if (data.notes && data.notes.length > 500) {
    errors.notes = "Notes must be less than 500 characters";
  }

  // Validate photos if provided
  if (data.photos) {
    if (data.photos.length !== 3) {
      errors.photos = "Exactly 3 photos are required";
    }

    // Check each photo
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

    data.photos.forEach((photo, index) => {
      if (photo.size > MAX_SIZE) {
        errors[`photo_${index}`] = `Photo ${index + 1} must be less than 5MB`;
      }

      if (!ALLOWED_TYPES.includes(photo.type)) {
        errors[`photo_${index}`] = `Photo ${index + 1} must be JPEG, PNG, or WebP`;
      }
    });
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================
// DATE VALIDATION
// ============================================

export function validateDateRange(
  startDate: Date | string,
  endDate: Date | string
): { valid: boolean; error?: string } {
  const start = typeof startDate === "string" ? new Date(startDate) : startDate;
  const end = typeof endDate === "string" ? new Date(endDate) : endDate;

  if (isNaN(start.getTime())) {
    return { valid: false, error: "Invalid start date" };
  }

  if (isNaN(end.getTime())) {
    return { valid: false, error: "Invalid end date" };
  }

  if (start >= end) {
    return { valid: false, error: "End date must be after start date" };
  }

  return { valid: true };
}

// ============================================
// ADMIN CHALLENGE FORM VALIDATION
// ============================================

export interface AdminChallengeFormData {
  name: string;
  description?: string;
  startDate: Date | string;
  endDate: Date | string;
}

export function validateAdminChallengeForm(
  data: AdminChallengeFormData
): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  // Validate name
  if (!data.name || data.name.trim().length === 0) {
    errors.name = "Challenge name is required";
  } else if (data.name.length > 100) {
    errors.name = "Challenge name must be less than 100 characters";
  }

  // Validate description (optional)
  if (data.description && data.description.length > 1000) {
    errors.description = "Description must be less than 1000 characters";
  }

  // Validate dates
  const dateValidation = validateDateRange(data.startDate, data.endDate);
  if (!dateValidation.valid) {
    errors.dates = dateValidation.error!;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================
// SANITIZATION
// ============================================

/**
 * Sanitizes user input to prevent XSS
 * Basic sanitization - for production, use a library like DOMPurify
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .trim();
}

/**
 * Formats weight to 1 decimal place
 */
export function formatWeight(weight: number): number {
  return Math.round(weight * 10) / 10;
}

/**
 * Converts pounds to kilograms
 */
export function lbsToKg(lbs: number): number {
  return formatWeight(lbs * 0.453592);
}

/**
 * Converts kilograms to pounds
 */
export function kgToLbs(kg: number): number {
  return formatWeight(kg * 2.20462);
}
