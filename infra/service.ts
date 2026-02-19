import {
  ClerkSecretKey,
  ClerkJwtKey,
  MqttBrokerHost,
  MqttUsername,
  MqttPassword,
} from "./secrets";
import { DOMAIN } from "./config";
import { table } from "./dynamo";

const vpc = new sst.aws.Vpc("Vpc");
const cluster = new sst.aws.Cluster("Cluster", { vpc });

export const service = new sst.aws.Service("Service", {
  cluster,
  cpu: "0.5 vCPU",
  memory: "1 GB",
  image: {
    dockerfile: "Dockerfile",
  },
  health: {
    path: "/",
    interval: "30 seconds",
  },
  environment: {
    CONFIG_PATH: "/app/config/leashline.yaml",
    DYNAMODB_TABLE: table.name,
    CLERK_SECRET_KEY: ClerkSecretKey.value,
    CLERK_JWT_KEY: ClerkJwtKey.value,
    MQTT_BROKER_HOST: MqttBrokerHost.value,
    MQTT_USERNAME: MqttUsername.value,
    MQTT_PASSWORD: MqttPassword.value,
  },
  permissions: [
    {
      actions: [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:DeleteItem",
        "dynamodb:Query",
        "dynamodb:Scan",
        "dynamodb:DescribeTable",
      ],
      resources: [table.arn, $interpolate`${table.arn}/index/*`],
    },
  ],
  serviceRegistry: {
    port: 8000,
  },
  loadBalancer: {
    ports: [{ listen: "443/https", forward: "8000/http" }],
    ...(DOMAIN && $app.stage === "production"
      ? { domain: `api.${DOMAIN}` }
      : DOMAIN && $app.stage === "dev"
        ? { domain: `api.dev.${DOMAIN}` }
        : {}),
  },
});
