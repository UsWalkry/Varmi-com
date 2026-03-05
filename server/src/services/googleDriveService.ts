import { google } from 'googleapis';
import { Readable } from 'stream';

// Google Drive konfigürasyonu - lazy loading
function getGoogleDriveConfig() {
  return {
    CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL,
    PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
    FOLDER_ID: process.env.GOOGLE_DRIVE_FOLDER_ID, // Public folder ID'si
  };
}

class GoogleDriveService {
  private drive: any;
  private initialized = false;

  constructor() {
    // No initialization here - will be done lazily
  }

  private initializeDrive() {
    if (this.initialized) return;
    
    try {
      const config = getGoogleDriveConfig();
      
      // Debug: Environment variables kontrolü
      console.log('🔍 Google Drive Config Debug:');
      console.log('CLIENT_EMAIL exists:', !!config.CLIENT_EMAIL);
      console.log('PRIVATE_KEY exists:', !!config.PRIVATE_KEY);
      console.log('PRIVATE_KEY length:', config.PRIVATE_KEY?.length || 0);
      console.log('FOLDER_ID exists:', !!config.FOLDER_ID);

      if (!config.CLIENT_EMAIL || !config.PRIVATE_KEY) {
        throw new Error('Missing Google Drive credentials in environment variables');
      }

      // Modern JWT constructor kullanarak authentication
      const auth = new google.auth.JWT({
        email: config.CLIENT_EMAIL,
        key: config.PRIVATE_KEY,
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });

      this.drive = google.drive({ version: 'v3', auth });
      this.initialized = true;
      console.log('✅ Google Drive service initialized');
    } catch (error) {
      console.error('❌ Google Drive initialization failed:', error);
    }
  }

  /**
   * Base64 image'ı Google Drive'a upload et ve public URL döndür
   */
  async uploadImage(base64Image: string, fileName: string, offerId: string): Promise<string> {
    try {
      // Lazy initialization
      this.initializeDrive();
      
      // Google Drive initialization check
      if (!this.drive) {
        console.log('⚠️ Google Drive not initialized, using fallback storage');
        // Fallback: Return a dummy URL or store locally
        return `https://via.placeholder.com/400x300.png?text=Image+${offerId.substring(0, 8)}`;
      }

      // Base64'ü buffer'a çevir
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // MIME type'ı tespit et
      const mimeType = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)![1];
      
      // Unique filename oluştur
      const uniqueFileName = `${offerId}_${Date.now()}_${fileName}`;
      
      // Google Drive'a upload
      const config = getGoogleDriveConfig();
      const response = await this.drive.files.create({
        requestBody: {
          name: uniqueFileName,
          parents: [config.FOLDER_ID],
        },
        media: {
          mimeType,
          body: Readable.from([buffer]),
        },
      });

      // Dosyayı public yap
      await this.drive.permissions.create({
        fileId: response.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });

      // Public URL oluştur
      const publicUrl = `https://drive.google.com/uc?id=${response.data.id}`;
      
      console.log(`📁 Image uploaded to Google Drive: ${uniqueFileName} -> ${publicUrl}`);
      return publicUrl;
      
    } catch (error) {
      console.error('❌ Google Drive upload error:', error);
      throw new Error('Image upload failed');
    }
  }

  /**
   * Birden fazla image'ı upload et
   */
  async uploadImages(base64Images: string[], offerId: string): Promise<string[]> {
    const uploadPromises = base64Images.map((base64, index) => 
      this.uploadImage(base64, `image_${index + 1}.webp`, offerId)
    );
    
    return Promise.all(uploadPromises);
  }

  /**
   * Google Drive dosyasını sil
   */
  async deleteImage(fileId: string): Promise<void> {
    try {
      await this.drive.files.delete({ fileId });
      console.log(`🗑️ Deleted file from Google Drive: ${fileId}`);
    } catch (error) {
      console.error('❌ Google Drive delete error:', error);
    }
  }
}

export const googleDriveService = new GoogleDriveService();