from playwright.sync_api import sync_playwright
import time

def verify_dynamic_pool():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8080/examples/02-task-offloading/152-dynamic-worker-pool/index.html")

        # Add a burst of tasks to trigger scaling
        page.click("#addBurstBtn")

        # Wait for workers to scale up (give it a bit of time)
        time.sleep(2)

        # Take screenshot
        page.screenshot(path="/home/jules/verification/152_dynamic_pool.png")
        browser.close()

if __name__ == "__main__":
    verify_dynamic_pool()
