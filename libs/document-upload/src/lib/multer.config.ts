import { BadRequestException } from '@nestjs/common';
import * as multer from 'multer';

/** 20 MB hard limit enforced at the Multer/Express level */
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;

export const multerPdfOptions = {
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
  fileFilter: (_req: any, file: any, callback: any) => {
    if (
      file.mimetype === 'application/pdf' ||
      file.originalname.toLowerCase().endsWith('.pdf')
    ) {
      callback(null, true);
    } else {
      callback(
        new BadRequestException(
          `Invalid file type "${file.mimetype}". Only PDF files (.pdf) are accepted.`
        ),
        false
      );
    }
  },
};
