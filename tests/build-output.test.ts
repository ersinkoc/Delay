import * as fs from 'fs';
import * as path from 'path';

describe('Build Output Tests', () => {
  const distPath = path.join(__dirname, '..', 'dist');

  describe('ESM Build', () => {
    it('should have package.json with type: module', () => {
      const esmPackagePath = path.join(distPath, 'esm', 'package.json');
      expect(fs.existsSync(esmPackagePath)).toBe(true);
      const packageJson = JSON.parse(fs.readFileSync(esmPackagePath, 'utf8'));
      expect(packageJson.type).toBe('module');
    });

    it('should have index.js entry point', () => {
      const indexPath = path.join(distPath, 'esm', 'index.js');
      expect(fs.existsSync(indexPath)).toBe(true);
    });
  });

  describe('CJS Build', () => {
    it('should have package.json with type: commonjs', () => {
      const cjsPackagePath = path.join(distPath, 'cjs', 'package.json');
      expect(fs.existsSync(cjsPackagePath)).toBe(true);
      const packageJson = JSON.parse(fs.readFileSync(cjsPackagePath, 'utf8'));
      expect(packageJson.type).toBe('commonjs');
    });

    it('should have index.js entry point', () => {
      const indexPath = path.join(distPath, 'cjs', 'index.js');
      expect(fs.existsSync(indexPath)).toBe(true);
    });
  });

  describe('Types Build', () => {
    it('should have index.d.ts type definitions', () => {
      const typesPath = path.join(distPath, 'types', 'index.d.ts');
      expect(fs.existsSync(typesPath)).toBe(true);
    });
  });
});
