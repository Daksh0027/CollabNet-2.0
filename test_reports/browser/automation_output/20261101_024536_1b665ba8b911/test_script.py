async def run_test(page, output_dir, page_url):
    import json

    try:
        await page.set_viewport_size({"width": 1920, "height": 1080})
        await page.goto("https://chatshield-28--8vhdt7rd.preview.emergentagent.com", wait_until="networkidle", timeout=30000)
        print("Loaded landing page")
        print("buttons:", await page.locator("button").all_text_contents())
        demo = page.get_by_role("button", name="Sign in")
        await demo.scroll_into_view_if_needed()
        await demo.click()
        await page.wait_for_timeout(500)
        print("Sign-in dialog opened")
        print("dialog buttons:", await page.locator('[role="dialog"] button').all_text_contents())
        creator = page.get_by_role("button", name="Creator demo")
        await creator.scroll_into_view_if_needed()
        await creator.click()
        await page.wait_for_timeout(1500)
        print("Creator demo login completed", page.url)
        await page.goto("https://chatshield-28--8vhdt7rd.preview.emergentagent.com/app/messages", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(1000)
        assert await page.locator('[data-testid="messages-page"]').is_visible()
        print("Messages page visible")
        threads = page.locator('[data-testid^="thread-item-"]')
        count = await threads.count()
        print("thread count", count)
        if count == 0:
            raise AssertionError("No thread available for UI test")
        first = threads.first
        await first.scroll_into_view_if_needed()
        await first.click()
        await page.wait_for_timeout(800)
        inp = page.locator('[data-testid="message-input"]')
        await inp.fill("My number is 9876543210")
        send = page.locator('[data-testid="send-message-button"]')
        await send.scroll_into_view_if_needed()
        await send.click()
        await page.wait_for_timeout(1200)
        assert await page.locator('[data-testid="moderation-block-banner"]').is_visible()
        assert "9876543210" not in await page.locator('[data-testid="moderation-block-banner"]').inner_text()
        assert await inp.input_value() == "My number is 9876543210"
        print("Blocked message banner and input preservation passed")
        await inp.fill("I love Instagram reels")
        await page.locator('[data-testid="send-message-button"]').click()
        await page.wait_for_timeout(1000)
        assert "I love Instagram reels" in await page.locator('[data-testid="message-list"]').inner_text()
        print("Approved message delivery passed")
        await page.goto("https://chatshield-28--8vhdt7rd.preview.emergentagent.com/app/moderation", wait_until="networkidle", timeout=30000)
        await page.wait_for_timeout(1200)
        if await page.locator('[data-testid="moderation-denied"]').count():
            raise AssertionError("Creator unexpectedly has no admin dashboard access")
        assert await page.locator('[data-testid="moderation-stats-grid"]').is_visible()
        assert await page.locator('[data-testid="moderation-events-table"]').is_visible()
        print("Moderation dashboard visible")
    except AssertionError as e:
        print(f"FINDING: {e}")
    except Exception as e:
        print(f"FINDING: browser flow error: {e}")
        raise

    error_text = await page.evaluate("""() => {
    const errorElements = Array.from(document.querySelectorAll('.error, [class*="error"], [id*="error"]'));
    return errorElements.map(el => el.textContent).join(", ");
    }""")
    print("Page errors:", error_text or "none")
