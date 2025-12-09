import os
from playwright.sync_api import sync_playwright

def verify_examples():
    examples = [
        "04-text-processing/440-word-frequency",
        "04-text-processing/441-keyword-extraction",
        "04-text-processing/442-text-summarization",
        "04-text-processing/443-language-detection",
        "04-text-processing/444-encoding-detection",
        "04-text-processing/445-word-count",
        "04-text-processing/446-sentence-segmentation",
        "04-text-processing/447-paragraph-segmentation"
    ]

    os.makedirs("/home/jules/verification", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        for example in examples:
            print(f"Verifying {example}...")
            page.goto(f"http://localhost:8080/examples/{example}/")
            page.wait_for_load_state("networkidle")

            # Additional interaction for some examples to show results
            if "440-word-frequency" in example:
                page.click("#loadSampleBtn")
                page.click("#processBtn")
                page.wait_for_timeout(500)
            elif "441-keyword-extraction" in example:
                page.click("#loadSampleBtn")
                page.click("#processBtn")
                page.wait_for_timeout(500)
            elif "442-text-summarization" in example:
                page.click("#loadSampleBtn")
                page.click("#processBtn")
                page.wait_for_timeout(500)
            elif "443-language-detection" in example:
                page.click("button[onclick=\"loadText('en')\"]")
                page.click("#processBtn")
                page.wait_for_timeout(500)

            # Take a screenshot
            safe_name = example.replace("/", "-")
            page.screenshot(path=f"/home/jules/verification/{safe_name}.png")
            print(f"Screenshot saved to /home/jules/verification/{safe_name}.png")

        browser.close()

if __name__ == "__main__":
    verify_examples()
