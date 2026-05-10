#!/usr/bin/env python3
"""E2E screenshot taker for Caffe-YA using Playwright + Chromium"""
import asyncio
import sys
from pathlib import Path

async def take_screenshot(url: str, path: str, wait_for: str = None):
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
        )
        page = await browser.new_page()
        try:
            await page.goto(url, timeout=15000, wait_until="networkidle")
            if wait_for:
                await page.wait_for_selector(wait_for, timeout=5000)
            await page.screenshot(path, full_page=True)
            print(f"OK: {url} -> {path}")
        except Exception as e:
            print(f"FAIL: {url} -> {e}", file=sys.stderr)
        finally:
            await browser.close()

async def main():
    base = "http://213.199.56.120:3000"
    screens = [
        (f"{base}/ar", "/tmp/caffe-ya-landing.png", "[data-testid='sign-in-form'], form, [type='email']"),
        (f"{base}/ar/sign-in", "/tmp/caffe-ya-signin.png", "form"),
    ]

    for url, path, _ in screens:
        await take_screenshot(url, path)

    # Login
    from playwright.async_api import async_playwright
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            args=["--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage"]
        )
        page = await browser.new_page()
        await page.goto(f"{base}/ar/sign-in", timeout=15000)
        await page.fill("input[type='email'], input[name='email']", "test_admin@caffe.ya")
        await page.fill("input[type='password']", "test1234")
        await page.click("button[type='submit']")
        await page.wait_for_url("**/dashboard**", timeout=10000)
        await page.screenshot(path="/tmp/caffe-ya-dashboard.png", full_page=True)
        print("OK: login -> dashboard")
        await browser.close()

    pages = [
        (f"{base}/ar/dashboard", "/tmp/dashboard.png"),
        (f"{base}/ar/pos", "/tmp/pos.png"),
        (f"{base}/ar/inventory", "/tmp/inventory.png"),
        (f"{base}/ar/accounting/reports", "/tmp/accounting.png"),
    ]
    for url, path in pages:
        await take_screenshot(url, path)

asyncio.run(main())
