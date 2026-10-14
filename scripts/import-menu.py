import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError

API = "http://localhost:4000/api"
DRY_RUN = "--apply" not in sys.argv


class MenuParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.panels = []
        self.panel = None
        self.item = None
        self.div_stack = []
        self.capture = None

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        classes = a.get("class", "").split()

        if tag == "div":
            self.div_stack.append(classes)

            if "menu-panel" in classes:
                self.panel = {"id": a.get("id", "other"), "items": []}
                self.panels.append(self.panel)

            elif self.panel is not None and "menu-item" in classes:
                self.item = {"name": "", "price": "", "note": "", "image": ""}

            elif self.item is not None:
                for cls in ("menu-item-name", "menu-item-price", "menu-item-note"):
                    if cls in classes:
                        self.capture = {
                            "menu-item-name": "name",
                            "menu-item-price": "price",
                            "menu-item-note": "note",
                        }[cls]
                        break

        elif tag == "img" and self.item is not None:
            self.item["image"] = a.get("src", "")

    def handle_data(self, data):
        if self.item is not None and self.capture:
            self.item[self.capture] += data

    def handle_endtag(self, tag):
        if tag != "div" or not self.div_stack:
            return

        classes = self.div_stack.pop()

        if any(c in classes for c in ("menu-item-name", "menu-item-price", "menu-item-note")):
            self.capture = None

        if "menu-item" in classes and self.item is not None:
            self.item["name"] = self.item["name"].strip()
            self.item["price"] = self.item["price"].strip()
            self.item["note"] = self.item["note"].strip()
            self.panel["items"].append(self.item)
            self.item = None

        if "menu-panel" in classes:
            self.panel = None


def api(path, method="GET", body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = Request(
        API + path,
        data=data,
        method=method,
        headers={"Content-Type": "application/json"},
    )
    with urlopen(req, timeout=10) as response:
        result = json.loads(response.read().decode())
        if result.get("success") is False:
            raise RuntimeError(result.get("message", "API request failed"))
        return result


def make_variants(item):
    prices = [int(x) for x in re.findall(r"\d+", item["price"])]
    if not prices:
        return []

    price_text = item["price"].lower()
    note = item["note"]
    labels = []

    if "half" in price_text and "full" in price_text and len(prices) == 2:
        labels = ["Half", "Full"]
    else:
        sizes = re.findall(r'(\d+)\s*"', note)
        if len(sizes) == len(prices):
            labels = [f'{size}"' for size in sizes]

    if len(prices) == 1:
        return [{"name": item["name"], "price": prices[0]}]

    if len(labels) != len(prices):
        labels = [f"Option {i + 1}" for i in range(len(prices))]

    return [
        {"name": f'{item["name"]} ({label})', "price": price}
        for label, price in zip(labels, prices)
    ]


def main():
    parser = MenuParser()
    parser.feed(Path("index.html").read_text(encoding="utf-8"))

    categories = api("/menu/categories")["data"]
    items = api("/menu/items")["data"]

    # Reuse existing categories. "burger" maps to the existing "burgers" slug.
    by_slug = {c["slug"].lower(): c for c in categories}
    category_map = {}
    for panel in parser.panels:
        slug = "burgers" if panel["id"] == "burger" else panel["id"]
        category_map[panel["id"]] = by_slug.get(slug)

    planned = []
    for panel in parser.panels:
        category = category_map[panel["id"]]
        category_name = "Burgers" if panel["id"] == "burger" else panel["id"].title()

        for item in panel["items"]:
            if not item["name"]:
                continue
            for variant in make_variants(item):
                planned.append({
                    "categorySlug": "burgers" if panel["id"] == "burger" else panel["id"],
                    "categoryName": category_name,
                    "categoryId": category["id"] if category else None,
                    "name": variant["name"],
                    "price": variant["price"],
                    "imageUrl": None,
                    "description": item["note"] or None,
                })

    # Existing exact names are not imported twice within the same category.
    existing = {
        (x["categoryId"], x["name"].strip().casefold())
        for x in items
    }

    new_items = []
    for item in planned:
        category_id = item["categoryId"]
        if category_id and (category_id, item["name"].casefold()) in existing:
            continue
        new_items.append(item)

    print(f"HTML categories: {len(parser.panels)}")
    print(f"Existing database categories: {len(categories)}")
    print(f"Existing database items: {len(items)}")
    print(f"Menu variants parsed: {len(planned)}")
    print(f"Items to import: {len(new_items)}")
    print("\nSample import rows:")
    for item in new_items[:20]:
        print(f'  {item["categorySlug"]}: {item["name"]} — ৳{item["price"]}')

    if DRY_RUN:
        print("\nDRY RUN ONLY: database unchanged.")
        print("Review the rows, then run: python scripts/import-menu.py --apply")
        return

    # Create only missing categories.
    categories = api("/menu/categories")["data"]
    by_slug = {c["slug"].lower(): c for c in categories}

    for panel in parser.panels:
        slug = "burgers" if panel["id"] == "burger" else panel["id"]
        if slug not in by_slug:
            name = "Burgers" if slug == "burgers" else panel["id"].title()
            created = api("/menu/categories", "POST", {"name": name})["data"]
            by_slug[created["slug"].lower()] = created

    # Refresh menu items after category creation; skip exact existing names.
    items = api("/menu/items")["data"]
    existing = {
        (x["categoryId"], x["name"].strip().casefold())
        for x in items
    }

    imported = 0
    skipped = 0
    for item in planned:
        slug = item["categorySlug"]
        category = by_slug.get(slug)
        if not category:
            print(f'SKIP: no category for {slug}')
            skipped += 1
            continue

        key = (category["id"], item["name"].casefold())
        if key in existing:
            skipped += 1
            continue

        payload = {
            "name": item["name"],
            "description": item["description"],
            "price": item["price"],
            "imageUrl": None,
            "isAvailable": True,
            "categoryId": category["id"],
        }
        api("/menu/items", "POST", payload)
        existing.add(key)
        imported += 1

    print(f"\nImport complete. Created {imported} items; skipped {skipped} existing items.")
    print("Existing test item was not deleted or modified.")


if __name__ == "__main__":
    try:
        main()
    except (HTTPError, URLError, RuntimeError, OSError, ValueError) as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
