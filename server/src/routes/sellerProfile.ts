import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.js';
import { query } from '../database.js';
import { sendSellerProfileApprovedEmail, sendSellerProfileRejectedEmail } from '../services/emailService.js';

const router = express.Router();

// Kullanıcının kendi satıcı profilini getir
router.get('/my-profile', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    console.log('🔍 Getting seller profile for user:', userId);

    const profiles = await query(
      `SELECT 
        sp.*,
        u.firstName,
        u.lastName,
        u.email,
        u.is_verified_seller
      FROM seller_profiles sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.user_id = ?`,
      [userId]
    ) as any[];

    if (profiles.length === 0) {
      return res.json({ success: true, data: null });
    }

    const profile = profiles[0];
    
    // Parse JSON fields
    if (profile.documents) {
      try {
        profile.documents = JSON.parse(profile.documents);
      } catch (e) {
        profile.documents = [];
      }
    }

    res.json({ success: true, data: profile });
  } catch (error) {
    console.error('❌ Error fetching seller profile:', error);
    res.status(500).json({ success: false, error: 'Satıcı profili getirilemedi' });
  }
});

// Herhangi bir satıcı profilini getir (public - sadece onaylılar)
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    console.log('🔍 Getting public seller profile for user:', userId);

    const profiles = await query(
      `SELECT 
        sp.id,
        sp.user_id,
        sp.store_name,
        sp.store_description,
        sp.store_logo_url,
        sp.business_type,
        sp.business_city,
        sp.total_offers,
        sp.accepted_offers,
        sp.completed_orders,
        sp.average_rating,
        sp.response_time_hours,
        sp.created_at,
        u.firstName,
        u.lastName
      FROM seller_profiles sp
      JOIN users u ON sp.user_id = u.id
      WHERE sp.user_id = ? AND sp.approval_status = 'approved'`,
      [userId]
    ) as any[];

    if (profiles.length === 0) {
      return res.status(404).json({ success: false, error: 'Satıcı profili bulunamadı' });
    }

    res.json({ success: true, profile: profiles[0] });
  } catch (error) {
    console.error('❌ Error fetching public seller profile:', error);
    res.status(500).json({ success: false, error: 'Satıcı profili getirilemedi' });
  }
});

// Satıcı profili oluştur veya güncelle
router.post('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const {
      store_name,
      store_description,
      store_logo_url,
      business_type,
      tax_office,
      tax_number,
      company_name,
      trade_registry_number,
      mersis_number,
      business_phone,
      business_email,
      business_address,
      business_city,
      business_district,
      business_postal_code,
      bank_name,
      iban,
      account_holder_name,
      documents
    } = req.body;

    console.log('📝 Creating/updating seller profile for user:', userId);

    // Validasyon
    if (!store_name || !business_type) {
      return res.status(400).json({ 
        success: false, 
        error: 'Mağaza adı ve işletme tipi zorunludur' 
      });
    }

    // Şirket ise vergi numarası zorunlu
    if (business_type === 'company' && !tax_number) {
      return res.status(400).json({ 
        success: false, 
        error: 'Şirket için vergi numarası zorunludur' 
      });
    }

    // undefined değerlerini null'a çevir (MySQL2 undefined kabul etmiyor)
    const safeParams = {
      store_name: store_name || null,
      store_description: store_description || null,
      store_logo_url: store_logo_url || null,
      business_type: business_type || null,
      tax_office: tax_office || null,
      tax_number: tax_number || null,
      company_name: company_name || null,
      trade_registry_number: trade_registry_number || null,
      mersis_number: mersis_number || null,
      business_phone: business_phone || null,
      business_email: business_email || null,
      business_address: business_address || null,
      business_city: business_city || null,
      business_district: business_district || null,
      business_postal_code: business_postal_code || null,
      bank_name: bank_name || null,
      iban: iban || null,
      account_holder_name: account_holder_name || null
    };

    // Mevcut profil kontrolü
    const existingProfiles = await query(
      'SELECT id, approval_status FROM seller_profiles WHERE user_id = ?',
      [userId]
    ) as any[];

    const documentsJson = documents ? JSON.stringify(documents) : null;
    const profileId = existingProfiles.length > 0 ? existingProfiles[0].id : uuidv4();
    const isResubmission = existingProfiles.length > 0;

    if (isResubmission) {
      // Güncelleme - tekrar onaya gönder
      await query(
        `UPDATE seller_profiles SET
          store_name = ?,
          store_description = ?,
          store_logo_url = ?,
          business_type = ?,
          tax_office = ?,
          tax_number = ?,
          company_name = ?,
          trade_registry_number = ?,
          mersis_number = ?,
          business_phone = ?,
          business_email = ?,
          business_address = ?,
          business_city = ?,
          business_district = ?,
          business_postal_code = ?,
          bank_name = ?,
          iban = ?,
          account_holder_name = ?,
          documents = ?,
          approval_status = 'pending',
          rejection_reason = NULL,
          updated_at = NOW()
        WHERE id = ?`,
        [
          safeParams.store_name, safeParams.store_description, safeParams.store_logo_url, safeParams.business_type,
          safeParams.tax_office, safeParams.tax_number, safeParams.company_name, safeParams.trade_registry_number, safeParams.mersis_number,
          safeParams.business_phone, safeParams.business_email, safeParams.business_address, safeParams.business_city,
          safeParams.business_district, safeParams.business_postal_code, safeParams.bank_name, safeParams.iban, safeParams.account_holder_name,
          documentsJson, profileId
        ]
      );

      // Audit log
      await query(
        `INSERT INTO seller_profile_approval_audit 
        (seller_profile_id, action, performed_by, reason, created_at)
        VALUES (?, 'resubmitted', ?, 'Profile updated and resubmitted for approval', NOW())`,
        [profileId, userId]
      );

      // Admin bildirimi
      await query(
        `INSERT INTO admin_notifications 
        (id, type, title, message, seller_profile_id, is_read, created_at)
        VALUES (?, 'seller_profile_resubmitted', ?, ?, ?, 0, NOW())`,
        [
          uuidv4(),
          'Satıcı Profili Yeniden Gönderildi',
          `${safeParams.store_name} mağazası profili güncellenerek yeniden onaya gönderildi`,
          profileId
        ]
      );

      console.log('✅ Seller profile updated and resubmitted for approval:', profileId);
    } else {
      // Yeni profil oluştur
      await query(
        `INSERT INTO seller_profiles (
          id, user_id, store_name, store_description, store_logo_url,
          business_type, tax_office, tax_number, company_name, trade_registry_number,
          mersis_number, business_phone, business_email, business_address,
          business_city, business_district, business_postal_code,
          bank_name, iban, account_holder_name, documents,
          approval_status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
        [
          profileId, userId, safeParams.store_name, safeParams.store_description, safeParams.store_logo_url,
          safeParams.business_type, safeParams.tax_office, safeParams.tax_number, safeParams.company_name, safeParams.trade_registry_number,
          safeParams.mersis_number, safeParams.business_phone, safeParams.business_email, safeParams.business_address,
          safeParams.business_city, safeParams.business_district, safeParams.business_postal_code,
          safeParams.bank_name, safeParams.iban, safeParams.account_holder_name, documentsJson
        ]
      );

      // Audit log
      await query(
        `INSERT INTO seller_profile_approval_audit 
        (seller_profile_id, action, performed_by, reason, created_at)
        VALUES (?, 'submitted', ?, 'New seller profile submitted for approval', NOW())`,
        [profileId, userId]
      );

      // Admin bildirimi
      await query(
        `INSERT INTO admin_notifications 
        (id, type, title, message, seller_profile_id, is_read, created_at)
        VALUES (?, 'seller_profile_pending', ?, ?, ?, 0, NOW())`,
        [
          uuidv4(),
          'Yeni Satıcı Profili',
          `${safeParams.store_name} mağazası için yeni satıcı profili onay bekliyor`,
          profileId
        ]
      );

      console.log('✅ New seller profile created:', profileId);
    }

    res.json({ 
      success: true, 
      message: isResubmission 
        ? 'Satıcı profiliniz güncellendi ve onay için gönderildi' 
        : 'Satıcı profiliniz oluşturuldu ve onay bekliyor',
      data: { id: profileId }
    });
  } catch (error) {
    console.error('❌ Error creating/updating seller profile:', error);
    res.status(500).json({ success: false, error: 'Satıcı profili kaydedilemedi' });
  }
});

// Satıcı profilini sil
router.delete('/profile', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;
    console.log('🗑️ Deleting seller profile for user:', userId);

    await query('DELETE FROM seller_profiles WHERE user_id = ?', [userId]);
    await query('UPDATE users SET seller_profile_id = NULL, is_verified_seller = 0 WHERE id = ?', [userId]);

    res.json({ success: true, message: 'Satıcı profili silindi' });
  } catch (error) {
    console.error('❌ Error deleting seller profile:', error);
    res.status(500).json({ success: false, error: 'Satıcı profili silinemedi' });
  }
});

// Satıcı profili onay durumunu kontrol et (teklif vermeden önce)
router.get('/can-make-offer', authenticateToken, async (req, res) => {
  try {
    const userId = (req as any).userId;

    const users = await query(
      'SELECT is_verified_seller FROM users WHERE id = ?',
      [userId]
    ) as any[];

    if (users.length === 0) {
      return res.status(404).json({ success: false, error: 'Kullanıcı bulunamadı' });
    }

    const canMakeOffer = users[0].is_verified_seller === 1;

    res.json({ 
      success: true, 
      canMakeOffer,
      message: canMakeOffer 
        ? 'Teklif verebilirsiniz' 
        : 'Teklif verebilmek için satıcı profilinizi oluşturup onay almanız gerekmektedir'
    });
  } catch (error) {
    console.error('❌ Error checking seller status:', error);
    res.status(500).json({ success: false, error: 'Satıcı durumu kontrol edilemedi' });
  }
});

export default router;
