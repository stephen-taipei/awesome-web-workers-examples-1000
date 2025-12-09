
from playwright.sync_api import sync_playwright
import time
import os

BASE_URL = "http://localhost:8080/examples/03-image-processing"
OUTPUT_DIR = "verification"

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

EXAMPLES = [
    ("388-face-detection", "Face Detection"),
    ("389-skin-color-detection", "Skin Color Detection"),
    ("390-qr-code-detection", "QR Code Detection"),
    ("391-barcode-detection", "Barcode Detection"),
    ("392-text-region-detection", "Text Region Detection"),
    ("393-line-detection", "Line Detection"),
    ("394-circle-detection", "Circle Detection"),
    ("395-ellipse-detection", "Ellipse Detection"),
]

def verify_example(page, folder, title_text):
    print(f"Verifying {folder}...")
    try:
        page.goto(f"{BASE_URL}/{folder}/index.html")
        page.wait_for_load_state("networkidle")

        # Check title
        title = page.locator("h1")
        if not title.is_visible():
             print(f"Error: H1 not visible in {folder}")

        # Check if title text contains expected text (partial match is fine)
        # Note: Playwright's to_have_text is strict by default or needs expect.
        # Here we just print check.
        current_title = title.inner_text()
        if title_text not in current_title:
             print(f"Warning: Title mismatch. Expected '{title_text}' in '{current_title}'")

        # Take screenshot
        page.screenshot(path=f"{OUTPUT_DIR}/{folder}.png")
        print(f"Screenshot saved for {folder}")

    except Exception as e:
        print(f"Failed to verify {folder}: {e}")

def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for folder, title in EXAMPLES:
            verify_example(page, folder, title)

        browser.close()

if __name__ == "__main__":
    main()
