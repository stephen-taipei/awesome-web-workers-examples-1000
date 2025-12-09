from playwright.sync_api import sync_playwright

def verify_performance_examples():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        base_url = "http://localhost:8080/examples"

        # New examples to verify (528-535)
        examples = [
            "05-performance-tools/528-gc-impact",
            "05-performance-tools/529-multicore-performance",
            "05-performance-tools/530-comprehensive-benchmark",
            "05-performance-tools/531-execution-time-analysis",
            "05-performance-tools/532-memory-analysis",
            "05-performance-tools/533-call-count-statistics",
            "05-performance-tools/534-hotspot-analysis",
            "05-performance-tools/535-call-graph-generation"
        ]

        for example in examples:
            url = f"{base_url}/{example}/index.html"
            print(f"Verifying {url}...")
            try:
                page.goto(url)
                # Wait for initial load
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
    verify_performance_examples()
