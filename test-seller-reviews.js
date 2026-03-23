// Test the seller reviews endpoint
fetch('/api/users/70ebaf88-9b10-4577-b72c-cee547710519/reviews', {
  headers: {
    'Authorization': 'Bearer ' + localStorage.getItem('auth_token')
  }
})
.then(r => r.json())
.then(data => {
  console.log('Seller reviews:', data);
  if (data.success) {
    console.log('Total reviews:', data.stats.totalReviews);
    console.log('Average rating:', data.stats.averageRating);
    console.log('Reviews:', data.reviews);
  }
})
.catch(err => console.error('Error:', err));