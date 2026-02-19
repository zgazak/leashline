#!/bin/bash
# Manage SST secrets for leashline
#
# Usage:
#   ./scripts/secrets.sh list <stage>          List current SST secrets
#   ./scripts/secrets.sh sync <stage>          Sync local YAML secrets to SST
#   ./scripts/secrets.sh set <stage> KEY VAL   Set a single secret

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

ACTION="${1:-}"
STAGE="${2:-}"

usage() {
    echo "Usage: $0 <action> <stage> [key] [value]"
    echo ""
    echo "Actions:"
    echo "  list <stage>              List current SST secrets for a stage"
    echo "  sync <stage>              Sync secrets from local YAML to SST"
    echo "  set  <stage> <key> <val>  Set a single SST secret"
    echo ""
    echo "Stages: dev, production"
    echo ""
    echo "Secrets YAML files: secrets/dev.yaml, secrets/prod.yaml"
    echo ""
    echo "Examples:"
    echo "  $0 list dev"
    echo "  $0 sync production"
    echo "  $0 set dev ClerkSecretKey sk_test_..."
    exit 1
}

# Validate inputs
[[ -z "$ACTION" || -z "$STAGE" ]] && usage

case "$STAGE" in
    dev|production) ;;
    prod) STAGE="production" ;;
    *) echo "Error: Unknown stage '$STAGE'. Use 'dev' or 'production'."; exit 1 ;;
esac

# --- LIST ---
if [[ "$ACTION" == "list" ]]; then
    echo "SST secrets for stage '$STAGE':"
    echo ""
    cd "$PROJECT_DIR" && npx sst secret list --stage "$STAGE"
    exit 0
fi

# --- SET ---
if [[ "$ACTION" == "set" ]]; then
    KEY="${3:-}"
    VAL="${4:-}"
    [[ -z "$KEY" || -z "$VAL" ]] && { echo "Error: set requires KEY and VALUE"; usage; }

    echo "Setting $KEY for stage '$STAGE'..."
    cd "$PROJECT_DIR" && npx sst secret set "$KEY" "$VAL" --stage "$STAGE"
    echo "Done."
    exit 0
fi

# --- SYNC ---
if [[ "$ACTION" == "sync" ]]; then
    # Map stage to secrets YAML file
    case "$STAGE" in
        dev)        SECRETS_FILE="$PROJECT_DIR/secrets/dev.yaml" ;;
        production) SECRETS_FILE="$PROJECT_DIR/secrets/prod.yaml" ;;
    esac

    if [[ ! -f "$SECRETS_FILE" ]]; then
        echo "Error: Secrets file not found: $SECRETS_FILE"
        echo "Copy from example: cp secrets/example.yaml $SECRETS_FILE"
        exit 1
    fi

    cd "$PROJECT_DIR" && python3 -c "
import yaml, sys, subprocess

KEY_MAP = {
    'clerk_secret_key':      'ClerkSecretKey',
    'clerk_jwt_key':         'ClerkJwtKey',
    'clerk_publishable_key': 'ClerkPublishableKey',
    'mqtt_broker_host':      'MqttBrokerHost',
    'mqtt_username':         'MqttUsername',
    'mqtt_password':         'MqttPassword',
    'mapbox_token':          'MapboxToken',
    'vapid_public_key':      'VapidPublicKey',
    'vapid_private_key':     'VapidPrivateKey',
}

secrets_file, stage = sys.argv[1], sys.argv[2]
print(f'Syncing secrets from {secrets_file.rsplit(\"/\", 1)[-1]} to SST stage \"{stage}\"...\n')

with open(secrets_file) as f:
    data = yaml.safe_load(f) or {}

count = skipped = 0
for yaml_key, val in data.items():
    sst_key = KEY_MAP.get(yaml_key)
    if not sst_key:
        print(f'  SKIP  {yaml_key} (unknown key)')
        skipped += 1
        continue
    if not val:
        print(f'  SKIP  {sst_key} (empty)')
        skipped += 1
        continue
    print(f'  SET   {sst_key}')
    subprocess.run(
        ['npx', 'sst', 'secret', 'set', sst_key, '--stage', stage],
        check=True, input=str(val).encode(),
    )
    count += 1

print(f'\nDone: {count} secrets set, {skipped} skipped (empty).')
" "$SECRETS_FILE" "$STAGE"
    exit 0
fi

echo "Error: Unknown action '$ACTION'"
usage
