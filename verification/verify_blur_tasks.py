from playwright.sync_api import sync_playwright

def verify_blur_examples():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        examples = [
            ("284-motion-blur", "Motion Blur"),
            ("285-radial-blur", "Radial Blur"),
            ("286-zoom-blur", "Zoom Blur"),
            ("287-lens-blur", "Lens Blur"),
            ("288-surface-blur", "Surface Blur"),
            ("289-bilateral-filter", "Bilateral Filter"),
            ("290-sharpen", "Sharpen"),
            ("291-unsharp-mask", "Unsharp Mask"),
        ]

        for dir_name, title in examples:
            print(f"Verifying {title}...")
            page.goto(f"http://localhost:8080/examples/03-image-processing/{dir_name}/index.html")

            # Wait for page load
            page.wait_for_load_state("networkidle")

            # Check title
            # expect(page).to_have_title(f"Web Workers {title}") # Title might vary slightly in implementation

            # Click "Load Demo Image"
            page.click("#load-demo-btn")

            # Wait for image to load and buttons to be enabled
            page.wait_for_selector("#original-canvas")
            page.wait_for_selector("#apply-btn:not([disabled])")

            # Click "Apply"
            page.click("#apply-btn")

            # Wait for processing to complete (result stats appear)
            page.wait_for_selector("#result-stats .stat-item", timeout=10000)

            # Take screenshot
            screenshot_path = f"verification/{dir_name}.png"
            page.screenshot(path=screenshot_path)
            print(f"Screenshot saved to {screenshot_path}")

        browser.close()

if __name__ == "__main__":
    verify_blur_examples()
