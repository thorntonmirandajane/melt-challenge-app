/**
 * Shopify Customer utilities for linking participants to customer accounts
 */

import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

// ============================================
// TYPES
// ============================================

export interface ShopifyCustomerData {
  id: string; // GID format: gid://shopify/Customer/123
  email: string;
  firstName: string | null;
  lastName: string | null;
  ordersCount: number;
  totalSpent: string; // Money amount as string
}

// ============================================
// LOOKUP CUSTOMER BY EMAIL
// ============================================

/**
 * Looks up a Shopify customer by email address
 * Returns customer data including order count and total spent
 */
export async function lookupCustomerByEmail(
  admin: AdminApiContext,
  email: string
): Promise<ShopifyCustomerData | null> {
  try {
    const response = await admin.graphql(
      `#graphql
      query getCustomerByEmail($email: String!) {
        customers(first: 1, query: $email) {
          edges {
            node {
              id
              email
              firstName
              lastName
              numberOfOrders
              amountSpent {
                amount
              }
            }
          }
        }
      }`,
      {
        variables: {
          email: `email:${email}`,
        },
      }
    );

    const data = await response.json();

    if (!data?.data?.customers?.edges?.length) {
      return null;
    }

    const customer = data.data.customers.edges[0].node;

    return {
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName,
      ordersCount: customer.numberOfOrders || 0,
      totalSpent: customer.amountSpent?.amount || "0.00",
    };
  } catch (error) {
    console.error("Error looking up customer:", error);
    return null;
  }
}

// ============================================
// GET CUSTOMER ORDER STATS
// ============================================

/**
 * Gets detailed order statistics for a customer
 */
export async function getCustomerOrderStats(
  admin: AdminApiContext,
  customerId: string
): Promise<{ ordersCount: number; totalSpent: string } | null> {
  try {
    const response = await admin.graphql(
      `#graphql
      query getCustomerOrders($id: ID!) {
        customer(id: $id) {
          numberOfOrders
          amountSpent {
            amount
          }
        }
      }`,
      {
        variables: {
          id: customerId,
        },
      }
    );

    const data = await response.json();

    if (!data?.data?.customer) {
      return null;
    }

    const customer = data.data.customer;

    return {
      ordersCount: customer.numberOfOrders || 0,
      totalSpent: customer.amountSpent?.amount || "0.00",
    };
  } catch (error) {
    console.error("Error getting customer order stats:", error);
    return null;
  }
}
