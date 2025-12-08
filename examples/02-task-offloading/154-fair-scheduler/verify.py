from playwright.sync_api import sync_playwright
import time

def verify_fair_scheduler():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto("http://localhost:8080/examples/02-task-offloading/154-fair-scheduler/index.html")

        # Flood User A
        page.click(".user-a button:text('Flood (5)')")

        # Add single task for User B
        page.click(".user-b button:text('Add Task')")

        # Wait a bit
        time.sleep(1)

        # Take screenshot
        page.screenshot(path="/home/jules/verification/154_fair_scheduler.png")
        browser.close()

if __name__ == "__main__":
    verify_fair_scheduler()
