import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

class LocalFileService {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads', 'images');
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
      console.log('✅ Created uploads directory:', this.uploadsDir);
    }
  }

  async uploadImage(base64Image: string, fileName: string, offerId: string): Promise<string> {
    try {
      console.log(`📸 Saving ${fileName} locally for offer ${offerId}`);

      // Base64'ü buffer'a çevir
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');
      
      // MIME type'ı tespit et
      const mimeType = base64Image.match(/data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+).*,.*/)![1];
      const extension = mimeType.split('/')[1];
      
      // Unique filename oluştur
      const uniqueFileName = `${offerId}_${Date.now()}_${fileName}.${extension}`;
      const filePath = path.join(this.uploadsDir, uniqueFileName);
      
      // Dosyayı kaydet
      fs.writeFileSync(filePath, buffer);
      
      // Relative URL döndür (Vite proxy ile çalışacak)
      const publicUrl = `/uploads/images/${uniqueFileName}`;
      console.log(`✅ Image saved: ${publicUrl}`);
      
      return publicUrl;
    } catch (error) {
      console.error('❌ Local file upload error:', error);
      throw new Error('Image upload failed');
    }
  }

  async uploadImages(base64Images: string[], offerId?: string): Promise<string[]> {
    const uploadPromises = base64Images.map((base64Image, index) => {
      const fileName = `image_${index}`;
      const useOfferId = offerId || Date.now().toString();
      return this.uploadImage(base64Image, fileName, useOfferId);
    });

    return Promise.all(uploadPromises);
  }

  async deleteImage(fileName: string): Promise<boolean> {
    try {
      const filePath = path.join(this.uploadsDir, fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted image: ${fileName}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Delete error:', error);
      return false;
    }
  }
}

// Singleton instance
export const localFileService = new LocalFileService();
export default LocalFileService;