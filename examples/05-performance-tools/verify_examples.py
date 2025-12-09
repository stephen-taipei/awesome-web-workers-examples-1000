
import os
from playwright.sync_api import sync_playwright

def verify_performance_tools_examples():
    examples = [
        "512-canvas-performance",
        "513-webgl-performance",
        "514-worker-performance",
        "515-transferable-performance",
        "516-shared-memory-performance",
        "517-crypto-performance",
        "518-compression-performance",
        "519-sorting-performance"
    ]

    os.makedirs("/home/jules/verification", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for example in examples:
            print(f"Verifying {example}...")
            url = f"http://localhost:8080/examples/05-performance-tools/{example}/index.html"

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
    verify_performance_tools_examples()
