// Test if comments route exists on production
fetch('https://varmii.com/api/comments/listing/test-id-123', {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json'
  }
})
.then(res => res.json())
.then(data => console.log('Response:', data))
.catch(err => console.error('Error:', err));
