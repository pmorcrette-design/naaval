import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "eu.naaval.carrier",
  appName: "Naaval Carrier App",
  webDir: "www",
  bundledWebRuntime: false,
  ios: {
    contentInset: "automatic",
    backgroundColor: "#f4faf7"
  },
  server: {
    cleartext: true
  }
};

export default config;
