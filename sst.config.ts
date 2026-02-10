/// <reference path="./.sst/platform/config.d.ts" />
export default $config({
  app(input) {
    return {
      name: "leashline",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
      providers: { aws: true },
    };
  },
  async run() {
    await import("./infra/secrets");
    await import("./infra/dynamo");
    await import("./infra/service");
  },
});
