from playwright.sync_api import sync_playwright
import os

def verify_all_pages():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # Verify 192 Task Type Routing
        page192 = browser.new_page()
        try:
            page192.goto(f"file://{os.getcwd()}/examples/02-task-scheduling/192-task-type-routing/index.html")
            page192.wait_for_selector("#task-type")
            page192.select_option("#task-type", "cpu")
            page192.click("#add-task-btn")
            page192.wait_for_timeout(500)
            page192.select_option("#task-type", "io")
            page192.click("#add-task-btn")
            page192.wait_for_timeout(1000)
            page192.screenshot(path="/home/jules/verification/192_verification.png")
            print("192 verification screenshot captured.")
        except Exception as e:
            print(f"192 verification failed: {e}")
        finally:
            page192.close()

        # Verify 193 Peak Shaving
        page193 = browser.new_page()
        try:
            page193.goto(f"file://{os.getcwd()}/examples/02-task-scheduling/193-peak-shaving/index.html")
            page193.wait_for_selector("#add-task-btn")
            page193.click("#burst-task-btn")
            page193.wait_for_timeout(2000)
            page193.screenshot(path="/home/jules/verification/193_verification.png")
            print("193 verification screenshot captured.")
        except Exception as e:
            print(f"193 verification failed: {e}")
        finally:
            page193.close()

        # Verify 194 Degradation Strategy
        page194 = browser.new_page()
        try:
            page194.goto(f"file://{os.getcwd()}/examples/02-task-scheduling/194-degradation-strategy/index.html")
            page194.wait_for_selector("#load-slider")
            # Simulate high load
            page194.evaluate("document.getElementById('load-slider').value = 90")
            page194.evaluate("document.getElementById('load-slider').dispatchEvent(new Event('input'))")
            page194.click("#process-btn")
            page194.wait_for_timeout(1000)
            page194.screenshot(path="/home/jules/verification/194_verification.png")
            print("194 verification screenshot captured.")
        except Exception as e:
            print(f"194 verification failed: {e}")
        finally:
            page194.close()

        # Verify 195 Circuit Breaker
        page195 = browser.new_page()
        try:
            page195.goto(f"file://{os.getcwd()}/examples/02-task-scheduling/195-circuit-breaker/index.html")
            page195.wait_for_selector("#service-reliability")
            # Set reliability to 0
            page195.select_option("#service-reliability", "0.0")
            # Auto request to trigger open state
            # Ensure the button is visible and enabled before clicking
            page195.wait_for_selector("#auto-request-btn", state="visible")
            page195.click("#auto-request-btn")

            # Wait for stop button to be enabled (which happens on click of auto-request)
            page195.wait_for_selector("#stop-auto-btn", state="visible")
            # Manually wait a bit for JS execution if needed
            page195.wait_for_timeout(500)

            page195.wait_for_timeout(6000) # Wait for failures and state change

            # Now click stop
            page195.click("#stop-auto-btn")
            page195.screenshot(path="/home/jules/verification/195_verification.png")
            print("195 verification screenshot captured.")
        except Exception as e:
            print(f"195 verification failed: {e}")
            page195.screenshot(path="/home/jules/verification/195_failed.png")
        finally:
            page195.close()

        browser.close()

if __name__ == "__main__":
    verify_all_pages()
