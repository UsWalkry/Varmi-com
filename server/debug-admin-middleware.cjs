// Admin middleware debug - Backend console'da çıktı verecek
const express = require('express');
const mysql = require('mysql2/promise');
require('dotenv').config();

// Test token - browser'dan alın
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI0MTViMGMxNy1jMmJkLTQwYTUtYWMzZC0xNTg1NzhmZjFkZjEiLCJpYXQiOjE3NjA2ODI2MDAsImV4cCI6MTc2MTI4NzQwMH0.Fxu__aOhR5IeHIrdRDe9iiGPUnBVeAZLHcnuKZRLPjw';

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

async function debugAdminAuth() {
  try {
    console.log('🔍 Debug Admin Auth Process');
    
    // 1. Token decode
    const decoded = jwt.verify(testToken, JWT_SECRET);
    console.log('✅ Token decoded:', decoded);
    const userId = decoded.userId;
    console.log('🆔 User ID:', userId);
    
    // 2. Database bağlantısı
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME
    });
    
    console.log('✅ Database connected');
    
    // 3. User role kontrolü
    const [users] = await connection.execute(
      'SELECT id, email, role FROM users WHERE id = ?',
      [userId]
    );
    
    console.log('📊 Database query result:', users);
    
    const user = users[0];
    if (!user) {
      console.log('❌ User not found in database');
    } else {
      console.log('👤 User found:');
      console.log('  📧 Email:', user.email);
      console.log('  🏷️ Role:', user.role);
      console.log('  🔍 Role type:', typeof user.role);
      console.log('  🎯 Is admin?', user.role === 'admin');
      
      if (user.role === 'admin') {
        console.log('✅ USER SHOULD HAVE ADMIN ACCESS');
      } else {
        console.log('❌ USER IS NOT ADMIN');
      }
    }
    
    await connection.end();
    
  } catch (error) {
    console.error('🚨 Debug error:', error);
  }
}

debugAdminAuth();