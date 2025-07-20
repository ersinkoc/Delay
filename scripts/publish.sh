#!/bin/bash

# NPM Publishing Script for @oxog/delay
# Usage: ./scripts/publish.sh [patch|minor|major|beta]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    log_error "package.json not found. Please run from project root."
    exit 1
fi

# Check if git working directory is clean
if [ -n "$(git status --porcelain)" ]; then
    log_error "Working directory is not clean. Please commit or stash changes."
    git status --short
    exit 1
fi

# Check if we're on main branch for production releases
BRANCH=$(git branch --show-current)
VERSION_TYPE=${1:-patch}

if [ "$VERSION_TYPE" != "beta" ] && [ "$BRANCH" != "main" ]; then
    log_warn "You're not on main branch. Current branch: $BRANCH"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Aborted."
        exit 1
    fi
fi

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major|beta)$ ]]; then
    log_error "Invalid version type: $VERSION_TYPE"
    log_info "Usage: $0 [patch|minor|major|beta]"
    exit 1
fi

log_info "Starting publish process for version type: $VERSION_TYPE"

# Pull latest changes
log_info "Pulling latest changes..."
git pull origin $BRANCH

# Install dependencies
log_info "Installing dependencies..."
npm ci

# Run tests
log_info "Running tests..."
npm run test:coverage

# Check test coverage
COVERAGE=$(npm run test:coverage --silent | grep "All files" | awk '{print $10}' | sed 's/%//')
if (( $(echo "$COVERAGE < 95" | bc -l) )); then
    log_warn "Test coverage is below 95%: ${COVERAGE}%"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Aborted."
        exit 1
    fi
fi

# Run linting
log_info "Running linter..."
npm run lint

# Run type checking
log_info "Running type check..."
npm run typecheck

# Build the package
log_info "Building package..."
npm run build

# Test the built package
log_info "Testing built package..."
node -e "
const delay = require('./dist/cjs/index.js').default;
console.log('✅ CJS build working');
" 

node -e "
import('./dist/esm/index.js').then(module => {
    console.log('✅ ESM build working');
}).catch(err => {
    console.error('❌ ESM build failed:', err);
    process.exit(1);
});
"

# Dry run publish
log_info "Running publish dry run..."
npm publish --dry-run

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
log_info "Current version: $CURRENT_VERSION"

# Version and publish based on type
case $VERSION_TYPE in
    beta)
        log_info "Publishing beta version..."
        npm run publish:beta
        ;;
    patch)
        log_info "Publishing patch version..."
        npm run publish:patch
        ;;
    minor)
        log_info "Publishing minor version..."
        npm run publish:minor
        ;;
    major)
        log_info "Publishing major version..."
        npm run publish:major
        ;;
esac

# Get new version
NEW_VERSION=$(node -p "require('./package.json').version")
log_info "Published version: $NEW_VERSION"

# Update changelog
log_info "Updating changelog..."
echo "## [$NEW_VERSION] - $(date +%Y-%m-%d)" >> CHANGELOG.md.tmp
echo "" >> CHANGELOG.md.tmp
cat CHANGELOG.md >> CHANGELOG.md.tmp
mv CHANGELOG.md.tmp CHANGELOG.md

# Commit changelog
git add CHANGELOG.md
git commit -m "Update changelog for v$NEW_VERSION" || true

log_info "✅ Successfully published @oxog/delay@$NEW_VERSION"
log_info "📦 Package: https://www.npmjs.com/package/@oxog/delay"
log_info "🏷️  Tag: https://github.com/ersinkoc/delay/releases/tag/v$NEW_VERSION"

# Open browser to package page
if command -v open &> /dev/null; then
    log_info "Opening NPM package page..."
    open "https://www.npmjs.com/package/@oxog/delay"
fi