from playwright.sync_api import sync_playwright
import time

def verify_work_stealing():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8080/examples/02-task-offloading/155-work-stealing/index.html")

        # Flood Worker 0
        page.click("button:text('Flood Worker 0')")

        # Wait for stealing to happen
        time.sleep(2)

        # Take screenshot
        page.screenshot(path="/home/jules/verification/155_work_stealing.png")
        browser.close()

if __name__ == "__main__":
    verify_work_stealing()
