import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: process.env.NODE_ENV === 'production' ? 20 : 10,
      min: process.env.NODE_ENV === 'production' ? 5 : 0,
      acquire: 30000,
      idle: 10000,
      acquireTimeout: 60000,
      timeout: 60000
    },
    dialectOptions: {
      ssl: process.env.DB_SSL === 'true' ? {
        rejectUnauthorized: process.env.NODE_ENV === 'production'
      } : false,
      connectTimeout: 60000
    },
    define: {
      timestamps: false,
      freezeTableName: true
    },
    retry: {
      match: [
        /ETIMEDOUT/,
        /EHOSTUNREACH/,
        /ECONNRESET/,
        /ECONNREFUSED/,
        /SequelizeConnectionError/,
        /SequelizeConnectionRefusedError/,
        /SequelizeHostNotFoundError/,
        /SequelizeHostNotReachableError/,
        /SequelizeInvalidConnectionError/,
        /SequelizeConnectionTimedOutError/
      ],
      max: 3
    }
  }
);

export default sequelize;