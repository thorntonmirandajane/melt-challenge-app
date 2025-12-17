import prisma from "../db.server";

/**
 * Default customization settings
 */
const DEFAULTS = {
  // Start Form
  startFormTitle: "Start Your Weight Loss Challenge",
  startFormWelcomeText: null,
  startFormSubmitButtonText: "Start Challenge",

  // End Form
  endFormTitle: "Complete Your Weight Loss Challenge",
  endFormWelcomeText: null,
  endFormSubmitButtonText: "Complete Challenge",

  // Success - Start
  successStartTitle: "Challenge Started!",
  successStartMessage: null,
  successStartSubMessage: null,

  // Success - End
  successEndTitle: "Challenge Completed!",
  successEndMessage: null,
  successEndSubMessage: null,

  // Colors
  primaryColor: "#667eea",
  secondaryColor: "#764ba2",
  backgroundColor: "#ffffff",
  textColor: "#333333",
  buttonColor: "#28a745",
  buttonHoverColor: "#218838",
  inputBackgroundColor: "#f9f9f9",
  inputBorderColor: "#ddd",
};

/**
 * Get customization settings for a shop
 * Returns defaults if no custom settings exist
 */
export async function getCustomizationSettings(shop: string) {
  const settings = await prisma.customizationSettings.findUnique({
    where: { shop },
  });

  // Return settings merged with defaults
  return {
    ...DEFAULTS,
    ...settings,
  };
}

/**
 * Update customization settings for a shop
 * Creates new settings if they don't exist
 */
export async function updateCustomizationSettings(
  shop: string,
  data: Partial<typeof DEFAULTS>
) {
  return await prisma.customizationSettings.upsert({
    where: { shop },
    create: {
      shop,
      ...data,
    },
    update: data,
  });
}
