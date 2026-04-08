import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'leaseiq.db');

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      passwordHash TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      plan TEXT NOT NULL DEFAULT 'free',
      stripeCustomerId TEXT,
      stripeSubscriptionId TEXT,
      subscriptionStatus TEXT,
      onboardingStep INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS leases (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      fileName TEXT NOT NULL,
      fileSize INTEGER NOT NULL,
      uploadedAt TEXT NOT NULL DEFAULT (datetime('now')),
      processedAt TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      extractedData TEXT,
      originalText TEXT,
      propertyAddress TEXT,
      tenantName TEXT,
      expirationDate TEXT,
      monthlyRent REAL,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      leaseId TEXT NOT NULL,
      userId TEXT NOT NULL,
      alertType TEXT NOT NULL,
      triggerDate TEXT NOT NULL,
      acknowledgedAt TEXT,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (leaseId) REFERENCES leases(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS lease_versions (
      id TEXT PRIMARY KEY,
      leaseId TEXT NOT NULL,
      userId TEXT NOT NULL,
      version INTEGER NOT NULL,
      extractedData TEXT,
      changeDescription TEXT NOT NULL,
      changedBy TEXT NOT NULL,
      createdAt TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (leaseId) REFERENCES leases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id TEXT PRIMARY KEY,
      accountId TEXT NOT NULL,
      userId TEXT,
      role TEXT NOT NULL DEFAULT 'viewer',
      invitedEmail TEXT NOT NULL,
      inviteToken TEXT UNIQUE,
      invitedAt TEXT NOT NULL DEFAULT (datetime('now')),
      acceptedAt TEXT,
      FOREIGN KEY (accountId) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_leases_userId ON leases(userId);
    CREATE INDEX IF NOT EXISTS idx_alerts_userId ON alerts(userId);
    CREATE INDEX IF NOT EXISTS idx_alerts_leaseId ON alerts(leaseId);
    CREATE INDEX IF NOT EXISTS idx_lease_versions_leaseId ON lease_versions(leaseId);
    CREATE INDEX IF NOT EXISTS idx_team_members_accountId ON team_members(accountId);
  `);

  // Migrate existing users table — add new columns if they don't exist
  const userCols = (db.prepare("PRAGMA table_info(users)").all() as { name: string }[]).map(c => c.name);
  if (!userCols.includes('plan')) db.exec("ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'");
  if (!userCols.includes('stripeCustomerId')) db.exec("ALTER TABLE users ADD COLUMN stripeCustomerId TEXT");
  if (!userCols.includes('stripeSubscriptionId')) db.exec("ALTER TABLE users ADD COLUMN stripeSubscriptionId TEXT");
  if (!userCols.includes('subscriptionStatus')) db.exec("ALTER TABLE users ADD COLUMN subscriptionStatus TEXT");
  if (!userCols.includes('onboardingStep')) db.exec("ALTER TABLE users ADD COLUMN onboardingStep INTEGER NOT NULL DEFAULT 0");

  // Migrate leases table — add risk score columns
  const leaseCols = (db.prepare("PRAGMA table_info(leases)").all() as { name: string }[]).map(c => c.name);
  if (!leaseCols.includes('riskScore')) db.exec('ALTER TABLE leases ADD COLUMN riskScore INTEGER');
  if (!leaseCols.includes('riskFactors')) db.exec('ALTER TABLE leases ADD COLUMN riskFactors TEXT');
  if (!leaseCols.includes('aiAnalysis')) db.exec('ALTER TABLE leases ADD COLUMN aiAnalysis TEXT');
}

export default getDb;
