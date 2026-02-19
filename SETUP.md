# Leashline Setup Guide

This guide covers three deployment scenarios:

1. **Local only** — everything on your machine, no cloud, no auth
2. **MQTT broker** — add a cloud MQTT broker so hubs can report from anywhere
3. **Full AWS deployment** — API on ECS Fargate, DynamoDB, Clerk auth, custom domain

Each section builds on the previous one. Start with local, then layer on what you need.

---

## 1. Local Development

Run the API and frontend on your machine. No MQTT broker, no auth, no cloud. Good for testing the detection engine and UI.

### Prerequisites

- Python >= 3.11
- [uv](https://docs.astral.sh/uv/) (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
- Node.js >= 18
- A [Mapbox](https://mapbox.com) access token (free tier works)

### Steps

```bash
# 1. Clone and install
git clone https://github.com/zgazak/leashline.git
cd leashline
make sync

# 2. Run the API
make run
# Server starts on http://localhost:8000
# Auth is disabled by default — uses a synthetic dev user and "local" pack

# 3. Set up the frontend
cp web/.env.example web/.env.local
# Edit web/.env.local and set:
#   NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_mapbox_token_here

make web-install
make web-dev
# Frontend on http://localhost:3000
```

### Optional: local MQTT broker

If you want to test MQTT locally (e.g. with a Meshtastic device connected via USB that publishes to MQTT):

```bash
# Install Mosquitto
# macOS:
brew install mosquitto
# Ubuntu/Debian:
sudo apt install mosquitto mosquitto-clients

# Start it (default config, no auth, port 1883)
mosquitto

# The default local.yaml already points to localhost:1883
```

### Test it

```bash
# Run all tests
make test-engine    # 44 tests, pure detection/geo logic
make test-app       # 34 tests, storage + MQTT parsing

# Send a fake position via MQTT (if broker is running)
mosquitto_pub -t "msh/local/2/json/LongFast/!aabbccdd" -m '{
  "type": "position",
  "from": 2864434397,
  "payload": {
    "latitude_i": 357621000,
    "longitude_i": -788550000,
    "altitude": 100,
    "ground_speed": 2,
    "ground_track": 18000
  }
}'
```

---

## 2. Cloud MQTT Broker (EMQX Serverless)

A cloud MQTT broker lets your WiFi hub and BLE hub report positions from anywhere — not just your local network. The Leashline API subscribes to this broker to receive positions.

We recommend **EMQX Serverless** because:
- Free tier: 1M session minutes/month + 1 GB traffic (plenty for a few GPS collars)
- Standard MQTT with username/password auth
- TLS on port 8883 out of the box
- No infrastructure to manage

### 2a. Create an EMQX Serverless deployment

1. Sign up at [emqx.com/cloud](https://www.emqx.com/en/cloud)
2. Create a new **Serverless** deployment
   - Region: pick one close to you (e.g. `us-east-1`)
   - It provisions in ~30 seconds
3. Note the **connection address** from the overview page — it looks like:
   ```
   xxxxxxxxxxxxx.ala.us-east-1.emqxsl.com
   ```
   This is your broker host.

### 2b. Create credentials

1. In the EMQX console, go to **Authentication** (left sidebar)
2. Click **Add** to create a username/password credential:
   - Username: `leashline` (or whatever you prefer)
   - Password: generate a strong password
3. Save these — you'll need them for the API config and the Meshtastic hub

### 2c. (Optional) Set up a custom domain

If you want `broker.leashline.io` (or your own domain) instead of the EMQX hostname:

1. In your DNS provider, add a **CNAME** record:
   ```
   broker.leashline.io  CNAME  xxxxxxxxxxxxx.ala.us-east-1.emqxsl.com
   ```
2. EMQX Serverless uses a shared TLS certificate, so your Meshtastic device and API will still connect using the EMQX hostname for TLS validation, but the CNAME gives you a stable, memorable address
3. Alternatively, just use the EMQX hostname directly — it works fine

### 2d. Configure the Leashline API

For local development with a cloud broker, create a secrets file:

```bash
cp secrets/example.yaml secrets/prod.yaml
```

Edit `secrets/prod.yaml`:
```yaml
mqtt_broker_host: "xxxxxxxxxxxxx.ala.us-east-1.emqxsl.com"
mqtt_username: "leashline"
mqtt_password: "your-password-here"
```

Then update `local.yaml` to use the cloud broker:
```yaml
mqtt:
  broker_host: ""              # overridden by secrets file
  broker_port: 8883
  username: ""                 # overridden by secrets file
  password: ""                 # overridden by secrets file
  topic: "leashline/+/2/json/#"
  tls_enabled: true
```

Or just set environment variables (highest priority):
```bash
export MQTT_BROKER_HOST="xxxxxxxxxxxxx.ala.us-east-1.emqxsl.com"
export MQTT_USERNAME="leashline"
export MQTT_PASSWORD="your-password-here"
make run
```

### 2e. Configure Meshtastic hubs

Leashline supports two hub types. The key difference is **MQTT Client Proxy** — this controls whose internet connection reaches the broker:

| Hub | Connectivity | MQTT Client Proxy | MQTT config lives on |
|-----|-------------|-------------------|---------------------|
| **WiFi hub** (home) | Device has WiFi | **OFF** — device connects directly | The device itself |
| **BLE hub** (mobile) | Device has BLE only | **ON** — phone proxies to broker | The Meshtastic phone app |

#### WiFi hub (Heltec WiFi LoRa 32 V4)

The WiFi hub stays at home, connects to your WiFi, and publishes to the MQTT broker directly — no phone needed.

1. Connect to the device via Meshtastic CLI or app
2. Set WiFi credentials:
   ```bash
   meshtastic --set network.wifi_ssid "YourWiFi"
   meshtastic --set network.wifi_psk "YourWiFiPassword"
   ```
3. Configure MQTT (**Proxy OFF** — device connects directly):
   ```bash
   meshtastic --set mqtt.enabled true
   meshtastic --set mqtt.proxy_to_client_enabled false
   meshtastic --set mqtt.address "xxxxxxxxxxxxx.ala.us-east-1.emqxsl.com"
   meshtastic --set mqtt.username "leashline"
   meshtastic --set mqtt.password "your-password-here"
   meshtastic --set mqtt.tls_enabled true
   meshtastic --set mqtt.root "leashline/YOUR_PACK_ID"
   meshtastic --set mqtt.json_enabled true
   ```
   Replace `YOUR_PACK_ID` with the pack ID shown in **Pack Settings** in the web app (e.g. `a1b2c3d4e5f6`).

4. Set the device role:
   ```bash
   meshtastic --set device.role ROUTER
   ```
5. Plug in and leave it — it auto-reconnects to WiFi and MQTT on power loss.

#### BLE hub (RAK WisMesh Pocket or similar)

The BLE hub is for walks or chasing an escaped dog. It has no WiFi — your phone bridges MQTT traffic over BLE.

1. Pair the BLE device with the **Meshtastic app** on your phone (iOS or Android)
2. On the device, enable MQTT with **Proxy ON**:
   ```bash
   meshtastic --set mqtt.enabled true
   meshtastic --set mqtt.proxy_to_client_enabled true
   meshtastic --set mqtt.json_enabled true
   ```
3. **Configure MQTT in the phone app** (not on the device — the phone handles the actual connection):
   - Open the Meshtastic app → Settings → MQTT
   - **MQTT Enabled**: ON
   - **MQTT Client Proxy**: ON
   - **Server Address**: `xxxxxxxxxxxxx.ala.us-east-1.emqxsl.com`
   - **Username**: `leashline`
   - **Password**: your broker password
   - **TLS Enabled**: ON
   - **Root Topic**: `leashline/YOUR_PACK_ID`
   - **JSON Enabled**: ON

> **Why configure in the app?** When proxy is ON, the device says "hey phone, send this to MQTT" over BLE. The phone app handles the actual broker connection using your phone's cellular or WiFi. So the broker address, credentials, and topic must be set in the app, not on the device.

Both hubs publish to the same MQTT topic namespace, so the Leashline API sees all positions regardless of which hub received them.

### 2f. Verify

```bash
# Subscribe to your broker and watch for messages
mosquitto_sub -h xxxxxxxxxxxxx.ala.us-east-1.emqxsl.com \
  -p 8883 --cafile resources/certs/emqxsl-ca.crt \
  -u leashline -P "your-password-here" \
  -t "leashline/+/2/json/#" -v
```

> **Note:** EMQX Serverless requires its own CA certificate for TLS. The cert is bundled at `resources/certs/emqxsl-ca.crt`. If you don't have it, download it:
> ```bash
> curl -o resources/certs/emqxsl-ca.crt https://assets.emqx.com/data/emqxsl-ca.crt
> ```
> Using `--capath /etc/ssl/certs` will **not** work — EMQX Serverless uses a specific DigiCert root CA that may not be in your system trust store.

When either hub receives a LoRa packet from a collar, you should see JSON messages appear. The Leashline API will parse these and generate positions/alerts.

---

## 3. Full AWS Deployment

Deploy the API to AWS using [SST](https://sst.dev) (Serverless Stack). This gives you:
- **ECS Fargate** — runs the API container
- **DynamoDB** — stores dogs, geofences, positions, alerts, packs
- **ALB** — load balancer with TLS on `api.leashline.io` (or your domain)
- **Clerk** — user auth and pack management

### Prerequisites

- [AWS CLI](https://aws.amazon.com/cli/) configured with credentials
- [SST CLI](https://sst.dev/docs/reference/cli) v3 (`curl -fsSL https://sst.dev/install | bash`)
- [Docker](https://docker.com) (for building the container image)
- A domain managed in AWS Route 53 (for `api.yourdomain.com`)
- A [Clerk](https://clerk.com) application (free tier works)
- An EMQX Serverless deployment (see section 2 above)

### 3a. Set SST secrets

SST stores secrets encrypted in your AWS account. Set them once per stage:

```bash
# MQTT broker (from section 2)
npx sst secret set MqttBrokerHost "xxxxxxxxxxxxx.ala.us-east-1.emqxsl.com"
npx sst secret set MqttUsername "leashline"
npx sst secret set MqttPassword "your-mqtt-password"

# Clerk auth
# Get these from your Clerk dashboard → API Keys
npx sst secret set ClerkSecretKey "sk_live_..."
npx sst secret set ClerkJwtKey "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----"
```

### 3b. Configure your domain

If deploying to production with a custom domain, make sure your domain is set up in Route 53. The SST config in `infra/service.ts` maps `api.leashline.io` for the `production` stage:

```ts
loadBalancer: {
  ports: [{ listen: "443/https", forward: "8000/http" }],
  ...($app.stage === "production" ? { domain: "api.leashline.io" } : {}),
},
```

To use your own domain, edit `infra/service.ts` and replace `api.leashline.io`.

### 3c. Deploy

```bash
# Deploy to a dev stage (no custom domain, auto-generated ALB URL)
npx sst deploy --stage dev

# Deploy to production (uses custom domain)
npx sst deploy --stage production
```

SST will:
1. Build the Docker image from `Dockerfile`
2. Create a VPC, ECS cluster, DynamoDB table, and ALB
3. Inject secrets as environment variables into the container
4. Output the API URL

First deploy takes ~5 minutes (VPC creation). Subsequent deploys are ~2 minutes.

### 3d. Configure the frontend for production

Create a production `.env` or configure your hosting platform (Vercel, Cloudflare Pages, etc.):

```bash
NEXT_PUBLIC_API_URL=https://api.leashline.io   # or your API URL from sst deploy output
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...   # from Clerk dashboard
CLERK_SECRET_KEY=sk_live_...                    # from Clerk dashboard
```

Deploy the frontend:
```bash
cd web
npm run build
# Deploy the .next output to your hosting platform
```

### 3e. Verify the full stack

1. Open your frontend URL — you should see the Clerk sign-in page
2. Sign in and create a pack
3. Note the **MQTT topic prefix** in Pack Settings
4. Configure your Meshtastic WiFi hub with that topic prefix (see section 2e)
5. When the hub receives LoRa packets, positions should appear on the map

### Tear down

```bash
# Remove a dev stage (deletes all resources)
npx sst remove --stage dev
```

Production stage uses `removal: "retain"` so DynamoDB data is preserved even if the stack is removed.

---

## Troubleshooting

### API won't connect to MQTT broker
- Check that `tls_enabled: true` and port `8883` are set for cloud brokers
- Make sure `ca_certs` points to the EMQX CA certificate (`resources/certs/emqxsl-ca.crt` locally, `/app/certs/emqxsl-ca.crt` in Docker). Without this, EMQX Serverless rejects the connection with a misleading "bad user name or password" error
- Verify credentials with `mosquitto_sub` using `--cafile` (see section 2f)
- Check API logs for connection errors: `docker logs <container>` or CloudWatch in AWS

### No positions appearing
- Confirm the Meshtastic hub is connected to WiFi and MQTT (check the device's screen or Meshtastic app)
- Verify the MQTT topic prefix matches your pack ID: `leashline/{pack_id}/2/json/LongFast/!devicehex`
- Subscribe to the broker directly to see if messages are arriving

### Clerk auth issues
- Make sure `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` is set in the frontend env
- Make sure `CLERK_SECRET_KEY` and `CLERK_JWT_KEY` are set in the API (secrets file or env var)
- The JWT key is the **PEM public key** from Clerk dashboard → API Keys → Advanced → JWT Public Key

### EMQX free tier limits
- 1M session minutes/month — a single always-on connection uses ~43,800 minutes/month, so you can run ~20 concurrent connections
- 1 GB traffic/month — GPS positions are tiny (~200 bytes each), so this is plenty
- If you exceed limits, EMQX pauses the deployment until the next billing cycle. Upgrade to the pay-as-you-go tier if needed.
