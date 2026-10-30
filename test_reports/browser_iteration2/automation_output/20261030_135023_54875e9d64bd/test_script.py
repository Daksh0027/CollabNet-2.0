async def run_test(page, output_dir, page_url):
    import traceback
    try:
        await page.set_viewport_size({"width": 1920, "height": 1080})
        await page.wait_for_selector('body', timeout=10000)
        company = page.get_by_role('button', name='Explore as a company', exact=True)
        if not await company.is_visible():
            company = page.get_by_text('Explore as a company', exact=True)
        await company.scroll_into_view_if_needed()
        await company.click()
        await page.wait_for_timeout(1200)
        assert '/app/overview' in page.url
        print('PASS: company demo login reaches overview')
        await page.get_by_role('link', name='Contracts', exact=True).click()
        await page.wait_for_selector('[data-testid="contracts-page"]', timeout=10000)
        await page.wait_for_selector('[data-testid="contracts-list"]', timeout=10000)
        assert await page.get_by_text('Launch Week Sprint', exact=True).is_visible()
        print('PASS: contracts page shows Launch Week Sprint')
        await page.get_by_test_id('deal-card-deal_4240979446f8').click()
        await page.wait_for_selector('[data-testid="escrow-panel"]', timeout=5000)
        assert await page.get_by_test_id('escrow-copy').is_visible()
        print('PASS: deal room escrow panel renders')
        fund = page.get_by_test_id('fund-escrow-button')
        print('FINDING: fund button absent (expected with missing funding_status)' if not await fund.is_visible() else 'PASS: fund escrow button visible')
    except AssertionError as exc:
        print(f'FINDING: assertion failed: {exc}')
    except Exception as exc:
        print(f'FINDING: browser flow failed: {exc}')
        traceback.print_exc()

