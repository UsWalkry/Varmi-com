import re

filepath = r"C:\Users\Burak AYDIN\Desktop\Varmi-com-sql\server\src\services\emailService.ts"

with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()

# Find all occurrences of the function
marker = 'export async function sendPasswordResetEmail('
positions = [m.start() for m in re.finditer(re.escape(marker), content)]
print(f"Found {len(positions)} occurrences at positions: {positions}")

if len(positions) >= 2:
    # Keep first occurrence, remove everything from second occurrence onward (up to end of that function)
    second_start = positions[1]
    # Find the closing brace of the second function
    # The function ends with "}\n" at the top level
    # We'll just truncate from second occurrence
    content = content[:second_start].rstrip() + '\n'
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Done - removed duplicate function")
else:
    print("No duplicate found, nothing to do")
