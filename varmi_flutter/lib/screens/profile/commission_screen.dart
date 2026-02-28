import 'package:flutter/material.dart';
import '../../models/commission.dart';
import '../../services/commission_service.dart';
import '../../utils/formatters.dart';

class CommissionScreen extends StatefulWidget {
  const CommissionScreen({super.key});

  @override
  State<CommissionScreen> createState() => _CommissionScreenState();
}

class _CommissionScreenState extends State<CommissionScreen> {
  final CommissionService _commissionService = CommissionService();
  double _balance = 0;
  List<CommissionTransaction> _transactions = [];
  List<WithdrawalRequest> _withdrawalRequests = [];
  bool _isLoading = true;

  // Withdrawal form controllers
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _bankNameController = TextEditingController();
  final _ibanController = TextEditingController();
  final _accountHolderController = TextEditingController();
  bool _showWithdrawalForm = false;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  @override
  void dispose() {
    _amountController.dispose();
    _bankNameController.dispose();
    _ibanController.dispose();
    _accountHolderController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        _commissionService.getBalance(),
        _commissionService.getTransactions(),
        _commissionService.getWithdrawalRequests(),
      ]);
      setState(() {
        final balanceMap = results[0] as Map<String, dynamic>;
        _balance = (balanceMap['balance'] as num?)?.toDouble() ?? 0.0;
        _transactions = results[1] as List<CommissionTransaction>;
        _withdrawalRequests = results[2] as List<WithdrawalRequest>;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Veri yüklenemedi: $e')),
        );
      }
    }
  }

  Future<void> _submitWithdrawal() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSubmitting = true);
    try {
      await _commissionService.requestWithdrawal(
        amount: double.parse(_amountController.text),
        bankName: _bankNameController.text.trim(),
        iban: _ibanController.text.trim(),
        accountHolderName: _accountHolderController.text.trim(),
      );
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Para çekme talebi gönderildi'),
            backgroundColor: Colors.green,
          ),
        );
        setState(() => _showWithdrawalForm = false);
        _amountController.clear();
        _bankNameController.clear();
        _ibanController.clear();
        _accountHolderController.clear();
        _loadData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Hata: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      setState(() => _isSubmitting = false);
    }
  }

  Color _withdrawalStatusColor(String status) {
    switch (status) {
      case 'approved':
      case 'completed':
        return Colors.green;
      case 'rejected':
        return Colors.red;
      case 'pending':
        return Colors.orange;
      default:
        return Colors.grey;
    }
  }

  String _withdrawalStatusTr(String status) {
    switch (status) {
      case 'pending':
        return 'Beklemede';
      case 'approved':
        return 'Onaylandı';
      case 'rejected':
        return 'Reddedildi';
      case 'completed':
        return 'Tamamlandı';
      default:
        return status;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Komisyon & Kazançlarım'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Balance card
                    Card(
                      elevation: 4,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      child: Container(
                        width: double.infinity,
                        decoration: BoxDecoration(
                          gradient: LinearGradient(
                            colors: [
                              Theme.of(context).primaryColor,
                              Theme.of(context).primaryColor.withOpacity(0.7),
                            ],
                          ),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        padding: const EdgeInsets.all(24),
                        child: Column(
                          children: [
                            const Text(
                              'Toplam Bakiyem',
                              style: TextStyle(color: Colors.white70, fontSize: 14),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              formatPrice(_balance),
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 36,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              onPressed: _balance >= 100
                                  ? () => setState(() => _showWithdrawalForm = !_showWithdrawalForm)
                                  : null,
                              icon: const Icon(Icons.account_balance),
                              label: const Text('Para Çek'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: Theme.of(context).primaryColor,
                              ),
                            ),
                            if (_balance < 100)
                              const Padding(
                                padding: EdgeInsets.only(top: 8),
                                child: Text(
                                  'Minimum çekim tutarı: ₺100',
                                  style: TextStyle(color: Colors.white60, fontSize: 12),
                                ),
                              ),
                          ],
                        ),
                      ),
                    ),

                    // Withdrawal form
                    if (_showWithdrawalForm) ...[
                      const SizedBox(height: 16),
                      Card(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Form(
                            key: _formKey,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Para Çekme Talebi',
                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                                ),
                                const SizedBox(height: 16),
                                TextFormField(
                                  controller: _amountController,
                                  keyboardType: TextInputType.number,
                                  decoration: const InputDecoration(
                                    labelText: 'Tutar (₺)',
                                    border: OutlineInputBorder(),
                                    prefixIcon: Icon(Icons.attach_money),
                                  ),
                                  validator: (v) {
                                    if (v == null || v.isEmpty) return 'Tutar girin';
                                    final amount = double.tryParse(v);
                                    if (amount == null) return 'Geçerli tutar girin';
                                    if (amount < 100) return 'Minimum ₺100';
                                    if (amount > _balance) return 'Yetersiz bakiye';
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 12),
                                TextFormField(
                                  controller: _bankNameController,
                                  decoration: const InputDecoration(
                                    labelText: 'Banka Adı',
                                    border: OutlineInputBorder(),
                                    prefixIcon: Icon(Icons.account_balance),
                                  ),
                                  validator: (v) => v == null || v.isEmpty ? 'Banka adı girin' : null,
                                ),
                                const SizedBox(height: 12),
                                TextFormField(
                                  controller: _ibanController,
                                  decoration: const InputDecoration(
                                    labelText: 'IBAN',
                                    border: OutlineInputBorder(),
                                    prefixIcon: Icon(Icons.credit_card),
                                    hintText: 'TR...',
                                  ),
                                  validator: (v) {
                                    if (v == null || v.isEmpty) return 'IBAN girin';
                                    if (!v.startsWith('TR')) return 'Geçerli IBAN girin (TR ile başlamalı)';
                                    return null;
                                  },
                                ),
                                const SizedBox(height: 12),
                                TextFormField(
                                  controller: _accountHolderController,
                                  decoration: const InputDecoration(
                                    labelText: 'Hesap Sahibi Adı',
                                    border: OutlineInputBorder(),
                                    prefixIcon: Icon(Icons.person),
                                  ),
                                  validator: (v) => v == null || v.isEmpty ? 'Ad girin' : null,
                                ),
                                const SizedBox(height: 16),
                                Row(
                                  children: [
                                    Expanded(
                                      child: OutlinedButton(
                                        onPressed: () => setState(() => _showWithdrawalForm = false),
                                        child: const Text('İptal'),
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: ElevatedButton(
                                        onPressed: _isSubmitting ? null : _submitWithdrawal,
                                        child: _isSubmitting
                                            ? const SizedBox(
                                                height: 18,
                                                width: 18,
                                                child: CircularProgressIndicator(strokeWidth: 2),
                                              )
                                            : const Text('Talep Gönder'),
                                      ),
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],

                    // Withdrawal requests
                    if (_withdrawalRequests.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      const Text(
                        'Para Çekme Talepleri',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(height: 8),
                      ..._withdrawalRequests.map((req) => Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: Icon(
                                Icons.account_balance_wallet,
                                color: _withdrawalStatusColor(req.status),
                              ),
                              title: Text(formatPrice(req.amount)),
                              subtitle: Text('${req.bankName} • ${req.iban}'),
                              trailing: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: _withdrawalStatusColor(req.status).withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  _withdrawalStatusTr(req.status),
                                  style: TextStyle(
                                    color: _withdrawalStatusColor(req.status),
                                    fontWeight: FontWeight.bold,
                                    fontSize: 12,
                                  ),
                                ),
                              ),
                            ),
                          )),
                    ],

                    // Transactions
                    if (_transactions.isNotEmpty) ...[
                      const SizedBox(height: 24),
                      const Text(
                        'Kazanç Geçmişi',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(height: 8),
                      ..._transactions.map((tx) => Card(
                            margin: const EdgeInsets.only(bottom: 8),
                            child: ListTile(
                              leading: Container(
                                width: 40,
                                height: 40,
                                decoration: BoxDecoration(
                                  color: tx.transactionType == 'earned'
                                      ? Colors.green.withOpacity(0.1)
                                      : Colors.red.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(20),
                                ),
                                child: Icon(
                                  tx.transactionType == 'earned'
                                      ? Icons.arrow_downward
                                      : Icons.arrow_upward,
                                  color: tx.transactionType == 'earned' ? Colors.green : Colors.red,
                                  size: 20,
                                ),
                              ),
                              title: Text(
                                tx.description ?? (tx.transactionType == 'earned' ? 'Kazanç' : 'Çekim'),
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              subtitle: Text(formatDate(tx.createdAt)),
                              trailing: Text(
                                '${tx.transactionType == 'earned' ? '+' : '-'}${formatPrice(tx.amount)}',
                                style: TextStyle(
                                  color: tx.transactionType == 'earned' ? Colors.green : Colors.red,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          )),
                    ],

                    if (_transactions.isEmpty && _withdrawalRequests.isEmpty)
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 32),
                          child: Column(
                            children: [
                              Icon(Icons.account_balance_wallet_outlined,
                                  size: 64, color: Colors.grey[400]),
                              const SizedBox(height: 16),
                              Text(
                                'Henüz kazancınız yok',
                                style: TextStyle(color: Colors.grey[600], fontSize: 16),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'İlanlar tamamlandığında komisyon kazanırsınız',
                                style: TextStyle(color: Colors.grey[400], fontSize: 13),
                                textAlign: TextAlign.center,
                              ),
                            ],
                          ),
                        ),
                      ),
                  ],
                ),
              ),
            ),
    );
  }
}
