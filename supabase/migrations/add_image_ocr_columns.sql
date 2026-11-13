-- OCR text extracted from bill/khata images (keyed by storage key)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS bill_image_ocr JSONB NOT NULL DEFAULT '{}';

ALTER TABLE udhar
  ADD COLUMN IF NOT EXISTS khata_image_ocr JSONB NOT NULL DEFAULT '{}';

COMMENT ON COLUMN transactions.bill_image_ocr IS 'Map of storage key -> OCR text from bill photos';
COMMENT ON COLUMN udhar.khata_image_ocr IS 'Map of storage key -> OCR text from khata photos';
