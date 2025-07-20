# Contributing to @oxog/delay

Thank you for your interest in contributing to @oxog/delay! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)
- [Style Guidelines](#style-guidelines)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to the maintainers.

### Our Standards

- Use welcoming and inclusive language
- Be respectful of differing viewpoints and experiences
- Gracefully accept constructive criticism
- Focus on what is best for the community
- Show empathy towards other community members

## Getting Started

### Prerequisites

- Node.js 14.0.0 or higher
- npm 6.0.0 or higher
- Git

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/delay.git
   cd delay
   ```

## Development Setup

1. Install dependencies:
   ```bash
   npm ci
   ```

2. Run the build to ensure everything works:
   ```bash
   npm run build
   ```

3. Run tests to verify setup:
   ```bash
   npm test
   ```

4. Run the development checks:
   ```bash
   npm run lint
   npm run typecheck
   ```

### Project Structure

```
src/
├── core/           # Core delay functionality
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── plugins/        # Plugin system

tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── fixtures/       # Test fixtures

examples/
├── basic-usage/    # Simple examples
├── advanced-usage/ # Complex examples
├── browser-usage/  # Browser demos
└── typescript-usage/ # TypeScript examples
```

## Making Changes

### Branch Naming

- `feature/description` - New features
- `bugfix/description` - Bug fixes
- `docs/description` - Documentation changes
- `refactor/description` - Code refactoring
- `test/description` - Test improvements

### Commit Messages

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Examples:
- `feat(core): add new delay cancellation method`
- `fix(utils): handle edge case in time parser`
- `docs(readme): update API documentation`

### Development Workflow

1. Create a new branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Run tests frequently:
   ```bash
   npm run test:watch
   ```

4. Check code quality:
   ```bash
   npm run lint
   npm run typecheck
   ```

5. Commit your changes:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

## Testing

### Test Requirements

- **100% code coverage is mandatory**
- All tests must pass
- New features require comprehensive tests
- Bug fixes must include regression tests

### Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm run test:watch

# Run specific test file
npm test -- utils/time.test.ts
```

### Writing Tests

1. **Unit Tests**: Test individual functions in isolation
2. **Integration Tests**: Test feature interactions
3. **Edge Cases**: Test boundary conditions and error scenarios

Example test structure:
```typescript
describe('FeatureName', () => {
  describe('methodName', () => {
    it('should handle normal case', () => {
      // Test implementation
    });

    it('should handle edge case', () => {
      // Test edge cases
    });

    it('should throw error for invalid input', () => {
      // Test error conditions
    });
  });
});
```

### Test Coverage Requirements

- **Statements**: 100%
- **Branches**: 100%
- **Functions**: 100%
- **Lines**: 100%

## Pull Request Process

### Before Submitting

1. Ensure all tests pass:
   ```bash
   npm run test:coverage
   ```

2. Verify code quality:
   ```bash
   npm run lint
   npm run typecheck
   ```

3. Build the project:
   ```bash
   npm run build
   ```

4. Update documentation if needed

### PR Description Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests added/updated
- [ ] All tests pass
- [ ] Coverage remains at 100%

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or properly documented)
```

### Review Process

1. Automated checks must pass
2. At least one maintainer review required
3. All conversations must be resolved
4. Branch must be up to date with main

## Release Process

### Version Numbering

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Steps

1. Update version:
   ```bash
   npm version patch|minor|major
   ```

2. Update CHANGELOG.md

3. Create release PR

4. After merge, publish:
   ```bash
   npm publish
   ```

### Automated Releases

Releases are automated via GitHub Actions when:
- A release is created on GitHub
- All CI checks pass
- Version is updated in package.json

## Style Guidelines

### TypeScript

- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use enums for constants
- Document all public APIs with JSDoc

### Code Style

- Use ESLint configuration provided
- Prefer explicit types over `any`
- Use meaningful variable names
- Keep functions small and focused
- Add comments for complex logic

### Documentation

- Update README.md for new features
- Add JSDoc comments for public APIs
- Include examples in documentation
- Update type definitions

### Examples

- Provide working examples for new features
- Test examples as part of CI
- Include both JavaScript and TypeScript examples
- Cover common use cases

## Getting Help

### Channels

- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: Questions and general discussion
- **Email**: For security concerns or private matters

### Resources

- [README.md](./README.md) - Project overview
- [API Documentation](./docs/api.md) - Detailed API reference
- [Examples](./examples/) - Working code examples
- [Changelog](./CHANGELOG.md) - Version history

## Recognition

Contributors will be:
- Listed in package.json contributors
- Mentioned in release notes
- Added to GitHub contributors graph
- Thanked in project documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing to @oxog/delay! 🚀