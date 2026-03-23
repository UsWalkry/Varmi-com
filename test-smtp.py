import smtplib
from email.mime.text import MIMEText

msg = MIMEText('Test message from Python SMTP')
msg['Subject'] = 'SMTP Test'
msg['From'] = 'noreply@varmii.com'
msg['To'] = 'bybrkaydn@gmail.com'

s = smtplib.SMTP('127.0.0.1', 25)
s.send_message(msg)
s.quit()
print('✅ Mail sent successfully via port 25!')
