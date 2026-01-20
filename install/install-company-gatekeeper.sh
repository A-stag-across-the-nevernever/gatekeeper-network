#!/bin/bash

# =============================================================================
# Company Gatekeeper Installation Script
# Installs Gatekeeper server at companies
# Part of Souls in Development - GatekeeperNetwork
# =============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Parse arguments
COMPANY_ID=""
COMPANY_NAME=""
INDUSTRY=""
TIER=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --company-id)
            COMPANY_ID="$2"
            shift 2
            ;;
        --name)
            COMPANY_NAME="$2"
            shift 2
            ;;
        --industry)
            INDUSTRY="$2"
            shift 2
            ;;
        --tier)
            TIER="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Usage: $0 --company-id <id> --name <company_name> --industry <tech|healthcare|etc> --tier <startup|enterprise|etc>"
            exit 1
            ;;
    esac
done

# Validate arguments
if [ -z "$COMPANY_ID" ] || [ -z "$COMPANY_NAME" ] || [ -z "$INDUSTRY" ]; then
    log_error "Missing required arguments"
    echo "Usage: $0 --company-id <id> --name <company_name> --industry <tech|healthcare|etc> [--tier <startup|enterprise>]"
    echo "Example: $0 --company-id techcorp-001 --name \"TechCorp Inc\" --industry technology --tier startup"
    exit 1
fi

TIER="${TIER:-startup}"

# Configuration
GK_PATH="$(cd "$(dirname "$0")/.." && pwd)"
INSTALL_PATH="/opt/gatekeeper"
CONFIG_PATH="$INSTALL_PATH/config"
DATA_PATH="$INSTALL_PATH/data"

# Map industry to knowledge centre
case $INDUSTRY in
    technology|tech)
        KC_NAME="Neural Nexus"
        ;;
    healthcare|medical)
        KC_NAME="Medical Codex"
        ;;
    manufacturing)
        KC_NAME="Forge Network"
        ;;
    finance)
        KC_NAME="Capital Archive"
        ;;
    creative|arts)
        KC_NAME="Creative Muse"
        ;;
    *)
        KC_NAME="Industry Knowledge Base"
        ;;
esac

log_info "Company Gatekeeper Installation"
log_info "Company: $COMPANY_NAME"
log_info "Company ID: $COMPANY_ID"
log_info "Industry: $INDUSTRY"
log_info "Tier: $TIER"
log_info "Knowledge Centre: $KC_NAME"
log_info "Installing to: $INSTALL_PATH"

# Check root permissions
if [ "$EUID" -ne 0 ]; then
    log_error "This script must be run as root (use sudo)"
    exit 1
fi

# Create directories
log_info "Creating directories..."
mkdir -p "$INSTALL_PATH"/{config,data,logs,keys}
mkdir -p "$DATA_PATH"/{credentials,policies,audit,employees,teams}

# Install dependencies
log_info "Installing Node.js dependencies..."
cd "$GK_PATH"
npm install

# Build TypeScript
log_info "Building Gatekeeper..."
npm run build

# Copy built files
log_info "Installing Gatekeeper server..."
mkdir -p "$INSTALL_PATH/lib"
cp -r "$GK_PATH/dist/"* "$INSTALL_PATH/lib/" 2>/dev/null || true
cp -r "$GK_PATH/node_modules" "$INSTALL_PATH/" 2>/dev/null || true

# Generate cryptographic keys
log_info "Generating Ed25519 key pair..."
cat > "$INSTALL_PATH/keys/generate-keys.js" << 'EOF'
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
});

fs.writeFileSync(path.join(__dirname, 'public.pem'), publicKey);
fs.writeFileSync(path.join(__dirname, 'private.pem'), privateKey);
fs.chmodSync(path.join(__dirname, 'private.pem'), 0o600);

console.log('Keys generated successfully');
EOF

node "$INSTALL_PATH/keys/generate-keys.js"
rm "$INSTALL_PATH/keys/generate-keys.js"

# Create configuration
log_info "Creating configuration..."
cat > "$CONFIG_PATH/gatekeeper.json" << EOF
{
  "type": "COMPANY",
  "node_id": "${COMPANY_ID}",
  "institution_id": "${COMPANY_ID}",
  "node_name": "${COMPANY_NAME}",
  "industry": "${INDUSTRY}",
  "tier": "${TIER}",
  "public_key_path": "$INSTALL_PATH/keys/public.pem",
  "private_key_path": "$INSTALL_PATH/keys/private.pem",
  "data_path": "$DATA_PATH",
  "port": 8765,
  "mode": "server",
  "features": {
    "issue_credentials": true,
    "validate_credentials": true,
    "manage_employees": true,
    "manage_teams": true,
    "policy_teaching": true,
    "audit_logging": true,
    "eleven_laws_enforcement": true
  },
  "knowledge_centre": {
    "name": "${KC_NAME}",
    "industry": "${INDUSTRY}",
    "enabled": true
  },
  "network": {
    "enable_federation": true,
    "accept_connections": true,
    "max_connections": 5000
  },
  "policies": {
    "require_employment_verification": true,
    "data_retention_days": 2555,
    "audit_all_actions": true,
    "require_nda": true
  }
}
EOF

# Create systemd service
log_info "Creating systemd service..."
cat > "/etc/systemd/system/gatekeeper.service" << EOF
[Unit]
Description=Gatekeeper Network Server
After=network.target

[Service]
Type=simple
User=gatekeeper
Group=gatekeeper
WorkingDirectory=$INSTALL_PATH
ExecStart=/usr/bin/node $INSTALL_PATH/lib/server/index.js
Restart=always
RestartSec=10
StandardOutput=append:$INSTALL_PATH/logs/gatekeeper.log
StandardError=append:$INSTALL_PATH/logs/gatekeeper.error.log

[Install]
WantedBy=multi-user.target
EOF

# Create gatekeeper user
if ! id "gatekeeper" &>/dev/null; then
    log_info "Creating gatekeeper user..."
    useradd -r -s /bin/false gatekeeper
fi

# Set permissions
chown -R gatekeeper:gatekeeper "$INSTALL_PATH"
chmod 600 "$INSTALL_PATH/keys/private.pem"

log_success "Company Gatekeeper installed successfully!"
echo ""
echo "Configuration:"
echo "  Type: COMPANY (Server)"
echo "  Company: $COMPANY_NAME"
echo "  Company ID: $COMPANY_ID"
echo "  Industry: $INDUSTRY"
echo "  Tier: $TIER"
echo "  Knowledge Centre: $KC_NAME"
echo "  Keys: $INSTALL_PATH/keys/"
echo "  Config: $CONFIG_PATH/gatekeeper.json"
echo ""
echo "Next steps:"
echo "1. Review configuration: $CONFIG_PATH/gatekeeper.json"
echo "2. Start service: sudo systemctl start gatekeeper"
echo "3. Enable at boot: sudo systemctl enable gatekeeper"
echo "4. Check status: sudo systemctl status gatekeeper"
echo "5. View logs: sudo journalctl -u gatekeeper -f"
echo ""
echo "To issue credentials to employees:"
echo "  gatekeeper-admin issue-credential --employee <employee_id> --role <software_engineer|etc>"
echo ""
