/**
 * StorageDriver — Abstract interface for media storage backends.
 *
 * Every concrete driver (Local, S3, R2, etc.) must implement this interface.
 * The MediaService delegates all I/O to the active driver returned by
 * StorageDriverFactory.get(), so it never needs to know which backend is used.
 */
export interface StorageDriver {
  /**
   * Upload a file buffer and return its public URL.
   *
   * @param buffer   - Raw file content as a Node.js Buffer
   * @param filename - The final, sanitized filename (e.g. "photo-a1b2.jpg")
   * @param mimeType - MIME type of the file (e.g. "image/jpeg")
   * @returns The publicly-accessible URL for the uploaded file
   */
  upload(buffer: Buffer, filename: string, mimeType: string): Promise<string>

  /**
   * Delete a file from storage.
   *
   * @param fileUrl - The public URL or storage key that was previously returned
   *                  by upload(). Each driver resolves this to its own key format.
   */
  delete(fileUrl: string): Promise<void>
}
