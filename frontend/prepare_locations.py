import json
from pathlib import Path

root = Path(__file__).parent / "public/data/bangladesh"
source = json.loads((root / "source.json").read_text(encoding="utf-8-sig"))
counts = {}

def transform(rows, level):
    ids = set()
    output = []
    child = {"divisions": "districts", "districts": "upazilas", "upazilas": "areas"}.get(level)
    for row in rows:
        assert row["id"] not in ids, (level, row["id"])
        ids.add(row["id"])
        if not row.get("isActive", True):
            continue
        assert row["name"] and row["bnName"]
        item = {key: row[key] for key in ["id", "name", "bnName"]}
        item["aliases"] = row.get("aliases", [])
        if child:
            item[child] = transform(row.get(child, []), child)
        output.append(item)
    counts[level] = counts.get(level, 0) + len(output)
    return output

result = {"divisions": transform(source["divisions"], "divisions")}
assert counts["divisions"] == 8 and counts["districts"] == 64, counts
(root / "locations.json").write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(counts)
