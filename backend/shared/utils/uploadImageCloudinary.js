/**
 * Upload image buffer to Cloudinary when configured; otherwise save locally under /uploads.
 */
import { v2 as cloudinary } from 'cloudinary'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import crypto from 'crypto'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads')

function isCloudinaryConfigured() {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      (process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET_KEY)
  )
}

if (isCloudinaryConfigured()) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET || process.env.CLOUDINARY_API_SECRET_KEY,
  })
}

function extForMime(mime) {
  if (mime === 'image/png') return '.png'
  if (mime === 'image/webp') return '.webp'
  if (mime === 'image/gif') return '.gif'
  return '.jpg'
}

async function uploadLocal(image) {
  const buffer = image?.buffer || Buffer.from(await image.arrayBuffer())
  await fs.mkdir(UPLOADS_DIR, { recursive: true })
  const name = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${extForMime(image?.mimetype)}`
  await fs.writeFile(path.join(UPLOADS_DIR, name), buffer)
  return {
    secure_url: `/uploads/${name}`,
    url: `/uploads/${name}`,
    public_id: name,
    local: true,
  }
}

async function uploadCloudinary(image) {
  const buffer = image?.buffer || Buffer.from(await image.arrayBuffer())
  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream({ folder: 'clone' }, (error, uploadResult) => {
        if (error) return reject(error)
        resolve(uploadResult)
      })
      .end(buffer)
  })
}

const uploadImageCloudinary = async (image) => {
  if (!isCloudinaryConfigured()) {
    return uploadLocal(image)
  }
  try {
    return await uploadCloudinary(image)
  } catch (error) {
    const msg = String(error?.message || error)
    if (/api_key|Must supply/i.test(msg)) {
      // Misconfigured env — fall back so local admin still works
      return uploadLocal(image)
    }
    throw error
  }
}

export { isCloudinaryConfigured, UPLOADS_DIR }
export default uploadImageCloudinary
