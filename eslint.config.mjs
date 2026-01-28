import expoConfig from 'eslint-config-expo/flat.js'
import prettier from 'eslint-plugin-prettier/recommended'

export default [
  ...expoConfig,
  prettier,
  {
    ignores: [
      'node_modules/',
      'dist/',
      'web-build/',
      '.expo/',
      'ios/',
      'android/',
      '*.xcodeproj/',
      '*.xcworkspace/',
      'coverage/',
    ],
  },
]
