import express from 'express';

const app = express();

app.use(express.json());

// Routes và middleware sẽ được mount dần ở các Step 2–5+
// Composition Root sẽ được hoàn thiện ở Step 5

export default app;
