export default {
  displayName: 'pdf-processor',
  testEnvironment: 'node',
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  coverageDirectory: '../../coverage/libs/pdf-processor',
  moduleNameMapper: {
    '^@qgp/database$': '<rootDir>/../../libs/database/src/index.ts',
    '^@qgp/auth$': '<rootDir>/../../libs/auth/src/index.ts',
    '^@qgp/ai-generator$': '<rootDir>/../../libs/ai-generator/src/index.ts',
    '^@qgp/question-schema$': '<rootDir>/../../libs/question-schema/src/index.ts',
    '^@qgp/role-permission$': '<rootDir>/../../libs/role-permission/src/index.ts',
    '^@qgp/document-upload$': '<rootDir>/../../libs/document-upload/src/index.ts',
    '^@qgp/pdf-processor$': '<rootDir>/src/index.ts'
  }
};
