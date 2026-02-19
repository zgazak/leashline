import { ClerkPublishableKey, ClerkSecretKey, MapboxToken, VapidPublicKey } from "./secrets";
import { DOMAIN } from "./config";
import { service } from "./service";

const domainConfig = DOMAIN
  ? $app.stage === "production"
    ? { name: DOMAIN, redirects: [`www.${DOMAIN}`] }
    : $app.stage === "dev"
      ? { name: `dev.${DOMAIN}` }
      : undefined
  : undefined;

export const web = new sst.aws.Nextjs("Web", {
  path: "web/",
  domain: domainConfig,
  server: {
    runtime: "nodejs22.x",
  },
  environment: {
    NEXT_PUBLIC_API_URL: service.url,
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: ClerkPublishableKey.value,
    CLERK_SECRET_KEY: ClerkSecretKey.value,
    NEXT_PUBLIC_MAPBOX_TOKEN: MapboxToken.value,
    NEXT_PUBLIC_VAPID_PUBLIC_KEY: VapidPublicKey.value,
  },
});
