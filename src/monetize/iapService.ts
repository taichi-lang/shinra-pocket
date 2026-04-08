/**
 * IAPService — In-App Purchase service for ShinraPocket
 * Ticket-based monetization: single monthly subscription.
 *
 * Uses expo-in-app-purchases for real store integration.
 * Falls back to stub mode in __DEV__ for local testing.
 */

import { Platform } from 'react-native';
import { setAdsRemoved } from './adService';
import { setSubscriber } from './ticketStore';

// Lazy-load expo-in-app-purchases to avoid crash in Expo Go
let InAppPurchases: any = null;
let IAPResponseCode: any = {};
let InAppPurchaseState: any = {};
try {
  const iap = require('expo-in-app-purchases');
  InAppPurchases = iap;
  IAPResponseCode = iap.IAPResponseCode;
  InAppPurchaseState = iap.InAppPurchaseState;
} catch {
  console.warn('[IAPService] expo-in-app-purchases not available (Expo Go)');
}

// ============================================================
// Product Definitions
// ============================================================

export interface IAPProduct {
  id: string;
  title: string;
  titleJa: string;
  description: string;
  descriptionJa: string;
  price: string;
  priceAmount: number;
  currency: string;
  type: 'consumable' | 'non-consumable' | 'subscription';
  icon: string;
}

export const PRODUCTS: IAPProduct[] = [
  {
    id: 'com.shinrapocket.premium_monthly',
    title: 'Premium Plan',
    titleJa: 'プレミアムプラン',
    description: 'Unlimited tickets, Game 6 unlocked, no ads',
    descriptionJa: '無制限チケット + ゲーム6解放 + 広告非表示',
    price: '¥580',
    priceAmount: 580,
    currency: 'JPY',
    type: 'subscription' as const,
    icon: '👑',
  },
];

/** Convenience accessor for the single subscription product. */
export const PREMIUM_SUBSCRIPTION = PRODUCTS[0];

// ============================================================
// Purchase State
// ============================================================

export interface PurchaseState {
  isInitialized: boolean;
  ownedProducts: Set<string>;
  subscriptionActive: boolean;
  isPurchasing: boolean;
  error: string | null;
}

const state: PurchaseState = {
  isInitialized: false,
  ownedProducts: new Set(),
  subscriptionActive: false,
  isPurchasing: false,
  error: null,
};

type PurchaseListener = (event: {
  type: 'purchase_success' | 'purchase_failed' | 'purchase_restored';
  productId?: string;
  error?: string;
}) => void;

const listeners: PurchaseListener[] = [];

// ============================================================
// Dev Mode Check
// ============================================================

const IS_DEV = __DEV__;

// ============================================================
// Apply Subscription Benefits
// ============================================================

/**
 * Apply subscription benefits across services.
 */
function applySubscriptionBenefits(): void {
  state.subscriptionActive = true;
  state.ownedProducts.add(PREMIUM_SUBSCRIPTION.id);
  setAdsRemoved(true);
  setSubscriber(true);
}

// ============================================================
// Real Store Implementation
// ============================================================

/**
 * Initialize the IAP service. Call once at app startup.
 */
export async function initializeIAP(): Promise<void> {
  if (state.isInitialized) return;

  if (IS_DEV) {
    console.log('[IAPService] Initialized (dev stub mode)');
    state.isInitialized = true;
    return;
  }

  try {
    await InAppPurchases.connectAsync();

    // Set up the global purchase listener
    InAppPurchases.setPurchaseListener(
      ({ responseCode, results, errorCode }) => {
        if (responseCode === IAPResponseCode.OK && results) {
          for (const purchase of results) {
            if (!purchase.acknowledged) {
              console.log(
                `[IAPService] Purchase successful: ${purchase.productId}`,
              );

              // Apply benefits
              applySubscriptionBenefits();
              notifyListeners({
                type: 'purchase_success',
                productId: purchase.productId,
              });

              // Finish the transaction (false = non-consumable / subscription)
              InAppPurchases.finishTransactionAsync(purchase, false).catch(
                (err) =>
                  console.error(
                    '[IAPService] finishTransaction failed:',
                    err,
                  ),
              );
            }
          }
        } else if (responseCode === IAPResponseCode.USER_CANCELED) {
          console.log('[IAPService] User canceled purchase');
          notifyListeners({ type: 'purchase_failed', error: 'User canceled' });
        } else if (responseCode === IAPResponseCode.DEFERRED) {
          console.log('[IAPService] Purchase deferred (parental approval)');
        } else {
          console.warn(
            `[IAPService] Purchase error, responseCode=${responseCode}, errorCode=${errorCode}`,
          );
          notifyListeners({
            type: 'purchase_failed',
            error: `Store error (code: ${errorCode ?? responseCode})`,
          });
        }

        state.isPurchasing = false;
      },
    );

    console.log('[IAPService] Initialized with expo-in-app-purchases');
    state.isInitialized = true;
  } catch (error) {
    console.error('[IAPService] Init failed:', error);
  }
}

/**
 * Get all available products with current store pricing.
 */
export async function getProducts(): Promise<IAPProduct[]> {
  if (IS_DEV) {
    console.log('[IAPService] Returning stub products (dev mode)');
    return PRODUCTS;
  }

  try {
    const productIds = PRODUCTS.map((p) => p.id);
    const { responseCode, results } =
      await InAppPurchases.getProductsAsync(productIds);

    if (responseCode === IAPResponseCode.OK && results && results.length > 0) {
      // Merge store details into our product definitions
      return PRODUCTS.map((product) => {
        const storeItem = (results as IAPItemDetails[]).find(
          (r) => r.productId === product.id,
        );
        if (storeItem) {
          return {
            ...product,
            price: storeItem.price,
            priceAmount: storeItem.priceAmountMicros / 1_000_000,
            currency: storeItem.priceCurrencyCode,
            title: storeItem.title || product.title,
            description: storeItem.description || product.description,
          };
        }
        return product;
      });
    }

    console.warn(
      '[IAPService] getProductsAsync returned non-OK:',
      responseCode,
    );
    return PRODUCTS;
  } catch (error) {
    console.error('[IAPService] Failed to fetch products:', error);
    return PRODUCTS;
  }
}

/**
 * Purchase a product by ID.
 */
export async function purchaseProduct(productId: string): Promise<boolean> {
  if (state.isPurchasing) {
    console.warn('[IAPService] Purchase already in progress');
    return false;
  }

  const product = PRODUCTS.find((p) => p.id === productId);
  if (!product) {
    console.error('[IAPService] Product not found:', productId);
    return false;
  }

  state.isPurchasing = true;
  state.error = null;

  if (IS_DEV) {
    // Stub: simulate successful purchase in dev mode
    console.log(`[IAPService] Purchase (dev stub): ${productId}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    applySubscriptionBenefits();
    notifyListeners({ type: 'purchase_success', productId });
    state.isPurchasing = false;
    return true;
  }

  try {
    // The actual result is handled by setPurchaseListener callback.
    // purchaseItemAsync just kicks off the flow.
    await InAppPurchases.purchaseItemAsync(productId);
    // isPurchasing will be set to false in the purchase listener
    return true;
  } catch (error: any) {
    state.error = error?.message ?? 'Purchase failed';
    state.isPurchasing = false;
    notifyListeners({
      type: 'purchase_failed',
      productId,
      error: state.error ?? undefined,
    });
    return false;
  }
}

/**
 * Restore previously purchased subscriptions.
 */
export async function restorePurchases(): Promise<string[]> {
  if (IS_DEV) {
    console.log('[IAPService] Restore purchases (dev stub)');
    notifyListeners({ type: 'purchase_restored' });
    return [];
  }

  try {
    const { responseCode, results } =
      await InAppPurchases.getPurchaseHistoryAsync();

    const restored: string[] = [];

    if (responseCode === IAPResponseCode.OK && results) {
      for (const purchase of results as InAppPurchase[]) {
        // Check if this is our subscription and it's in a purchased/restored state
        if (
          purchase.productId === PREMIUM_SUBSCRIPTION.id &&
          (purchase.purchaseState === InAppPurchaseState.PURCHASED ||
            purchase.purchaseState === InAppPurchaseState.RESTORED)
        ) {
          restored.push(purchase.productId);
          applySubscriptionBenefits();

          // Acknowledge if not already done
          if (!purchase.acknowledged) {
            await InAppPurchases.finishTransactionAsync(purchase, false);
          }
        }
      }
    }

    notifyListeners({ type: 'purchase_restored' });
    return restored;
  } catch (error) {
    console.error('[IAPService] Restore failed:', error);
    return [];
  }
}

/**
 * Check if a product is owned / subscription is active.
 */
export function isProductOwned(productId: string): boolean {
  return state.ownedProducts.has(productId);
}

/**
 * Check if the monthly subscription is currently active.
 */
export function isSubscriptionActive(): boolean {
  return state.subscriptionActive;
}

/**
 * Check if currently purchasing.
 */
export function isPurchasing(): boolean {
  return state.isPurchasing;
}

/**
 * Register a purchase event listener.
 */
export function addPurchaseListener(listener: PurchaseListener): () => void {
  listeners.push(listener);
  return () => {
    const idx = listeners.indexOf(listener);
    if (idx >= 0) listeners.splice(idx, 1);
  };
}

function notifyListeners(event: Parameters<PurchaseListener>[0]) {
  listeners.forEach((l) => l(event));
}

/**
 * Cleanup IAP connection. Call on app unmount.
 */
export async function disconnectIAP(): Promise<void> {
  if (IS_DEV) {
    state.isInitialized = false;
    console.log('[IAPService] Disconnected (dev stub)');
    return;
  }

  try {
    await InAppPurchases.disconnectAsync();
    state.isInitialized = false;
    console.log('[IAPService] Disconnected');
  } catch (error) {
    console.error('[IAPService] Disconnect failed:', error);
  }
}

export default {
  initializeIAP,
  getProducts,
  purchaseProduct,
  restorePurchases,
  isProductOwned,
  isSubscriptionActive,
  isPurchasing,
  addPurchaseListener,
  disconnectIAP,
};
