import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';
import { SeederOptions } from 'typeorm-extension';

config();

const isProduction = process.env.NODE_ENV === 'production';

export const dataSourceOptions: DataSourceOptions & SeederOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5435'),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_DATABASE || 'pms_db',
  entities: [isProduction ? 'dist/**/*.entity.js' : 'src/**/*.entity.ts'],
  migrations: [isProduction ? 'dist/database/migrations/*.js' : 'src/database/migrations/*.ts'],
  seeds: [isProduction ? 'dist/database/seeds/**/*.js' : 'src/database/seeds/**/*.ts'],
  factories: [isProduction ? 'dist/database/factories/**/*.js' : 'src/database/factories/**/*.ts'],
  synchronize: false, // Disable in production
};

const dataSource = new DataSource(dataSourceOptions);

export default dataSource;
