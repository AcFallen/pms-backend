import { diskStorage } from 'multer';
import { extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';

// Tipos de archivos permitidos para logos
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB

/**
 * Genera un nombre único para el archivo
 */
export const editFileName = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, filename: string) => void,
) => {
  const fileExtName = extname(file.originalname);
  const randomName = Array(32)
    .fill(null)
    .map(() => Math.round(Math.random() * 16).toString(16))
    .join('');
  callback(null, `logo-${Date.now()}-${randomName}${fileExtName}`);
};

/**
 * Filtro para validar tipos de archivo
 */
export const imageFileFilter = (
  req: Request,
  file: Express.Multer.File,
  callback: (error: Error | null, acceptFile: boolean) => void,
) => {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return callback(
      new BadRequestException(
        `Tipo de archivo no permitido. Solo se permiten: ${ALLOWED_MIME_TYPES.join(', ')}`,
      ),
      false,
    );
  }
  callback(null, true);
};

/**
 * Configuración de Multer para almacenamiento en disco
 */
export const multerConfig = {
  storage: diskStorage({
    destination: './uploads/logos', // Carpeta donde se guardarán los logos
    filename: editFileName,
  }),
  fileFilter: imageFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
};

/**
 * Configuración de Multer para almacenamiento en memoria (para subir a S3/Cloud)
 */
export const multerMemoryConfig = {
  storage: 'memory' as any,
  fileFilter: imageFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
};
