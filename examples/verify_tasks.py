import os
from playwright.sync_api import sync_playwright

def verify_examples():
    examples = [
        "364-light-rays",
        "365-lens-flare",
        "366-chromatic-aberration",
        "367-glitch-art",
        "368-double-exposure",
        "369-motion-simulation",
        "370-ascii-art",
        "371-histogram-calculation"
    ]

    os.makedirs("/home/jules/verification", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        for example in examples:
            print(f"Verifying {example}...")
            page.goto(f"http://localhost:8080/examples/03-image-processing/{example}/")
            page.wait_for_load_state("networkidle")

            # Take a screenshot
            page.screenshot(path=f"/home/jules/verification/{example}.png")
            print(f"Screenshot saved to /home/jules/verification/{example}.png")

        browser.close()

if __name__ == "__main__":
    verify_examples()
