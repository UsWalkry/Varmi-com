import { google } from 'googleapis';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

// .env yükleme
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = resolve(__dirname, '../.env');
dotenv.config({ path: envPath });

async function createGoogleDriveFolder() {
  try {
    console.log('🚀 Creating Google Drive folder for Varmi images...');
    
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n').replace(/"/g, ''),
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });

    const drive = google.drive({ version: 'v3', auth });

    // Yeni folder oluştur
    const folderResponse = await drive.files.create({
      requestBody: {
        name: 'Varmi-Images',
        mimeType: 'application/vnd.google-apps.folder',
      },
    });

    const folderId = folderResponse.data.id;
    console.log('✅ Folder created with ID:', folderId);

    // Folder'ı public yap
    await drive.permissions.create({
      fileId: folderId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    console.log('✅ Folder made public');
    console.log('🔗 Folder URL:', `https://drive.google.com/drive/folders/${folderId}`);
    console.log('📝 Update .env with: GOOGLE_DRIVE_FOLDER_ID=' + folderId);

    return folderId;
  } catch (error) {
    console.error('❌ Error creating folder:', error);
  }
}

createGoogleDriveFolder();