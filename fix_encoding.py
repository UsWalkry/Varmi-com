content = open(
    r'C:/Users/Burak AYDIN/Desktop/Varmi-com-sql/varmi_flutter/lib/screens/listings/create_listing_screen.dart',
    'r', encoding='utf-8'
).read()

# Fix all mojibake patterns
replacements = {
    'Ã¶': 'ö', 'Ä±': 'ı', 'ÄŸ': 'ğ', 'ÅŸ': 'ş', 'Ã§': 'ç',
    'Ä°': 'İ', 'Ã¼': 'ü', 'Ã–': 'Ö', 'Ã‡': 'Ç', 'Åž': 'Ş',
    'Ã‚': 'Â', 'Ã¢': 'â', 'Ã›': 'Û', 'Ã¥': 'å',
    'Ä': 'İ',  # fallback
}
for bad, good in replacements.items():
    content = content.replace(bad, good)

with open(
    r'C:/Users/Burak AYDIN/Desktop/Varmi-com-sql/varmi_flutter/lib/screens/listings/create_listing_screen.dart',
    'w', encoding='utf-8'
) as f:
    f.write(content)
print('Done')
