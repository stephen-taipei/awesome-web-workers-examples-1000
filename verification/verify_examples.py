
from playwright.sync_api import sync_playwright
import time

def verify_examples():
    examples = [
        ("308-black-hat-transform", "Black-hat Transform"),
        ("309-skeletonize", "Skeletonize"),
        ("310-distance-transform", "Distance Transform"),
        ("311-image-scaling", "Image Scaling"),
        ("312-lanczos-scaling", "Lanczos Scaling"),
        ("313-nearest-neighbor-scaling", "Nearest Neighbor Scaling"),
        ("314-image-rotation", "Image Rotation"),
        ("315-image-flip", "Image Flip")
    ]

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        for folder, title in examples:
            print(f"Verifying {title}...")
            url = f"http://localhost:8080/examples/03-image-processing/{folder}/index.html"
            try:
                page.goto(url)
                page.wait_for_load_state("networkidle")

                # Verify title
                page_title = page.title()
                if title not in page_title:
                    print(f"Warning: Title mismatch for {folder}. Expected '{title}', got '{page_title}'")

                # Take screenshot
                screenshot_path = f"verification/{folder}.png"
                page.screenshot(path=screenshot_path)
                print(f"Screenshot saved to {screenshot_path}")

            except Exception as e:
                print(f"Error verifying {folder}: {e}")

        browser.close()

if __name__ == "__main__":
    verify_examples()
