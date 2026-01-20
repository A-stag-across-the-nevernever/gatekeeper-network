#!/bin/bash

# =============================================================================
# Home Gatekeeper Installation Script
# Installs Gatekeeper client on home devices
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
FAMILY_ID=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --family-id)
            FAMILY_ID="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Usage: $0 --family-id <family_identifier>"
            exit 1
            ;;
    esac
done

# Validate arguments
if [ -z "$FAMILY_ID" ]; then
    log_error "Missing required argument: --family-id"
    echo "Usage: $0 --family-id <family_identifier>"
    echo "Example: $0 --family-id harvey-family-001"
    exit 1
fi

# Configuration
GK_PATH="$(cd "$(dirname "$0")/.." && pwd)"
INSTALL_PATH="$HOME/.gatekeeper"
CONFIG_PATH="$INSTALL_PATH/config"
DATA_PATH="$INSTALL_PATH/data"

log_info "Home Gatekeeper Installation"
log_info "Family ID: $FAMILY_ID"
log_info "Installing to: $INSTALL_PATH"

# Create directories
log_info "Creating directories..."
mkdir -p "$INSTALL_PATH"/{config,data,logs,keys}
mkdir -p "$DATA_PATH"/{credentials,policies,audit}

# Install dependencies
log_info "Installing Node.js dependencies..."
cd "$GK_PATH"
npm install

# Build TypeScript
log_info "Building Gatekeeper..."
npm run build

# Copy built files
log_info "Installing Gatekeeper client..."
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
  "type": "HOME",
  "node_id": "${FAMILY_ID}",
  "family_id": "${FAMILY_ID}",
  "node_name": "Home Gatekeeper",
  "public_key_path": "$INSTALL_PATH/keys/public.pem",
  "private_key_path": "$INSTALL_PATH/keys/private.pem",
  "data_path": "$DATA_PATH",
  "port": 8766,
  "mode": "client",
  "features": {
    "receive_credentials": true,
    "validate_credentials": true,
    "apply_to_rosettaai": true,
    "audit_logging": true,
    "policy_enforcement": true
  },
  "rosettaai": {
    "install_path": "$HOME/.rosettaai",
    "auto_apply_credentials": true
  },
  "network": {
    "enable_federation": true,
    "trusted_servers": []
  }
}
EOF

# Create launch script
log_info "Creating launch script..."
cat > "$INSTALL_PATH/bin/gatekeeper" << EOF
#!/bin/bash
GATEKEEPER_HOME="$INSTALL_PATH"
export NODE_PATH="\$GATEKEEPER_HOME/node_modules"
cd "\$GATEKEEPER_HOME"
exec node "\$GATEKEEPER_HOME/lib/client/index.js" "\$@"
EOF
chmod +x "$INSTALL_PATH/bin/gatekeeper"

# Create systemd service (Linux) or launchd plist (macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    log_info "Creating launchd service..."
    mkdir -p "$HOME/Library/LaunchAgents"
    cat > "$HOME/Library/LaunchAgents/com.soulsindevelopment.gatekeeper.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.soulsindevelopment.gatekeeper</string>
    <key>ProgramArguments</key>
    <array>
        <string>$INSTALL_PATH/bin/gatekeeper</string>
        <string>start</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>$INSTALL_PATH/logs/gatekeeper.log</string>
    <key>StandardErrorPath</key>
    <string>$INSTALL_PATH/logs/gatekeeper.error.log</string>
</dict>
</plist>
EOF
fi

# Add to PATH
SHELL_RC="$HOME/.zshrc"
if ! grep -q ".gatekeeper/bin" "$SHELL_RC" 2>/dev/null; then
    echo 'export PATH="$HOME/.gatekeeper/bin:$PATH"' >> "$SHELL_RC"
    log_info "Added Gatekeeper to PATH in $SHELL_RC"
fi

log_success "Home Gatekeeper installed successfully!"
echo ""
echo "Configuration:"
echo "  Type: HOME (Client)"
echo "  Family ID: $FAMILY_ID"
echo "  Keys: $INSTALL_PATH/keys/"
echo "  Config: $CONFIG_PATH/gatekeeper.json"
echo ""
echo "Next steps:"
echo "1. Restart your terminal or run: source $SHELL_RC"
echo "2. Start Gatekeeper: gatekeeper start"
echo "3. Register with your school/company Gatekeeper to receive credentials"
echo ""
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "To run Gatekeeper at startup:"
    echo "  launchctl load ~/Library/LaunchAgents/com.soulsindevelopment.gatekeeper.plist"
    echo ""
fi
