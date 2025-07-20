# NPM Publishing Script for @oxog/delay (PowerShell)
# Usage: .\scripts\publish.ps1 [patch|minor|major|beta]

param(
    [ValidateSet("patch", "minor", "major", "beta")]
    [string]$VersionType = "patch"
)

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
}

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Error "package.json not found. Please run from project root."
    exit 1
}

# Check if git working directory is clean
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Error "Working directory is not clean. Please commit or stash changes."
    git status --short
    exit 1
}

# Check if we're on main branch for production releases
$branch = git branch --show-current
if ($VersionType -ne "beta" -and $branch -ne "main") {
    Write-Warn "You're not on main branch. Current branch: $branch"
    $response = Read-Host "Continue anyway? (y/N)"
    if ($response -notmatch "^[Yy]$") {
        Write-Info "Aborted."
        exit 1
    }
}

Write-Info "Starting publish process for version type: $VersionType"

# Pull latest changes
Write-Info "Pulling latest changes..."
git pull origin $branch

# Install dependencies
Write-Info "Installing dependencies..."
npm ci

# Run tests
Write-Info "Running tests..."
npm run test:coverage

# Check test coverage
$coverageOutput = npm run test:coverage --silent 2>$null | Select-String "All files"
if ($coverageOutput) {
    $coverage = ($coverageOutput -split "\s+")[9] -replace "%", ""
    if ([int]$coverage -lt 95) {
        Write-Warn "Test coverage is below 95%: ${coverage}%"
        $response = Read-Host "Continue anyway? (y/N)"
        if ($response -notmatch "^[Yy]$") {
            Write-Info "Aborted."
            exit 1
        }
    }
}

# Run linting
Write-Info "Running linter..."
npm run lint

# Run type checking
Write-Info "Running type check..."
npm run typecheck

# Build the package
Write-Info "Building package..."
npm run build

# Test the built package
Write-Info "Testing built package..."
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
Write-Info "Running publish dry run..."
npm publish --dry-run

# Get current version
$currentVersion = node -p "require('./package.json').version"
Write-Info "Current version: $currentVersion"

# Version and publish based on type
switch ($VersionType) {
    "beta" {
        Write-Info "Publishing beta version..."
        npm run publish:beta
    }
    "patch" {
        Write-Info "Publishing patch version..."
        npm run publish:patch
    }
    "minor" {
        Write-Info "Publishing minor version..."
        npm run publish:minor
    }
    "major" {
        Write-Info "Publishing major version..."
        npm run publish:major
    }
}

# Get new version
$newVersion = node -p "require('./package.json').version"
Write-Info "Published version: $newVersion"

# Update changelog
Write-Info "Updating changelog..."
$changelogHeader = "## [$newVersion] - $(Get-Date -Format 'yyyy-MM-dd')`n`n"
$existingChangelog = Get-Content "CHANGELOG.md" -Raw
$newChangelog = $changelogHeader + $existingChangelog
Set-Content "CHANGELOG.md" $newChangelog

# Commit changelog
git add CHANGELOG.md
git commit -m "Update changelog for v$newVersion"

Write-Info "✅ Successfully published @oxog/delay@$newVersion"
Write-Info "📦 Package: https://www.npmjs.com/package/@oxog/delay"
Write-Info "🏷️  Tag: https://github.com/ersinkoc/delay/releases/tag/v$newVersion"

# Open browser to package page
if (Get-Command "start" -ErrorAction SilentlyContinue) {
    Write-Info "Opening NPM package page..."
    start "https://www.npmjs.com/package/@oxog/delay"
}