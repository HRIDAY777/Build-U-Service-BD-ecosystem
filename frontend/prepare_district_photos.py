"""Download licensed lead photographs from each district's Wikipedia article."""
import json
import re
import time
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path

ROOT = Path(__file__).parent
OUT = ROOT / "public/images/districts"
OUT.mkdir(parents=True, exist_ok=True)
HEADERS = {"User-Agent": "UServiceBDLocalDemo/1.0 (licensed district photo attribution)"}

def get(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=30) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if error.code == 429:
                time.sleep(30)
            if attempt == 2:
                raise
        except Exception:
            if attempt == 2:
                raise
            time.sleep(1)

def api(host, **params):
    time.sleep(1)
    return json.loads(get(f"https://{host}/w/api.php?" + urllib.parse.urlencode({"format": "json", **params})))

def plain(value):
    return re.sub("<[^>]+>", "", value or "")

districts = [district for division in json.loads((ROOT / "public/data/bangladesh/locations.json").read_text(encoding="utf-8"))["divisions"] for district in division["districts"]]
photos = json.loads((OUT / "manifest.json").read_text(encoding="utf-8")) if (OUT / "manifest.json").exists() else {}
for district in districts:
    if str(district["id"]) in photos:
        continue
    titles = {
        "Coxsbazar": ["Cox's Bazar District", "Cox's Bazar"],
        "Gopalganj": ["Gopalganj District, Bangladesh", "Gopalganj, Bangladesh"],
    }.get(district["name"], [district["name"] + " District", district["name"]])
    for title in titles:
        try:
            result = api("en.wikipedia.org", action="query", titles=title, redirects=1, prop="pageimages", pithumbsize=1200)
            page = next(iter(result["query"]["pages"].values()))
            filename = page.get("pageimage", "")
            if not filename or any(term in filename.lower() for term in ["map", "locator", ".svg", "logo", "seal", "flag", "coat_of"]):
                continue
            info = api("commons.wikimedia.org", action="query", titles="File:" + filename, prop="imageinfo", iiprop="url|extmetadata|mime", iiurlwidth=1200)
            record = next(iter(info["query"]["pages"].values()))["imageinfo"][0]
            metadata = record["extmetadata"]
            license_name = metadata.get("LicenseShortName", {}).get("value", "")
            if not any(term in license_name.lower() for term in ["cc by", "cc0", "public domain"]):
                continue
            extension = ".png" if record["mime"] == "image/png" else ".jpg"
            path = OUT / (str(district["id"]) + extension)
            path.write_bytes(get(record.get("thumburl", record["url"])))
            photos[str(district["id"])] = {
                "src": "/images/districts/" + path.name, "name": district["name"], "name_bn": district["bnName"],
                "alt": plain(metadata.get("ImageDescription", {}).get("value", filename))[:500],
                "artist": plain(metadata.get("Artist", {}).get("value", "See source")),
                "license": license_name, "license_url": metadata.get("LicenseUrl", {}).get("value", ""),
                "source": record["descriptionurl"], "article": "https://en.wikipedia.org/wiki/" + urllib.parse.quote(page["title"].replace(" ", "_")),
            }
            print(district["name"] + ": downloaded", flush=True)
            break
        except Exception as error:
            print(district["name"] + ": " + str(error)[:100], flush=True)
    (OUT / "manifest.json").write_text(json.dumps(photos, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"Verified source/licence metadata for {len(photos)}/{len(districts)} districts")
