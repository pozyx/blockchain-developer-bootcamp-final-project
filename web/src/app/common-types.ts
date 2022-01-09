export interface ProviderRpcError extends Error {
    code: number;
    data?: unknown;
}