export default {
  displayName: 'ai-generator',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  coverageDirectory: '../../coverage/libs/ai-generator',
  moduleNameMapper: {
    '^@qgp/database$': '<rootDir>/../../libs/database/src/index.ts',
    '^@qgp/auth$': '<rootDir>/../../libs/auth/src/index.ts',
    '^@qgp/question-schema$': '<rootDir>/../../libs/question-schema/src/index.ts',
    '^@qgp/ai-generator$': '<rootDir>/src/index.ts',
  }
};
