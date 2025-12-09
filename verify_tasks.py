
import os
from playwright.sync_api import sync_playwright

def verify_image_processing_examples():
    os.makedirs("verification", exist_ok=True)

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Test 316: Image Cropping
        try:
            print("Verifying 316-image-cropping...")
            page.goto("http://localhost:8080/examples/03-image-processing/316-image-cropping/index.html")
            page.wait_for_selector("h1", timeout=5000)
            page.screenshot(path="verification/316_cropping.png")
            print("Captured 316_cropping.png")
        except Exception as e:
            print(f"Error verifying 316: {e}")

        # Test 317: Perspective Transform
        try:
            print("Verifying 317-perspective-transform...")
            page.goto("http://localhost:8080/examples/03-image-processing/317-perspective-transform/index.html")
            page.wait_for_selector("h1", timeout=5000)
            page.screenshot(path="verification/317_perspective.png")
            print("Captured 317_perspective.png")
        except Exception as e:
            print(f"Error verifying 317: {e}")

        # Test 318: Affine Transform
        try:
            print("Verifying 318-affine-transform...")
            page.goto("http://localhost:8080/examples/03-image-processing/318-affine-transform/index.html")
            page.wait_for_selector("h1", timeout=5000)
            page.screenshot(path="verification/318_affine.png")
            print("Captured 318_affine.png")
        except Exception as e:
            print(f"Error verifying 318: {e}")

        # Test 319: Warp Deformation
        try:
            print("Verifying 319-warp-deformation...")
            page.goto("http://localhost:8080/examples/03-image-processing/319-warp-deformation/index.html")
            page.wait_for_selector("h1", timeout=5000)
            page.screenshot(path="verification/319_warp.png")
            print("Captured 319_warp.png")
        except Exception as e:
            print(f"Error verifying 319: {e}")

        # Test 320: Spherize
        try:
            print("Verifying 320-spherize...")
            page.goto("http://localhost:8080/examples/03-image-processing/320-spherize/index.html")
            page.wait_for_selector("h1", timeout=5000)
            page.screenshot(path="verification/320_spherize.png")
            print("Captured 320_spherize.png")
        except Exception as e:
            print(f"Error verifying 320: {e}")

        # Test 321: Cylinderize
        try:
            print("Verifying 321-cylinderize...")
            page.goto("http://localhost:8080/examples/03-image-processing/321-cylinderize/index.html")
            page.wait_for_selector("h1", timeout=5000)
            page.screenshot(path="verification/321_cylinderize.png")
            print("Captured 321_cylinderize.png")
        except Exception as e:
            print(f"Error verifying 321: {e}")

        # Test 322: Wave
        try:
            print("Verifying 322-wave...")
            page.goto("http://localhost:8080/examples/03-image-processing/322-wave/index.html")
            page.wait_for_selector("h1", timeout=5000)
            page.screenshot(path="verification/322_wave.png")
            print("Captured 322_wave.png")
        except Exception as e:
            print(f"Error verifying 322: {e}")

        # Test 323: Swirl
        try:
            print("Verifying 323-swirl...")
            page.goto("http://localhost:8080/examples/03-image-processing/323-swirl/index.html")
            page.wait_for_selector("h1", timeout=5000)
            page.screenshot(path="verification/323_swirl.png")
            print("Captured 323_swirl.png")
        except Exception as e:
            print(f"Error verifying 323: {e}")

        browser.close()

if __name__ == "__main__":
    verify_image_processing_examples()
