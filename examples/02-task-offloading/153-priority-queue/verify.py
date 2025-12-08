from playwright.sync_api import sync_playwright
import time

def verify_priority_queue():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8080/examples/02-task-offloading/153-priority-queue/index.html")

        # Add tasks with different priorities
        page.click("#addLowBtn")
        page.click("#addLowBtn")
        page.click("#addMediumBtn")
        page.click("#addHighBtn")

        # Wait a bit
        time.sleep(1)

        # Take screenshot
        page.screenshot(path="/home/jules/verification/153_priority_queue.png")
        browser.close()

if __name__ == "__main__":
    verify_priority_queue()
