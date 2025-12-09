from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch()
    page = browser.new_page()

    # Verify Item 156: DAG Task Scheduling
    try:
        page.goto("http://localhost:8000/examples/02-task-offloading/156-dag-task-scheduling/index.html")
        page.click('button#startBtn')
        # Wait for the last task (Task F) to be completed
        # Task F is dependent on D and E. A->B->D and A->C->E.
        # Durations: A=1000, B=1500, C=800, D=1200, E=1000, F=500
        # Critical path: A -> B -> D -> F
        # Time: 1000 + 1500 + 1200 + 500 = 4200ms
        # Increase timeout to be safe
        page.wait_for_selector('#node-F.completed', timeout=10000)
        page.screenshot(path='/home/jules/verification/156-dag.png')
        print("Verified 156-dag-task-scheduling")
    except Exception as e:
        print(f"Failed to verify 156-dag-task-scheduling: {e}")

    # Verify Item 157: Batch Processing
    try:
        page.goto("http://localhost:8000/examples/02-task-offloading/157-batch-processing/index.html")
        page.click('button#runIndividualBtn')
        page.wait_for_selector('#individualTime:not(:text("-"))', timeout=30000)
        page.click('button#runBatchBtn')
        page.wait_for_selector('#batchTime:not(:text("-"))', timeout=30000)
        page.screenshot(path='/home/jules/verification/157-batch.png')
        print("Verified 157-batch-processing")
    except Exception as e:
        print(f"Failed to verify 157-batch-processing: {e}")

    # Verify Item 158: Task Timeout
    try:
        page.goto("http://localhost:8000/examples/02-task-offloading/158-task-timeout/index.html")
        # Test Success Case (Default values: Duration 2000, Timeout 1000 -> Fail)
        # Let's change input to succeed: Duration 500, Timeout 1000
        page.fill('#taskDuration', '500')
        page.fill('#timeoutLimit', '1000')
        page.click('button#startBtn')
        page.wait_for_selector('#result.success', timeout=5000)

        # Test Fail Case
        page.fill('#taskDuration', '2000')
        page.fill('#timeoutLimit', '500')
        page.click('button#startBtn')
        page.wait_for_selector('#result.error', timeout=5000)

        page.screenshot(path='/home/jules/verification/158-timeout.png')
        print("Verified 158-task-timeout")
    except Exception as e:
        print(f"Failed to verify 158-task-timeout: {e}")

    # Verify Item 159: Task Retry
    try:
        page.goto("http://localhost:8000/examples/02-task-offloading/159-task-retry/index.html")
        page.click('button#startBtn')
        page.wait_for_selector('#status:text("Success"), #status:text("Failed")', timeout=20000)
        page.screenshot(path='/home/jules/verification/159-retry.png')
        print("Verified 159-task-retry")
    except Exception as e:
        print(f"Failed to verify 159-task-retry: {e}")

    browser.close()

with sync_playwright() as playwright:
    run(playwright)
