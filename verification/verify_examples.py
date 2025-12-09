
from playwright.sync_api import sync_playwright
import time

<<<<<<< HEAD
def verify_all_examples():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        examples = [
            ("348-pointillism", "Pointillism Effect"),
            ("349-halftone", "Halftone Effect"),
            ("350-crosshatch", "Crosshatch Effect"),
            ("351-glass-effect", "Glass Effect"),
            ("352-frosted-glass", "Frosted Glass Effect"),
            ("353-kaleidoscope", "Kaleidoscope Effect"),
            ("354-mirror-effect", "Mirror Effect"),
            ("355-tile-effect", "Tile Effect"),
        ]

        for folder, title in examples:
            print(f"Verifying {folder}...")
            url = f"http://localhost:8080/examples/03-image-processing/{folder}/index.html"
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

            # Verify canvas exists
            try:
                page.wait_for_selector("#originalCanvas", timeout=5000)
                print(f"SUCCESS: Canvas found for {folder}")
            except Exception as e:
                print(f"FAILED: Canvas not found for {folder}: {e}")

            # Screenshot
            page.screenshot(path=f"verification/{folder}.png")
            print(f"Screenshot saved to verification/{folder}.png")
            print("-" * 20)
=======
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
>>>>>>> 112b824 (Implement Image Processing examples 308-315)

        browser.close()

if __name__ == "__main__":
<<<<<<< HEAD
    verify_all_examples()
=======
    verify_examples()
>>>>>>> 112b824 (Implement Image Processing examples 308-315)
