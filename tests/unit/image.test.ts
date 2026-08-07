import assert from 'node:assert/strict'
import test from 'node:test'
import { isAllowedImageReference, resolveImageSource } from '../../src/lib/image.ts'

test('image references allow stable HTTPS hosts and legacy uploads only', () => {
  assert.equal(isAllowedImageReference('https://images.unsplash.com/photo-id'), true)
  assert.equal(isAllowedImageReference('https://images.pexels.com/photos/123/photo.jpeg'), true)
  assert.equal(isAllowedImageReference('http://images.unsplash.com/photo-id'), false)
  assert.equal(isAllowedImageReference('https://example.com/photo.jpg'), false)
  assert.equal(isAllowedImageReference('product.jpg'), true)
  assert.equal(resolveImageSource('product.jpg', 'products'), '/uploads/products/product.jpg')
  assert.equal(resolveImageSource('https://example.com/photo.jpg', 'products'), null)
})
