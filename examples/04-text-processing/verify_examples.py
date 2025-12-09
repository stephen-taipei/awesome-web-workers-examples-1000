
import os
from playwright.sync_api import sync_playwright

def verify_text_processing_examples():
    examples = [
        "448-chinese-word-segmentation",
        "449-pos-tagging",
        "450-ner-recognition",
        "451-text-similarity",
        "452-plagiarism-detection",
        "453-deduplication",
        "454-line-sorting",
        "455-filtering"
    ]

    os.makedirs("/home/jules/verification", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for example in examples:
            print(f"Verifying {example}...")
            url = f"http://localhost:8080/examples/04-text-processing/{example}/index.html"

            try:
                page.goto(url)
                page.wait_for_load_state("networkidle")

                # Check for key elements
                page.wait_for_selector("h1")

                # Take screenshot
                screenshot_path = f"/home/jules/verification/{example}.png"
                page.screenshot(path=screenshot_path)
                print(f"Screenshot saved to {screenshot_path}")

            except Exception as e:
                print(f"Failed to verify {example}: {e}")

        browser.close()

if __name__ == "__main__":
    verify_text_processing_examples()
