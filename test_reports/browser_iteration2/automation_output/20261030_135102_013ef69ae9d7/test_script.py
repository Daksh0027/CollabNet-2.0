async def run_test(page, output_dir, page_url):
    import traceback
    try:
        await page.set_viewport_size({"width": 1920, "height": 1080})
        company = page.get_by_role('button', name='Company / Sponsor', exact=True)
        await company.scroll_into_view_if_needed()
        await company.click()
        await page.wait_for_url('**/app/overview', timeout=10000)
        print('PASS: company demo login reaches overview')
        await page.get_by_role('link', name='Contracts', exact=True).click()
        await page.wait_for_selector('[data-testid="contracts-list"]', timeout=10000)
        assert await page.get_by_text('Launch Week Sprint', exact=True).is_visible()
        print('PASS: contracts page shows Launch Week Sprint')
        card = page.locator('[data-testid^="deal-card-"]').filter(has_text='Launch Week Sprint')
        await card.scroll_into_view_if_needed()
        await card.click()
        await page.wait_for_selector('[data-testid="escrow-panel"]', timeout=5000)
        print('PASS: deal room escrow panel renders')
        fund = page.get_by_test_id('fund-escrow-button')
        if await fund.is_visible(): print('PASS: fund escrow button visible')
        else: print('FINDING: fund escrow button absent for unfunded seeded deal')
    except AssertionError as exc:
        print(f'FINDING: assertion failed: {exc}')
    except Exception as exc:
        print(f'FINDING: browser flow failed: {exc}')
        traceback.print_exc()

