import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { initDatabase } from './db/database.js';
import { seedDatabase } from './db/seed.js';

import authRouter from './routes/auth.routes.js';
import applicationRouter from './routes/application.routes.js';
import complianceRouter from './routes/compliance.routes.js';
import documentRouter from './routes/document.routes.js';
import evcRouter from './routes/evc.routes.js';
import alertRouter from './routes/alert.routes.js';
import analyticsRouter from './routes/analytics.routes.js';
import systemRouter from './routes/system.routes.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Upload directory static serve
const UPLOADS_DIR = path.resolve(process.cwd(), 'server', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
app.use('/uploads', express.static(UPLOADS_DIR));

// Initialize Database & Seed
try {
  initDatabase();
  seedDatabase(false);
} catch (err) {
  console.error('Error during database initialization/seed:', err);
}

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/applications', applicationRouter);
app.use('/api/compliance', complianceRouter);
app.use('/api/documents', documentRouter);
app.use('/api/evc', evcRouter);
app.use('/api/alerts', alertRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/system', systemRouter);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    service: 'AICTE Approval Workflow Automation & Compliance System',
    version: 'SIH-2026-v1.0',
    timestamp: new Date().toISOString(),
  });
});

// Centralized error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled Server Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

app.listen(PORT, () => {
  console.log(`================================================================`);
  console.log(`  AICTE APPROVAL WORKFLOW & COMPLIANCE AUTOMATION ENGINE`);
  console.log(`  SIH 2026 Prototype Server listening on http://localhost:${PORT}`);
  console.log(`================================================================`);
});

export default app;
