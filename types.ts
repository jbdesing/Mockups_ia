
export type Category = 
  | 'camiseta-masculina' 
  | 'camiseta-feminina' 
  | 'camiseta-infantil-masculina' 
  | 'camiseta-infantil-feminina';

export type ImageLocation = 'front' | 'back' | 'leftSleeve' | 'rightSleeve';
export type PrintSize = 'filled' | 'localized';

export interface ImageState {
  file: File | null;
  base64: string | null;
  size: PrintSize;
  isMarkedEmpty?: boolean;
}

export type ImagesState = Partial<Record<ImageLocation, ImageState>>;

export interface MockupGenerationOptions {
  images: ImagesState;
  category: Category;
  color: string;
  prompt: string;
}

export interface GeminiRequestOptions {
  images: string[];
  prompt: string;
}

export interface GeneratedImage {
  id: string;
  src: string; // base64 data URL
  prompt: string;
}

export type PlanType = 'free' | 'basic' | 'intermediate' | 'premium';
export type BillingCycle = 'monthly' | 'annual';

export interface DownloadHistoryItem {
  id: string;
  src: string;
  timestamp: any;
  prompt: string;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  plan: PlanType;
  billingCycle: BillingCycle;
  trialUses: number;
  dailyUses: number;
  monthlyUses?: number;
  lastUseDate: string;
  renewalDate: any;
  currentPeriodStart?: any;
  currentPeriodEnd?: any;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeStatus?: string;
  downloadHistory?: DownloadHistoryItem[];
}
