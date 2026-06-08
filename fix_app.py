import codecs
import re

with codecs.open('src/App.jsx', 'r', 'utf-8') as f:
    content = f.read()

# Replace dev_seller_1 and dev_buyer_1 fallbacks
content = re.sub(
    r"const (\w+) = tgUser\?\.id \? String\(tgUser\.id\) \: 'dev_(seller|buyer)_1';", 
    r"const \1 = tgUser?.id ? String(tgUser.id) : null;\nif (!\1) return;", 
    content
)

# Also replace the inline fallback
content = content.replace("String(tgUser?.id || 'dev_seller_1')", "String(tgUser?.id || '')")

# Now add getTgAuthHeaders() to ALL GET requests hitting API_BASE
# Example: fetch(`${API_BASE}/store/${store.id}`)
# We'll just replace fetch(`...`) with fetch(`...`, { headers: { ...getTgAuthHeaders() } })
# But only for API calls
def add_headers_to_get(match):
    url = match.group(1)
    return f"fetch({url}, {{ headers: {{ ...getTgAuthHeaders() }} }})"

content = re.sub(r"fetch\((`\$\{API_BASE\}[^`]+`)\)", add_headers_to_get, content)
content = re.sub(r"fetch\((`\$\{API_BASE\}[^`]+`\s*\+\s*[^,]+)\)", add_headers_to_get, content)

with codecs.open('src/App.jsx', 'w', 'utf-8') as f:
    f.write(content)
