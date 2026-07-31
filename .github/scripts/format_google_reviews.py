import json
import sys

data = json.load(sys.stdin)
reviews = data.get('result', {}).get('reviews', [])
out = [{
    'name': r.get('author_name', ''),
    'stars': r.get('rating', 5),
    'quote': r.get('text', ''),
    'time': r.get('relative_time_description', ''),
    'profile_photo': r.get('profile_photo_url', ''),
} for r in reviews]

with open('google-reviews.json', 'w') as f:
    json.dump({'reviews': out}, f)
