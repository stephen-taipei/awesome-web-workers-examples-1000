from playwright.sync_api import sync_playwright

def verify_new_text_processing_examples():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        base_url = "http://localhost:8080/examples"

        # New examples to verify (408-415)
        examples = [
            "04-text-processing/408-ini-parser",
            "04-text-processing/409-log-parser",
            "04-text-processing/410-url-parser",
            "04-text-processing/411-query-string-parser",
            "04-text-processing/412-base64-encoding",
            "04-text-processing/413-utf8-encoding",
            "04-text-processing/414-hex-encoding",
            "04-text-processing/415-unicode-conversion"
        ]

        for example in examples:
            url = f"{base_url}/{example}/index.html"
            print(f"Verifying {url}...")
            try:
                page.goto(url)
                # Wait for initial processing to potentially finish (some examples auto-run on load)
                page.wait_for_timeout(1000)

                # Take screenshot
                example_name = example.split('/')[-1]
                screenshot_path = f"verification/{example_name}.png"
                page.screenshot(path=screenshot_path)
                print(f"Screenshot saved to {screenshot_path}")

            except Exception as e:
                print(f"Failed to verify {url}: {e}")

        browser.close()

if __name__ == "__main__":
    verify_new_text_processing_examples()
