import "dotenv/config";
// Tests always run against the dedicated test database, never the dev one.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "postgresql://bekusegar:bekusegar_dev@localhost:5432/bekusegar_test";
process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-123456";
