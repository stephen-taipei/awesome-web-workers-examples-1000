
import os
from playwright.sync_api import sync_playwright

def verify_text_processing():
    examples = [
        ("424-text-diff", "examples/04-text-processing/424-text-diff/index.html"),
        ("425-merge-conflict", "examples/04-text-processing/425-merge-conflict/index.html"),
        ("426-template-engine", "examples/04-text-processing/426-template-engine/index.html"),
        ("427-regex-replace", "examples/04-text-processing/427-regex-replace/index.html"),
        ("428-text-compression", "examples/04-text-processing/428-text-compression/index.html"),
        ("429-text-decompression", "examples/04-text-processing/429-text-decompression/index.html"),
        ("430-rtf-to-text", "examples/04-text-processing/430-rtf-to-text/index.html"),
        ("431-full-text-search", "examples/04-text-processing/431-full-text-search/index.html"),
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for name, path in examples:
            print(f"Verifying {name}...")
            url = f"http://localhost:8081/{path}"
            page.goto(url)
            page.wait_for_load_state("networkidle")

            screenshot_path = f"verification/{name}.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_text_processing()
