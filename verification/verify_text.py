
from playwright.sync_api import sync_playwright
import time
import os

BASE_URL = "http://localhost:8080/examples/04-text-processing"
OUTPUT_DIR = "verification"

if not os.path.exists(OUTPUT_DIR):
    os.makedirs(OUTPUT_DIR)

EXAMPLES = [
    ("416-html-entity-conversion", "HTML Entity Conversion"),
    ("417-string-escaping", "String Escaping"),
    ("418-json-beautify", "JSON Beautify"),
    ("419-json-minify", "JSON Minify"),
    ("420-xml-beautify", "XML Beautify"),
    ("421-sql-formatter", "SQL Formatter"),
    ("422-code-formatter", "Code Formatter"),
    ("423-syntax-highlighting", "Syntax Highlighting"),
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

        # Simple interaction test
        if folder == "416-html-entity-conversion":
            page.fill("#inputArea", "<div>&</div>")
            page.click("#encodeBtn")
            page.wait_for_timeout(500)
            val = page.input_value("#outputArea")
            if "&lt;div&gt;&amp;&lt;/div&gt;" not in val:
                print(f"Warning: Unexpected output in 416: {val}")

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
