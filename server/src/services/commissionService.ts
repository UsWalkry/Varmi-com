/**
 * Komisyon Sistemi Service
 * 
 * Özellikleri:
 * - Sipariş oluşturulurken komisyon oranlarını hesapla
 * - Kullanıcı komisyon bakiyesi sorgulama
 * - Komisyon geçmişi
 * - Çekim talepleri
 * - Admin onay/red işlemleri
 */

import { query } from '../database.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Site ayarlarından komisyon oranlarını getir
 */
export async function getCommissionRates() {
  try {
    const settings: any = await query(
      `SELECT setting_key, setting_value 
       FROM site_settings 
       WHERE setting_key IN ('commission_rate_listing_owner', 'commission_rate_seller', 'commission_enabled')`
    );

    const rates = {
      listingOwnerRate: 5.0,
      sellerRate: 5.0,
      enabled: true
    };

    // settings is an array, not [rows, fields]
    if (Array.isArray(settings) && settings.length > 0) {
      settings.forEach((setting: any) => {
        if (setting.setting_key === 'commission_rate_listing_owner') {
          rates.listingOwnerRate = parseFloat(setting.setting_value);
        } else if (setting.setting_key === 'commission_rate_seller') {
          rates.sellerRate = parseFloat(setting.setting_value);
        } else if (setting.setting_key === 'commission_enabled') {
          rates.enabled = setting.setting_value === 'true';
        }
      });
    }

    console.log('💰 Commission rates loaded:', rates);
    return rates;
  } catch (error) {
    console.error('❌ Error fetching commission rates:', error);
    // Fallback to defaults
    return { listingOwnerRate: 5.0, sellerRate: 5.0, enabled: true };
  }
}

/**
 * Sipariş için komisyon tutarlarını hesapla
 */
export async function calculateCommissions(orderPrice: number, buyerId: string, sellerId: string, listingOwnerId: string) {
  const rates = await getCommissionRates();

  if (!rates.enabled) {
    return {
      commissionToListingOwner: 0,
      commissionToSeller: 0,
      listingOwnerRate: 0,
      sellerRate: 0
    };
  }

  // İlan sahibi = alıcı ise, ilan sahibi komisyonu yok
  const isListingOwnerBuyer = buyerId === listingOwnerId;
  
  // Satıcı = alıcı ise, satıcı komisyonu yok (kendi ilanına kendi teklif vermiş)
  const isSellerBuyer = sellerId === buyerId;

  return {
    commissionToListingOwner: isListingOwnerBuyer ? 0 : (orderPrice * rates.listingOwnerRate / 100),
    commissionToSeller: isSellerBuyer ? 0 : (orderPrice * rates.sellerRate / 100),
    listingOwnerRate: isListingOwnerBuyer ? 0 : rates.listingOwnerRate,
    sellerRate: isSellerBuyer ? 0 : rates.sellerRate
  };
}

/**
 * Kullanıcının komisyon bakiyesini getir
 */
export async function getUserCommissionBalance(userId: string) {
  try {
    console.log('🔍 getUserCommissionBalance called for userId:', userId);
    
    const users = await query(
      `SELECT 
        commission_balance,
        total_commission_earned,
        total_commission_withdrawn
       FROM users 
       WHERE id = ?`,
      [userId]
    ) as any[];

    console.log('📊 Query result (raw):', users);
    console.log('📊 Query result type:', typeof users, 'Array?', Array.isArray(users));
    console.log('📊 Query result length:', users ? users.length : 'undefined');

    if (!Array.isArray(users) || users.length === 0) {
      throw new Error('Kullanıcı bulunamadı');
    }

    console.log('📊 First user:', users[0]);

    const balanceData = {
      balance: parseFloat(users[0].commission_balance || 0),
      totalEarned: parseFloat(users[0].total_commission_earned || 0),
      totalWithdrawn: parseFloat(users[0].total_commission_withdrawn || 0)
    };

    console.log('💰 Returning balance:', balanceData);

    return balanceData;
  } catch (error) {
    console.error('❌ Error fetching commission balance:', error);
    throw error;
  }
}

/**
 * Kullanıcının komisyon işlem geçmişini getir
 */
export async function getUserCommissionHistory(userId: string, limit = 50, offset = 0) {
  try {
    const transactions = await query(
      `SELECT 
        ct.id,
        ct.order_id,
        ct.transaction_type,
        ct.amount,
        ct.description,
        ct.created_at,
        o.status as order_status,
        l.title as listing_title
       FROM commission_transactions ct
       JOIN orders o ON ct.order_id = o.id
       JOIN listings l ON o.listing_id = l.id
       WHERE ct.user_id = ?
       ORDER BY ct.created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) as total FROM commission_transactions WHERE user_id = ?`,
      [userId]
    ) as any[];

    return {
      transactions,
      total: countResult[0].total,
      limit,
      offset
    };
  } catch (error) {
    console.error('❌ Error fetching commission history:', error);
    throw error;
  }
}

/**
 * Komisyon çekim talebi oluştur
 */
export async function createWithdrawalRequest(userId: string, amount: number, bankInfo: any) {
  try {
    // Kullanıcı bakiyesini kontrol et
    const balance = await getUserCommissionBalance(userId);

    if (balance.balance < amount) {
      throw new Error('Yetersiz bakiye');
    }

    // Minimum/maximum çekim tutarını kontrol et
    const settings = await query(
      `SELECT setting_key, setting_value 
       FROM site_settings 
       WHERE setting_key IN ('commission_min_withdrawal', 'commission_max_withdrawal')`
    ) as any[];

    let minAmount = 100;
    let maxAmount = 10000;

    settings.forEach((setting: any) => {
      if (setting.setting_key === 'commission_min_withdrawal') {
        minAmount = parseFloat(setting.setting_value);
      } else if (setting.setting_key === 'commission_max_withdrawal') {
        maxAmount = parseFloat(setting.setting_value);
      }
    });

    if (amount < minAmount) {
      throw new Error(`Minimum çekim tutarı ${minAmount} TL'dir`);
    }

    if (amount > maxAmount) {
      throw new Error(`Maksimum çekim tutarı ${maxAmount} TL'dir`);
    }

    // Bekleyen talep var mı kontrol et
    const pendingRequests = await query(
      `SELECT id FROM commission_withdrawal_requests 
       WHERE user_id = ? AND status = 'pending'`,
      [userId]
    ) as any[];

    if (pendingRequests.length > 0) {
      throw new Error('Zaten bekleyen bir çekim talebiniz var');
    }

    // Talep oluştur
    const requestId = uuidv4();
    await query(
      `INSERT INTO commission_withdrawal_requests 
       (id, user_id, amount, bank_name, iban, account_holder_name, status, requested_at)
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [
        requestId,
        userId,
        amount,
        bankInfo.bankName,
        bankInfo.iban,
        bankInfo.accountHolderName
      ]
    );

    console.log('💰 Withdrawal request created:', requestId);

    return {
      requestId,
      amount,
      status: 'pending',
      requestedAt: new Date()
    };
  } catch (error) {
    console.error('❌ Error creating withdrawal request:', error);
    throw error;
  }
}

/**
 * Kullanıcının çekim taleplerini getir
 */
export async function getUserWithdrawalRequests(userId: string) {
  try {
    const requests = await query(
      `SELECT 
        id,
        amount,
        status,
        bank_name,
        iban,
        account_holder_name,
        requested_at,
        processed_at,
        rejection_reason,
        transfer_reference,
        transfer_date
       FROM commission_withdrawal_requests
       WHERE user_id = ?
       ORDER BY requested_at DESC`,
      [userId]
    );

    return requests;
  } catch (error) {
    console.error('❌ Error fetching withdrawal requests:', error);
    throw error;
  }
}

/**
 * ADMIN: Tüm çekim taleplerini getir
 */
export async function getAllWithdrawalRequests(status: string | null = null, limit = 50, offset = 0) {
  try {
    let sql = `
      SELECT 
        cwr.id,
        cwr.user_id,
        cwr.amount,
        cwr.status,
        cwr.bank_name,
        cwr.iban,
        cwr.account_holder_name,
        cwr.requested_at,
        cwr.processed_at,
        cwr.rejection_reason,
        cwr.admin_notes,
        cwr.transfer_reference,
        cwr.transfer_date,
        u.email as user_email,
        CONCAT(u.firstName, ' ', u.lastName) as user_name,
        u.phone as user_phone
      FROM commission_withdrawal_requests cwr
      JOIN users u ON cwr.user_id = u.id
    `;

    const params = [];

    if (status) {
      sql += ` WHERE cwr.status = ?`;
      params.push(status);
    }

    sql += ` ORDER BY 
      CASE cwr.status 
        WHEN 'pending' THEN 1 
        WHEN 'approved' THEN 2 
        WHEN 'completed' THEN 3 
        WHEN 'rejected' THEN 4 
      END,
      cwr.requested_at DESC
      LIMIT ? OFFSET ?`;

    params.push(limit, offset);

    const requests = await query(sql, params) as any[];

    // Total count
    let countSql = `SELECT COUNT(*) as total FROM commission_withdrawal_requests`;
    const countParams: any[] = [];

    if (status) {
      countSql += ` WHERE status = ?`;
      countParams.push(status);
    }

    const countResult = await query(countSql, countParams) as any[];

    return {
      requests,
      total: countResult[0].total,
      limit,
      offset
    };
  } catch (error) {
    console.error('❌ Error fetching all withdrawal requests:', error);
    throw error;
  }
}

/**
 * ADMIN: Çekim talebini onayla
 */
export async function approveWithdrawalRequest(requestId: string, adminId: string, transferInfo: any) {
  try {
    // Talebi getir
    const requests = await query(
      `SELECT * FROM commission_withdrawal_requests WHERE id = ?`,
      [requestId]
    ) as any[];

    if (requests.length === 0) {
      throw new Error('Talep bulunamadı');
    }

    const request = requests[0];

    if (request.status !== 'pending') {
      throw new Error('Bu talep zaten işlenmiş');
    }

    // Kullanıcı bakiyesini kontrol et
    const balance = await getUserCommissionBalance(request.user_id);

    if (balance.balance < request.amount) {
      throw new Error('Kullanıcının yetersiz bakiyesi var');
    }

    // Talebi onayla ve completed yap (havale yapıldıysa)
    await query(
      `UPDATE commission_withdrawal_requests 
       SET 
         status = 'completed',
         processed_at = NOW(),
         processed_by = ?,
         transfer_reference = ?,
         transfer_date = ?,
         admin_notes = ?
       WHERE id = ?`,
      [
        adminId,
        transferInfo.transferReference,
        transferInfo.transferDate,
        transferInfo.adminNotes || null,
        requestId
      ]
    );

    // Kullanıcı bakiyesinden düş
    await query(
      `UPDATE users 
       SET 
         commission_balance = commission_balance - ?,
         total_commission_withdrawn = total_commission_withdrawn + ?
       WHERE id = ?`,
      [request.amount, request.amount, request.user_id]
    );

    console.log('✅ Withdrawal request approved and completed:', requestId);

    return { success: true, requestId };
  } catch (error) {
    console.error('❌ Error approving withdrawal request:', error);
    throw error;
  }
}

/**
 * ADMIN: Çekim talebini reddet
 */
export async function rejectWithdrawalRequest(requestId: string, adminId: string, rejectionReason: string) {
  try {
    const requests = await query(
      `SELECT * FROM commission_withdrawal_requests WHERE id = ?`,
      [requestId]
    ) as any[];

    if (requests.length === 0) {
      throw new Error('Talep bulunamadı');
    }

    if (requests[0].status !== 'pending') {
      throw new Error('Bu talep zaten işlenmiş');
    }

    await query(
      `UPDATE commission_withdrawal_requests 
       SET 
         status = 'rejected',
         processed_at = NOW(),
         processed_by = ?,
         rejection_reason = ?
       WHERE id = ?`,
      [adminId, rejectionReason, requestId]
    );

    console.log('❌ Withdrawal request rejected:', requestId);

    return { success: true, requestId };
  } catch (error) {
    console.error('❌ Error rejecting withdrawal request:', error);
    throw error;
  }
}

/**
 * ADMIN: Komisyon oranlarını güncelle
 */
export async function updateCommissionRates(adminId: string, listingOwnerRate: number, sellerRate: number) {
  try {
    await query(
      `UPDATE site_settings 
       SET setting_value = ?, updated_by = ?, updated_at = NOW()
       WHERE setting_key = 'commission_rate_listing_owner'`,
      [listingOwnerRate.toString(), adminId]
    );

    await query(
      `UPDATE site_settings 
       SET setting_value = ?, updated_by = ?, updated_at = NOW()
       WHERE setting_key = 'commission_rate_seller'`,
      [sellerRate.toString(), adminId]
    );

    console.log('⚙️ Commission rates updated:', { listingOwnerRate, sellerRate });

    return { success: true, listingOwnerRate, sellerRate };
  } catch (error) {
    console.error('❌ Error updating commission rates:', error);
    throw error;
  }
}

/**
 * ADMIN: Komisyon istatistikleri
 */
export async function getCommissionStats() {
  try {
    // Toplam komisyon ödemeleri
    const totalStats = await query(
      `SELECT 
        SUM(commission_balance) as total_balance,
        SUM(total_commission_earned) as total_earned,
        SUM(total_commission_withdrawn) as total_withdrawn
       FROM users`
    );

    // Bekleyen çekim talepleri
    const pendingWithdrawals = await query(
      `SELECT COUNT(*) as count, SUM(amount) as total_amount
       FROM commission_withdrawal_requests
       WHERE status = 'pending'`
    );

    // Bu ay ödenen komisyonlar
    const thisMonthCommissions = await query(
      `SELECT SUM(amount) as total
       FROM commission_transactions
       WHERE transaction_type = 'earned'
       AND MONTH(created_at) = MONTH(CURRENT_DATE())
       AND YEAR(created_at) = YEAR(CURRENT_DATE())`
    );

    // En çok kazanan kullanıcılar
    const topEarners = await query(
      `SELECT 
        u.id,
        u.email,
        CONCAT(u.firstName, ' ', u.lastName) as full_name,
        u.total_commission_earned
       FROM users u
       WHERE u.total_commission_earned > 0
       ORDER BY u.total_commission_earned DESC
       LIMIT 10`
    );

    return {
      totalBalance: parseFloat((totalStats as any)[0].total_balance || 0),
      totalEarned: parseFloat((totalStats as any)[0].total_earned || 0),
      totalWithdrawn: parseFloat((totalStats as any)[0].total_withdrawn || 0),
      pendingWithdrawalsCount: (pendingWithdrawals as any)[0].count || 0,
      pendingWithdrawalsAmount: parseFloat((pendingWithdrawals as any)[0].total_amount || 0),
      thisMonthCommissions: parseFloat((thisMonthCommissions as any)[0].total || 0),
      topEarners
    };
  } catch (error) {
    console.error('❌ Error fetching commission stats:', error);
    throw error;
  }
}
