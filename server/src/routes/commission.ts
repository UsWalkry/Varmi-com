/**
 * Komisyon API Routes
 * 
 * Endpoints:
 * - GET /api/commission/balance - Kullanıcının komisyon bakiyesi
 * - GET /api/commission/history - Komisyon işlem geçmişi
 * - GET /api/commission/withdrawals - Çekim talepleri
 * - POST /api/commission/withdraw - Yeni çekim talebi
 * - GET /api/commission/settings - Komisyon ayarları (oranlar, limitler)
 */

import express, { Response } from 'express';
import { authenticateToken, AuthRequest } from '../middleware/auth.js';
import * as commissionService from '../services/commissionService.js';

const router = express.Router();

/**
 * GET /api/commission/balance
 * Kullanıcının komisyon bakiyesini getir
 */
router.get('/balance', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    console.log('💰 GET /commission/balance - userId:', userId);

    const balance = await commissionService.getUserCommissionBalance(userId);

    console.log('💰 Balance fetched:', {
      userId,
      balance: balance.balance,
      totalEarned: balance.totalEarned,
      totalWithdrawn: balance.totalWithdrawn
    });

    const response = {
      success: true,
      balance: balance.balance,
      totalEarned: balance.totalEarned,
      totalWithdrawn: balance.totalWithdrawn
    };

    console.log('💰 Sending response:', response);

    res.json(response);
  } catch (error: any) {
    console.error('❌ Error getting commission balance:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Bakiye getirilemedi'
    });
  }
});

/**
 * GET /api/commission/history
 * Komisyon işlem geçmişini getir
 */
router.get('/history', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const limit = parseInt(String(req.query.limit || 50));
    const offset = parseInt(String(req.query.offset || 0));

    const history = await commissionService.getUserCommissionHistory(userId, limit, offset);

    res.json({
      success: true,
      transactions: history.transactions,
      total: history.total,
      limit: history.limit,
      offset: history.offset
    });
  } catch (error: any) {
    console.error('❌ Error getting commission history:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Geçmiş getirilemedi'
    });
  }
});

/**
 * GET /api/commission/withdrawals
 * Kullanıcının çekim taleplerini getir
 */
router.get('/withdrawals', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const requests = await commissionService.getUserWithdrawalRequests(userId);

    res.json({
      success: true,
      requests
    });
  } catch (error: any) {
    console.error('❌ Error getting withdrawal requests:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Talepler getirilemedi'
    });
  }
});

/**
 * POST /api/commission/withdraw
 * Yeni çekim talebi oluştur
 */
router.post('/withdraw', authenticateToken, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { amount, bankName, iban, accountHolderName } = req.body;

    // Validasyon
    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Geçerli bir tutar girin'
      });
    }

    if (!bankName || !iban || !accountHolderName) {
      return res.status(400).json({
        success: false,
        error: 'Banka bilgileri eksik'
      });
    }

    // IBAN formatı kontrolü (basit)
    const ibanCleaned = iban.replace(/\s/g, '').toUpperCase();
    if (!/^TR\d{24}$/.test(ibanCleaned)) {
      return res.status(400).json({
        success: false,
        error: 'Geçersiz IBAN formatı. TR ile başlamalı ve 26 karakter olmalı'
      });
    }

    const request = await commissionService.createWithdrawalRequest(userId, amount, {
      bankName,
      iban: ibanCleaned,
      accountHolderName
    });

    res.json({
      success: true,
      message: 'Çekim talebiniz alındı. En kısa sürede işleme alınacak.',
      request
    });
  } catch (error: any) {
    console.error('❌ Error creating withdrawal request:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Çekim talebi oluşturulamadı'
    });
  }
});

/**
 * GET /api/commission/settings
 * Komisyon ayarlarını getir (public - giriş gerektirmez)
 */
router.get('/settings', async (req, res) => {
  try {
    const rates = await commissionService.getCommissionRates();

    res.json({
      success: true,
      settings: {
        listingOwnerRate: rates.listingOwnerRate,
        sellerRate: rates.sellerRate,
        enabled: rates.enabled
      }
    });
  } catch (error) {
    console.error('❌ Error getting commission settings:', error);
    res.status(500).json({
      success: false,
      error: 'Ayarlar getirilemedi'
    });
  }
});

export default router;
