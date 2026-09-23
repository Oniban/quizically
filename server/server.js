import 'dotenv/config';
import { createApp } from './app.js';
import connectDB from './config/db.js';
import Attempt from './models/Attempt.js';

if (!process.env.MONGO_URI || !process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  throw new Error('Set MONGO_URI and a JWT_SECRET of at least 32 characters before starting the server.');
}
if (process.env.NODE_ENV === 'production' && !process.env.CLIENT_URL) {
  throw new Error('Set CLIENT_URL to the frontend origin in production.');
}

await connectDB();
// The uniqueness constraint must exist before the API accepts submissions.
await Attempt.init();
const port = process.env.PORT || 5000;
createApp().listen(port, () => console.log(`Quizzically API listening on port ${port}`));
