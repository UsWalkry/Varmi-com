// Self-signed SSL sertifikası oluştur
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

const sslDir = resolve(process.cwd(), 'ssl');

console.log('🔐 Generating self-signed SSL certificate...');
console.log('📁 Directory:', sslDir);

// mkcert yoksa, manuel olarak sertifika oluştur
const forge = await import('node-forge').catch(() => null);

if (!forge) {
  console.log('❌ node-forge not installed. Installing...');
  execSync('npm install node-forge', { stdio: 'inherit' });
  console.log('✅ node-forge installed');
  process.exit(0);
}

const pki = forge.default.pki;

// Anahtar çifti oluştur
console.log('🔑 Generating RSA keypair...');
const keys = pki.rsa.generateKeyPair(2048);

// Sertifika oluştur
console.log('📜 Creating certificate...');
const cert = pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

const attrs = [{
  name: 'commonName',
  value: 'varmii.com'
}, {
  name: 'countryName',
  value: 'TR'
}, {
  shortName: 'ST',
  value: 'Istanbul'
}, {
  name: 'localityName',
  value: 'Istanbul'
}, {
  name: 'organizationName',
  value: 'Varmi'
}];

cert.setSubject(attrs);
cert.setIssuer(attrs);

cert.setExtensions([{
  name: 'basicConstraints',
  cA: true
}, {
  name: 'keyUsage',
  keyCertSign: true,
  digitalSignature: true,
  nonRepudiation: true,
  keyEncipherment: true,
  dataEncipherment: true
}, {
  name: 'subjectAltName',
  altNames: [{
    type: 2, // DNS
    value: 'varmii.com'
  }, {
    type: 2,
    value: 'www.varmii.com'
  }, {
    type: 2,
    value: 'localhost'
  }, {
    type: 7, // IP
    ip: '127.0.0.1'
  }]
}]);

// Sertifikayı imzala
console.log('✍️ Signing certificate...');
cert.sign(keys.privateKey);

// PEM formatına çevir
const pemCert = pki.certificateToPem(cert);
const pemKey = pki.privateKeyToPem(keys.privateKey);

// Dosyalara yaz
console.log('💾 Writing files...');
writeFileSync(resolve(sslDir, 'cert.pem'), pemCert);
writeFileSync(resolve(sslDir, 'key.pem'), pemKey);

console.log('✅ SSL certificate generated successfully!');
console.log('📄 Certificate:', resolve(sslDir, 'cert.pem'));
console.log('🔑 Private key:', resolve(sslDir, 'key.pem'));
console.log('');
console.log('⚠️  This is a self-signed certificate. Your browser will show a security warning.');
console.log('   Click "Advanced" and "Proceed to varmii.com" to continue.');
