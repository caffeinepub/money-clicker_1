import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface http_request_result {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface TipRecord {
    status: string;
    createdAt: bigint;
    sender: string;
    message: string;
    currency: string;
    amount: bigint;
    paymentIntentId?: string;
}
export interface Tip {
    status: string;
    sender: string;
    message: string;
    currency: string;
    timestamp: bigint;
    amount: bigint;
    paymentIntentId?: string;
}
export interface TransformationOutput {
    status: bigint;
    body: Uint8Array;
    headers: Array<http_header>;
}
export interface ShoppingItem {
    productName: string;
    currency: string;
    quantity: bigint;
    priceInCents: bigint;
    productDescription: string;
}
export interface TransformationInput {
    context: Uint8Array;
    response: http_request_result;
}
export interface PublicStats {
    recentTips: Array<Tip>;
    totalAmountCents: bigint;
    tipCount: bigint;
}
export type StripeSessionStatus = {
    __kind__: "completed";
    completed: {
        userPrincipal?: string;
        response: string;
    };
} | {
    __kind__: "failed";
    failed: {
        error: string;
    };
};
export interface StripeConfiguration {
    allowedCountries: Array<string>;
    secretKey: string;
}
export interface UserProfile {
    name: string;
}
export interface http_header {
    value: string;
    name: string;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addTip(amount: bigint, currency: string, message: string, sender: string, status: string, paymentIntentId: string | null): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createCheckoutSession(items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    createCheckoutSessionInternal(actorId: Principal, items: Array<ShoppingItem>, successUrl: string, cancelUrl: string): Promise<string>;
    createTip(amount: bigint, currency: string, message: string, sender: string): Promise<string>;
    getAllTips(): Promise<Array<TipRecord>>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getGoal(): Promise<bigint>;
    getPublicStats(): Promise<PublicStats>;
    getStripeSessionStatus(sessionId: string): Promise<StripeSessionStatus>;
    getTotalTipsAmount(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isStripeConfigured(): Promise<boolean>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    setGoal(amount: bigint): Promise<void>;
    setStripeConfiguration(config: StripeConfiguration): Promise<void>;
    transform(input: TransformationInput): Promise<TransformationOutput>;
}
