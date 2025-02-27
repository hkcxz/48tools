const path = require('node:path');

/** @type { import('jest').Config } */
const config = {
  testEnvironment: 'node',
  testMatch: [
    '**/__tests__/**/*.(spec|test).(m|c)?ts(x)?',
    '**/test/**/*.(spec|test).(m|c)?ts(x)?',
    '**/?(*.)+(spec|test).(m|c)?ts(x)?'
  ],
  transform: {
    '^.+\\.(m|c)?ts?$': ['ts-jest', {
      tsconfig: path.join(__dirname, 'tsconfig.json'),
      useESM: true
    }]
  },
  moduleFileExtensions: ['ts', 'tsx', 'mts', 'cts', 'js', 'jsx', 'mjs', 'cjs', 'json'],
  collectCoverage: false,
  preset: 'ts-jest/presets/default-esm'
};

module.exports = config;