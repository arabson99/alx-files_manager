import express from 'express';
import dotenv from 'dotenv';
import router from './routes/index';

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(router);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});

export default app;
