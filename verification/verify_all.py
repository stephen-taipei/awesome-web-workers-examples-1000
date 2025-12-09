
import os
from playwright.sync_api import sync_playwright

def verify_examples():
    examples = [
        ("380-feature-extraction", "examples/03-image-processing/380-feature-extraction/index.html"),
        ("381-template-matching", "examples/03-image-processing/381-template-matching/index.html"),
        ("382-connected-components", "examples/03-image-processing/382-connected-components/index.html"),
        ("383-region-growing", "examples/03-image-processing/383-region-growing/index.html"),
        ("384-watershed", "examples/03-image-processing/384-watershed/index.html"),
        ("385-graph-cut", "examples/03-image-processing/385-graph-cut/index.html"),
        ("386-grab-cut", "examples/03-image-processing/386-grab-cut/index.html"),
        ("387-superpixel-segmentation", "examples/03-image-processing/387-superpixel-segmentation/index.html"),
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for name, path in examples:
            print(f"Verifying {name}...")
            url = f"http://localhost:8080/{path}"
            page.goto(url)
            page.wait_for_load_state("networkidle")

            # Just take a screenshot of the initial state to ensure it loads without error
            screenshot_path = f"verification/{name}.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_examples()
