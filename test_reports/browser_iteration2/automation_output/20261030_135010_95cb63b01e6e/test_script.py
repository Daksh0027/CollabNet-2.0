async def run_test(page, output_dir, page_url):
    import traceback
    try:
        await page.set_viewport_size({"width": 1920, "height": 1080})
        await page.wait_for_selector('[data-testid="payment-cancel-page"]', timeout=10000)
        print('PASS: cancel page rendered')
        back = page.locator('[data-testid="payment-cancel-back-button"]')
        await back.scroll_into_view_if_needed()
        assert await back.is_visible()
        print('PASS: cancel back button visible')
        await page.goto('https://mvp-prototype-8--6akq8m3i.preview.emergentagent.com/payment/success')
        await page.wait_for_selector('[data-testid="payment-success-page"]', timeout=10000)
        assert await page.locator('text=Payment is processing').is_visible(timeout=3000)
        print('PASS: success page without session shows pending state')
        error_text = await page.evaluate("""() => { const errorElements = Array.from(document.querySelectorAll('.error, [class*='error'], [id*='error']')); return errorElements.map(el => el.textContent).join(', '); }""")
        print('No error messages found on the page' if not error_text else f'Found error message: {error_text}')
    except AssertionError as exc:
        print(f'FINDING: assertion failed: {exc}')
    except Exception as exc:
        print(f'FINDING: browser flow failed: {exc}')
        traceback.print_exc()

