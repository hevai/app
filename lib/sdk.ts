import { ComposeSDK } from "@compose-market/sdk";

export const sdk = new ComposeSDK({
  baseUrl: "https://api.compose.market",
  channelsUrl: "https://services.compose.market",
  timeoutMs: 60_000,
});
