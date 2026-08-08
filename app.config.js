const fs = require("fs");
const path = require("path");

const appJsonPath = path.join(__dirname, "app.json");
const raw = fs.readFileSync(appJsonPath, "utf8");
const { expo } = JSON.parse(raw);

const variant = process.env.APP_VARIANT ?? "production";
const isDemo = variant === "demo";

const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";
const localGoogleServicesPath = path.join(__dirname, "google-services.json");
const googleServicesFile =
  process.env.GOOGLE_SERVICES_JSON ||
  (fs.existsSync(localGoogleServicesPath) ? "./google-services.json" : undefined);

const androidConfig = {
  ...expo.android,
  package: isDemo ? "com.lagoon.demo" : "com.lagoon.app",
  config: {
    ...(expo.android?.config ?? {}),
    googleMaps: { apiKey: googleMapsApiKey },
  },
};

if (googleServicesFile) {
  androidConfig.googleServicesFile = googleServicesFile;
}

module.exports = {
  ...expo,
  name: isDemo ? "Lagoon Demo" : "Lagoon",
  ios: {
    ...expo.ios,
    bundleIdentifier: isDemo ? "com.lagoon.demo" : "com.lagoon.app",
    config: {
      ...(expo.ios?.config ?? {}),
      googleMapsApiKey,
    },
  },
  android: androidConfig,
};
