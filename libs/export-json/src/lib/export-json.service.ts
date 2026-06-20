import { ExportedFile, ExportedFileSchema } from '@qgp/question-schema';

export class ExportJsonService {
  /**
   * Serializes question blocks to JSON string while enforcing validations VR-1 through VR-4.
   * Throws an error with "Invalid question structure detected" if any rule fails.
   */
  serializeExport(payload: any, prettify = true): string {
    try {
      // VR-1, VR-2, VR-3 validation checks
      ExportedFileSchema.parse(payload);
      return JSON.stringify(payload, null, prettify ? 2 : 0);
    } catch (error) {
      // VR-4 requirement
      throw new Error('Invalid question structure detected');
    }
  }

  /**
   * Parses and validates raw JSON string back into complying export structure.
   */
  deserializeExport(jsonString: string): ExportedFile {
    try {
      const rawData = JSON.parse(jsonString);
      return ExportedFileSchema.parse(rawData);
    } catch (error) {
      throw new Error('Invalid question structure detected');
    }
  }
}

export const exportJsonService = new ExportJsonService();
