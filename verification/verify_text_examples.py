
from playwright.sync_api import sync_playwright
import time

def verify_text_processing_examples():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        examples = [
            ("456-sensitive-word-filter", "Sensitive Word Filter"),
            ("457-synonym-replacement", "Synonym Replacement"),
            ("458-traditional-simplified", "Traditional/Simplified Conversion"),
            ("459-half-full-width", "Half/Full Width Conversion"),
            ("460-pinyin-conversion", "Pinyin Conversion"),
            ("461-case-conversion", "Case Conversion"),
            ("462-camel-case", "Camel Case Conversion"),
            ("463-snake-case", "Snake Case Conversion"),
        ]

        for folder, title in examples:
            print(f"Verifying {folder}...")
            url = f"http://localhost:8080/examples/04-text-processing/{folder}/index.html"
            page.goto(url)

            # Verify title
            try:
                page.wait_for_selector("h1", timeout=5000)
                h1_text = page.inner_text("h1")
                if title not in h1_text:
                    print(f"FAILED: Title mismatch for {folder}. Expected '{title}', got '{h1_text}'")
                else:
                    print(f"SUCCESS: Title verified for {folder}")
            except Exception as e:
                print(f"FAILED: Could not verify title for {folder}: {e}")

            # Verify input area exists
            try:
                page.wait_for_selector("textarea", timeout=5000)
                print(f"SUCCESS: Input area found for {folder}")
            except Exception as e:
                print(f"FAILED: Input area not found for {folder}: {e}")

            # Screenshot
            page.screenshot(path=f"verification/{folder}.png")
            print(f"Screenshot saved to verification/{folder}.png")
            print("-" * 20)

        browser.close()

if __name__ == "__main__":
    verify_text_processing_examples()
